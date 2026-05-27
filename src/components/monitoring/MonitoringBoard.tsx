import { useEffect, useMemo, useState } from "react";
import {
  addIpLicense,
  dismissIpFinding,
  openIpFindingTakedownPacket,
  type IpReviewFinding,
} from "../../api";

/**
 * IP-centric monitoring findings board. Lifted verbatim (visually) from the
 * former monitoring branch of IpReviewDetail — the priority banner, the
 * marketplace/domain tabs, the index list, and the center-stage comparison
 * all behave exactly as before. The only re-parameterisation is that
 * takedown + dismiss now hit the IP-scoped API (`ipId`) instead of a review.
 */
export function MonitoringBoard({
  findings,
  ipId,
  runInProgress,
  onRefresh,
  onDismiss,
  showIpColumn,
}: {
  findings: IpReviewFinding[];
  /**
   * Fallback IP for per-finding actions when a finding doesn't carry its own
   * `ip_id` (the single-IP RegistryDetail usage). On the global board each
   * finding ships `ip_id`, so this is optional there.
   */
  ipId?: string;
  /** A monitor run is currently pending/executing — tweaks the empty state. */
  runInProgress: boolean;
  /** Re-fetch findings (e.g. after a dismiss / license backfill). */
  onRefresh: () => void;
  /** Optional post-dismiss notification with the dismissed result_id. */
  onDismiss?: (resultId: string) => void;
  /**
   * Force the per-IP attribution UI (IP-name chips + IP filter). Auto-enabled
   * whenever any finding carries an `ip_id`, so the global hub gets it for
   * free; the single-IP RegistryDetail usage leaves it off and stays clean.
   */
  showIpColumn?: boolean;
}) {
  // Show IP attribution when explicitly asked, or whenever findings carry
  // their own IP (i.e. the tenant-wide board).
  const ipAware = showIpColumn ?? findings.some((f) => !!f.ip_id);
  const [showDismissed, setShowDismissed] = useState(false);
  // Enforcement-priority filter driven by the clickable banner cards.
  // "all" = no filter; clicking a band card toggles its filter on/off.
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  // Marketplace/domain tab filter ("all" = every site).
  const [domainFilter, setDomainFilter] = useState<string>("all");
  // IP filter (global board only): "all" = every monitored IP.
  const [ipFilter, setIpFilter] = useState<string>("all");
  // Optimistically-dismissed result_ids — the server reload eventually
  // replaces this once `dismissed_at` lands in the polled payload.
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());
  // Center-stage comparison: the active finding shown large.
  const [activeId, setActiveId] = useState<string | null>(null);

  const visible = useMemo(() => {
    return findings.filter((f) => {
      const isDismissed = !!f.dismissed_at || dismissing.has(f.result_id);
      if (isDismissed && !showDismissed) return false;
      if (domainFilter !== "all" && f.domain !== domainFilter) return false;
      if (ipFilter !== "all" && (f.ip_name ?? "") !== ipFilter) return false;
      if (priorityFilter !== "all" && priorityBand(f.enforcement_priority) !== priorityFilter) {
        return false;
      }
      return true;
    });
  }, [findings, showDismissed, dismissing, priorityFilter, domainFilter, ipFilter]);

  // Distinct IP names present across live findings — drives the IP filter
  // dropdown, only shown on the multi-IP (global) board.
  const ipOptions = useMemo(() => {
    if (!ipAware) return [];
    const m = new Map<string, number>();
    for (const f of findings) {
      if (f.dismissed_at || dismissing.has(f.result_id)) continue;
      const name = f.ip_name ?? "";
      if (!name) continue;
      m.set(name, (m.get(name) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [findings, dismissing, ipAware]);

  // Marketplace tabs: live (non-dismissed) finding count per domain, busiest first.
  const domainTabs = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of findings) {
      if (f.dismissed_at || dismissing.has(f.result_id)) continue;
      m.set(f.domain, (m.get(f.domain) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [findings, dismissing]);

  // Keep the selected finding valid as filters change; default to the top one.
  useEffect(() => {
    if (visible.length === 0) {
      if (activeId !== null) setActiveId(null);
      return;
    }
    if (!activeId || !visible.some((f) => f.result_id === activeId)) {
      setActiveId(visible[0].result_id);
    }
  }, [visible, activeId]);

  const active = visible.find((f) => f.result_id === activeId) ?? null;

  // Counts ignore dismissed findings — the priority banner reflects the
  // outstanding workload, not the historical total.
  const counts = useMemo(() => {
    const live = findings.filter(
      (f) => !f.dismissed_at && !dismissing.has(f.result_id),
    );
    const high = live.filter((f) => f.enforcement_priority >= 0.75).length;
    const med = live.filter(
      (f) => f.enforcement_priority >= 0.5 && f.enforcement_priority < 0.75
    ).length;
    const low = live.filter((f) => f.enforcement_priority < 0.5).length;
    return { high, med, low, total: live.length };
  }, [findings, dismissing]);

  const dismissedCount = findings.filter(
    (f) => !!f.dismissed_at || dismissing.has(f.result_id),
  ).length;

  async function handleDismiss(f: IpReviewFinding) {
    if (dismissing.has(f.result_id)) return;
    const fipId = f.ip_id ?? ipId;
    if (!fipId) {
      alert("Cannot dismiss: finding has no associated IP.");
      return;
    }
    setDismissing((prev) => new Set(prev).add(f.result_id));
    try {
      await dismissIpFinding(fipId, f.result_id);
      onDismiss?.(f.result_id);
      onRefresh();
    } catch (e) {
      setDismissing((prev) => {
        const next = new Set(prev);
        next.delete(f.result_id);
        return next;
      });
      alert(e instanceof Error ? e.message : "Failed to dismiss finding");
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <PriorityBanner
          counts={counts}
          active={priorityFilter}
          onSelect={setPriorityFilter}
        />
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white">
        <div className="px-5 py-3 border-b border-stone-200 flex items-center justify-between flex-wrap gap-y-2">
          <h2 className="text-sm font-bold text-stone-900">
            Findings ({visible.length})
          </h2>
          <div className="flex items-center gap-4">
            {ipOptions.length > 1 && (
              <label className="flex items-center gap-1.5 text-[11px] text-stone-500">
                IP
                <select
                  value={ipFilter}
                  onChange={(e) => setIpFilter(e.target.value)}
                  className="px-2 py-1 rounded-md border border-stone-200 text-[11px] bg-white text-stone-700 max-w-[12rem]"
                >
                  <option value="all">All IPs ({ipOptions.reduce((s, [, n]) => s + n, 0)})</option>
                  {ipOptions.map(([name, n]) => (
                    <option key={name} value={name}>
                      {name} ({n})
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label
              className={`flex items-center gap-2 text-[11px] ${
                dismissedCount === 0 ? "text-stone-300" : "text-stone-500"
              }`}
            >
              <input
                type="checkbox"
                checked={showDismissed}
                onChange={(e) => setShowDismissed(e.target.checked)}
                disabled={dismissedCount === 0}
              />
              Show dismissed ({dismissedCount})
            </label>
          </div>
        </div>
        {domainTabs.length > 1 && (
          <div className="px-5 py-2 border-b border-stone-100 flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setDomainFilter("all")}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                domainFilter === "all" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              All
            </button>
            {domainTabs.map(([domain, n]) => (
              <button
                key={domain}
                type="button"
                onClick={() => setDomainFilter(domain)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                  domainFilter === domain ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {domain} <span className="opacity-60">{n}</span>
              </button>
            ))}
          </div>
        )}
        {visible.length === 0 ? (
          <div className="px-5 py-8 text-sm text-stone-400 text-center">
            {runInProgress
              ? "Waiting for the first findings to arrive…"
              : (
                <>
                  No findings yet. Click <span className="font-semibold">Refresh now</span>
                  {" "}above, or wait for the next scheduled run.
                </>
              )}
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row">
            {/* Index: pick a finding to compare */}
            <div className="lg:w-72 shrink-0 lg:border-r border-stone-100 divide-y divide-stone-100 lg:max-h-[80vh] lg:overflow-y-auto">
              {visible.map((f) => (
                <FindingListItem
                  key={f.result_id}
                  f={f}
                  selected={f.result_id === activeId}
                  isDismissed={!!f.dismissed_at || dismissing.has(f.result_id)}
                  showIp={ipAware}
                  onSelect={() => setActiveId(f.result_id)}
                />
              ))}
            </div>
            {/* Center stage: side-by-side comparison of the active finding */}
            <div className="flex-1 min-w-0 p-5">
              {active ? (
                <FindingComparison
                  key={active.result_id}
                  f={active}
                  ipId={active.ip_id ?? ipId}
                  showIp={ipAware}
                  isDismissed={!!active.dismissed_at || dismissing.has(active.result_id)}
                  isDismissing={dismissing.has(active.result_id) && !active.dismissed_at}
                  onDismiss={() => handleDismiss(active)}
                  onUpdated={onRefresh}
                />
              ) : (
                <div className="text-sm text-stone-400">Select a finding to compare.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

type PriorityFilter = "all" | "high" | "med" | "low";

function priorityBand(p: number): "high" | "med" | "low" {
  if (p >= 0.75) return "high";
  if (p >= 0.5) return "med";
  return "low";
}

// Short, highlighted label for the scrape method that surfaced a finding.
function methodChip(method: string): { label: string; cls: string } {
  switch (method) {
    case "nodriver_direct":
      return { label: "direct", cls: "bg-violet-100 text-violet-700" };
    case "serper_google":
      return { label: "google", cls: "bg-blue-100 text-blue-700" };
    case "brave_sidestep":
      return { label: "brave", cls: "bg-teal-100 text-teal-700" };
    case "scrapfly_direct":
      return { label: "scrapfly", cls: "bg-orange-100 text-orange-700" };
    default:
      return { label: method, cls: "bg-stone-100 text-stone-600" };
  }
}

function ImageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-[70vh] mx-auto aspect-square bg-stone-50 border border-stone-200 rounded-lg overflow-hidden">
      {children}
    </div>
  );
}

function PriorityBanner({
  counts,
  active,
  onSelect,
}: {
  counts: { high: number; med: number; low: number; total: number };
  active: PriorityFilter;
  onSelect: (f: PriorityFilter) => void;
}) {
  // Compact toggle pills: clicking the active band clears back to "all".
  const pill = (
    band: PriorityFilter,
    label: string,
    value: number,
    tones: { base: string; on: string },
    title: string,
  ) => {
    const isActive = active === band;
    return (
      <button
        type="button"
        onClick={() => onSelect(isActive && band !== "all" ? "all" : band)}
        aria-pressed={isActive}
        title={title}
        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
          isActive ? tones.on : tones.base
        }`}
      >
        {label} <span className="font-bold tabular-nums">{value}</span>
      </button>
    );
  };
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {pill("high", "High", counts.high,
        { base: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100", on: "border-red-600 bg-red-600 text-white" },
        "Enforcement priority ≥ 0.75")}
      {pill("med", "Medium", counts.med,
        { base: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100", on: "border-amber-500 bg-amber-500 text-white" },
        "0.50–0.74")}
      {pill("low", "Low", counts.low,
        { base: "border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100", on: "border-yellow-500 bg-yellow-500 text-white" },
        "< 0.50")}
      {pill("all", "All", counts.total,
        { base: "border-stone-200 bg-stone-100 text-stone-700 hover:bg-stone-200", on: "border-stone-900 bg-stone-900 text-white" },
        "All findings, across platforms")}
    </div>
  );
}

function TakedownPacketButton({ ipId, resultId }: { ipId?: string; resultId: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      disabled={loading || !ipId}
      onClick={async () => {
        if (!ipId) return;
        setLoading(true);
        try {
          await openIpFindingTakedownPacket(ipId, resultId);
        } catch (e) {
          alert(e instanceof Error ? e.message : "Failed to open takedown packet");
        } finally {
          setLoading(false);
        }
      }}
      className="px-2.5 py-1 rounded-md bg-stone-900 text-white text-[11px] font-semibold hover:bg-stone-800 disabled:opacity-50"
    >
      {loading ? "Preparing…" : "Takedown packet"}
    </button>
  );
}

// Compact, selectable index row. Clicking loads it into the comparison panel.
function FindingListItem({
  f,
  selected,
  isDismissed,
  showIp,
  onSelect,
}: {
  f: IpReviewFinding;
  selected: boolean;
  isDismissed: boolean;
  /** Render the IP-name chip (multi-IP / global board). */
  showIp?: boolean;
  onSelect: () => void;
}) {
  const priorityCls =
    f.enforcement_priority >= 0.75
      ? "text-red-700"
      : f.enforcement_priority >= 0.5
        ? "text-amber-700"
        : "text-stone-500";
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition-colors ${
        selected ? "bg-stone-100" : "hover:bg-stone-50"
      } ${isDismissed ? "opacity-50" : ""}`}
    >
      {f.image_url ? (
        <img src={f.image_url} alt="" className="w-12 h-12 rounded object-cover border border-stone-200 shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded bg-stone-100 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        {showIp && f.ip_name && (
          <span className="inline-block max-w-full truncate px-1.5 py-0.5 mb-0.5 rounded bg-indigo-100 text-indigo-700 text-[9px] font-bold uppercase tracking-wide">
            {f.ip_name}
          </span>
        )}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-stone-900 truncate">{f.domain}</span>
          {f.source_method && (
            <span className={`px-1 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${methodChip(f.source_method).cls}`}>
              {methodChip(f.source_method).label}
            </span>
          )}
        </div>
        <div className="text-[11px] text-stone-500 truncate">
          sim {Math.round((f.similarity_score ?? 0) * 100)}%
          {f.vlm_verdict ? ` · vlm ${f.vlm_verdict}` : ""}
        </div>
      </div>
      <div className={`text-sm font-bold shrink-0 ${priorityCls}`}>
        {f.enforcement_priority.toFixed(2)}
      </div>
    </button>
  );
}

// Center-stage comparison: the protected IP reference next to the marketplace
// listing image, large and object-contained so a reviewer can adjudicate
// infringement at a glance — mirroring the clearance comparison UX.
function FindingComparison({
  f,
  ipId,
  showIp,
  isDismissed,
  isDismissing,
  onDismiss,
  onUpdated,
}: {
  f: IpReviewFinding;
  /** Resolved IP id for this finding (`f.ip_id ?? boardIpId`). */
  ipId?: string;
  /** Render the IP-name chip on the comparison header. */
  showIp?: boolean;
  isDismissed: boolean;
  isDismissing: boolean;
  onDismiss: () => void;
  onUpdated: () => void;
}) {
  const priorityCls =
    f.enforcement_priority >= 0.75
      ? "text-red-700"
      : f.enforcement_priority >= 0.5
        ? "text-amber-700"
        : "text-stone-700";
  const [licensing, setLicensing] = useState(false);
  const canLicense = !!ipId && (!!f.seller_name || !!f.seller_url);
  // Enrichment hit a reCAPTCHA / bot-wall — the screenshot is the challenge
  // page, not the listing.
  const isChallenge = /recaptcha|bot-wall/i.test(f.enrichment_error || "");

  async function handleLicense() {
    if (licensing || !ipId) return;
    setLicensing(true);
    try {
      await addIpLicense(ipId, {
        domain: f.domain,
        seller_name: f.seller_name,
        seller_url: f.seller_url,
      });
      onUpdated(); // backfill dismisses this + any sibling finding from the seller
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to add license");
    } finally {
      setLicensing(false);
    }
  }

  return (
    <div className="space-y-4">
      {showIp && f.ip_name && (
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold">
            {f.ip_name}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-stone-400">monitored IP</span>
        </div>
      )}
      <figure className="m-0">
        <figcaption className="text-[10px] font-semibold uppercase tracking-wide text-stone-400 mb-1 text-center truncate">
          Found on {f.domain}
          {isChallenge && (
            <span className="ml-1.5 text-red-600 normal-case">⚠ bot-wall page (not the listing)</span>
          )}
        </figcaption>
        {f.screenshot_url ? (
          // Real listing-page screenshot — the most useful view of the finding.
          <>
            <a
              href={f.page_url}
              target="_blank"
              rel="noreferrer"
              title="Open listing"
              className="flex justify-center bg-stone-50 border border-stone-200 rounded-lg overflow-hidden"
            >
              <img src={f.screenshot_url} alt="listing page" className="max-h-[72vh] w-auto object-contain" />
            </a>
            {f.image_url && (
              <div className="flex items-center gap-2 justify-center mt-2 text-[10px] uppercase tracking-wide text-stone-400">
                matched image
                <img src={f.image_url} alt="matched" className="w-12 h-12 rounded object-cover border border-stone-200" />
              </div>
            )}
          </>
        ) : (
          // No screenshot yet (enrichment pending / failed) — show the match image.
          <ImageFrame>
            {f.image_url ? (
              <a href={f.page_url} target="_blank" rel="noreferrer" className="block w-full h-full" title="Open listing">
                <img src={f.image_url} alt="finding" className="w-full h-full object-contain" />
              </a>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-stone-400">No image</div>
            )}
          </ImageFrame>
        )}
      </figure>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-lg font-bold ${priorityCls}`}>{f.enforcement_priority.toFixed(2)}</span>
        <span className="text-[10px] uppercase tracking-wider text-stone-400">priority</span>
        {f.source_method && (
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${methodChip(f.source_method).cls}`} title={`Found via ${f.source_method}`}>
            {methodChip(f.source_method).label}
          </span>
        )}
        {f.vlm_verdict && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-600">
            vlm: {f.vlm_verdict}
            {f.vlm_confidence != null && `@${Math.round(f.vlm_confidence * 100)}%`}
          </span>
        )}
        {isChallenge && (
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-red-100 text-red-700"
            title="Listing-page enrichment was blocked by a bot-wall / reCAPTCHA — details deferred to a later run"
          >
            challenge
          </span>
        )}
        {isDismissed && (
          f.dismissal_reason === "licensed" ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-100 text-emerald-700">licensed</span>
          ) : f.dismissal_reason?.startsWith("dead_link") ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-orange-100 text-orange-700">dead link</span>
          ) : (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-stone-200 text-stone-600">dismissed</span>
          )
        )}
      </div>

      {/* Listing context (from VLM enrichment) — what's on sale, type, where */}
      {f.listing_title && (
        <h3 className="text-sm font-bold text-stone-900 leading-snug">{f.listing_title}</h3>
      )}

      <div className="flex items-center gap-2 flex-wrap text-[11px]">
        {f.price && (
          <span className="px-1.5 py-0.5 rounded bg-stone-900 text-white font-semibold">{f.price}</span>
        )}
        {f.infringement_type && (
          <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 uppercase tracking-wide font-semibold">
            {f.infringement_type.replace(/_/g, " ")}
          </span>
        )}
        {f.location && <span className="text-stone-500">📍 {f.location}</span>}
        {f.license_status && (
          <span
            className={`px-1.5 py-0.5 rounded font-semibold ${
              f.license_status === "likely_licensed"
                ? "bg-emerald-100 text-emerald-700"
                : f.license_status === "likely_unlicensed"
                  ? "bg-red-100 text-red-700"
                  : "bg-stone-100 text-stone-600"
            }`}
          >
            {f.license_status.replace(/_/g, " ")}
          </span>
        )}
      </div>

      {(f.seller_name || f.seller_url) && (
        <div className="text-[11px] text-stone-600">
          <span className="text-stone-400">Seller: </span>
          {f.seller_url ? (
            <a href={f.seller_url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
              {f.seller_name || f.seller_url}
            </a>
          ) : (
            <span className="font-medium">{f.seller_name}</span>
          )}
        </div>
      )}

      {(f.match_explanation || f.infringement_reasoning || f.vlm_reasoning) && (
        <div className="text-xs text-stone-600 leading-relaxed border-l-2 border-amber-300 pl-2">
          <span className="font-semibold text-stone-500">Why flagged: </span>
          {f.match_explanation || f.infringement_reasoning || f.vlm_reasoning}
        </div>
      )}

      {f.description_summary && (
        <p className="text-[11px] text-stone-500 leading-relaxed">{f.description_summary}</p>
      )}

      {!f.listing_title && !f.seller_name && !f.match_explanation && !f.description_summary && (
        <p className="text-[11px] text-stone-400 italic">Listing details still being analysed…</p>
      )}

      <div className="flex items-center gap-2 flex-wrap text-[11px] text-stone-400">
        <span>sim {Math.round((f.similarity_score ?? 0) * 100)}%</span>
        {f.inliers != null && <span>· inliers {f.inliers}</span>}
        <span>· found {new Date(f.found_at).toLocaleDateString()}</span>
        <a href={f.page_url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline break-all">
          · open listing ↗
        </a>
      </div>

      <div className="flex items-center gap-2 pt-1 flex-wrap">
        <TakedownPacketButton ipId={ipId} resultId={f.result_id} />
        {canLicense && !isDismissed && (
          <button
            type="button"
            onClick={handleLicense}
            disabled={licensing}
            title="Mark this seller as licensed on this domain — dismisses this and future findings from them"
            className="px-2.5 py-1 rounded-md border border-emerald-300 text-emerald-700 text-[11px] font-semibold hover:bg-emerald-50 disabled:opacity-50"
          >
            {licensing ? "Licensing…" : "License this seller"}
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          disabled={isDismissed || isDismissing}
          className="px-2.5 py-1 rounded-md border border-stone-300 text-stone-700 text-[11px] font-semibold hover:bg-stone-50 disabled:opacity-50 disabled:cursor-default"
        >
          {isDismissing ? "Dismissing…" : isDismissed ? "Dismissed" : "Dismiss"}
        </button>
      </div>
    </div>
  );
}
