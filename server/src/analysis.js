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

/**
 * Mock "OCR" — demo returns a plausible bill if image present; otherwise uses body lines.
 */
export function mockExtractLineItems(_buffer, demoScenario) {
  if (demoScenario === "high") {
    return {
      facilityName: "General Metro Hospital",
      patientName: "DEMO PATIENT",
      statementDate: "2025-02-14",
      lineItems: [
        { code: "71046", description: "Chest X-ray 2 views", quantity: 1, billed: 1840 },
        { code: "80053", description: "CMP — comprehensive metabolic", quantity: 1, billed: 890 },
        { code: "85025", description: "CBC automated", quantity: 1, billed: 195 },
        { code: "99213", description: "Office visit est patient", quantity: 1, billed: 485 },
        { code: "36415", description: "Blood draw", quantity: 1, billed: 85 }
      ]
    };
  }
  return {
    facilityName: "General Metro Hospital",
    patientName: "DEMO PATIENT",
    statementDate: "2025-02-14",
    lineItems: [
      { code: "99213", description: "Office visit est patient", quantity: 1, billed: 265 },
      { code: "36415", description: "Blood draw", quantity: 1, billed: 45 }
    ]
  };
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
