import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  deleteIpReview,
  dismissIpReviewFinding,
  getIpReview,
  openIpReviewFindingTakedownPacket,
  openIpReviewReport,
  listMonitoredDomains,
  setIpReviewMatchDecision,
  triggerMonitoringRun,
  updateIpReviewDecision,
  type IpReview,
  type IpReviewDecision,
  type IpReviewFinding,
  type IpReviewMatch,
  type IpReviewMatchDecision,
  type IpReviewMatchDecisionValue,
  type MonitoredDomain,
  type RightsType,
  type RiskBand,
} from "../api";

/**
 * Result page for a single guided IP review. Mirrors the PDF layout 1:1
 * (header → verdict banner → verdict lines → matched references →
 * context → legal review → scope disclosure → evidence packet) so the
 * downloadable report reads as a faithful copy of what the lawyer just
 * approved on screen.
 *
 * Polls every 3s while `status === "processing"`.
 */
export default function IpReviewDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [review, setReview] = useState<IpReview | null>(null);
  const [error, setError] = useState("");
  const [legalOpen, setLegalOpen] = useState(false);

  const reload = useCallback(async () => {
    try {
      const { review } = await getIpReview(id);
      setReview(review);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load review");
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!review) return;
    // Clearance: poll only while the detection job is running.
    // Monitoring: poll every 10s — findings are produced asynchronously
    // by the scheduler, so a "complete" status still expects fresh data
    // to keep flowing in.
    let interval: number | null = null;
    if (review.status === "processing") interval = 3000;
    else if (review.mode === "monitoring") interval = 10000;
    if (interval == null) return;
    const t = setInterval(reload, interval);
    return () => clearInterval(t);
  }, [review, reload]);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8 text-sm text-red-600">{error}</div>
    );
  }
  if (!review) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8 text-sm text-stone-400">
        Loading review…
      </div>
    );
  }

  const hasFlagged = (review.match_decisions ?? []).some(
    (d) => d.decision === "flag",
  );

  async function handleDelete() {
    if (!confirm("Delete this review?")) return;
    await deleteIpReview(id);
    navigate("/clearance");
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <Header
        review={review}
        hasFlagged={hasFlagged}
        onOpenLegalReview={() => setLegalOpen(true)}
        onDelete={handleDelete}
      />
      {review.status === "processing" && <ProcessingNotice />}
      {review.status === "failed" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Review failed. The detection job hit an error — check the worker logs
          or rerun the wizard.
        </div>
      )}

      {review.mode === "clearance" && review.status === "complete" && review.result && (
        <>
          <ContextSection review={review} />
          <ScopeDisclosure lines={review.result.scope_disclosure} />
          {review.result.verdict_lines.length > 0 && (
            <VerdictLines lines={review.result.verdict_lines} />
          )}
          <MatchedReferences
            matches={review.result.matches}
            reviewId={review.id}
            assetImageUrl={review.asset_image_url ?? ""}
            decisions={review.match_decisions ?? []}
            onUpdated={reload}
          />
        </>
      )}

      {review.mode === "monitoring" && (
        <MonitoringView review={review} onUpdated={reload} />
      )}

      {legalOpen && (
        <LegalReviewModal
          review={review}
          onClose={() => setLegalOpen(false)}
          onUpdated={reload}
        />
      )}
    </div>
  );
}

