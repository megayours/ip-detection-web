import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAdminSyncStatus,
  listAdminIps,
  triggerAdminSync,
  type AdminIpSummary,
  type SyncStatus,
} from "../api";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

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

  const filtered = ips.filter((ip) =>
    ip.name.toLowerCase().includes(filter.toLowerCase())
  );
  const totalImages = ips.reduce((n, ip) => n + ip.image_count, 0);
  const totalSize = ips.reduce((n, ip) => n + ip.total_size, 0);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">Admin · IP References</h1>
          <p className="mt-1 text-sm text-stone-500">
            S3-backed source of truth. Edits here flow into the detection index on the next sync.
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50 transition-all"
        >
          {syncing ? "Syncing..." : "Sync now"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="IP folders" value={ips.length.toString()} />
        <StatCard label="Total images" value={totalImages.toString()} />
        <StatCard label="Storage used" value={formatBytes(totalSize)} />
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
          <p className="text-xs text-stone-400">No sync has run yet. Click "Sync now" to populate the index from S3.</p>
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
          placeholder="Filter IP folders..."
          className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-all"
        />
      </div>

      {/* IP folder grid */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-stone-500 text-sm">
            {ips.length === 0
              ? "No IP folders in S3 yet."
              : "No IPs match that filter."}
          </p>
          {ips.length === 0 && (
            <p className="text-stone-400 text-xs">
              Upload images via the scraper (<code>--s3</code>) or directly into
              an IP folder below to get started.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map((ip) => (
            <Link
              key={ip.name}
              to={`/admin/ips/${encodeURIComponent(ip.name)}`}
              className="group bg-white rounded-xl border border-stone-200 px-5 py-4 hover:border-stone-300 hover:shadow-md hover:shadow-stone-100 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-stone-300 text-lg">📁</span>
                <div className="min-w-0">
                  <h3 className="font-bold text-stone-900 group-hover:text-red-700 transition-colors truncate">
                    {ip.name}
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {ip.image_count} image{ip.image_count !== 1 ? "s" : ""} · {formatBytes(ip.total_size)}
                  </p>
                </div>
              </div>
              <span className="text-stone-300 group-hover:text-stone-500 transition-colors">
                →
              </span>
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
