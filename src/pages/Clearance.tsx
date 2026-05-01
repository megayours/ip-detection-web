import { useSearchParams } from "react-router-dom";
import ClearanceBrands from "./ClearanceBrands";
import ClearanceDesigns from "./ClearanceDesigns";

/**
 * Clearance — unified pre-screen for IP conflicts. Two modes share the
 * same shape (upload → results) but query different catalogs:
 *
 *   • Detect Brands       → registered trademarks in this tenant's account.
 *   • Detect Similar Designs → WIPO Global Design Database (industrial designs).
 *
 * Mode is URL-driven (?mode=brands|designs) so links and refreshes preserve
 * intent, and the legacy /design-match route can redirect into ?mode=designs
 * without breaking deep links.
 */
type Mode = "brands" | "designs";

const MODE_COPY: Record<Mode, { title: string; subtitle: string }> = {
  brands: {
    title: "Detect Brands",
    subtitle: "Pre-screen images against known brands",
  },
  designs: {
    title: "Detect Similar Designs",
    subtitle: "Search the WIPO Global Design Database for visually similar registered designs",
  },
};

export default function Clearance() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("mode");
  const mode: Mode = raw === "designs" ? "designs" : "brands";

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
        {(["brands", "designs"] as const).map((m) => (
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

      {/* Both modes stay mounted across tab switches so an in-flight job
          keeps polling and the uploaded file / preview survive a mode toggle.
          We just hide the inactive one with CSS instead of unmounting. */}
      <div className={mode === "brands" ? "" : "hidden"}>
        <ClearanceBrands />
      </div>
      <div className={mode === "designs" ? "" : "hidden"}>
        <ClearanceDesigns />
      </div>
    </div>
  );
}
