import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  getCase,
  updateCase,
  deleteCase as apiDeleteCase,
  type Case,
  type CaseDetailResponse,
  type CaseReviewStatus,
} from "../api";
import PipelineTrace from "../components/PipelineTrace";

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<CaseDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() {
    if (!id) return;
    try {
      const resp = await getCase(id);
      setData(resp);
      if (notesDraft === "" && resp.case.notes) setNotesDraft(resp.case.notes);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // Poll while pipeline still running so the stepper updates live.
    pollRef.current = setInterval(async () => {
      if (!id) return;
      try {
        const resp = await getCase(id);
        setData(resp);
        if (resp.case.pipeline_stage === "complete" && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } catch {
        /* ignore poll errors */
      }
    }, 1500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function setReviewStatus(status: CaseReviewStatus) {
    if (!id || !data) return;
    try {
      const r = await updateCase(id, { review_status: status });
      setData({ ...data, case: { ...data.case, ...r.case } });
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function saveNotes() {
    if (!id) return;
    setSavingNotes(true);
    try {
      const r = await updateCase(id, { notes: notesDraft });
      if (data) setData({ ...data, case: { ...data.case, ...r.case } });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleDelete() {
    if (!id || !confirm("Delete this case? This cannot be undone.")) return;
    try {
      await apiDeleteCase(id);
      navigate("/cases");
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 flex justify-center">
        <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!data) {
    return <p className="text-red-600 p-8">{error || "Case not found"}</p>;
  }

  const c = data.case;
  const ruleResults = c.primitive_results?.rule_results ?? [];
  const scorePct = Math.round(c.score * 100);
  const isComplete = c.pipeline_stage === "complete";

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link to="/cases" className="text-xs text-slate-400 hover:text-slate-600">
            ← All cases
          </Link>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Case · {data.trademark?.name ?? "Unknown IP"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <ScoreBadge score={scorePct} />
            <ReviewBadge status={c.review_status} />
            {!isComplete && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Pipeline · {c.pipeline_stage}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <button
            onClick={() => alert("Export coming soon — we'll bundle the screenshot, pipeline trace, evidence and signed timestamp into a PDF dossier.")}
            className="px-4 py-2 text-sm font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all"
          >
            Export report
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-sm text-red-500 border border-red-100 rounded-xl hover:bg-red-50 transition-all"
          >
            Delete
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-5 py-4">
          {error}
        </div>
      )}

      {/* Source link row */}
      {c.source_url && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="shrink-0 w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Source
            </div>
            <a
              href={c.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-rose-600 hover:text-rose-700 truncate block"
            >
              {c.source_url}
            </a>
          </div>
        </div>
      )}

      {/* Two-column hero: scanned image + matched asset */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PaneCard label="Scanned image">
          <CaseScreenshot c={c} />
        </PaneCard>
        <PaneCard label={`Matched asset · ${data.trademark?.name ?? ""}`}>
          {data.reference_images.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 p-3">
              {data.reference_images.map((ref) => (
                <img
                  key={ref.id}
                  src={ref.image_url}
                  alt=""
                  className="w-full aspect-square object-cover rounded-lg border border-slate-200"
                />
              ))}
            </div>
          ) : (
            <div className="aspect-square flex items-center justify-center text-slate-300 text-xs">
              No reference images
            </div>
          )}
          {data.trademark && (
            <div className="px-4 py-3 border-t border-slate-100">
              <Link
                to={`/registry/${data.trademark.id}`}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700"
              >
                View IP →
              </Link>
            </div>
          )}
        </PaneCard>
      </div>

      {/* Pipeline trace */}
      <section className="space-y-3">
        <h2 className="text-lg font-black text-slate-900 tracking-tight">Pipeline trace</h2>
        <p className="text-sm text-slate-500">
          Each stage runs cheap → expensive. We stop early when a stage clears with margin or
          drops the candidate, saving compute and producing only legitimate cases.
        </p>
        <PipelineTrace pipelineStage={c.pipeline_stage} ruleResults={ruleResults} />
      </section>

      {/* Notes */}
      <section className="space-y-3">
        <h2 className="text-lg font-black text-slate-900 tracking-tight">Notes</h2>
        <textarea
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          rows={4}
          placeholder="Investigation notes, internal context, follow-up actions…"
          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all resize-y"
        />
        <button
          onClick={saveNotes}
          disabled={savingNotes || notesDraft === (c.notes ?? "")}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 transition-all"
        >
          {savingNotes ? "Saving…" : "Save notes"}
        </button>
      </section>

      {/* Review actions */}
      <section className="space-y-3">
        <h2 className="text-lg font-black text-slate-900 tracking-tight">Review</h2>
        <div className="flex flex-wrap gap-2">
          <ReviewButton
            current={c.review_status}
            target="confirmed"
            label="Confirm infringement"
            tone="red"
            onClick={() => setReviewStatus("confirmed")}
          />
          <ReviewButton
            current={c.review_status}
            target="dismissed"
            label="Dismiss false positive"
            tone="slate"
            onClick={() => setReviewStatus("dismissed")}
          />
          <ReviewButton
            current={c.review_status}
            target="pending"
            label="Reset to pending"
            tone="amber"
            onClick={() => setReviewStatus("pending")}
          />
        </div>
      </section>

      {/* Audit trail */}
      <div className="text-xs text-slate-400 pt-4 border-t border-slate-100">
        Created {new Date(c.created_at).toLocaleString()} · Last update{" "}
        {new Date(c.updated_at).toLocaleString()}
      </div>
    </div>
  );
}

function PaneCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        {label}
      </div>
      {children}
    </div>
  );
}

function CaseScreenshot({ c }: { c: Case }) {
  // Bbox is stamped on the detect-stage rule's evidence by the worker.
  const detectRow = c.primitive_results?.rule_results.find(
    (r) => r.rule_id === "stage:detect"
  );
  const bbox = (detectRow?.evidence as any)?.bbox as
    | [number, number, number, number]
    | undefined;

  // Use a plain <img> + absolutely-positioned SVG overlay so we don't need
  // canvas pixel access (S3 presigned GETs don't return CORS headers, which
  // tainted the canvas approach). The SVG viewBox auto-scales to whatever the
  // <img> renders at.
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  if (!c.image_url) {
    return (
      <div className="aspect-square flex items-center justify-center text-slate-300 text-xs">
        no screenshot
      </div>
    );
  }

  return (
    <div className="relative">
      <img
        src={c.image_url}
        alt="Scanned"
        onLoad={(e) => {
          const img = e.currentTarget;
          setNatural({ w: img.naturalWidth, h: img.naturalHeight });
        }}
        className="block w-full h-auto"
      />
      {bbox && natural && (
        <svg
          viewBox={`0 0 ${natural.w} ${natural.h}`}
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          <rect
            x={bbox[0]}
            y={bbox[1]}
            width={bbox[2]}
            height={bbox[3]}
            fill="none"
            stroke="#ef4444"
            strokeWidth={Math.max(3, natural.w / 200)}
          />
          <rect
            x={bbox[0]}
            y={Math.max(0, bbox[1] - Math.max(natural.w / 30, 22))}
            width={Math.max(natural.w / 12, 80)}
            height={Math.max(natural.w / 30, 22)}
            fill="#ef4444"
          />
          <text
            x={bbox[0] + 8}
            y={Math.max(natural.w / 50, 16) + Math.max(0, bbox[1] - Math.max(natural.w / 30, 22))}
            fill="#fff"
            fontSize={Math.max(natural.w / 50, 16)}
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            {(c.score * 100).toFixed(0)}%
          </text>
        </svg>
      )}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 80 ? "bg-red-50 text-red-700" : score >= 60 ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-600";
  return (
    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${tone}`}>
      {score}% match
    </span>
  );
}

function ReviewBadge({ status }: { status: CaseReviewStatus }) {
  const palette: Record<CaseReviewStatus, string> = {
    pending: "bg-amber-50 text-amber-700",
    confirmed: "bg-red-50 text-red-700",
    dismissed: "bg-slate-100 text-slate-500",
  };
  const label: Record<CaseReviewStatus, string> = {
    pending: "Pending review",
    confirmed: "Confirmed",
    dismissed: "Dismissed",
  };
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${palette[status]}`}>
      {label[status]}
    </span>
  );
}

function ReviewButton({
  current,
  target,
  label,
  tone,
  onClick,
}: {
  current: CaseReviewStatus;
  target: CaseReviewStatus;
  label: string;
  tone: "red" | "slate" | "amber";
  onClick: () => void;
}) {
  const active = current === target;
  const palette: Record<string, string> = {
    red: active
      ? "bg-red-600 text-white border-red-600"
      : "bg-white text-red-600 border-red-200 hover:bg-red-50",
    slate: active
      ? "bg-slate-900 text-white border-slate-900"
      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
    amber: active
      ? "bg-amber-500 text-white border-amber-500"
      : "bg-white text-amber-700 border-amber-200 hover:bg-amber-50",
  };
  return (
    <button
      onClick={onClick}
      disabled={active}
      className={`px-4 py-2 text-sm font-semibold border rounded-xl transition-all ${palette[tone]}`}
    >
      {label}
    </button>
  );
}
