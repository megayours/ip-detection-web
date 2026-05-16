import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listIpReviews, type IpReview } from "../api";

/**
 * List of the tenant's guided IP reviews. Sortable client-side by
 * created_at (default) or decision; filter by decision status.
 */
export default function IpReviews() {
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

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">IP reviews</h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Guided clearance reviews — saved, decisioned, exportable.
          </p>
        </div>
        <Link
          to="/ip-reviews/new"
          className="px-4 py-2 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800"
        >
          New review
        </Link>
      </div>

      {loading && <div className="text-sm text-stone-400">Loading…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
      {!loading && reviews.length === 0 && (
        <div className="rounded-2xl border border-stone-200 bg-stone-50/40 p-8 text-center">
          <p className="text-sm text-stone-600">No reviews yet.</p>
          <Link
            to="/ip-reviews/new"
            className="inline-block mt-3 px-4 py-2 rounded-lg bg-stone-900 text-white text-xs font-semibold"
          >
            Start your first clearance review
          </Link>
        </div>
      )}

      {reviews.length > 0 && (
        <div className="space-y-2">
          {reviews.map((r) => <ReviewRow key={r.id} review={r} />)}
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
          {new Date(review.created_at).toLocaleString()}
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
