import { cmsReference, hospitalHistorical, LOCALITY } from "../data/cmsReference.js";
import { clausesToStatutoryCitations, selectClausesForLine } from "./retrieval.js";
import { isOpenRouterConfigured, openRouterChatCompletion, OPENROUTER_MODEL_ID } from "./openRouter.js";

/** No-file audit must use OpenRouter; missing key or failed generation throws (see .code). */
export const ERR_OPENROUTER_NOFILE_REQUIRED = "OPENROUTER_NOFILE_REQUIRED";
export const ERR_OPENROUTER_BILL_GENERATION = "OPENROUTER_BILL_GENERATION_FAILED";

function findReference(code) {
  const c = String(code).replace(/\s/g, "");
  return cmsReference.find((r) => r.code === c);
}

function hospitalStats(facilityName, code) {
  const fac = hospitalHistorical[facilityName];
  if (!fac) return null;
  return fac[code] ?? null;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function withNoise(value, pct = 0.25) {
  const factor = 1 + (Math.random() * 2 - 1) * pct;
  return Math.max(1, Math.round(value * factor));
}

function pickRandom(list) {
  return list[randomInt(0, list.length - 1)];
}

function pickManyUnique(list, count) {
  const copy = [...list];
  const out = [];
  while (copy.length && out.length < count) {
    const idx = randomInt(0, copy.length - 1);
    out.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return out;
}

function fallbackDemoScenario(demoScenario) {
  const facilities = [
    "General Metro Hospital",
    "Riverbend Medical Center",
    "Summit Valley Health",
    "Lakeside Regional Hospital"
  ];
  const patientAliases = [
    "DEMO PATIENT",
    "TEST MEMBER",
    "SAMPLE PERSON",
    "CASE EXAMPLE"
  ];
  const servicePool = [
    { code: "71046", description: "Chest X-ray 2 views", base: 1840, high: true },
    { code: "80053", description: "CMP — comprehensive metabolic", base: 890, high: true },
    { code: "85025", description: "CBC automated", base: 195, high: false },
    { code: "99213", description: "Office visit est patient", base: 485, high: false },
    { code: "36415", description: "Blood draw", base: 85, high: false },
    { code: "93000", description: "Electrocardiogram routine", base: 720, high: true },
    { code: "70450", description: "CT head/brain without contrast", base: 2650, high: true },
    { code: "81001", description: "Urinalysis automated with microscopy", base: 140, high: false },
    { code: "96372", description: "Therapeutic injection administration", base: 240, high: false },
    { code: "72100", description: "Lumbar spine X-ray", base: 1320, high: true }
  ];

  const count = demoScenario === "high" ? randomInt(4, 6) : randomInt(2, 3);
  const selected = pickManyUnique(servicePool, count).map((item) => {
    const noisePct = demoScenario === "high" ? 0.45 : 0.3;
    const multiplier = demoScenario === "high" && item.high ? randomInt(1, 2) : 1;
    return {
      code: item.code,
      description: item.description,
      quantity: multiplier,
      billed: withNoise(item.base * multiplier, noisePct)
    };
  });

  return {
    facilityName: pickRandom(facilities),
    patientName: pickRandom(patientAliases),
    statementDate: `2025-02-${String(randomInt(10, 28)).padStart(2, "0")}`,
    lineItems: selected
  };
}

function coerceBillJsonOutput(parsed, demoScenario) {
  if (!parsed || typeof parsed !== "object") return null;
  const lineItems = Array.isArray(parsed.lineItems)
    ? parsed.lineItems
        .map((x) => ({
          code: String(x?.code || "").trim(),
          description: String(x?.description || "Medical service").trim(),
          quantity: Number(x?.quantity) > 0 ? Number(x.quantity) : 1,
          billed: Math.max(1, Number(x?.billed) || 0)
        }))
        .filter((x) => x.code && x.billed > 0)
    : [];
  if (!lineItems.length) return null;
  return {
    facilityName: String(parsed.facilityName || "General Metro Hospital"),
    patientName: String(parsed.patientName || "DEMO PATIENT"),
    statementDate: String(parsed.statementDate || fallbackDemoScenario(demoScenario).statementDate),
    lineItems
  };
}

function parseJsonObjectFromModelText(text) {
  if (!text || typeof text !== "string") return null;
  const cleaned = text.replace(/^\uFEFF/, "").replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

const cmsCodeIndex = new Map(cmsReference.map((r) => [String(r.code).replace(/\s/g, ""), r]));

/** Keep only line items whose codes exist in cmsReference; normalize description to catalog text. */
function sanitizeLineItemsToCmsReference(parsed) {
  if (!parsed?.lineItems?.length) return null;
  const lineItems = parsed.lineItems
    .map((li) => {
      const c = String(li.code || "").replace(/\s/g, "");
      const ref = cmsCodeIndex.get(c);
      if (!ref) return null;
      return {
        code: ref.code,
        description: ref.description,
        quantity: Math.max(1, Number(li.quantity) || 1),
        billed: Math.max(1, Math.round(Number(li.billed) || 0))
      };
    })
    .filter(Boolean);
  if (!lineItems.length) return null;
  return { ...parsed, lineItems };
}

function cmsAllowedCodesPromptBlock() {
  return cmsReference
    .map((r) => `- ${r.code}: ${r.description} (illustrative benchmark ~$${r.typicalAllowed} allowed)`)
    .join("\n");
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function buildSyntheticBillPrompt(demoScenario) {
  const variationToken = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const catalog = cmsAllowedCodesPromptBlock();
  return `Generate ONE synthetic US hospital or outpatient bill as JSON for billing-compliance audit testing.

STRICT: Every lineItems[].code MUST be exactly one of these codes (copy code strings exactly). Use the descriptions below as your line description text (verbatim or very close).
${catalog}

Output ONLY valid JSON (no markdown). Schema:
{
  "facilityName": "string (realistic hospital or clinic name)",
  "patientName": "string (fictional)",
  "statementDate": "YYYY-MM-DD",
  "lineItems": [{ "code": "from list only", "description": "string", "quantity": number >= 1, "billed": number }]
}

Scenario: ${
    demoScenario === "high"
      ? "4-6 line items; billed amounts should be clearly INFLATED vs the benchmarks above (e.g. often 3-10×) so auditors would flag overcharges."
      : "2-3 line items; billed amounts closer to typical commercial charges, some lines modestly above benchmark."
  }
Vary which codes appear, quantities, facility, patient, and statement date. Make each run clearly different.
Uniqueness token (ignore in output): ${variationToken}`;
}

async function generateSyntheticBillWithOpenRouter(env, demoScenario) {
  const prompt = buildSyntheticBillPrompt(demoScenario);
  const body = {
    messages: [{ role: "user", content: prompt }],
    temperature: 1.05,
    response_format: { type: "json_object" }
  };
  if (env?.OPENROUTER_REASONING === "true") {
    body.reasoning = { enabled: true };
  }
  const or = await openRouterChatCompletion(env, body);
  if (!or.ok || !or.text) return null;
  const parsed = parseJsonObjectFromModelText(or.text);
  if (!parsed) return null;
  const coerced = coerceBillJsonOutput(parsed, demoScenario);
  return sanitizeLineItemsToCmsReference(coerced) || null;
}

async function extractFromDocumentWithOpenRouter(buffer, mimeType, env, demoScenario) {
  if (!buffer || !isOpenRouterConfigured(env)) return null;
  const effectiveMimeType = mimeType || "application/octet-stream";
  const b64 = arrayBufferToBase64(buffer);
  const dataUrl = `data:${effectiveMimeType};base64,${b64}`;
  const prompt = `You are extracting structured billing line-items from a medical bill document.
Return ONLY valid JSON with this exact schema:
{
  "facilityName": "string",
  "patientName": "string",
  "statementDate": "YYYY-MM-DD",
  "lineItems": [{ "code":"CPT/HCPCS", "description":"string", "quantity":number, "billed":number }]
}
Rules:
- Extract what exists in the document (image or PDF); do not invent extra rows.
- If a code is missing but a line item exists, set code to "UNKNOWN".
- quantity must be >= 1.
- billed must be numeric (remove currency symbols/commas).
- Keep 2-8 lineItems when possible.
- Output JSON only, no markdown fences.`;

  const body = {
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: dataUrl } }
        ]
      }
    ],
    temperature: 0.2,
    response_format: { type: "json_object" }
  };
  if (env?.OPENROUTER_REASONING === "true") {
    body.reasoning = { enabled: true };
  }
  const or = await openRouterChatCompletion(env, body);
  if (!or.ok || !or.text) return null;
  const parsed = parseJsonObjectFromModelText(or.text);
  if (!parsed) return null;
  return coerceBillJsonOutput(parsed, demoScenario);
}

