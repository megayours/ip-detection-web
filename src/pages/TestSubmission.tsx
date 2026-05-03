import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  listTrademarks,
  createSubmission,
  getSubmission,
  requestSubmissionReview,
  type Trademark,
  type SubmissionResponse,
  type Verdict,
  type RuleResult,
  type CanonicalRefMatch,
} from "../api";
import ImageUploader from "../components/ImageUploader";
import Lightbox from "../components/Lightbox";
import {
  ruleDisplayName,
  severityCopy,
  vlmViolations,
  observedFacts,
  closestReferences,
  proximityCalibration,
  proximityExplanation,
  proximityExplanationDebug,
  type ProximityCalibration,
  type ProximityExplanation,
} from "../lib/labels";

const VERDICT_BADGE: Record<Verdict | "pending", { label: string; bg: string; color: string }> = {
  pass:         { label: "Approved",          bg: "#c6f6d5", color: "#0a3a1e" },
  pass_w_note:  { label: "Approved w/ notes", bg: "#fff3bf", color: "#5b3a00" },
  fail:         { label: "Not approved",      bg: "#fed7d7", color: "#5a0d12" },
  fail_hard:    { label: "Rejected",          bg: "#9b1c1c", color: "#ffffff" },
  pending:      { label: "Reviewing",         bg: "#bee3f8", color: "#1a365d" },
};

