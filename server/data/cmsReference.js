/**
 * Demo reference rates inspired by Medicare Physician Fee Schedule / OPPS concepts.
 * Real production would load CMS public use files (PFS, OPPS, CLFS) by locality.
 */
export const LOCALITY = "Locality 01 (e.g. Metro benchmark)";

export const cmsReference = [
  {
    code: "80053",
    description: "Comprehensive metabolic panel",
    typicalAllowed: 18,
    source: "CMS CLFS / lab benchmark (illustrative)"
  },
  {
    code: "85025",
    description: "CBC with automated differential",
    typicalAllowed: 12,
    source: "CMS CLFS (illustrative)"
  },
  {
    code: "71046",
    description: "Radiologic exam, chest; 2 views",
    typicalAllowed: 85,
    source: "Medicare OPPS national benchmark (illustrative)"
  },
  {
    code: "99213",
    description: "Office visit, established patient, low complexity",
    typicalAllowed: 92,
    source: "Medicare PFS non-facility (illustrative)"
  },
  {
    code: "99214",
    description: "Office visit, established patient, moderate complexity",
    typicalAllowed: 135,
    source: "Medicare PFS non-facility (illustrative)"
  },
  {
    code: "93000",
    description: "Electrocardiogram, complete",
    typicalAllowed: 28,
    source: "Medicare PFS (illustrative)"
  },
  {
    code: "36415",
    description: "Routine venipuncture",
    typicalAllowed: 3,
    source: "Medicare PFS (illustrative)"
  },
  {
    code: "J0897",
    description: "Drug / biologic (example HCPCS)",
    typicalAllowed: 420,
    source: "ASP pricing reference (illustrative)"
  }
];

export const hospitalHistorical = {
  "General Metro Hospital": {
    "71046": { medianBilled: 780, p25: 420 },
    "80053": { medianBilled: 145, p25: 45 },
    "99213": { medianBilled: 320, p25: 180 }
  }
};
