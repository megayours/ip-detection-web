import { Fragment, useEffect, useMemo, useState } from "react";
import TakedownPanel, { ComposeModal, ConfirmSendModal } from "../TakedownPanel";
import CaseComments from "../CaseComments";
import {
  addIpLicense,
  dismissIpFinding,
  markIpFindingEnforced,
  reenrichIpFinding,
  reopenIpFinding,
  autoSendTakedown,
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

// --- Batch operations (multi-select) ---------------------------------------

type BatchAction = "send" | "dismiss" | "enforce";

const BATCH_META: Record<
  BatchAction,
  { label: string; verb: string; gerund: string }
> = {
  send: { label: "Send takedowns", verb: "Sent", gerund: "Send takedowns for" },
  dismiss: { label: "Dismiss", verb: "Dismissed", gerund: "Dismiss" },
  enforce: { label: "Mark enforced", verb: "Marked enforced", gerund: "Mark enforced" },
};

/** Run `worker` over `items` with at most `concurrency` in flight. */
async function runPool<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  concurrency: number,
) {
  let cursor = 0;
  const pull = async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      await worker(item);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, pull),
  );
}

/** "Sent 9 · skipped 3: 2 missing signer, 1 already sent · 1 failed" */
function summarizeBatch(
  action: BatchAction,
  ok: number,
  skipped: Record<string, number>,
  failed: number,
): string {
  const parts = [`${BATCH_META[action].verb} ${ok}`];
  const skipTotal = Object.values(skipped).reduce((a, b) => a + b, 0);
  if (skipTotal > 0) {
    const detail = Object.entries(skipped)
      .map(([reason, n]) => `${n} ${reason}`)
      .join(", ");
    parts.push(`skipped ${skipTotal}: ${detail}`);
  }
  if (failed > 0) parts.push(`${failed} failed`);
  return parts.join(" · ");
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

  // --- Multi-select + batch operations -------------------------------------
  // Selection is keyed by result_id and page-local (covers loaded rows only).
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<BatchAction | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);
  const [batchResult, setBatchResult] = useState<string | null>(null);

  // Reset selection when the filter set changes — the rows it referenced are
  // gone. (Pruning on every refetch isn't needed: stale ids are simply ignored.)
  const filterKey = JSON.stringify(filters);
  useEffect(() => {
    setSelected(new Set());
    setBatchResult(null);
  }, [filterKey]);

  function toggleSelect(resultId: string) {
    setBatchResult(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(resultId)) next.delete(resultId);
      else next.add(resultId);
      return next;
    });
  }
  function toggleSelectAll() {
    setBatchResult(null);
    setSelected((prev) =>
      prev.size === findings.length
        ? new Set()
        : new Set(findings.map((f) => f.result_id)),
    );
  }

  // Split the current selection for an action into rows to act on vs.
  // skip-reason counts to report. `state` mirrors FindingActions' derivation.
  function partitionSelection(action: BatchAction) {
    const eligible: IpReviewFinding[] = [];
    const skipped: Record<string, number> = {};
    const skip = (r: string) => {
      skipped[r] = (skipped[r] ?? 0) + 1;
    };
    for (const f of findings) {
      if (!selected.has(f.result_id)) continue;
      const state: CaseReviewStatus = f.dismissed_at
        ? "dismissed"
        : (f.review_status ?? "pending");
      if (action === "send") {
        if (state !== "pending") skip("already sent or closed");
        else if (!f.case_id) skip("still preparing");
        else if (f.signer_ready === false) skip("missing signer information");
        else eligible.push(f);
      } else if (action === "dismiss") {
        if (f.dismissed_at) skip("already dismissed");
        else if (!(f.ip_id ?? ipId)) skip("no associated IP");
        else eligible.push(f);
      } else {
        if (state !== "takedown_sent") skip("not awaiting enforcement");
        else if (!(f.ip_id ?? ipId)) skip("no associated IP");
        else eligible.push(f);
      }
    }
    return { eligible, skipped };
  }

  async function runBatch(action: BatchAction) {
    const { eligible, skipped } = partitionSelection(action);
    const skipCounts: Record<string, number> = { ...skipped };
    let ok = 0;
    let failed = 0;
    if (eligible.length === 0) {
      setBatchResult(summarizeBatch(action, 0, skipCounts, 0));
      return;
    }
    setBatchProgress({ done: 0, total: eligible.length });
    const bump = (reason: string) => {
      skipCounts[reason] = (skipCounts[reason] ?? 0) + 1;
    };
    await runPool(
      eligible,
      async (f) => {
        try {
          if (action === "send") {
            const r = await autoSendTakedown(f.case_id as string);
            if (r.status === "sent") ok++;
            else if (r.status === "needs_compose") bump("needs manual compose");
            else bump("email not configured");
          } else if (action === "dismiss") {
            await dismissIpFinding((f.ip_id ?? ipId) as string, f.result_id);
            ok++;
          } else {
            await markIpFindingEnforced((f.ip_id ?? ipId) as string, f.result_id);
            ok++;
          }
        } catch {
          failed++;
        } finally {
          setBatchProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
        }
      },
      4,
    );
    setBatchProgress(null);
    setSelected(new Set());
    setBatchResult(summarizeBatch(action, ok, skipCounts, failed));
    onRefresh();
  }

  const allSelected = findings.length > 0 && selected.size === findings.length;
  const someSelected = selected.size > 0 && !allSelected;

  return (
    <>
      {/* Secondary toolbar — priority + facet filters. Status lives in the
          tabs on the table; sorting lives in the sortable column headers. */}
      <div className="flex items-center justify-end gap-2 flex-wrap mb-3">
        <div className="relative">
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-stone-400">
            <svg viewBox="0 0 12 12" width="12" height="12" fill="currentColor" aria-hidden>
              <rect x="0.5" y="5" width="2.5" height="6" rx="0.5" />
              <rect x="4.75" y="3" width="2.5" height="8" rx="0.5" />
              <rect x="9" y="1" width="2.5" height="10" rx="0.5" />
            </svg>
          </span>
          <select
            value={filters.priority ?? "all"}
            onChange={(e) =>
              onFiltersChange({
                priority:
                  e.target.value === "all"
                    ? null
                    : (e.target.value as MonitoringPriorityBand),
              })
            }
            title="Filter by priority"
            className={`${FILTER_SELECT} pl-7`}
          >
            <option value="all">All priorities ({total})</option>
            <option value="high">High ({counts.high})</option>
            <option value="med">Medium ({counts.med})</option>
            <option value="low">Low ({counts.low})</option>
          </select>
        </div>
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
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
        <StatusTabs
          counts={facets.statuses}
          active={filters.status}
          onSelect={(s) =>
            onFiltersChange({ status: s as MonitoringStatusFilter | null })
          }
        />
        {selected.size > 0 && (
          <div className="px-4 py-2 border-b border-stone-100 bg-stone-50 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-semibold text-stone-600">
              {selected.size} selected
            </span>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {batchProgress ? (
                <span className="text-xs text-stone-500">
                  Working… ({batchProgress.done}/{batchProgress.total})
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirmAction("send")}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-600 text-white hover:bg-blue-500"
                  >
                    Send takedowns
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmAction("enforce")}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-500"
                  >
                    Mark enforced
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmAction("dismiss")}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold border border-stone-300 text-stone-700 bg-white hover:bg-stone-50"
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected(new Set())}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-stone-500 hover:text-stone-700"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>
        )}
        {batchResult && (
          <div className="px-5 py-2 border-b border-stone-100 bg-stone-50 text-xs text-stone-600 flex items-center justify-between gap-3">
            <span>{batchResult}</span>
            <button
              type="button"
              onClick={() => setBatchResult(null)}
              className="text-stone-400 hover:text-stone-600 font-semibold shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}
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
          /* Columnar findings table. Sortable headers drive the server sort;
             clicking a row still expands the inline comparison panel (only one
             row open at a time). */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/60 text-[10px] uppercase tracking-wide text-stone-400">
                  <th className="w-8 pl-3 pr-1 py-2 align-middle">
                    <input
                      type="checkbox"
                      aria-label="Select all loaded findings"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={toggleSelectAll}
                      className="align-middle"
                    />
                  </th>
                  <SortHeader label="Rate" col="rate" sort={filters.sort} onSort={(s) => onFiltersChange({ sort: s })} className="w-14" />
                  <th className="py-2 px-2 font-semibold">Image</th>
                  <th className="py-2 px-2 font-semibold">Description</th>
                  <SortHeader label="Seller" col="seller" sort={filters.sort} onSort={(s) => onFiltersChange({ sort: s })} className="hidden md:table-cell" />
                  <SortHeader label="Platform" col="platform" sort={filters.sort} onSort={(s) => onFiltersChange({ sort: s })} className="hidden lg:table-cell" />
                  <th className="hidden sm:table-cell py-2 px-2 font-semibold">Status</th>
                  <SortHeader label="Price" col="price" sort={filters.sort} onSort={(s) => onFiltersChange({ sort: s })} align="right" className="hidden md:table-cell" />
                  <SortHeader label="Days" col="days" sort={filters.sort} onSort={(s) => onFiltersChange({ sort: s })} align="right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {findings.map((f) => {
                  const expanded = f.result_id === effectiveActiveId;
                  const rowDismissed = !!f.dismissed_at || dismissing.has(f.result_id);
                  return (
                    <Fragment key={f.result_id}>
                      <tr
                        onClick={() =>
                          setActiveId((prev) => (prev === f.result_id ? null : f.result_id))
                        }
                        className={`cursor-pointer transition-colors ${
                          expanded ? "bg-stone-50" : "hover:bg-stone-50"
                        } ${rowDismissed ? "opacity-50" : ""}`}
                      >
                        <td
                          className="w-8 pl-3 pr-1 align-middle"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            aria-label="Select finding"
                            checked={selected.has(f.result_id)}
                            onChange={() => toggleSelect(f.result_id)}
                          />
                        </td>
                        <FindingRow f={f} expanded={expanded} showIp={ipAware} />
                      </tr>
                      {expanded && (
                        <tr>
                          <td
                            colSpan={9}
                            className="bg-stone-50 border-t border-stone-100 px-5 py-5"
                          >
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
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
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

      {confirmAction && (
        <BatchConfirmModal
          action={confirmAction}
          {...partitionSelection(confirmAction)}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            const a = confirmAction;
            setConfirmAction(null);
            void runBatch(a);
          }}
        />
      )}
    </>
  );
}

/** Confirm dialog for a bulk action — previews how many of the selection will
 *  be acted on vs. skipped (and why) before running. */
function BatchConfirmModal({
  action,
  eligible,
  skipped,
  onConfirm,
  onCancel,
}: {
  action: BatchAction;
  eligible: IpReviewFinding[];
  skipped: Record<string, number>;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const meta = BATCH_META[action];
  const skipTotal = Object.values(skipped).reduce((a, b) => a + b, 0);
  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl border border-stone-200 max-w-md w-full overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="font-bold text-stone-900">{meta.label}</h3>
        </div>
        <div className="px-5 py-4 space-y-3 text-sm text-stone-600">
          {eligible.length > 0 ? (
            <p>
              {meta.gerund}{" "}
              <span className="font-semibold text-stone-900">
                {eligible.length} finding{eligible.length === 1 ? "" : "s"}
              </span>
              {action === "send"
                ? ". Each uses the suggested route + pre-filled draft for its platform."
                : "."}
            </p>
          ) : (
            <p>None of the selected findings are eligible for this action.</p>
          )}
          {skipTotal > 0 && (
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs">
              <p className="font-semibold text-stone-700">
                Skipping {skipTotal}:
              </p>
              <ul className="mt-1 space-y-0.5 text-stone-500">
                {Object.entries(skipped).map(([reason, n]) => (
                  <li key={reason}>
                    {n} {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-stone-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs font-semibold text-stone-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={eligible.length === 0}
            className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {meta.label}
          </button>
        </div>
      </div>
    </div>
  );
}

// Sortable table columns → their asc/desc server sort modes. Clicking a header
// applies `desc` first, then toggles. `score_desc` (the default) mirrors the
// backend ORDER BY (priority desc, found_at desc).
type SortCol = "rate" | "seller" | "platform" | "price" | "days";
const SORT_COLS: Record<SortCol, { asc: MonitoringSortMode; desc: MonitoringSortMode }> = {
  rate: { desc: "score_desc", asc: "score_asc" },
  seller: { desc: "seller_desc", asc: "seller_asc" },
  platform: { desc: "platform_desc", asc: "platform_asc" },
  price: { desc: "price_desc", asc: "price_asc" },
  days: { desc: "found_desc", asc: "found_asc" },
};

// Slim status pipeline pills. `null` is rendered as "pending".
const STATUS_FILTERS: Array<{ key: string; label: string }> = [
  { key: "pending", label: "To triage" },
  { key: "takedown_sent", label: "Sent" },
  { key: "enforced", label: "Enforced" },
  { key: "dismissed", label: "Dismissed" },
];

function statusBadge(s: CaseReviewStatus | null | undefined) {
  const status = (s ?? "pending") as CaseReviewStatus | "pending";
  switch (status) {
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

// Status pipeline as underline tabs flush on the top edge of the results card.
// The active tab is the primary level of hierarchy; the count rides each tab.
function StatusTabs({
  counts,
  active,
  onSelect,
}: {
  counts: Record<string, number>;
  active: string | null;
  onSelect: (s: string | null) => void;
}) {
  const total = counts.pending + counts.takedown_sent + counts.enforced;
  const tab = (key: string | null, label: string, n: number) => {
    const isActive = active === key;
    return (
      <button
        key={key ?? "all"}
        type="button"
        onClick={() => onSelect(key)}
        aria-pressed={isActive}
        className={`relative px-3.5 py-2.5 text-[13px] font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px ${
          isActive
            ? "border-stone-900 text-stone-900"
            : "border-transparent text-stone-500 hover:text-stone-800"
        }`}
      >
        {label}
        <span
          className={`ml-1.5 text-[11px] font-bold tabular-nums ${
            isActive ? "text-stone-500" : "text-stone-400"
          }`}
        >
          {n}
        </span>
      </button>
    );
  };
  return (
    <div className="flex items-center gap-1 px-3 border-b border-stone-200 overflow-x-auto">
      {tab(null, "All", total)}
      {STATUS_FILTERS.map((s) => tab(s.key, s.label, counts[s.key] ?? 0))}
    </div>
  );
}

// Sortable column header. First click sorts desc, subsequent clicks toggle.
// A subtle ↕ marks sortable columns; the active column shows the direction.
function SortHeader({
  label,
  col,
  sort,
  onSort,
  align = "left",
  className = "",
}: {
  label: string;
  col: SortCol;
  sort: MonitoringSortMode;
  onSort: (next: MonitoringSortMode) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const { asc, desc } = SORT_COLS[col];
  const active = sort === asc || sort === desc;
  const isAsc = sort === asc;
  const next = sort === desc ? asc : desc;
  return (
    <th className={`py-2 px-2 font-semibold ${className}`}>
      <button
        type="button"
        onClick={() => onSort(next)}
        className={`inline-flex items-center gap-1 uppercase tracking-wide hover:text-stone-700 ${
          align === "right" ? "flex-row-reverse" : ""
        } ${active ? "text-stone-700" : ""}`}
      >
        <span>{label}</span>
        <span className={`text-[8px] leading-none ${active ? "opacity-100" : "opacity-30"}`} aria-hidden>
          {active ? (isAsc ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
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
      <div className="w-full aspect-square bg-stone-50 border border-stone-200 rounded-lg flex items-center justify-center text-xs text-stone-400">
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
        className="block w-full aspect-square bg-stone-50 border border-stone-200 rounded-lg overflow-hidden relative"
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

// Per-row "Estimated unlicensed market" = USD unit price × quantity. Uses the
// server-converted `price_value_usd` so every row reads in one currency (USD),
// regardless of the listing's native currency. Returns null when no price.
function estimatedMarket(
  f: IpReviewFinding,
): { value: number; currency: string } | null {
  // Coerce: Postgres NUMERIC arrives as a string when not cast to float8.
  const price = f.price_value_usd == null ? null : Number(f.price_value_usd);
  if (price == null || !Number.isFinite(price) || price <= 0) return null;
  const qty = f.quantity_available && f.quantity_available > 0
    ? f.quantity_available
    : QTY_FALLBACK;
  return { value: price * qty, currency: "USD" };
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

/** Table cells (columns 2-9) for one finding. The enclosing <tr> owns the
 *  click-to-expand + selection styling. Columns:
 *  rate · image · description · seller · platform · status · price · days.
 *  Seller/platform/status/price progressively hide on narrower viewports;
 *  seller·platform then fold into the description cell's secondary line. */
function FindingRow({
  f,
  expanded,
  showIp,
}: {
  f: IpReviewFinding;
  expanded: boolean;
  showIp?: boolean;
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
  // Show the USD-normalized price so the Price column reads monotonically when
  // sorted (the sort key is USD across mixed currencies). Native price + est.
  // market live in the tooltip.
  const priceUsd =
    f.price_value_usd != null ? formatMoney(Number(f.price_value_usd), "USD") : null;
  const priceText = priceUsd ?? f.price ?? null;

  return (
    <>
      {/* Rate — caret + colored priority pill. */}
      <td className="py-2 px-2 align-middle whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5">
          <span
            className={`text-stone-400 text-xs transition-transform ${expanded ? "rotate-90" : ""}`}
            aria-hidden
          >
            ▸
          </span>
          <span
            className={`text-[11px] font-bold tabular-nums rounded px-1.5 py-0.5 ${priorityBg}`}
            title="Enforcement priority"
          >
            {f.enforcement_priority.toFixed(2)}
          </span>
        </span>
      </td>

      {/* Image. */}
      <td className="py-2 px-2 align-middle">
        {thumb ? (
          <img
            src={thumb}
            alt=""
            className="w-9 h-9 rounded object-cover border border-stone-200"
          />
        ) : (
          <div className="w-9 h-9 rounded bg-stone-100" />
        )}
      </td>

      {/* Description — title + IP chip; folds seller·platform in on small screens. */}
      <td className="py-2 px-2 align-middle max-w-0 w-full">
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
        <div className="md:hidden text-[11px] text-stone-500 truncate">
          <span className="font-medium">{sellerLine}</span>
          <span className="mx-1.5 text-stone-300">·</span>
          <span>{f.domain}</span>
        </div>
      </td>

      {/* Seller. */}
      <td className="hidden md:table-cell py-2 px-2 align-middle max-w-[10rem] truncate text-[12px] text-stone-600">
        {sellerLine}
      </td>

      {/* Platform. */}
      <td className="hidden lg:table-cell py-2 px-2 align-middle whitespace-nowrap text-[12px] text-stone-600">
        {f.domain}
      </td>

      {/* Status. */}
      <td className="hidden sm:table-cell py-2 px-2 align-middle">
        <span
          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${sb.cls}`}
        >
          {sb.label}
        </span>
      </td>

      {/* Price — listing price; tooltip carries the estimated unlicensed market. */}
      <td
        className="hidden md:table-cell py-2 px-2 align-middle text-right whitespace-nowrap text-[12px] font-semibold tabular-nums text-stone-800"
        title={
          [
            f.price ? `Listed ${f.price}` : null,
            market
              ? `Est. market ${formatMoney(market.value, market.currency)} (unit × qty ${f.quantity_available && f.quantity_available > 0 ? f.quantity_available : QTY_FALLBACK})`
              : null,
          ]
            .filter(Boolean)
            .join(" · ") || "No structured price yet"
        }
      >
        {priceText ?? <span className="text-stone-300">—</span>}
      </td>

      {/* Days — found relative; tooltip carries last-checked. */}
      <td
        className="py-2 px-2 align-middle text-right whitespace-nowrap text-[11px] text-stone-500 tabular-nums"
        title={updatedAgo ? `Updated ${updatedAgo}` : undefined}
      >
        {foundAgo}
      </td>
    </>
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

      {/* Two-column body: images on the left (fills a bounded column), all the
          enrichment data on the right. Collapses to a single column below lg. */}
      <div className="grid lg:grid-cols-[minmax(320px,42%)_1fr] gap-x-6 gap-y-4 items-start">
        {/* LEFT — single image carousel. Page screenshot is the first slide
            when captured; product photos follow (best-matched marked). */}
        <div className="lg:sticky lg:top-4">
          <ListingCarousel f={f} />
        </div>

        {/* RIGHT — enrichment data, packed tighter than the old stacked layout. */}
        <div className="space-y-3 min-w-0">
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
        <h3 className="text-base font-bold text-stone-900 leading-snug">{f.listing_title}</h3>
      )}

      <div className="flex items-center gap-2 flex-wrap text-[11px]">
        {(f.price_value_usd != null || f.price) && (
          <span className="px-1.5 py-0.5 rounded bg-stone-900 text-white font-semibold">
            {f.price_value_usd != null ? formatMoney(Number(f.price_value_usd), "USD") : f.price}
            {f.price_value_usd != null && f.price && (
              <span className="ml-1 font-normal text-stone-400">({f.price})</span>
            )}
          </span>
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
      </div>

      {/* Takedown thread + discussion — inlined here so the email flow, reply
          thread, and case comments live with the finding instead of on a separate
          case page. Triage sends the first takedown straight from the row header
          (Send takedown); this panel surfaces the thread once a request exists.
          Comments show whenever a case exists. */}
      {f.case_id && (
        <div className="border-t border-stone-200 pt-4 space-y-5">
          {["takedown_sent", "enforced"].includes(
            (f.dismissed_at ? "dismissed" : f.review_status) ?? "",
          ) && (
            <TakedownPanel
              caseId={f.case_id}
              ipId={f.ip_id}
              platform={f.domain}
              compact
              onStatusChange={onUpdated}
            />
          )}
          <CaseComments caseId={f.case_id} compact />
        </div>
      )}
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
  const [composing, setComposing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [directSending, setDirectSending] = useState(false);
  const [sendErr, setSendErr] = useState("");

  // Quick path from the confirm dialog: send the pre-filled draft for the
  // suggested route without opening the editor. Falls back to the editor when
  // there's no route/draft to auto-send.
  async function sendDirect() {
    if (!f.case_id) return;
    setDirectSending(true);
    setSendErr("");
    try {
      const r = await autoSendTakedown(f.case_id);
      if (r.status === "unconfigured") {
        setSendErr("Email isn't configured yet — contact your administrator.");
        return;
      }
      if (r.status === "needs_compose") {
        setConfirming(false);
        setComposing(true);
        return;
      }
      setConfirming(false);
      onUpdated();
    } catch (e) {
      setSendErr(e instanceof Error ? e.message : String(e));
    } finally {
      setDirectSending(false);
    }
  }

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
  const emerald = `${primaryCls} bg-emerald-600 text-white hover:bg-emerald-500`;
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
    // Triage decision: send the first takedown (auto-advances to takedown_sent)
    // or dismiss — no separate "confirm" step. License is the fast-path for a
    // recognised seller. The send is blocked (with a tooltip) until the IP has
    // a takedown signer (signer_ready) — set it on the IP's page.
    const signerReady = f.signer_ready ?? true;
    buttons = (
      <>
        <button
          type="button"
          disabled={!f.case_id || !signerReady}
          title={
            !f.case_id
              ? "Still preparing this case…"
              : !signerReady
                ? "Add this IP's takedown signer (on the IP's page) before sending"
                : undefined
          }
          onClick={() => {
            setSendErr("");
            setConfirming(true);
          }}
          className={blue}
        >
          Send takedown
        </button>
        {licenseBtn}
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
      {confirming && f.case_id && (
        <ConfirmSendModal
          platform={f.domain}
          sending={directSending}
          error={sendErr}
          onSend={sendDirect}
          onEdit={() => {
            setConfirming(false);
            setComposing(true);
          }}
          onCancel={() => {
            if (directSending) return;
            setConfirming(false);
            setSendErr("");
          }}
        />
      )}
      {composing && f.case_id && (
        <ComposeModal
          caseId={f.case_id}
          ipId={f.ip_id}
          onClose={() => setComposing(false)}
          onSent={() => {
            setComposing(false);
            onUpdated(); // case flips to takedown_sent; board refresh re-renders the row
          }}
        />
      )}
    </div>
  );
}
