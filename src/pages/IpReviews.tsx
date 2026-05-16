import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { listIpReviews, type IpReview, type IpReviewMode } from "../api";

/**
 * List of the tenant's guided IP reviews. URL-driven mode tabs so a
 * "back to my monitoring reviews" link works on refresh.
 */
type Tab = "all" | IpReviewMode;

export default function IpReviews() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = (() => {
    const raw = params.get("mode");
    return raw === "clearance" || raw === "monitoring" ? raw : "all";
  })();

  const [reviews, setReviews] = useState<IpReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await listIpReviews();
        if (active) setReviews(r.reviews);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(
    () => (tab === "all" ? reviews : reviews.filter((r) => r.mode === tab)),
    [reviews, tab]
  );
  const counts = useMemo(() => ({
    all: reviews.length,
    clearance: reviews.filter((r) => r.mode === "clearance").length,
    monitoring: reviews.filter((r) => r.mode === "monitoring").length,
  }), [reviews]);

  function setTab(next: Tab) {
    const p = new URLSearchParams(params);
    if (next === "all") p.delete("mode");
    else p.set("mode", next);
    setParams(p, { replace: false });
  }

  const newHref = tab === "monitoring" ? "/ip-reviews/new/monitoring" : "/ip-reviews/new";

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">IP reviews</h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Saved clearance + monitoring reviews. Decisions and findings live
            here.
          </p>
        </div>
        <Link
          to={newHref}
          className="px-4 py-2 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800"
        >
          {tab === "monitoring" ? "New monitoring review" : "New clearance review"}
        </Link>
      </div>

      <div className="mb-6 inline-flex p-1 bg-stone-100 rounded-full">
        {(["all", "clearance", "monitoring"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
              tab === t
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            {t === "all" ? "All" : t === "clearance" ? "Clearance" : "Monitoring"}
            <span className="ml-1.5 text-[11px] text-stone-400">{counts[t]}</span>
          </button>
        ))}
      </div>

      {loading && <div className="text-sm text-stone-400">Loading…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
      {!loading && filtered.length === 0 && (
        <div className="rounded-2xl border border-stone-200 bg-stone-50/40 p-8 text-center">
          <p className="text-sm text-stone-600">
            {tab === "all"
              ? "No reviews yet."
              : tab === "monitoring"
                ? "No monitoring reviews yet."
                : "No clearance reviews yet."}
          </p>
          <Link
            to={newHref}
            className="inline-block mt-3 px-4 py-2 rounded-lg bg-stone-900 text-white text-xs font-semibold"
          >
            Start one now
          </Link>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((r) => <ReviewRow key={r.id} review={r} />)}
        </div>
      )}
    </div>
  );
}

const DECISION_LABEL: Record<string, { label: string; cls: string }> = {
  approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-700" },
  approved_with_note: { label: "Approved (note)", cls: "bg-emerald-100 text-emerald-700" },
  needs_edit: { label: "Needs edit", cls: "bg-amber-100 text-amber-700" },
  needs_license: { label: "Needs license", cls: "bg-amber-100 text-amber-700" },
  escalate: { label: "Escalate", cls: "bg-red-100 text-red-700" },
  do_not_use: { label: "Do not use", cls: "bg-red-100 text-red-700" },
  monitor: { label: "Monitor", cls: "bg-blue-100 text-blue-700" },
};

function ReviewRow({ review }: { review: IpReview }) {
  const decision = review.decision ? DECISION_LABEL[review.decision] : null;
  const subtitle =
    review.mode === "monitoring"
      ? `Monitoring${review.asset_name ? ` · ${review.asset_name}` : ""}`
      : "Clearance";
  return (
    <Link
      to={`/ip-reviews/${review.id}`}
      className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 hover:border-stone-300 transition-colors"
    >
      {review.asset_image_url ? (
        <img
          src={review.asset_image_url}
          alt=""
          className="w-12 h-12 rounded-lg object-cover border border-stone-200"
        />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-stone-100" />
      )}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-stone-900 truncate">{review.title}</div>
        <div className="text-[11px] text-stone-400">
          {subtitle} · {new Date(review.created_at).toLocaleString()}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {decision && (
          <span className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase ${decision.cls}`}>
            {decision.label}
          </span>
        )}
        <span className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase ${
          review.status === "complete" ? "bg-emerald-100 text-emerald-700"
          : review.status === "failed" ? "bg-red-100 text-red-700"
          : "bg-blue-100 text-blue-700"
        }`}>
          {review.status}
        </span>
      </div>
    </Link>
  );
}
