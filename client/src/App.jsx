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

function BrandLogo({ className = "" }) {
  return (
    <div className={`flex flex-col items-start ${className}`}>
      <img
        src="/medisaver-logo.png"
        alt="StatuteBill"
        className="h-10 w-auto sm:h-11"
        width={180}
        height={50}
      />
    </div>
  );
}

const PLANS = [
  {
    id: "basic",
    name: "Basic",
    price: "$9.9",
    blurb: "Unlimited audits · AI risk flags",
    cta: "Subscribe"
  },
  {
    id: "protector",
    name: "Protector",
    price: "$19.9",
    blurb: "Appeal letters · Credit guard",
    cta: "Start trial",
    featured: true
  },
  {
    id: "family",
    name: "Family",
    price: "$29.9",
    blurb: "Household · 24/7 guidance",
    cta: "Subscribe"
  }
];

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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <a href="/" className="flex items-center gap-2">
            <BrandLogo />
          </a>
          <a
            href="#pricing"
            className="text-sm font-medium text-brand-950 hover:text-brand-600"
          >
            Plans
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:pt-14">
        <section className="text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight text-brand-950 sm:text-4xl">
            StatuteBill
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base text-ink-700">
            Medical bill audits and appeal drafts—subscription pricing, not a one-off cut.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href="#demo"
              className="rounded-xl bg-brand-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
            >
              Try demo
            </a>
            <a
              href="#pricing"
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-brand-950 hover:border-brand-300"
            >
              View plans
            </a>
          </div>
        </section>

        <section id="demo" className="mt-14">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
            Demo
          </h2>
          <p className="mt-1 text-sm text-ink-600">
            Simulated parse—upload optional. Pick a sample, then run or drop a file.
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
            className="mt-4 flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-5 text-center"
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
            className="mt-3 w-full rounded-xl bg-brand-950 py-3 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {loading ? "Running…" : "Run demo (no file)"}
          </button>

          {error && (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          {result && (
            <div className="mt-8 space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-ink-500">Billed</p>
                  <p className="text-xl font-bold text-brand-950">
                    {fmt(result.analysis.summary.totalBilled)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ink-500">Est. gap (demo)</p>
                  <p className="text-xl font-bold text-brand-700">
                    {fmt(result.analysis.summary.potentialSavings)}
                  </p>
                  <p className="text-xs text-ink-500">~{savingsPct}%</p>
                </div>
              </div>

              {result.analysis.flags.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-ink-500">Flagged lines</p>
                  <ul className="mt-2 divide-y divide-slate-100">
                    {result.analysis.flags.slice(0, 6).map((f) => (
                      <li key={f.code} className="flex items-start justify-between gap-3 py-2 text-sm">
                        <div className="min-w-0">
                          <span className="font-mono text-xs text-ink-600">{f.code}</span>
                          <p className="truncate text-ink-800">{f.description}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-medium">{fmt(f.billed)}</p>
                          <SeverityPill severity={f.severity} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {topCitations.length > 0 && (
                <div className="rounded-xl bg-slate-50 p-3 text-xs text-ink-700">
                  <span className="font-medium text-brand-950">Citations (demo): </span>
                  {topCitations.map((c) => c.reference).join(" · ")}
                </div>
              )}

              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-medium text-ink-500">Appeal draft</p>
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
                  className="mt-2 rounded-lg bg-brand-950 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
                >
                  {letterLoading ? "Generating…" : "Generate letter"}
                </button>
                {letter && (
                  <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
                    {letter}
                  </pre>
                )}
              </div>
            </div>
          )}
        </section>

        <section id="pricing" className="mt-16 border-t border-slate-200 pt-14">
          <h2 className="text-center font-display text-2xl font-bold text-brand-950">
            Plans
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-center text-sm text-ink-600">
            Monthly subscription. Cancel anytime in the Stripe portal.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`flex flex-col rounded-2xl border p-5 ${
                  plan.featured
                    ? "border-blue-400 bg-white shadow-md ring-2 ring-blue-100"
                    : "border-slate-200 bg-white"
                }`}
              >
                <h3 className="font-semibold text-brand-950">{plan.name}</h3>
                <p className="mt-2 text-3xl font-black text-brand-950">
                  {plan.price}
                  <span className="text-sm font-normal text-ink-500">/mo</span>
                </p>
                <p className="mt-2 flex-1 text-sm text-ink-600">{plan.blurb}</p>
                <button
                  type="button"
                  onClick={() => startSubscription(plan.id)}
                  disabled={billingLoadingPlan !== null}
                  className={`mt-4 w-full rounded-xl py-2.5 text-sm font-bold ${
                    plan.featured
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-brand-950 text-white hover:bg-brand-800"
                  } disabled:opacity-60`}
                >
                  {billingLoadingPlan === plan.id ? "Opening…" : plan.cta}
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-ink-500">
        StatuteBill · Demo only, not legal advice
      </footer>
    </div>
  );
}
