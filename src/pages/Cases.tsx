import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { listCases, type Case, type CaseReviewStatus } from "../api";
import CaseCard from "../components/CaseCard";

const STATUSES: Array<{ key: CaseReviewStatus | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "dismissed", label: "Dismissed" },
];

export default function Cases() {
  const [params, setParams] = useSearchParams();
  const sourceUrl = params.get("source_url") ?? undefined;
  const trademarkId = params.get("trademark_id") ?? undefined;
  const statusParam = (params.get("status") as CaseReviewStatus | null) ?? "all";

  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    listCases({
      source_url: sourceUrl,
      trademark_id: trademarkId,
      status: statusParam === "all" ? undefined : statusParam,
    })
      .then((r) => setCases(r.cases))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [sourceUrl, trademarkId, statusParam]);

  function setStatus(s: CaseReviewStatus | "all") {
    const next = new URLSearchParams(params);
    if (s === "all") next.delete("status");
    else next.set("status", s);
    setParams(next, { replace: true });
  }

  function clearFilter(key: string) {
    const next = new URLSearchParams(params);
    next.delete(key);
    setParams(next, { replace: true });
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cases</h1>
        <p className="mt-1 text-sm text-slate-500">
          Persistent infringement candidates produced by the scan pipeline. Each case
          carries the screenshot, pipeline trace, and per-stage evidence.
        </p>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const active = (s.key === "all" && statusParam === "all") || s.key === statusParam;
          return (
            <button
              key={s.key}
              onClick={() => setStatus(s.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                active
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Active filters */}
      {(sourceUrl || trademarkId) && (
        <div className="flex flex-wrap gap-2 text-xs">
          {sourceUrl && (
            <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 px-3 py-1 rounded-full">
              source: {prettyHost(sourceUrl)}
              <button
                onClick={() => clearFilter("source_url")}
                className="text-rose-400 hover:text-rose-700 font-bold"
                title="Clear filter"
              >
                ×
              </button>
            </span>
          )}
          {trademarkId && (
            <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 px-3 py-1 rounded-full">
              IP filter
              <button
                onClick={() => clearFilter("trademark_id")}
                className="text-rose-400 hover:text-rose-700 font-bold"
                title="Clear filter"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-5 py-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : cases.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-2xl">
            ⚖️
          </div>
          <p className="text-slate-500 text-sm">No cases yet.</p>
          <p className="text-slate-400 text-xs">
            Run a scan to generate cases against your registered IPs.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {cases.map((c) => (
            <CaseCard key={c.id} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function prettyHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
