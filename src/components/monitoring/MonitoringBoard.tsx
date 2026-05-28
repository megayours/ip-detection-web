import { useEffect, useMemo, useState } from "react";
import {
  addIpLicense,
  confirmIpFinding,
  dismissIpFinding,
  markIpFindingEnforced,
  markIpFindingTakedownSent,
  openIpFindingTakedownPacket,
  reopenIpFinding,
  type CaseReviewStatus,
  type IpReviewFinding,
} from "../../api";

// Shared clean style for the filter-bar dropdowns (IP / platform).
const FILTER_SELECT =
  "px-2.5 py-1.5 rounded-lg border border-stone-200 text-[11px] bg-white text-stone-700 " +
  "max-w-[14rem] focus:outline-none focus:ring-1 focus:ring-stone-300";

/** Compact relative-time formatter for "last checked"/"found" meta lines.
 *  Falls back to null when the input is missing/invalid. */
function formatAgo(iso: string | null): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const secs = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  return months < 12 ? `${months}mo ago` : `${Math.round(months / 12)}y ago`;
}

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
  initialStatus,
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
  /**
   * Initial enforcement-status filter — Findings.tsx forwards the `?status=`
   * URL param so a dashboard KPI deep-link lands pre-filtered.
   */
  initialStatus?: string | null;
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
  // Enforcement-status filter — null means "no filter" (all statuses).
  // Pre-seeded from `initialStatus` for dashboard KPI deep links.
  const [statusFilter, setStatusFilter] = useState<string | null>(() => {
    const v = (initialStatus ?? "").trim();
    return v && STATUS_FILTERS.some((s) => s.key === v) ? v : null;
  });
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
      if (statusFilter && !statusMatches(f, statusFilter)) return false;
      return true;
    });
  }, [findings, showDismissed, dismissing, priorityFilter, domainFilter, ipFilter, statusFilter]);

  // Per-status counts ignore dismissed (the "dismissed" bucket is its own).
  const statusCounts = useMemo(() => {
    const m: Record<string, number> = { pending: 0, confirmed: 0, takedown_sent: 0, enforced: 0, dismissed: 0 };
    for (const f of findings) {
      if (f.dismissed_at || dismissing.has(f.result_id)) {
        m.dismissed += 1;
        continue;
      }
      const s = (f.review_status ?? "pending") as string;
      if (s in m) m[s] += 1;
    }
    return m;
  }, [findings, dismissing]);

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
      <StatusFilterBar
        counts={statusCounts}
        active={statusFilter}
        onSelect={setStatusFilter}
      />

      {/* One clean filter bar: severity pills + IP + platform + dismissed. */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3 mt-3">
        <PriorityBanner
          counts={counts}
          active={priorityFilter}
          onSelect={setPriorityFilter}
        />
        <div className="flex items-center gap-2 flex-wrap">
          {ipOptions.length > 1 && (
            <select
              value={ipFilter}
              onChange={(e) => setIpFilter(e.target.value)}
              title="Filter by IP"
              className={FILTER_SELECT}
            >
              <option value="all">All IPs ({ipOptions.reduce((s, [, n]) => s + n, 0)})</option>
              {ipOptions.map(([name, n]) => (
                <option key={name} value={name}>
                  {name} ({n})
                </option>
              ))}
            </select>
          )}
          {domainTabs.length > 1 && (
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              title="Filter by platform"
              className={FILTER_SELECT}
            >
              <option value="all">All platforms ({domainTabs.reduce((s, [, n]) => s + n, 0)})</option>
              {domainTabs.map(([domain, n]) => (
                <option key={domain} value={domain}>
                  {domain} ({n})
                </option>
              ))}
            </select>
          )}
          <label
            className={`flex items-center gap-1.5 text-[11px] ${
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

      <div className="rounded-2xl border border-stone-200 bg-white">
        <div className="px-5 py-3 border-b border-stone-200">
          <h2 className="text-sm font-bold text-stone-900">
            Findings ({visible.length})
          </h2>
        </div>
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

// Slim status pipeline pills. `null` is rendered as "pending".
const STATUS_FILTERS: Array<{ key: string; label: string }> = [
  { key: "pending", label: "To triage" },
  { key: "confirmed", label: "Confirmed" },
  { key: "takedown_sent", label: "Sent" },
  { key: "enforced", label: "Enforced" },
  { key: "dismissed", label: "Dismissed" },
];

function statusKey(f: IpReviewFinding): string {
  if (f.dismissed_at) return "dismissed";
  return (f.review_status ?? "pending") as string;
}

function statusMatches(f: IpReviewFinding, key: string): boolean {
  return statusKey(f) === key;
}

function statusBadge(s: CaseReviewStatus | null | undefined) {
  const status = (s ?? "pending") as CaseReviewStatus | "pending";
  switch (status) {
    case "confirmed":
      return { label: "Confirmed", cls: "bg-blue-100 text-blue-700" };
    case "takedown_sent":
      return { label: "Takedown sent", cls: "bg-amber-100 text-amber-700" };
    case "enforced":
      return { label: "Enforced", cls: "bg-emerald-100 text-emerald-700" };
    case "dismissed":
      return { label: "Dismissed", cls: "bg-stone-200 text-stone-600" };
    case "pending":
    default:
      return { label: "Pending", cls: "bg-stone-100 text-stone-700" };
  }
}

function StatusFilterBar({
  counts,
  active,
  onSelect,
}: {
  counts: Record<string, number>;
  active: string | null;
  onSelect: (s: string | null) => void;
}) {
  const total =
    counts.pending + counts.confirmed + counts.takedown_sent + counts.enforced;
  const pill = (key: string | null, label: string, n: number) => {
    const isActive = active === key;
    return (
      <button
        key={key ?? "all"}
        type="button"
        onClick={() => onSelect(isActive ? null : key)}
        aria-pressed={isActive}
        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
          isActive
            ? "border-stone-900 bg-stone-900 text-white"
            : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
        }`}
      >
        {label} <span className="font-bold tabular-nums">{n}</span>
      </button>
    );
  };
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {pill(null, "All", total)}
      {STATUS_FILTERS.map((s) => pill(s.key, s.label, counts[s.key] ?? 0))}
    </div>
  );
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

