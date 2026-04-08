import { useState, useEffect } from "react";
import { listReviewQueue, postReview, type ReviewQueueItem, type Verdict } from "../api";
import { ruleDisplayName } from "../lib/labels";

const VERDICT_BADGE: Record<Verdict | "pending", { label: string; bg: string; color: string }> = {
  pass:         { label: "Approved",          bg: "#c6f6d5", color: "#0a3a1e" },
  pass_w_note:  { label: "Approved w/ notes", bg: "#fff3bf", color: "#5b3a00" },
  fail:         { label: "Not approved",      bg: "#fed7d7", color: "#5a0d12" },
  fail_hard:    { label: "Rejected",          bg: "#9b1c1c", color: "#ffffff" },
  pending:      { label: "Reviewing",         bg: "#bee3f8", color: "#1a365d" },
};

export default function ReviewQueue() {
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState<string | null>(null);

  async function load() {
    try {
      const { submissions } = await listReviewQueue();
      setItems(submissions);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAction(submissionId: string, action: "override_to_pass" | "uphold_fail") {
    setActing(submissionId);
    try {
      await postReview(submissionId, action);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActing(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 flex justify-center">
        <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Review queue</h1>
        <p className="mt-1 text-sm text-slate-500">
          Submissions licensees have flagged for manual review. Override or uphold the auto-verdict.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-5 py-4">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
            <span className="text-2xl">&#x2709;</span>
          </div>
          <p className="text-slate-500 text-sm">No submissions awaiting review.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => {
            const badge = VERDICT_BADGE[(item.verdict ?? "pending") as Verdict | "pending"];
            const failedRules = (item.primitive_results?.rule_results ?? [])
              .filter((rr) => rr.state === "fail")
              .map((rr) => ruleDisplayName(rr));
            return (
              <li
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-amber-400 p-5 flex gap-5 items-start"
              >
                <img
                  src={item.image_url}
                  alt="submission"
                  className="w-32 h-32 object-cover rounded-xl border border-slate-200 flex-shrink-0"
                />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-bold text-slate-900">
                      {item.trademark?.name ?? "(unknown)"}
                    </h3>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: badge.bg, color: badge.color }}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">submitted {new Date(item.created_at).toLocaleString()}</div>
                  {item.submitter_email && (
                    <div className="text-xs text-slate-500">from {item.submitter_email}</div>
                  )}
                  {item.submitter_note && (
                    <div className="text-xs text-slate-500 italic">"{item.submitter_note}"</div>
                  )}
                  {failedRules.length > 0 && (
                    <div className="text-xs text-red-600 font-semibold">
                      Did not pass: {failedRules.join(", ")}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleAction(item.id, "override_to_pass")}
                    disabled={acting === item.id}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-semibold hover:bg-emerald-600 transition-all disabled:opacity-50"
                  >
                    Override → pass
                  </button>
                  <button
                    onClick={() => handleAction(item.id, "uphold_fail")}
                    disabled={acting === item.id}
                    className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-semibold hover:bg-red-600 transition-all disabled:opacity-50"
                  >
                    Uphold
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
