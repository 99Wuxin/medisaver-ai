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
  },
  {
    id: "gfe-149",
    topic: "Good Faith Estimates — uninsured / self-pay (where applicable)",
    reference: "45 CFR Part 149 (No Surprises Act implementing rules)",
    excerpt:
      "Providers and facilities may owe uninsured or self-pay individuals good-faith estimates of expected charges for scheduled items and services, with dispute-resolution pathways when final bills materially exceed estimates in qualifying cases.",
    cptPrefixes: [],
    keywords: ["estimate", "good faith", "self-pay", "uninsured", "scheduled"],
    tags: ["default", "nsa"]
  },
  {
    id: "idrf-nsa",
    topic: "No Surprises Act — independent dispute resolution (selected out-of-network)",
    reference: "42 U.S.C. § 300gg-131 et seq.; 45 CFR Part 149",
    excerpt:
      "For qualifying out-of-network emergency, certain post-stabilization, and air-ambulance scenarios, federal law establishes payment standards and independent dispute resolution between plans/providers and air ambulance providers where applicable.",
    cptPrefixes: [],
    keywords: ["dispute", "idr", "arbitration", "qualifying payment", "air ambulance", "oon"],
    tags: ["nsa", "default"]
  },
  {
    id: "mh-paeea",
    topic: "Mental health & substance-use parity (NMHPA / MHPAEA concepts)",
    reference: "29 U.S.C. § 1185a; 45 CFR §§ 146.136, 147.160 (illustrative)",
    excerpt:
      "Plans that cover mental health or substance-use disorder benefits generally must provide those financial requirements and treatment limitations no more restrictive than those applied to medical/surgical benefits in the same classification.",
    cptPrefixes: [],
    keywords: ["mental", "behavioral", "psychiatry", "therapy", "substance", "parity", "counseling"],
    tags: ["default"]
  },
  {
    id: "preventive-147",
    topic: "Preventive services coverage (non-grandfathered plans)",
    reference: "45 CFR § 147.130 et seq.",
    excerpt:
      "Non-grandfathered group and individual market plans must cover certain preventive services without cost-sharing when delivered by in-network providers, subject to scope and billing as preventive vs diagnostic.",
    cptPrefixes: [],
    keywords: ["preventive", "screening", "wellness", "immunization", "vaccine", "annual"],
    tags: ["default"]
  },
  {
    id: "telehealth-994",
    topic: "Telehealth / digital evaluation and management",
    reference: "PFS rules as applicable; plan telehealth policies",
    excerpt:
      "Telehealth visits are priced and audited using place-of-service, modifier, and audio/video requirements in payer policies; discrepancies between billed modality and documented service can drive appeals.",
    cptPrefixes: [],
    keywords: ["telehealth", "telemedicine", "virtual", "video", "remote", "e-visit", "digital visit"],
    tags: ["em"]
  },
  {
    id: "ed-emergency-e-m",
    topic: "Emergency department E/M levels",
    reference: "Plan medical necessity; CMS / payer ED coding guides (illustrative)",
    excerpt:
      "ED E/M levels should reflect documented acuity, work, and risk; routine down- or up-coding relative to charting is a frequent audit theme on facility and professional ED claims.",
    cptPrefixes: [],
    keywords: ["emergency", "er visit", "e.d.", "ed visit", "emergency room", "triage", "emergency dept"],
    tags: ["em", "nsa"]
  },
  {
    id: "observation-status",
    topic: "Observation vs inpatient status",
    reference: "Medicare two-midnight / MOON notices (illustrative); plan contracts",
    excerpt:
      "Observation hours and inpatient admission decisions affect facility payment and member cost-sharing; duplicate charging for overlapping observation and inpatient days may warrant reconciliation.",
    cptPrefixes: [],
    keywords: ["observation", "inpatient", "admission", "status", "midnight"],
    tags: ["hospital", "integrity"]
  },
  {
    id: "anesthesia-019",
    topic: "Anesthesia time, units, and concurrency",
    reference: "ASA / payer anesthesia guidelines (illustrative)",
    excerpt:
      "Anesthesia claims often combine base and time units; overlapping anesthesia for the same patient/period or inconsistent time reporting can conflict with payer edits.",
    cptPrefixes: ["00", "01"],
    keywords: ["anesthesia", "anesthetic", "crna", "asa"],
    tags: ["procedural"]
  },
  {
    id: "surgery-global",
    topic: "Surgical global periods & post-op care",
    reference: "CMS global surgery concepts; plan policies (illustrative)",
    excerpt:
      "Many surgical procedures include a global period bundling related pre- and post-operative care; separate billing for included follow-up or components may be improper.",
    cptPrefixes: [],
    keywords: ["surgery", "surgical", "operative", "post-op", "global period", "postoperative"],
    tags: ["integrity", "procedural"]
  },
  {
    id: "pt-ot-st-97",
    topic: "Physical, occupational, and speech therapy",
    reference: "Therapy caps / KX modifiers (Medicare illustrative); plan visit limits",
    excerpt:
      "Therapy services are audited for medical necessity, timed vs untimed units, and duplicate disciplines; exceeding authorized visits or missing certifications triggers denials.",
    cptPrefixes: ["97"],
    keywords: ["physical therapy", "occupational", "speech", "rehab", "therapy"],
    tags: ["procedural"]
  },
  {
    id: "dme-hcpcs",
    topic: "DME / supplies / orthotics (HCPCS)",
    reference: "DMEPOS fee schedules; plan rental vs purchase rules (illustrative)",
    excerpt:
      "Durable equipment and supply lines should match HCPCS, medical necessity, and rental-purchase rules; duplicate monthly rentals or wrong units are common audit targets.",
    cptPrefixes: ["A", "B", "E", "K", "L"],
    keywords: ["dme", "wheelchair", "walker", "brace", "orthotic", "prosthetic", "cpap", "supply"],
    tags: ["default"]
  },
  {
    id: "ambulance-ground",
    topic: "Ground ambulance transports",
    reference: "Medicare ambulance fee schedule concepts; plan prior auth (illustrative)",
    excerpt:
      "Ambulance claims require origin/destination, medical necessity, and level-of-service documentation; non-emergency stretcher vs wheelchair transports are frequently downcoded.",
    cptPrefixes: ["A0"],
    keywords: ["ambulance", "ems", "transport", "stretcher", "bls", "als"],
    tags: ["nsa"]
  },
  {
    id: "path-883",
    topic: "Pathology — technical vs professional component",
    reference: "CLFS; split-billing rules (illustrative)",
    excerpt:
      "Pathology and cytology may split technical and professional components; duplicate global billing when a reference lab already billed the technical portion is a known integrity issue.",
    cptPrefixes: ["88"],
    keywords: ["pathology", "biopsy", "cytology", "histology", "read", "tc ", "pc "],
    tags: ["lab"]
  },
  {
    id: "radiation-oncology",
    topic: "Radiation oncology / treatment planning",
    reference: "OPPS / freestanding center rules (illustrative)",
    excerpt:
      "Radiation courses bundle simulation, planning, and fractions in payer-specific ways; unbundled simulation or duplicate planning charges may exceed contract rates.",
    cptPrefixes: ["77"],
    keywords: ["radiation", "radiotherapy", "simulation", "imrt", "sbrt"],
    tags: ["radiology"]
  },
  {
    id: "wound-care-hbot",
    topic: "Advanced wound care & hyperbaric oxygen (illustrative)",
    reference: "NCD/LCD concepts; medical necessity (illustrative)",
    excerpt:
      "Wound care and HBO therapy often require documented Wagner grade or comparable criteria; routine HBO without qualifying diagnoses may be non-covered.",
    cptPrefixes: ["975", "976"],
    keywords: ["wound", "ulcer", "hyperbaric", "hbo", "debridement"],
    tags: ["procedural"]
  },
  {
    id: "dialysis-909",
    topic: "Dialysis (ESRD) facility billing",
    reference: "ESRD PPS concepts; consolidated billing (illustrative)",
    excerpt:
      "Dialysis facilities may bundle certain drugs and labs into the composite rate; separately billing bundled items can inflate totals relative to program rules.",
    cptPrefixes: ["909", "369"],
    keywords: ["dialysis", "esrd", "hemodialysis", "kidney"],
    tags: ["hospital", "lab"]
  },
  {
    id: "snf-consolidated",
    topic: "SNF consolidated billing (Medicare illustrative)",
    reference: "42 CFR Part 409 (illustrative); plan SNF day rules",
    excerpt:
      "Skilled nursing stays may package certain services during covered days; separately billing items included in the per-diem rate can duplicate payment.",
    cptPrefixes: [],
    keywords: ["snf", "skilled nursing", "nursing facility"],
    tags: ["hospital"]
  },
  {
    id: "home-health-42",
    topic: "Home health episodes & certification",
    reference: "42 CFR Part 484 (illustrative); plan home care policies",
    excerpt:
      "Home health claims require physician certification and episode timing; excessive visit counts or missing face-to-face documentation drive audits.",
    cptPrefixes: ["G0"],
    keywords: ["home health", "home care", "nurse visit", "episode"],
    tags: ["default"]
  },
  {
    id: "modifier-25-59",
    topic: "Modifiers — significant, separate E/M (-25) & distinct procedural (-59)",
    reference: "NCCI MUE / modifier indicators (illustrative)",
    excerpt:
      "Modifier -25 and -59 are frequent targets of payer edits; billing both a global procedure and a separate E/M without distinct documentation may be denied as bundled.",
    cptPrefixes: [],
    keywords: ["modifier", "distinct", "separate", "bundled", "ncci"],
    tags: ["integrity"]
  },
  {
    id: "prior-auth-utilization",
    topic: "Prior authorization & utilization management",
    reference: "Plan documents; state UM laws as applicable (illustrative)",
    excerpt:
      "Services requiring prior authorization may be denied retroactively if authorization is missing or wrong; appeals often hinge on timely submission and medical necessity evidence.",
    cptPrefixes: [],
    keywords: ["prior auth", "precert", "authorization", "referral", "utilization"],
    tags: ["default", "erisa"]
  },
  {
    id: "cob-secondary",
    topic: "Coordination of benefits (COB)",
    reference: "NAIC model; plan COB rules (illustrative)",
    excerpt:
      "When multiple payers exist, primary/secondary ordering and crossover payments affect patient responsibility; incorrect COB can leave inflated patient balances.",
    cptPrefixes: [],
    keywords: ["cob", "coordination", "secondary", "primary", "medicare secondary"],
    tags: ["default"]
  },
  {
    id: "timely-filing-appeals",
    topic: "Timely filing & appeal deadlines",
    reference: "29 CFR § 2560.503-1; plan SPD (illustrative)",
    excerpt:
      "ERISA plans and many payers impose strict deadlines for claims and appeals; late appeals may be barred even when the underlying charge dispute has merit.",
    cptPrefixes: [],
    keywords: ["deadline", "timely", "appeal", "180", "60 day", "filing"],
    tags: ["default", "erisa", "appeals"]
  },
  {
    id: "hipaa-access",
    topic: "HIPAA — access to PHI & accounting (billing records)",
    reference: "45 CFR §§ 164.524, 164.528",
    excerpt:
      "Individuals generally have a right to access and obtain copies of their health information, including billing and claims records held by covered entities, subject to reasonable cost-based fees.",
    cptPrefixes: [],
    keywords: ["hipaa", "records", "itemized", "phi", "access request"],
    tags: ["default"]
  },
  {
    id: "prompt-pay-state",
    topic: "Prompt-pay & consumer billing protections (state law overview)",
    reference: "State statutes vary (illustrative)",
    excerpt:
      "Many states impose deadlines and interest on clean claims payment and restrict certain balance-billing practices; these interact with federal NSA and plan contracts.",
    cptPrefixes: [],
    keywords: ["prompt pay", "interest", "clean claim", "state law", "consumer"],
    tags: ["default"]
  },
  {
    id: "upcoding-unbundling-fwa",
    topic: "Upcoding, unbundling, and fraud/waste/abuse frameworks",
    reference: "FCA concepts (illustrative); payer SIU (illustrative)",
    excerpt:
      "Systematic upcoding or unbundling may implicate false claims and payer special investigations; individual disputes still begin with itemization and contract benchmarks.",
    cptPrefixes: [],
    keywords: ["fraud", "abuse", "waste", "upcode", "fwa", "investigation"],
    tags: ["integrity", "default"]
  },
  {
    id: "asc-facility",
    topic: "Ambulatory surgical centers (ASC) vs HOPD pricing",
    reference: "ASC payment system; site-of-service differentials (illustrative)",
    excerpt:
      "Site-of-service rules shift allowed amounts between ASC, office, and hospital outpatient; billing at a higher site without qualifying circumstances can inflate patient liability.",
    cptPrefixes: [],
    keywords: ["asc", "surgical center", "outpatient surgery", "facility fee", "hopd"],
    tags: ["hospital", "transparency"]
  },
  {
    id: "drug-pricing-340b",
    topic: "Drug pricing — 340B, ASP, and pass-through (illustrative)",
    reference: "42 U.S.C. § 256b; CMS drug pricing (illustrative)",
    excerpt:
      "Hospital and physician drug charges may reference acquisition or 340B status; duplicate facility and professional drug lines or wrong J-codes are common audit hooks.",
    cptPrefixes: ["J"],
    keywords: ["drug", "pharmacy", "infusion", "chemotherapy", "340b", "ndc"],
    tags: ["procedural"]
  },
  {
    id: "professional-facility-split",
    topic: "Professional vs facility component (split billing)",
    reference: "OPPS / MPFS interaction (illustrative)",
    excerpt:
      "The same encounter may generate separate professional and facility claims; patients should verify that both sides reconcile to the same date of service and negotiated rates.",
    cptPrefixes: [],
    keywords: ["professional", "facility component", "split", "physician fee", "technical"],
    tags: ["default", "hospital"]
  }
];
