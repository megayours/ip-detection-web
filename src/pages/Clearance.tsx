import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import ClearanceBrands from "./ClearanceBrands";
import ClearanceVisual from "./ClearanceVisual";

/**
 * Clearance — unified pre-screen for IP conflicts. Two modes:
 *
 *   • Brands       → registered trademarks in this tenant's account.
 *   • Visual Match → WIPO designs + Giantbomb pop-culture in one query.
 *
 * Mode is URL-driven (?mode=brands|visual) so links and refreshes preserve
 * intent. Legacy ?mode=designs and ?mode=pop redirect to ?mode=visual.
 */
type Mode = "brands" | "visual";

const MODE_COPY: Record<Mode, { title: string; subtitle: string }> = {
  brands: {
    title: "Brands",
    subtitle: "Pre-screen images against registered trademarks",
  },
  visual: {
    title: "Visual Match",
    subtitle: "Search WIPO designs and Giantbomb pop-culture catalogs for visually similar entries",
  },
};

export default function Clearance() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("mode");

  // Legacy redirect: ?mode=designs or ?mode=pop → ?mode=visual.
  // Keeps shareable links from old tabs working without a server-side rule.
  useEffect(() => {
    if (raw === "designs" || raw === "pop") {
      const next = new URLSearchParams(params);
      next.set("mode", "visual");
      next.delete("type");      // drop legacy entity_type filter
      setParams(next, { replace: true });
    }
  }, [raw, params, setParams]);

  const mode: Mode = raw === "visual" ? "visual" : "brands";

  function setMode(next: Mode) {
    if (next === mode) return;
    const p = new URLSearchParams(params);
    if (next === "brands") p.delete("mode");
    else p.set("mode", next);
    setParams(p, { replace: false });
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight">Clearance</h1>
        <p className="text-xs text-stone-400 mt-0.5">{MODE_COPY[mode].subtitle}</p>
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
            {MODE_COPY[m].title}
          </button>
        ))}
      </div>

      {/* Both modes stay mounted across tab switches so an in-flight job keeps
          polling and the uploaded file / preview survives a mode toggle. */}
      <div className={mode === "brands" ? "" : "hidden"}>
        <ClearanceBrands />
      </div>
      <div className={mode === "visual" ? "" : "hidden"}>
        <ClearanceVisual />
      </div>
    </div>
  );
}
