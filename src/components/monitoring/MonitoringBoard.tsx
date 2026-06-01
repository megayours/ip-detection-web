import { useEffect, useMemo, useState } from "react";
import {
  addIpLicense,
  confirmIpFinding,
  dismissIpFinding,
  markIpFindingEnforced,
  markIpFindingTakedownSent,
  openIpFindingTakedownPacket,
  reenrichIpFinding,
  reopenIpFinding,
  type CaseReviewStatus,
  type IpReviewFinding,
  type MonitoringFacets,
  type MonitoringPriorityBand,
  type MonitoringSortMode,
  type MonitoringStatusFilter,
} from "../../api";

/** Shape pushed up to the parent — must match Findings.tsx::InboxFilters. */
export interface BoardFilters {
  status: MonitoringStatusFilter | null;
  priority: MonitoringPriorityBand | null;
  ip_id: string | null;
  platform: string | null;
  seller: string | null;
  show_dismissed: boolean;
  sort: MonitoringSortMode;
}

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
 * Tenant-wide findings board. Filter state lives in the URL (managed by
 * Findings.tsx); the board is a "dumb" renderer that consumes the page of
 * findings + facet counts and emits filter changes back up. Server handles
 * filtering + sorting + keyset pagination — the "Load more" footer appends
 * the next page in place.
 */
