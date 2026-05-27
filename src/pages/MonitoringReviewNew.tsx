import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createMonitoringReview,
  IpNeedsKeywordsError,
  listMonitoredDomains,
  listTrademarks,
  type MonitoredDomain,
  type Trademark,
} from "../api";

/**
 * Infringement-monitoring review wizard.
 *
 * Picking an IP + listing platforms is the *whole* setup: the API
 * creates monitored_domains for any new URLs, fires monitor_run jobs
 * immediately, and saves the review as a live filter. Findings start
 * appearing on the detail page within ~30-60s.
 */
export default function MonitoringReviewNew() {
  const navigate = useNavigate();
  const [trademarks, setTrademarks] = useState<Trademark[]>([]);
  const [domains, setDomains] = useState<MonitoredDomain[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);

  const [ipId, setIpId] = useState<string>("");
  const [keptPlatforms, setKeptPlatforms] = useState<string[]>([]);
  const [newUrlDraft, setNewUrlDraft] = useState("");
  const [newUrls, setNewUrls] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [keywordRedirect, setKeywordRedirect] = useState<string | null>(null);

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
  // the scheduler needs the centroid + keywords for similarity scoring.
  const eligibleIps = useMemo(
    () => trademarks.filter((t) => t.indexed_count > 0),
    [trademarks]
  );
  const selectedIp = useMemo(
    () => trademarks.find((t) => t.id === ipId),
    [trademarks, ipId]
  );
  const ipDomains = useMemo(
    () => domains.filter((d) => d.ip_catalog_id === ipId),
    [domains, ipId]
  );
  // Default new domains pre-selected; reset on IP change so the platform
  // list always reflects the chosen IP.
  useEffect(() => {
    setKeptPlatforms(ipDomains.map((d) => d.id));
  }, [ipDomains]);

  const hasKeywords = !!(selectedIp?.keywords && selectedIp.keywords.length > 0);
  const step1Done = !!ipId;
  const step2Done = step1Done && (keptPlatforms.length + newUrls.length > 0);
  const canSubmit = step2Done && hasKeywords && !!title.trim() && !submitting;

  function toggle(arr: string[], v: string): string[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  function addUrl() {
    const cleaned = newUrlDraft.trim();
    if (!cleaned) return;
    setNewUrls((prev) => (prev.includes(cleaned) ? prev : [...prev, cleaned]));
    setNewUrlDraft("");
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    setKeywordRedirect(null);
    try {
      const { id } = await createMonitoringReview({
        title: title.trim(),
        monitored_ip_catalog_id: ipId,
        monitored_platforms: keptPlatforms.length > 0 ? keptPlatforms : undefined,
        new_platform_urls: newUrls.length > 0 ? newUrls : undefined,
      });
      navigate(`/ip-reviews/${id}`);
    } catch (e) {
      if (e instanceof IpNeedsKeywordsError) {
        setKeywordRedirect(e.ip_id);
        setError("This IP has no monitoring keywords yet.");
      } else {
        setError(e instanceof Error ? e.message : "Submission failed");
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">New monitoring review</h1>
        <p className="text-xs text-stone-400 mt-0.5">
          Pick an IP and platforms to scan. We'll start scraping
          immediately — findings appear on the next page within a minute.
        </p>
      </div>

      {/* --- Step 1: Pick IP --- */}
      <WizardCard step={1} title="Which IP are you monitoring?" done={step1Done} active={!step1Done}>
        {loadingRefs ? (
          <p className="text-sm text-stone-400">Loading registry…</p>
        ) : eligibleIps.length === 0 ? (
          <p className="text-sm text-stone-500">
            No indexed IPs found. Add and index an IP in{" "}
            <Link to="/registry" className="underline">Registry</Link> first.
          </p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {eligibleIps.map((tm) => {
              const k = tm.keywords?.length ?? 0;
              return (
                <button
                  key={tm.id}
                  onClick={() => setIpId(tm.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                    ipId === tm.id
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold truncate">{tm.name}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        k > 0
                          ? ipId === tm.id
                            ? "bg-white/15 text-white"
                            : "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {k > 0 ? `${k} keyword${k === 1 ? "" : "s"}` : "no keywords"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </WizardCard>

      {/* --- Step 2: Platforms --- */}
      <WizardCard
        step={2}
        title="Platforms to monitor"
        done={step2Done}
        active={step1Done && !step2Done}
        disabled={!step1Done}
      >
        <div className="space-y-3">
          {ipDomains.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-stone-700 mb-1.5">
                Already monitoring for this IP
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ipDomains.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setKeptPlatforms((arr) => toggle(arr, d.id))}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      keptPlatforms.includes(d.id)
                        ? "border-stone-900 bg-stone-900 text-white"
                        : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                    }`}
                  >
                    {d.domain}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs font-semibold text-stone-700 mb-1.5">
              {ipDomains.length > 0 ? "Add more platforms" : "Add platforms"}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newUrlDraft}
                onChange={(e) => setNewUrlDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addUrl();
                  }
                }}
                placeholder="e.g. etsy.com or https://www.aliexpress.com/wholesale"
                className="flex-1 px-3 py-2 rounded-lg border border-stone-200 text-sm"
              />
              <button
                onClick={addUrl}
                disabled={!newUrlDraft.trim()}
                className="px-3 py-2 rounded-lg bg-stone-900 text-white text-xs font-semibold disabled:opacity-50"
              >
                + Add
              </button>
            </div>
            {newUrls.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {newUrls.map((u) => (
                  <span
                    key={u}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"
                  >
                    {u}
                    <button
                      onClick={() =>
                        setNewUrls((prev) => prev.filter((x) => x !== u))
                      }
                      className="text-emerald-700/70 hover:text-emerald-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="text-[11px] text-stone-400 mt-1.5">
              Paste a domain or a URL — we'll extract the hostname and start
              monitoring it for this IP. Duplicates are ignored.
            </div>
          </div>
        </div>
      </WizardCard>

      {/* --- Step 3: Name + submit --- */}
      <WizardCard
        step={3}
        title="Name this review"
        done={false}
        active={step2Done}
        disabled={!step2Done}
      >
        <div className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='e.g. "Brand X — global enforcement Q3"'
            className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm"
          />

          {selectedIp && !hasKeywords && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-2">
              <div className="font-semibold">
                {selectedIp.name} has no monitoring keywords yet.
              </div>
              <p>
                The scheduler needs keywords to know what to scrape. Generate
                them in the Registry detail, then come back here.
              </p>
              <Link
                to={`/registry/${selectedIp.id}`}
                className="inline-block px-3 py-1.5 rounded-lg bg-stone-900 text-white text-[11px] font-semibold"
              >
                Open registry detail →
              </Link>
            </div>
          )}

          {error && (
            <div className="text-xs text-red-600">
              {error}
              {keywordRedirect && (
                <>
                  {" "}
                  <Link to={`/registry/${keywordRedirect}`} className="underline">
                    Open registry detail
                  </Link>
                </>
              )}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-4 py-2 rounded-lg bg-stone-900 text-white text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save & start monitoring"}
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
