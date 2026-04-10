import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  getCase,
  updateCase,
  deleteCase as apiDeleteCase,
  postCaseComment,
  deleteCaseComment as apiDeleteCaseComment,
  type Case,
  type CaseComment,
  type CaseDetailResponse,
  type CaseReviewStatus,
  type RuleResult,
} from "../api";
import { useAuth } from "../context/AuthContext";
import PipelineTrace from "../components/PipelineTrace";
import Avatar from "../components/Avatar";
import CommentBody from "../components/CommentBody";

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<CaseDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() {
    if (!id) return;
    try {
      const resp = await getCase(id);
      setData(resp);
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

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !data) return;
    const body = commentDraft.trim();
    if (!body) return;
    setPostingComment(true);
    try {
      const r = await postCaseComment(id, body);
      setData({ ...data, comments: [...data.comments, r.comment] });
      setCommentDraft("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPostingComment(false);
    }
  }

  async function deleteComment(commentId: string) {
    if (!id || !data) return;
    if (!confirm("Delete this comment?")) return;
    try {
      await apiDeleteCaseComment(id, commentId);
      setData({ ...data, comments: data.comments.filter((c) => c.id !== commentId) });
    } catch (e: any) {
      setError(e.message);
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
        <div className="w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
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
          <Link to="/cases" className="text-xs text-stone-400 hover:text-stone-600">
            ← All cases
          </Link>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight mt-1">
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
            className="px-4 py-2 text-sm font-semibold bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-all"
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
        <div className="bg-white rounded-2xl border border-stone-200 p-4 flex items-center gap-3">
          <div className="shrink-0 w-9 h-9 rounded-lg bg-red-50 text-red-700 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
              Source
            </div>
            <a
              href={c.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-red-700 hover:text-red-800 truncate block"
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
                  className="w-full aspect-square object-cover rounded-lg border border-stone-200"
                />
              ))}
            </div>
          ) : (
            <div className="aspect-square flex items-center justify-center text-stone-300 text-xs">
              No reference images
            </div>
          )}
          {data.trademark && (
            <div className="px-4 py-3 border-t border-stone-100">
              <Link
                to={`/registry/${data.trademark.id}`}
                className="text-xs font-semibold text-red-700 hover:text-red-800"
              >
                View IP →
              </Link>
            </div>
          )}
        </PaneCard>
      </div>

      {/* Pipeline trace */}
      <section className="space-y-3">
        <h2 className="text-lg font-black text-stone-900 tracking-tight">Pipeline trace</h2>
        <p className="text-sm text-stone-500">
          The cheap stages run on local nodes and produce the evidence trail.
          The infringement review (VLM) is the final judge when it runs;
          otherwise canonical proximity decides. Cases the model clears are
          auto-dismissed.
        </p>
        {c.review_status === "dismissed" && <DismissReasonBanner ruleResults={ruleResults} />}
        <PipelineTrace pipelineStage={c.pipeline_stage} ruleResults={ruleResults} />
      </section>

      {/* Comments */}
      <section className="space-y-4">
        <h2 className="text-lg font-black text-stone-900 tracking-tight">
          Comments
          {data.comments.length > 0 && (
            <span className="ml-2 text-sm font-semibold text-stone-400">
              {data.comments.length}
            </span>
          )}
        </h2>

        {data.comments.length === 0 ? (
          <p className="text-sm text-stone-400">
            No comments yet — be the first to add context to this case.
          </p>
        ) : (
          <ul className="space-y-3">
            {data.comments.map((comment) => (
              <CommentRow
                key={comment.id}
                comment={comment}
                isAuthor={!!user && user.id === comment.author.id}
                onDelete={() => deleteComment(comment.id)}
              />
            ))}
          </ul>
        )}

        {/* Compose */}
        <form onSubmit={postComment} className="flex gap-3 items-start pt-2">
          <Avatar
            pictureUrl={user?.picture_url ?? null}
            name={user?.display_name ?? user?.email ?? null}
            size={32}
          />
          <div className="flex-1 space-y-2">
            <textarea
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              rows={3}
              placeholder="Add a comment — visible to everyone in your workspace."
              className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-all resize-y"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-stone-400">
                Plain text for now — mentions and attachments coming soon.
              </p>
              <button
                type="submit"
                disabled={postingComment || !commentDraft.trim()}
                className="px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 disabled:opacity-50 transition-all"
              >
                {postingComment ? "Posting…" : "Post comment"}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Review actions */}
      <section className="space-y-3">
        <h2 className="text-lg font-black text-stone-900 tracking-tight">Review</h2>
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
            tone="red"
            onClick={() => setReviewStatus("pending")}
          />
        </div>
      </section>

      {/* Audit trail */}
      <div className="text-xs text-stone-400 pt-4 border-t border-stone-100">
        Created {new Date(c.created_at).toLocaleString()} · Last update{" "}
        {new Date(c.updated_at).toLocaleString()}
      </div>
    </div>
  );
}

function PaneCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-stone-100 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
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
      <div className="aspect-square flex items-center justify-center text-stone-300 text-xs">
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
    score >= 80 ? "bg-red-50 text-red-700" : score >= 60 ? "bg-red-50 text-red-700" : "bg-stone-50 text-stone-600";
  return (
    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${tone}`}>
      {score}% match
    </span>
  );
}

function ReviewBadge({ status }: { status: CaseReviewStatus }) {
  const palette: Record<CaseReviewStatus, string> = {
    pending: "bg-red-50 text-red-700",
    confirmed: "bg-red-50 text-red-700",
    dismissed: "bg-stone-100 text-stone-500",
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

function DismissReasonBanner({ ruleResults }: { ruleResults: RuleResult[] }) {
  // Mirror of the worker's auto-dismiss logic so the user can see WHY a case
  // landed in Dismissed without digging through worker logs.
  const vlm = ruleResults.find((r) => r.primitive === "vlm_infringement_check");
  const canonical = ruleResults.find((r) => r.primitive === "canonical_proximity");

  let reason: string;
  if (vlm && (vlm.state === "pass" || vlm.state === "fail")) {
    if (vlm.state === "pass") {
      const why =
        typeof (vlm.evidence as any)?.reasoning === "string"
          ? ((vlm.evidence as any).reasoning as string)
          : null;
      reason = why
        ? `The infringement review concluded this is not infringement: "${why}"`
        : "The infringement review concluded this is not infringement.";
    } else {
      // Shouldn't happen — VLM hit means the case stays pending — but render
      // something reasonable just in case.
      reason = "The infringement review flagged this as infringement.";
    }
  } else if (canonical && canonical.state !== "pass") {
    reason =
      "Canonical proximity (the auto-calibrated novelty check) did not flag this as infringement, and the VLM didn't reach a confident verdict.";
  } else {
    reason = "Auto-dismissed by the scan pipeline.";
  }

  return (
    <div className="bg-stone-50 border border-stone-200 text-stone-600 text-sm rounded-xl px-4 py-3 flex items-start gap-3">
      <div className="shrink-0 w-6 h-6 rounded-full bg-stone-200 text-stone-500 flex items-center justify-center text-xs font-bold">
        i
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-stone-700">Auto-dismissed</div>
        <div className="text-xs mt-0.5">{reason}</div>
      </div>
    </div>
  );
}

function CommentRow({
  comment,
  isAuthor,
  onDelete,
}: {
  comment: CaseComment;
  isAuthor: boolean;
  onDelete: () => void;
}) {
  return (
    <li className="flex gap-3 group">
      <Avatar
        pictureUrl={comment.author.picture_url}
        name={comment.author.display_name}
        size={32}
      />
      <div className="flex-1 min-w-0 bg-white border border-stone-200 rounded-xl px-4 py-3 space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-sm font-bold text-stone-900 truncate">
              {comment.author.display_name || "Anonymous"}
            </span>
            <span className="text-[11px] text-stone-400 shrink-0">
              {new Date(comment.created_at).toLocaleString()}
            </span>
          </div>
          {isAuthor && (
            <button
              onClick={onDelete}
              className="opacity-0 group-hover:opacity-100 text-[11px] text-stone-400 hover:text-red-500 transition-all"
              title="Delete your comment"
            >
              Delete
            </button>
          )}
        </div>
        <CommentBody body={comment.body} />
      </div>
    </li>
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
  tone: "red" | "slate" | "red";
  onClick: () => void;
}) {
  const active = current === target;
  const palette: Record<string, string> = {
    red: active
      ? "bg-red-600 text-white border-red-600"
      : "bg-white text-red-600 border-red-200 hover:bg-red-50",
    slate: active
      ? "bg-stone-900 text-white border-stone-900"
      : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50",
    red: active
      ? "bg-red-500 text-white border-red-500"
      : "bg-white text-red-700 border-red-200 hover:bg-red-50",
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
