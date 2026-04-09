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
    description: "Evaluates the IP's guidelines",
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
        let status: StageStatus;
        if (row) {
          status = interpretInScanContext(row.primitive, row.state);
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

type StageStatus = "pending" | "running" | "hit" | "clear" | "uncertain" | "skipped";

/**
 * Map a primitive's `pass`/`fail`/`uncertain` state to the scan-context label.
 *
 * The underlying primitives use brand-approval semantics:
 *   pass = "this image matches the canonical IP"
 *   fail = "it doesn't"
 * which is the *opposite* of what a Scan wants. A scan is hunting for
 * infringements, so a primitive saying "pass / matches the IP" is actually
 * a HIT (suspicious), not a clear. The only inverted case is `vlm_check`,
 * where the VLM evaluates brand guidelines and a `fail` means "violates the
 * guidelines" — that's the hit, not the pass.
 */
function interpretInScanContext(primitive: string, state: string): StageStatus {
  if (state === "uncertain") return "uncertain";
  if (primitive === "vlm_check") {
    return state === "fail" ? "hit" : "clear";
  }
  // identity_match, style_fidelity, canonical_proximity all share the same
  // semantic: pass = matches the IP = HIT.
  return state === "pass" ? "hit" : "clear";
}

function StageRow({
  index,
  stage,
  status,
  row,
}: {
  index: number;
  stage: Stage;
  status: StageStatus;
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
          ) : status === "hit" ? (
            "!"
          ) : status === "clear" ? (
            "✓"
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
        <StageMeter stageKey={stage.key} row={row} />
      )}
    </div>
  );
}

/**
 * Per-stage visual meter: a horizontal bar with the stage's score, plus a
 * vertical marker for the threshold. Color flips between green and red based
 * on whether the score is on the "hit" side of the threshold.
 *
 * Each stage knows where to find its score and threshold inside the
 * primitive's `observed` payload (the fields differ across primitives, so we
 * branch by stage.key here rather than a generic walker).
 */
function StageMeter({
  stageKey,
  row,
}: {
  stageKey: Stage["key"];
  row: RuleResult;
}) {
  const meter = extractMeter(stageKey, row);
  if (!meter) return null;

  // For VLM, the bar represents the model's *confidence* in its verdict, not
  // a similarity. The verdict itself ("Violates" / "Follows") is the headline.
  if (stageKey === "vlm") {
    return (
      <div className="mt-3 pl-10 space-y-1">
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-slate-500">{meter.verdictLabel}</span>
          <span className="font-bold text-slate-900">
            {(meter.score * 100).toFixed(0)}% confidence
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 pl-10 space-y-1.5">
      <Bar score={meter.score} threshold={meter.threshold} isHit={meter.isHit} />
      <div className="flex items-baseline justify-between text-xs">
        <span
          className={`font-bold ${meter.isHit ? "text-red-700" : "text-emerald-700"}`}
        >
          {(meter.score * 100).toFixed(1)}%
        </span>
        <span className="text-slate-400">
          threshold {(meter.threshold * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

function Bar({
  score,
  threshold,
  isHit,
}: {
  score: number;
  threshold: number;
  isHit: boolean;
}) {
  const scorePct = Math.min(100, Math.max(0, score * 100));
  const threshPct = Math.min(100, Math.max(0, threshold * 100));
  const fillColor = isHit ? "bg-red-500" : "bg-emerald-500";
  return (
    <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`absolute inset-y-0 left-0 ${fillColor}`}
        style={{ width: `${scorePct}%` }}
      />
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-slate-700"
        style={{ left: `calc(${threshPct}% - 1px)` }}
        title={`Threshold ${threshPct.toFixed(0)}%`}
      />
    </div>
  );
}

interface MeterValues {
  score: number;
  threshold: number;
  isHit: boolean;
  verdictLabel?: string;
}

function extractMeter(stageKey: Stage["key"], row: RuleResult): MeterValues | null {
  const o = (row.observed ?? {}) as Record<string, unknown>;
  const num = (v: unknown, fallback = 0): number =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback;

  switch (stageKey) {
    case "detect": {
      const score = num(o.score);
      const threshold = num(o.threshold, 0.6);
      return { score, threshold, isHit: score >= threshold };
    }
    case "identity": {
      const score = num(o.best_score);
      const threshold = num(o.min_score, 0.55);
      const found = o.found === true;
      return { score, threshold, isHit: found && score >= threshold };
    }
    case "style": {
      const score = num(o.similarity);
      const threshold = num(o.min_similarity, 0.4);
      return { score, threshold, isHit: score >= threshold };
    }
    case "canonical": {
      const score = num(o.proximity_score);
      const threshold = num(o.threshold, 0.85);
      return { score, threshold, isHit: score >= threshold };
    }
    case "vlm": {
      const score = num(o.confidence);
      const verdict = String(o.verdict ?? "");
      const isHit = verdict === "fail";
      return {
        score,
        threshold: 0.7,
        isHit,
        verdictLabel: isHit ? "Violates guidelines" : "Follows guidelines",
      };
    }
  }
  return null;
}

const STATUS_LABEL: Record<StageStatus, string> = {
  pending: "Queued",
  running: "Running",
  hit: "Hit",
  clear: "Clear",
  uncertain: "Inconclusive",
  skipped: "Skipped",
};

const STATUS_PALETTE: Record<
  StageStatus,
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
  hit: {
    border: "border-l-red-400",
    badgeBg: "bg-red-100",
    badgeText: "text-red-700",
    pillBg: "bg-red-50",
    pillText: "text-red-700",
  },
  clear: {
    border: "border-l-emerald-400",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-700",
    pillBg: "bg-emerald-50",
    pillText: "text-emerald-700",
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
