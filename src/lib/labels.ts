import type { PrimitiveName, RuleSeverity, RuleResult, CanonicalRefMatch } from "../api";

/**
 * User-facing labels for the underlying check primitives. We deliberately do
 * NOT expose the implementation method names ("identity_match",
 * "canonical_proximity", "vlm_check"…) to end users — they're confusing and
 * leak our internals.
 */
const PRIMITIVE_LABELS: Record<PrimitiveName, { title: string; subtitle: string }> = {
  identity_match: {
    title: "Subject Detected",
    subtitle: "A subject visually similar to the registered IP was found in the image. This is a coarse first-pass — strict matching happens in Reference Likeness and the brand guideline review.",
  },
  style_fidelity: {
    title: "Visual Style Match",
    subtitle: "Compares the submission against the canonical look",
  },
  canonical_proximity: {
    title: "Reference Likeness",
    subtitle: "Measures how close the submission is to approved references",
  },
  vlm_check: {
    title: "Brand Guideline Review",
    subtitle: "Checks free-text brand guidelines",
  },
  vlm_infringement_check: {
    title: "Infringement Review",
    subtitle: "VLM compares the suspect image with the closest canonical reference and judges whether it infringes",
  },
  palette: {
    title: "Brand Colors",
    subtitle: "Checks dominant colors against the allowed palette",
  },
  ocr_contains: {
    title: "Word Mark",
    subtitle: "Looks for required text in the image",
  },
  manual_check: {
    title: "Manual Review",
    subtitle: "Flagged for a human reviewer",
  },
};

export function primitiveLabel(p: PrimitiveName): { title: string; subtitle: string } {
  return PRIMITIVE_LABELS[p] ?? { title: p, subtitle: "" };
}

/**
 * Friendly, branded check name for a rule result. Falls back to the
 * underlying primitive's label if the rule has no custom name.
 */
export function ruleDisplayName(rr: { rule_name?: string; primitive: PrimitiveName }): string {
  if (rr.rule_name && !rr.rule_name.toLowerCase().startsWith("baseline")) {
    return rr.rule_name;
  }
  return primitiveLabel(rr.primitive).title;
}

const SEVERITY_COPY: Record<RuleSeverity, string> = {
  fail_hard: "Required",
  fail: "Important",
  note: "Advisory",
};

export function severityCopy(s: RuleSeverity): string {
  return SEVERITY_COPY[s] ?? s;
}

const STATE_COPY: Record<RuleResult["state"], string> = {
  pass: "Passed",
  fail: "Did not pass",
  uncertain: "Inconclusive",
};

export function stateCopy(s: RuleResult["state"]): string {
  return STATE_COPY[s] ?? s;
}

export interface VlmViolation {
  rule?: string;
  reason?: string;
}

/**
 * Pull the per-violation list out of a vlm_check rule's evidence blob.
 * Returns [] for non-vlm rules or rules with no violations.
 */
export function vlmViolations(rr: RuleResult): VlmViolation[] {
  if (rr.primitive !== "vlm_check") return [];
  const ev = rr.evidence as Record<string, unknown> | undefined;
  const v = ev?.violations as VlmViolation[] | undefined;
  return Array.isArray(v) ? v : [];
}

/**
 * Closest canonical references for a canonical_proximity rule. Capped to top-N
 * (default 3 — keeps the report card compact). Returns [] for any other primitive.
 */
export function closestReferences(rr: RuleResult, limit = 3): CanonicalRefMatch[] {
  if (rr.primitive !== "canonical_proximity") return [];
  const ev = rr.evidence as Record<string, unknown> | undefined;
  const refs = ev?.top_similarities as CanonicalRefMatch[] | undefined;
  if (!Array.isArray(refs)) return [];
  return refs.slice(0, limit);
}

/**
 * The auto-calibrated proximity stats for a canonical_proximity rule. The
 * report card uses these to render the "brand canonicals score X–Y to each
 * other, you scored Z" calibration strip.
 */
export interface ProximityCalibration {
  min: number;
  p10: number;
  p50: number;
  /** How many canonical-vs-canonical samples the percentiles were computed from. */
  sampleSize: number;
}

export function proximityCalibration(rr: RuleResult): ProximityCalibration | null {
  if (rr.primitive !== "canonical_proximity") return null;
  const ev = rr.evidence as Record<string, unknown> | undefined;
  const stats = ev?.proximity_stats as Record<string, unknown> | undefined;
  if (!stats) return null;
  const min = stats.min as number | undefined;
  const p10 = stats.p10 as number | undefined;
  const p50 = stats.p50 as number | undefined;
  const samples = stats.samples as number[] | undefined;
  if (typeof min !== "number" || typeof p10 !== "number" || typeof p50 !== "number") return null;
  return { min, p10, p50, sampleSize: Array.isArray(samples) ? samples.length : 0 };
}

export interface ProximityExplanation {
  changes: string[];
  model?: string;
  cacheHit?: boolean;
}

/**
 * VLM-generated imperative bullets describing what the submission needs to
 * change to look more like its closest canonical. Only present on failed
 * canonical_proximity rules where the worker successfully reached Gemini.
 * Returns null otherwise — see `proximityExplanationDebug` for the failure
 * reason in that case.
 */
