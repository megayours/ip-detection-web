import { useState, useEffect, useRef } from "react";
import ImageUploader from "../components/ImageUploader";
import { submitDesignMatch, getDesignMatchResult, fetchDesignCategories, type DesignMatch, type DesignMatchResult, type DesignCategory } from "../api";

/**
 * Group sibling designs (same base registration, different design views)
 * into a single result. EUIPO designs split one filing into N views with
 * suffix -0001, -0002, etc. — to a clearance reviewer they're all the
 * same registered design and should display as one card. Within each
 * group we keep the highest-scoring view as the representative.
 */
type GroupedMatch = DesignMatch & { sibling_count: number; siblings: DesignMatch[] };

function groupByBaseId(matches: DesignMatch[]): GroupedMatch[] {
  const buckets = new Map<string, DesignMatch[]>();
  for (const m of matches) {
    const key = m.base_id || m.registration_id;
    const arr = buckets.get(key) ?? [];
    arr.push(m);
    buckets.set(key, arr);
  }
  const grouped: GroupedMatch[] = [];
  for (const arr of buckets.values()) {
    arr.sort((a, b) => b.score - a.score);
    const best = arr[0];
    grouped.push({ ...best, sibling_count: arr.length, siblings: arr });
  }
  grouped.sort((a, b) => b.score - a.score);
  return grouped;
}