// Why this finding fired: visual similarity, IP-name mention in the
// listing title, or both. Different dimension from `methodChip` (which
// scrape strategy surfaced the page).
function matchMethodChip(
  method: string,
): { label: string; cls: string; title: string } {
  switch (method) {
    case "visual":
      return {
        label: "visual",
        cls: "bg-sky-100 text-sky-700",
        title: "Image embedding matched a protected IP",
      };
    case "name":
      return {
        label: "name",
        cls: "bg-amber-100 text-amber-800",
        title: "IP name found in the listing title",
      };
    case "both":
      return {
        label: "name + visual",
        cls: "bg-emerald-100 text-emerald-700",
        title: "IP name in the title AND image visually similar",
      };
    default:
      return {
        label: method,
        cls: "bg-stone-100 text-stone-600",
        title: method,
      };
  }
}

/** Hero-with-thumbstrip carousel for the listing's product photos. When
 *  `gallery_scores` is present (worker scored each photo against the IP), the
 *  best-matched image is the default hero, marked MATCHED, and each thumb
 *  shows its similarity %. Falls back to discovery `image_url` only when the
 *  gallery is empty. The page screenshot is rendered separately below. */
function ListingCarousel({ f }: { f: IpReviewFinding }) {
  const scored = f.gallery_scores ?? [];
  const scoredByUrl = new Map(scored.map((s) => [s.url, s.similarity]));
  // Order: page screenshot first (when captured — wide page context the lawyer
  // anchors on), then scored gallery (best-matched first), then any unscored
  // gallery URL, then the discovery thumbnail. Dedupe by URL.
  const urls = useMemo(() => {
    const out: string[] = [];
    const seen = new Set<string>();
    const add = (u: string | null | undefined) => {
      if (u && !seen.has(u)) {
        out.push(u);
        seen.add(u);
      }
    };
    add(f.screenshot_url);
    for (const s of scored) add(s.url);
    for (const u of f.image_urls ?? []) add(u);
    add(f.image_url);
    return out;
  }, [f.screenshot_url, scored, f.image_urls, f.image_url]);

  const [idx, setIdx] = useState(0);
  // Reset selection when the underlying finding changes.
  useEffect(() => {
    setIdx(0);
  }, [f.result_id]);

  if (urls.length === 0) {
    return (
      <div className="w-full max-w-[60vh] mx-auto aspect-square bg-stone-50 border border-stone-200 rounded-lg flex items-center justify-center text-xs text-stone-400">
        No image
      </div>
    );
  }

  const active = urls[Math.min(idx, urls.length - 1)];
  const activeSim = scoredByUrl.get(active);
  const bestUrl = scored[0]?.url;

  return (
    <div className="space-y-2">
      {/* Hero */}
      <a
        href={active}
        target="_blank"
        rel="noreferrer"
        title="Open full size"
        className="block w-full max-w-[60vh] mx-auto aspect-square bg-stone-50 border border-stone-200 rounded-lg overflow-hidden relative"
      >
        <img src={active} alt="" className="w-full h-full object-contain" />
        {activeSim != null && (
          <span
            className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[11px] font-bold ${
              active === bestUrl
                ? "bg-emerald-600 text-white"
                : "bg-stone-900/80 text-white"
            }`}
            title={`Similarity to the protected IP: ${Math.round(activeSim * 100)}%`}
          >
            {active === bestUrl ? "MATCHED · " : ""}
            {Math.round(activeSim * 100)}%
          </span>
        )}
        {urls.length > 1 && (
          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-900/70 text-white">
            {idx + 1} / {urls.length}
          </span>
        )}
      </a>

      {/* Thumb strip — horizontal scroll on overflow, matched thumb framed emerald. */}
      {urls.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {urls.map((u, i) => {
            const sim = scoredByUrl.get(u);
            const isActive = i === idx;
            const isBest = u === bestUrl;
            return (
              <button
                key={`${u}-${i}`}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setIdx(i);
                }}
                className={`relative shrink-0 w-14 h-14 rounded overflow-hidden border-2 transition-colors ${
                  isActive
                    ? "border-stone-900"
                    : isBest
                      ? "border-emerald-500"
                      : "border-stone-200 hover:border-stone-400"
                }`}
                title={sim != null ? `${Math.round(sim * 100)}% match` : undefined}
              >
                <img src={u} alt="" className="w-full h-full object-cover" loading="lazy" />
                {sim != null && (
                  <span className="absolute bottom-0 right-0 px-1 py-px bg-stone-900/80 text-white text-[9px] font-bold leading-tight">
                    {Math.round(sim * 100)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
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
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-stone-900 truncate">{f.domain}</span>
          {f.source_method && (
            <span className={`px-1 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${methodChip(f.source_method).cls}`}>
              {methodChip(f.source_method).label}
            </span>
          )}
          {f.match_method && (
            <span
              className={`px-1 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${matchMethodChip(f.match_method).cls}`}
              title={matchMethodChip(f.match_method).title}
            >
              {matchMethodChip(f.match_method).label}
            </span>
          )}
          {(() => {
            const sb = statusBadge(f.dismissed_at ? "dismissed" : f.review_status);
            return (
              <span className={`px-1 py-0.5 rounded text-[9px] font-semibold uppercase shrink-0 ${sb.cls}`}>
                {sb.label}
              </span>
            );
          })()}
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
  const canLicense = !!ipId && (!!f.seller_name || !!f.seller_url);
  // Enrichment hit a reCAPTCHA / bot-wall — the screenshot is the challenge
  // page, not the listing.
  const isChallenge = /recaptcha|bot-wall/i.test(f.enrichment_error || "");

  const sb = statusBadge(f.dismissed_at ? "dismissed" : f.review_status);

  return (
    <div className="space-y-4">
      {/* Header: IP + status + listing source on the left, the state-driven
          action group pinned top-right. Context follows below the image. */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {showIp && f.ip_name && (
              <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold">
                {f.ip_name}
              </span>
            )}
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${sb.cls}`}>
              {sb.label}
            </span>
          </div>
          <div className="text-[11px] text-stone-500 mt-1 truncate">
            <span className="uppercase tracking-wide text-stone-400">Found on </span>
            <span className="font-semibold text-stone-700">{f.domain}</span>
            {isChallenge && (
              <span className="ml-1.5 text-red-600">⚠ bot-wall page (not the listing)</span>
            )}
          </div>
        </div>
        <FindingActions
          f={f}
          ipId={ipId}
          canLicense={canLicense}
          isDismissed={isDismissed}
          isDismissing={isDismissing}
          onDismiss={onDismiss}
          onUpdated={onUpdated}
        />
      </div>
      {/* Single image carousel. Page screenshot is included as the first slide
          when available; product photos follow (best-matched marked). */}
      <ListingCarousel f={f} />

      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-lg font-bold ${priorityCls}`}>{f.enforcement_priority.toFixed(2)}</span>
        <span className="text-[10px] uppercase tracking-wider text-stone-400">priority</span>
        {f.source_method && (
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${methodChip(f.source_method).cls}`} title={`Found via ${f.source_method}`}>
            {methodChip(f.source_method).label}
          </span>
        )}
        {f.match_method && (
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${matchMethodChip(f.match_method).cls}`}
            title={matchMethodChip(f.match_method).title}
          >
            {matchMethodChip(f.match_method).label}
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
        {f.shipping_price && (
          <span className="text-stone-500" title="Shipping">+ {f.shipping_price}</span>
        )}
        {f.infringement_type && (
          <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 uppercase tracking-wide font-semibold">
            {f.infringement_type.replace(/_/g, " ")}
          </span>
        )}
        {(f.country || f.location) && (
          <span
            className="text-stone-500"
            title={f.location && f.country && f.location !== f.country ? f.location : undefined}
          >
            📍 {f.country || f.location}
          </span>
        )}
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
        {f.quantity_available != null && f.quantity_available > 0 && (
          f.quantity_available <= 5 ? (
            <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-semibold" title="Stock left">
              Only {f.quantity_available} left
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-600" title="Stock available">
              {f.quantity_available.toLocaleString()} in stock
            </span>
          )
        )}
        {f.quantity_in_carts != null && f.quantity_in_carts > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold" title="Active demand">
            {f.quantity_in_carts} in carts
          </span>
        )}
      </div>

      {(f.seller_name || f.seller_url) && (
        <div className="text-[11px] text-stone-600 space-y-0.5">
          <div>
            <span className="text-stone-400">Seller: </span>
            {f.seller_url ? (
              <a href={f.seller_url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                {f.seller_name || f.seller_url}
              </a>
            ) : (
              <span className="font-medium">{f.seller_name}</span>
            )}
          </div>
          {(f.seller_rating != null || f.seller_sales != null || f.seller_years_active != null) && (
            <div className="text-stone-400 flex items-center gap-2 flex-wrap">
              {f.seller_rating != null && (
                <span>
                  ★ <span className="font-semibold text-stone-600">{f.seller_rating.toFixed(1)}</span>
                  {f.seller_rating_count != null && f.seller_rating_count > 0 && (
                    <span className="text-stone-400"> ({f.seller_rating_count.toLocaleString()})</span>
                  )}
                </span>
              )}
              {f.seller_sales != null && f.seller_sales > 0 && (
                <span>· {f.seller_sales.toLocaleString()} sales</span>
              )}
              {f.seller_years_active != null && f.seller_years_active > 0 && (
                <span>· {f.seller_years_active}y on platform</span>
              )}
            </div>
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

      {f.description_full && f.description_full !== f.description_summary && (
        <details className="text-[11px] text-stone-500">
          <summary className="cursor-pointer text-stone-400 hover:text-stone-600 select-none">
            Full description
          </summary>
          <p className="mt-1.5 leading-relaxed whitespace-pre-wrap">{f.description_full}</p>
        </details>
      )}

      {f.item_details && Object.keys(f.item_details).length > 0 && (
        <details className="text-[11px] text-stone-500">
          <summary className="cursor-pointer text-stone-400 hover:text-stone-600 select-none">
            Item details ({Object.keys(f.item_details).length})
          </summary>
          <dl className="mt-1.5 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1">
            {Object.entries(f.item_details).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-stone-400 truncate max-w-[10rem]">{k}</dt>
                <dd className="text-stone-600 break-words">{String(v)}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}

      {!f.listing_title && !f.seller_name && !f.match_explanation && !f.description_summary && (
        <p className="text-[11px] text-stone-400 italic">Listing details still being analysed…</p>
      )}

      <div className="flex items-center gap-2 flex-wrap text-[11px] text-stone-400">
        <span>sim {Math.round((f.similarity_score ?? 0) * 100)}%</span>
        {f.inliers != null && <span>· inliers {f.inliers}</span>}
        {f.published_at && <span>· {f.published_at}</span>}
        <span>· found {new Date(f.found_at).toLocaleDateString()}</span>
        {f.last_checked_at && (
          <span title={new Date(f.last_checked_at).toLocaleString()}>
            · last visit {formatAgo(f.last_checked_at)}
          </span>
        )}
        <a href={f.page_url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline break-all">
          · open listing ↗
        </a>
      </div>
    </div>
  );
}

// Status-driven action group for the comparison header. One primary + a few
// secondaries per state; everything is optimistic ("Working…") and triggers
// a board refresh on success.
function FindingActions({
  f,
  ipId,
  canLicense,
  isDismissed,
  isDismissing,
  onDismiss,
  onUpdated,
}: {
  f: IpReviewFinding;
  ipId?: string;
  canLicense: boolean;
  isDismissed: boolean;
  isDismissing: boolean;
  onDismiss: () => void;
  onUpdated: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [licensing, setLicensing] = useState(false);

  async function run(label: string, fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(label);
    try {
      await fn();
      onUpdated();
    } catch (e) {
      alert(e instanceof Error ? e.message : `Failed: ${label}`);
    } finally {
      setBusy(null);
    }
  }

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

  // Effective status: explicit dismissal collapses to "dismissed".
  const state: CaseReviewStatus = isDismissed
    ? "dismissed"
    : (f.review_status ?? "pending");

  const primaryCls =
    "px-2.5 py-1 rounded-md text-[11px] font-semibold disabled:opacity-50";
  const blue = `${primaryCls} bg-blue-600 text-white hover:bg-blue-500`;
  const amber = `${primaryCls} bg-amber-500 text-white hover:bg-amber-400`;
  const emerald = `${primaryCls} bg-emerald-600 text-white hover:bg-emerald-500`;
  const dark = `${primaryCls} bg-stone-900 text-white hover:bg-stone-800`;
  const ghostStone = `${primaryCls} border border-stone-300 text-stone-700 hover:bg-stone-50 bg-white`;
  const ghostEmerald = `${primaryCls} border border-emerald-300 text-emerald-700 hover:bg-emerald-50 bg-white`;

  const dismissBtn = (
    <button
      key="dismiss"
      type="button"
      onClick={onDismiss}
      disabled={isDismissing}
      className={ghostStone}
    >
      {isDismissing ? "Dismissing…" : "Dismiss"}
    </button>
  );

  const licenseBtn = canLicense ? (
    <button
      key="license"
      type="button"
      onClick={handleLicense}
      disabled={licensing}
      title="Mark this seller as licensed on this domain — dismisses this and future findings from them"
      className={ghostEmerald}
    >
      {licensing ? "Licensing…" : "License this seller"}
    </button>
  ) : null;

  function reopenBtn(label = "Reopen") {
    return (
      <button
        key="reopen"
        type="button"
        disabled={!ipId || busy === "reopen"}
        onClick={() =>
          ipId &&
          run("reopen", () => reopenIpFinding(ipId, f.result_id))
        }
        className={ghostStone}
      >
        {busy === "reopen" ? "Working…" : label}
      </button>
    );
  }

  let buttons: React.ReactNode = null;

  if (state === "pending") {
    buttons = (
      <>
        <button
          type="button"
          disabled={!ipId || busy === "confirm"}
          onClick={() =>
            ipId && run("confirm", () => confirmIpFinding(ipId, f.result_id))
          }
          className={blue}
        >
          {busy === "confirm" ? "Working…" : "Confirm"}
        </button>
        {licenseBtn}
        {dismissBtn}
      </>
    );
  } else if (state === "confirmed") {
    buttons = (
      <>
        <button
          type="button"
          disabled={!ipId || busy === "packet"}
          onClick={() =>
            ipId &&
            run("packet", () => openIpFindingTakedownPacket(ipId, f.result_id))
          }
          className={dark}
        >
          {busy === "packet" ? "Preparing…" : "Generate takedown"}
        </button>
        <button
          type="button"
          disabled={!ipId || busy === "sent"}
          onClick={() =>
            ipId &&
            run("sent", () => markIpFindingTakedownSent(ipId, f.result_id))
          }
          className={amber}
        >
          {busy === "sent" ? "Working…" : "Mark sent"}
        </button>
        {dismissBtn}
      </>
    );
  } else if (state === "takedown_sent") {
    buttons = (
      <>
        <button
          type="button"
          disabled={!ipId || busy === "enforce"}
          onClick={() =>
            ipId &&
            run("enforce", () => markIpFindingEnforced(ipId, f.result_id))
          }
          className={emerald}
        >
          {busy === "enforce" ? "Working…" : "Mark enforced"}
        </button>
        <button
          type="button"
          disabled={!ipId || busy === "packet"}
          onClick={() =>
            ipId &&
            run("packet", () => openIpFindingTakedownPacket(ipId, f.result_id))
          }
          className={ghostStone}
        >
          {busy === "packet" ? "Preparing…" : "Re-open packet"}
        </button>
        {dismissBtn}
      </>
    );
  } else if (state === "enforced") {
    buttons = reopenBtn();
  } else {
    // dismissed
    buttons = reopenBtn();
  }

  return <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">{buttons}</div>;
}