async function generateSyntheticBill(env, demoScenario) {
  if (!isOpenRouterConfigured(env)) return null;
  try {
    return await generateSyntheticBillWithOpenRouter(env, demoScenario);
  } catch {
    return null;
  }
}

function throwOpenRouterNoFileRequired() {
  const err = new Error(
    `No-file audit requires OPENROUTER_API_KEY (model ${OPENROUTER_MODEL_ID}). For local dev add server/.dev.vars — never commit it.`
  );
  err.code = ERR_OPENROUTER_NOFILE_REQUIRED;
  throw err;
}

function throwOpenRouterBillGenerationFailed() {
  const err = new Error(
    `OpenRouter could not generate a bill (${OPENROUTER_MODEL_ID}). Check key, quota, and OPENROUTER_REASONING=false if JSON fails.`
  );
  err.code = ERR_OPENROUTER_BILL_GENERATION;
  throw err;
}

/**
 * No file: only OpenRouter Qwen free bill (no random local fallback); upload: vision / generate / fallback.
 */
export async function mockExtractLineItems(buffer, demoScenario, env, mimeType) {
  if (!buffer || buffer.byteLength === 0) {
    if (!isOpenRouterConfigured(env)) {
      throwOpenRouterNoFileRequired();
    }
    const generated = await generateSyntheticBillWithOpenRouter(env, demoScenario);
    if (!generated) {
      throwOpenRouterBillGenerationFailed();
    }
    return generated;
  }

  try {
    if (isOpenRouterConfigured(env)) {
      const extracted = await extractFromDocumentWithOpenRouter(buffer, mimeType, env, demoScenario);
      if (extracted) return extracted;
    }

    const generated = await generateSyntheticBill(env, demoScenario);
    if (generated) return generated;
  } catch {
    //
  }
  return fallbackDemoScenario(demoScenario);
}

