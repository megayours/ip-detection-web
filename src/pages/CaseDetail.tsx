import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  getCase,
  listCrossSiteMatches,
  updateCase,
  deleteCase as apiDeleteCase,
  postCaseComment,
  deleteCaseComment as apiDeleteCaseComment,
  type Case,
  type CaseComment,
  type CaseDetailResponse,
  type CaseEnrichment,
  type CaseReviewStatus,
  type CrossSiteExternalMatch,
  type CrossSiteInternalMatch,
  type MonitorEvidence,
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
  const [crossSiteInternal, setCrossSiteInternal] = useState<CrossSiteInternalMatch[] | null>(null);
  const [crossSiteExternal, setCrossSiteExternal] = useState<CrossSiteExternalMatch[] | null>(null);
  const [crossSiteLoading, setCrossSiteLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const xsitePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!id) return;
    setCrossSiteInternal(null);
    setCrossSiteExternal(null);
    setCrossSiteLoading(true);

    async function fetchOnce() {
      try {
        const r = await listCrossSiteMatches(id!);
        setCrossSiteInternal(r.internal);
        setCrossSiteExternal(r.external);
      } catch {
        setCrossSiteInternal([]);
        setCrossSiteExternal([]);
      } finally {
        setCrossSiteLoading(false);
      }
    }

    void fetchOnce();
    // The open-web search runs as a background job after enrichment lands —
    // poll for a minute so the panel updates when results arrive.
    let ticks = 0;
    xsitePollRef.current = setInterval(() => {
      ticks += 1;
      void fetchOnce();
      if (ticks >= 20 && xsitePollRef.current) {
        clearInterval(xsitePollRef.current);
        xsitePollRef.current = null;
      }
    }, 3000);
    return () => {
      if (xsitePollRef.current) clearInterval(xsitePollRef.current);
    };
  }, [id]);

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

      {/* Evidence panel. Monitor cases (produced by the brand-monitoring
          worker) never run the scan-pipeline rule graph, so the old
          "Pipeline trace" is meaningless for them. We detect by absence of
          rule_results — if there's no rule graph output, it's a monitor case
          and we show the monitor-specific evidence panel (with graceful
          fallback to the case row when the linked result-row is missing). */}
      {isMonitorCase(c) && (
        <ListingContextPanel enrichment={data.enrichment ?? null} sourceUrl={c.source_url} />
      )}

      {isMonitorCase(c) && (
        <CrossSitePanel
          internal={crossSiteInternal}
          external={crossSiteExternal}
          loading={crossSiteLoading}
        />
      )}

      {isMonitorCase(c) ? (
        <MonitorEvidencePanel
          evidence={data.monitor_evidence ?? null}
          fallback={{
            score: c.score,
            source_url: c.source_url,
            image_url: c.image_url ?? null,
            trademark_name: data.trademark?.name ?? null,
            created_at: c.created_at,
          }}
        />
      ) : (
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
      )}

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

/**
 * True for cases produced by the brand-monitoring worker (vs. scan or
 * submission). Heuristic: monitor cases never write rule_results, so the
 * absence of any rule results combined with pipeline_stage=='complete' is a
 * strong signal. Works whether or not the linked reverse_search_results row
 * is present.
 */
function isMonitorCase(c: Case): boolean {
  if (c.pipeline_stage !== "complete") return false;
  const rr = c.primitive_results?.rule_results ?? [];
  return rr.length === 0;
}

interface MonitorEvidenceFallback {
  score: number;
  source_url: string | null;
  image_url: string | null;
  trademark_name: string | null;
  created_at: string;
}

