import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const fmt = (n) =>
  typeof n === "number"
    ? n.toLocaleString("en-US", { style: "currency", currency: "USD" })
    : "—";

async function analyzeBill(formData) {
  const res = await fetch("/api/analyze", { method: "POST", body: formData });
  if (!res.ok) throw new Error("Analysis failed. Try again.");
  return res.json();
}

async function fetchAppeal(analysis, patientName, insurerName) {
  const res = await fetch("/api/appeal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ analysis, patientName, insurerName })
  });
  if (!res.ok) throw new Error("Could not generate appeal letter.");
  return res.json();
}

async function createCheckoutSession(planId) {
  const res = await fetch("/api/billing/checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "Could not start Stripe checkout.");
  }
  return data;
}

function ScrollReveal({ as: Tag = "div", className = "", delayMs = 0, children, ...props }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal-slide ${visible ? "is-visible" : ""} ${className}`.trim()}
      style={{ transitionDelay: `${delayMs}ms` }}
      {...props}
    >
      {children}
    </Tag>
  );
}

function SeverityPill({ severity }) {
  const map = {
    high: "bg-red-100 text-red-800",
    medium: "bg-amber-50 text-amber-800",
    low: "bg-slate-100 text-slate-600"
  };
  const label = { high: "High", medium: "Medium", low: "Low" }[severity] || severity;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[severity] || map.low}`}>
      {label}
    </span>
  );
}

/** Shield + StatuteBill wordmark (SVG, no external image). */
function BrandLogo({ className = "" }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        className="h-10 w-10 shrink-0 sm:h-11 sm:w-11"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M24 4L8 12v12c0 9.5 6.5 17.5 16 20 9.5-2.5 16-10.5 16-20V12L24 4z"
          fill="#1B365D"
          stroke="#E2E8F0"
          strokeWidth="1.5"
        />
        <path
          d="M24 14v20M14 24h20"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
      <div className="flex flex-col leading-tight">
        <span className="font-display text-lg font-bold tracking-tight text-brand-950 sm:text-xl">
          StatuteBill
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-500">
          The Settlement Shield
        </span>
      </div>
    </div>
  );
}

const PLANS = [
  {
    id: "basic",
    name: "Basic",
    price: "$9.9",
    tagline: "Ongoing defense, not a one-off audit",
    features: [
      "Unlimited bill audits",
      "AI risk flags on every upload",
      "Monthly credit monitoring"
    ],
    cta: "Get protected"
  },
  {
    id: "protector",
    name: "Protector",
    price: "$19.9",
    tagline: "Full statute-backed toolkit",
    features: [
      "Everything in Basic",
      "Auto-generated legal appeal letters",
      "Digital Protection Card for care visits",
      "FICO score defense & alerts"
    ],
    cta: "Get protected",
    featured: true
  },
  {
    id: "family",
    name: "Family Shield",
    price: "$29.9",
    tagline: "Cover everyone under one roof",
    features: [
      "Dependent coverage (household)",
      "Pre-care price comparison",
      "Shared case history & 24/7 statute guidance"
    ],
    cta: "Secure my bills"
  }
];

