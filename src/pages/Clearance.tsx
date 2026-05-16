import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { listIpReviews, type IpReview } from "../api";
import ClearanceBrands from "./ClearanceBrands";
import ClearanceVisual from "./ClearanceVisual";

/**
 * Clearance hub. Two top-level intents:
 *
 *   • Clearance review (new wedge — guided wizard, legal-grade report)
 *   • Infringement monitoring (coming soon)
 *
 * The legacy fast-check tools (Brands / Visual Match) stay accessible
 * via `?mode=brands|visual` for power users — useful for "I just want
 * to see matches against the EUIPO/Giantbomb catalogs without filling
 * out a wizard."
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

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight">IP review</h1>
        <p className="text-xs text-stone-400 mt-0.5">
          Guided workflows for IP clearance and infringement monitoring.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/ip-reviews/new"
          className="block rounded-2xl border-2 border-stone-300 bg-white p-6 hover:border-stone-900 transition-colors"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
            Clearance
          </div>
          <h2 className="text-base font-bold text-stone-900 mb-1">
            Start a clearance review
          </h2>
          <p className="text-xs text-stone-500 leading-relaxed">
            "Is this asset too close to existing IP?" Guided wizard captures
            asset details, territory, intended use. Output: risk by IP type,
            legal-grade PDF, lawyer decision.
          </p>
        </Link>

        <Link
          to="/ip-reviews/new/monitoring"
          className="block rounded-2xl border-2 border-stone-300 bg-white p-6 hover:border-stone-900 transition-colors"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
            Monitoring
          </div>
          <h2 className="text-base font-bold text-stone-900 mb-1">
            Start infringement monitoring
          </h2>
          <p className="text-xs text-stone-500 leading-relaxed">
            "Where is my IP being misused?" Pick an IP, add platforms to
            scan — scraping kicks off immediately. Output: prioritized
            findings + US DMCA takedown packet.
          </p>
        </Link>
      </div>

      <RecentReviews />

      <div className="mt-8">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
          Power-user tools
        </h3>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/clearance?mode=brands"
            className="px-3 py-1.5 rounded-full text-xs font-medium border border-stone-200 bg-white text-stone-600 hover:border-stone-300"
          >
            Brands fast check
          </Link>
          <Link
            to="/clearance?mode=visual"
            className="px-3 py-1.5 rounded-full text-xs font-medium border border-stone-200 bg-white text-stone-600 hover:border-stone-300"
          >
            Visual match (designs + pop culture)
          </Link>
        </div>
      </div>
    </div>
  );
}

function RecentReviews() {
  const [reviews, setReviews] = useState<IpReview[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    listIpReviews({ limit: 20 })
      .then(({ reviews }) => alive && setReviews(reviews))
      .catch(() => { /* silent */ })
      .finally(() => alive && setLoaded(true));
    return () => { alive = false; };
  }, []);

  const recentClearance = useMemo(
    () => reviews.filter((r) => r.mode === "clearance").slice(0, 4),
    [reviews]
  );
  const recentMonitoring = useMemo(
    () => reviews.filter((r) => r.mode === "monitoring").slice(0, 4),
    [reviews]
  );

  if (!loaded || (recentClearance.length === 0 && recentMonitoring.length === 0)) {
    return null;
  }

  return (
    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
      <RecentColumn
        title="Recent clearance reviews"
        href="/ip-reviews?mode=clearance"
        reviews={recentClearance}
      />
      <RecentColumn
        title="Active monitoring"
        href="/ip-reviews?mode=monitoring"
        reviews={recentMonitoring}
      />
    </div>
  );
}

function RecentColumn({
  title,
  href,
  reviews,
}: {
  title: string;
  href: string;
  reviews: IpReview[];
}) {
  if (reviews.length === 0) return null;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          {title}
        </h3>
        <Link to={href} className="text-[11px] text-stone-500 hover:text-stone-800">
          See all →
        </Link>
      </div>
      <div className="space-y-1.5">
        {reviews.map((r) => (
          <Link
            key={r.id}
            to={`/ip-reviews/${r.id}`}
            className="flex items-center gap-2.5 rounded-lg border border-stone-200 bg-white p-2.5 hover:border-stone-300 transition-colors"
          >
            {r.asset_image_url ? (
              <img
                src={r.asset_image_url}
                alt=""
                className="w-8 h-8 rounded object-cover border border-stone-200"
              />
            ) : (
              <div className="w-8 h-8 rounded bg-stone-100" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-stone-900 truncate">
                {r.title}
              </div>
              <div className="text-[10px] text-stone-400">
                {r.mode === "monitoring" && r.asset_name
                  ? `${r.asset_name} · `
                  : ""}
                {new Date(r.created_at).toLocaleDateString()}
              </div>
            </div>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${
                r.status === "complete"
                  ? "bg-emerald-100 text-emerald-700"
                  : r.status === "failed"
                    ? "bg-red-100 text-red-700"
                    : "bg-blue-100 text-blue-700"
              }`}
            >
              {r.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
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
          ← Back to IP review
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
