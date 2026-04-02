import { LEGAL_LIBRARY } from "../data/legalLibrary.js";

const DEFAULT_MAX = 16;
const MIN_FALLBACK = 6;

function scoreEntry(entry, code, descriptionLower, severity) {
  let score = 0;
  const c = String(code || "").replace(/\s/g, "");

  for (const prefix of entry.cptPrefixes || []) {
    const p = String(prefix);
    if (p && c.startsWith(p)) score += 3 + Math.min(p.length, 3);
  }

  for (const kw of entry.keywords || []) {
    if (kw && descriptionLower.includes(String(kw).toLowerCase())) score += 2;
  }

  if (severity === "high") {
    if (entry.tags?.includes("nsa")) score += 1;
    if (entry.tags?.includes("integrity")) score += 1;
  }

  if (entry.tags?.includes("default")) score += 0.5;

  return score;
}

/**
 * Retrieve statute excerpts relevant to a flagged line (CPT/HCPCS, description, severity).
 */
/**
 * Bill-level retrieval: aggregate relevance across all line items (RAG corpus selection).
 */
export function retrieveStatutesForBill(parsed, max = DEFAULT_MAX) {
  const lineItems = parsed?.lineItems || [];
  const agg = new Map();

  const pushScore = (id, delta) => {
    if (!id || delta <= 0) return;
    agg.set(id, (agg.get(id) || 0) + delta);
  };

  for (const row of lineItems) {
    const descriptionLower = String(row.description || "").toLowerCase();
    for (const entry of LEGAL_LIBRARY) {
      const s = scoreEntry(entry, row.code, descriptionLower, "medium");
      if (s > 0) pushScore(entry.id, s);
    }
  }

  const facilityLower = String(parsed?.facilityName || "").toLowerCase();
  for (const entry of LEGAL_LIBRARY) {
    for (const kw of entry.keywords || []) {
      if (kw && facilityLower.includes(String(kw).toLowerCase())) {
        pushScore(entry.id, 1.5);
      }
    }
  }

  const ranked = [...LEGAL_LIBRARY]
    .map((e) => ({ entry: e, score: agg.get(e.id) || 0 }))
    .sort((a, b) => b.score - a.score);

  const out = [];
  const seen = new Set();
  const push = (entry) => {
    if (!entry || seen.has(entry.id)) return;
    seen.add(entry.id);
    out.push(entry);
  };

  for (const { entry, score } of ranked) {
    if (score > 0) push(entry);
    if (out.length >= max) return out;
  }

  for (const entry of LEGAL_LIBRARY) {
    if (entry.tags?.includes("default")) push(entry);
    if (out.length >= MIN_FALLBACK) break;
  }

  for (const { entry } of ranked) {
    push(entry);
    if (out.length >= MIN_FALLBACK) break;
  }

  return out.slice(0, max);
}

/**
 * Prefer clauses from the bill-level RAG pool; fall back to per-line retrieval.
 */
export function selectClausesForLine(flag, ragPool, max = DEFAULT_MAX) {
  if (ragPool?.length) {
    const descriptionLower = String(flag?.description || "").toLowerCase();
    const ranked = ragPool
      .map((entry) => ({
        entry,
        score: scoreEntry(entry, flag.code, descriptionLower, flag.severity)
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    if (ranked.length) return ranked.slice(0, max).map((x) => x.entry);
  }
  return retrieveStatutesForFlag(flag, max);
}

export function retrieveStatutesForFlag(flag, max = DEFAULT_MAX) {
  const code = String(flag?.code || "").trim();
  const descriptionLower = String(flag?.description || "").toLowerCase();
  const severity = flag?.severity || "low";

  const ranked = LEGAL_LIBRARY.map((entry) => ({
    entry,
    score: scoreEntry(entry, code, descriptionLower, severity)
  })).sort((a, b) => b.score - a.score);

  const out = [];
  const push = (entry) => {
    if (!entry || out.some((e) => e.id === entry.id)) return;
    out.push(entry);
  };

  for (const { entry, score } of ranked) {
    if (score > 0) push(entry);
    if (out.length >= max) return out;
  }

  for (const entry of LEGAL_LIBRARY) {
    if (entry.tags?.includes("default")) push(entry);
    if (out.length >= MIN_FALLBACK) break;
  }

  for (const { entry } of ranked) {
    push(entry);
    if (out.length >= MIN_FALLBACK) break;
  }

  return out.slice(0, max);
}

export function clausesToStatutoryCitations(clauses) {
  return clauses.map((c) => ({
    topic: c.topic,
    reference: c.reference,
    id: c.id
  }));
}
