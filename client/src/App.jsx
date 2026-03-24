import { useCallback, useMemo, useState } from "react";

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

function SeverityPill({ severity }) {
  const map = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-alert-50 text-alert-600 border-alert-400/40",
    low: "bg-slate-100 text-slate-600 border-slate-200"
  };
  const label = { high: "High", medium: "Medium", low: "Low" }[severity] || severity;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[severity] || map.low}`}
    >
      Risk {label}
    </span>
  );
}

function BrandLogo({ className = "" }) {
  return (
    <div className={`flex flex-col items-start ${className}`}>
      <img
        src="/medisaver-logo.png"
        alt="StatuteBill — The Settlement Shield"
        className="h-12 w-auto sm:h-14"
        width={200}
        height={56}
      />
    </div>
  );
}

export default function App() {
  const [demoScenario, setDemoScenario] = useState("high");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [patientName, setPatientName] = useState("Jane Doe");
  const [insurerName, setInsurerName] = useState("Sample Health Plan");
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

  const uniqueStatutoryCitations = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const f of result?.analysis?.flags ?? []) {
      for (const c of f.statutoryCitations ?? []) {
        const k = `${c.topic}|${c.reference}`;
        if (!seen.has(k)) {
          seen.add(k);
          out.push(c);
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-slate-50">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <a href="#" className="flex items-center gap-3">
            <BrandLogo />
          </a>
          <nav className="flex flex-wrap gap-4 text-sm font-medium text-brand-950/90 sm:gap-6">
            <a href="#problem" className="hover:text-brand-600">
              The problem
            </a>
            <a href="#legal" className="hover:text-brand-600">
              Legal levers
            </a>
            <a href="#product" className="hover:text-brand-600">
              How it works
            </a>
            <a href="#pricing" className="hover:text-brand-600">
              Pricing
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pt-16">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="inline-flex rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-medium text-brand-950 shadow-sm">
                StatuteBill.com · Your always-on medical billing protection dashboard
              </p>
              <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-brand-950 sm:text-5xl">
                Stay protected every month with{" "}
                <span className="text-brand-600">AI + legal-grade billing defense</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-700">
                StatuteBill continuously audits incoming medical bills, flags risk, and
                generates statute-backed appeal language. Instead of paying a one-time large
                commission, you keep a subscription "shield" active for every future bill
                event across your household.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#product"
                  className="inline-flex items-center justify-center rounded-xl bg-brand-950 px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-800"
                >
                  Run the demo
                </a>
                <a
                  href="#pricing"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-brand-950 shadow-sm hover:border-brand-300"
                >
                  View monthly plans
                </a>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-soft">
              <p className="text-sm font-semibold text-brand-950">Your protection dashboard</p>
              <ul className="mt-4 space-y-3 text-sm text-ink-700">
                <li className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />
                  <strong className="font-medium text-brand-950">Always-on bill watch:</strong>{" "}
                  every new bill gets scanned for overcharge patterns and coding anomalies.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />
                  <strong className="font-medium text-brand-950">Legal leverage built-in:</strong>{" "}
                  CPT-level findings tied to federal/statutory references for stronger negotiation.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />
                  <strong className="font-medium text-brand-950">Credit-impact guard:</strong>{" "}
                  track unresolved balances that may affect FICO and trigger appeal reminders.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section id="problem" className="border-y border-slate-200 bg-white py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-display text-2xl font-bold text-brand-950 sm:text-3xl">
              What goes wrong on a typical U.S. bill
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {[
                {
                  title: "A $5,000 surprise statement",
                  body: "You cannot tell which lines exceed usual Medicare or plan-allowed ranges, so you pay what the bill says."
                },
                {
                  title: "Information asymmetry",
                  body: "Payers and hospitals negotiate in the background; consumers lack CMS files, machine-readable price data, and EOB context in one place."
                },
                {
                  title: "You need citations, not vibes",
                  body: "Effective disputes pair line-item pricing with federal transparency rules, NSA/EOB context, and ERISA/PPACA appeals paths—hard to assemble alone."
                }
              ].map((c) => (
                <div
                  key={c.title}
                  className="rounded-2xl border border-slate-100 bg-slate-50/80 p-5"
                >
                  <h3 className="font-semibold text-brand-950">{c.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-700">{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="legal" className="bg-brand-950 py-14 text-slate-100">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Federal levers we help you cite (illustrative)
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
              The next release centers on{" "}
              <strong className="text-white">statute- and rule-based arguments</strong> you can
              direct at billing offices and insurers—not generic discount requests. Applicability
              depends on your state, plan type, and site of service; always confirm with a
              qualified advocate or attorney.
            </p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: "45 CFR Part 180",
                  body: "Hospital price transparency—standard charges and machine-readable files you can compare to your statement."
                },
                {
                  title: "NSA · 42 U.S.C. § 300gg-131 et seq.",
                  body: "No Surprises Act patient protections and balance-billing limits where they apply (e.g., certain OON emergencies)."
                },
                {
                  title: "ERISA · 29 U.S.C. §§ 1132–1133",
                  body: "Employer plan benefits due, claims procedures, and civil enforcement—paired with your SPD and EOB."
                },
                {
                  title: "PPACA appeals · 45 CFR § 147.136",
                  body: "Internal and external review rights for adverse benefit determinations on non-grandfathered plans."
                }
              ].map((c) => (
                <div
                  key={c.title}
                  className="rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur-sm"
                >
                  <h3 className="font-semibold text-white">{c.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="product" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-bold text-brand-950 sm:text-3xl">
              Upload → price check → cite the rules → generate your hospital response
            </h2>
            <p className="mt-3 text-ink-700">
              Each flagged line links to{" "}
              <span className="font-medium text-brand-800">
                illustrative Medicare / CMS benchmarks
              </span>{" "}
              plus{" "}
              <span className="font-medium text-brand-800">
                U.S.C. / CFR references
              </span>{" "}
              for your appeal draft. Production would wire locality-specific CMS files, your EOB,
              and state overlays.
            </p>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-brand-950">Demo scenario</label>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setDemoScenario("high")}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    demoScenario === "high"
                      ? "bg-brand-950 text-white"
                      : "bg-slate-100 text-ink-800"
                  }`}
                >
                  High-dispute hospital bill
                </button>
                <button
                  type="button"
                  onClick={() => setDemoScenario("low")}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    demoScenario === "low"
                      ? "bg-brand-950 text-white"
                      : "bg-slate-100 text-ink-800"
                  }`}
                >
                  Small-balance example
                </button>
              </div>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className="mt-6 flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 text-center transition hover:border-brand-400 hover:bg-brand-50/40"
              >
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  id="bill-upload"
                  onChange={onFileInput}
                />
                <label htmlFor="bill-upload" className="cursor-pointer">
                  <p className="text-sm font-semibold text-brand-950">
                    Drop a photo of your bill here, or click to choose a file
                  </p>
                  <p className="mt-2 text-xs text-ink-500">
                    Demo mode does not run real OCR—any image returns the same simulated parse
                    for the scenario you selected.
                  </p>
                </label>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={runDemo}
                className="mt-4 w-full rounded-xl bg-brand-950 py-3 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60"
              >
                {loading ? "Analyzing…" : "Run demo without uploading"}
              </button>
              {error && (
                <p className="mt-3 text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              {!result && (
                <p className="text-sm text-ink-500">
                  Results include savings estimates, statutory citations (demo), pricing rationale,
                  and a hospital/insurer letter that invokes federal framework language.
                </p>
              )}
              {result && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-brand-950">
                      Audit summary
                    </h3>
                    <p className="mt-1 text-xs text-ink-500">
                      {result.analysis.summary.locality}
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                          Total billed
                        </p>
                        <p className="mt-1 text-2xl font-bold text-brand-950">
                          {fmt(result.analysis.summary.totalBilled)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-brand-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-brand-800">
                          Estimated negotiable gap
                        </p>
                        <p className="mt-1 text-2xl font-bold text-brand-800">
                          {fmt(result.analysis.summary.potentialSavings)}
                        </p>
                        <p className="mt-1 text-xs text-brand-800/80">
                          ~{savingsPct}% of this statement (demo)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-brand-950">Likely overcharges</h4>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[520px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs text-ink-500">
                            <th className="py-2 pr-2">Code</th>
                            <th className="py-2 pr-2">Service</th>
                            <th className="py-2 pr-2">Billed</th>
                            <th className="py-2 pr-2">Reasonable est.</th>
                            <th className="py-2">Risk</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.analysis.flags.map((f) => (
                            <tr key={f.code} className="border-b border-slate-100">
                              <td className="py-2 pr-2 font-mono text-xs">{f.code}</td>
                              <td className="py-2 pr-2 text-ink-800">{f.description}</td>
                              <td className="py-2 pr-2">{fmt(f.billed)}</td>
                              <td className="py-2 pr-2 text-brand-800">
                                {fmt(f.reasonableEstimate)}
                              </td>
                              <td className="py-2">
                                <SeverityPill severity={f.severity} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-brand-950">
                      Statutory &amp; regulatory citations (demo)
                    </h4>
                    {result.analysis.flags.length === 0 ? (
                      <p className="mt-2 text-xs text-ink-600">
                        This demo scenario did not flag large deviations.
                      </p>
                    ) : (
                      <>
                        <ul className="mt-3 space-y-2 rounded-xl border border-brand-100 bg-brand-50/80 p-3 text-xs text-brand-950">
                          {uniqueStatutoryCitations.map((c) => (
                            <li key={c.reference}>
                              <span className="font-medium">{c.topic}</span>
                              <span className="text-ink-600"> — </span>
                              <span className="font-mono text-[11px] text-ink-700">{c.reference}</span>
                            </li>
                          ))}
                        </ul>
                        <h5 className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-500">
                          Pricing &amp; benchmark rationale
                        </h5>
                        <ul className="mt-2 list-disc space-y-2 pl-5 text-xs text-ink-700">
                          {result.analysis.flags[0].legalBasis.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <h4 className="text-sm font-semibold text-brand-950">
                      Appeal letter (federal framework + line items)
                    </h4>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs text-ink-500">Patient name</label>
                        <input
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                          value={patientName}
                          onChange={(e) => setPatientName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-ink-500">Insurer (cc)</label>
                        <input
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                          value={insurerName}
                          onChange={(e) => setInsurerName(e.target.value)}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={letterLoading}
                      onClick={generateLetter}
                      className="mt-3 rounded-lg bg-brand-950 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
                    >
                      {letterLoading ? "Generating…" : "Generate appeal letter draft"}
                    </button>
                    {letter && (
                      <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
                        {letter}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="pricing" className="border-t border-slate-200 bg-brand-950 py-16 text-slate-100">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Subscription plans for continuous protection
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300">
              Ideal for chronic-care families and recurring billing events: keep your legal and
              pricing defense on all month, not just one dispute.
            </p>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {[
                {
                  id: "basic",
                  name: "Basic",
                  price: "$9.9",
                  features: [
                    "Unlimited bill audits",
                    "AI risk flags",
                    "Personal protection dashboard"
                  ],
                  cta: "Start Basic"
                },
                {
                  id: "protector",
                  name: "Protector",
                  price: "$19.9",
                  features: [
                    "Everything in Basic",
                    "AI appeal letter generation",
                    "FICO credit guard monitoring"
                  ],
                  cta: "Start 7-Day Free Trial",
                  featured: true
                },
                {
                  id: "family",
                  name: "Family Shield",
                  price: "$29.9",
                  features: [
                    "All family members covered",
                    "Unlimited shared case history",
                    "24/7 statute guidance support"
                  ],
                  cta: "Protect My Family"
                }
              ].map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-3xl p-6 ${
                    plan.featured
                      ? "border-2 border-blue-300 bg-white text-slate-900 shadow-xl"
                      : "border border-white/10 bg-white/5"
                  }`}
                >
                  <h3 className={`text-xl font-bold ${plan.featured ? "text-slate-900" : "text-white"}`}>
                    {plan.name}
                  </h3>
                  <p
                    className={`mt-3 text-4xl font-black ${plan.featured ? "text-blue-700" : "text-white"}`}
                  >
                    {plan.price}
                    <span className={`text-sm font-normal ${plan.featured ? "text-slate-500" : "text-slate-300"}`}>
                      /mo
                    </span>
                  </p>
                  <ul className={`mt-6 space-y-3 text-sm ${plan.featured ? "text-slate-700" : "text-slate-200"}`}>
                    {plan.features.map((feature) => (
                      <li key={feature}>- {feature}</li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => startSubscription(plan.id)}
                    disabled={billingLoadingPlan !== null}
                    className={`mt-7 w-full rounded-xl py-3 text-sm font-bold ${
                      plan.featured
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-white text-brand-950 hover:bg-slate-100"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {billingLoadingPlan === plan.id
                      ? "Redirecting to checkout..."
                      : plan.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-ink-500">
        <p>
          StatuteBill demo · Not medical or legal advice · Illustrative federal citations only ·
          Sample U.S. data · <span className="text-brand-800">The Settlement Shield</span>
        </p>
      </footer>
    </div>
  );
}
