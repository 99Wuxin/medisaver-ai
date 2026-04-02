/**
 * @deprecated Use retrieval from `legalLibrary.js` via `retrieveStatutesForFlag` in production paths.
 * Kept for tests or legacy callers expecting a static list.
 */
export function statutoryCitationsForLine() {
  return [
    {
      topic: "Hospital price transparency (standard charges)",
      reference: "45 CFR Part 180 (esp. §§ 180.20–180.60)",
      id: "hpt-180"
    },
    {
      topic: "No Surprises Act — patient protections / balance billing (where applicable)",
      reference: "42 U.S.C. § 300gg-131 et seq.; 45 CFR Part 149 (Subparts E–G)",
      id: "nsa-300gg"
    },
    {
      topic: "ERISA — plan terms, benefits due, claims & appeals",
      reference: "29 U.S.C. §§ 1132, 1133; 29 CFR § 2560.503-1",
      id: "erisa-claims"
    },
    {
      topic: "PPACA — internal claims & external review (non-grandfathered plans)",
      reference: "29 CFR § 2590.715-2719; 45 CFR § 147.136",
      id: "ppaca-review"
    }
  ];
}
