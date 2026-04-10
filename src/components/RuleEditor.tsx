import { useState, useEffect } from "react";
import {
  getRuleGraph,
  putRuleGraph,
  updateTrademark,
  type Rule,
  type RuleGraphContent,
  type PrimitiveName,
  type RuleSeverity,
  type BaselineConfig,
} from "../api";

interface Props {
  trademarkId: string;
  initialGuidelines?: string | null;
  initialBaselineConfig?: BaselineConfig | null;
  onGuidelinesSaved?: (guidelines: string | null) => void;
  onBaselineSaved?: (config: BaselineConfig | null) => void;
}

/**
 * Mirrors `BASELINE_DEFAULTS` in `worker/lib/rules.py`. Surfaced in the UI as
 * the placeholder/reset value so users see what their override compares
 * against. KEEP THESE IN SYNC with the worker.
 */
const BASELINE_DEFAULTS = {
  identity_match: { min_score: 0.9, min_confidence: "MEDIUM" as const },
  style_fidelity: { min_similarity: 0.7, warn_below: 0.55 },
  canonical_proximity: { k: 3, calibration_percentile: "p10" as const },
};

const PERCENTILE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "min", label: "min — strictest" },
  { value: "p05", label: "p05 — very strict" },
  { value: "p10", label: "p10 — strict (default)" },
  { value: "p25", label: "p25 — moderate" },
  { value: "p50", label: "p50 — loose (median)" },
];

/** Drop empty sub-objects so we never send `{ identity_match: {} }` to the API. */
function pruneBaseline(cfg: BaselineConfig): BaselineConfig {
  const out: BaselineConfig = {};
  for (const key of ["identity_match", "style_fidelity", "canonical_proximity"] as const) {
    const sub = cfg[key];
    if (sub && Object.keys(sub).some((k) => (sub as Record<string, unknown>)[k] !== undefined)) {
      out[key] = sub as never;
    }
  }
  return out;
}

interface PrimitiveOption {
  value: PrimitiveName;
  label: string;
  description: string;
}

const ALL_PRIMITIVES: PrimitiveOption[] = [
  { value: "identity_match",      label: "Identity must be present",  description: "Detection gating — fail if the IP isn't present" },
  { value: "canonical_proximity", label: "Canonical proximity",       description: "Auto-calibrated novelty detection. Top-k mean similarity to canonical refs vs threshold derived from the reference set itself. Catches off-canon parodies that style_fidelity is too coarse to detect." },
  { value: "palette",             label: "Brand color palette",       description: "Cropped region's dominant colors must match allowed palette" },
  { value: "ocr_contains",        label: "Word mark in image",        description: "OCR must find a required string" },
  { value: "style_fidelity",      label: "Style fidelity (centroid)", description: "Cosine similarity to canonical centroid. Coarser than canonical_proximity — kept for backward compat." },
  { value: "manual_check",        label: "Manual review (placeholder)", description: "Surface a guideline that has no auto-primitive yet" },
];

function defaultConfig(primitive: PrimitiveName): { config: Record<string, unknown>; on_fail: RuleSeverity; name: string } {
  switch (primitive) {
    case "identity_match":
      return {
        name: "Trademark must be present",
        config: { min_score: 0.55, min_confidence: "MEDIUM" },
        on_fail: "fail_hard",
      };
    case "palette":
      return {
        name: "Brand color palette",
        config: {
          allowed_colors: [{ name: "BRAND", hex: "#000000" }],
          max_delta_e: 28,
          min_coverage: 0.55,
        },
        on_fail: "fail",
      };
    case "ocr_contains":
      return {
        name: "Word mark present",
        config: { must_contain: [""], match_threshold: 0.75 },
        on_fail: "fail",
      };
    case "style_fidelity":
      return {
        name: "Style fidelity",
        config: { min_similarity: 0.4, warn_below: 0.55 },
        on_fail: "fail",
      };
    case "manual_check":
      return {
        name: "Manual review needed",
        config: { label: "guideline", needs_primitive: "to_be_built" },
        on_fail: "note",
      };
    case "canonical_proximity":
      return {
        name: "Canonical proximity",
        config: { k: 3, calibration_percentile: "p10" },
        on_fail: "fail",
      };
    case "vlm_check":
      // Not exposed in the advanced picker — use the top-level guidelines textarea
      // instead. Stub here keeps the switch exhaustive.
      return {
        name: "Free-text guidelines (VLM)",
        config: { guidelines: "", min_confidence: 0.7 },
        on_fail: "fail",
      };
    case "vlm_infringement_check":
      // Scan-only primitive — never authored from the rule editor (handle_scan
      // injects it). Stub keeps the switch exhaustive.
      return {
        name: "VLM infringement review (scan only)",
        config: { min_confidence: 0.7 },
        on_fail: "fail",
      };
  }
}

