import { useState, useEffect } from "react";
import {
  getRuleGraph,
  putRuleGraph,
  type IpType,
  type Rule,
  type RuleGraphContent,
  type PrimitiveName,
  type RuleSeverity,
} from "../api";

interface Props {
  trademarkId: string;
  ipType: IpType;
}

const PRIMITIVES_FOR: Record<IpType, { value: PrimitiveName; label: string; description: string }[]> = {
  mark: [
    { value: "identity_match", label: "Identity must be present", description: "Detection gating — fail if the IP isn't present" },
    { value: "palette", label: "Brand color palette", description: "Cropped region's dominant colors must match allowed palette" },
    { value: "ocr_contains", label: "Word mark in image", description: "OCR must find a required string" },
    { value: "style_fidelity", label: "Style fidelity", description: "Cosine similarity to canonical reference centroid" },
    { value: "manual_check", label: "Manual review (placeholder)", description: "Surface a guideline that has no auto-primitive yet" },
  ],
  character: [
    { value: "identity_match", label: "Identity must be present", description: "Detection gating — fail if the character isn't present" },
    { value: "pose_class", label: "Required pose", description: "Pose classifier against tagged reference exemplars" },
    { value: "palette", label: "Brand color palette", description: "Cropped region's dominant colors must match allowed palette" },
    { value: "style_fidelity", label: "Style fidelity", description: "Cosine similarity to canonical reference centroid" },
    { value: "ocr_contains", label: "Word mark in image", description: "OCR must find a required string" },
    { value: "manual_check", label: "Manual review (placeholder)", description: "Surface a guideline that has no auto-primitive yet" },
  ],
};

function defaultConfig(primitive: PrimitiveName, ipType: IpType): { config: Record<string, unknown>; on_fail: RuleSeverity; name: string } {
  switch (primitive) {
    case "identity_match":
      return {
        name: `${ipType === "character" ? "Character" : "Mark"} must be present`,
        config: { min_score: 0.55, min_confidence: "MEDIUM" },
        on_fail: "fail_hard",
      };
    case "pose_class":
      return {
        name: "Required pose",
        config: { required_poses: ["standing"], min_similarity: 0.5 },
        on_fail: "fail",
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
  }
}

export default function RuleEditor({ trademarkId, ipType }: Props) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

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

  function addRule(primitive: PrimitiveName) {
    const d = defaultConfig(primitive, ipType);
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
        ip_type: ipType,
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
    return <div className="text-sm text-slate-400">Loading rules…</div>;
  }

  const primitives = PRIMITIVES_FOR[ipType];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Rules &amp; guidelines</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {version ? <>Current version <code className="text-rose-600">{version}</code></> : "No rule graph yet — add your first rule"}
            {savedAt && <> · saved just now</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={save}
            disabled={saving || rules.length === 0}
            className="px-4 py-2 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-xl text-sm font-semibold hover:from-rose-600 hover:to-rose-700 disabled:opacity-50 transition-all shadow-lg shadow-rose-500/20"
          >
            {saving ? "Saving…" : version ? "Publish new version" : "Publish v0.1.0"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-5 py-4">
          {error}
        </div>
      )}

      {rules.length === 0 ? (
        <div className="text-center py-10 text-sm text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
          No rules yet. Add one below.
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
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Pick a primitive</div>
          {primitives.map((p) => (
            <button
              key={p.value}
              onClick={() => addRule(p.value)}
              className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50/40 transition-all"
            >
              <div className="text-sm font-semibold text-slate-900">{p.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{p.description}</div>
            </button>
          ))}
          <button
            onClick={() => setShowAdd(false)}
            className="w-full px-4 py-2 text-xs text-slate-400 hover:text-slate-600"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full px-4 py-3 rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 hover:border-rose-400 hover:text-rose-600 hover:bg-rose-50/40 transition-all"
        >
          + Add rule
        </button>
      )}
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
    <li className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-slate-300 text-xs">{expanded ? "▾" : "▸"}</span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate">{rule.name || "(unnamed)"}</div>
            <div className="text-xs text-slate-400">
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
            className="text-xs text-slate-400 hover:text-red-500 px-2"
            title="Remove rule"
          >
            ✕
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-4 py-4 space-y-3 bg-slate-50/30">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Rule name</label>
            <input
              value={rule.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description (shown in report card)</label>
            <textarea
              value={rule.description ?? ""}
              onChange={(e) => onChange({ description: e.target.value })}
              rows={2}
              placeholder="Quote the relevant guideline section so the brand owner sees why this rule exists."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">On fail</label>
            <select
              value={rule.on_fail}
              onChange={(e) => onChange({ on_fail: e.target.value as RuleSeverity })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white"
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

    case "pose_class":
      return (
        <div className="space-y-3">
          <TextField
            label="Required poses (comma-separated)"
            value={Array.isArray(cfg.required_poses) ? (cfg.required_poses as string[]).join(", ") : ""}
            onChange={(v) => onChange({ ...cfg, required_poses: v.split(",").map((s) => s.trim()).filter(Boolean) })}
            placeholder="standing"
          />
          <NumberField
            label="Min similarity to nearest exemplar"
            value={(cfg.min_similarity as number) ?? 0.5}
            onChange={(v) => onChange({ ...cfg, min_similarity: v })}
            step={0.05}
          />
          <p className="text-xs text-slate-400">
            Tag reference images with a pose label below to add exemplars.
          </p>
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
          <p className="text-xs text-slate-400">
            Manual checks always surface in the report card with severity = note. Use them to record guidelines no auto-primitive supports yet.
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
        <label className="block text-xs font-medium text-slate-600 mb-1">Allowed colors</label>
        <div className="space-y-2">
          {colors.map((c, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="color"
                value={c.hex}
                onChange={(e) => updateColor(idx, { hex: e.target.value })}
                className="w-10 h-9 rounded border border-slate-200 cursor-pointer"
              />
              <input
                value={c.hex}
                onChange={(e) => updateColor(idx, { hex: e.target.value })}
                className="w-24 px-2 py-1.5 border border-slate-200 rounded text-xs font-mono bg-white"
              />
              <input
                value={c.name}
                onChange={(e) => updateColor(idx, { name: e.target.value })}
                placeholder="LABEL"
                className="flex-1 px-3 py-1.5 border border-slate-200 rounded text-sm bg-white"
              />
              <button
                onClick={() => removeColor(idx)}
                className="text-slate-400 hover:text-red-500 px-2"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={addColor}
            className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
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
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        step={step ?? 0.1}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white"
      />
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