function Header({
  review,
  hasFlagged,
  onOpenLegalReview,
  onDelete,
}: {
  review: IpReview;
  hasFlagged: boolean;
  onOpenLegalReview: () => void;
  onDelete: () => void;
}) {
  const isMonitoring = review.mode === "monitoring";
  const showRiskStrip =
    review.mode === "clearance" && review.status === "complete" && !!review.result;
  // Legal review button is gated on at least one flagged match — the user
  // shouldn't lock a decision before they've actually triaged the matches.
  // Once a decision is locked, keep the button visible (rebadged) so they
  // can revise it.
  const showLegalReviewButton =
    !isMonitoring && review.status === "complete" && (hasFlagged || !!review.decision);
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex items-start gap-5">
        {review.asset_image_url && (
          <img
            src={review.asset_image_url}
            alt=""
            className="w-40 h-40 lg:w-56 lg:h-56 rounded-xl object-cover border border-stone-200 shrink-0"
          />
        )}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight truncate">{review.title}</h1>
              <div className="text-xs text-stone-400 mt-0.5">
                {isMonitoring
                  ? `Monitoring review${review.monitored_ip?.name ? ` · ${review.monitored_ip.name}` : ""}`
                  : "Clearance review"}
                {" · "}created {new Date(review.created_at).toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              <StatusPill status={review.status} />
              {showLegalReviewButton && (
                <button
                  type="button"
                  onClick={onOpenLegalReview}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    review.decision
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-stone-900 text-white hover:bg-stone-800"
                  }`}
                >
                  {review.decision ? "Decision locked" : "Legal review"}
                </button>
              )}
              {!isMonitoring && review.status === "complete" && (
                <ExportPdfButton reviewId={review.id} />
              )}
              <button
                type="button"
                onClick={onDelete}
                title="Delete review"
                className="px-2 py-1.5 rounded-lg border border-stone-200 text-stone-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-xs font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
          {showRiskStrip && review.result && (
            <RiskStrip segments={review.result.segments} />
          )}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: IpReview["status"] }) {
  const cls =
    status === "complete"
      ? "bg-emerald-100 text-emerald-700"
      : status === "failed"
        ? "bg-red-100 text-red-700"
        : "bg-blue-100 text-blue-700";
  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${cls}`}>
      {status}
    </span>
  );
}

function ProcessingNotice() {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-sm text-blue-800">
      Detection running. The page refreshes every few seconds.
    </div>
  );
}

const RIGHTS_LABEL: Record<RightsType, string> = {
  copyright: "Copyright",
  trademark: "Trademark",
  design: "Design right",
  publicity: "Publicity / likeness",
};

// Tooltip copy. Surfaces on hover so the user can decode each segment
// without leaving the page. A character match fires both copyright and
// publicity, which can make the two columns look identical — explain
// the distinction in plain language here.
const RIGHTS_TOOLTIP: Record<RightsType, string> = {
  copyright:
    "Original creative works (illustrations, characters, designs). Protection arises on creation; no registration needed.",
  trademark:
    "Registered brand identifiers (names, logos, slogans) — scoped to a class of goods or services.",
  design:
    "Registered design protecting a product's appearance or ornamental aspects (shape, pattern, packaging).",
  publicity:
    "Right of an identifiable person — or a fictional character associated with one — to control commercial use of their likeness. Often fires alongside copyright for character assets.",
};

const RISK_COLOR: Record<RiskBand, { box: string; chip: string; text: string }> = {
  high:   { box: "border-red-200 bg-red-50/60",   chip: "bg-red-100 text-red-700",     text: "text-red-700" },
  medium: { box: "border-amber-200 bg-amber-50/60", chip: "bg-amber-100 text-amber-700", text: "text-amber-700" },
  low:    { box: "border-yellow-200 bg-yellow-50/60", chip: "bg-yellow-100 text-yellow-700", text: "text-yellow-700" },
  clear:  { box: "border-emerald-200 bg-emerald-50/40", chip: "bg-emerald-100 text-emerald-700", text: "text-emerald-700" },
};

/**
 * Compact 2x2 risk-by-IP-type grid that lives inside the page header.
 * Replaces the older full-width 4-card banner — each cell is a small
 * pill with the rights label, risk band, top-score percentage, and
 * match count. Hover reveals a one-sentence explainer.
 */
