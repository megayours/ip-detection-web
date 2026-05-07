import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import ImageUploader from "../components/ImageUploader";
import Lightbox from "../components/Lightbox";
import {
  submitVisualMatch,
  getVisualMatchResult,
  submitVisualMatchFeedback,
  getVisualMatchFeedback,
  type VisualMatch,
  type VisualMatchResult,
  type VisualDesignMatch,
  type VisualPopMatch,
  type VisualTrademarkMatch,
  type VisualMatchVerdict,
} from "../api";

/**
 * Visual Match — unified visual-similarity search across the WIPO design
 * catalog, the EUIPO trademark catalog, and the Giantbomb pop-culture
 * catalog.
 *
 * Backend ranks all three catalogs in one matmul against the same DINOv3
 * embedding space (rows in `ip_catalog`); matches arrive intermixed,
 * sorted by score, each tagged with `source: "design" | "pop" |
 * "trademark"`. We render a per-source card layout but keep the list
 * flat — no filters.
 *
 * Design siblings (same EUIPO `base_id` filing, multiple views) collapse
 * into one card; pop and trademark entries are always one-card-per-row.
 */

type GroupedDesign = VisualDesignMatch & {
  sibling_count: number;
  siblings: VisualDesignMatch[];
};

type GroupedRow = GroupedDesign | VisualPopMatch | VisualTrademarkMatch;

/**
 * Bucket adjacent design siblings into one card while preserving the
 * original relative score order. Non-design rows (pop, trademark) pass
 * through unchanged. Within a design bucket the highest-scoring view
 * becomes the representative.
 */
