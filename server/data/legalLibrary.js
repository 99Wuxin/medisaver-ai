/**
 * Curated excerpts for retrieval → LLM grounding (not a substitute for legal advice).
 * Each entry must have stable `id` for citation in model output.
 */

export const LEGAL_LIBRARY = [
  {
    id: "hpt-180",
    topic: "Hospital price transparency (standard charges)",
    reference: "45 CFR Part 180 (esp. §§ 180.20–180.60)",
    excerpt:
      "Hospitals must make standard charges public, including via machine-readable files, so patients and plans can compare billed amounts to disclosed rates where applicable.",
    cptPrefixes: [],
    keywords: ["hospital", "facility", "charge", "standard"],
    tags: ["default", "transparency"]
  },
  {
    id: "nsa-300gg",
    topic: "No Surprises Act — balance billing / surprise bills",
    reference: "42 U.S.C. § 300gg-131 et seq.; 45 CFR Part 149",
    excerpt:
      "Federal law limits surprise billing for certain out-of-network emergency and air-ambulance services and establishes dispute resolution where applicable; good-faith estimates and plan disclosures interact with billed amounts.",
    cptPrefixes: [],
    keywords: ["emergency", "out-of-network", "oon", "ambulance", "surprise"],
    tags: ["default", "nsa"]
  },
  {
    id: "erisa-claims",
    topic: "ERISA — claims and appeals",
    reference: "29 U.S.C. §§ 1132, 1133; 29 CFR § 2560.503-1",
    excerpt:
      "For ERISA-covered plans, participants may pursue benefits due and follow plan claims procedures; adverse benefit determinations trigger appeal rights and timelines.",
    cptPrefixes: [],
    keywords: ["plan", "eob", "appeal", "claim", "denied", "benefit"],
    tags: ["default", "erisa"]
  },
  {
    id: "ppaca-review",
    topic: "PPACA — internal and external review",
    reference: "29 CFR § 2590.715-2719; 45 CFR § 147.136",
    excerpt:
      "Non-grandfathered health plans must provide internal claims appeal and external review processes for adverse determinations where applicable.",
    cptPrefixes: [],
    keywords: ["review", "appeal", "denial", "external"],
    tags: ["default", "appeals"]
  },
  {
    id: "imaging-radiology",
    topic: "Imaging / radiology pricing disputes",
    reference: "45 CFR Part 180 (disclosure); plan/contract terms as applicable",
    excerpt:
      "High-cost imaging (e.g., CT/MRI/X-ray) is often compared to plan allowed amounts and facility posted charges; itemized codes and modifiers support audit of billed vs allowed.",
    cptPrefixes: ["70", "71", "72", "73", "74"],
    keywords: ["x-ray", "ct", "mri", "scan", "radiology", "imaging", "fluoroscopy"],
    tags: ["radiology"]
  },
  {
    id: "lab-path",
    topic: "Clinical laboratory / pathology",
    reference: "CLFS / PFS concepts; plan terms; 45 CFR Part 180 where hospital outpatient",
    excerpt:
      "Laboratory services are frequently priced using fee schedules or contract rates; duplicate panels and unbundling are common audit targets on itemized bills.",
    cptPrefixes: ["80", "81", "82", "83", "84", "85", "86", "87", "88", "89"],
    keywords: ["lab", "blood", "urinalysis", "pathology", "cbc", "cmp", "metabolic"],
    tags: ["lab"]
  },
  {
    id: "em-evaluation",
    topic: "Evaluation and management (E/M) visits",
    reference: "Plan coding policies; medical necessity documentation",
    excerpt:
      "E/M levels must align with documented visit complexity; upcoding relative to time and complexity is a common billing integrity issue in appeals.",
    cptPrefixes: ["99"],
    keywords: ["office", "visit", "established", "consult", "e/m"],
    tags: ["em"]
  },
  {
    id: "cardiac-diagnostics",
    topic: "Cardiac diagnostics (e.g., ECG)",
    reference: "PFS / OPPS as applicable; plan benefits",
    excerpt:
      "Cardiac diagnostic tests should match documented indications; duplicate or routine ECG billing may conflict with coverage policies.",
    cptPrefixes: ["93"],
    keywords: ["ecg", "ekg", "electrocardiogram", "cardiac", "heart"],
    tags: ["cardiac"]
  },
  {
    id: "phlebotomy",
    topic: "Specimen collection / phlebotomy",
    reference: "Bundling rules; OPPS packaging as applicable",
    excerpt:
      "Venipuncture may be bundled with certain lab panels or encounters; separate line items warrant review against coding and bundling rules.",
    cptPrefixes: ["36"],
    keywords: ["draw", "phlebotomy", "venipuncture", "blood draw"],
    tags: ["lab"]
  },
  {
    id: "therapeutic-inj",
    topic: "Therapeutic injections / drug administration",
    reference: "Drug pricing; administration coding; plan edits",
    excerpt:
      "Injection administration codes are often paired with drug NDCs; separate billing for administration and drug should align with payer rules.",
    cptPrefixes: ["96"],
    keywords: ["injection", "therapeutic", "administration"],
    tags: ["procedural"]
  },
  {
    id: "facility-fees",
    topic: "Facility / outpatient department fees",
    excerpt:
      "Hospital outpatient departments may bill facility fees distinct from professional fees; transparency files and EOB allowed amounts help verify consistency.",
    reference: "OPPS; 45 CFR Part 180; plan contract",
    keywords: ["facility", "hospital", "outpatient", "department"],
    tags: ["hospital", "default"]
  },
  {
    id: "duplicate-unbundle",
    topic: "Duplicate services / unbundling",
    reference: "NCCI / payer edits (illustrative)",
    excerpt:
      "Multiple lines for overlapping services may indicate duplicate billing or incorrect unbundling when a single bundled payment applies.",
    cptPrefixes: [],
    keywords: ["duplicate", "repeat", "panel"],
    tags: ["integrity"]
  }
];
