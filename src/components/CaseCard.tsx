import { Link } from "react-router-dom";
import type { Case } from "../api";

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label: "Pending review", bg: "bg-red-50",   color: "text-red-700" },
  confirmed: { label: "Confirmed",      bg: "bg-red-50",     color: "text-red-700" },
  dismissed: { label: "Dismissed",      bg: "bg-stone-50",   color: "text-stone-500" },
};

export default function CaseCard({ c }: { c: Case }) {
  const badge = STATUS_BADGE[c.review_status] ?? STATUS_BADGE.pending;
  const scorePct = Math.round(c.score * 100);
  const isComplete = c.pipeline_stage === "complete";

  let host: string | null = null;
  if (c.source_url) {
    try {
      host = new URL(c.source_url).hostname.replace(/^www\./, "");
    } catch {
      host = c.source_url;
    }
  }

  return (
    <Link
      to={`/cases/${c.id}`}
      className="group bg-white rounded-2xl border border-stone-200 hover:border-stone-300 hover:shadow-lg hover:shadow-stone-100 transition-all overflow-hidden block"
    >
      <div className="flex">
        <div className="shrink-0 w-32 h-32 sm:w-40 sm:h-40 bg-stone-100">
          {c.image_url && (
            <img
              src={c.image_url}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="flex-1 min-w-0 p-4 sm:p-5 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Suspected match
              </div>
              <div className="font-bold text-stone-900 group-hover:text-red-700 transition-colors truncate">
                {c.trademark?.name ?? "Unknown IP"}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-2xl font-black text-stone-900 leading-none">{scorePct}%</div>
              <div className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mt-0.5">
                Match score
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.bg} ${badge.color}`}>
              {badge.label}
            </span>
            {!isComplete && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Pipeline · {c.pipeline_stage}
              </span>
            )}
            {host && (
              <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full truncate max-w-[180px]">
                {host}
              </span>
            )}
          </div>
          <div className="text-xs text-stone-400">
            {new Date(c.created_at).toLocaleString()}
          </div>
        </div>
      </div>
    </Link>
  );
}
