import { useState, useEffect, useRef } from "react";
import ImageUploader from "../components/ImageUploader";
import { submitDesignMatch, getDesignMatchResult, type DesignMatchResult } from "../api";

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
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

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
      const { job_id } = await submitDesignMatch(f);
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
        <ImageUploader
          onUpload={handleUpload}
          multiple={false}
          label="Drop a design to find similar registered designs"
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
          <p className="text-sm text-stone-500">Searching the design database…</p>
        </div>
      )}

      {isDone && (
        <div className="space-y-4">
          {matches.length === 0 ? (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm font-medium text-emerald-700">
                No similar registered designs found in the catalog
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-sm font-medium text-amber-700">
                {matches.length} potentially-similar registered design{matches.length === 1 ? "" : "s"} found —
                review the official WIPO record for each
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

            {matches.length > 0 && (
              <div className="w-80 shrink-0 space-y-2 max-h-[60vh] overflow-y-auto">
                {matches.map((m) => (
                  <div
                    key={m.design_id}
                    className="border border-stone-200 rounded-xl bg-white p-3 hover:border-stone-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex gap-3">
                      <div className="w-20 h-20 shrink-0 border border-stone-100 rounded-lg overflow-hidden bg-stone-50">
                        {m.preview_url ? (
                          <img src={m.preview_url} alt="" className="w-full h-full object-contain" />
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-stone-900 truncate">
                            {m.registration_id}
                          </span>
                          <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                            m.score >= 0.80 ? "bg-red-50 text-red-700" :
                            m.score >= 0.65 ? "bg-amber-50 text-amber-700" :
                            "bg-stone-100 text-stone-600"
                          }`}>
                            {(m.score * 100).toFixed(0)}%
                          </span>
                        </div>
                        {m.product_class && (
                          <div className="text-xs text-stone-500 mb-0.5 truncate">
                            {m.product_class}
                          </div>
                        )}
                        {m.status && (
                          <div className="text-xs text-stone-400 mb-2 truncate">
                            {m.status}
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
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
