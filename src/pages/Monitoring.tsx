import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  listMonitoringFindingsGlobal,
  listMonitoredIps,
  listTrademarks,
  addIpMonitoringPlatform,
  type IpReviewFinding,
  type MonitoredIpSummary,
  type Trademark,
} from "../api";
import { MonitoringBoard } from "../components/monitoring/MonitoringBoard";
import { PlatformsPanel } from "../components/monitoring/PlatformsPanel";

type Tab = "findings" | "ips";

/**
 * Top-level Infringement Monitoring hub. Clients land here on a tenant-wide
 * findings list (across every monitored IP) without drilling into each IP,
 * and manage which IPs/platforms are watched from the second tab.
 */
export default function Monitoring() {
  const [tab, setTab] = useState<Tab>("findings");

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold tracking-tight">Infringement Monitoring</h1>
      </div>

      <div className="flex items-center gap-6 border-b border-stone-200">
        <TabButton active={tab === "findings"} onClick={() => setTab("findings")} label="Findings" />
        <TabButton active={tab === "ips"} onClick={() => setTab("ips")} label="Monitored IPs" />
      </div>

      {tab === "findings" ? <FindingsTab /> : <MonitoredIpsTab />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px py-2 border-b-2 text-sm font-medium transition-colors ${
        active
          ? "border-stone-900 text-stone-900"
          : "border-transparent text-stone-500 hover:text-stone-800"
      }`}
    >
      {label}
    </button>
  );
}

// --- Findings tab: tenant-wide board, filterable by IP + platform ---

function FindingsTab() {
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
        <p className="text-sm text-stone-500">
          {liveCount} open finding{liveCount === 1 ? "" : "s"} across all monitored IPs
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
            Add platforms under <span className="font-semibold">Monitored IPs</span>.
          </p>
        </div>
      ) : (
        <MonitoringBoard
          findings={findings}
          runInProgress={false}
          onRefresh={load}
          showIpColumn
        />
      )}
    </div>
  );
}

// --- Monitored IPs tab: per-IP platforms panels + add-a-new-IP picker ---

function MonitoredIpsTab() {
  const [ips, setIps] = useState<MonitoredIpSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const { ips } = await listMonitoredIps();
      setIps(ips);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <AddMonitoredIp monitoredIds={ips.map((i) => i.ip_id)} onAdded={load} />

      {err && <div className="text-sm text-red-600">{err}</div>}

      {!loaded ? (
        <div className="text-sm text-stone-400 py-8 text-center">Loading…</div>
      ) : ips.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white px-5 py-12 text-center">
          <p className="text-sm text-stone-600">No IPs are being monitored yet</p>
          <p className="text-xs text-stone-400 mt-1">
            Use “+ Monitor a new IP” above to start watching one.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {ips.map((ip) => (
            <MonitoredIpCard key={ip.ip_id} ip={ip} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function MonitoredIpCard({
  ip,
  onChanged,
}: {
  ip: MonitoredIpSummary;
  onChanged: () => void;
}) {
  const hasKeywords = (ip.keywords ?? []).length > 0;
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <Link
            to={`/registry/${ip.ip_id}`}
            className="text-base font-bold text-stone-900 hover:underline"
          >
            {ip.ip_name}
          </Link>
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            {hasKeywords ? (
              (ip.keywords ?? []).map((k, i) => (
                <span
                  key={`${i}-${k}`}
                  className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[11px]"
                >
                  {k}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-amber-700">
                No keywords —{" "}
                <Link to={`/registry/${ip.ip_id}`} className="underline">
                  set them on the IP page
                </Link>{" "}
                so the scrape has search terms.
              </span>
            )}
          </div>
        </div>
        <Link
          to={`/registry/${ip.ip_id}/audit`}
          className="text-xs text-blue-700 hover:underline shrink-0"
        >
          Audit log →
        </Link>
      </div>

      <PlatformsPanel
        ipId={ip.ip_id}
        keywords={ip.keywords}
        onPlatformsChanged={onChanged}
      />
    </div>
  );
}

// Pick a registered IP not already monitored and seed it with a first
// platform — that POST creates the monitored-domain link for the IP.
function AddMonitoredIp({
  monitoredIds,
  onAdded,
}: {
  monitoredIds: string[];
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState<Trademark[] | null>(null);
  const [picked, setPicked] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function ensureLoaded() {
    if (all) return;
    try {
      const { trademarks } = await listTrademarks();
      setAll(trademarks);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  const available = useMemo(
    () => (all ?? []).filter((t) => !monitoredIds.includes(t.id)),
    [all, monitoredIds],
  );

  async function add() {
    if (!picked || busy) return;
    const url = prompt("First platform to monitor (URL or domain), e.g. etsy.com:");
    if (!url || !url.trim()) return;
    setBusy(true);
    setErr("");
    try {
      await addIpMonitoringPlatform(picked, url.trim());
      setPicked("");
      setOpen(false);
      onAdded();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            void ensureLoaded();
          }}
          className="px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800"
        >
          + Monitor a new IP
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white px-5 py-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">
          Monitor a new IP
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-stone-400 hover:text-stone-700 text-xs"
        >
          Cancel
        </button>
      </div>
      {err && <div className="text-xs text-red-600">{err}</div>}
      {all === null ? (
        <div className="text-xs text-stone-400 italic">Loading IPs…</div>
      ) : available.length === 0 ? (
        <div className="text-xs text-stone-400 italic">
          All your IPs are already monitored.{" "}
          <Link to="/registry" className="text-blue-700 hover:underline">
            Register a new IP →
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={picked}
            onChange={(e) => setPicked(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs bg-white text-stone-700 flex-1 min-w-[12rem]"
          >
            <option value="">Select an IP…</option>
            {available.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={add}
            disabled={!picked || busy}
            className="px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-semibold disabled:opacity-50"
          >
            {busy ? "Adding…" : "Add"}
          </button>
        </div>
      )}
    </div>
  );
}
