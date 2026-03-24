import { Hono } from "hono";
import { cors } from "hono/cors";
import { analyzeBill, buildAppealLetter, mockExtractLineItems } from "./analysis.js";

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

function getStripePriceId(c, planId, explicitPriceId) {
  if (explicitPriceId) return explicitPriceId;
  const map = {
    basic: c.env?.STRIPE_PRICE_BASIC,
    protector: c.env?.STRIPE_PRICE_PROTECTOR,
    family: c.env?.STRIPE_PRICE_FAMILY
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
    const stripe = await stripeRequest(c, "subscriptions", {
      customer: stripeCustomerId,
      status: "all",
      limit: 5
    });
    const active = (stripe.data || []).find((s) =>
      ["active", "trialing", "past_due"].includes(s.status)
    );
    return {
      id: c.req.header("x-user-id") || "anonymous",
      plan: active?.items?.data?.[0]?.price?.id || "none",
      status: active?.status || "inactive",
      stripeCustomerId,
      isSubscribed: Boolean(active)
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

// 启用跨域
app.use("/api/*", cors());

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
    const successUrl = body.successUrl || `${origin}/billing/success`;
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
          hint: "Provide priceId in body, or configure STRIPE_PRICE_BASIC / STRIPE_PRICE_PROTECTOR / STRIPE_PRICE_FAMILY (each must be a different price_... from Stripe)."
        },
        400
      );
    }

    const sessionPayload = {
      mode: "subscription",
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