function MatchCard({ m, dim }: { m: GroupedMatch; dim: boolean }) {
  return (
    <div
      className={`border border-stone-200 rounded-xl bg-white p-3 hover:border-stone-300 hover:shadow-sm transition-all ${
        dim ? "opacity-70" : ""
      }`}
    >
      <div className="flex gap-3">
        <div className="shrink-0 flex flex-wrap gap-1 max-w-[164px]">
          {(m.siblings.length > 0 ? m.siblings : [m]).map((s) => (
            <a
              key={s.registration_id}
              href={s.wipo_link || undefined}
              target={s.wipo_link ? "_blank" : undefined}
              rel={s.wipo_link ? "noopener noreferrer" : undefined}
              title={s.registration_id}
              className="block w-20 h-20 border border-stone-100 rounded-lg overflow-hidden bg-stone-50 hover:border-stone-300 transition"
            >
              {s.preview_url ? (
                <img src={s.preview_url} alt={s.registration_id} className="w-full h-full object-contain" />
              ) : null}
            </a>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-stone-900 truncate">
              {m.base_id || m.registration_id}
              {m.sibling_count > 1 && (
                <span className="ml-1.5 text-xs font-normal text-stone-500">
                  · {m.sibling_count} views
                </span>
              )}
            </span>
            <span
              className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                m.score >= 0.80 ? "bg-red-50 text-red-700" :
                m.score >= 0.65 ? "bg-amber-50 text-amber-700" :
                m.score >= 0.50 ? "bg-stone-100 text-stone-700" :
                "bg-stone-50 text-stone-500"
              }`}
            >
              {(m.score * 100).toFixed(0)}%
            </span>
          </div>
          {m.product_class && <div className="text-xs text-stone-500 mb-0.5 truncate">{m.product_class}</div>}
          {m.status && <div className="text-xs text-stone-400 mb-1 truncate">{m.status}</div>}
          {/* Only show the structural-match badge when BOTH signals agree:
              cosine ≥ 0.55 (DINOv2 says these are similar) AND inliers ≥ 5
              (DALF found enough corroborating local features). Either signal
              alone is unreliable: low-cosine + high-inliers happens between
              any two visually-rich abstract designs that share generic
              curve/edge fragments (e.g. a dental logo's swirl vs. helmet
              biomorphic pattern), and high-cosine + zero-inliers is just
              ordinary embedding similarity without structural verification. */}
          {m.inliers !== undefined && m.inliers >= 5 && m.score >= 0.55 && (
            <div className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded mb-2">
              <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Structural match confirmed
            </div>
          )}
          {m.wipo_link && (
            <a
              href={m.wipo_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-stone-700 hover:text-stone-900"
            >
              View on WIPO
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Design Match — find registered design patents (WIPO Global Design Database)
 * visually similar to a user-uploaded image.
 *
 * Distinct from brand clearance: this catalog is global (no tenant), comes from
 * a public WIPO scrape, and matches against design patents (industrial design
 * rights), not trademarks. Each match links out to the official WIPO record
 * because that's where applicant / filing date / status live — we don't have
 * that locally.
 */
export default function DesignMatch() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<DesignMatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<DesignCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Load category list once on mount — populated dynamically from the
  // indexed catalog so the dropdown reflects what's actually searchable.
  useEffect(() => {
    fetchDesignCategories()
      .then((r) => setCategories(r.categories))
      .catch(() => { /* non-fatal — selector just stays empty */ });
  }, []);

  useEffect(() => {
    if (!jobId) return;
    let active = true;

    async function poll() {
      try {
        const r = await getDesignMatchResult(jobId!);
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
      const { job_id } = await submitDesignMatch(f, Array.from(selectedCategories));
      setJobId(job_id);
    } catch (e: any) {
      setError(e.message);
    }
  }

  function toggleCategory(name: string) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
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
  const rawMatches = result?.matches ?? [];
  const rawWeakMatches = result?.weak_matches ?? [];
  // Group sibling design views (same registration) into one card each.
  const matches = groupByBaseId(rawMatches);
  const weakMatches = groupByBaseId(rawWeakMatches);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Design Match</h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Visual search against the WIPO Global Design Database
          </p>
        </div>
        {file && (
          <button
            onClick={reset}
            className="px-3 py-1 text-xs font-medium border border-stone-200 rounded-full hover:bg-stone-50 transition-colors"
          >
            Check another
          </button>
        )}
      </div>

      {!file && (
        <>
          {categories.length > 0 && (
            <div className="mb-4 p-3 border border-stone-200 rounded-xl bg-white">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium text-stone-700">
                  Narrow search by category
                  <span className="ml-1.5 font-normal text-stone-400">
                    (optional — leave empty to search the whole catalog)
                  </span>
                </div>
                {selectedCategories.size > 0 && (
                  <button
                    onClick={() => setSelectedCategories(new Set())}
                    className="text-xs text-stone-500 hover:text-stone-900"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => {
                  const active = selectedCategories.has(cat.name);
                  return (
                    <button
                      key={cat.name}
                      onClick={() => toggleCategory(cat.name)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        active
                          ? "bg-stone-900 border-stone-900 text-white"
                          : "bg-white border-stone-200 text-stone-700 hover:border-stone-400"
                      }`}
                    >
                      {cat.name}
                      <span className={`ml-1.5 ${active ? "text-stone-300" : "text-stone-400"}`}>
                        {cat.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <ImageUploader
            onUpload={handleUpload}
            multiple={false}
            label="Drop a design to find similar registered designs"
          />
        </>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {isProcessing && (
        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-stone-500">Searching the design database…</p>
        </div>
      )}

      {isDone && (
        <div className="space-y-4">
          {matches.length === 0 && weakMatches.length === 0 ? (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm font-medium text-emerald-700">
                No similar registered designs found in the catalog
              </p>
            </div>
          ) : matches.length > 0 ? (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-sm font-medium text-amber-700">
                {matches.length} potentially-similar registered design{matches.length === 1 ? "" : "s"} found —
                review the official WIPO record for each
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-stone-50 border border-stone-200 rounded-xl">
              <span className="text-sm font-medium text-stone-700">
                No strong matches, but {weakMatches.length} weaker candidate{weakMatches.length === 1 ? "" : "s"} below threshold —
                review them below if relevant
              </span>
            </div>
          )}

          {/* Two-column: query image left, matches right */}
          <div className="flex gap-4 items-start">
            <div className="flex-1 min-w-0 border border-stone-200 rounded-xl overflow-hidden bg-white">
              <div className="relative max-h-[60vh] flex items-center justify-center bg-stone-50">
                <img
                  src={result!.query_image_url}
                  alt="Your design"
                  className="block max-h-[60vh] max-w-full h-auto w-auto object-contain"
                />
              </div>
              <div className="px-3 py-2 text-xs text-stone-500 border-t border-stone-100">
                Your design ({result?.image_width}×{result?.image_height})
              </div>
            </div>

            {(matches.length > 0 || weakMatches.length > 0) && (
              <div className="w-80 shrink-0 space-y-3 max-h-[60vh] overflow-y-auto">
                {matches.length > 0 && (
                  <div className="space-y-2">
                    {matches.map((m) => (
                      <MatchCard key={m.design_id} m={m} dim={false} />
                    ))}
                  </div>
                )}
                {weakMatches.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-stone-200">
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide pb-1">
                      Potential matches (below threshold)
                    </p>
                    {weakMatches.map((m) => (
                      <MatchCard key={m.design_id} m={m} dim={true} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
