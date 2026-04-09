import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { listTrademarks, createTrademark, type Trademark } from "../api";
import BulkIngest from "../components/BulkIngest";
import MonitoredSources from "../components/MonitoredSources";

export default function Registry() {
  const [ips, setIps] = useState<Trademark[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [guidelines, setGuidelines] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const { trademarks } = await listTrademarks();
      setIps(trademarks);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError("");
    try {
      await createTrademark(
        name.trim(),
        description.trim() || undefined,
        guidelines.trim() || undefined,
      );
      setName("");
      setDescription("");
      setGuidelines("");
      setShowCreate(false);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">IP Registry</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your intellectual property and the sources we monitor for infringements.
        </p>
      </div>

      {/* Section 1 — bulk ingest */}
      <BulkIngest />

      {/* Section 2 — IP list */}
      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Your IPs</h2>
            <p className="mt-1 text-sm text-slate-500">
              Reference assets for every IP we protect on your behalf.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              showCreate
                ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                : "bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/20 hover:from-rose-600 hover:to-rose-700"
            }`}
          >
            {showCreate ? "Cancel" : "Add IP"}
          </button>
        </div>

        {showCreate && (
          <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">IP Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. ACME Corp Logo"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Description (optional)</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the IP"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Guidelines (optional)</label>
              <textarea
                value={guidelines}
                onChange={(e) => setGuidelines(e.target.value)}
                rows={5}
                placeholder="Plain English rules a vision-language model will check on every submission. e.g. Hands must have 3 thick fingers and 1 thumb. Bow tie always present and red. No nails or visible joints."
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all resize-y"
              />
              <p className="text-xs text-slate-400 mt-1">
                Identity, style and canonical proximity are checked automatically — only put what's not covered there.
              </p>
            </div>
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-xl text-sm font-semibold hover:from-rose-600 hover:to-rose-700 disabled:opacity-50 transition-all shadow-lg shadow-rose-500/20"
            >
              {creating ? "Adding..." : "Add IP"}
            </button>
          </form>
        )}

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : ips.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
              <span className="text-2xl">&#x1F50D;</span>
            </div>
            <p className="text-slate-500 text-sm">No IPs registered yet.</p>
            <p className="text-slate-400 text-xs">Add your first IP to start detecting infringement.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {ips.map((ip) => (
              <Link
                key={ip.id}
                to={`/registry/${ip.id}`}
                className="group bg-white rounded-2xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-100 transition-all block"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 group-hover:text-rose-600 transition-colors">{ip.name}</h3>
                    {ip.description && <p className="text-sm text-slate-500 mt-1">{ip.description}</p>}
                  </div>
                  <div className="text-right text-sm space-y-1">
                    <p className="text-slate-500">
                      {ip.image_count} ref{ip.image_count !== 1 ? "s" : ""}
                    </p>
                    <StatusBadge ip={ip} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Section 3 — monitored sources */}
      <MonitoredSources />
    </div>
  );
}

function StatusBadge({ ip }: { ip: Trademark }) {
  if (ip.centroid_dino) {
    return <span className="inline-block text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">Indexed</span>;
  }
  if (ip.indexed_count > 0) {
    return <span className="inline-block text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full">Partial</span>;
  }
  return <span className="inline-block text-xs font-semibold text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded-full">Pending</span>;
}
