import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { listIpReviews, needsAttention, type IpReview } from "../api";
import ClearanceBrands from "./ClearanceBrands";
import ClearanceVisual from "./ClearanceVisual";

/**
 * IP review hub. Linear-style inbox of clearance + monitoring tasks.
 *
 * Routing notes:
 *   - Quick-action buttons launch the existing wizards (`/ip-reviews/new`,
 *     `/ip-reviews/new/monitoring`); each row deep-links to
 *     `/ip-reviews/:id`.
 *   - Legacy fast-check tools (Brands / Visual Match) are hidden from the
 *     nav but still reachable via `/clearance?mode=brands|visual` so
 *     power users can keep their bookmarks alive.
 */
type LegacyMode = "brands" | "visual";

export default function Clearance() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("mode");

  useEffect(() => {
    if (raw === "designs" || raw === "pop") {
      const next = new URLSearchParams(params);
      next.set("mode", "visual");
      next.delete("type");
      setParams(next, { replace: true });
    }
  }, [raw, params, setParams]);

  const legacyMode: LegacyMode | null =
    raw === "brands" || raw === "visual" ? raw : null;

  if (legacyMode) {
    return <LegacyView mode={legacyMode} setMode={(m) => {
      const p = new URLSearchParams(params);
      p.set("mode", m);
      setParams(p, { replace: false });
    }} clearMode={() => {
      const p = new URLSearchParams(params);
      p.delete("mode");
      setParams(p, { replace: false });
    }} />;
  }

  return <Inbox />;
}

function Inbox() {
  const [reviews, setReviews] = useState<IpReview[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [doneOpen, setDoneOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    listIpReviews({ limit: 200 })
      .then(({ reviews }) => alive && setReviews(reviews))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => alive && setLoaded(true));
    return () => { alive = false; };
  }, []);

  const { needs, done } = useMemo(() => {
    const needs: IpReview[] = [];
    const done: IpReview[] = [];
    for (const r of reviews) {
      if (needsAttention(r)) needs.push(r);
      else done.push(r);
    }
    return { needs, done };
  }, [reviews]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <h1 className="text-xl font-bold tracking-tight">Inbox</h1>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/ip-reviews/new"
            className="px-3 py-1.5 rounded-lg border border-stone-300 text-stone-800 text-xs font-semibold hover:bg-stone-50"
          >
            + Clearance
          </Link>
          <Link
            to="/ip-reviews/new/monitoring"
            className="px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800"
          >
            + Infringement Monitoring
          </Link>
        </div>
      </div>

      {!loaded && (
        <div className="text-sm text-stone-400">Loading…</div>
      )}
      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      {loaded && reviews.length === 0 && (
        <div className="rounded-2xl border border-stone-200 bg-stone-50/40 p-8 text-center">
          <p className="text-sm text-stone-600">Nothing in your inbox.</p>
          <p className="text-xs text-stone-400 mt-1">
            Start a clearance review or set up monitoring to populate this list.
          </p>
        </div>
      )}

      {loaded && reviews.length > 0 && (
        <>
          <Section
            title={`Needs attention (${needs.length})`}
            rows={needs}
            emptyText="You're all caught up."
          />
          {done.length > 0 && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setDoneOpen((v) => !v)}
                className="w-full flex items-center justify-between text-left px-1 py-2 text-xs font-semibold uppercase tracking-wider text-stone-500 hover:text-stone-800"
              >
                <span>
                  {doneOpen ? "▼" : "▶"} Done / no action ({done.length})
                </span>
              </button>
              {doneOpen && (
                <div className="mt-2 space-y-2">
                  {done.map((r) => <TaskRow key={r.id} review={r} muted />)}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Section({
  title,
  rows,
  emptyText,
}: {
  title: string;
  rows: IpReview[];
  emptyText: string;
}) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2 px-1">
        {title}
      </h2>
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-stone-50/40 p-6 text-center text-xs text-stone-500">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => <TaskRow key={r.id} review={r} />)}
        </div>
      )}
    </div>
  );
}

const DECISION_LABEL: Record<string, { label: string; cls: string }> = {
  cleared: { label: "Cleared", cls: "bg-emerald-100 text-emerald-700" },
  not_cleared: { label: "Not cleared", cls: "bg-red-100 text-red-700" },
};

/**
 * Inbox-style row. The right-hand chip is the "primary signal" — the
 * single most important state for that task type — so the user can scan
 * vertically and find the actionable thing without reading the row.
 */
function TaskRow({ review, muted = false }: { review: IpReview; muted?: boolean }) {
  const primary = primarySignal(review);
  const created = new Date(review.created_at).toLocaleDateString();
  return (
    <Link
      to={`/ip-reviews/${review.id}`}
      className={`flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 hover:border-stone-300 transition-colors ${
        muted ? "opacity-70" : ""
      }`}
    >
      {review.asset_image_url ? (
        <img
          src={review.asset_image_url}
          alt=""
          className="w-12 h-12 rounded-lg object-cover border border-stone-200 shrink-0"
        />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-stone-100 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-stone-900 truncate">
          {review.title}
        </div>
        <div className="text-[11px] text-stone-400">
          {review.mode === "monitoring" ? "Monitoring" : "Clearance"}
          {review.mode === "monitoring" && review.asset_name ? ` · ${review.asset_name}` : ""}
          {" · "}{created}
        </div>
      </div>
      <span
        className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase whitespace-nowrap ${primary.cls}`}
      >
        {primary.label}
      </span>
    </Link>
  );
}

function primarySignal(r: IpReview): { label: string; cls: string } {
  if (r.status === "processing") {
    return { label: "Processing", cls: "bg-blue-100 text-blue-700" };
  }
  if (r.status === "failed") {
    return { label: "Failed", cls: "bg-red-100 text-red-700" };
  }
  if (r.mode === "monitoring") {
    const n = r.open_findings_count ?? 0;
    if (n === 0) return { label: "0 findings", cls: "bg-stone-100 text-stone-500" };
    return { label: `${n} finding${n === 1 ? "" : "s"}`, cls: "bg-red-100 text-red-700" };
  }
  // clearance
  if (r.decision) {
    return DECISION_LABEL[r.decision] ?? { label: r.decision, cls: "bg-stone-100 text-stone-600" };
  }
  return { label: "Awaiting review", cls: "bg-stone-100 text-stone-600" };
}

function LegacyView({
  mode,
  setMode,
  clearMode,
}: {
  mode: LegacyMode;
  setMode: (m: LegacyMode) => void;
  clearMode: () => void;
}) {
  const subtitle =
    mode === "brands"
      ? "Pre-screen images against registered trademarks"
      : "Search WIPO designs and Giantbomb pop-culture catalogs";

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-3">
        <button
          onClick={clearMode}
          className="text-[11px] text-stone-500 hover:text-stone-800"
        >
          ← Back to inbox
        </button>
      </div>
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight">
          {mode === "brands" ? "Brands fast check" : "Visual match"}
        </h1>
        <p className="text-xs text-stone-400 mt-0.5">{subtitle}</p>
      </div>

      <div className="mb-6 inline-flex p-1 bg-stone-100 rounded-full">
        {(["brands", "visual"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
              mode === m
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            {m === "brands" ? "Brands" : "Visual Match"}
          </button>
        ))}
      </div>

      <div className={mode === "brands" ? "" : "hidden"}>
        <ClearanceBrands />
      </div>
      <div className={mode === "visual" ? "" : "hidden"}>
        <ClearanceVisual />
      </div>
    </div>
  );
}
