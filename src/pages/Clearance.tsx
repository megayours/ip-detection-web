import { useEffect } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { type IpReview } from "../api";
import ClearanceBrands from "./ClearanceBrands";
import ClearanceVisual from "./ClearanceVisual";

/**
 * `/clearance` is now a thin route that only handles the legacy fast-check
 * tools via `?mode=brands|visual`. Without a mode it redirects to the
 * canonical `/clearance/tasks` board.
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

  return <Navigate to="/clearance/tasks" replace />;
}

const DECISION_LABEL: Record<string, { label: string; cls: string }> = {
  cleared: { label: "Cleared", cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  not_cleared: { label: "Not cleared", cls: "bg-red-50 text-red-700 border-red-100" },
};

/**
 * Compact single-line task row, Gmail/Linear-inspired. Borders come from
 * the parent's `divide-y` so rows pack tightly without doubling lines.
 */
export function TaskRow({ review, muted = false }: { review: IpReview; muted?: boolean }) {
  const primary = primarySignal(review);
  const when = relativeDate(review.created_at);
  return (
    <Link
      to={`/ip-reviews/${review.id}`}
      className={`group flex items-center gap-3 px-2 py-1.5 hover:bg-stone-50 transition-colors ${
        muted ? "opacity-70" : ""
      }`}
    >
      {review.asset_image_url ? (
        <img
          src={review.asset_image_url}
          alt=""
          className="w-8 h-8 rounded object-cover border border-stone-200 shrink-0"
        />
      ) : (
        <div className="w-8 h-8 rounded bg-stone-100 shrink-0" />
      )}
      <span
        className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 shrink-0 w-20"
        title={review.mode}
      >
        {review.mode === "monitoring" ? "Monitor" : "Clearance"}
      </span>
      <span className="flex-1 min-w-0 text-sm text-stone-900 font-medium truncate">
        {review.title}
      </span>
      <span
        className={`hidden sm:inline-block px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase whitespace-nowrap shrink-0 ${primary.cls}`}
      >
        {primary.label}
      </span>
      <span className="text-[11px] text-stone-400 tabular-nums shrink-0 w-14 text-right">
        {when}
      </span>
    </Link>
  );
}

function primarySignal(r: IpReview): { label: string; cls: string } {
  if (r.status === "processing") {
    return { label: "Processing", cls: "bg-blue-50 text-blue-700 border-blue-100" };
  }
  if (r.status === "failed") {
    return { label: "Failed", cls: "bg-red-50 text-red-700 border-red-100" };
  }
  if (r.mode === "monitoring") {
    const n = r.open_findings_count ?? 0;
    if (n === 0) return { label: "0 findings", cls: "bg-stone-50 text-stone-500 border-stone-100" };
    return { label: `${n} finding${n === 1 ? "" : "s"}`, cls: "bg-red-50 text-red-700 border-red-100" };
  }
  // clearance
  if (r.decision) {
    return DECISION_LABEL[r.decision] ?? { label: r.decision, cls: "bg-stone-50 text-stone-600 border-stone-100" };
  }
  return { label: "Awaiting review", cls: "bg-stone-50 text-stone-600 border-stone-100" };
}

/** Linear-style short relative time: "5m", "3h", "2d", "Mar 14". */
function relativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
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
