import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  addIpMonitoringPlatform,
  listMonitoredIps,
  listTrademarks,
  removeIpMonitoring,
  type MonitoredIpSummary,
  type Trademark,
} from "../api";
import { PlatformsPanel } from "../components/monitoring/PlatformsPanel";
import { COUNTRIES, countryLabel } from "../lib/countries";

/**
 * Per-IP monitoring management page. Add new monitored IPs, see each IP's
 * watched platforms, link to Audit log.
 */
export default function Monitors() {
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
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-black text-stone-900 tracking-tight">Monitoring</h1>
        <p className="mt-1 text-sm text-stone-500">
          Which intellectual properties are being watched, and on which platforms.
        </p>
      </div>

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
  const [removing, setRemoving] = useState(false);
  const [err, setErr] = useState("");

  async function stopMonitoring() {
    if (removing) return;
    if (!confirm(`Stop monitoring ${ip.ip_name}? This removes all its watched platforms.`)) return;
    setRemoving(true);
    setErr("");
    try {
      await removeIpMonitoring(ip.ip_id);
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setRemoving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <Link
            to={`/ips/${ip.ip_id}`}
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
                <Link to={`/ips/${ip.ip_id}`} className="underline">
                  set them on the IP page
                </Link>{" "}
                so the scrape has search terms.
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to={`/ips/${ip.ip_id}/audit`}
            className="text-xs text-blue-700 hover:underline"
          >
            Audit log →
          </Link>
          <button
            type="button"
            onClick={stopMonitoring}
            disabled={removing}
            className="text-xs text-stone-400 hover:text-red-600 font-semibold disabled:opacity-50"
            title="Stop monitoring this IP"
          >
            {removing ? "Removing…" : "Stop monitoring"}
          </button>
        </div>
      </div>

      {err && <div className="text-xs text-red-600">{err}</div>}

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
  const [pickedCountry, setPickedCountry] = useState("");
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
      await addIpMonitoringPlatform(picked, url.trim(), pickedCountry || null);
      setPicked("");
      setPickedCountry("");
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
          <Link to="/ips" className="text-blue-700 hover:underline">
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
          <select
            value={pickedCountry}
            onChange={(e) => setPickedCountry(e.target.value)}
            title="See the platform as a shopper in this country would — optional"
            className="px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs bg-white text-stone-700 min-w-[10rem]"
          >
            <option value="">🌐 Anywhere</option>
            {COUNTRIES.map((cn) => (
              <option key={cn.code} value={cn.code}>
                {countryLabel(cn.code)}
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