export function analyzeBill(parsed, options = {}) {
  const { ragClausePool } = options;
  const { facilityName, lineItems } = parsed;
  const flags = [];
  let totalBilled = 0;
  let totalReasonable = 0;

  for (const row of lineItems) {
    const ref = findReference(row.code);
    const billed = Number(row.billed) * (Number(row.quantity) || 1);
    totalBilled += billed;

    const hist = hospitalStats(facilityName, row.code);
    let reasonable = ref ? ref.typicalAllowed * (Number(row.quantity) || 1) : billed * 0.85;
    if (hist) {
      reasonable = Math.min(reasonable, hist.p25 * (Number(row.quantity) || 1));
    }
    totalReasonable += reasonable;

    const delta = billed - reasonable;
    const severity =
      ref && billed > ref.typicalAllowed * 3
        ? "high"
        : ref && billed > ref.typicalAllowed * 1.5
          ? "medium"
          : delta > 50
            ? "medium"
            : "low";

    if (ref && billed > reasonable * 1.2) {
      const retrievedClauses = selectClausesForLine(
        {
          code: row.code,
          description: row.description,
          severity,
          billed,
          reasonableEstimate: Math.round(reasonable * 100) / 100
        },
        ragClausePool
      );
      const statutes = clausesToStatutoryCitations(retrievedClauses);
      const clauseRefs = retrievedClauses.map((c) => c.id).join(", ");
      flags.push({
        code: row.code,
        description: row.description,
        quantity: row.quantity ?? 1,
        billed,
        referenceAllowed: ref.typicalAllowed,
        reasonableEstimate: Math.round(reasonable * 100) / 100,
        overchargeEstimate: Math.round(Math.max(0, delta) * 100) / 100,
        severity,
        cmsBenchmarkSource: ref.source,
        locality: LOCALITY,
        hospitalHistorical: hist
          ? {
              facilityName,
              p25: hist.p25,
              medianBilled: hist.medianBilled
            }
          : null,
        retrievedClauses: retrievedClauses.map((c) => ({
          id: c.id,
          topic: c.topic,
          reference: c.reference,
          excerpt: c.excerpt
        })),
        statutoryCitations: statutes,
        legalBasis: [
          `RAG-prioritized statutory excerpts (library ids: ${clauseRefs})—LLM review is grounded on these texts plus system benchmarks.`,
          `Federal transparency & patient-protection framework: cite posted standard charges and Good Faith Estimate / plan documents where applicable (45 CFR Part 180; NSA at 42 U.S.C. § 300gg-131 et seq.; ERISA claims procedures at 29 U.S.C. §§ 1132–1133).`,
          `Pricing reasonableness: compare to Medicare / CMS-aligned benchmarks for CPT/HCPCS ${row.code} (${LOCALITY}).`,
          ref.source,
          hist
            ? `Facility historical spread: median billed ~$${hist.medianBilled} vs 25th percentile ~$${hist.p25} for this code (demo hospital data).`
            : "Demand itemized CPT/HCPCS-level detail and the contract / allowed amount consistent with plan SPD and EOB."
        ],
        citations: [ref.source, ...statutes.map((s) => s.reference)]
      });
    }
  }

  const potentialSavings = Math.round(Math.max(0, totalBilled - totalReasonable) * 100) / 100;

  return {
    summary: {
      facilityName,
      statementDate: parsed.statementDate,
      totalBilled: Math.round(totalBilled * 100) / 100,
      totalReasonableEstimate: Math.round(totalReasonable * 100) / 100,
      potentialSavings,
      flaggedCount: flags.length,
      locality: LOCALITY
    },
    flags,
    lineItems: lineItems.map((r) => ({
      ...r,
      billed: Number(r.billed) * (Number(r.quantity) || 1)
    }))
  };
}

