/**
 * Illustrative U.S. federal references commonly cited in hospital / plan billing disputes.
 * Production systems should verify current law, applicability, and state overlays with counsel.
 */

export function statutoryCitationsForLine() {
  return [
    {
      topic: "Hospital price transparency (standard charges)",
      reference: "45 CFR Part 180 (esp. §§ 180.20–180.60)"
    },
    {
      topic: "No Surprises Act — patient protections / balance billing (where applicable)",
      reference: "42 U.S.C. § 300gg-131 et seq.; 45 CFR Part 149 (Subparts E–G)"
    },
    {
      topic: "ERISA — plan terms, benefits due, claims & appeals",
      reference: "29 U.S.C. §§ 1132, 1133; 29 CFR § 2560.503-1"
    },
    {
      topic: "PPACA — internal claims & external review (non-grandfathered plans)",
      reference: "29 CFR § 2590.715-2719; 45 CFR § 147.136"
    }
  ];
}
