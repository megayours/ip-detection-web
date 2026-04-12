import { useCallback, useEffect, useState } from "react";
import {
  getMonitoringConfig,
  updateMonitoringConfig,
  listMonitoredDomains,
  addMonitoredDomain,
  removeMonitoredDomain,
  listReverseSearchRuns,
  triggerReverseSearch,
  listTrademarks,
  type MonitoringConfig,
  type MonitoredDomain,
  type ReverseSearchRun,
  type Trademark,
} from "../api";

export default function Monitoring() {
  const [config, setConfig] = useState<MonitoringConfig | null>(null);
  const [domains, setDomains] = useState<MonitoredDomain[]>([]);
  const [runs, setRuns] = useState<ReverseSearchRun[]>([]);
  const [trademarks, setTrademarks] = useState<Trademark[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [cfg, wl, r, tms] = await Promise.all([
        getMonitoringConfig(),
        listMonitoredDomains(),
        listReverseSearchRuns(),
        listTrademarks(),
      ]);
      setConfig(cfg);
      setDomains(wl.domains);
      setRuns(r.runs);
      setTrademarks(tms.trademarks);
    } catch (err) {
      console.error("Failed to load monitoring data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function toggleEnabled() {
    if (!config) return;
    await updateMonitoringConfig({ enabled: !config.enabled });
    setConfig({ ...config, enabled: !config.enabled });
  }

  async function changeFrequency(freq: string) {
    if (!config) return;
    await updateMonitoringConfig({ frequency: freq });
    setConfig({ ...config, frequency: freq });
  }

  async function handleAddDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!newDomain.trim()) return;
    try {
      await addMonitoredDomain(newDomain.trim());
      setNewDomain("");
      const wl = await listMonitoredDomains();
      setDomains(wl.domains);
    } catch (err: any) {
      alert(err.message || "Failed to add domain");
    }
  }

  async function handleRemoveDomain(id: string) {
    await removeMonitoredDomain(id);
    setDomains(domains.filter((d) => d.id !== id));
  }

  async function handleTrigger(trademarkId: string) {
    try {
      await triggerReverseSearch(trademarkId);
      await refresh();
    } catch (err: any) {
      alert(err.message || "Failed to trigger search");
    }
  }

  if (loading) {
    return <div className="text-center py-16 text-stone-400 text-sm">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Config */}
      <section className="space-y-4">
        <h2 className="text-lg font-black text-stone-900 tracking-tight">Monitoring</h2>
        <p className="text-sm text-stone-500">
          Periodically reverse-image-searches your IPs to find infringement anywhere on the internet.
        </p>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleEnabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              config?.enabled ? "bg-emerald-500" : "bg-stone-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                config?.enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span className="text-sm text-stone-700">
            {config?.enabled ? "Enabled" : "Disabled"}
          </span>

          {config?.enabled && (
            <select
              value={config.frequency}
              onChange={(e) => changeFrequency(e.target.value)}
              className="ml-4 px-3 py-1.5 border border-stone-200 rounded-lg text-sm bg-white"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          )}
        </div>
      </section>

      {/* Whitelisted domains */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-stone-900">Monitored Sources</h3>
        <p className="text-xs text-stone-500">
          Only results from these domains will be checked for infringement.
        </p>

        <form onSubmit={handleAddDomain} className="flex gap-2">
          <input
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="e.g. amazon.com"
            className="flex-1 px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600"
          />
          <button
            type="submit"
            disabled={!newDomain.trim()}
            className="px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 disabled:opacity-50"
          >
            Add
          </button>
        </form>

        {domains.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {domains.map((d) => (
              <span
                key={d.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-100 rounded-full text-sm text-stone-700"
              >
                {d.domain}
                <button
                  onClick={() => handleRemoveDomain(d.id)}
                  className="text-stone-400 hover:text-red-500"
                >
                  x
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Manual trigger per trademark */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-stone-900">Scan Now</h3>
        <div className="grid gap-2">
          {trademarks
            .filter((t) => t.centroid_dino)
            .map((t) => {
              const lastRun = runs.find((r) => r.trademark_id === t.id);
              const isRunning = lastRun && ["pending", "searching", "scanning"].includes(lastRun.status);
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between bg-white border border-stone-200 rounded-xl px-4 py-3"
                >
                  <div>
                    <span className="font-bold text-sm text-stone-900">{t.name}</span>
                    {lastRun && (
                      <span className="ml-3 text-xs text-stone-400">
                        Last: {lastRun.status} · {lastRun.cases_created} case{lastRun.cases_created !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleTrigger(t.id)}
                    disabled={!!isRunning}
                    className="px-3 py-1.5 text-xs font-semibold bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRunning ? "Running..." : "Scan"}
                  </button>
                </div>
              );
            })}
        </div>
      </section>

      {/* Recent runs */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-stone-900">Recent Runs</h3>
        {runs.length === 0 ? (
          <p className="text-xs text-stone-400">No runs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-stone-500 border-b border-stone-200">
                  <th className="py-2 pr-4">IP</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Found</th>
                  <th className="py-2 pr-4">After filter</th>
                  <th className="py-2 pr-4">Cases</th>
                  <th className="py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {runs.slice(0, 20).map((run) => (
                  <tr key={run.id} className="border-b border-stone-100">
                    <td className="py-2 pr-4 font-medium text-stone-900">
                      {run.trademark?.name ?? "—"}
                    </td>
                    <td className="py-2 pr-4">
                      <RunStatusBadge status={run.status} />
                    </td>
                    <td className="py-2 pr-4 text-stone-600">{run.results_found}</td>
                    <td className="py-2 pr-4 text-stone-600">{run.results_after_filter}</td>
                    <td className="py-2 pr-4">
                      <span className={run.cases_created > 0 ? "text-red-700 font-bold" : "text-stone-400"}>
                        {run.cases_created}
                      </span>
                    </td>
                    <td className="py-2 text-stone-400 text-xs">
                      {new Date(run.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function RunStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-stone-100 text-stone-600",
    searching: "bg-amber-50 text-amber-700",
    scanning: "bg-blue-50 text-blue-700",
    complete: "bg-emerald-50 text-emerald-700",
    failed: "bg-red-50 text-red-700",
  };
  const isActive = status === "searching" || status === "scanning";
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors[status] || colors.pending} ${isActive ? "animate-pulse" : ""}`}>
      {status}
    </span>
  );
}