export default function TestSubmission() {
  const [searchParams] = useSearchParams();
  const preselectedTm = searchParams.get("trademark");

  const [trademarks, setTrademarks] = useState<Trademark[]>([]);
  const [selectedId, setSelectedId] = useState<string>(preselectedTm ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [submitterNote, setSubmitterNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [submission, setSubmission] = useState<SubmissionResponse | null>(null);
  const [requestingReview, setRequestingReview] = useState(false);
  const [error, setError] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    listTrademarks()
      .then(({ trademarks }) => {
        setTrademarks(trademarks);
        if (!selectedId && trademarks.length > 0) {
          setSelectedId(trademarks[0].id);
        }
      })
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll the submission once we have an id
  useEffect(() => {
    if (!submissionId) return;
    let active = true;

    async function poll() {
      try {
        const resp = await getSubmission(submissionId!);
        if (!active) return;
        setSubmission(resp);
        if (resp.submission.verdict !== null || resp.job?.status === "failed") {
          clearInterval(timerRef.current);
        }
      } catch {
        // ignore poll errors
      }
    }

    poll();
    timerRef.current = setInterval(poll, 2000);
    return () => {
      active = false;
      clearInterval(timerRef.current);
    };
  }, [submissionId]);

  function handleFile(files: File[]) {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setSubmissionId(null);
    setSubmission(null);
    setError("");
  }

  async function handleSubmit() {
    if (!file || !selectedId) return;
    setSubmitting(true);
    setError("");
    try {
      const resp = await createSubmission(
        selectedId,
        file,
        submitterEmail.trim() || undefined,
        submitterNote.trim() || undefined
      );
      setSubmissionId(resp.submission_id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setFile(null);
    setPreviewUrl(null);
    setSubmissionId(null);
    setSubmission(null);
    setError("");
  }

  async function handleRequestReview() {
    if (!submissionId) return;
    setRequestingReview(true);
    try {
      await requestSubmissionReview(submissionId);
      // Re-fetch to update review_requested flag
      const resp = await getSubmission(submissionId);
      setSubmission(resp);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRequestingReview(false);
    }
  }

  const selectedTm = trademarks.find((t) => t.id === selectedId);
  const isProcessing = submissionId && submission && submission.submission.verdict === null && submission.job?.status !== "failed";
  const verdict = submission?.submission.verdict;
  const ruleResults = submission?.submission.primitive_results?.rule_results ?? [];
  const canRequestReview = verdict === "fail" && !submission?.submission.review_requested;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-stone-900 tracking-tight">Test against brand guidelines</h1>
        <p className="mt-1 text-sm text-stone-500">
          Upload your design and get an instant approval check against the registered IP guidelines.
          A passing result earns an approval certificate you can attach to your submission.
        </p>
      </div>

      {/* Trademark selector */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5">Trademark</label>
        {trademarks.length === 0 ? (
          <div className="text-sm text-stone-400 bg-stone-50 rounded-xl px-4 py-3 border border-stone-100">
            No trademarks registered yet.
          </div>
        ) : (
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 bg-white transition-all"
          >
            {trademarks.map((tm) => (
              <option key={tm.id} value={tm.id}>
                {tm.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Submitter info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Submitter email (optional)</label>
          <input
            value={submitterEmail}
            onChange={(e) => setSubmitterEmail(e.target.value)}
            placeholder="licensee@partner.com"
            className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">Note (optional)</label>
          <input
            value={submitterNote}
            onChange={(e) => setSubmitterNote(e.target.value)}
            placeholder="e.g. Spring 2026 collection mockup"
            className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-all"
          />
        </div>
      </div>

      {/* Upload / preview */}
      {!file ? (
        <ImageUploader
          onUpload={handleFile}
          multiple={false}
          label="Drop a mockup image, or click to browse"
        />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-stone-600 font-medium">{file.name}</span>
            <button onClick={handleReset} className="text-xs text-stone-400 hover:text-stone-600 transition-colors">
              Clear
            </button>
          </div>

          {previewUrl && (
            <img src={previewUrl} alt="Preview" className="max-w-full h-auto rounded-xl border border-stone-200" />
          )}

          {/* Verdict */}
          {verdict && (
            <VerdictBlock
              verdict={verdict}
              ruleResults={ruleResults}
              trademarkName={selectedTm?.name}
              submissionImageUrl={submission?.submission.image_url}
            />
          )}

          {/* Processing */}
          {isProcessing && (
            <div className="bg-blue-50 border border-blue-100 text-blue-700 text-sm rounded-xl px-5 py-4 flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Evaluating against {selectedTm?.name ?? "trademark"} rules…
            </div>
          )}

          {submission?.job?.status === "failed" && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-5 py-4">
              Job failed: {submission.job.error}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-5 py-4">
              {error}
            </div>
          )}

          {/* Manual review request */}
          {canRequestReview && (
            <button
              onClick={handleRequestReview}
              disabled={requestingReview}
              className="px-5 py-2.5 border border-red-200 bg-red-50 text-red-700 rounded-xl text-sm font-semibold hover:bg-red-100 transition-all disabled:opacity-50"
            >
              {requestingReview ? "Requesting…" : "Request manual review"}
            </button>
          )}
          {submission?.submission.review_requested && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-5 py-4">
              ⏳ Manual review requested.
            </div>
          )}

          {/* Submit / re-submit */}
          {(!submissionId || verdict !== null || submission?.job?.status === "failed") && (
            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedId || trademarks.length === 0}
              className="px-6 py-3 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 disabled:opacity-50 transition-all shadow-lg"
            >
              {submitting ? "Submitting…" : submissionId ? "Re-test" : "Check approval"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function VerdictBlock({
  verdict,
  ruleResults,
  trademarkName,
  submissionImageUrl,
}: {
  verdict: Verdict;
  ruleResults: RuleResult[];
  trademarkName?: string;
  submissionImageUrl?: string;
}) {
  const badge = VERDICT_BADGE[verdict];
  const isApproved = verdict === "pass" || verdict === "pass_w_note";
  const checksPassed = ruleResults.filter((rr) => rr.state === "pass").length;
  const checksTotal = ruleResults.length;

  return (
    <div className="space-y-5">
      {isApproved ? (
        <ApprovalStamp verdict={verdict} trademarkName={trademarkName} />
      ) : (
        <div
          className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl font-bold text-lg"
          style={{ backgroundColor: badge.bg, color: badge.color }}
        >
          <span>{badge.label}</span>
          {checksTotal > 0 && (
            <span className="text-xs font-semibold opacity-70">
              {checksPassed}/{checksTotal} checks passed
            </span>
          )}
        </div>
      )}

      {ruleResults.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-stone-700 mb-2">Approval checks</h3>
          <ul className="space-y-2">
            {ruleResults.map((rr, idx) => (
              <RuleResultRow key={idx} rr={rr} submissionImageUrl={submissionImageUrl} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ApprovalStamp({ verdict, trademarkName }: { verdict: Verdict; trademarkName?: string }) {
  const isFull = verdict === "pass";
  const stamp = isFull ? "Approved" : "Approved · with notes";
  const date = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return (
    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/40 border-2 border-emerald-300 border-dashed rounded-2xl p-6 flex items-center gap-5">
      <div className="shrink-0 w-24 h-24 rounded-full border-4 border-emerald-600 text-emerald-700 flex items-center justify-center rotate-[-8deg]">
        <div className="text-center leading-tight">
          <div className="text-[10px] font-bold uppercase tracking-widest">Brand</div>
          <div className="text-xs font-black uppercase">Approved</div>
          <div className="text-[9px] mt-0.5 opacity-70">{date}</div>
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-emerald-700 uppercase tracking-widest">
          Approval Certificate
        </div>
        <div className="mt-1 text-lg font-black text-stone-900">{stamp}</div>
        {trademarkName && (
          <div className="text-sm text-stone-600 mt-0.5">
            Cleared against <strong>{trademarkName}</strong> brand guidelines.
          </div>
        )}
      </div>
    </div>
  );
}

function RuleResultRow({
  rr,
  submissionImageUrl,
}: {
  rr: RuleResult;
  submissionImageUrl?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const stateBadge = {
    pass:      { label: "Passed",       bg: "#c6f6d5", color: "#0a3a1e" },
    fail:      { label: "Did not pass", bg: "#fed7d7", color: "#5a0d12" },
    uncertain: { label: "Inconclusive", bg: "#fff3bf", color: "#5b3a00" },
  }[rr.state];

  const borderColor =
    rr.state === "pass" ? "border-l-emerald-400"
    : rr.state === "fail" ? "border-l-red-400"
    : "border-l-red-400";

  const violations = vlmViolations(rr);
  const facts = observedFacts(rr);
  const refs = closestReferences(rr);
  const calibration = proximityCalibration(rr);
  const explanation = proximityExplanation(rr);
  const explanationDebug = proximityExplanationDebug(rr);
  const proximityScore =
    rr.primitive === "canonical_proximity"
      ? (rr.observed?.proximity_score as number | undefined)
      : undefined;
  const title = ruleDisplayName(rr);
  const hasDetail =
    violations.length > 0 ||
    facts.length > 0 ||
    refs.length > 0 ||
    calibration !== null ||
    explanation !== null ||
    explanationDebug !== null;

  return (
    <li className={`bg-white rounded-xl border border-stone-200 border-l-4 ${borderColor} overflow-hidden`}>
      <div
        className={`flex items-center justify-between px-4 py-3 ${hasDetail ? "cursor-pointer hover:bg-stone-50/50" : ""}`}
        onClick={() => hasDetail && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          {hasDetail ? (
            <span className="text-stone-300 text-xs">{expanded ? "▾" : "▸"}</span>
          ) : (
            <span className="text-stone-200 text-xs">·</span>
          )}
          <div className="min-w-0">
            <div className="text-sm font-semibold text-stone-900 truncate">{title}</div>
            <div className="text-xs text-stone-400">{severityCopy(rr.on_fail)} check</div>
          </div>
        </div>
        <span
          className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
          style={{ backgroundColor: stateBadge.bg, color: stateBadge.color }}
        >
          {stateBadge.label}
        </span>
      </div>
      {expanded && hasDetail && (
        <div className="border-t border-stone-100 px-4 py-4 bg-stone-50/30 space-y-4 text-sm">
          {facts.length > 0 && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {facts.map((f, i) => (
                <div key={i} className="flex items-baseline justify-between gap-3">
                  <dt className="text-xs text-stone-500">{f.label}</dt>
                  <dd
                    className={`text-sm font-semibold ${
                      f.tone === "good"
                        ? "text-emerald-700"
                        : f.tone === "bad"
                          ? "text-red-700"
                          : "text-stone-800"
                    }`}
                  >
                    {f.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {explanation && <ProximityExplanationBlock explanation={explanation} />}
          {!explanation && explanationDebug && (
            <ProximityExplanationDebugBlock reason={explanationDebug} />
          )}
          {calibration && proximityScore !== undefined && (
            <CalibrationStrip calibration={calibration} score={proximityScore} />
          )}
          {refs.length > 0 && (
            <ClosestReferences refs={refs} submissionImageUrl={submissionImageUrl} />
          )}
          {violations.length > 0 && (
            <div className="space-y-2">
              <div className="font-semibold text-stone-700 text-xs uppercase tracking-wider">
                What didn't match
              </div>
              <ul className="space-y-2">
                {violations.map((v, i) => (
                  <li
                    key={i}
                    className="bg-red-50 border-l-2 border-red-300 rounded px-3 py-2"
                  >
                    <div className="font-semibold text-red-900 text-sm">
                      {v.rule || "Guideline issue"}
                    </div>
                    {v.reason && (
                      <div className="text-red-800 text-xs mt-0.5">{v.reason}</div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * VLM-generated imperative bullets describing what the submission needs to
 * change to look more like its closest canonical. Surfaced from
 * `evidence.explanation.changes`. Visually distinct so users understand
 * these are AI-generated suggestions, not hard rules.
 */
function ProximityExplanationBlock({ explanation }: { explanation: ProximityExplanation }) {
  return (
    <div className="bg-violet-50 border-l-2 border-violet-300 rounded px-4 py-3">
      <div className="text-[10px] font-semibold text-violet-700 uppercase tracking-wider mb-2">
        Suggested changes
      </div>
      <ul className="space-y-1.5">
        {explanation.changes.map((change, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-violet-900 leading-snug">
            <span className="text-violet-400 font-bold mt-0.5">→</span>
            <span>{change}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Fallback shown when the worker tried to generate an explanation but failed
 * (no API key, image download error, malformed VLM response, etc). Surfaces
 * `evidence.explanation_debug` so the user can diagnose without digging
 * through worker logs.
 */
function ProximityExplanationDebugBlock({ reason }: { reason: string }) {
  return (
    <div className="bg-stone-50 border-l-2 border-stone-300 rounded px-4 py-2.5">
      <div className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-0.5">
        Suggested changes unavailable
      </div>
      <div className="text-xs text-stone-600 font-mono">{reason}</div>
    </div>
  );
}

/**
 * Visual placement of the submission's score on the brand's own canonical
 * self-similarity distribution. Shows users that the threshold isn't a magic
 * number — it's calibrated from how similar the brand's references are to
 * each other.
 */
function CalibrationStrip({
  calibration,
  score,
}: {
  calibration: ProximityCalibration;
  score: number;
}) {
  // Render the canonical band (min → p50) on a 0–1 axis, with markers for
  // p10 (the threshold) and the submission score.
  const lo = Math.min(calibration.min, score) - 0.02;
  const hi = Math.max(calibration.p50, score) + 0.02;
  const range = Math.max(hi - lo, 0.01);
  const norm = (v: number) => Math.max(0, Math.min(1, (v - lo) / range)) * 100;

  const bandStart = norm(calibration.min);
  const bandEnd = norm(calibration.p50);
  const thresholdPos = norm(calibration.p10);
  const scorePos = norm(score);
  const passed = score >= calibration.p10;

  return (
    <div>
      <div className="text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
        Where you sit vs the brand
      </div>
      <div className="relative h-8">
        {/* axis */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-stone-200" />
        {/* canonical band (min → p50) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-2 bg-emerald-200/70 rounded"
          style={{ left: `${bandStart}%`, width: `${Math.max(bandEnd - bandStart, 1)}%` }}
        />
        {/* threshold marker (p10) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-px h-5 bg-emerald-700"
          style={{ left: `${thresholdPos}%` }}
          title={`Threshold: ${Math.round(calibration.p10 * 100)}%`}
        />
        {/* submission score marker */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-2 h-6 rounded-sm ring-2 ring-white ${
            passed ? "bg-emerald-600" : "bg-red-600"
          }`}
          style={{ left: `calc(${scorePos}% - 4px)` }}
          title={`Your score: ${Math.round(score * 100)}%`}
        />
      </div>
      <div className="mt-2 text-xs text-stone-500">
        Brand canonicals score{" "}
        <strong className="text-stone-700">{Math.round(calibration.min * 100)}–{Math.round(calibration.p50 * 100)}%</strong>{" "}
        against each other (median{" "}
        <strong className="text-stone-700">{Math.round(calibration.p50 * 100)}%</strong>
        {calibration.sampleSize > 0 ? `, n=${calibration.sampleSize}` : ""}). Your submission landed at{" "}
        <strong className={passed ? "text-emerald-700" : "text-red-700"}>
          {Math.round(score * 100)}%
        </strong>
        .
      </div>
    </div>
  );
}

/**
 * Visual comparison block: side-by-side hero of the submission and its single
 * closest canonical reference, plus a small strip of runners-up. Both layers
 * are clickable and open a lightbox for full-size inspection.
 *
 * When `submissionImageUrl` is missing, falls back to a flat strip of all refs.
 */
function ClosestReferences({
  refs,
  submissionImageUrl,
}: {
  refs: CanonicalRefMatch[];
  submissionImageUrl?: string;
}) {
  const [zoomed, setZoomed] = useState<{ src: string; caption?: string } | null>(null);

  if (refs.length === 0) return null;
  const [top, ...runnersUp] = refs;
  const topPct = Math.round(top.similarity * 100);

  // Without a submission image, fall back to a flat strip (the v0 layout).
  if (!submissionImageUrl) {
    return (
      <div>
        <div className="text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
          Closest references
        </div>
        <div className="flex gap-3">
          {refs.map((ref, i) => (
            <ReferenceThumbnail
              key={ref.image_id ?? i}
              ref={ref}
              size={80}
              onZoom={(payload) => setZoomed(payload)}
            />
          ))}
        </div>
        {zoomed && (
          <Lightbox
            src={zoomed.src}
            alt="Reference image"
            caption={zoomed.caption}
            onClose={() => setZoomed(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
        Closest reference
      </div>
      <div className="grid grid-cols-2 gap-3">
        <HeroPanel
          src={submissionImageUrl}
          label="Your submission"
          onZoom={() =>
            setZoomed({ src: submissionImageUrl, caption: "Your submission" })
          }
        />
        <HeroPanel
          src={top.image_url}
          label={`Closest canonical · ${topPct}% similar`}
          onZoom={
            top.image_url
              ? () =>
                  setZoomed({
                    src: top.image_url!,
                    caption: `Closest canonical · ${topPct}% similar`,
                  })
              : undefined
          }
        />
      </div>
      {runnersUp.length > 0 && (
        <div className="mt-3">
          <div className="text-xs text-stone-500 mb-1.5">Also similar to</div>
          <div className="flex gap-2">
            {runnersUp.map((ref, i) => (
              <ReferenceThumbnail
                key={ref.image_id ?? i}
                ref={ref}
                size={56}
                onZoom={(payload) => setZoomed(payload)}
              />
            ))}
          </div>
        </div>
      )}
      {zoomed && (
        <Lightbox
          src={zoomed.src}
          alt="Reference image"
          caption={zoomed.caption}
          onClose={() => setZoomed(null)}
        />
      )}
    </div>
  );
}

function HeroPanel({
  src,
  label,
  onZoom,
}: {
  src?: string;
  label: string;
  onZoom?: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={onZoom}
        disabled={!onZoom || !src}
        className="block w-full aspect-square rounded-xl overflow-hidden border border-stone-200 bg-stone-100 hover:border-red-500 hover:shadow-md transition-all disabled:cursor-not-allowed disabled:hover:border-stone-200 disabled:hover:shadow-none"
        title={onZoom ? "Click to enlarge" : undefined}
      >
        {src ? (
          <img src={src} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-300 text-xs">
            n/a
          </div>
        )}
      </button>
      <div className="text-xs font-semibold text-stone-700 text-center">{label}</div>
    </div>
  );
}

function ReferenceThumbnail({
  ref,
  size,
  onZoom,
}: {
  ref: CanonicalRefMatch;
  size: number;
  onZoom: (payload: { src: string; caption: string }) => void;
}) {
  const pct = Math.round(ref.similarity * 100);
  const handleClick = () => {
    if (ref.image_url) {
      onZoom({ src: ref.image_url, caption: `Similarity: ${pct}%` });
    }
  };
  return (
    <button
      onClick={handleClick}
      disabled={!ref.image_url}
      className="group flex flex-col items-center gap-1 disabled:cursor-not-allowed"
      title={ref.image_url ? "Click to enlarge" : "Reference unavailable"}
      style={{ width: size }}
    >
      <div
        className="rounded-lg overflow-hidden border border-stone-200 bg-stone-100 group-hover:border-red-500 group-hover:shadow-md transition-all"
        style={{ width: size, height: size }}
      >
        {ref.image_url ? (
          <img
            src={ref.image_url}
            alt="Reference"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-300 text-xs">
            n/a
          </div>
        )}
      </div>
      <span className="text-xs font-semibold text-stone-700">{pct}%</span>
    </button>
  );
}

