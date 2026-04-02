import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  analyzeBill,
  buildAppealLetter,
  llmLegalAudit,
  mockExtractLineItems
} from "./analysis.js";
import { authRegister, authLogin, authMe } from "./auth.js";

const app = new Hono();

function toFormBody(payload) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, String(value));
    }
  }
  return params.toString();
}

async function stripeRequest(c, path, payload) {
  const stripeSecretKey = c.env?.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error("STRIPE_NOT_CONFIGURED");
  }

  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: toFormBody(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || "Stripe request failed";
    throw new Error(msg);
  }
  return data;
}

async function stripeGet(c, path) {
  const stripeSecretKey = c.env?.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error("STRIPE_NOT_CONFIGURED");
  }
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${stripeSecretKey}` }
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || "Stripe request failed";
    throw new Error(msg);
  }
  return data;
}

function hexFromBuffer(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqualHex(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Parse Stripe-Signature header (supports multiple v1 signatures). */
function parseStripeSignatureHeader(signatureHeader) {
  const parts = signatureHeader.split(",").map((p) => p.trim());
  let t = null;
  const v1 = [];
  for (const p of parts) {
    const idx = p.indexOf("=");
    if (idx === -1) continue;
    const key = p.slice(0, idx);
    const val = p.slice(idx + 1);
    if (key === "t") t = val;
    else if (key === "v1") v1.push(val);
  }
  return { t, v1 };
}

/** Verify Stripe webhook signature (Stripe-Signature header). */
async function verifyStripeWebhookSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;
  const { t, v1 } = parseStripeSignatureHeader(signatureHeader);
  if (!t || v1.length === 0) return false;
  const now = Math.floor(Date.now() / 1000);
  const ts = Number(t);
  if (Number.isNaN(ts) || Math.abs(now - ts) > 300) {
    return false;
  }
  const signedPayload = `${t}.${rawBody}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
  const expectedHex = hexFromBuffer(sigBuf);
  return v1.some((candidate) => timingSafeEqualHex(candidate, expectedHex));
}

function getStripePriceId(c, planId, explicitPriceId) {
  if (explicitPriceId) return explicitPriceId;
  const map = {
    basic: c.env?.STRIPE_PRICE_BASIC,
    protector: c.env?.STRIPE_PRICE_PROTECTOR,
    family: c.env?.STRIPE_PRICE_FAMILY,
    "one-off": c.env?.STRIPE_PRICE_ONE_OFF
  };
  return map[planId] || null;
}

/** Detect mis-paste: all three Cloudflare vars accidentally set to the same Stripe Price ID. */
function assertDistinctPriceIds(c) {
  const basic = c.env?.STRIPE_PRICE_BASIC;
  const protector = c.env?.STRIPE_PRICE_PROTECTOR;
  const family = c.env?.STRIPE_PRICE_FAMILY;
  const set = [basic, protector, family].filter(Boolean);
  if (set.length === 3 && new Set(set).size === 1) {
    return "STRIPE_PRICE_BASIC, STRIPE_PRICE_PROTECTOR, and STRIPE_PRICE_FAMILY are all the same Price ID. In Stripe, each product has its own price_...; paste a different one for each variable.";
  }
  if (basic && protector && basic === protector) {
    return "STRIPE_PRICE_BASIC and STRIPE_PRICE_PROTECTOR are identical. Use the Price ID from the Basic product for BASIC and the Protector product for PROTECTOR.";
  }
  if (basic && family && basic === family) {
    return "STRIPE_PRICE_BASIC and STRIPE_PRICE_FAMILY are identical. Each plan needs its own price_... from Stripe.";
  }
  if (protector && family && protector === family) {
    return "STRIPE_PRICE_PROTECTOR and STRIPE_PRICE_FAMILY are identical. Each plan needs its own price_... from Stripe.";
  }
  return null;
}

async function hasCompletedOneOffCheckout(c, stripeCustomerId) {
  try {
    const list = await stripeGet(
      c,
      `checkout/sessions?customer=${encodeURIComponent(stripeCustomerId)}&limit=20`
    );
    const sessions = list?.data || [];
    return sessions.some(
      (s) => s.mode === "payment" && s.payment_status === "paid"
    );
  } catch {
    return false;
  }
}

