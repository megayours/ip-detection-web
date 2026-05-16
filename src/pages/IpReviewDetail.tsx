import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  deleteIpReview,
  getIpReview,
  ipReviewReportUrl,
  ipReviewTakedownPacketUrl,
  updateIpReviewDecision,
  type IpReview,
  type IpReviewDecision,
  type IpReviewFinding,
  type IpReviewMatch,
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
    if (!review || review.status !== "processing") return;
    const t = setInterval(reload, 3000);
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

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <Header review={review} />
      {review.status === "processing" && <ProcessingNotice />}
      {review.status === "failed" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Review failed. The detection job hit an error — check the worker logs
          or rerun the wizard.
        </div>
      )}

      {review.mode === "clearance" && review.status === "complete" && review.result && (
        <>
          <VerdictBanner segments={review.result.segments} />
          {review.result.verdict_lines.length > 0 && (
            <VerdictLines lines={review.result.verdict_lines} />
          )}
          <MatchedReferences matches={review.result.matches} />
          <ContextSection review={review} />
          <LegalReviewSection review={review} onUpdated={reload} />
          <ScopeDisclosure lines={review.result.scope_disclosure} />
          <EvidencePacket matches={review.result.matches} />
        </>
      )}

      {review.mode === "monitoring" && (
        <MonitoringView review={review} onUpdated={reload} />
      )}

      <div className="pt-6 border-t border-stone-200">
        <button
          onClick={async () => {
            if (!confirm("Delete this review?")) return;
            await deleteIpReview(id);
            navigate("/ip-reviews");
          }}
          className="text-xs text-red-600 hover:text-red-700"
        >
          Delete review
        </button>
      </div>
    </div>
  );
}