export default function RuleEditor({
  trademarkId,
  initialGuidelines,
  initialBaselineConfig,
  onGuidelinesSaved,
  onBaselineSaved,
}: Props) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Free-text guidelines (the simple path — sent to Gemini per submission).
  const [guidelines, setGuidelines] = useState<string>(initialGuidelines ?? "");
  const [savingGuidelines, setSavingGuidelines] = useState(false);
  const [guidelinesSavedAt, setGuidelinesSavedAt] = useState<string | null>(null);

  // Editable per-trademark overrides for the always-on baseline primitives.
  // null/undefined values fall back to BASELINE_DEFAULTS in the worker.
  const [baseline, setBaseline] = useState<BaselineConfig>(initialBaselineConfig ?? {});
  const [savingBaseline, setSavingBaseline] = useState(false);
  const [baselineSavedAt, setBaselineSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setGuidelines(initialGuidelines ?? "");
  }, [initialGuidelines]);

  useEffect(() => {
    setBaseline(initialBaselineConfig ?? {});
  }, [initialBaselineConfig]);

  useEffect(() => {
    getRuleGraph(trademarkId)
      .then(({ rule_graph }) => {
        if (rule_graph) {
          setRules(rule_graph.content.rules);
          setVersion(rule_graph.version);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [trademarkId]);

  async function saveGuidelines() {
    setSavingGuidelines(true);
    setError("");
    try {
      const trimmed = guidelines.trim();
      const { trademark } = await updateTrademark(trademarkId, {
        guidelines: trimmed || null,
      });
      setGuidelinesSavedAt(new Date().toISOString());
      onGuidelinesSaved?.(trademark.guidelines);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingGuidelines(false);
    }
  }

  async function saveBaseline() {
    setSavingBaseline(true);
    setError("");
    try {
      // Send null to clear all overrides; otherwise send the trimmed config
      // (drop empty sub-objects so the worker reads pure defaults for them).
      const cleaned = pruneBaseline(baseline);
      const payload = Object.keys(cleaned).length === 0 ? null : cleaned;
      const { trademark } = await updateTrademark(trademarkId, {
        baseline_config: payload,
      });
      setBaseline(trademark.baseline_config ?? {});
      setBaselineSavedAt(new Date().toISOString());
      onBaselineSaved?.(trademark.baseline_config);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingBaseline(false);
    }
  }

  function resetBaseline() {
    setBaseline({});
  }

  function addRule(primitive: PrimitiveName) {
    const d = defaultConfig(primitive);
    setRules([
      ...rules,
      { name: d.name, primitive, config: d.config, on_fail: d.on_fail, description: "" },
    ]);
    setShowAdd(false);
  }

  function updateRule(idx: number, patch: Partial<Rule>) {
    setRules(rules.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function removeRule(idx: number) {
    setRules(rules.filter((_, i) => i !== idx));
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const content: RuleGraphContent = {
        schema_version: 1,
        rules,
      };
      const { rule_graph } = await putRuleGraph(trademarkId, content);
      setVersion(rule_graph.version);
      setSavedAt(new Date().toISOString());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-stone-400">Loading rules…</div>;
  }

  const primitives = ALL_PRIMITIVES;

  return (
    <div className="space-y-6">
      {/* Always-on baseline summary */}
      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5">
        <h2 className="text-lg font-bold text-stone-900">Rules &amp; guidelines</h2>
        <p className="text-xs text-stone-500 mt-1">
          Identity, style fidelity and canonical proximity are checked automatically on every submission.
          Use the box below for anything else — anatomy, costume, scene rules — described in plain English.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-5 py-4">
          {error}
        </div>
      )}

      {/* Free-text guidelines (the simple path) */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-stone-900">Additional guidelines (optional)</label>
          {guidelinesSavedAt && <span className="text-xs text-stone-400">saved just now</span>}
        </div>
        <textarea
          value={guidelines}
          onChange={(e) => setGuidelines(e.target.value)}
          rows={6}
          placeholder="e.g. Hands must have 3 thick fingers and 1 thumb (4 digits total). No nails or visible joints. Bow tie always present and red. Eyes are simple black ovals."
          className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 bg-white resize-y"
        />
        <p className="text-xs text-stone-400">
          Specific guidelines verified on each submission. Leave empty to skip.
        </p>
        <div className="flex justify-end">
          <button
            onClick={saveGuidelines}
            disabled={savingGuidelines}
            className="px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 disabled:opacity-50 transition-all"
          >
            {savingGuidelines ? "Saving…" : "Save guidelines"}
          </button>
        </div>
      </div>

      {/* Advanced — old structured rule-graph editor, hidden by default */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-stone-50/50 transition-all"
        >
          <div className="text-left">
            <div className="text-sm font-semibold text-stone-900">Advanced rules</div>
            <div className="text-xs text-stone-500 mt-0.5">
              Add structured primitives — palette, OCR, custom thresholds.
              {version && <> Current version <code className="text-amber-700">{version}</code>.</>}
            </div>
          </div>
          <span className="text-stone-400 text-sm">{showAdvanced ? "▾" : "▸"}</span>
        </button>

        {showAdvanced && (
          <div className="border-t border-stone-100 p-5 space-y-6">
            <BaselineEditor
              config={baseline}
              onChange={setBaseline}
              onSave={saveBaseline}
              onReset={resetBaseline}
              saving={savingBaseline}
              savedAt={baselineSavedAt}
            />

            <div className="border-t border-stone-100 pt-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-semibold text-stone-900">Custom rules</div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    Add structured primitives — palette, OCR, etc.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={save}
                    disabled={saving || rules.length === 0}
                    className="px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 disabled:opacity-50 transition-all"
                  >
                    {saving ? "Saving…" : version ? "Publish new version" : "Publish v0.1.0"}
                  </button>
                  {savedAt && <span className="text-xs text-stone-400">saved just now</span>}
                </div>
              </div>
            </div>

            {rules.length === 0 ? (
              <div className="text-center py-8 text-sm text-stone-400 bg-stone-50 rounded-xl border border-stone-100">
                No advanced rules yet. Add one below.
              </div>
            ) : (
              <ul className="space-y-3">
                {rules.map((rule, idx) => (
                  <RuleCard
                    key={idx}
                    rule={rule}
                    onChange={(patch) => updateRule(idx, patch)}
                    onRemove={() => removeRule(idx)}
                  />
                ))}
              </ul>
            )}

            {showAdd ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-2">
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Pick a primitive</div>
                {primitives.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => addRule(p.value)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-stone-200 hover:border-amber-300 hover:bg-amber-50/40 transition-all"
                  >
                    <div className="text-sm font-semibold text-stone-900">{p.label}</div>
                    <div className="text-xs text-stone-500 mt-0.5">{p.description}</div>
                  </button>
                ))}
                <button
                  onClick={() => setShowAdd(false)}
                  className="w-full px-4 py-2 text-xs text-stone-400 hover:text-stone-600"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAdd(true)}
                className="w-full px-4 py-3 rounded-xl border border-dashed border-stone-300 text-sm text-stone-500 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50/40 transition-all"
              >
                + Add rule
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RuleCard({
  rule,
  onChange,
  onRemove,
}: {
  rule: Rule;
  onChange: (patch: Partial<Rule>) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const severityClass: Record<RuleSeverity, string> = {
    fail_hard: "text-red-700 bg-red-50 border-red-200",
    fail: "text-amber-700 bg-amber-50 border-amber-200",
    note: "text-blue-700 bg-blue-50 border-blue-200",
  };

  return (
    <li className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-stone-50/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-stone-300 text-xs">{expanded ? "▾" : "▸"}</span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-stone-900 truncate">{rule.name || "(unnamed)"}</div>
            <div className="text-xs text-stone-400">
              <code>{rule.primitive}</code>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${severityClass[rule.on_fail]}`}>
            {rule.on_fail}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="text-xs text-stone-400 hover:text-red-500 px-2"
            title="Remove rule"
          >
            ✕
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-stone-100 px-4 py-4 space-y-3 bg-stone-50/30">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Rule name</label>
            <input
              value={rule.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Description (shown in report card)</label>
            <textarea
              value={rule.description ?? ""}
              onChange={(e) => onChange({ description: e.target.value })}
              rows={2}
              placeholder="Quote the relevant guideline section so the brand owner sees why this rule exists."
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">On fail</label>
            <select
              value={rule.on_fail}
              onChange={(e) => onChange({ on_fail: e.target.value as RuleSeverity })}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 bg-white"
            >
              <option value="fail_hard">fail_hard — block, no manual review path</option>
              <option value="fail">fail — block, manual review allowed</option>
              <option value="note">note — passes with note in report card</option>
            </select>
          </div>

          <PrimitiveConfigEditor rule={rule} onChange={(config) => onChange({ config })} />
        </div>
      )}
    </li>
  );
}

function PrimitiveConfigEditor({
  rule,
  onChange,
}: {
  rule: Rule;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const cfg = rule.config;

  switch (rule.primitive) {
    case "identity_match":
      return (
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Min detection score"
            value={(cfg.min_score as number) ?? 0.55}
            onChange={(v) => onChange({ ...cfg, min_score: v })}
            step={0.05}
          />
          <SelectField
            label="Min confidence"
            value={(cfg.min_confidence as string) ?? "MEDIUM"}
            onChange={(v) => onChange({ ...cfg, min_confidence: v })}
            options={["LOW", "MEDIUM", "HIGH"]}
          />
        </div>
      );

    case "palette":
      return <PaletteEditor cfg={cfg} onChange={onChange} />;

    case "ocr_contains":
      return (
        <div className="space-y-3">
          <TextField
            label="Required strings (comma-separated)"
            value={Array.isArray(cfg.must_contain) ? (cfg.must_contain as string[]).join(", ") : ""}
            onChange={(v) => onChange({ ...cfg, must_contain: v.split(",").map((s) => s.trim()).filter(Boolean) })}
            placeholder="GUCCI"
          />
          <NumberField
            label="Match threshold (0-1)"
            value={(cfg.match_threshold as number) ?? 0.75}
            onChange={(v) => onChange({ ...cfg, match_threshold: v })}
            step={0.05}
          />
        </div>
      );

    case "style_fidelity":
      return (
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Min cosine similarity"
            value={(cfg.min_similarity as number) ?? 0.4}
            onChange={(v) => onChange({ ...cfg, min_similarity: v })}
            step={0.05}
          />
          <NumberField
            label="Warn below"
            value={(cfg.warn_below as number) ?? 0.55}
            onChange={(v) => onChange({ ...cfg, warn_below: v })}
            step={0.05}
          />
        </div>
      );

    case "manual_check":
      return (
        <div className="space-y-3">
          <TextField
            label="Label"
            value={(cfg.label as string) ?? ""}
            onChange={(v) => onChange({ ...cfg, label: v })}
            placeholder="hand_anatomy"
          />
          <TextField
            label="Needs primitive (documentation)"
            value={(cfg.needs_primitive as string) ?? ""}
            onChange={(v) => onChange({ ...cfg, needs_primitive: v })}
            placeholder="anatomy_keypoints + finger_count"
          />
          <p className="text-xs text-stone-400">
            Manual checks always surface in the report card with severity = note. Use them to record guidelines no auto-primitive supports yet.
          </p>
        </div>
      );

    case "canonical_proximity":
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="k (nearest neighbours)"
              value={(cfg.k as number) ?? 3}
              onChange={(v) => onChange({ ...cfg, k: Math.max(1, Math.round(v)) })}
              step={1}
            />
            <SelectField
              label="Calibration percentile"
              value={(cfg.calibration_percentile as string) ?? "p10"}
              onChange={(v) => onChange({ ...cfg, calibration_percentile: v })}
              options={["min", "p05", "p10", "p25", "p50"]}
            />
          </div>
          <NumberField
            label="Min proximity (override — leave 0 to use auto-calibrated)"
            value={(cfg.min_proximity as number) ?? 0}
            onChange={(v) => onChange({ ...cfg, min_proximity: v > 0 ? v : undefined })}
            step={0.01}
          />
          <p className="text-xs text-stone-400">
            Computes the submission's mean cosine similarity to its <strong>k nearest canonical references</strong> (not the centroid). Threshold is auto-calibrated from the canonical set's own pairwise distances at the selected percentile — looser brands get looser thresholds, tighter brands get tighter, automatically. Stricter percentiles (lower number = stricter) catch more outliers but risk rejecting genuine variants. <strong>p10</strong> is a sensible default. Set <em>Min proximity</em> manually only if you want to override calibration.
          </p>
        </div>
      );
  }
}

function PaletteEditor({
  cfg,
  onChange,
}: {
  cfg: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const colors = (cfg.allowed_colors as { name: string; hex: string }[]) ?? [];

  function updateColor(idx: number, patch: { name?: string; hex?: string }) {
    onChange({ ...cfg, allowed_colors: colors.map((c, i) => (i === idx ? { ...c, ...patch } : c)) });
  }
  function addColor() {
    onChange({ ...cfg, allowed_colors: [...colors, { name: "NEW_COLOR", hex: "#000000" }] });
  }
  function removeColor(idx: number) {
    onChange({ ...cfg, allowed_colors: colors.filter((_, i) => i !== idx) });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1">Allowed colors</label>
        <div className="space-y-2">
          {colors.map((c, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="color"
                value={c.hex}
                onChange={(e) => updateColor(idx, { hex: e.target.value })}
                className="w-10 h-9 rounded border border-stone-200 cursor-pointer"
              />
              <input
                value={c.hex}
                onChange={(e) => updateColor(idx, { hex: e.target.value })}
                className="w-24 px-2 py-1.5 border border-stone-200 rounded text-xs font-mono bg-white"
              />
              <input
                value={c.name}
                onChange={(e) => updateColor(idx, { name: e.target.value })}
                placeholder="LABEL"
                className="flex-1 px-3 py-1.5 border border-stone-200 rounded text-sm bg-white"
              />
              <button
                onClick={() => removeColor(idx)}
                className="text-stone-400 hover:text-red-500 px-2"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={addColor}
            className="text-xs text-amber-700 hover:text-amber-800 font-semibold"
          >
            + Add color
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Max ΔE (CIE76 — lower = stricter)"
          value={(cfg.max_delta_e as number) ?? 28}
          onChange={(v) => onChange({ ...cfg, max_delta_e: v })}
          step={1}
        />
        <NumberField
          label="Min coverage (0-1)"
          value={(cfg.min_coverage as number) ?? 0.55}
          onChange={(v) => onChange({ ...cfg, min_coverage: v })}
          step={0.05}
        />
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-600 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        step={step ?? 0.1}
        className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 bg-white"
      />
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-600 mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 bg-white"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 bg-white"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

/**
 * Per-trademark overrides for the always-on baseline primitives. Mirrors the
 * worker's `BASELINE_DEFAULTS` so users see the default values as placeholders
 * and can selectively loosen any of them. Empty fields fall back to defaults.
 */
function BaselineEditor({
  config,
  onChange,
  onSave,
  onReset,
  saving,
  savedAt,
}: {
  config: BaselineConfig;
  onChange: (cfg: BaselineConfig) => void;
  onSave: () => void;
  onReset: () => void;
  saving: boolean;
  savedAt: string | null;
}) {
  const identity = config.identity_match ?? {};
  const style = config.style_fidelity ?? {};
  const canon = config.canonical_proximity ?? {};

  function patchIdentity(p: Partial<NonNullable<BaselineConfig["identity_match"]>>) {
    onChange({ ...config, identity_match: { ...identity, ...p } });
  }
  function patchStyle(p: Partial<NonNullable<BaselineConfig["style_fidelity"]>>) {
    onChange({ ...config, style_fidelity: { ...style, ...p } });
  }
  function patchCanon(p: Partial<NonNullable<BaselineConfig["canonical_proximity"]>>) {
    onChange({ ...config, canonical_proximity: { ...canon, ...p } });
  }

  const dirty = Object.keys(pruneBaseline(config)).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold text-stone-900">Baseline thresholds</div>
          <div className="text-xs text-stone-500 mt-0.5 max-w-md">
            The three always-on checks. Loosen these for IPs with looser
            requirements; leave any field blank to fall back to the global
            default.
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <button
              onClick={onReset}
              className="px-3 py-1.5 text-xs font-semibold text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-all"
            >
              Reset to defaults
            </button>
          )}
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 disabled:opacity-50 transition-all"
          >
            {saving ? "Saving…" : "Save thresholds"}
          </button>
          {savedAt && <span className="text-xs text-stone-400">saved just now</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Subject Detected (identity_match) */}
        <BaselineCard title="Subject Detected" subtitle="Detection gating">
          <BaselineNumber
            label="Min match strength"
            value={identity.min_score}
            placeholder={BASELINE_DEFAULTS.identity_match.min_score}
            step={0.05}
            onChange={(v) => patchIdentity({ min_score: v })}
          />
          <BaselineSelect
            label="Min confidence"
            value={identity.min_confidence}
            placeholder={BASELINE_DEFAULTS.identity_match.min_confidence}
            options={[
              { value: "LOW", label: "LOW" },
              { value: "MEDIUM", label: "MEDIUM" },
              { value: "HIGH", label: "HIGH" },
            ]}
            onChange={(v) =>
              patchIdentity({ min_confidence: (v || undefined) as "LOW" | "MEDIUM" | "HIGH" | undefined })
            }
          />
        </BaselineCard>

        {/* Visual Style Match (style_fidelity) */}
        <BaselineCard title="Visual Style Match" subtitle="Centroid similarity">
          <BaselineNumber
            label="Min similarity"
            value={style.min_similarity}
            placeholder={BASELINE_DEFAULTS.style_fidelity.min_similarity}
            step={0.05}
            onChange={(v) => patchStyle({ min_similarity: v })}
          />
          <BaselineNumber
            label="Warn below"
            value={style.warn_below}
            placeholder={BASELINE_DEFAULTS.style_fidelity.warn_below}
            step={0.05}
            onChange={(v) => patchStyle({ warn_below: v })}
          />
        </BaselineCard>

        {/* Reference Likeness (canonical_proximity) */}
        <BaselineCard title="Reference Likeness" subtitle="Auto-calibrated novelty">
          <BaselineSelect
            label="Calibration percentile"
            value={canon.calibration_percentile}
            placeholder={BASELINE_DEFAULTS.canonical_proximity.calibration_percentile}
            options={PERCENTILE_OPTIONS}
            onChange={(v) => patchCanon({ calibration_percentile: v || undefined })}
          />
          <BaselineNumber
            label="Min proximity (override)"
            value={canon.min_proximity}
            placeholder={undefined}
            placeholderText="auto"
            step={0.01}
            onChange={(v) => patchCanon({ min_proximity: v })}
          />
        </BaselineCard>
      </div>
    </div>
  );
}

function BaselineCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
      <div>
        <div className="text-xs font-bold text-stone-900">{title}</div>
        <div className="text-[11px] text-stone-500">{subtitle}</div>
      </div>
      {children}
    </div>
  );
}

/** Number field that treats blank as "use default" — value undefined means
 *  the user hasn't overridden, and the placeholder shows the global default. */
function BaselineNumber({
  label,
  value,
  placeholder,
  placeholderText,
  step,
  onChange,
}: {
  label: string;
  value: number | undefined;
  placeholder: number | undefined;
  placeholderText?: string;
  step?: number;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-stone-600 mb-1">{label}</label>
      <input
        type="number"
        value={value ?? ""}
        placeholder={placeholderText ?? (placeholder !== undefined ? String(placeholder) : "")}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChange(undefined);
          } else {
            const n = parseFloat(raw);
            onChange(Number.isNaN(n) ? undefined : n);
          }
        }}
        step={step ?? 0.1}
        className="w-full px-2.5 py-1.5 border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 bg-white"
      />
    </div>
  );
}

/** Select field with an "Use default" option that maps to undefined. */
function BaselineSelect({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value: string | undefined;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string | undefined) => void;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-stone-600 mb-1">{label}</label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="w-full px-2.5 py-1.5 border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 bg-white"
      >
        <option value="">use default ({placeholder})</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