async function getUserSubscription(c) {
  const forceSubscription = c.env?.REQUIRE_SUBSCRIPTION === "true";
  const localPlan = c.req.header("x-subscription-plan") || "none";
  const localStatus = c.req.header("x-subscription-status") || "inactive";
  const stripeCustomerId = c.req.header("x-stripe-customer-id");

  // Temporary local override for dev/demo.
  if (!forceSubscription) {
    return {
      id: c.req.header("x-user-id") || "anonymous",
      plan: localPlan,
      status: localStatus,
      stripeCustomerId: stripeCustomerId || null,
      isSubscribed: true
    };
  }

  if (!stripeCustomerId) {
    return {
      id: c.req.header("x-user-id") || "anonymous",
      plan: localPlan,
      status: "inactive",
      stripeCustomerId: null,
      isSubscribed: false
    };
  }

  try {
    const stripe = await stripeGet(
      c,
      `subscriptions?customer=${encodeURIComponent(stripeCustomerId)}&status=all&limit=10`
    );
    const active = (stripe.data || []).find((s) =>
      ["active", "trialing", "past_due"].includes(s.status)
    );
    if (active) {
      return {
        id: c.req.header("x-user-id") || "anonymous",
        plan: active?.items?.data?.[0]?.price?.id || "none",
        status: active?.status || "inactive",
        stripeCustomerId,
        isSubscribed: true
      };
    }
    const oneOff = await hasCompletedOneOffCheckout(c, stripeCustomerId);
    return {
      id: c.req.header("x-user-id") || "anonymous",
      plan: oneOff ? "one-off" : "none",
      status: oneOff ? "paid" : "inactive",
      stripeCustomerId,
      isSubscribed: oneOff
    };
  } catch {
    return {
      id: c.req.header("x-user-id") || "anonymous",
      plan: "none",
      status: "inactive",
      stripeCustomerId,
      isSubscribed: false
    };
  }
}

app.use(
  "/api/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"]
  })
);

app.post("/api/auth/register", authRegister);
app.post("/api/auth/login", authLogin);
app.get("/api/auth/me", authMe);

