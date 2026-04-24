import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createAdminIp,
  getAdminSyncStatus,
  listAdminIps,
  triggerAdminReindex,
  triggerAdminSync,
  type AdminIpSummary,
  type ReindexResult,
  type SyncStatus,
} from "../api";

function formatTimeAgo(ts: number | null): string {
  if (!ts) return "never";
  const secs = Math.round((Date.now() - ts) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.round(secs / 60)}m ago`;
  return `${Math.round(secs / 3600)}h ago`;
}

export default function Admin() {
  const [ips, setIps] = useState<AdminIpSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newGuidelines, setNewGuidelines] = useState("");
  const [creating, setCreating] = useState(false);

  // Reindex confirm dialog + last-run summary
  const [showReindex, setShowReindex] = useState(false);
  const [reindexAllTenants, setReindexAllTenants] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [reindexResult, setReindexResult] = useState<ReindexResult | null>(null);

  async function load() {
    try {
      const [{ ips }, status] = await Promise.all([
        listAdminIps(),
        getAdminSyncStatus(),
      ]);
      setIps(ips);
      setSyncStatus(status);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSync() {
    setSyncing(true);
    setError("");
    try {
      await triggerAdminSync();
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSyncing(false);
    }
  }

  async function handleReindex() {
    setReindexing(true);
    setError("");
    try {
      const res = await triggerAdminReindex({ all_tenants: reindexAllTenants });
      setReindexResult(res);
      setShowReindex(false);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setReindexing(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError("");
    try {
      await createAdminIp({
        name,
        description: newDescription.trim() || undefined,
        guidelines: newGuidelines.trim() || undefined,
      });
      setNewName("");
      setNewDescription("");
      setNewGuidelines("");
      setShowCreate(false);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  const filtered = useMemo(
    () =>
      ips.filter((ip) => {
        const q = filter.toLowerCase();
        return (
          ip.name.toLowerCase().includes(q) ||
          (ip.tenant_label ?? "").toLowerCase().includes(q)
        );
      }),
    [ips, filter]
  );

  const totals = useMemo(() => {
    const images = ips.reduce((n, ip) => n + ip.image_count, 0);
    const tenants = new Set(ips.map((ip) => ip.tenant_label).filter(Boolean));
    const indexed = ips.filter((ip) => ip.centroid_ready).length;
    return { images, tenants: tenants.size, indexed };
  }, [ips]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">Admin · IP References</h1>
          <p className="mt-1 text-sm text-stone-500">
            Manage every IP across the workspace. Edits reindex automatically on the next sync.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreate((v) => !v)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              showCreate
                ? "bg-stone-100 text-stone-600 hover:bg-stone-200"
                : "bg-stone-900 text-white hover:bg-stone-800"
            }`}
          >
            {showCreate ? "Cancel" : "Create IP"}
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 disabled:opacity-50 transition-all"
          >
            {syncing ? "Syncing..." : "Sync now"}
          </button>
          <button
            onClick={() => setShowReindex(true)}
            disabled={reindexing}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-all"
          >
            {reindexing ? "Reindexing..." : "Re-index"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 shadow-sm"
        >
          <h2 className="text-sm font-bold text-stone-900">New IP</h2>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. ACME CORP"
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-all"
            />
            <p className="text-xs text-stone-400 mt-1">
              Use the canonical uppercase name. Reference images can be added after creating.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Description (optional)</label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-all resize-y"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Guidelines (optional)</label>
            <textarea
              value={newGuidelines}
              onChange={(e) => setNewGuidelines(e.target.value)}
              rows={4}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-all resize-y"
            />
          </div>
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="px-5 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 disabled:opacity-50 transition-all"
          >
            {creating ? "Creating..." : "Create IP"}
          </button>
        </form>
      )}

      {/* Re-index confirm modal */}
      {showReindex && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-lg font-bold">!</div>
              <h2 className="text-lg font-black text-stone-900">Re-index every IP</h2>
            </div>

            <div className="text-sm text-stone-600 space-y-2">
              <p>
                This regenerates embeddings and auto-augmented variants for every indexed IP.
                It's the right move after changes to the pipeline, reference sets, or the
                augmentation classifier — but it's expensive.
              </p>
              <ul className="list-disc list-inside text-stone-500 space-y-1 text-xs">
                <li>Every reference image gets re-embedded from scratch.</li>
                <li>Existing augmented variants are <strong>deleted and regenerated</strong>.</li>
                <li>Centroids + proximity thresholds reset — affected IPs briefly return no matches until their index job finishes.</li>
                <li>
                  On Apple Silicon this takes roughly <strong>2 hours</strong> for the full set;
                  on GPU workers (RunPod A100) closer to <strong>15–20 minutes</strong>.
                </li>
                <li>Jobs run FIFO in the worker queue — in-flight scan/clearance queries will queue behind the re-index jobs.</li>
              </ul>
            </div>

            <label className="flex items-center gap-2 text-sm text-stone-700 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2">
              <input
                type="checkbox"
                checked={reindexAllTenants}
                onChange={(e) => setReindexAllTenants(e.target.checked)}
                className="rounded"
              />
              <span>Include every tenant's IPs (not just yours)</span>
            </label>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowReindex(false)}
                disabled={reindexing}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 disabled:opacity-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleReindex}
                disabled={reindexing}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-all ml-auto"
              >
                {reindexing ? "Enqueueing..." : "Start re-index"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Re-index result summary */}
      {reindexResult && !showReindex && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm space-y-1">
          <div className="flex items-center justify-between">
            <p className="font-bold text-amber-800">
              Re-index enqueued — {reindexResult.enqueued} / {reindexResult.target_count} IPs
            </p>
            <button
              onClick={() => setReindexResult(null)}
              className="text-amber-600 hover:text-amber-800 text-xs"
            >
              dismiss
            </button>
          </div>
          <p className="text-amber-700 text-xs">
            {reindexResult.total_reset} originals reset · {reindexResult.total_removed_augmented} augmented variants cleared.
            Worker will process jobs FIFO; centroids come back online as each job completes.
          </p>
        </div>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="IPs" value={ips.length.toString()} />
        <StatCard label="Total images" value={totals.images.toString()} />
        <StatCard label="Tenants" value={totals.tenants.toString()} />
      </div>

      {/* Sync status */}
      <section className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900">Last sync</h2>
          <span className="text-xs text-stone-500">{formatTimeAgo(syncStatus?.last_run_at ?? null)}</span>
        </div>
        {syncStatus?.last_result ? (
          <div className="grid grid-cols-4 gap-3 text-sm">
            <SyncMetric label="Scanned" value={syncStatus.last_result.scannedIps} />
            <SyncMetric label="Added" value={syncStatus.last_result.totalAdded} tone="emerald" />
            <SyncMetric label="Changed" value={syncStatus.last_result.totalChanged} tone="amber" />
            <SyncMetric label="Removed" value={syncStatus.last_result.totalRemoved} tone="red" />
          </div>
        ) : (
          <p className="text-xs text-stone-400">
            No sync has run yet. Sync reconciles the reference store with the index.
          </p>
        )}
        {syncStatus?.last_result && syncStatus.last_result.errors.length > 0 && (
          <div className="text-xs text-red-600 border-t border-stone-100 pt-3">
            {syncStatus.last_result.errors.length} error(s) during sync — first: {syncStatus.last_result.errors[0].ip}: {syncStatus.last_result.errors[0].error}
          </div>
        )}
      </section>

      {/* Filter */}
      <div>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by IP name or tenant..."
          className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-all"
        />
      </div>

      {/* IP list */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-stone-500 text-sm">
            {ips.length === 0 ? "No IPs yet." : "No IPs match that filter."}
          </p>
          {ips.length === 0 && (
            <p className="text-stone-400 text-xs">Click "Create IP" to add your first.</p>
          )}
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map((ip) => (
            <Link
              key={ip.id || ip.name}
              to={`/admin/ips/${encodeURIComponent(ip.name)}`}
              className="group bg-white rounded-xl border border-stone-200 px-5 py-4 hover:border-stone-300 hover:shadow-md hover:shadow-stone-100 transition-all flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <h3 className="font-bold text-stone-900 group-hover:text-red-700 transition-colors truncate">
                  {ip.name}
                </h3>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-stone-500">
                  <span>
                    {ip.image_count} image{ip.image_count !== 1 ? "s" : ""}
                  </span>
                  {ip.tenant_label && (
                    <>
                      <span className="text-stone-300">·</span>
                      <span className="truncate">{ip.tenant_label}</span>
                    </>
                  )}
                  {!ip.synced && (
                    <>
                      <span className="text-stone-300">·</span>
                      <span className="text-amber-600">unsynced</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <IpStatusBadge ip={ip} />
                <span className="text-stone-300 group-hover:text-stone-500 transition-colors">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
      <div className="text-xs font-medium text-stone-500 uppercase tracking-wide">{label}</div>
      <div className="mt-1 text-2xl font-black text-stone-900">{value}</div>
    </div>
  );
}

function SyncMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "emerald" | "amber" | "red";
}) {
  const toneColor =
    tone === "emerald"
      ? "text-emerald-600"
      : tone === "amber"
        ? "text-amber-600"
        : tone === "red"
          ? "text-red-600"
          : "text-stone-900";
  return (
    <div>
      <div className="text-xs text-stone-500">{label}</div>
      <div className={`text-lg font-bold ${toneColor}`}>{value}</div>
    </div>
  );
}

function IpStatusBadge({ ip }: { ip: AdminIpSummary }) {
  if (ip.centroid_ready) {
    return (
      <span className="inline-block text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
        Indexed
      </span>
    );
  }
  if (ip.indexed_count > 0) {
    return (
      <span className="inline-block text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full">
        Partial
      </span>
    );
  }
  return (
    <span className="inline-block text-xs font-semibold text-stone-400 bg-stone-50 px-2.5 py-0.5 rounded-full">
      Pending
    </span>
  );
}
