import { useState } from "react";

type SourceType = "Marketplace" | "Social account" | "Website" | "Forum";
type SourceStatus = "active" | "paused";

interface Source {
  id: string;
  url: string;
  label: string;
  type: SourceType;
  lastScan: string;
  findings: number;
  status: SourceStatus;
}

const TIER_LIMIT = 5;

const SEED: Source[] = [
  {
    id: "s1",
    url: "https://www.ebay.com/sch/i.html?_nkw=acme+plush",
    label: "Suspicious eBay seller",
    type: "Marketplace",
    lastScan: "2h ago",
    findings: 12,
    status: "active",
  },
  {
    id: "s2",
    url: "https://x.com/knockoff_drops",
    label: "Knockoff drops account",
    type: "Social account",
    lastScan: "1d ago",
    findings: 3,
    status: "active",
  },
];

export default function MonitoredSources() {
  const [sources, setSources] = useState<Source[]>(SEED);
  const [showAdd, setShowAdd] = useState(false);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState<SourceType>("Marketplace");
  const [frequency, setFrequency] = useState("Daily");

  const atLimit = sources.length >= TIER_LIMIT;

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || atLimit) return;
    setSources([
      ...sources,
      {
        id: `s${Date.now()}`,
        url: url.trim(),
        label: label.trim() || "Untitled source",
        type,
        lastScan: "just now",
        findings: 0,
        status: "active",
      },
    ]);
    setUrl("");
    setLabel("");
    setType("Marketplace");
    setFrequency("Daily");
    setShowAdd(false);
  }

  function removeSource(id: string) {
    setSources(sources.filter((s) => s.id !== id));
  }

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            Monitored Sources
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Platforms and pages we continuously scrape for infringements.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">
            <span className="font-bold text-slate-900">{sources.length}</span>
            <span className="text-slate-400"> / {TIER_LIMIT}</span> sources · Basic plan
          </div>
          <button className="text-xs font-semibold text-rose-600 hover:text-rose-700 mt-0.5">
            Upgrade →
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd(!showAdd)}
          disabled={atLimit && !showAdd}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            showAdd
              ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
              : atLimit
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/20 hover:from-rose-600 hover:to-rose-700"
          }`}
        >
          {showAdd ? "Cancel" : atLimit ? "Upgrade to add more sources" : "Add source"}
        </button>
      </div>

      {showAdd && !atLimit && (
        <form
          onSubmit={handleAdd}
          className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.ebay.com/usr/..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Label (optional)
            </label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Suspicious eBay seller"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as SourceType)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
              >
                <option>Marketplace</option>
                <option>Social account</option>
                <option>Website</option>
                <option>Forum</option>
              </select>
              <p className="text-xs text-slate-400 mt-1">Auto-detected from URL when possible.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Scan frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
              >
                <option>Daily</option>
                <option disabled>Hourly — Pro</option>
                <option disabled>Realtime — Pro</option>
              </select>
              <p className="text-xs text-slate-400 mt-1">Hourly & realtime require Pro plan.</p>
            </div>
          </div>
          <button
            type="submit"
            disabled={!url.trim()}
            className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-xl text-sm font-semibold hover:from-rose-600 hover:to-rose-700 disabled:opacity-50 transition-all shadow-lg shadow-rose-500/20"
          >
            Add source
          </button>
        </form>
      )}

      {sources.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-2xl">
            🔭
          </div>
          <p className="text-slate-500 text-sm">No sources yet.</p>
          <p className="text-slate-400 text-xs">
            Add a URL to start monitoring it for infringements.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {sources.map((s) => (
            <SourceCard key={s.id} source={s} onRemove={() => removeSource(s.id)} />
          ))}
        </div>
      )}
    </section>
  );
}

function SourceCard({ source, onRemove }: { source: Source; onRemove: () => void }) {
  let host = source.url;
  try {
    host = new URL(source.url).hostname.replace(/^www\./, "");
  } catch {
    /* ignore */
  }

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-100 transition-all">
      <div className="flex items-center gap-4">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-black text-sm">
          {host.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm truncate">{source.label}</span>
            <span
              className={`shrink-0 w-1.5 h-1.5 rounded-full ${
                source.status === "active" ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
          </div>
          <div className="text-xs text-slate-500 truncate">{source.url}</div>
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {source.type}
          </span>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              source.findings > 0
                ? "text-rose-700 bg-rose-50"
                : "text-slate-400 bg-slate-50"
            }`}
          >
            {source.findings} findings
          </span>
          <span className="text-[10px] text-slate-400">{source.lastScan}</span>
        </div>
        <button
          onClick={onRemove}
          className="shrink-0 text-slate-300 hover:text-red-500 transition-colors p-1"
          title="Remove source"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