app.get("/", async (c) => {
  if (c.env?.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.text("Frontend assets not configured. Build client and set [assets] in wrangler.toml.", 500);
});

// 健康检查
app.get("/api/health", (c) => {
  return c.json({ ok: true, service: "medisaver-ai-api" });
});

/** 处理图片上传分析 */
app.post("/api/analyze", async (c) => {
  try {
    const user = await getUserSubscription(c);
    if (!user.isSubscribed) {
      return c.json({ error: "Subscription required", code: "PAYMENT_REQUIRED" }, 402);
    }

    const body = await c.req.parseBody();
    const billFile = body["bill"]; // 这是一个 Blob 对象
    const demoScenario = body["demoScenario"] || "high";

    let buffer = null;
    if (billFile instanceof File) {
      buffer = await billFile.arrayBuffer();
    }

    // 调用你分析逻辑中的 mock 函数
    const parsed = await mockExtractLineItems(buffer, demoScenario, c.env, billFile?.type);
    const analysis = analyzeBill(parsed);
    analysis.llmLegalAudit = await llmLegalAudit(c.env, parsed, analysis);

    return c.json({ parsed, analysis });
  } catch (e) {
    console.error(e);
    return c.json({ error: "Analysis failed" }, 500);
  }
});

/** 处理 JSON 提交的分析 */
app.post("/api/analyze-json", async (c) => {
  try {
    const user = await getUserSubscription(c);
    if (!user.isSubscribed) {
      return c.json({ error: "Subscription required", code: "PAYMENT_REQUIRED" }, 402);
    }

    const body = await c.req.json();
    if (!body?.lineItems?.length) {
      return c.json({ error: "lineItems required" }, 400);
    }
    const parsed = {
      facilityName: body.facilityName || "Unknown facility",
      patientName: body.patientName || "Patient",
      statementDate: body.statementDate || "",
      lineItems: body.lineItems
    };
    const analysis = analyzeBill(parsed);
    analysis.llmLegalAudit = await llmLegalAudit(c.env, parsed, analysis);
    return c.json({ parsed, analysis });
  } catch (e) {
    return c.json({ error: "Analysis failed" }, 500);
  }
});

/** 生成申诉信 */
app.post("/api/appeal", async (c) => {
  try {
    const user = await getUserSubscription(c);
    if (!user.isSubscribed) {
      return c.json({ error: "Subscription required", code: "PAYMENT_REQUIRED" }, 402);
    }

    const { analysis, patientName, insurerName } = await c.req.json();
    if (!analysis?.summary) {
      return c.json({ error: "analysis object required" }, 400);
    }
    const letter = buildAppealLetter(analysis, patientName || "Policyholder", insurerName || "");
    return c.json({ letter });
  } catch (e) {
    return c.json({ error: "Appeal generation failed" }, 500);
  }
});

app.post("/api/billing/checkout-session", async (c) => {
  try {
    const body = await c.req.json();
    const planId = String(body.planId || "")
      .trim()
      .toLowerCase();
    const origin = c.req.header("origin") || "https://statutebill.com";
    const successUrl =
      body.successUrl || `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = body.cancelUrl || `${origin}/billing/cancel`;

    const dupMsg = assertDistinctPriceIds(c);
    if (dupMsg) {
      return c.json({ error: dupMsg, code: "DUPLICATE_PRICE_IDS" }, 400);
    }

    const priceId = getStripePriceId(c, planId, body.priceId);
    if (!priceId) {
      return c.json(
        {
          error: "priceId required",
          hint:
            planId === "one-off"
              ? "Configure STRIPE_PRICE_ONE_OFF with a one-time payment price_... from Stripe, or pass priceId in the request body."
              : "Provide priceId in body, or configure STRIPE_PRICE_BASIC / STRIPE_PRICE_PROTECTOR / STRIPE_PRICE_FAMILY (each must be a different price_... from Stripe)."
        },
        400
      );
    }

    const isOneOffPayment = planId === "one-off";

    const sessionPayload = {
      mode: isOneOffPayment ? "payment" : "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": 1,
      "payment_method_types[0]": "card",
      "metadata[plan_id]": planId,
      "metadata[price_id]": priceId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true
    };
    if (body.customerId) sessionPayload.customer = body.customerId;
    if (body.customerEmail) sessionPayload.customer_email = body.customerEmail;

    const session = await stripeRequest(c, "checkout/sessions", sessionPayload);

    return c.json({
      id: session.id,
      url: session.url,
      planId,
      priceId
    });
  } catch (e) {
    return c.json({ error: e.message || "Checkout session failed" }, 500);
  }
});

app.post("/api/billing/verify-session", async (c) => {
  try {
    const body = await c.req.json();
    const sessionId = String(body.sessionId || "").trim();
    if (!sessionId || !sessionId.startsWith("cs_")) {
      return c.json({ error: "sessionId required (Stripe checkout session id)" }, 400);
    }
    const session = await stripeGet(c, `checkout/sessions/${encodeURIComponent(sessionId)}`);
    if (session.payment_status !== "paid") {
      return c.json(
        { error: "Payment not completed", payment_status: session.payment_status },
        402
      );
    }
    const planId = session.metadata?.plan_id || "unknown";
    const priceId = session.metadata?.price_id || null;
    return c.json({
      ok: true,
      customerId: session.customer,
      planId,
      priceId,
      mode: session.mode,
      subscriptionId: session.subscription || null
    });
  } catch (e) {
    return c.json({ error: e.message || "Verify failed" }, 500);
  }
});

app.post("/api/billing/webhook", async (c) => {
  try {
    const rawBody = await c.req.text();
    const sig = c.req.header("stripe-signature");
    const secret = c.env?.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      return c.json({ error: "STRIPE_WEBHOOK_SECRET not configured" }, 500);
    }
    const ok = await verifyStripeWebhookSignature(rawBody, sig, secret);
    if (!ok) {
      return c.json({ error: "Invalid signature" }, 400);
    }
    let event;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return c.json({ error: "Invalid JSON" }, 400);
    }
    if (event.type === "checkout.session.completed") {
      const obj = event.data?.object;
      console.log(
        `[stripe webhook] checkout.session.completed id=${obj?.id} customer=${obj?.customer} mode=${obj?.mode}`
      );
    }
    return c.json({ received: true });
  } catch (e) {
    return c.json({ error: e.message || "Webhook failed" }, 500);
  }
});

app.post("/api/billing/portal-session", async (c) => {
  try {
    const body = await c.req.json();
    const origin = c.req.header("origin") || "https://statutebill.com";
    const returnUrl = body.returnUrl || `${origin}/account`;

    if (!body.customerId) {
      return c.json({ error: "customerId required" }, 400);
    }

    const session = await stripeRequest(c, "billing_portal/sessions", {
      customer: body.customerId,
      return_url: returnUrl
    });
    return c.json({ url: session.url });
  } catch (e) {
    return c.json({ error: e.message || "Portal session failed" }, 500);
  }
});

app.get("/api/billing/subscription-status", async (c) => {
  const user = await getUserSubscription(c);
  return c.json({
    isSubscribed: user.isSubscribed,
    status: user.status,
    plan: user.plan,
    stripeCustomerId: user.stripeCustomerId
  });
});

app.get("/api/subscription/plans", (c) => {
  return c.json({
    plans: [
      {
        id: "basic",
        name: "Basic",
        monthlyPriceUsd: 9.9,
        features: ["Unlimited bill audits", "AI risk flags"]
      },
      {
        id: "protector",
        name: "Protector",
        monthlyPriceUsd: 19.9,
        features: [
          "Everything in Basic",
          "AI appeal letter generation",
          "FICO credit guard monitoring"
        ]
      },
      {
        id: "family",
        name: "Family Shield",
        monthlyPriceUsd: 29.9,
        features: [
          "Family-wide coverage",
          "Unlimited household bill audits",
          "24/7 statute guidance support"
        ]
      }
    ]
  });
});

app.get("*", async (c) => {
  if (c.req.path.startsWith("/api/")) {
    return c.json({ error: "Not found" }, 404);
  }
  if (c.env?.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.text("Frontend assets not configured.", 404);
});

export default app;