function groupForDisplay(matches: VisualMatch[]): GroupedRow[] {
  const designBuckets = new Map<string, VisualDesignMatch[]>();
  const ordering: (
    | { kind: "design"; key: string }
    | { kind: "pop"; row: VisualPopMatch }
    | { kind: "trademark"; row: VisualTrademarkMatch }
  )[] = [];
  for (const m of matches) {
    if (m.source === "design") {
      const key = m.base_id || m.registration_id;
      const arr = designBuckets.get(key);
      if (arr) {
        arr.push(m);
      } else {
        designBuckets.set(key, [m]);
        ordering.push({ kind: "design", key });
      }
    } else if (m.source === "trademark") {
      ordering.push({ kind: "trademark", row: m });
    } else {
      ordering.push({ kind: "pop", row: m });
    }
  }
  const out: GroupedRow[] = [];
  for (const slot of ordering) {
    if (slot.kind === "pop" || slot.kind === "trademark") {
      out.push(slot.row);
    } else {
      const arr = designBuckets.get(slot.key)!;
      arr.sort((a, b) => b.score - a.score);
      const best = arr[0];
      out.push({ ...best, sibling_count: arr.length, siblings: arr });
    }
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

function DesignCard({
  m,
  dim,
  onZoom,
  feedback,
}: {
  m: GroupedDesign;
  dim: boolean;
  onZoom: (src: string, caption: string) => void;
  feedback?: React.ReactNode;
}) {
  return (
    <div
      className={`border border-stone-200 rounded-xl bg-white p-3 hover:border-stone-300 hover:shadow-sm transition-all ${
        dim ? "opacity-70" : ""
      }`}
    >
      <div className="flex gap-3">
        <div className="shrink-0 flex flex-wrap gap-2 max-w-[168px]">
          {(m.siblings.length > 0 ? m.siblings : [m]).map((s, i, list) => (
            <div key={s.registration_id} className="flex flex-col items-center gap-0.5">
              {s.preview_url ? (
                <button
                  type="button"
                  onClick={() => onZoom(s.preview_url!, s.registration_id)}
                  title={s.registration_id}
                  aria-label={`View ${s.registration_id} larger`}
                  className="block w-20 h-20 border border-stone-100 rounded-lg overflow-hidden bg-stone-50 hover:border-stone-300 transition cursor-zoom-in"
                >
                  <img src={s.preview_url} alt={s.registration_id} className="w-full h-full object-contain" />
                </button>
              ) : (
                <div
                  title={s.registration_id}
                  className="block w-20 h-20 border border-stone-100 rounded-lg overflow-hidden bg-stone-50"
                />
              )}
              {s.wipo_link && (
                <a
                  href={s.wipo_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={s.registration_id}
                  className="text-[10px] font-medium text-stone-500 hover:text-stone-900 inline-flex items-center gap-0.5 leading-tight"
                >
                  {list.length > 1 ? `WIPO #${i + 1}` : "View on WIPO"}
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
              )}
            </div>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide">Design</span>
            <span className="text-sm font-bold text-stone-900 truncate">
              {m.base_id || m.registration_id}
              {m.sibling_count > 1 && (
                <span className="ml-1.5 text-xs font-normal text-stone-500">· {m.sibling_count} views</span>
              )}
            </span>
            <span
              className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                m.score >= 0.8
                  ? "bg-red-50 text-red-700"
                  : m.score >= 0.65
                  ? "bg-amber-50 text-amber-700"
                  : m.score >= 0.5
                  ? "bg-stone-100 text-stone-700"
                  : "bg-stone-50 text-stone-500"
              }`}
            >
              {(m.score * 100).toFixed(0)}%
            </span>
          </div>
          {m.product_class && <div className="text-xs text-stone-500 mb-0.5 truncate">{m.product_class}</div>}
          {m.status && <div className="text-xs text-stone-400 mb-1 truncate">{m.status}</div>}
          {m.right_holder && (
            <div className="text-xs text-stone-500 mb-0.5 truncate" title={m.right_holder}>
              Right holder: <span className="text-stone-700">{m.right_holder}</span>
            </div>
          )}
          {m.vlm_reasoning && (
            <div
              className={`text-xs mb-1 px-2 py-1 rounded leading-snug ${
                m.vlm_verdict === "present"
                  ? "bg-emerald-50 text-emerald-800"
                  : m.vlm_verdict === "unclear"
                  ? "bg-amber-50 text-amber-800"
                  : "bg-stone-50 text-stone-600"
              }`}
            >
              {m.vlm_reasoning}
            </div>
          )}
          {m.inliers !== undefined && m.inliers >= 5 && m.score >= 0.55 && (
            <div className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded mb-2">
              <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Structural match confirmed
            </div>
          )}
          {feedback}
        </div>
      </div>
    </div>
  );
}

function PopCard({
  m,
  dim,
  onZoom,
  feedback,
}: {
  m: VisualPopMatch;
  dim: boolean;
  onZoom: (src: string, caption: string) => void;
  feedback?: React.ReactNode;
}) {
  const pct = Math.round(m.score * 100);
  return (
    <div
      className={`border border-stone-200 rounded-xl bg-white p-3 hover:border-stone-300 hover:shadow-sm transition-all ${
        dim ? "opacity-70" : ""
      }`}
    >
      <div className="flex gap-3">
        {m.preview_url ? (
          <button
            type="button"
            onClick={() => onZoom(m.preview_url!, m.name)}
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
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide">
              Pop · {m.entity_type}
            </span>
            <span className="font-semibold text-sm text-stone-900 truncate">{m.name}</span>
            <span
              className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                m.score >= 0.8
                  ? "bg-red-50 text-red-700"
                  : m.score >= 0.65
                  ? "bg-amber-50 text-amber-700"
                  : m.score >= 0.5
                  ? "bg-stone-100 text-stone-700"
                  : "bg-stone-50 text-stone-500"
              }`}
            >
              {pct}%
            </span>
          </div>
          {m.summary && <p className="text-xs text-stone-500 line-clamp-2">{m.summary}</p>}
          {m.right_holder && (
            <div className="text-xs text-stone-500 mt-0.5 truncate" title={m.right_holder}>
              Right holder: <span className="text-stone-700">{m.right_holder}</span>
            </div>
          )}
          <div className="mt-2 flex items-center gap-2 text-[11px]">
            {m.source_url && (
              <a
                href={m.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-stone-500 hover:text-stone-900 inline-flex items-center gap-0.5"
              >
                Source
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            )}
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
          {feedback}
        </div>
      </div>
    </div>
  );
}

function TrademarkCard({
  m,
  dim,
  onZoom,
  feedback,
}: {
  m: VisualTrademarkMatch;
  dim: boolean;
  onZoom: (src: string, caption: string) => void;
  feedback?: React.ReactNode;
}) {
  const pct = Math.round(m.score * 100);
  const label = m.verbal_element || m.application_number;
  return (
    <div
      className={`border border-stone-200 rounded-xl bg-white p-3 hover:border-stone-300 hover:shadow-sm transition-all ${
        dim ? "opacity-70" : ""
      }`}
    >
      <div className="flex gap-3">
        {m.preview_url ? (
          <button
            type="button"
            onClick={() => onZoom(m.preview_url!, label)}
            className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-stone-100 flex items-center justify-center cursor-zoom-in"
            aria-label={`View ${label} larger`}
          >
            <img src={m.preview_url} alt={label} className="w-full h-full object-contain" />
          </button>
        ) : (
          <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-stone-100 flex items-center justify-center">
            <span className="text-stone-300 text-xs">no image</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide">
              Trademark{m.mark_kind ? ` · ${m.mark_kind}` : ""}
            </span>
            <span className="font-semibold text-sm text-stone-900 truncate">{label}</span>
            <span
              className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                m.score >= 0.8
                  ? "bg-red-50 text-red-700"
                  : m.score >= 0.65
                  ? "bg-amber-50 text-amber-700"
                  : m.score >= 0.5
                  ? "bg-stone-100 text-stone-700"
                  : "bg-stone-50 text-stone-500"
              }`}
            >
              {pct}%
            </span>
          </div>
          <div className="text-xs text-stone-500 truncate">{m.application_number}</div>
          {m.nice_classes && m.nice_classes.length > 0 && (
            <div className="text-xs text-stone-400 truncate mt-0.5">
              Nice: {m.nice_classes.join(", ")}
            </div>
          )}
          {m.right_holder && (
            <div className="text-xs text-stone-500 mt-0.5 truncate" title={m.right_holder}>
              Right holder: <span className="text-stone-700">{m.right_holder}</span>
            </div>
          )}
          <div className="mt-2 flex items-center gap-2 text-[11px]">
            {m.detail_url && (
              <a
                href={m.detail_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-stone-500 hover:text-stone-900 inline-flex items-center gap-0.5"
              >
                EUIPO
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            )}
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
          {feedback}
        </div>
      </div>
    </div>
  );
}

function ResultCard({
  m,
  dim,
  onZoom,
  feedback,
  pending,
  onFeedback,
}: {
  m: GroupedRow;
  dim: boolean;
  onZoom: (src: string, caption: string) => void;
  feedback: VisualMatchVerdict | null;
  pending: boolean;
  onFeedback: (matchId: string, verdict: VisualMatchVerdict) => void;
}) {
  const fb = (
    <FeedbackButtons
      matchId={m.id}
      feedback={feedback}
      pending={pending}
      onFeedback={onFeedback}
    />
  );
  if (m.source === "design") return <DesignCard m={m} dim={dim} onZoom={onZoom} feedback={fb} />;
  if (m.source === "trademark") return <TrademarkCard m={m} dim={dim} onZoom={onZoom} feedback={fb} />;
  return <PopCard m={m} dim={dim} onZoom={onZoom} feedback={fb} />;
}

function FeedbackButtons({
  matchId,
  feedback,
  pending,
  onFeedback,
}: {
  matchId: string;
  feedback: VisualMatchVerdict | null;
  pending: boolean;
  onFeedback: (matchId: string, verdict: VisualMatchVerdict) => void;
}) {
  const locked = feedback !== null || pending;
  const baseBtn =
    "inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition";
  return (
    <div className="flex items-center gap-2 mt-2 text-xs">
      <button
        type="button"
        disabled={locked}
        onClick={() => onFeedback(matchId, "confirmed")}
        className={`${baseBtn} ${
          feedback === "confirmed"
            ? "bg-emerald-50 border-emerald-400 text-emerald-700"
            : "border-stone-300 text-stone-600 hover:bg-emerald-50 hover:border-emerald-300"
        } ${locked ? "cursor-default opacity-90" : "cursor-pointer"}`}
        title="Mark this as the correct match — improves ranking on similar future queries"
      >
        ✓ Correct
      </button>
      <button
        type="button"
        disabled={locked}
        onClick={() => onFeedback(matchId, "rejected")}
        className={`${baseBtn} ${
          feedback === "rejected"
            ? "bg-rose-50 border-rose-400 text-rose-700"
            : "border-stone-300 text-stone-600 hover:bg-rose-50 hover:border-rose-300"
        } ${locked ? "cursor-default opacity-90" : "cursor-pointer"}`}
        title="Mark this as not relevant — demotes it on similar future queries"
      >
        ✗ Not relevant
      </button>
      {feedback && (
        <span className="text-stone-400">Saved</span>
      )}
    </div>
  );
}

export default function ClearanceVisual() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<VisualMatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState<{ src: string; caption: string } | null>(null);
  // Per (job, match) verdict the user has already submitted via the ✓/✗
  // buttons. Loaded from GET /:jobId/feedback once the job completes so a
  // page reload still shows the user's prior choices.
  const [feedbackByMatchId, setFeedbackByMatchId] =
    useState<Record<string, VisualMatchVerdict>>({});
  // matchIds with an in-flight POST — disables both buttons during the
  // round-trip to prevent double-clicks.
  const [pendingFeedback, setPendingFeedback] = useState<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (!jobId) return;
    let active = true;

    async function poll() {
      try {
        const r = await getVisualMatchResult(jobId!);
        if (!active) return;
        setResult(r);
        if (r.status === "complete" || r.status === "failed") {
          clearInterval(timerRef.current);
          if (r.status === "failed") setError(r.error || "Analysis failed");
          if (r.status === "complete") {
            // Hydrate pre-existing verdicts so reloaded pages reflect them.
            getVisualMatchFeedback(jobId!)
              .then((res) => {
                if (!active) return;
                const map: Record<string, VisualMatchVerdict> = {};
                for (const f of res.feedback) map[f.match_id] = f.verdict;
                setFeedbackByMatchId(map);
              })
              .catch(() => { /* non-fatal */ });
          }
        }
      } catch {
        // ignore poll errors
      }
    }

    poll();
    timerRef.current = setInterval(poll, 1500);
    return () => {
      active = false;
      clearInterval(timerRef.current);
    };
  }, [jobId]);

  async function handleFeedback(matchId: string, verdict: VisualMatchVerdict) {
    if (!jobId) return;
    if (pendingFeedback.has(matchId)) return;
    setPendingFeedback((prev) => new Set(prev).add(matchId));
    // Optimistic — flip the icon immediately, roll back on error.
    setFeedbackByMatchId((prev) => ({ ...prev, [matchId]: verdict }));
    try {
      await submitVisualMatchFeedback(jobId, matchId, verdict);
    } catch (e) {
      console.error("submitVisualMatchFeedback failed", e);
      setFeedbackByMatchId((prev) => {
        const next = { ...prev };
        delete next[matchId];
        return next;
      });
    } finally {
      setPendingFeedback((prev) => {
        const next = new Set(prev);
        next.delete(matchId);
        return next;
      });
    }
  }

  async function handleUpload(files: File[]) {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
    setResult(null);
    try {
      const { job_id } = await submitVisualMatch(f);
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
  const matches = groupForDisplay(result?.matches ?? []);
  const weakMatches = groupForDisplay(result?.weak_matches ?? []);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="flex items-center gap-3 text-xs">
          <Link
            to="/clearance/designs/catalog"
            className="font-medium text-stone-500 hover:text-stone-900 inline-flex items-center gap-1"
          >
            Browse designs
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
          <span className="text-stone-300">·</span>
          <Link
            to="/clearance/pop/catalog"
            className="font-medium text-stone-500 hover:text-stone-900 inline-flex items-center gap-1"
          >
            Browse pop culture
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
          <span className="text-stone-300">·</span>
          <Link
            to="/clearance/brands/catalog"
            className="font-medium text-stone-500 hover:text-stone-900 inline-flex items-center gap-1"
          >
            Browse trademarks
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
        {file && (
          <div className="flex items-center gap-2">
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
      </div>

      {!file && (
        <ImageUploader
          onUpload={handleUpload}
          multiple={false}
          label="Drop an image to find similar registered designs and pop-culture references"
        />
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      {isProcessing && (
        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-stone-500">Analyzing…</p>
        </div>
      )}

      {isDone && (
        <div className="space-y-4">
          {matches.length === 0 && weakMatches.length === 0 ? (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm font-medium text-emerald-700">No similar entries found</p>
            </div>
          ) : matches.length > 0 ? (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-sm font-medium text-amber-700">
                {matches.length} potentially-similar entr{matches.length === 1 ? "y" : "ies"} found
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-stone-50 border border-stone-200 rounded-xl">
              <span className="text-sm font-medium text-stone-700">
                No strong matches, but {weakMatches.length} weaker candidate{weakMatches.length === 1 ? "" : "s"} below threshold
              </span>
            </div>
          )}

          {matches.length > 0 && (
            <div className="space-y-2">
              {matches.map((m) => (
                <ResultCard
                  key={`${m.source}-${m.id}`}
                  m={m}
                  dim={false}
                  onZoom={(src, caption) => setZoomed({ src, caption })}
                  feedback={feedbackByMatchId[m.id] ?? null}
                  pending={pendingFeedback.has(m.id)}
                  onFeedback={handleFeedback}
                />
              ))}
            </div>
          )}

          {weakMatches.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-stone-200">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide pb-1">
                Potential matches (below threshold)
              </p>
              {weakMatches.map((m) => (
                <ResultCard
                  key={`${m.source}-${m.id}`}
                  m={m}
                  dim={true}
                  onZoom={(src, caption) => setZoomed({ src, caption })}
                  feedback={feedbackByMatchId[m.id] ?? null}
                  pending={pendingFeedback.has(m.id)}
                  onFeedback={handleFeedback}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {zoomed && (
        <Lightbox src={zoomed.src} alt={zoomed.caption} caption={zoomed.caption} onClose={() => setZoomed(null)} />
      )}
    </div>
  );
}
