import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ImageUploader from "../components/ImageUploader";
import Lightbox from "../components/Lightbox";
import {
  submitGiantbombMatch,
  getGiantbombMatchResult,
  getGiantbombCategories,
  type GiantbombEntityType,
  type GiantbombMatch,
  type GiantbombMatchResult,
} from "../api";

/**
 * Pop Culture — visual similarity search against the Giantbomb catalog.
 *
 * Category chips drive a per-`entity_type` search so the catalog's
 * heterogeneity doesn't blur results across categories. Availability is
 * driven by /api/giantbomb-match/categories at mount, so when the upstream
 * R2 upload pipeline lands more entity types they light up automatically
 * without a frontend deploy.
 */

// Display order + labels for known entity types. Anything the API returns
// outside this list still renders, just at the bottom and using the raw
// entity_type as label.
const KNOWN_CATEGORIES: { value: GiantbombEntityType; label: string }[] = [
  { value: "concept",   label: "Concepts" },
  { value: "character", label: "Characters" },
  { value: "game",      label: "Games" },
  { value: "franchise", label: "Franchises" },
  { value: "thing",     label: "Things" },
  { value: "person",    label: "Persons" },
  { value: "location",  label: "Locations" },
];

function MatchCard({ m, onZoom }: { m: GiantbombMatch; onZoom: (src: string, caption: string) => void }) {
  const pct = Math.round(m.score * 100);
  return (
    <a
      href={m.source_url || undefined}
      target={m.source_url ? "_blank" : undefined}
      rel={m.source_url ? "noopener noreferrer" : undefined}
      className="block border border-stone-200 rounded-xl bg-white p-3 hover:border-stone-300 hover:shadow-sm transition-all"
    >
      <div className="flex gap-3">
        {m.preview_url ? (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onZoom(m.preview_url!, m.name); }}
            className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-stone-100 flex items-center justify-center cursor-zoom-in"
            aria-label={`View ${m.name} larger`}
          >
            <img src={m.preview_url} alt={m.name} className="w-full h-full object-contain" />
          </button>
        ) : (
          <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-stone-100 flex items-center justify-center">
            <span className="text-stone-300 text-xs">no image</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h4 className="font-semibold text-sm text-stone-900 truncate">{m.name}</h4>
          </div>
          {m.summary && (
            <p className="text-xs text-stone-500 mt-1 line-clamp-2">{m.summary}</p>
          )}
          <div className="mt-2 flex items-center gap-2 text-[11px]">
            <span className="font-mono tabular-nums text-stone-700">{pct}%</span>
            {typeof m.inliers === "number" && m.inliers >= 2 && (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                ★ verified
              </span>
            )}
            {m.vlm_verdict === "present" && (
              <span className="px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                VLM ✓
              </span>
            )}
          </div>
        </div>
      </div>
    </a>
  );
}

export default function ClearancePopCulture() {
  const [category, setCategory] = useState<GiantbombEntityType>("concept");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<GiantbombMatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState<{ src: string; caption: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Fetch indexed categories once on mount to pick a sensible default — if the
  // built-in default ("concept") isn't indexed yet, fall back to the first
  // available KNOWN_CATEGORIES entry, then anything else the API returns.
  useEffect(() => {
    let active = true;
    getGiantbombCategories()
      .then((r) => {
        if (!active) return;
        const m: Record<string, number> = {};
        for (const c of r.categories) m[c.entity_type] = c.count;
        if (!(category in m)) {
          const first = KNOWN_CATEGORIES.find((c) => c.value in m);
          if (first) setCategory(first.value);
          else if (r.categories.length > 0) setCategory(r.categories[0].entity_type as GiantbombEntityType);
        }
      })
      .catch(() => {
        // Silent — submission will fail cleanly if no category is available.
      });
    return () => { active = false; };
    // Intentionally only on mount — re-fetching on every chip click would be wasteful.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!jobId) return;
    let active = true;
    async function poll() {
      try {
        const r = await getGiantbombMatchResult(jobId!);
        if (!active) return;
        setResult(r);
        if (r.status === "complete" || r.status === "failed") {
          clearInterval(timerRef.current);
          if (r.status === "failed") setError(r.error || "Analysis failed");
        }
      } catch {
        // ignore poll errors
      }
    }
    poll();
    timerRef.current = setInterval(poll, 1500);
    return () => { active = false; clearInterval(timerRef.current); };
  }, [jobId]);

  async function handleUpload(files: File[]) {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
    setResult(null);
    try {
      const { job_id } = await submitGiantbombMatch(f, { entityType: category });
      setJobId(job_id);
    } catch (e: any) {
      setError(e.message);
    }
  }

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setJobId(null);
    setResult(null);
    setError(null);
    clearInterval(timerRef.current);
  }

  const isProcessing = !!jobId && (!result || result.status === "pending");
  const isDone = result?.status === "complete";
  const matches = result?.matches ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-3">
        <Link
          to="/clearance/pop/catalog"
          className="text-xs font-medium text-stone-500 hover:text-stone-900 inline-flex items-center gap-1"
        >
          Browse all indexed pop-culture entries
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      </div>
      {file && (
        <div className="flex items-center justify-between mb-3 gap-3">
          {preview && (
            <button
              type="button"
              onClick={() => setZoomed({ src: preview, caption: "Your upload" })}
              className="flex items-center gap-2 px-2 py-1.5 bg-stone-50 border border-stone-200 rounded-lg hover:border-stone-400 cursor-zoom-in transition-colors"
              aria-label="View your upload larger"
            >
              <img src={preview} alt="Your upload" className="w-10 h-10 object-contain rounded" />
              <span className="text-xs text-stone-500">Your upload</span>
            </button>
          )}
          <button
            onClick={reset}
            className="px-3 py-1 text-xs font-medium border border-stone-200 rounded-full hover:bg-stone-50 transition-colors"
          >
            Check another
          </button>
        </div>
      )}

      {!file && (
        <ImageUploader
          onUpload={handleUpload}
          multiple={false}
          label={`Drop an image to find similar ${KNOWN_CATEGORIES.find((c) => c.value === category)?.label.toLowerCase() || category}`}
        />
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {isProcessing && (
        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-stone-500">Analyzing...</p>
        </div>
      )}

      {isDone && (
        <div className="space-y-4 mt-4">
          {matches.length === 0 ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
              No similar entries found in the {category} catalog.
            </div>
          ) : (
            <>
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-700">
                {matches.length} similar {matches.length === 1 ? "entry" : "entries"} in the {category} catalog
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {matches.map((m) => (
                  <MatchCard key={m.entity_id} m={m} onZoom={(src, caption) => setZoomed({ src, caption })} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {zoomed && (
        <Lightbox
          src={zoomed.src}
          alt={zoomed.caption}
          caption={zoomed.caption}
          onClose={() => setZoomed(null)}
        />
      )}
    </div>
  );
}