export function MonitoringBoard({
  findings,
  facets,
  filters,
  onFiltersChange,
  nextCursor,
  loadingMore,
  onLoadMore,
  ipId,
  runInProgress,
  onRefresh,
  onDismiss,
  showIpColumn,
}: {
  findings: IpReviewFinding[];
  facets: MonitoringFacets;
  filters: BoardFilters;
  onFiltersChange: (next: Partial<BoardFilters>) => void;
  nextCursor: string | null;
  loadingMore: boolean;
  onLoadMore: () => void;
  /**
   * Fallback IP for per-finding actions when a finding doesn't carry its own
   * `ip_id` (single-IP usage). On the global board each finding ships `ip_id`.
   */
  ipId?: string;
  /** A monitor run is currently pending/executing — tweaks the empty state. */
  runInProgress: boolean;
  /** Re-fetch the first page (e.g. after a dismiss / license backfill). */
  onRefresh: () => void;
  /** Optional post-dismiss notification with the dismissed result_id. */
  onDismiss?: (resultId: string) => void;
  /** Render the IP-name chip + IP filter dropdown. */
  showIpColumn?: boolean;
}) {
  const ipAware = showIpColumn ?? findings.some((f) => !!f.ip_id);
  // Optimistically-dismissed result_ids — the next refetch replaces these
  // once `dismissed_at` lands in the payload.
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());
  // Inline-expanded finding (Gmail-row accordion). null = all collapsed.
  const [activeId, setActiveId] = useState<string | null>(null);

  // Collapse the expanded row when filters drop it from the visible set —
  // derived during render rather than synced via effect so we don't trigger
  // a cascading re-render.
  const effectiveActiveId =
    activeId && findings.some((f) => f.result_id === activeId) ? activeId : null;

  // Stale entries in `dismissing` for findings that have since been removed
  // from the page are harmless — they're never queried after the row goes
  // away — so we don't bother clearing them on each refetch.

  const counts = facets.priorities;
  const total = facets.total;
  const dismissedCount = facets.statuses.dismissed ?? 0;

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
        counts={facets.statuses}
        active={filters.status}
        onSelect={(s) =>
          onFiltersChange({ status: s as MonitoringStatusFilter | null })
        }
      />

      {/* One clean filter bar: severity pills + IP + platform + dismissed. */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3 mt-3">
        <PriorityBanner
          counts={{ ...counts, total }}
          active={filters.priority ?? "all"}
          onSelect={(p) =>
            onFiltersChange({
              priority: p === "all" ? null : (p as MonitoringPriorityBand),
            })
          }
        />
        <div className="flex items-center gap-2 flex-wrap">
          {ipAware && facets.ips.length > 1 && (
            <select
              value={filters.ip_id ?? "all"}
              onChange={(e) =>
                onFiltersChange({
                  ip_id: e.target.value === "all" ? null : e.target.value,
                })
              }
              title="Filter by IP"
              className={FILTER_SELECT}
            >
              <option value="all">All IPs ({facets.ips.reduce((s, ip) => s + ip.n, 0)})</option>
              {facets.ips.map((ip) => (
                <option key={ip.ip_id} value={ip.ip_id}>
                  {ip.name ?? "—"} ({ip.n})
                </option>
              ))}
            </select>
          )}
          {facets.platforms.length > 1 && (
            <select
              value={filters.platform ?? "all"}
              onChange={(e) =>
                onFiltersChange({
                  platform: e.target.value === "all" ? null : e.target.value,
                })
              }
              title="Filter by platform"
              className={FILTER_SELECT}
            >
              <option value="all">All platforms ({facets.platforms.reduce((s, p) => s + p.n, 0)})</option>
              {facets.platforms.map((p) => (
                <option key={p.domain} value={p.domain}>
                  {p.domain} ({p.n})
                </option>
              ))}
            </select>
          )}
          {(filters.seller || (facets.sellers && facets.sellers.length > 0)) && (
            <select
              value={filters.seller ?? "all"}
              onChange={(e) =>
                onFiltersChange({
                  seller: e.target.value === "all" ? null : e.target.value,
                })
              }
              title="Filter by seller"
              className={FILTER_SELECT}
            >
              <option value="all">All sellers ({(facets.sellers ?? []).reduce((s, x) => s + x.n, 0)})</option>
              {/* Ensure the active filter is selectable even if facets dropped it
                  (e.g. tenant has many sellers and the active one fell off the
                  top-50 list, or the seller has zero current findings). */}
              {filters.seller && !(facets.sellers ?? []).some((x) => x.seller_name === filters.seller) && (
                <option value={filters.seller}>{filters.seller}</option>
              )}
              {(facets.sellers ?? []).map((s) => (
                <option key={s.seller_name} value={s.seller_name}>
                  {s.seller_name} ({s.n})
                </option>
              ))}
            </select>
          )}
          <select
            value={filters.sort}
            onChange={(e) =>
              onFiltersChange({ sort: e.target.value as MonitoringSortMode })
            }
            title="Sort findings"
            className={FILTER_SELECT}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
          <label
            className={`flex items-center gap-1.5 text-[11px] ${
              dismissedCount === 0 ? "text-stone-300" : "text-stone-500"
            }`}
          >
            <input
              type="checkbox"
              checked={filters.show_dismissed}
              onChange={(e) => onFiltersChange({ show_dismissed: e.target.checked })}
              disabled={dismissedCount === 0}
            />
            Show dismissed ({dismissedCount})
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white">
        <div className="px-5 py-3 border-b border-stone-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900">
            Findings <span className="text-stone-400 font-normal">({findings.length}{nextCursor ? "+" : ""})</span>
          </h2>
        </div>
        {findings.length === 0 ? (
          <div className="px-5 py-8 text-sm text-stone-400 text-center">
            {runInProgress
              ? "Waiting for the first findings to arrive…"
              : (
                <>
                  No findings match the current filters.
                </>
              )}
          </div>
        ) : (
          /* Gmail-style compact row list. Each row toggles an inline detail
             panel; only one row is open at a time. */
          <div className="divide-y divide-stone-100">
            {findings.map((f) => {
              const expanded = f.result_id === effectiveActiveId;
              const rowDismissed = !!f.dismissed_at || dismissing.has(f.result_id);
              return (
                <div key={f.result_id}>
                  <FindingRow
                    f={f}
                    expanded={expanded}
                    isDismissed={rowDismissed}
                    showIp={ipAware}
                    onToggle={() =>
                      setActiveId((prev) => (prev === f.result_id ? null : f.result_id))
                    }
                  />
                  {expanded && (
                    <div className="bg-stone-50 border-t border-stone-100 px-5 py-5">
                      <FindingComparison
                        key={f.result_id}
                        f={f}
                        ipId={f.ip_id ?? ipId}
                        showIp={ipAware}
                        isDismissed={rowDismissed}
                        isDismissing={dismissing.has(f.result_id) && !f.dismissed_at}
                        onDismiss={() => handleDismiss(f)}
                        onUpdated={onRefresh}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {/* Pagination footer: Load more when the server says there's another
            page, end-of-list marker otherwise. Hidden when there are no rows. */}
        {findings.length > 0 && (
          <div className="border-t border-stone-100 px-5 py-3 text-center">
            {nextCursor ? (
              <button
                type="button"
                disabled={loadingMore}
                onClick={onLoadMore}
                className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            ) : (
              <span className="text-[11px] text-stone-400">End of list.</span>
            )}
          </div>
        )}
      </div>
    </>
  );
}

type PriorityFilter = "all" | "high" | "med" | "low";

// Sort options surfaced in the filter bar. Default `score_desc` mirrors the
// backend ORDER BY (priority desc, found_at desc).
const SORT_OPTIONS: Array<{ key: MonitoringSortMode; label: string }> = [
  { key: "score_desc",   label: "Score · highest first" },
  { key: "score_asc",    label: "Score · lowest first" },
  { key: "found_desc",   label: "Found · newest first" },
  { key: "found_asc",    label: "Found · oldest first" },
  { key: "updated_desc", label: "Updated · most recent" },
  { key: "updated_asc",  label: "Updated · least recent" },
];

// Slim status pipeline pills. `null` is rendered as "pending".
const STATUS_FILTERS: Array<{ key: string; label: string }> = [
  { key: "pending", label: "To triage" },
  { key: "confirmed", label: "Confirmed" },
  { key: "takedown_sent", label: "Sent" },
  { key: "enforced", label: "Enforced" },
  { key: "dismissed", label: "Dismissed" },
];

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

/** Modern "detected region" overlay: four rounded corner brackets in an
 *  indigo→fuchsia gradient with a soft glow, plus a near-invisible fill tint
 *  inside the box. The brackets stay short relative to the bbox so they
 *  read as focal markers (not a frame), and the gradient + glow lift the
 *  feel from a "red rectangle" alarm to a quiet annotation. */
function BboxOverlay({
  naturalW,
  naturalH,
  bbox,
}: {
  naturalW: number;
  naturalH: number;
  bbox: [number, number, number, number];
}) {
  const [x, y, w, h] = bbox;
  const longSide = Math.max(naturalW, naturalH);
  // Scale visuals to the image's pixel space so they read the same regardless
  // of how the SVG is letterboxed by the surrounding container.
  const sw = Math.max(3, longSide / 220);
  const radius = Math.max(6, longSide / 120);
  const armLen = Math.max(Math.min(w, h) * 0.22, longSide / 35);
  const arm = Math.min(armLen, Math.min(w, h) / 2.2);
  const x2 = x + w;
  const y2 = y + h;
  // Path per corner: arm in along the long edge → quarter-arc → arm in along
  // the short edge. Stroke-linecap=round softens the cut ends.
  const corners = [
    // top-left
    `M ${x} ${y + arm} L ${x} ${y + radius} Q ${x} ${y} ${x + radius} ${y} L ${x + arm} ${y}`,
    // top-right
    `M ${x2 - arm} ${y} L ${x2 - radius} ${y} Q ${x2} ${y} ${x2} ${y + radius} L ${x2} ${y + arm}`,
    // bottom-right
    `M ${x2} ${y2 - arm} L ${x2} ${y2 - radius} Q ${x2} ${y2} ${x2 - radius} ${y2} L ${x2 - arm} ${y2}`,
    // bottom-left
    `M ${x + arm} ${y2} L ${x + radius} ${y2} Q ${x} ${y2} ${x} ${y2 - radius} L ${x} ${y2 - arm}`,
  ];
  return (
    <svg
      viewBox={`0 0 ${naturalW} ${naturalH}`}
      className="absolute inset-0 w-full h-full pointer-events-none"
    >
      <defs>
        <linearGradient id="bbox-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="60%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        <filter
          id="bbox-glow"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          <feGaussianBlur stdDeviation={sw * 1.2} result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      {/* Quiet area tint — same gradient, near-invisible. Rounded so the
          fill never escapes the corner brackets. */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={radius}
        ry={radius}
        fill="url(#bbox-grad)"
        fillOpacity={0.06}
      />
      <g
        stroke="url(#bbox-grad)"
        strokeWidth={sw}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#bbox-glow)"
      >
        {corners.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}

/** Hero-with-thumbstrip carousel for the listing's product photos. When
 *  `gallery_scores` is present (worker scored each photo against the IP), the
 *  best-matched image is the default hero, marked MATCHED, and each thumb
 *  shows its similarity %. Falls back to discovery `image_url` only when the
 *  gallery is empty. The page screenshot is rendered separately below. */
function ListingCarousel({ f }: { f: IpReviewFinding }) {
  const scored = f.gallery_scores ?? [];
  const scoredByUrl = new Map(scored.map((s) => [s.url, s.similarity]));
  // Per-URL bbox in gallery-image pixel coords from the worker's keypoint
  // localizer. Drawn as an SVG overlay on the hero so the reviewer can see
  // where on the photo the IP (logo/label) was found.
  const bboxByUrl = new Map(
    scored.filter((s) => s.bbox).map((s) => [s.url, s.bbox!]),
  );
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
  const activeBbox = bboxByUrl.get(active);
  const bestUrl = scored[0]?.url;

  // Natural dimensions of the active hero image — needed so the SVG bbox
  // overlay (in pixel coords) lines up under the same `object-contain`
  // letterboxing as the <img>. Reset when the active URL changes.
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    setNatural(null);
  }, [active]);

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
        <img
          src={active}
          alt=""
          className="w-full h-full object-contain"
          onLoad={(e) => {
            const img = e.currentTarget;
            setNatural({ w: img.naturalWidth, h: img.naturalHeight });
          }}
        />
        {activeBbox && natural && (
          // SVG laid over the container with its viewBox = the image's natural
          // pixel space. Default preserveAspectRatio ("xMidYMid meet") matches
          // <img>'s `object-contain` letterboxing, so the overlay lands on the
          // same pixels regardless of the container's aspect ratio.
          <BboxOverlay
            naturalW={natural.w}
            naturalH={natural.h}
            bbox={activeBbox}
          />
        )}
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


// Top matched gallery image (highest similarity). Falls back to the
// discovery image when the gallery wasn't enriched.
function topImageUrl(f: IpReviewFinding): string | null {
  const top = f.gallery_scores?.[0]?.url;
  return top ?? f.image_url ?? null;
}

// Fallback quantity when the listing didn't expose stock — most marketplaces
// hide it, so a flat 10 keeps the KPI honest as a rough upper bound rather
// than the per-listing `1` that systematically under-counts.
const QTY_FALLBACK = 10;

// Per-row "Estimated unlicensed market" = price_value × quantity.
// Returns null when we can't compute (no structured price).
function estimatedMarket(
  f: IpReviewFinding,
): { value: number; currency: string } | null {
  // Coerce: Postgres NUMERIC arrives as a string when not cast to float8.
  const price = f.price_value == null ? null : Number(f.price_value);
  if (price == null || !Number.isFinite(price) || price <= 0) return null;
  const qty = f.quantity_available && f.quantity_available > 0
    ? f.quantity_available
    : QTY_FALLBACK;
  return { value: price * qty, currency: f.price_currency ?? "USD" };
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: amount >= 100 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(0)}`;
  }
}

/** Gmail-style single-line row. Click anywhere to toggle the inline detail
 *  panel. Crucial fields per the inbox spec:
 *  score · top image · seller · found (tooltip: updated) · state · est. market · platform. */
function FindingRow({
  f,
  expanded,
  isDismissed,
  showIp,
  onToggle,
}: {
  f: IpReviewFinding;
  expanded: boolean;
  isDismissed: boolean;
  showIp?: boolean;
  onToggle: () => void;
}) {
  const priorityBg =
    f.enforcement_priority >= 0.75
      ? "bg-red-100 text-red-700"
      : f.enforcement_priority >= 0.5
        ? "bg-amber-100 text-amber-700"
        : "bg-stone-100 text-stone-600";
  const thumb = topImageUrl(f);
  const market = estimatedMarket(f);
  const sb = statusBadge(f.dismissed_at ? "dismissed" : f.review_status);
  const foundAgo = formatAgo(f.found_at) ?? "—";
  const updatedAgo = formatAgo(f.last_checked_at);
  const title = f.listing_title ?? f.page_url;
  const sellerLine = f.seller_name || "—";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      title={updatedAgo ? `Updated ${updatedAgo}` : undefined}
      className={`w-full text-left flex items-center gap-3 px-3 py-2 transition-colors ${
        expanded ? "bg-stone-50" : "hover:bg-stone-50"
      } ${isDismissed ? "opacity-50" : ""}`}
    >
      {/* Expand caret — single column so the row alignment doesn't jump. */}
      <span
        className={`shrink-0 text-stone-400 text-xs w-3 transition-transform ${
          expanded ? "rotate-90" : ""
        }`}
        aria-hidden
      >
        ▸
      </span>

      {/* (1) Score — colored pill, monospace numerics for column alignment. */}
      <span
        className={`shrink-0 text-[11px] font-bold tabular-nums rounded px-1.5 py-0.5 w-10 text-center ${priorityBg}`}
        title="Enforcement priority"
      >
        {f.enforcement_priority.toFixed(2)}
      </span>

      {/* (2) Top matched image. */}
      {thumb ? (
        <img
          src={thumb}
          alt=""
          className="shrink-0 w-9 h-9 rounded object-cover border border-stone-200"
        />
      ) : (
        <div className="shrink-0 w-9 h-9 rounded bg-stone-100" />
      )}

      {/* Title + seller stacked, flex-grow so it eats the leftover space. */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          {showIp && f.ip_name && (
            <span className="shrink-0 inline-block px-1 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[9px] font-bold uppercase tracking-wide">
              {f.ip_name}
            </span>
          )}
          <span className="text-[13px] font-semibold text-stone-900 truncate">
            {title}
          </span>
        </div>
        {/* (3) Seller + (7) Platform on the same secondary line. */}
        <div className="text-[11px] text-stone-500 truncate">
          <span className="font-medium">{sellerLine}</span>
          <span className="mx-1.5 text-stone-300">·</span>
          <span>{f.domain}</span>
        </div>
      </div>

      {/* (5) State badge. */}
      <span
        className={`shrink-0 hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${sb.cls}`}
      >
        {sb.label}
      </span>

      {/* (6) Estimated unlicensed market for this item. */}
      <span
        className="shrink-0 hidden md:inline-block w-24 text-right text-[12px] font-semibold tabular-nums text-stone-800"
        title={
          market
            ? `${f.price ?? formatMoney(Number(f.price_value), market.currency)} × qty ${f.quantity_available && f.quantity_available > 0 ? f.quantity_available : QTY_FALLBACK}`
            : "No structured price yet"
        }
      >
        {market ? formatMoney(market.value, market.currency) : <span className="text-stone-300">—</span>}
      </span>

      {/* (4) Date — found relative; tooltip on row carries updated. */}
      <span className="shrink-0 w-14 text-right text-[11px] text-stone-500 tabular-nums">
        {foundAgo}
      </span>
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
                  ★ <span className="font-semibold text-stone-600">{Number(f.seller_rating).toFixed(1)}</span>
                  {f.seller_rating_count != null && f.seller_rating_count > 0 && (
                    <span className="text-stone-400"> ({Number(f.seller_rating_count).toLocaleString()})</span>
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

  // Always-available — re-scrapes the listing + re-extracts + re-scores
  // gallery photos (incl. bbox localization). Independent of review state.
  const refreshBtn = ipId ? (
    <button
      key="refresh"
      type="button"
      disabled={busy === "refresh"}
      title="Re-scrape the listing and re-run enrichment + bbox localization"
      onClick={() =>
        run("refresh", () => reenrichIpFinding(ipId, f.result_id))
      }
      className={ghostStone}
    >
      {busy === "refresh" ? "Refreshing…" : "Refresh"}
    </button>
  ) : null;

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

  return (
    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
      {buttons}
      {refreshBtn}
    </div>
  );
}