function IconDoc({ className = "h-8 w-8" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 3h8l4 4v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M15 3v4h4M8 12h8M8 16h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const COMPLIANCE_PILLARS = [
  {
    id: "cfr180",
    code: "45 CFR Part 180",
    title: "Hospital Price Transparency",
    body: "Hospitals must publish standard charges and machine-readable files—we compare your line items to those disclosures.",
    Icon: IconDoc
  },
  {
    id: "nsa",
    code: "No Surprises Act",
    title: "Balance-bill protections",
    body: "42 U.S.C. § 300gg-131 et seq.—helps challenge non-consensual or out-of-network surprise charges where the law applies.",
    Icon: IconDoc
  },
  {
    id: "erisa",
    code: "ERISA",
    title: "Plan rights & appeals",
    body: "29 U.S.C. §§ 1132–1133—statutory rights to benefits due and to appeal adverse benefit determinations on employer plans.",
    Icon: IconDoc
  }
];

function ComplianceShields() {
  return (
    <section id="compliance" className="mt-16 scroll-mt-20">
      <h2 className="text-center font-display text-xl font-bold text-brand-950 sm:text-2xl">
        Legal compliance you can cite
      </h2>
      <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-ink-600">
        StatuteBill is built to map billing disputes to authorities already in our audit engine—not
        generic “please lower my bill” emails.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {COMPLIANCE_PILLARS.map(({ id, code, title, body, Icon }) => (
          <div
            key={id}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-brand-950/10 p-2 text-brand-950">
                <Icon className="h-7 w-7" />
              </div>
              <div>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                  {code}
                </p>
                <h3 className="mt-1 font-semibold text-brand-950">{title}</h3>
              </div>
            </div>
            <p className="mt-3 flex-1 text-xs leading-relaxed text-ink-600">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AppealLetterPreview() {
  return (
    <section
      id="appeal-preview"
      className="mt-14 scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <h2 className="font-display text-lg font-bold text-brand-950 sm:text-xl">
        Formal Request for Review — preview
      </h2>
      <p className="mt-2 text-sm text-ink-600">
        This is not a casual complaint. Outputs follow a{" "}
        <strong className="text-brand-950">federal regulatory framework</strong> as a formal
        request for review, adjustment, and correction—citing transparency, surprise-billing, and
        plan-appeal rules where applicable.
      </p>
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        <div className="border-b border-slate-200 bg-white px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-ink-500">
          Redacted excerpt · illustrative
        </div>
        <div className="max-h-[220px] overflow-y-auto p-4 font-mono text-[11px] leading-relaxed text-ink-800 sm:text-xs">
          <p className="font-semibold text-brand-950">Subject: Formal request for review (federal & plan-based rights)</p>
          <p className="mt-2 text-ink-600">
            Dear Billing Integrity / Appeals Department,
            <br />
            <br />
            I am exercising rights under applicable federal law and my plan—not requesting a
            courtesy discount.
          </p>
          <p className="mt-3 text-ink-700">
            <span className="text-ink-500">Federal framework referenced:</span>
            <br />• Hospital price transparency —{" "}
            <mark className="rounded bg-amber-200 px-0.5 text-brand-950">45 CFR Part 180</mark>{" "}
            (standard charges; machine-readable file).
            <br />• No Surprises Act — 42 U.S.C. § 300gg-131 et seq. (where applicable).
            <br />• ERISA — 29 U.S.C. §§ 1132–1133; claims procedures —{" "}
            <mark className="rounded bg-amber-200 px-0.5 text-brand-950">29 CFR § 2560.503-1</mark>.
          </p>
          <p className="mt-3 text-ink-500">
            [Line-item reconciliation with CPT/HCPCS, benchmarks, and plan EOB cross-walk follows
            in full letter…]
          </p>
        </div>
      </div>
    </section>
  );
}

function IconShield({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V7l8-4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconDatabase({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <ellipse cx="12" cy="6" rx="7" ry="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconScale({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3v18M6 9l12-4M6 15l12 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="6" cy="9" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="18" cy="5" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="18" cy="19" r="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ComplianceFooterBadges() {
  const items = [
    { label: "HIPAA Compliant", sub: "Privacy & PHI-safe handling", Icon: IconShield },
    { label: "CMS Data Integrated", sub: "Federal Medicare benchmark feeds", Icon: IconDatabase },
    { label: "Federal Statute Protected", sub: "Transparency & appeal authorities", Icon: IconScale }
  ];
  return (
    <div className="mt-6 flex flex-wrap justify-center gap-4 border-t border-slate-200 pt-6">
      {items.map(({ Icon, label, sub }) => (
        <div
          key={label}
          className="flex min-w-[140px] flex-1 flex-col items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-center sm:min-w-[160px]"
        >
          <Icon className="mx-auto h-6 w-6 text-brand-700" />
          <span className="mt-2 text-xs font-semibold text-brand-950">{label}</span>
          <span className="mt-1 text-[10px] text-ink-500">{sub}</span>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [demoScenario, setDemoScenario] = useState("high");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [patientName, setPatientName] = useState("Jane Doe");
  const [insurerName, setInsurerName] = useState("Your insurer");
  const [letter, setLetter] = useState(null);
  const [letterLoading, setLetterLoading] = useState(false);
  const [billingLoadingPlan, setBillingLoadingPlan] = useState(null);

  const runDemo = useCallback(async () => {
    setError(null);
    setLoading(true);
    setLetter(null);
    try {
      const fd = new FormData();
      fd.append("demoScenario", demoScenario);
      const data = await analyzeBill(fd);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [demoScenario]);

  const onDrop = useCallback(
    async (e) => {
      e.preventDefault();
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      setError(null);
      setLoading(true);
      setLetter(null);
      try {
        const fd = new FormData();
        fd.append("bill", file);
        fd.append("demoScenario", demoScenario);
        const data = await analyzeBill(fd);
        setResult(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [demoScenario]
  );

  const onFileInput = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setError(null);
      setLoading(true);
      setLetter(null);
      try {
        const fd = new FormData();
        fd.append("bill", file);
        fd.append("demoScenario", demoScenario);
        const data = await analyzeBill(fd);
        setResult(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [demoScenario]
  );

  const generateLetter = useCallback(async () => {
    if (!result?.analysis) return;
    setLetterLoading(true);
    try {
      const { letter: text } = await fetchAppeal(
        result.analysis,
        patientName,
        insurerName
      );
      setLetter(text);
    } catch {
      setError("Could not generate appeal letter.");
    } finally {
      setLetterLoading(false);
    }
  }, [result, patientName, insurerName]);

  const savingsPct = useMemo(() => {
    const s = result?.analysis?.summary;
    if (!s?.totalBilled) return 0;
    return Math.round((s.potentialSavings / s.totalBilled) * 100);
  }, [result]);

  const topCitations = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const f of result?.analysis?.flags ?? []) {
      for (const c of f.statutoryCitations ?? []) {
        if (!seen.has(c.reference)) {
          seen.add(c.reference);
          out.push(c);
          if (out.length >= 3) return out;
        }
      }
    }
    return out;
  }, [result]);

  const startSubscription = useCallback(async (planId) => {
    setError(null);
    setBillingLoadingPlan(planId);
    try {
      const session = await createCheckoutSession(planId);
      if (session?.url) {
        window.location.href = session.url;
      }
    } catch (e) {
      setError(e.message || "Unable to start checkout.");
    } finally {
      setBillingLoadingPlan(null);
    }
  }, []);

  const steps = [
    {
      title: "Upload",
      body: "Snap a photo of your medical bill or EOB—we read the line items."
    },
    {
      title: "Audit",
      body: "Cross-check each line against CMS locality benchmarks and facility history where available."
    },
    {
      title: "Appeal",
      body: "Export a Formal Request for Review citing 45 CFR Part 180, NSA, ERISA, and plan procedures."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-slate-50 to-indigo-50">
      <header className="border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <a href="/" className="flex items-center gap-2">
            <BrandLogo />
          </a>
          <nav className="flex items-center gap-4 text-sm font-medium text-brand-950">
            <a href="#compliance" className="transition-colors hover:text-blue-600">
              Compliance
            </a>
            <a href="#pricing" className="transition-colors hover:text-indigo-600">
              Plans
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:pt-14">
        <section className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
            Federal Compliance Audit &amp; Billing Protection
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-brand-950 sm:text-4xl">
            StatuteBill
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-base text-ink-700">
            We don&apos;t just ask for discounts; we enforce transparency laws—mapping your charges
            to CMS benchmarks, hospital disclosures, and statute-backed appeal language.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href="#demo"
              className="rounded-xl bg-gradient-to-r from-brand-950 to-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-brand-900 hover:to-blue-600"
            >
              Run compliance audit
            </a>
            <a
              href="#pricing"
              className="rounded-xl border border-slate-200 bg-white/90 px-5 py-2.5 text-sm font-semibold text-brand-950 transition hover:border-indigo-300 hover:bg-indigo-50/70"
            >
              View plans
            </a>
          </div>
          <p className="mx-auto mt-3 max-w-lg text-xs leading-relaxed text-ink-500">
            Illustrative audits reference{" "}
            <span className="font-semibold text-brand-800">CMS-aligned benchmarks</span>—your
            outcomes depend on your plan, provider, and facts.
          </p>
        </section>

        <ScrollReveal as="section" id="how" className="mt-12">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-ink-500">
            How it works
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {steps.map((s, i) => (
              <ScrollReveal
                as="div"
                key={s.title}
                delayMs={80 * i}
                className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-sky-50 p-4 text-center shadow-sm"
              >
                <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-brand-950 text-sm font-bold text-white">
                  {i + 1}
                </div>
                <h3 className="mt-3 font-semibold text-brand-950">{s.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-600">{s.body}</p>
              </ScrollReveal>
            ))}
          </div>
        </ScrollReveal>

        <section id="demo" className="mt-14">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
            Compliance audit
          </h2>
          <p className="mt-1 text-sm text-ink-600">
            Upload optional—pick a sample scenario, drop a bill, or run the built-in illustration.
          </p>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setDemoScenario("high")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                demoScenario === "high"
                  ? "bg-brand-950 text-white"
                  : "bg-white text-ink-800 ring-1 ring-slate-200"
              }`}
            >
              Big bill
            </button>
            <button
              type="button"
              onClick={() => setDemoScenario("low")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                demoScenario === "low"
                  ? "bg-brand-950 text-white"
                  : "bg-white text-ink-800 ring-1 ring-slate-200"
              }`}
            >
              Small bill
            </button>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="mt-4 flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-gradient-to-br from-white to-blue-50 p-5 text-center"
          >
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              id="bill-upload"
              onChange={onFileInput}
            />
            <label htmlFor="bill-upload" className="cursor-pointer">
              <span className="text-sm font-medium text-brand-950">Drop a bill or tap to upload</span>
            </label>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={runDemo}
            className="mt-3 w-full rounded-xl bg-gradient-to-r from-brand-950 to-indigo-700 py-3 text-sm font-semibold text-white transition hover:from-brand-900 hover:to-indigo-600 disabled:opacity-60"
          >
            {loading ? "Running…" : "Run audit (no file)"}
          </button>

          {error && (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          {result && (
            <ScrollReveal
              as="div"
              className="mt-8 space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-ink-500">Billed</p>
                  <p className="text-xl font-bold text-brand-950">
                    {fmt(result.analysis.summary.totalBilled)}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                    Potential overcharge (est.)
                  </p>
                  <p className="text-3xl font-extrabold text-amber-700 sm:text-4xl">
                    {fmt(result.analysis.summary.potentialSavings)}
                  </p>
                  <p className="text-sm font-semibold text-amber-900">~{savingsPct}% of billed</p>
                </div>
              </div>

              <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/90 to-indigo-50/70 p-3 text-xs leading-relaxed text-ink-800">
                <p className="font-semibold text-brand-950">Authoritative price reference (CMS)</p>
                <p className="mt-1">
                  Benchmarks in this audit reference{" "}
                  <strong>CMS (Centers for Medicare &amp; Medicaid Services)</strong> published
                  locality market fair pricing and fee schedules aligned to your service codes
                  {result.analysis.summary.locality
                    ? ` (${result.analysis.summary.locality})`
                    : ""}
                  . They are used to test whether your billed amounts sit outside defensible ranges—not
                  as a guarantee of payment.
                </p>
              </div>

              {result.analysis.flags.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-ink-500">Flagged lines &amp; sources</p>
                  <ul className="mt-2 divide-y divide-slate-100">
                    {result.analysis.flags.slice(0, 6).map((f, i) => (
                      <li key={`${f.code}-${i}`} className="py-3 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span className="font-mono text-xs text-ink-600">{f.code}</span>
                            <p className="text-ink-800">{f.description}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-medium">{fmt(f.billed)}</p>
                            <SeverityPill severity={f.severity} />
                          </div>
                        </div>
                        {f.cmsBenchmarkSource && (
                          <p className="mt-2 text-xs leading-relaxed text-ink-600">
                            <span className="font-medium text-brand-950">CMS benchmark: </span>
                            This line is compared to{" "}
                            <span className="font-medium">{f.cmsBenchmarkSource}</span>—a CMS-published
                            reference for fair market pricing in this category.
                          </p>
                        )}
                        {f.locality && (
                          <p className="mt-1 text-[11px] text-ink-500">{f.locality}</p>
                        )}
                        {f.hospitalHistorical && (
                          <p className="mt-2 text-xs leading-relaxed text-amber-900">
                            <span className="font-medium">Hospital historical distribution: </span>
                            At {f.hospitalHistorical.facilityName}, the 25th percentile billed for
                            this code was {fmt(f.hospitalHistorical.p25)} (median billed ~{" "}
                            {fmt(f.hospitalHistorical.medianBilled)}). Your charge of {fmt(f.billed)}{" "}
                            shows a <strong>significant premium</strong> versus that facility peer
                            band—use with your itemized detail and EOB.
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {topCitations.length > 0 && (
                <div className="rounded-xl bg-slate-50 p-3 text-xs text-ink-700">
                  <span className="font-medium text-brand-950">Statutory citations: </span>
                  {topCitations.map((c) => c.reference).join(" · ")}
                </div>
              )}

              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-medium text-ink-500">Formal Request for Review (draft)</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Patient name"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                  />
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Insurer"
                    value={insurerName}
                    onChange={(e) => setInsurerName(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  disabled={letterLoading}
                  onClick={generateLetter}
                  className="mt-2 rounded-lg bg-gradient-to-r from-brand-950 to-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:from-brand-900 hover:to-blue-600 disabled:opacity-60"
                >
                  {letterLoading ? "Generating…" : "Generate Formal Request for Review"}
                </button>
                {letter && (
                  <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
                    {letter}
                  </pre>
                )}
              </div>
            </ScrollReveal>
          )}

        </section>

        <ScrollReveal as="div">
          <ComplianceShields />
        </ScrollReveal>
        <ScrollReveal as="div" delayMs={80}>
          <AppealLetterPreview />
        </ScrollReveal>

        <ScrollReveal as="section" id="pricing" className="mt-16 border-t border-slate-200/80 pt-14">
          <h2 className="text-center font-display text-2xl font-bold text-brand-950">
            Plans
          </h2>
          <p className="mx-auto mt-2 max-w-md text-center text-sm text-ink-600">
            Keep protection on month after month—cancel anytime in the Stripe customer portal.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {PLANS.map((plan) => (
              <ScrollReveal
                as="div"
                key={plan.id}
                delayMs={100 * (plan.featured ? 1 : plan.id === "family" ? 2 : 0)}
                className={`flex flex-col rounded-2xl border p-5 ${
                  plan.featured
                    ? "border-blue-400 bg-gradient-to-br from-white to-blue-50 shadow-md ring-2 ring-blue-100"
                    : "border-slate-200 bg-gradient-to-br from-white to-indigo-50/40"
                }`}
              >
                <h3 className="font-semibold text-brand-950">{plan.name}</h3>
                <p className="mt-2 text-3xl font-black text-brand-950">
                  {plan.price}
                  <span className="text-sm font-normal text-ink-500">/mo</span>
                </p>
                <p className="mt-1 text-xs text-ink-500">{plan.tagline}</p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-ink-700">
                  {plan.features.map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-600" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => startSubscription(plan.id)}
                  disabled={billingLoadingPlan !== null}
                  className={`mt-5 w-full rounded-xl py-2.5 text-sm font-bold ${
                    plan.featured
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
                      : "bg-gradient-to-r from-brand-950 to-blue-700 text-white hover:from-brand-900 hover:to-blue-600"
                  } disabled:opacity-60`}
                >
                  {billingLoadingPlan === plan.id ? "Opening checkout…" : plan.cta}
                </button>
              </ScrollReveal>
            ))}
          </div>
        </ScrollReveal>
      </main>

      <footer className="border-t border-slate-200/80 bg-gradient-to-r from-slate-100/80 to-indigo-100/70">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-5 text-center shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
              Important notice
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-700">
              StatuteBill provides educational tools and illustrative drafts based on publicly
              available rules and benchmarks. It is{" "}
              <strong className="font-semibold text-brand-950">not</strong> legal, medical, or
              insurance advice. Outcomes depend on your plan, provider, and facts—consult a
              licensed professional before relying on any letter or filing.
            </p>
            <p className="mt-3 text-xs text-ink-500">
              Sample data shown for product illustration only—not a prediction of your outcome.
            </p>
            <ComplianceFooterBadges />
          </div>
        </div>
      </footer>
    </div>
  );
}