function normalizeComplianceReview(obj) {
  if (!obj || typeof obj !== "object") return null;
  const alignment = String(obj.statuteAlignment || "").toLowerCase();
  return {
    unavailable: false,
    approved: typeof obj.approved === "boolean" ? obj.approved : null,
    confidence:
      typeof obj.confidence === "number" && !Number.isNaN(obj.confidence)
        ? Math.min(1, Math.max(0, obj.confidence))
        : null,
    statuteAlignment: ["high", "medium", "low"].includes(alignment) ? alignment : null,
    summary: String(obj.summary || "").trim() || "No summary text returned.",
    concerns: Array.isArray(obj.concerns) ? obj.concerns.map((c) => String(c)) : []
  };
}

function reviewUnavailable(summary, concerns = []) {
  return {
    unavailable: true,
    approved: null,
    confidence: null,
    statuteAlignment: null,
    summary,
    concerns
  };
}

/**
 * OpenRouter (qwen/qwen3.6-plus:free) compliance check over RAG + audit.
 * Always returns a displayable object (never null) so the UI can show status.
 */
export async function complianceReviewAudit(env, { parsed, analysis, ragContext }) {
  if (!isOpenRouterConfigured(env)) {
    return reviewUnavailable(
      "LLM compliance summary is not available: set OPENROUTER_API_KEY on this Worker.",
      ["Cloudflare: Workers → Settings → Variables and Secrets → wrangler secret put OPENROUTER_API_KEY"]
    );
  }

  const excerptBlock = String(ragContext || "").trim() || "(No legal excerpts were retrieved for this bill.)";

  const auditPayload = {
    facilityName: parsed?.facilityName,
    statementDate: parsed?.statementDate,
    lineItemCount: parsed?.lineItems?.length ?? 0,
    summary: analysis?.summary,
    flags: (analysis?.flags || []).map((f) => ({
      code: f.code,
      description: f.description,
      severity: f.severity,
      billed: f.billed,
      reasonableEstimate: f.reasonableEstimate,
      overchargeEstimate: f.overchargeEstimate,
      citationRefs: (f.statutoryCitations || []).map((s) => s.reference)
    }))
  };

  const prompt = `You are a healthcare billing compliance reviewer (not a lawyer). Ground your review ONLY in the LEGAL EXCERPTS below and the numeric audit JSON—do not invent statutes.

LEGAL EXCERPTS (retrieved corpus):
${excerptBlock}

AUDIT (JSON):
${JSON.stringify(auditPayload)}

Return a single JSON object with exactly these keys:
{"approved":boolean,"confidence":number,"statuteAlignment":"high"|"medium"|"low","summary":string,"concerns":string[]}

approved=true if flag severities and citations are plausibly supported by the excerpts; confidence must be between 0 and 1; summary is 2-4 sentences in English.`;

  const body = {
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    response_format: { type: "json_object" }
  };
  if (env?.OPENROUTER_REASONING === "true") {
    body.reasoning = { enabled: true };
  }

  try {
    const or = await openRouterChatCompletion(env, body);
    if (or.ok && or.text) {
      const parsedJson = parseJsonObjectFromModelText(or.text);
      const normalized = normalizeComplianceReview(parsedJson);
      if (normalized) return normalized;
    }
    if (!or.ok) {
      if (or.status === 429) {
        return reviewUnavailable("OpenRouter rate limit (HTTP 429).", [
          "Wait and retry; the worker already retried transient limits.",
          "Check usage limits at openrouter.ai for your key."
        ]);
      }
      return reviewUnavailable("OpenRouter request failed.", [
        `HTTP ${or.status}. Check OPENROUTER_API_KEY and OpenRouter status.`
      ]);
    }
    return reviewUnavailable("OpenRouter returned a response we could not parse as JSON.", [
      "Try OPENROUTER_REASONING=false if JSON mode conflicts with reasoning."
    ]);
  } catch (e) {
    return reviewUnavailable("LLM review failed with an unexpected error.", [
      String(e?.message || e || "unknown")
    ]);
  }
}

