import { LEGAL_LIBRARY } from "../data/legalLibrary.js";

const DEFAULT_MAX = 8;
const MIN_FALLBACK = 4;

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

/**
 * When there are no flags, still provide default federal framework excerpts for any narrative.
 */
export function retrieveDefaultStatutes(max = 5) {
  const defs = LEGAL_LIBRARY.filter((e) => e.tags?.includes("default"));
  return defs.slice(0, max);
}

export function clausesToStatutoryCitations(clauses) {
  return clauses.map((c) => ({
    topic: c.topic,
    reference: c.reference,
    id: c.id
  }));
}
