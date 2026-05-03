import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ImageUploader from "../components/ImageUploader";
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

function nFmt(n: number) {
  return n.toLocaleString();
}

function MatchCard({ m }: { m: GiantbombMatch }) {
  const pct = Math.round(m.score * 100);
  return (
    <a
      href={m.source_url || undefined}
      target={m.source_url ? "_blank" : undefined}
      rel={m.source_url ? "noopener noreferrer" : undefined}
      className="block border border-stone-200 rounded-xl bg-white p-3 hover:border-stone-300 hover:shadow-sm transition-all"
    >
      <div className="flex gap-3">
        <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-stone-100 flex items-center justify-center">
          {m.preview_url ? (
            <img src={m.preview_url} alt={m.name} className="w-full h-full object-contain" />
          ) : (
            <span className="text-stone-300 text-xs">no image</span>
          )}
        </div>
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
  // Live counts from the API, keyed by entity_type. Empty until the initial
  // /categories call resolves, after which the chip row reflects reality.
  const [counts, setCounts] = useState<Record<string, number>>({});
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Fetch indexed categories once on mount. Cheap and idempotent — the worker
  // refreshes its catalog cache every 10 min anyway, so the UI being slightly
  // out-of-date is fine. Any unknown entity_types from the API are appended
  // to the chip row using the raw value as label.
  useEffect(() => {
    let active = true;
    getGiantbombCategories()
      .then((r) => {
        if (!active) return;
        const m: Record<string, number> = {};
        for (const c of r.categories) m[c.entity_type] = c.count;
        setCounts(m);
        // Auto-select the first available category if the default ('concept')
        // isn't indexed yet — avoids a confusing "no results" state on first load.
        if (!(category in m)) {
          const first = KNOWN_CATEGORIES.find((c) => c.value in m);
          if (first) setCategory(first.value);
          else if (r.categories.length > 0) setCategory(r.categories[0].entity_type as GiantbombEntityType);
        }
      })
      .catch(() => {
        // Silent — the chips will just stay disabled and the user can't submit,
        // which is the correct fail-closed behaviour.
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
      {/* Category chips — availability + counts come from the API on mount.
          Anything the API returns that's not in KNOWN_CATEGORIES is appended
          at the end so new entity types light up without a frontend deploy. */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(() => {
          const knownValues = new Set(KNOWN_CATEGORIES.map((c) => c.value));
          const unknownTypes = Object.keys(counts).filter((t) => !knownValues.has(t as GiantbombEntityType));
          const ordered = [
            ...KNOWN_CATEGORIES.map((c) => ({ ...c, count: counts[c.value] ?? 0 })),
            ...unknownTypes.map((t) => ({ value: t as GiantbombEntityType, label: t, count: counts[t] })),
          ];
          return ordered.map((c) => {
            const available = c.count > 0;
            const isActive = category === c.value;
            return (
              <button
                key={c.value}
                disabled={!available}
                onClick={() => available && setCategory(c.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  isActive
                    ? "bg-stone-900 text-white border-stone-900"
                    : available
                    ? "bg-white text-stone-700 border-stone-200 hover:border-stone-400"
                    : "bg-stone-50 text-stone-300 border-stone-100 cursor-not-allowed"
                }`}
                title={available ? `${nFmt(c.count)} indexed` : "No indexed images yet"}
              >
                {c.label}
                {available ? (
                  <span className={`ml-1.5 text-[10px] tabular-nums ${isActive ? "text-white/70" : "text-stone-400"}`}>
                    {nFmt(c.count)}
                  </span>
                ) : (
                  <span className="ml-1 text-[9px]">soon</span>
                )}
              </button>
            );
          });
        })()}
      </div>

      {file && (
        <div className="flex items-center justify-between mb-3 gap-3">
          {preview && (
            <div className="flex items-center gap-2 px-2 py-1.5 bg-stone-50 border border-stone-200 rounded-lg">
              <img src={preview} alt="Your upload" className="w-10 h-10 object-contain rounded" />
              <span className="text-xs text-stone-500">Your upload</span>
            </div>
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
                  <MatchCard key={m.entity_id} m={m} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