function MonitorEvidencePanel({
  evidence,
  fallback,
}: {
  evidence: MonitorEvidence | null;
  fallback: MonitorEvidenceFallback;
}) {
  // Either source supplies the same fields; evidence wins when present
  // because it has the richer match metadata (inliers, VLM verdict, etc.).
  const simPct = Math.round((evidence?.similarity_score ?? fallback.score) * 100);
  const inliers = evidence?.inliers ?? 0;
  const bucket = evidence?.match_bucket ?? "unknown";
  const vlmRan = !!evidence?.vlm_verdict;
  const pageUrl = evidence?.page_url ?? fallback.source_url ?? "";
  const imageUrl = evidence?.image_url ?? fallback.image_url ?? null;
  const domain = evidence?.domain ?? null;
  const keyword = evidence?.keyword ?? null;
  const runCreatedAt = evidence?.run_created_at ?? fallback.created_at;
  const matchedRefUrl = evidence?.matched_ref_image_url ?? null;

  let host: string | null = null;
  try {
    host = pageUrl ? new URL(pageUrl).hostname.replace(/^www\./, "") : null;
  } catch {
    host = domain;
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-stone-900 tracking-tight">
          Monitor evidence
        </h2>
        <p className="text-sm text-stone-500">
          Detected by the brand-monitoring scraper. Three signals decide whether
          a candidate becomes a ticket: semantic embedding similarity,
          structural keypoint inliers, and (for borderline matches) a local VLM
          verdict.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SignalCard
          label="Semantic"
          value={`${simPct}%`}
          sub="SigLIP-2 cosine vs IP centroid"
          tone={simPct >= 80 ? "red" : simPct >= 60 ? "amber" : "slate"}
        />
        <SignalCard
          label="Structural"
          value={evidence ? `${inliers}` : "—"}
          sub={
            !evidence
              ? "Evidence not recorded for this case"
              : bucket === "high"
                ? "RANSAC inliers · ≥12 high-conf"
                : bucket === "borderline"
                  ? "RANSAC inliers · 6–11 borderline"
                  : bucket === "vlm_only"
                    ? "Skipped — thumbnail-grade image, VLM was the gate"
                    : "RANSAC inliers"
          }
          tone={bucket === "high" ? "red" : bucket === "borderline" ? "amber" : "slate"}
        />
        <SignalCard
          label="VLM"
          value={
            !evidence
              ? "—"
              : !vlmRan
                ? "skipped"
                : evidence.vlm_verdict === "present"
                  ? "match"
                  : evidence.vlm_verdict ?? "—"
          }
          sub={
            !evidence
              ? "Evidence not recorded for this case"
              : !vlmRan
                ? "Not needed at this confidence"
                : `Local Qwen rerank${
                    evidence.vlm_confidence != null
                      ? ` · conf ${Math.round((evidence.vlm_confidence ?? 0) * 100)}%`
                      : ""
                  }`
          }
          tone={
            !evidence ? "slate" : !vlmRan ? "slate" : evidence.vlm_verdict === "present" ? "red" : "slate"
          }
        />
      </div>

      {evidence?.vlm_reasoning && (
        <div className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-700">
          <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
            VLM reasoning
          </div>
          {evidence.vlm_reasoning}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-stone-100 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
          Source
        </div>
        <dl className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
              Domain
            </dt>
            <dd className="text-stone-800 truncate">{host ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
              Keyword
            </dt>
            <dd className="text-stone-800">
              {keyword ? (
                <code className="font-mono text-xs bg-stone-100 px-1.5 py-0.5 rounded">
                  {keyword}
                </code>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div className="sm:col-span-2 min-w-0">
            <dt className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
              Page URL
            </dt>
            <dd className="min-w-0">
              {pageUrl ? (
                <a
                  href={pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-red-700 hover:text-red-800 truncate block"
                >
                  {pageUrl}
                </a>
              ) : (
                <span className="text-stone-400">—</span>
              )}
            </dd>
          </div>
          {imageUrl && (
            <div className="sm:col-span-2 min-w-0">
              <dt className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                Candidate image URL
              </dt>
              <dd className="min-w-0">
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-red-700 hover:text-red-800 truncate block"
                >
                  {imageUrl}
                </a>
              </dd>
            </div>
          )}
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
              {evidence ? "Run" : "Created"}
            </dt>
            <dd className="text-stone-600 text-xs">
              {new Date(runCreatedAt).toLocaleString()}
            </dd>
          </div>
        </dl>
      </div>

      {matchedRefUrl && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-stone-100 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
            Best-match reference image
          </div>
          <div className="p-3">
            <img
              src={matchedRefUrl}
              alt=""
              className="max-h-72 mx-auto block rounded-lg border border-stone-200"
            />
          </div>
        </div>
      )}

      {!evidence && (
        <div className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-xs text-stone-500">
          Detailed evidence (RANSAC inliers, VLM verdict, exact run metadata)
          isn't recorded for this case. New cases produced after the
          recent worker update include the full breakdown.
        </div>
      )}
    </section>
  );
}

function CrossSitePanel({
  internal,
  external,
  loading,
}: {
  internal: CrossSiteInternalMatch[] | null;
  external: CrossSiteExternalMatch[] | null;
  loading: boolean;
}) {
  const internalReady = internal !== null;
  const externalReady = external !== null;
  const internalCount = internal?.length ?? 0;
  const externalCount = external?.length ?? 0;

  // Initial first-load spinner.
  if (loading && !internalReady && !externalReady) {
    return (
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-black text-stone-900 tracking-tight">
            Also found on
          </h2>
          <p className="text-sm text-stone-500">
            Where else this image is being sold — both from your monitor
            history and from an open-web Brave search.
          </p>
        </div>
        <div className="bg-stone-50 border border-stone-200 rounded-xl px-5 py-4 flex items-center gap-3 text-sm text-stone-600">
          <span className="w-3 h-3 border-2 border-stone-400 border-t-transparent rounded-full animate-spin shrink-0" />
          Searching…
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-stone-900 tracking-tight">
          Also found on
        </h2>
        <p className="text-sm text-stone-500">
          Where else this image is being sold — both from your monitor
          history and from an open-web Brave search after enrichment.
        </p>
      </div>

      {/* INTERNAL — monitor history */}
      <div className="space-y-2">
        <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
          From your monitor history ({internalCount})
        </div>
        {internalCount === 0 ? (
          <div className="text-xs text-stone-500 px-1">
            No other monitored domain has the same image yet.
          </div>
        ) : (
          <div className="grid gap-2">
            {internal!.map((m) => (
              <InternalRow key={m.result_id} m={m} />
            ))}
          </div>
        )}
      </div>

      {/* EXTERNAL — open-web Brave */}
      <div className="space-y-2">
        <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
          From the open web · Brave title search ({externalCount})
        </div>
        {externalCount === 0 ? (
          <div className="text-xs text-stone-500 px-1">
            {externalReady
              ? "No matches found across the open web. Title-based search runs once after enrichment; it can take a minute."
              : "Searching…"}
          </div>
        ) : (
          <div className="grid gap-2">
            {external!.map((m) => (
              <ExternalRow key={m.id} m={m} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function InternalRow({ m }: { m: CrossSiteInternalMatch }) {
  const simPct = Math.round(m.similarity * 100);
  return (
    <div className="bg-white rounded-2xl border border-stone-200 px-4 py-3 flex items-center gap-3">
      {m.image_url && (
        <img
          src={m.image_url}
          alt=""
          className="shrink-0 w-14 h-14 rounded-lg object-cover border border-stone-200"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-stone-900 truncate">
          {m.listing_title ?? m.page_url}
        </div>
        <div className="text-xs text-stone-500 truncate">
          {m.domain}
          {m.seller_name ? ` · ${m.seller_name}` : ""}
        </div>
        <div className="mt-1 flex items-center gap-2 text-[11px]">
          <span className="inline-flex items-center bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-semibold">
            {simPct}% match
          </span>
          {m.review_status && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full font-semibold ${
                m.review_status === "confirmed"
                  ? "bg-red-50 text-red-700"
                  : m.review_status === "dismissed"
                    ? "bg-stone-100 text-stone-500"
                    : "bg-amber-50 text-amber-700"
              }`}
            >
              {m.review_status}
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1.5">
        <a
          href={m.page_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-red-700 hover:text-red-800 underline"
        >
          Open listing →
        </a>
        {m.case_id && (
          <Link
            to={`/cases/${m.case_id}`}
            className="text-xs font-semibold text-stone-500 hover:text-stone-900"
          >
            View case →
          </Link>
        )}
      </div>
    </div>
  );
}

function ExternalRow({ m }: { m: CrossSiteExternalMatch }) {
  const simPct = Math.round(m.similarity_score * 100);
  let host: string | null = null;
  try {
    host = new URL(m.page_url).hostname.replace(/^www\./, "");
  } catch {
    host = null;
  }
  return (
    <div className="bg-white rounded-2xl border border-stone-200 px-4 py-3 flex items-center gap-3">
      {m.image_url && (
        <img
          src={m.image_url}
          alt=""
          className="shrink-0 w-14 h-14 rounded-lg object-cover border border-stone-200"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-stone-900 truncate">
          {m.title ?? m.page_url}
        </div>
        <div className="text-xs text-stone-500 truncate">{host ?? m.page_url}</div>
        <div className="mt-1 flex items-center gap-2 text-[11px]">
          <span className="inline-flex items-center bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-semibold">
            {simPct}% match
          </span>
          <span className="inline-flex items-center bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider text-[10px]">
            {m.source.replace(/_/g, " ")}
          </span>
        </div>
      </div>
      <div className="shrink-0">
        <a
          href={m.page_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-red-700 hover:text-red-800 underline"
        >
          Open listing →
        </a>
      </div>
    </div>
  );
}

function ListingContextPanel({
  enrichment,
  sourceUrl,
}: {
  enrichment: CaseEnrichment | null;
  sourceUrl: string | null;
}) {
  // No row yet → still enriching (worker hasn't processed enrich_case job).
  if (!enrichment) {
    return (
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-black text-stone-900 tracking-tight">
            Listing context
          </h2>
          <p className="text-sm text-stone-500">
            What the listing page itself says — seller, price, location, etc. —
            extracted by the VLM for the legal record.
          </p>
        </div>
        <div className="bg-stone-50 border border-stone-200 rounded-xl px-5 py-4 flex items-center gap-3 text-sm text-stone-600">
          <span className="w-3 h-3 border-2 border-stone-400 border-t-transparent rounded-full animate-spin shrink-0" />
          Fetching the listing page and asking the VLM for seller/price/location… this runs once per case in the background.
        </div>
      </section>
    );
  }

  // Enrichment row exists but the worker recorded an error.
  if (enrichment.error) {
    return (
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-black text-stone-900 tracking-tight">
            Listing context
          </h2>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
          <div className="font-semibold mb-1">Couldn't enrich this listing</div>
          <div className="text-xs">{enrichment.error}</div>
          {sourceUrl && (
            <div className="mt-2 text-xs">
              Open the page manually:{" "}
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {sourceUrl}
              </a>
            </div>
          )}
        </div>
      </section>
    );
  }

  // Successful enrichment.
  const facts: Array<{ label: string; value: string | null; isLink?: boolean }> = [
    { label: "Seller", value: enrichment.seller_name },
    { label: "Seller profile", value: enrichment.seller_profile_url, isLink: true },
    { label: "Listing title", value: enrichment.listing_title },
    { label: "Price", value: enrichment.price },
    { label: "Location", value: enrichment.location },
    { label: "Platform", value: enrichment.platform },
    {
      label: "Creator",
      value: enrichment.creator_type ? prettyEnum(enrichment.creator_type) : null,
    },
  ];
  const presentFacts = facts.filter((f) => f.value && f.value.trim());

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-stone-900 tracking-tight">
          Listing context
        </h2>
        <p className="text-sm text-stone-500">
          Extracted from the listing page by the VLM. Use this for the legal record.
        </p>
      </div>

      {/* Why-this-is-the-same-idea: the headline explanation */}
      {enrichment.match_explanation && (
        <div className="bg-red-50/70 border border-red-100 rounded-xl px-5 py-4">
          <div className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1">
            Why this is the same idea
          </div>
          <div className="text-sm text-stone-800">{enrichment.match_explanation}</div>
        </div>
      )}

      {/* Two assessment cards side-by-side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AssessmentCard
          label="License status"
          value={prettyEnum(enrichment.license_status ?? "unclear")}
          tone={licenseTone(enrichment.license_status)}
          sub={
            enrichment.license_confidence != null
              ? `Confidence ${Math.round((enrichment.license_confidence ?? 0) * 100)}%`
              : undefined
          }
          reasoning={enrichment.license_reasoning}
        />
        <AssessmentCard
          label="Infringement type"
          value={prettyEnum(enrichment.infringement_type ?? "unclear")}
          tone={infringementTone(enrichment.infringement_type)}
          reasoning={enrichment.infringement_reasoning}
        />
      </div>

      {/* Listing facts */}
      {presentFacts.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <dl className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {presentFacts.map((f) => (
              <div key={f.label} className="min-w-0">
                <dt className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                  {f.label}
                </dt>
                <dd className="text-stone-800 truncate">
                  {f.isLink && f.value ? (
                    <a
                      href={f.value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-700 hover:text-red-800 underline truncate block"
                    >
                      {f.value}
                    </a>
                  ) : (
                    f.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
          {enrichment.description_summary && (
            <div className="border-t border-stone-100 px-4 py-3">
              <dt className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
                Description
              </dt>
              <dd className="text-sm text-stone-700">{enrichment.description_summary}</dd>
            </div>
          )}
          {enrichment.notes && (
            <div className="border-t border-stone-100 px-4 py-3">
              <dt className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
                VLM observation
              </dt>
              <dd className="text-sm text-stone-700">{enrichment.notes}</dd>
            </div>
          )}
          <div className="border-t border-stone-100 px-4 py-2 text-[11px] text-stone-400">
            Enriched {new Date(enrichment.enriched_at).toLocaleString()}
          </div>
        </div>
      )}

      {/* Triage actions — mockups for now; click logs to console, opens
          either an external link or a templated letter modal. */}
      <ActionRow enrichment={enrichment} sourceUrl={sourceUrl} />
    </section>
  );
}

function prettyEnum(s: string): string {
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function licenseTone(s: string | null | undefined): "red" | "amber" | "slate" | "emerald" {
  switch (s) {
    case "likely_unlicensed":
      return "red";
    case "likely_licensed":
      return "emerald";
    case "unclear":
    default:
      return "slate";
  }
}

function infringementTone(
  s: string | null | undefined,
): "red" | "amber" | "slate" {
  switch (s) {
    case "full_copy":
      return "red";
    case "derivative":
      return "amber";
    case "different_class":
      return "amber";
    case "unclear":
    default:
      return "slate";
  }
}

function AssessmentCard({
  label,
  value,
  tone,
  sub,
  reasoning,
}: {
  label: string;
  value: string;
  tone: "red" | "amber" | "slate" | "emerald";
  sub?: string;
  reasoning?: string | null;
}) {
  const palette: Record<string, string> = {
    red: "bg-red-50 text-red-700 border-red-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    slate: "bg-stone-50 text-stone-600 border-stone-200",
  };
  return (
    <div className={`rounded-2xl border px-4 py-3 space-y-2 ${palette[tone]}`}>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">
          {label}
        </div>
        <div className="text-xl font-black mt-0.5">{value}</div>
        {sub && <div className="text-[11px] mt-0.5 opacity-80">{sub}</div>}
      </div>
      {reasoning && (
        <div className="text-xs opacity-90 leading-relaxed border-t border-current/10 pt-2">
          {reasoning}
        </div>
      )}
    </div>
  );
}

function ActionRow({
  enrichment,
  sourceUrl,
}: {
  enrichment: CaseEnrichment;
  sourceUrl: string | null;
}) {
  const [modal, setModal] = useState<"cd" | "takedown" | null>(null);

  const lensUrl = sourceUrl
    ? `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(sourceUrl)}`
    : null;

  return (
    <>
      <div className="space-y-2">
        <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
          Actions
        </div>
        <div className="flex flex-wrap gap-2">
          {enrichment.seller_profile_url && (
            <a
              href={enrichment.seller_profile_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs font-semibold text-stone-700"
            >
              View seller profile →
            </a>
          )}
          {lensUrl && (
            <a
              href={lensUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs font-semibold text-stone-700"
              title="Find this same image elsewhere on the web via Google Lens"
            >
              Find similar listings (Google Lens) →
            </a>
          )}
          <button
            onClick={() => setModal("cd")}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-semibold text-white"
          >
            Generate cease &amp; desist
          </button>
          <button
            onClick={() => setModal("takedown")}
            className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-xs font-semibold text-white"
          >
            Draft takedown notice
          </button>
        </div>
      </div>
      {modal && (
        <ActionLetterModal
          kind={modal}
          enrichment={enrichment}
          sourceUrl={sourceUrl}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

function ActionLetterModal({
  kind,
  enrichment,
  sourceUrl,
  onClose,
}: {
  kind: "cd" | "takedown";
  enrichment: CaseEnrichment;
  sourceUrl: string | null;
  onClose: () => void;
}) {
  const today = new Date().toLocaleDateString();
  const seller = enrichment.seller_name || "[Seller name]";
  const platform = enrichment.platform || "[Platform]";
  const listing = enrichment.listing_title || "[Listing title]";
  const url = sourceUrl || "[Listing URL]";

  const body =
    kind === "cd"
      ? `${today}

To: ${seller}
Re: Unauthorized use of intellectual property — ${listing}

Dear ${seller},

We represent the owner of the intellectual property depicted in the listing
referenced above, currently offered for sale on ${platform} at:
  ${url}

We have determined that this listing reproduces our client's protected work
without authorization. Our VLM-assisted review classified the use as
"${prettyEnum(enrichment.infringement_type ?? "unclear")}" and judged the
listing "${prettyEnum(enrichment.license_status ?? "unclear")}".

${enrichment.match_explanation ?? ""}

Please cease all sale, distribution, and display of this item within seven (7)
days of receipt. Confirm in writing that you have done so. Failure to comply
will result in enforcement action including a takedown notice to ${platform}
and any further remedies available under applicable law.

Sincerely,
[Rights-holder / counsel name]`
      : `${today}

DMCA / Marketplace Takedown Notice — ${platform}

The undersigned, on behalf of the rights-holder of the intellectual property
depicted in the following listing, requests that ${platform} remove the
material identified below:

  Listing title:   ${listing}
  Listing URL:     ${url}
  Seller:          ${seller}
  Platform:        ${platform}
  Detected match:  ${enrichment.match_explanation ?? "[describe the IP match]"}
  Infringement:    ${prettyEnum(enrichment.infringement_type ?? "unclear")}
  License status:  ${prettyEnum(enrichment.license_status ?? "unclear")}

I have a good-faith belief that the use of the material described above is
not authorized by the rights-holder, its agent, or the law. I declare under
penalty of perjury that the information in this notification is accurate.

[Rights-holder / counsel signature, contact details]`;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl border border-stone-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden"
      >
        <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
              Mockup — copy &amp; edit before sending
            </div>
            <h3 className="font-bold text-stone-900">
              {kind === "cd" ? "Cease & desist letter" : "Takedown notice"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 text-lg font-bold leading-none px-2"
          >
            ×
          </button>
        </div>
        <textarea
          readOnly
          value={body}
          className="flex-1 px-5 py-4 text-sm font-mono whitespace-pre-wrap resize-none outline-none"
        />
        <div className="px-5 py-3 border-t border-stone-100 flex items-center justify-end gap-2">
          <button
            onClick={() => navigator.clipboard.writeText(body)}
            className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs font-semibold text-stone-700"
          >
            Copy to clipboard
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-xs font-semibold text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function SignalCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "red" | "amber" | "slate";
}) {
  const palette: Record<string, string> = {
    red: "bg-red-50 text-red-700 border-red-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    slate: "bg-stone-50 text-stone-600 border-stone-200",
  };
  return (
    <div className={`rounded-2xl border px-4 py-3 ${palette[tone]}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">
        {label}
      </div>
      <div className="text-2xl font-black mt-0.5">{value}</div>
      <div className="text-[11px] mt-1 opacity-80">{sub}</div>
    </div>
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
  tone: "red" | "slate";
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
