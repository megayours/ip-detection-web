import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createMonitoringReview,
  listMonitoredDomains,
  listTrademarks,
  type MonitoredDomain,
  type Trademark,
} from "../api";

/**
 * Infringement-monitoring review wizard — picks an indexed IP and a
 * filter scope (territories, platforms, approved licensees), then
 * saves a live filter over the existing reverse-image-search findings.
 *
 * No upload, no worker job — findings come from the scheduler that's
 * already running periodically on every monitored domain.
 */

const TERRITORIES: Array<{ code: string; label: string }> = [
  { code: "EU", label: "European Union" },
  { code: "US", label: "United States" },
  { code: "UK", label: "United Kingdom" },
  { code: "JP", label: "Japan" },
  { code: "CN", label: "China" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
  { code: "BR", label: "Brazil" },
  { code: "IN", label: "India" },
  { code: "KR", label: "South Korea" },
  { code: "MX", label: "Mexico" },
  { code: "GLOBAL", label: "Worldwide" },
];

export default function MonitoringReviewNew() {
  const navigate = useNavigate();
  const [trademarks, setTrademarks] = useState<Trademark[]>([]);
  const [domains, setDomains] = useState<MonitoredDomain[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);

  const [ipId, setIpId] = useState<string>("");
  const [territories, setTerritories] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [licenseesRaw, setLicenseesRaw] = useState("");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([listTrademarks(), listMonitoredDomains()])
      .then(([{ trademarks }, { domains }]) => {
        if (!alive) return;
        setTrademarks(trademarks);
        setDomains(domains);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => alive && setLoadingRefs(false));
    return () => { alive = false; };
  }, []);

  // An IP is eligible to monitor once it has at least one indexed image —
  // the scheduler needs the centroid to compare candidates against.
  const eligibleIps = useMemo(
    () => trademarks.filter((t) => t.indexed_count > 0),
    [trademarks]
  );
  const ipDomains = useMemo(
    () => domains.filter((d) => d.ip_catalog_id === ipId),
    [domains, ipId]
  );
  const licenseesParsed = useMemo(
    () =>
      licenseesRaw
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    [licenseesRaw]
  );

  const step1Done = !!ipId;
  const step2Done = step1Done;
  const step3Done = step2Done;
  const canSubmit = step1Done && !!title.trim() && !submitting;

  function toggle(arr: string[], v: string): string[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const { id } = await createMonitoringReview({
        title: title.trim(),
        monitored_ip_catalog_id: ipId,
        territories: territories.length > 0 ? territories : undefined,
        monitored_platforms: platforms.length > 0 ? platforms : undefined,
        approved_licensees: licenseesParsed.length > 0 ? licenseesParsed : undefined,
      });
      navigate(`/ip-reviews/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">New monitoring review</h1>
        <p className="text-xs text-stone-400 mt-0.5">
          Track unauthorized use of your IP across monitored platforms.
          Findings refresh continuously from the scheduler.
        </p>
      </div>

      {/* --- Step 1 --- */}
      <WizardCard step={1} title="Which IP are you monitoring?" done={step1Done} active={!step1Done}>
        {loadingRefs ? (
          <p className="text-sm text-stone-400">Loading registry…</p>
        ) : eligibleIps.length === 0 ? (
          <p className="text-sm text-stone-500">
            No indexed IPs found. Add and index an IP in{" "}
            <a href="/registry" className="underline">Registry</a> first.
          </p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {eligibleIps.map((tm) => (
              <button
                key={tm.id}
                onClick={() => setIpId(tm.id)}
                className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                  ipId === tm.id
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                }`}
              >
                <div className="text-sm font-semibold">{tm.name}</div>
                {tm.description && (
                  <div className={`text-[11px] mt-0.5 truncate ${ipId === tm.id ? "text-white/70" : "text-stone-500"}`}>
                    {tm.description}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </WizardCard>

      {/* --- Step 2 --- */}
      <WizardCard
        step={2}
        title="Scope (optional)"
        done={step2Done}
        active={step1Done && !step2Done}
        disabled={!step1Done}
      >
        <div className="space-y-3">
          <div>
            <div className="text-xs font-semibold text-stone-700 mb-1.5">Territories</div>
            <div className="flex flex-wrap gap-1.5">
              {TERRITORIES.map((t) => (
                <button
                  key={t.code}
                  onClick={() => setTerritories((arr) => toggle(arr, t.code))}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    territories.includes(t.code)
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                  }`}
                >
                  {t.code}
                </button>
              ))}
            </div>
            <div className="text-[11px] text-stone-400 mt-1.5">
              Display label only for the report — finding filter is by platform / licensee below.
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-stone-700 mb-1.5">
              Platforms to include {ipDomains.length === 0 && "(none monitored yet for this IP)"}
            </div>
            {ipDomains.length === 0 ? (
              <p className="text-[11px] text-stone-400">
                Add domains in <a href="/monitor" className="underline">Monitor</a> to filter here.
                Leaving this empty includes all domains monitored for this IP.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {ipDomains.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setPlatforms((arr) => toggle(arr, d.id))}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      platforms.includes(d.id)
                        ? "border-stone-900 bg-stone-900 text-white"
                        : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                    }`}
                  >
                    {d.domain}
                  </button>
                ))}
              </div>
            )}
            <div className="text-[11px] text-stone-400 mt-1.5">
              Leave empty to include all monitored platforms.
            </div>
          </div>
        </div>
      </WizardCard>

      {/* --- Step 3 --- */}
      <WizardCard
        step={3}
        title="Approved licensees (optional)"
        done={step3Done}
        active={step2Done && !step3Done}
        disabled={!step2Done}
      >
        <div className="space-y-2">
          <p className="text-xs text-stone-500">
            Domains or licensee names you've already authorized — findings on
            these are flagged as approved and excluded from the takedown packet.
          </p>
          <textarea
            value={licenseesRaw}
            onChange={(e) => setLicenseesRaw(e.target.value)}
            rows={3}
            placeholder="One per line or comma-separated&#10;e.g. authorized-distributor.com, official-store.com"
            className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm"
          />
          {licenseesParsed.length > 0 && (
            <div className="text-[11px] text-stone-400">
              {licenseesParsed.length} licensee{licenseesParsed.length === 1 ? "" : "s"} parsed.
            </div>
          )}
        </div>
      </WizardCard>

      {/* --- Step 4 --- */}
      <WizardCard
        step={4}
        title="Name this review"
        done={false}
        active={step3Done}
        disabled={!step3Done}
      >
        <div className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='e.g. "Brand X — global enforcement Q3"'
            className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm"
          />
          {error && <div className="text-xs text-red-600">{error}</div>}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-4 py-2 rounded-lg bg-stone-900 text-white text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save review"}
          </button>
        </div>
      </WizardCard>
    </div>
  );
}

function WizardCard({
  step,
  title,
  done,
  active,
  disabled,
  children,
}: {
  step: number;
  title: string;
  done: boolean;
  active: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border p-5 space-y-3 transition-colors ${
        done
          ? "border-emerald-200 bg-emerald-50/40"
          : active
            ? "border-stone-300 bg-white"
            : "border-stone-200 bg-stone-50/60"
      } ${disabled ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
            done
              ? "bg-emerald-600 text-white"
              : active
                ? "bg-stone-900 text-white"
                : "bg-stone-200 text-stone-500"
          }`}
        >
          {done ? "✓" : step}
        </span>
        <h2 className="text-sm font-bold text-stone-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}