export function proximityExplanation(rr: RuleResult): ProximityExplanation | null {
  if (rr.primitive !== "canonical_proximity") return null;
  const ev = rr.evidence as Record<string, unknown> | undefined;
  const exp = ev?.explanation as Record<string, unknown> | undefined;
  if (!exp) return null;
  const rawChanges = exp.changes as unknown;
  if (!Array.isArray(rawChanges)) return null;
  const changes = rawChanges.filter((c): c is string => typeof c === "string" && c.length > 0);
  if (changes.length === 0) return null;
  return {
    changes,
    model: exp.model as string | undefined,
    cacheHit: exp.cache_hit as boolean | undefined,
  };
}

/**
 * Reason the worker couldn't generate a VLM explanation, surfaced via
 * `evidence.explanation_debug`. Useful for diagnosing missing explanations
 * (e.g. "GEMINI_API_KEY not set", "failed to download closest reference: ...").
 * Returns null when an explanation was generated successfully or the rule
 * passed.
 */
export function proximityExplanationDebug(rr: RuleResult): string | null {
  if (rr.primitive !== "canonical_proximity") return null;
  const ev = rr.evidence as Record<string, unknown> | undefined;
  const debug = ev?.explanation_debug;
  return typeof debug === "string" && debug ? debug : null;
}

export interface ObservedFact {
  label: string;
  value: string;
  /** "good" / "bad" / "neutral" — for color hinting */
  tone?: "good" | "bad" | "neutral";
}

function pct(n: unknown): string {
  const v = typeof n === "number" ? n : NaN;
  if (Number.isNaN(v)) return "—";
  return `${Math.round(v * 100)}%`;
}

function num(n: unknown, digits = 3): string {
  const v = typeof n === "number" ? n : NaN;
  return Number.isNaN(v) ? "—" : v.toFixed(digits);
}

function passTone(passed: boolean): "good" | "bad" {
  return passed ? "good" : "bad";
}

/**
 * Render the per-primitive observed payload as a small list of human-readable
 * facts. No JSON ever leaks to end users — anything we don't explicitly handle
 * returns an empty list (the row just shows the verdict badge).
 */
export function observedFacts(rr: RuleResult): ObservedFact[] {
  const obs = (rr.observed ?? {}) as Record<string, unknown>;
  const passed = rr.state === "pass";

  switch (rr.primitive) {
    case "identity_match": {
      if (obs.found === false) {
        return [{ label: "Detected in image", value: "Not found", tone: "bad" }];
      }
      const score = obs.best_score as number | undefined;
      const conf = obs.best_confidence as string | undefined;
      const facts: ObservedFact[] = [];
      if (score !== undefined) {
        facts.push({ label: "Match strength", value: pct(score), tone: passTone(passed) });
      }
      if (conf) {
        facts.push({ label: "Confidence", value: conf.charAt(0) + conf.slice(1).toLowerCase() });
      }
      return facts;
    }

    case "style_fidelity": {
      const sim = obs.similarity as number | undefined;
      if (sim === undefined) return [];
      return [{ label: "Visual similarity", value: pct(sim), tone: passTone(passed) }];
    }

    case "canonical_proximity": {
      const score = obs.proximity_score as number | undefined;
      const threshold = obs.threshold as number | undefined;
      const facts: ObservedFact[] = [];
      if (score !== undefined) {
        facts.push({ label: "Reference likeness", value: pct(score), tone: passTone(passed) });
      }
      if (threshold !== undefined) {
        facts.push({ label: "Threshold", value: pct(threshold), tone: "neutral" });
      }
      if (score !== undefined && threshold !== undefined) {
        const gap = score - threshold;
        const sign = gap >= 0 ? "+" : "−";
        facts.push({
          label: "Gap to threshold",
          value: `${sign}${Math.round(Math.abs(gap) * 100)} pts`,
          tone: gap >= 0 ? "good" : "bad",
        });
      }
      return facts;
    }

    case "vlm_check": {
      const verdict = obs.verdict as string | undefined;
      const confidence = obs.confidence as number | undefined;
      const facts: ObservedFact[] = [];
      if (verdict) {
        const map: Record<string, string> = { pass: "Approved", fail: "Issues found", unclear: "Inconclusive" };
        facts.push({
          label: "Reviewer verdict",
          value: map[verdict] ?? verdict,
          tone: verdict === "pass" ? "good" : verdict === "fail" ? "bad" : "neutral",
        });
      }
      if (confidence !== undefined) {
        facts.push({ label: "Confidence", value: pct(confidence) });
      }
      return facts;
    }

    case "palette": {
      const cov = obs.matched_coverage as number | undefined;
      const min = obs.min_coverage_required as number | undefined;
      const facts: ObservedFact[] = [];
      if (cov !== undefined) {
        facts.push({ label: "Brand colors found", value: pct(cov), tone: passTone(passed) });
      }
      if (min !== undefined) {
        facts.push({ label: "Required", value: pct(min), tone: "neutral" });
      }
      return facts;
    }

    case "ocr_contains": {
      const ev = (rr.evidence ?? {}) as Record<string, unknown>;
      const findings = ev.findings as Array<{ required?: string; best_match?: string; passed?: boolean }> | undefined;
      if (!findings || findings.length === 0) return [];
      return findings.map((f) => ({
        label: `"${f.required ?? ""}"`,
        value: f.passed ? `Found "${f.best_match ?? f.required}"` : "Not found",
        tone: f.passed ? "good" : "bad",
      }));
    }

    case "manual_check":
      return [{ label: "Status", value: "Awaiting human review", tone: "neutral" }];

    default:
      return [];
  }
}

// Discard num — kept for now in case future formatters need it.
void num;
