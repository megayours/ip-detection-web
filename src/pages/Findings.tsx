import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  listMonitoringFindingsGlobal,
  type IpReviewFinding,
} from "../api";
import { MonitoringBoard } from "../components/monitoring/MonitoringBoard";

/**
 * Tenant-wide infringement findings board. Status filter pre-applied from the
 * `?status=` URL param (e.g. dashboard KPI deep links).
 */
export default function Findings() {
  const [params] = useSearchParams();
  const initialStatus = params.get("status");
  const [findings, setFindings] = useState<IpReviewFinding[]>([]);
  const [includeDismissed, setIncludeDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const { findings } = await listMonitoringFindingsGlobal({
        include_dismissed: includeDismissed,
      });
      setFindings(findings);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoaded(true);
    }
  }, [includeDismissed]);

  useEffect(() => {
    void load();
  }, [load]);

  const liveCount = useMemo(
    () => findings.filter((f) => !f.dismissed_at).length,
    [findings],
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">Findings</h1>
          <p className="mt-1 text-sm text-stone-500">
            {liveCount} open finding{liveCount === 1 ? "" : "s"} across all monitored IPs.
          </p>
        </div>
        <label className="flex items-center gap-2 text-[11px] text-stone-500">
          <input
            type="checkbox"
            checked={includeDismissed}
            onChange={(e) => setIncludeDismissed(e.target.checked)}
          />
          Include dismissed
        </label>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      {!loaded ? (
        <div className="text-sm text-stone-400 py-8 text-center">Loading…</div>
      ) : findings.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white px-5 py-12 text-center">
          <p className="text-sm text-stone-600">No findings yet</p>
          <p className="text-xs text-stone-400 mt-1">
            Add platforms under <span className="font-semibold">Monitoring</span>.
          </p>
        </div>
      ) : (
        <MonitoringBoard
          findings={findings}
          runInProgress={false}
          onRefresh={load}
          showIpColumn
          initialStatus={initialStatus}
        />
      )}
    </div>
  );
}
