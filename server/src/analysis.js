import { cmsReference, hospitalHistorical, LOCALITY } from "../data/cmsReference.js";
import { statutoryCitationsForLine } from "../data/statutes.js";

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

function coerceGeminiOutput(parsed, demoScenario) {
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

async function generateWithGemini(env, demoScenario) {
  const apiKey = env?.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = env?.GEMINI_MODEL || "gemini-2.5-flash";
  const variationToken = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const prompt = `Generate ONE synthetic US medical bill JSON object for audit testing.
Requirements:
- Output ONLY valid JSON (no markdown).
- Use schema:
{
  "facilityName": "string",
  "patientName": "string",
  "statementDate": "YYYY-MM-DD",
  "lineItems": [{ "code":"CPT/HCPCS", "description":"string", "quantity":number, "billed":number }]
}
- Scenario: ${demoScenario === "high" ? "high billed amount with 4-6 lines" : "small bill with 2-3 lines"}.
- IMPORTANT: make this case materially different from previous generations: use different CPT/HCPCS combinations, different descriptions, different facility and patient alias.
- Keep all values realistic but varied each run.
- Use this variation token to force uniqueness: ${variationToken}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generationConfig: {
          temperature: 1.1,
          topP: 0.95,
          topK: 40
        },
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  if (!res.ok) return null;
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;

  // Gemini may occasionally wrap JSON in markdown fences.
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(cleaned);
  return coerceGeminiOutput(parsed, demoScenario);
}

/**
 * Mock "OCR" — demo returns a plausible bill if image present; otherwise uses body lines.
 */
export async function mockExtractLineItems(_buffer, demoScenario, env) {
  try {
    const generated = await generateWithGemini(env, demoScenario);
    if (generated) return generated;
  } catch {
    // Silent fallback keeps demo resilient if Gemini is unavailable.
  }
  return fallbackDemoScenario(demoScenario);
}

export function analyzeBill(parsed) {
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
      const statutes = statutoryCitationsForLine();
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
        statutoryCitations: statutes,
        legalBasis: [
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

Subject: Formal request for review, adjustment, and correction of charges (federal & plan-based rights)

Dear Billing Integrity / Appeals Department,

I am writing to dispute specific charges on my statement dated ${summary.statementDate ?? "[date]"}. This letter places you on notice that I am exercising rights and expectations created under federal law and under my health plan—not merely asking for a “courtesy” discount.

${framework}

I request a written reconciliation that addresses coding accuracy, duplicate or unbundled services, and consistency with posted standard charges (where required), plan allowed amounts, and applicable protections under the No Surprises Act for qualifying scenarios. The following line items are inconsistent with Medicare-aligned benchmarks and/or this facility's lower historical percentiles for the same services:${items}

I specifically request:
1. A fully itemized bill with CPT/HCPCS codes, modifiers, and revenue codes as applicable.
2. Reprocessing to the correct contracted / allowed amounts; removal of duplicate, upcoded, or medically unsupported entries where documented.
3. A written explanation of how each allowed amount was determined, including cross-walk to any Good Faith Estimate and plan EOB.

If not resolved within the timeframes in my plan documents and applicable state/federal rules, I will escalate to ${insurerName || "[insurer]"}, applicable external review, and regulatory channels as permitted.

Sincerely,
${patientName}

---
Disclaimer: Demo template only—not legal advice. Have a licensed professional review before sending.
`.trim();
}
