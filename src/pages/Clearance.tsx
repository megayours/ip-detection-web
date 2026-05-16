import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
          <Link
            to="/ip-reviews"
            className="px-3 py-1.5 rounded-full text-xs font-medium border border-stone-200 bg-white text-stone-600 hover:border-stone-300"
          >
            My reviews
          </Link>
        </div>
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
