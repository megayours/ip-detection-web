import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  listSources,
  createSource,
  deleteSource,
  triggerCrawl,
  listCases,
  type MonitoredSource,
  type SourceType,
} from "../api";

const TIER_LIMIT = 5;

export default function MonitoredSources() {
  const [sources, setSources] = useState<MonitoredSource[]>([]);
  const [caseCounts, setCaseCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { sources: rows } = await listSources();
      setSources(rows);
    } catch (err) {
      console.error("Failed to load sources:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Fetch real case counts per source URL
  useEffect(() => {
    let cancelled = false;
    async function loadCounts() {
      const counts: Record<string, number> = {};
      await Promise.all(
        sources.map(async (s) => {
          try {
            const r = await listCases({ source_url: s.url, limit: 200 });
            counts[s.url] = r.cases.length;
          } catch {
            counts[s.url] = 0;
          }
        })
      );
      if (!cancelled) setCaseCounts(counts);
    }
    if (sources.length > 0) loadCounts();
    return () => {
      cancelled = true;
    };
  }, [sources]);

  const [showAdd, setShowAdd] = useState(false);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState<SourceType>("Marketplace");
  const [frequency, setFrequency] = useState("daily");
  const [submitting, setSubmitting] = useState(false);

  const atLimit = sources.length >= TIER_LIMIT;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || atLimit || submitting) return;
    setSubmitting(true);
    try {
      await createSource({
        url: url.trim(),
        label: label.trim() || "Untitled source",
        source_type: type,
        scan_frequency: frequency,
      });
      setUrl("");
      setLabel("");
      setType("Marketplace");
      setFrequency("daily");
      setShowAdd(false);
      await refresh();
    } catch (err: any) {
      alert(err.message || "Failed to add source");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(id: string) {
    try {
      await deleteSource(id);
      await refresh();
    } catch (err: any) {
      alert(err.message || "Failed to remove source");
    }
  }

  async function handleScanNow(id: string) {
    try {
      await triggerCrawl(id);
      await refresh();
    } catch (err: any) {
      alert(err.message || "Failed to trigger crawl");
    }
  }

  if (loading) {
    return (
      <section className="space-y-5">
        <div className="text-center py-16 text-stone-400 text-sm">Loading sources...</div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-stone-900 tracking-tight">
            Monitored Sources
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Platforms and pages we continuously scrape for infringements.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-stone-500">
            <span className="font-bold text-stone-900">{sources.length}</span>
            <span className="text-stone-400"> / {TIER_LIMIT}</span> sources · Basic plan
          </div>
          <button className="text-xs font-semibold text-red-700 hover:text-red-800 mt-0.5">
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
              ? "bg-stone-100 text-stone-600 hover:bg-stone-200"
              : atLimit
              ? "bg-stone-100 text-stone-400 cursor-not-allowed"
              : "bg-stone-900 text-white hover:bg-stone-800"
          }`}
        >
          {showAdd ? "Cancel" : atLimit ? "Upgrade to add more sources" : "Add source"}
        </button>
      </div>

      {showAdd && !atLimit && (
        <form
          onSubmit={handleAdd}
          className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 shadow-sm"
        >
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.ebay.com/usr/..."
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Label (optional)
            </label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Suspicious eBay seller"
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-all"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as SourceType)}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-all"
              >
                <option>Marketplace</option>
                <option>Social account</option>
                <option>Website</option>
                <option>Forum</option>
              </select>
              <p className="text-xs text-stone-400 mt-1">Auto-detected from URL when possible.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Scan frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-all"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option disabled>Hourly — Pro</option>
                <option disabled>Realtime — Pro</option>
              </select>
              <p className="text-xs text-stone-400 mt-1">Hourly & realtime require Pro plan.</p>
            </div>
          </div>
          <button
            type="submit"
            disabled={!url.trim() || submitting}
            className="px-5 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 disabled:opacity-50 transition-all"
          >
            {submitting ? "Adding..." : "Add source"}
          </button>
        </form>
      )}

      {sources.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto text-2xl">
            🔭
          </div>
          <p className="text-stone-500 text-sm">No sources yet.</p>
          <p className="text-stone-400 text-xs">
            Add a URL to start monitoring it for infringements.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {sources.map((s) => (
            <SourceCard
              key={s.id}
              source={s}
              caseCount={caseCounts[s.url] ?? 0}
              onRemove={() => handleRemove(s.id)}
              onScanNow={() => handleScanNow(s.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function formatLastScan(source: MonitoredSource): string {
  if (!source.last_crawl) return "Never";
  const d = new Date(source.last_crawl.created_at);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

function CrawlStatusBadge({ status }: { status: string }) {
  if (status === "crawling" || status === "scanning") {
    return (
      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full animate-pulse">
        {status === "crawling" ? "Crawling" : "Scanning"}
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="text-[10px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
        Failed
      </span>
    );
  }
  return null;
}

function SourceCard({
  source,
  caseCount,
  onRemove,
  onScanNow,
}: {
  source: MonitoredSource;
  caseCount: number;
  onRemove: () => void;
  onScanNow: () => void;
}) {
  let host = source.url;
  try {
    host = new URL(source.url).hostname.replace(/^www\./, "");
  } catch {
    /* ignore */
  }

  const casesHref = `/cases?source_url=${encodeURIComponent(source.url)}`;
  const isCrawling = source.last_crawl?.status === "crawling" || source.last_crawl?.status === "scanning";

  return (
    <div className="group bg-white rounded-2xl border border-stone-200 p-4 hover:border-stone-300 hover:shadow-lg hover:shadow-stone-100 transition-all">
      <div className="flex items-center gap-4">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center text-stone-500 font-black text-sm">
          {host.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-900 text-sm truncate">{source.label}</span>
            <span
              className={`shrink-0 w-1.5 h-1.5 rounded-full ${
                source.status === "active" ? "bg-emerald-500" : "bg-red-500"
              }`}
            />
          </div>
          <div className="text-xs text-stone-500 truncate">{source.url}</div>
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
            {source.source_type}
          </span>
          {source.last_crawl && <CrawlStatusBadge status={source.last_crawl.status} />}
          <Link
            to={casesHref}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
              caseCount > 0
                ? "text-red-700 bg-red-50 hover:bg-red-100"
                : "text-stone-400 bg-stone-50 hover:bg-stone-100"
            }`}
            title="Open cases for this source"
          >
            {caseCount} case{caseCount !== 1 ? "s" : ""}
          </Link>
          <span className="text-[10px] text-stone-400">{formatLastScan(source)}</span>
          <button
            onClick={onScanNow}
            disabled={isCrawling}
            className="text-[10px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full hover:bg-stone-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Trigger a crawl now"
          >
            Scan now
          </button>
        </div>
        <button
          onClick={onRemove}
          className="shrink-0 text-stone-300 hover:text-red-500 transition-colors p-1"
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
