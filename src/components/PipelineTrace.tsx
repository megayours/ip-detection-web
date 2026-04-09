import type { CasePipelineStage, RuleResult } from "../api";

/**
 * Vertical stepper rendering of the cheap→expensive scan pipeline.
 *
 * Stages: detect → identity → style → canonical → vlm → complete.
 * Each stage is matched to a rule_result by primitive name. Stages that the
 * worker hasn't reached yet show as pending; stages skipped due to early-exit
 * show as "skipped".
 */

type Stage = {
  key: Exclude<CasePipelineStage, "complete">;
  label: string;
  description: string;
  primitives: string[];
};

const STAGES: Stage[] = [
  {
    key: "detect",
    label: "Detect",
    description: "Visual recognition · DINO + SigLIP + LightGlue",
    primitives: ["identity_match"], // first row in the trace is the detection summary
  },
  {
    key: "identity",
    label: "Identity",
    description: "IP name present in the picture",
    primitives: ["identity_match"],
  },
  {
    key: "style",
    label: "Style fidelity",
    description: "Embedding distance to canonical centroid",
    primitives: ["style_fidelity"],
  },
  {
    key: "canonical",
    label: "Canonical proximity",
    description: "Top-k similarity to nearest references",
    primitives: ["canonical_proximity"],
  },
  {
    key: "vlm",
    label: "Brand-guideline review",
    description: "VLM evaluates the IP's free-text guidelines",
    primitives: ["vlm_check"],
  },
];

const STAGE_ORDER: CasePipelineStage[] = [
  "detect",
  "identity",
  "style",
  "canonical",
  "vlm",
  "complete",
];

interface Props {
  pipelineStage: CasePipelineStage;
  ruleResults: RuleResult[];
}

export default function PipelineTrace({ pipelineStage, ruleResults }: Props) {
  const reachedIdx = STAGE_ORDER.indexOf(pipelineStage);

  // The detect row in our trace is identified by rule_id "stage:detect" so we
  // don't double-count identity_match (which appears both as the detect summary
  // and as a real Stage 2 rule).
  const detectRow = ruleResults.find((r) => r.rule_id === "stage:detect");
  const realRules = ruleResults.filter((r) => r.rule_id !== "stage:detect");

  function rowFor(stage: Stage): RuleResult | null {
    if (stage.key === "detect") return detectRow ?? null;
    return realRules.find((r) => stage.primitives.includes(r.primitive)) ?? null;
  }

  return (
    <ol className="space-y-3">
      {STAGES.map((stage, idx) => {
        const stageIdx = STAGE_ORDER.indexOf(stage.key);
        const row = rowFor(stage);
        let status: "pending" | "running" | "pass" | "fail" | "uncertain" | "skipped";
        if (row) {
          status = row.state as "pass" | "fail" | "uncertain";
        } else if (stageIdx < reachedIdx) {
          status = "skipped";
        } else if (stageIdx === reachedIdx && pipelineStage !== "complete") {
          status = "running";
        } else {
          status = "pending";
        }

        return (
          <li key={stage.key}>
            <StageRow
              index={idx + 1}
              stage={stage}
              status={status}
              row={row}
            />
          </li>
        );
      })}
    </ol>
  );
}

function StageRow({
  index,
  stage,
  status,
  row,
}: {
  index: number;
  stage: Stage;
  status: "pending" | "running" | "pass" | "fail" | "uncertain" | "skipped";
  row: RuleResult | null;
}) {
  const palette = STATUS_PALETTE[status];
  return (
    <div className={`rounded-xl border-l-4 ${palette.border} bg-white border border-slate-200 px-4 py-3`}>
      <div className="flex items-center gap-3">
        <div
          className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${palette.badgeBg} ${palette.badgeText}`}
        >
          {status === "running" ? (
            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : status === "pass" ? (
            "✓"
          ) : status === "fail" ? (
            "!"
          ) : status === "uncertain" ? (
            "?"
          ) : status === "skipped" ? (
            "·"
          ) : (
            index
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-slate-900">{stage.label}</div>
          <div className="text-xs text-slate-500">{stage.description}</div>
        </div>
        <span
          className={`shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${palette.pillBg} ${palette.pillText}`}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>
      {row && status !== "skipped" && status !== "pending" && (
        <StageEvidence row={row} />
      )}
    </div>
  );
}

function StageEvidence({ row }: { row: RuleResult }) {
  // Compact key→value display of the most useful observed fields. Avoids the
  // full TestSubmission VerdictBlock — case detail uses this as a quick read.
  const observed = (row.observed ?? {}) as Record<string, unknown>;
  const facts: Array<{ label: string; value: string }> = [];
  for (const [k, v] of Object.entries(observed)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "object") continue;
    facts.push({ label: prettyLabel(k), value: prettyValue(v) });
  }
  if (facts.length === 0) return null;
  return (
    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 pl-10">
      {facts.slice(0, 6).map((f, i) => (
        <div key={i} className="flex items-baseline justify-between gap-3 text-xs">
          <dt className="text-slate-500">{f.label}</dt>
          <dd className="font-semibold text-slate-800">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function prettyLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function prettyValue(v: unknown): string {
  if (typeof v === "number") {
    if (v >= 0 && v <= 1) return `${(v * 100).toFixed(1)}%`;
    return v.toString();
  }
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Queued",
  running: "Running",
  pass: "Cleared",
  fail: "Hit",
  uncertain: "Inconclusive",
  skipped: "Skipped",
};

const STATUS_PALETTE: Record<
  string,
  { border: string; badgeBg: string; badgeText: string; pillBg: string; pillText: string }
> = {
  pending: {
    border: "border-l-slate-200",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-400",
    pillBg: "bg-slate-50",
    pillText: "text-slate-400",
  },
  running: {
    border: "border-l-blue-400",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-600",
    pillBg: "bg-blue-50",
    pillText: "text-blue-700",
  },
  pass: {
    border: "border-l-emerald-400",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-700",
    pillBg: "bg-emerald-50",
    pillText: "text-emerald-700",
  },
  fail: {
    border: "border-l-red-400",
    badgeBg: "bg-red-100",
    badgeText: "text-red-700",
    pillBg: "bg-red-50",
    pillText: "text-red-700",
  },
  uncertain: {
    border: "border-l-amber-400",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
    pillBg: "bg-amber-50",
    pillText: "text-amber-700",
  },
  skipped: {
    border: "border-l-slate-200",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-400",
    pillBg: "bg-slate-50",
    pillText: "text-slate-500",
  },
};