function Header({ review }: { review: IpReview }) {
  const isMonitoring = review.mode === "monitoring";
  return (
    <div className="flex items-start gap-4">
      {review.asset_image_url && (
        <img
          src={review.asset_image_url}
          alt=""
          className="w-24 h-24 rounded-xl object-cover border border-stone-200"
        />
      )}
      <div className="flex-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{review.title}</h1>
            <div className="text-xs text-stone-400 mt-0.5">
              {isMonitoring
                ? `Monitoring review${review.monitored_ip?.name ? ` · ${review.monitored_ip.name}` : ""}`
                : "Clearance review"}
              {" · "}created {new Date(review.created_at).toLocaleString()}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill status={review.status} />
            {!isMonitoring && review.status === "complete" && (
              <a
                href={ipReviewReportUrl(review.id)}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800"
              >
                Export PDF
              </a>
            )}
            {isMonitoring && (
              <a
                href={ipReviewTakedownPacketUrl(review.id)}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800"
              >
                Takedown packet
              </a>
            )}
          </div>
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

const RISK_COLOR: Record<RiskBand, { box: string; chip: string; text: string }> = {
  high:   { box: "border-red-200 bg-red-50/60",   chip: "bg-red-100 text-red-700",     text: "text-red-700" },
  medium: { box: "border-amber-200 bg-amber-50/60", chip: "bg-amber-100 text-amber-700", text: "text-amber-700" },
  low:    { box: "border-yellow-200 bg-yellow-50/60", chip: "bg-yellow-100 text-yellow-700", text: "text-yellow-700" },
  clear:  { box: "border-emerald-200 bg-emerald-50/40", chip: "bg-emerald-100 text-emerald-700", text: "text-emerald-700" },
};

function VerdictBanner({
  segments,
}: {
  segments: Record<RightsType, { risk_band: RiskBand; top_score: number; match_ids: string[] }>;
}) {
  return (
    <div>
      <h2 className="text-sm font-bold text-stone-900 mb-2">Risk by IP type</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(["copyright", "trademark", "design", "publicity"] as const).map((r) => {
          const s = segments[r];
          const c = RISK_COLOR[s.risk_band];
          return (
            <div key={r} className={`rounded-2xl border p-4 ${c.box}`}>
              <div className="flex items-start justify-between">
                <div className="text-xs font-semibold text-stone-700">
                  {RIGHTS_LABEL[r]}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${c.chip}`}>
                  {s.risk_band}
                </span>
              </div>
              <div className={`text-2xl font-bold mt-2 ${c.text}`}>
                {Math.round(s.top_score * 100)}%
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">
                {s.match_ids.length} match{s.match_ids.length === 1 ? "" : "es"}
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

function MatchedReferences({ matches }: { matches: IpReviewMatch[] }) {
  const grouped = useMemo(() => {
    const by: Record<RightsType, IpReviewMatch[]> = {
      copyright: [], trademark: [], design: [], publicity: [],
    };
    for (const m of matches) {
      for (const r of m.rights_types) {
        if (by[r]) by[r].push(m);
      }
    }
    return by;
  }, [matches]);

  return (
    <div>
      <h2 className="text-sm font-bold text-stone-900 mb-2">Matched references</h2>
      <div className="space-y-4">
        {(["copyright", "trademark", "design", "publicity"] as const).map((r) =>
          grouped[r].length === 0 ? null : (
            <section key={r}>
              <div className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                {RIGHTS_LABEL[r]} ({grouped[r].length})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {grouped[r].map((m) => <MatchCard key={m.id} m={m} />)}
              </div>
            </section>
          )
        )}
        {matches.length === 0 && (
          <div className="text-xs text-stone-400">No matches above threshold.</div>
        )}
      </div>
    </div>
  );
}

function MatchCard({ m }: { m: IpReviewMatch }) {
  const [showJustification, setShowJustification] = useState(false);
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex items-start gap-3">
        {m.reference_images?.[0]?.image_url && (
          <img
            src={m.reference_images[0].image_url}
            alt=""
            className="w-20 h-20 rounded-lg object-cover border border-stone-200"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-stone-900 truncate">
            {m.ip_name || "—"}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">
            {sourceLabel(m.catalog_source)}
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Score label="visual" value={m.scores.visual_similarity} />
            <Score label="structural" value={Math.min(1, m.scores.structural_inliers / 30)} />
            {m.scores.ocr_match > 0 && (
              <Score label="OCR" value={m.scores.ocr_match} />
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
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

function LegalReviewSection({ review, onUpdated }: { review: IpReview; onUpdated: () => void }) {
  const [decision, setDecision] = useState<IpReviewDecision | "">(review.decision ?? "");
  const [rationale, setRationale] = useState(review.decision_rationale ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setDecision(review.decision ?? "");
    setRationale(review.decision_rationale ?? "");
  }, [review.id, review.decision, review.decision_rationale]);

  async function save() {
    setSaving(true);
    setErr("");
    try {
      await updateIpReviewDecision(review.id, {
        decision: decision || null,
        decision_rationale: rationale.trim() || null,
      });
      onUpdated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-stone-300 bg-white p-5">
      <h2 className="text-sm font-bold text-stone-900 mb-3">Legal review</h2>
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
        rows={3}
        placeholder="Reasoning (visible on the report)…"
        className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm"
      />
      {err && <div className="text-xs text-red-600 mt-2">{err}</div>}
      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-stone-900 text-white text-xs font-semibold disabled:opacity-50"
        >
          {saving ? "Saving…" : review.decision ? "Update decision" : "Lock decision"}
        </button>
        {review.decided_at && (
          <span className="text-[11px] text-stone-500">
            Last decision {new Date(review.decided_at).toLocaleString()}
          </span>
        )}
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

function EvidencePacket({ matches }: { matches: IpReviewMatch[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-stone-200 bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-5 py-3 flex items-center justify-between"
      >
        <span className="text-sm font-bold text-stone-900">Evidence packet</span>
        <span className="text-[11px] text-stone-500">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="px-5 pb-5 text-[11px] font-mono text-stone-600 overflow-x-auto">
          <pre>{JSON.stringify(matches, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

// --- Monitoring-mode view ----------------------------------------------

function MonitoringView({
  review,
  onUpdated: _onUpdated,
}: {
  review: IpReview;
  onUpdated: () => void;
}) {
  const findings = review.findings ?? [];
  const [hideApproved, setHideApproved] = useState(true);

  const visible = useMemo(
    () => (hideApproved ? findings.filter((f) => !f.is_approved_licensee) : findings),
    [findings, hideApproved]
  );

  const counts = useMemo(() => {
    const high = findings.filter((f) => f.enforcement_priority >= 0.75).length;
    const med = findings.filter(
      (f) => f.enforcement_priority >= 0.5 && f.enforcement_priority < 0.75
    ).length;
    const low = findings.filter((f) => f.enforcement_priority < 0.5).length;
    return { high, med, low, total: findings.length };
  }, [findings]);

  return (
    <>
      <PriorityBanner counts={counts} />

      <MonitoringFilterContext review={review} />

      <div className="rounded-2xl border border-stone-200 bg-white">
        <div className="px-5 py-3 border-b border-stone-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900">
            Findings ({visible.length})
          </h2>
          <label className="flex items-center gap-2 text-[11px] text-stone-500">
            <input
              type="checkbox"
              checked={hideApproved}
              onChange={(e) => setHideApproved(e.target.checked)}
            />
            Hide approved licensees
          </label>
        </div>
        {visible.length === 0 ? (
          <div className="px-5 py-8 text-sm text-stone-400 text-center">
            No findings yet. The monitoring scheduler refreshes results periodically;
            check back later or visit{" "}
            <a href="/monitor" className="underline">Monitor</a> to configure
            additional domains for this IP.
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {visible.map((f) => <FindingRow key={f.result_id} f={f} />)}
          </div>
        )}
      </div>
    </>
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

function MonitoringFilterContext({ review }: { review: IpReview }) {
  const rows: Array<[string, string]> = [
    ["IP", review.monitored_ip?.name ?? "(unknown)"],
    ["Territories", review.territories.length ? review.territories.join(", ") : "All"],
    [
      "Platforms",
      review.monitored_platforms.length
        ? `${review.monitored_platforms.length} selected`
        : "All monitored",
    ],
    [
      "Approved licensees",
      review.approved_licensees.length
        ? review.approved_licensees.join(", ")
        : "—",
    ],
  ];
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50/40 p-5">
      <h2 className="text-sm font-bold text-stone-900 mb-2">Filter</h2>
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

function FindingRow({ f }: { f: IpReviewFinding }) {
  const priorityCls =
    f.enforcement_priority >= 0.75
      ? "text-red-700"
      : f.enforcement_priority >= 0.5
        ? "text-amber-700"
        : "text-stone-700";
  return (
    <div className="px-5 py-4 flex items-start gap-3">
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
