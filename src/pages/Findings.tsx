import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import {
  listMonitoringFindingsGlobal,
  type IpReviewFinding,
} from "../api";
import { MonitoringBoard } from "../components/monitoring/MonitoringBoard";

/** Legacy route — redirects to the unified Inbox under the Monitoring tab. */
export default function Findings() {
  return <Navigate to="/inbox?tab=monitoring" replace />;
}

/**
 * Tenant-wide infringement findings board, embeddable inside the unified
 * Inbox tabs. Status filter pre-applied from the `?status=` URL param
 * (e.g. dashboard KPI deep links).
 */
export function MonitoringInboxView() {
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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-stone-500">
          {liveCount} open finding{liveCount === 1 ? "" : "s"} across all monitored IPs.
        </p>
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
