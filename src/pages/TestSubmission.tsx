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
} from "../api";
import ImageUploader from "../components/ImageUploader";

const VERDICT_BADGE: Record<Verdict | "pending", { label: string; bg: string; color: string }> = {
  pass:         { label: "PASS",            bg: "#c6f6d5", color: "#0a3a1e" },
  pass_w_note:  { label: "PASS w/ NOTE",    bg: "#fff3bf", color: "#5b3a00" },
  fail:         { label: "FAIL",            bg: "#fed7d7", color: "#5a0d12" },
  fail_hard:    { label: "FAIL (no review)", bg: "#9b1c1c", color: "#ffffff" },
  pending:      { label: "PENDING",          bg: "#bee3f8", color: "#1a365d" },
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
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Test mockup</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload a licensee mockup and check it against a trademark's brand guidelines (rule graph).
          Different from <code>Scan</code> — this evaluates against rules, not just identity.
        </p>
      </div>

      {/* Trademark selector */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Trademark</label>
        {trademarks.length === 0 ? (
          <div className="text-sm text-slate-400 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
            No trademarks registered yet.
          </div>
        ) : (
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white transition-all"
          >
            {trademarks.map((tm) => (
              <option key={tm.id} value={tm.id}>
                {tm.name} ({tm.ip_type})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Submitter info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Submitter email (optional)</label>
          <input
            value={submitterEmail}
            onChange={(e) => setSubmitterEmail(e.target.value)}
            placeholder="licensee@partner.com"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Note (optional)</label>
          <input
            value={submitterNote}
            onChange={(e) => setSubmitterNote(e.target.value)}
            placeholder="e.g. Spring 2026 collection mockup"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
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
            <span className="text-sm text-slate-600 font-medium">{file.name}</span>
            <button onClick={handleReset} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
              Clear
            </button>
          </div>

          {previewUrl && (
            <img src={previewUrl} alt="Preview" className="max-w-full h-auto rounded-xl border border-slate-200" />
          )}

          {/* Verdict */}
          {verdict && (
            <VerdictBlock verdict={verdict} ruleResults={ruleResults} />
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
              className="px-5 py-2.5 border border-amber-200 bg-amber-50 text-amber-700 rounded-xl text-sm font-semibold hover:bg-amber-100 transition-all disabled:opacity-50"
            >
              {requestingReview ? "Requesting…" : "Request manual review"}
            </button>
          )}
          {submission?.submission.review_requested && (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-5 py-4">
              ⏳ Manual review requested.
            </div>
          )}

          {/* Submit / re-submit */}
          {(!submissionId || verdict !== null || submission?.job?.status === "failed") && (
            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedId || trademarks.length === 0}
              className="px-6 py-3 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-xl text-sm font-semibold hover:from-rose-600 hover:to-rose-700 disabled:opacity-50 transition-all shadow-lg shadow-rose-500/20"
            >
              {submitting ? "Submitting…" : submissionId ? "Re-test" : "Test against rules"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function VerdictBlock({ verdict, ruleResults }: { verdict: Verdict; ruleResults: RuleResult[] }) {
  const badge = VERDICT_BADGE[verdict];
  return (
    <div className="space-y-4">
      <div
        className="inline-block px-4 py-2 rounded-xl font-bold text-lg"
        style={{ backgroundColor: badge.bg, color: badge.color }}
      >
        {badge.label}
      </div>

      {ruleResults.length > 0 && (
        <ul className="space-y-2">
          {ruleResults.map((rr, idx) => (
            <RuleResultRow key={idx} rr={rr} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RuleResultRow({ rr }: { rr: RuleResult }) {
  const [expanded, setExpanded] = useState(false);

  const stateBadge = {
    pass:      { label: "✓ pass",     bg: "#c6f6d5", color: "#0a3a1e" },
    fail:      { label: "✗ fail",     bg: "#fed7d7", color: "#5a0d12" },
    uncertain: { label: "? uncertain", bg: "#fff3bf", color: "#5b3a00" },
  }[rr.state];

  const borderColor =
    rr.state === "pass" ? "border-l-emerald-400"
    : rr.state === "fail" ? "border-l-red-400"
    : "border-l-amber-400";

  return (
    <li className={`bg-white rounded-xl border border-slate-200 border-l-4 ${borderColor} overflow-hidden`}>
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-slate-300 text-xs">{expanded ? "▾" : "▸"}</span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate">{rr.rule_name || rr.primitive}</div>
            <div className="text-xs text-slate-400">
              <code>{rr.primitive}</code> · severity: {rr.on_fail}
            </div>
          </div>
        </div>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: stateBadge.bg, color: stateBadge.color }}
        >
          {stateBadge.label}
        </span>
      </div>
      {expanded && (
        <div className="border-t border-slate-100 px-4 py-4 bg-slate-50/30 space-y-2 text-xs">
          <div>
            <div className="font-semibold text-slate-600 mb-1">Observed</div>
            <pre className="bg-slate-900 text-slate-100 rounded p-3 overflow-x-auto">{JSON.stringify(rr.observed, null, 2)}</pre>
          </div>
          {rr.evidence && Object.keys(rr.evidence).length > 0 && (
            <div>
              <div className="font-semibold text-slate-600 mb-1">Evidence</div>
              <pre className="bg-slate-900 text-slate-100 rounded p-3 overflow-x-auto">{JSON.stringify(rr.evidence, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