function RiskStrip({
  segments,
}: {
  segments: Record<RightsType, { risk_band: RiskBand; top_score: number; match_ids: string[] }>;
}) {
  return (
    <div>
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
        Risk by IP type
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {(["copyright", "trademark", "design", "publicity"] as const).map((r) => {
          const s = segments[r];
          const c = RISK_COLOR[s.risk_band];
          const n = s.match_ids.length;
          return (
            <div
              key={r}
              title={RIGHTS_TOOLTIP[r]}
              className={`rounded-lg border px-3 py-2 ${c.box} cursor-help`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-stone-700 truncate">
                  {RIGHTS_LABEL[r]}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${c.chip}`}>
                  {s.risk_band}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-lg font-bold leading-none ${c.text}`}>
                  {Math.round(s.top_score * 100)}%
                </span>
                <span className="text-[10px] text-stone-500">
                  {n} match{n === 1 ? "" : "es"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VerdictLines({ lines }: { lines: string[] }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <h2 className="text-sm font-bold text-stone-900 mb-2">What this means</h2>
      <ul className="space-y-1.5 text-sm text-stone-700 list-disc pl-5">
        {lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    </div>
  );
}

const SOURCE_LABEL: Record<string, string> = {
  euipo_trademark: "EUIPO registered trademark",
  wipo_design: "WIPO Hague registered design",
  giantbomb: "Internal copyright reference (pop-culture)",
  tenant_trademark: "Tenant-registered IP",
};

function sourceLabel(s: string) {
  return SOURCE_LABEL[s] ?? s;
}

function MatchedReferences({
  matches,
  reviewId,
  assetImageUrl,
  decisions,
  onUpdated,
}: {
  matches: IpReviewMatch[];
  reviewId: string;
  assetImageUrl: string;
  decisions: IpReviewMatchDecision[];
  onUpdated: () => void;
}) {
  // Sort by combined detection score, most-likely first. Dedup defensively
  // in case the worker ever emits the same match.id twice — the row layout
  // pairs each match with the input image, so a duplicate would just clutter
  // the comparison.
  const sorted = useMemo(() => {
    const seen = new Set<string>();
    const unique: IpReviewMatch[] = [];
    for (const m of matches) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      unique.push(m);
    }
    return unique.sort(
      (a, b) => (b.scores.calibrator_combined ?? 0) - (a.scores.calibrator_combined ?? 0),
    );
  }, [matches]);

  const decisionByMatch = useMemo(() => {
    const map = new Map<string, IpReviewMatchDecision>();
    for (const d of decisions) map.set(d.match_id, d);
    return map;
  }, [decisions]);

  return (
    <div>
      <h2 className="text-sm font-bold text-stone-900 mb-2">Matched references</h2>
      <p className="text-xs text-stone-500 mb-3">
        Most likely at the top. Compare the input image with each reference, then
        flag potential infringements or dismiss the false positives.
      </p>
      {sorted.length === 0 ? (
        <div className="text-xs text-stone-400">No matches above threshold.</div>
      ) : (
        <div className="space-y-3">
          {sorted.map((m) => (
            <MatchCard
              key={m.id}
              m={m}
              reviewId={reviewId}
              assetImageUrl={assetImageUrl}
              decision={decisionByMatch.get(m.id) ?? null}
              onUpdated={onUpdated}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const DECISION_CHIP: Record<IpReviewMatchDecisionValue, string> = {
  flag: "bg-red-100 text-red-700 border-red-200",
  dismiss: "bg-stone-100 text-stone-600 border-stone-200",
};

const DECISION_LABEL: Record<IpReviewMatchDecisionValue, string> = {
  flag: "Flagged",
  dismiss: "Dismissed",
};

function MatchCard({
  m,
  reviewId,
  assetImageUrl,
  decision,
  onUpdated,
}: {
  m: IpReviewMatch;
  reviewId: string;
  assetImageUrl: string;
  decision: IpReviewMatchDecision | null;
  onUpdated: () => void;
}) {
  const [showJustification, setShowJustification] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState(decision?.note ?? "");
  const [saving, setSaving] = useState(false);

  async function commit(next: IpReviewMatchDecisionValue | null, note: string | null) {
    setSaving(true);
    try {
      await setIpReviewMatchDecision(reviewId, m.id, { decision: next, note });
      onUpdated();
      setNoteOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save decision");
    } finally {
      setSaving(false);
    }
  }

  const current = decision?.decision ?? null;
  const cardBorder =
    current === "flag"
      ? "border-red-200"
      : current === "dismiss"
        ? "border-stone-200 bg-stone-50/40"
        : "border-stone-200";

  return (
    <div className={`rounded-2xl border bg-white p-4 ${cardBorder}`}>
      <div className="flex flex-col md:flex-row items-start gap-4">
        {/* Image pair — input vs reference. Same dimensions so the lawyer
            can compare at a glance. */}
        <div className="flex items-start gap-3 shrink-0">
          <figure className="text-center">
            {assetImageUrl ? (
              <img
                src={assetImageUrl}
                alt=""
                className="w-32 h-32 lg:w-36 lg:h-36 rounded-lg object-contain bg-stone-50 border border-stone-200"
              />
            ) : (
              <div className="w-32 h-32 lg:w-36 lg:h-36 rounded-lg bg-stone-100" />
            )}
            <figcaption className="text-[10px] uppercase tracking-wider text-stone-400 mt-1">
              Input
            </figcaption>
          </figure>
          <figure className="text-center">
            {m.reference_images?.[0]?.image_url ? (
              <img
                src={m.reference_images[0].image_url}
                alt=""
                className="w-32 h-32 lg:w-36 lg:h-36 rounded-lg object-contain bg-stone-50 border border-stone-200"
              />
            ) : (
              <div className="w-32 h-32 lg:w-36 lg:h-36 rounded-lg bg-stone-100" />
            )}
            <figcaption className="text-[10px] uppercase tracking-wider text-stone-400 mt-1">
              Reference
            </figcaption>
          </figure>
        </div>

        <div className="flex-1 min-w-0 w-full">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <div className="font-semibold text-sm text-stone-900 truncate">
                {m.ip_name || "—"}
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">
                {sourceLabel(m.catalog_source)}
              </div>
            </div>
            {current && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${DECISION_CHIP[current]}`}
              >
                {DECISION_LABEL[current]}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Score label="visual" value={m.scores.visual_similarity} />
            <Score label="structural" value={Math.min(1, m.scores.structural_inliers / 30)} />
            {m.scores.ocr_match > 0 && (
              <Score label="OCR" value={m.scores.ocr_match} />
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {m.rights_types.map((r) => (
              <span
                key={r}
                title={RIGHTS_TOOLTIP[r]}
                className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-stone-100 text-stone-700 cursor-help"
              >
                {RIGHTS_LABEL[r]}
              </span>
            ))}
            {m.in_scope_territories.slice(0, 4).map((t) => (
              <span key={t} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-600">
                {t}
              </span>
            ))}
            {m.in_scope_territories.length > 4 && (
              <span className="text-[10px] text-stone-400">+{m.in_scope_territories.length - 4}</span>
            )}
            {m.category_overlap && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">
                category overlap
              </span>
            )}
          </div>

          {m.justification && (
            <button
              onClick={() => setShowJustification((v) => !v)}
              className="mt-2 text-[11px] text-stone-500 hover:text-stone-700"
            >
              {showJustification ? "Hide reasoning" : "Show reasoning"}
            </button>
          )}
          {showJustification && m.justification && (
            <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
              {m.justification}
            </p>
          )}

          {decision?.note && !noteOpen && (
            <p className="mt-2 text-[11px] text-stone-600 leading-relaxed border-l-2 border-stone-200 pl-2">
              <span className="text-stone-400">Note: </span>
              {decision.note}
            </p>
          )}

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                if (current === "flag") {
                  void commit(null, null);
                } else {
                  setNoteDraft(decision?.note ?? "");
                  setNoteOpen(true);
                }
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                current === "flag"
                  ? "bg-red-600 text-white border-red-600 hover:bg-red-700"
                  : "border-red-300 text-red-700 hover:bg-red-50"
              } disabled:opacity-50`}
            >
              {current === "flag" ? "Unflag" : "Flag as infringement"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                commit(current === "dismiss" ? null : "dismiss", decision?.note ?? null)
              }
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                current === "dismiss"
                  ? "bg-stone-700 text-white border-stone-700 hover:bg-stone-800"
                  : "border-stone-300 text-stone-700 hover:bg-stone-50"
              } disabled:opacity-50`}
            >
              {current === "dismiss" ? "Undismiss" : "Dismiss"}
            </button>
            {current === "flag" && !noteOpen && (
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setNoteDraft(decision?.note ?? "");
                  setNoteOpen(true);
                }}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold border border-stone-300 text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              >
                {decision?.note ? "Edit note" : "Add note"}
              </button>
            )}
          </div>

          {noteOpen && (
            <div className="mt-3 space-y-2">
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Why is this risky? (optional)"
                rows={3}
                className="w-full text-xs rounded-md border border-stone-300 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => commit("flag", noteDraft.trim() || null)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save as flagged"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setNoteOpen(false)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-700">
      <span className="text-stone-400">{label}</span>
      <span className="font-semibold">{Math.round(value * 100)}%</span>
    </span>
  );
}

function ContextSection({ review }: { review: IpReview }) {
  const rows: Array<[string, string]> = [
    ["Asset name", review.asset_name || "—"],
    ["Asset type", review.asset_type || "—"],
    ["Intended use", review.intended_use || "—"],
    ["Placement", review.asset_placement || "—"],
    ["Territories", review.territories.length ? review.territories.join(", ") : "All"],
    ["Categories", review.product_categories.length ? review.product_categories.join(", ") : "—"],
  ];
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50/40 p-5">
      <h2 className="text-sm font-bold text-stone-900 mb-2">Context (user-provided)</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline gap-2">
            <dt className="text-[11px] uppercase tracking-wider text-stone-500 min-w-[100px]">{k}</dt>
            <dd className="text-stone-800">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const DECISION_OPTIONS: Array<{ value: IpReviewDecision; label: string }> = [
  { value: "approved", label: "Approved" },
  { value: "approved_with_note", label: "Approved with note" },
  { value: "needs_edit", label: "Needs edit" },
  { value: "needs_license", label: "Needs license" },
  { value: "escalate", label: "Escalate" },
  { value: "do_not_use", label: "Do not use" },
  { value: "monitor", label: "Monitor" },
];

function LegalReviewModal({
  review,
  onClose,
  onUpdated,
}: {
  review: IpReview;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [decision, setDecision] = useState<IpReviewDecision | "">(review.decision ?? "");
  const [rationale, setRationale] = useState(review.decision_rationale ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // Close on Escape — modal users expect it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save() {
    setSaving(true);
    setErr("");
    try {
      await updateIpReviewDecision(review.id, {
        decision: decision || null,
        decision_rationale: rationale.trim() || null,
      });
      onUpdated();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const flaggedCount = (review.match_decisions ?? []).filter(
    (d) => d.decision === "flag",
  ).length;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl border border-stone-200 max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden"
      >
        <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-stone-900">Legal review</h3>
            <div className="text-[11px] text-stone-500 mt-0.5">
              {flaggedCount} flagged match{flaggedCount === 1 ? "" : "es"} on this asset
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-stone-400 hover:text-stone-700 text-lg font-bold leading-none px-2"
          >
            ×
          </button>
        </div>
        <div className="p-5 overflow-y-auto">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {DECISION_OPTIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => setDecision(d.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  decision === d.value
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            rows={4}
            placeholder="Reasoning (visible on the report)…"
            className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm"
          />
          {err && <div className="text-xs text-red-600 mt-2">{err}</div>}
          {review.decided_at && (
            <div className="text-[11px] text-stone-500 mt-2">
              Last decision {new Date(review.decided_at).toLocaleString()}
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-stone-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 hover:bg-stone-100"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !decision}
            className="px-4 py-2 rounded-lg bg-stone-900 text-white text-xs font-semibold disabled:opacity-50"
          >
            {saving ? "Saving…" : review.decision ? "Update decision" : "Lock decision"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScopeDisclosure({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-5">
      <h2 className="text-sm font-bold text-stone-900 mb-2">Search scope</h2>
      <ul className="space-y-1.5 text-xs text-stone-600 list-disc pl-5">
        {lines.map((l, i) => <li key={i}>{l}</li>)}
      </ul>
    </div>
  );
}

// --- Monitoring-mode view ----------------------------------------------

function MonitoringView({
  review,
  onUpdated,
}: {
  review: IpReview;
  onUpdated: () => void;
}) {
  const findings = review.findings ?? [];
  const [hideApproved, setHideApproved] = useState(true);
  const [showDismissed, setShowDismissed] = useState(false);
  // Optimistically-dismissed result_ids — the server reload eventually
  // replaces this once `dismissed_at` lands in the polled payload.
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());
  const [domains, setDomains] = useState<MonitoredDomain[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");

  // Pull all tenant domains once so we can label `monitored_platforms`
  // ids by hostname and show their last_run_at in the empty state.
  useEffect(() => {
    let alive = true;
    listMonitoredDomains()
      .then(({ domains }) => alive && setDomains(domains))
      .catch(() => { /* non-fatal — the empty-state still renders */ });
    return () => { alive = false; };
  }, []);

  const platformDomains = useMemo(() => {
    const byId = new Map(domains.map((d) => [d.id, d]));
    return review.monitored_platforms
      .map((id) => byId.get(id))
      .filter((d): d is MonitoredDomain => !!d);
  }, [domains, review.monitored_platforms]);

  const visible = useMemo(() => {
    return findings.filter((f) => {
      const isDismissed = !!f.dismissed_at || dismissing.has(f.result_id);
      if (isDismissed && !showDismissed) return false;
      if (hideApproved && f.is_approved_licensee) return false;
      return true;
    });
  }, [findings, hideApproved, showDismissed, dismissing]);

  // Counts ignore dismissed findings — the priority banner reflects the
  // outstanding workload, not the historical total.
  const counts = useMemo(() => {
    const live = findings.filter(
      (f) => !f.dismissed_at && !dismissing.has(f.result_id),
    );
    const high = live.filter((f) => f.enforcement_priority >= 0.75).length;
    const med = live.filter(
      (f) => f.enforcement_priority >= 0.5 && f.enforcement_priority < 0.75
    ).length;
    const low = live.filter((f) => f.enforcement_priority < 0.5).length;
    return { high, med, low, total: live.length };
  }, [findings, dismissing]);

  const dismissedCount = findings.filter(
    (f) => !!f.dismissed_at || dismissing.has(f.result_id),
  ).length;

  async function handleDismiss(f: IpReviewFinding) {
    if (dismissing.has(f.result_id)) return;
    setDismissing((prev) => new Set(prev).add(f.result_id));
    try {
      await dismissIpReviewFinding(review.id, f.result_id);
      onUpdated();
    } catch (e) {
      setDismissing((prev) => {
        const next = new Set(prev);
        next.delete(f.result_id);
        return next;
      });
      alert(e instanceof Error ? e.message : "Failed to dismiss finding");
    }
  }

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshError("");
    try {
      // Fire one run per linked domain; the API fans out per IP keyword
      // server-side. Errors on one domain don't abort the rest.
      const results = await Promise.allSettled(
        review.monitored_platforms.map((id) => triggerMonitoringRun(id))
      );
      const rejected = results.filter((r) => r.status === "rejected");
      if (rejected.length === results.length && rejected.length > 0) {
        setRefreshError("All refresh requests failed — try again later.");
      }
      // Findings poll on its own cadence; one immediate reload pulls
      // whatever's already landed before the worker finishes.
      onUpdated();
    } finally {
      setRefreshing(false);
    }
  }

  const isFresh =
    findings.length === 0 &&
    Date.now() - new Date(review.created_at).getTime() < 10 * 60 * 1000;

  return (
    <>
      <PriorityBanner counts={counts} />

      <MonitoringFilterContext
        review={review}
        platformDomains={platformDomains}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        refreshError={refreshError}
      />

      {isFresh && (
        <ScrapingInProgress platforms={platformDomains} />
      )}

      <div className="rounded-2xl border border-stone-200 bg-white">
        <div className="px-5 py-3 border-b border-stone-200 flex items-center justify-between flex-wrap gap-y-2">
          <h2 className="text-sm font-bold text-stone-900">
            Findings ({visible.length})
          </h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-[11px] text-stone-500">
              <input
                type="checkbox"
                checked={hideApproved}
                onChange={(e) => setHideApproved(e.target.checked)}
              />
              Hide approved licensees
            </label>
            <label
              className={`flex items-center gap-2 text-[11px] ${
                dismissedCount === 0 ? "text-stone-300" : "text-stone-500"
              }`}
            >
              <input
                type="checkbox"
                checked={showDismissed}
                onChange={(e) => setShowDismissed(e.target.checked)}
                disabled={dismissedCount === 0}
              />
              Show dismissed ({dismissedCount})
            </label>
          </div>
        </div>
        {visible.length === 0 ? (
          <div className="px-5 py-8 text-sm text-stone-400 text-center">
            {isFresh
              ? "Waiting for the first findings to arrive…"
              : (
                <>
                  No findings yet. Click <span className="font-semibold">Refresh now</span>
                  {" "}above, or wait for the next scheduled run.
                </>
              )}
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {visible.map((f) => (
              <FindingRow
                key={f.result_id}
                f={f}
                reviewId={review.id}
                isDismissed={!!f.dismissed_at || dismissing.has(f.result_id)}
                isDismissing={dismissing.has(f.result_id) && !f.dismissed_at}
                onDismiss={() => handleDismiss(f)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function ScrapingInProgress({ platforms }: { platforms: MonitoredDomain[] }) {
  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        <span className="text-sm font-semibold text-blue-900">
          Scraping in progress
        </span>
      </div>
      <p className="text-xs text-blue-800 mb-2">
        We've started monitoring the platforms below. Initial findings usually
        appear within 30-60 seconds; this page refreshes automatically.
      </p>
      {platforms.length > 0 && (
        <ul className="space-y-0.5 text-[11px] text-blue-800">
          {platforms.map((p) => (
            <li key={p.id}>
              · {p.domain}
              {p.last_run_at && (
                <span className="text-blue-600/70">
                  {" "}— last run {new Date(p.last_run_at).toLocaleString()}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PriorityBanner({ counts }: { counts: { high: number; med: number; low: number; total: number } }) {
  return (
    <div>
      <h2 className="text-sm font-bold text-stone-900 mb-2">Enforcement priority</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <PriorityCard label="High" value={counts.high} sub="≥ 0.75" tone="red" />
        <PriorityCard label="Medium" value={counts.med} sub="0.50–0.74" tone="amber" />
        <PriorityCard label="Low" value={counts.low} sub="< 0.50" tone="yellow" />
        <PriorityCard label="Total" value={counts.total} sub="across all platforms" tone="stone" />
      </div>
    </div>
  );
}

function PriorityCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number;
  sub: string;
  tone: "red" | "amber" | "yellow" | "stone";
}) {
  const cls = {
    red: { box: "border-red-200 bg-red-50/60", text: "text-red-700" },
    amber: { box: "border-amber-200 bg-amber-50/60", text: "text-amber-700" },
    yellow: { box: "border-yellow-200 bg-yellow-50/60", text: "text-yellow-700" },
    stone: { box: "border-stone-200 bg-stone-50/40", text: "text-stone-700" },
  }[tone];
  return (
    <div className={`rounded-2xl border p-4 ${cls.box}`}>
      <div className="text-xs font-semibold text-stone-700">{label}</div>
      <div className={`text-2xl font-bold mt-2 ${cls.text}`}>{value}</div>
      <div className="text-[11px] text-stone-500 mt-0.5">{sub}</div>
    </div>
  );
}

function MonitoringFilterContext({
  review,
  platformDomains,
  onRefresh,
  refreshing,
  refreshError,
}: {
  review: IpReview;
  platformDomains: MonitoredDomain[];
  onRefresh: () => void;
  refreshing: boolean;
  refreshError: string;
}) {
  const platformLabel = platformDomains.length > 0
    ? platformDomains.map((d) => d.domain).join(", ")
    : review.monitored_platforms.length > 0
      ? `${review.monitored_platforms.length} platform(s)`
      : "All monitored";
  const rows: Array<[string, string]> = [
    ["IP", review.monitored_ip?.name ?? "(unknown)"],
    ["Platforms", platformLabel],
    [
      "Approved licensees",
      review.approved_licensees.length
        ? review.approved_licensees.join(", ")
        : "—",
    ],
  ];
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50/40 p-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-stone-900">Filter</h2>
        <div className="flex items-center gap-2">
          {refreshError && (
            <span className="text-[11px] text-red-600">{refreshError}</span>
          )}
          <button
            onClick={onRefresh}
            disabled={refreshing || review.monitored_platforms.length === 0}
            className="px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-semibold disabled:opacity-50"
          >
            {refreshing ? "Refreshing…" : "Refresh now"}
          </button>
        </div>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline gap-2">
            <dt className="text-[11px] uppercase tracking-wider text-stone-500 min-w-[120px]">{k}</dt>
            <dd className="text-stone-800">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ExportPdfButton({ reviewId }: { reviewId: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await openIpReviewReport(reviewId);
        } catch (e) {
          alert(e instanceof Error ? e.message : "Failed to open report");
        } finally {
          setLoading(false);
        }
      }}
      className="px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 disabled:opacity-50"
    >
      {loading ? "Preparing…" : "Export PDF"}
    </button>
  );
}

function TakedownPacketButton({ reviewId, resultId }: { reviewId: string; resultId: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await openIpReviewFindingTakedownPacket(reviewId, resultId);
        } catch (e) {
          alert(e instanceof Error ? e.message : "Failed to open takedown packet");
        } finally {
          setLoading(false);
        }
      }}
      className="px-2.5 py-1 rounded-md bg-stone-900 text-white text-[11px] font-semibold hover:bg-stone-800 disabled:opacity-50"
    >
      {loading ? "Preparing…" : "Takedown packet"}
    </button>
  );
}

function FindingRow({
  f,
  reviewId,
  isDismissed,
  isDismissing,
  onDismiss,
}: {
  f: IpReviewFinding;
  reviewId: string;
  isDismissed: boolean;
  isDismissing: boolean;
  onDismiss: () => void;
}) {
  const priorityCls =
    f.enforcement_priority >= 0.75
      ? "text-red-700"
      : f.enforcement_priority >= 0.5
        ? "text-amber-700"
        : "text-stone-700";
  return (
    <div className={`px-5 py-4 flex items-start gap-3 ${isDismissed ? "opacity-50" : ""}`}>
      {f.image_url ? (
        <img
          src={f.image_url}
          alt=""
          className="w-20 h-20 rounded-lg object-cover border border-stone-200"
        />
      ) : (
        <div className="w-20 h-20 rounded-lg bg-stone-100" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-semibold text-sm text-stone-900 truncate">
            {f.domain}
          </span>
          {isDismissed && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-stone-200 text-stone-600">
              dismissed
            </span>
          )}
          {f.is_approved_licensee && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-100 text-emerald-700">
              approved
            </span>
          )}
          {f.vlm_verdict && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-600">
              vlm: {f.vlm_verdict}
              {f.vlm_confidence != null && `@${Math.round(f.vlm_confidence * 100)}%`}
            </span>
          )}
        </div>
        <a
          href={f.page_url}
          target="_blank"
          rel="noreferrer"
          className="block text-[11px] text-blue-700 hover:underline truncate"
        >
          {f.page_url}
        </a>
        <div className="flex items-center gap-2 mt-2 flex-wrap text-[11px] text-stone-500">
          <span>similarity {Math.round((f.similarity_score ?? 0) * 100)}%</span>
          {f.inliers != null && <span>· inliers {f.inliers}</span>}
          <span>· {new Date(f.found_at).toLocaleDateString()}</span>
        </div>
        {f.vlm_reasoning && (
          <div className="text-[11px] text-stone-600 mt-1.5 leading-relaxed line-clamp-2">
            {f.vlm_reasoning}
          </div>
        )}
        <div className="flex items-center gap-2 mt-3">
          <TakedownPacketButton reviewId={reviewId} resultId={f.result_id} />
          <button
            type="button"
            onClick={onDismiss}
            disabled={isDismissed || isDismissing}
            className="px-2.5 py-1 rounded-md border border-stone-300 text-stone-700 text-[11px] font-semibold hover:bg-stone-50 disabled:opacity-50 disabled:cursor-default"
          >
            {isDismissing ? "Dismissing…" : isDismissed ? "Dismissed" : "Dismiss"}
          </button>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className={`text-lg font-bold ${priorityCls}`}>
          {f.enforcement_priority.toFixed(2)}
        </div>
        <div className="text-[10px] uppercase tracking-wider text-stone-400">
          priority
        </div>
      </div>
    </div>
  );
}