export function buildAppealLetter(analysis, patientName, insurerName) {
  const { summary, flags } = analysis;
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const items = flags
    .map(
      (f, i) => `
${i + 1}. CPT/HCPCS ${f.code} — ${f.description}
   Billed: $${f.billed.toFixed(2)} | Reasonable reference/benchmark: ~$${f.reasonableEstimate.toFixed(2)}
   Estimated overcharge: $${f.overchargeEstimate.toFixed(2)}
   Statutory / regulatory hooks (illustrative): ${(f.statutoryCitations || [])
     .map((s) => `${s.topic} (${s.reference})`)
     .join("; ")}`
    )
    .join("\n");

  const framework = `
Federal framework I am invoking (as applicable to my coverage and site of service):
• Hospital price transparency — 45 CFR Part 180 (standard charges; machine-readable file).
• No Surprises Act — 42 U.S.C. § 300gg-131 et seq.; implementing rules at 45 CFR Part 149 (where applicable).
• ERISA — 29 U.S.C. §§ 1132–1133; claims/reg appeals — 29 CFR § 2560.503-1 (self-funded / plan procedures).
• PPACA appeals — 45 CFR § 147.136; 29 CFR § 2590.715-2719 (internal/external review).
(State consumer-protection, balance-billing, and prompt-pay laws may also apply.)`;

  return `
${patientName}
${summary.facilityName ? `Re: Account / services at ${summary.facilityName}` : ""}
${insurerName ? `Cc: ${insurerName}` : ""}
Date: ${date}

Subject: NOTICE OF STATUTORY NON-COMPLIANCE & FORMAL ADMINISTRATIVE APPEAL

ATTENTION: COMPLIANCE OFFICER / BILLING INTEGRITY DEPARTMENT

This letter serves as a Formal Demand for a line-item audit and reconciliation of the attached invoice/EOB, including charges on my statement dated ${summary.statementDate ?? "[date]"}. This action is taken pursuant to my rights under federal law; it is not a request for financial assistance or a courtesy discount.

${framework}

Specific compliance notices:
1) Hospital Price Transparency (45 CFR Part 180):
   I am auditing your charges against Mandatory Machine-Readable File requirements under 45 CFR § 180.50. Any discrepancy between negotiated rates/standard charges and billed amounts may constitute a violation of federal disclosure mandates.

2) No Surprises Act (42 U.S.C. § 300gg-131 et seq.):
   Please provide Good Faith Estimate and out-of-network reconciliation where applicable. Failure to comply with dispute-resolution frameworks may be reported to CMS for further enforcement review.

I request a written reconciliation that addresses coding accuracy, duplicate or unbundled services, and consistency with posted standard charges (where required), plan allowed amounts, and applicable protections under the No Surprises Act for qualifying scenarios. The following line items are inconsistent with Medicare-aligned benchmarks and/or this facility's lower historical percentiles for the same services:${items}

I specifically request:
1. A fully itemized bill with CPT/HCPCS codes, modifiers, and revenue codes as applicable.
2. Reprocessing to the correct contracted / allowed amounts; removal of duplicate, upcoded, or medically unsupported entries where documented.
3. A written explanation of how each allowed amount was determined, including cross-walk to any Good Faith Estimate and plan EOB.

Under ERISA (29 U.S.C. § 1133) and applicable prompt-pay / consumer-protection timelines, I expect either a cured invoice or a detailed written response within 30 calendar days. Failure to respond may be interpreted as a bad-faith denial of transparency and appeal rights.

A copy of this correspondence and your subsequent response will be maintained for potential submission to the U.S. Department of Health and Human Services (HHS), CMS, ${insurerName || "[insurer]"}, and relevant state regulatory agencies should this matter remain unresolved.

Sincerely,
${patientName}

---
Disclaimer: Demo template only—not legal advice. Have a licensed professional review before sending.
`.trim();
}
