import { useSearchParams } from "react-router-dom";
import ClearanceBrands from "./ClearanceBrands";
import ClearanceDesigns from "./ClearanceDesigns";
import ClearancePopCulture from "./ClearancePopCulture";
import ClearanceScanAll from "./ClearanceScanAll";

/**
 * Clearance — unified pre-screen for IP conflicts. Modes share the same
 * shape (upload → results) but query different catalogs:
 *
 *   • Scan All           → fans out to brands + designs + pop in parallel.
 *   • Brands             → registered trademarks in this tenant's account.
 *   • Industrial Designs → WIPO Global Design Database (registered designs).
 *   • Pop Culture        → Giantbomb characters / concepts / games / ...
 *
 * Mode is URL-driven (?mode=all|brands|designs|pop) so links and refreshes
 * preserve intent. The legacy /design-match path keeps redirecting into
 * ?mode=designs.
 */
type Mode = "all" | "brands" | "designs" | "pop";

const MODE_COPY: Record<Mode, { title: string; subtitle: string }> = {
  all: {
    title: "Scan All",
    subtitle: "Search brands, industrial designs, and pop culture catalogs in one upload",
  },
  brands: {
    title: "Brands",
    subtitle: "Pre-screen images against registered trademarks",
  },
  designs: {
    title: "Industrial Designs",
    subtitle: "Search the WIPO Global Design Database for visually similar registered designs",
  },
  pop: {
    title: "Pop Culture",
    subtitle: "Search the Giantbomb catalog (characters, concepts, games, …) for visually similar entries",
  },
};

export default function Clearance() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("mode");
  const mode: Mode =
    raw === "all" ? "all"
      : raw === "designs" ? "designs"
      : raw === "pop" ? "pop"
      : "brands";

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
        {(["all", "brands", "designs", "pop"] as const).map((m) => (
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

      {/* All modes stay mounted across tab switches so an in-flight job
          keeps polling and the uploaded file / preview survive a mode toggle.
          We just hide the inactive ones with CSS instead of unmounting. */}
      <div className={mode === "all" ? "" : "hidden"}>
        <ClearanceScanAll />
      </div>
      <div className={mode === "brands" ? "" : "hidden"}>
        <ClearanceBrands />
      </div>
      <div className={mode === "designs" ? "" : "hidden"}>
        <ClearanceDesigns />
      </div>
      <div className={mode === "pop" ? "" : "hidden"}>
        <ClearancePopCulture />
      </div>
    </div>
  );
}
