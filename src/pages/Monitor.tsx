import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createMonitoredDomain,
  deleteMonitoredDomain,
  getMonitoringSettings,
  listMonitoredDomains,
  listMonitoringPresets,
  listMonitoringRuns,
  triggerMonitoringRun,
  updateMonitoredDomain,
  updateMonitoringSettings,
  type MonitoredDomain,
  type MonitoringFrequency,
  type MonitoringPreset,
  type MonitoringSettings,
  type ReverseSearchRun,
} from "../api";

export default function Monitor() {
  const [domains, setDomains] = useState<MonitoredDomain[]>([]);
  const [runs, setRuns] = useState<ReverseSearchRun[]>([]);
  const [settings, setSettings] = useState<MonitoringSettings | null>(null);
  const [presets, setPresets] = useState<MonitoringPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newDomain, setNewDomain] = useState("");
  const [newKeywords, setNewKeywords] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    setError("");
    try {
      const [d, r, s, p] = await Promise.all([
        listMonitoredDomains(),
        listMonitoringRuns({ limit: 50 }),
        getMonitoringSettings(),
        listMonitoringPresets(),
      ]);
      setDomains(d.domains);
      setRuns(r.runs);
      setSettings(s.settings);
      setPresets(p.presets);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function addDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!newDomain.trim()) return;
    setSubmitting(true);
    try {
      const keywords = newKeywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      await createMonitoredDomain(newDomain.trim(), keywords);
      setNewDomain("");
      setNewKeywords("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleEnabled(d: MonitoredDomain) {
    try {
      await updateMonitoredDomain(d.id, { enabled: !d.enabled });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function updateKeywords(d: MonitoredDomain, raw: string) {
    const keywords = raw
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    try {
      await updateMonitoredDomain(d.id, { keywords });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function saveRecipe(d: MonitoredDomain, recipe: Record<string, unknown> | null) {
    try {
      await updateMonitoredDomain(d.id, { recipe });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function removeDomain(d: MonitoredDomain) {
    if (!confirm(`Stop monitoring ${d.domain}?`)) return;
    try {
      await deleteMonitoredDomain(d.id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function trigger(d: MonitoredDomain) {
    if (d.keywords.length === 0) {
      setError("Add at least one keyword before triggering a run.");
      return;
    }
    try {
      await triggerMonitoringRun(d.id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function setEnabledSetting(enabled: boolean) {
    try {
      const r = await updateMonitoringSettings({ enabled });
      setSettings(r.settings);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function setFrequency(frequency: MonitoringFrequency) {
    try {
      const r = await updateMonitoringSettings({ frequency });
      setSettings(r.settings);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const runsByDomain = useMemo(() => {
    const m = new Map<string, ReverseSearchRun[]>();
    for (const r of runs) {
      if (!r.domain_id) continue;
      const arr = m.get(r.domain_id) ?? [];
      arr.push(r);
      m.set(r.domain_id, arr);
    }
    return m;
  }, [runs]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
      <div>
        <h1 className="text-2xl font-black text-stone-900 tracking-tight">Monitor</h1>
        <p className="mt-1 text-sm text-stone-500">
          Watch target sites for unauthorized use of your IP. The worker
          scrapes each site for the keywords you list and opens a ticket on
          /cases when a match crosses the bar.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-5 py-4">
          {error}
        </div>
      )}

      {/* Tenant settings */}
      <section className="rounded-2xl border border-stone-200 p-5 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-stone-900">Monitoring</div>
            <div className="text-xs text-stone-500">
              {settings?.monitoring_enabled
                ? "Enabled — the scheduler will fan out runs on schedule."
                : "Disabled — runs only fire when triggered manually below."}
            </div>
          </div>
          <button
            disabled={!settings}
            onClick={() => setEnabledSetting(!settings?.monitoring_enabled)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all disabled:opacity-50 ${
              settings?.monitoring_enabled
                ? "bg-stone-900 text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {settings?.monitoring_enabled ? "On" : "Off"}
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="text-stone-500">Frequency:</span>
          {(["daily", "weekly"] as MonitoringFrequency[]).map((f) => {
            const active = settings?.monitoring_frequency === f;
            return (
              <button
                key={f}
                onClick={() => setFrequency(f)}
                className={`px-3 py-1 rounded-full font-semibold transition-all ${
                  active
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {f}
              </button>
            );
          })}
        </div>
      </section>

      {/* Add domain */}
      <section className="rounded-2xl border border-stone-200 p-5 bg-white space-y-3">
        <div className="text-sm font-bold text-stone-900">Add a monitored site</div>
        <form onSubmit={addDomain} className="grid grid-cols-12 gap-2">
          <input
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="example-shop.com"
            className="col-span-4 px-3 py-2 rounded-lg border border-stone-200 text-sm"
          />
          <input
            value={newKeywords}
            onChange={(e) => setNewKeywords(e.target.value)}
            placeholder="comma-separated keywords"
            className="col-span-6 px-3 py-2 rounded-lg border border-stone-200 text-sm"
          />
          <button
            type="submit"
            disabled={submitting || !newDomain.trim()}
            className="col-span-2 px-3 py-2 rounded-lg bg-stone-900 text-white text-xs font-semibold disabled:opacity-50"
          >
            {submitting ? "…" : "Add"}
          </button>
        </form>
      </section>

      {/* Domains */}
      <section className="space-y-3">
        <div className="text-sm font-bold text-stone-900">Monitored sites</div>
        {loading ? (
          <div className="py-10 flex justify-center">
            <div className="w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : domains.length === 0 ? (
          <div className="text-center py-12 text-sm text-stone-500">
            No sites yet. Add one above.
          </div>
        ) : (
          <div className="space-y-3">
            {domains.map((d) => (
              <DomainRow
                key={d.id}
                d={d}
                runs={runsByDomain.get(d.id) ?? []}
                presets={presets}
                onToggle={() => toggleEnabled(d)}
                onTrigger={() => trigger(d)}
                onDelete={() => removeDomain(d)}
                onKeywords={(raw) => updateKeywords(d, raw)}
                onSaveRecipe={(recipe) => saveRecipe(d, recipe)}
              />
            ))}
          </div>
        )}
      </section>

      <div className="text-xs text-stone-400">
        Matches open as pending tickets on{" "}
        <Link to="/cases" className="underline">/cases</Link>.
      </div>
    </div>
  );
}

const RECIPE_PLACEHOLDER = `{
  "search_url_template": "https://example.com/search?q={q}",
  "image_selector": "img.product",
  "link_selector": "",
  "notes": "manual"
}`;

function DomainRow({
  d,
  runs,
  presets,
  onToggle,
  onTrigger,
  onDelete,
  onKeywords,
  onSaveRecipe,
}: {
  d: MonitoredDomain;
  runs: ReverseSearchRun[];
  presets: MonitoringPreset[];
  onToggle: () => void;
  onTrigger: () => void;
  onDelete: () => void;
  onKeywords: (raw: string) => void;
  onSaveRecipe: (recipe: Record<string, unknown> | null) => void;
}) {
  const [keywordDraft, setKeywordDraft] = useState(d.keywords.join(", "));
  const [editing, setEditing] = useState(false);
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [recipeDraft, setRecipeDraft] = useState(
    d.recipe ? JSON.stringify(d.recipe, null, 2) : "",
  );
  const [recipeError, setRecipeError] = useState("");
  const lastRun = runs[0];

  return (
    <div className="rounded-2xl border border-stone-200 p-4 bg-white space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-stone-900">{d.domain}</div>
          <div className="text-xs text-stone-500">
            {d.last_run_at
              ? `Last run ${new Date(d.last_run_at).toLocaleString()}`
              : "No runs yet"}
            {d.recipe_updated_at && d.recipe ? " · recipe cached" : " · no recipe"}
            {d.zero_yield_streak > 0 ? ` · ${d.zero_yield_streak} empty run(s)` : ""}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              d.enabled
                ? "bg-stone-900 text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {d.enabled ? "On" : "Off"}
          </button>
          <button
            onClick={onTrigger}
            className="px-3 py-1 rounded-full text-xs font-semibold bg-red-600 text-white hover:bg-red-700"
          >
            Run now
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-600 hover:bg-stone-200"
          >
            Remove
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 flex-wrap">
          {d.keywords.length === 0 ? (
            <span className="text-xs text-stone-400">No keywords</span>
          ) : (
            d.keywords.map((k) => (
              <span
                key={k}
                className="inline-flex items-center bg-stone-100 text-stone-700 px-2.5 py-0.5 rounded-full text-xs"
              >
                {k}
              </span>
            ))
          )}
          <button
            onClick={() => setEditing((v) => !v)}
            className="text-xs text-stone-500 hover:text-stone-900 underline"
          >
            {editing ? "cancel" : "edit"}
          </button>
        </div>
        {editing && (
          <div className="mt-2 flex items-center gap-2">
            <input
              value={keywordDraft}
              onChange={(e) => setKeywordDraft(e.target.value)}
              placeholder="comma-separated"
              className="flex-1 px-3 py-1.5 rounded-lg border border-stone-200 text-xs"
            />
            <button
              onClick={() => {
                onKeywords(keywordDraft);
                setEditing(false);
              }}
              className="px-3 py-1 rounded-full text-xs font-semibold bg-stone-900 text-white"
            >
              Save
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-stone-100 pt-2">
        <button
          onClick={() => setRecipeOpen((v) => !v)}
          className="text-xs text-stone-500 hover:text-stone-900 underline"
        >
          {recipeOpen ? "hide" : "show"} scrape recipe
        </button>
        {recipeOpen && (
          <div className="mt-2 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                Presets
              </span>
              {presets.length === 0 ? (
                <span className="text-[10px] text-stone-400">loading…</span>
              ) : (
                presets.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => {
                      setRecipeDraft(JSON.stringify(preset.recipe, null, 2));
                      setRecipeError("");
                    }}
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200"
                  >
                    {preset.label}
                  </button>
                ))
              )}
            </div>
            <textarea
              value={recipeDraft}
              onChange={(e) => {
                setRecipeDraft(e.target.value);
                setRecipeError("");
              }}
              placeholder={RECIPE_PLACEHOLDER}
              rows={8}
              spellCheck={false}
              className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs font-mono"
            />
            {recipeError && (
              <div className="text-xs text-red-600">{recipeError}</div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const trimmed = recipeDraft.trim();
                  if (!trimmed) {
                    setRecipeError("Empty — use Clear to remove the recipe.");
                    return;
                  }
                  let parsed: unknown;
                  try {
                    parsed = JSON.parse(trimmed);
                  } catch (e) {
                    setRecipeError(
                      `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
                    );
                    return;
                  }
                  if (
                    !parsed ||
                    typeof parsed !== "object" ||
                    !("search_url_template" in parsed)
                  ) {
                    setRecipeError("Missing search_url_template.");
                    return;
                  }
                  setRecipeError("");
                  onSaveRecipe(parsed as Record<string, unknown>);
                }}
                className="px-3 py-1 rounded-full text-xs font-semibold bg-stone-900 text-white"
              >
                Save
              </button>
              <button
                onClick={() => {
                  if (!confirm("Clear recipe? Next run will re-bootstrap via VLM.")) return;
                  setRecipeDraft("");
                  setRecipeError("");
                  onSaveRecipe(null);
                }}
                className="px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-600 hover:bg-stone-200"
              >
                Clear
              </button>
              <span className="text-[10px] text-stone-400">
                Must include <code className="font-mono">search_url_template</code> with{" "}
                <code className="font-mono">{"{q}"}</code> token and{" "}
                <code className="font-mono">image_selector</code>.
              </span>
            </div>
          </div>
        )}
      </div>

      {lastRun && (
        <div className="text-xs text-stone-500 border-t border-stone-100 pt-2">
          Latest run — {lastRun.status}
          {lastRun.keyword ? ` · kw: ${lastRun.keyword}` : ""} · scraped{" "}
          {lastRun.results_found} image(s), opened {lastRun.cases_created} ticket(s)
          {lastRun.error ? ` · ${lastRun.error}` : ""}
        </div>
      )}
    </div>
  );
}
