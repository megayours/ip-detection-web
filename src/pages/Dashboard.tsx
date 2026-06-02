import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getDashboardSummary,
  listMonitoredIps,
  type DashboardSummary,
  type MonitoredIpSummary,
} from "../api";

type Days = 7 | 30 | 90;

/**
 * Tenant dashboard. One round-trip to /api/monitoring/dashboard/summary; KPI
 * tiles deep-link into the filtered Findings board. An optional IP filter
 * (`?ip=`) narrows every aggregate to a single monitored IP and threads
 * through into the deep-links.
 */
export default function Dashboard() {
  const [days, setDays] = useState<Days>(30);
  const [params, setParams] = useSearchParams();
  const ipId = params.get("ip");
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [ips, setIps] = useState<MonitoredIpSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // The IP picker is populated from the full monitored-IP list (stable —
  // independent of the active filter, so selecting an IP doesn't shrink the
  // options). Fetched once.
  useEffect(() => {
    let alive = true;
    listMonitoredIps()
      .then(({ ips }) => alive && setIps(ips))
      .catch(() => {/* non-fatal — picker just stays empty */});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    // Kick the fetch; don't reset state synchronously here — the next
    // resolved value replaces it. (Avoids cascading renders.)
    getDashboardSummary(days, ipId)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setErr("");
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [days, ipId]);

  function setIpFilter(next: string | null) {
    const p = new URLSearchParams(params);
    if (next) p.set("ip", next);
    else p.delete("ip");
    setParams(p, { replace: true });
  }

  if (loading && !data) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-6">
        <DashboardSkeleton />
      </div>
    );
  }

  if (err) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {err}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const empty = data.kpis.ips_monitored === 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-stone-500">
            Last {data.days} day{data.days === 1 ? "" : "s"} of monitoring activity
            {ipId ? " · filtered to one IP" : ""}.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <IpFilter ips={ips} value={ipId} onChange={setIpFilter} />
          <RangeToggle days={days} onChange={setDays} />
        </div>
      </div>

      {empty ? (
        <div className="rounded-2xl border border-stone-200 bg-white px-6 py-16 text-center">
          <p className="text-base font-semibold text-stone-700">
            No IPs are being monitored yet
          </p>
          <p className="mt-1 text-sm text-stone-500">
            Watch your first intellectual property to start gathering findings.
          </p>
          <Link
            to="/monitoring/settings"
            className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-full bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-colors"
          >
            Start monitoring an IP →
          </Link>
        </div>
      ) : (
        <>
          <UnlicensedMarketHero
            totalUsd={data.kpis.total_unlicensed_market_usd ?? 0}
          />
          <KpiRow kpis={data.kpis} ipId={ipId} />
          <TimeSeriesCard timeseries={data.timeseries} />
          <div className="grid lg:grid-cols-2 gap-4">
            <PlatformsCard platforms={data.platforms} />
            <SellersCard sellers={data.sellers} ipId={ipId} />
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <IpsCard ips={data.ips} activeIpId={ipId} onSelectIp={setIpFilter} />
            <CountriesCard countries={data.countries} />
          </div>
        </>
      )}
    </div>
  );
}

function IpFilter({
  ips,
  value,
  onChange,
}: {
  ips: MonitoredIpSummary[];
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  // Keep the active IP selectable even if it's not in the list (e.g. it has
  // no monitored domains anymore) so the user can always clear the filter.
  const hasActive = !value || ips.some((ip) => ip.ip_id === value);
  return (
    <select
      value={value ?? "all"}
      onChange={(e) => onChange(e.target.value === "all" ? null : e.target.value)}
      title="Filter by IP"
      className="px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs bg-white text-stone-700 max-w-[16rem] focus:outline-none focus:ring-1 focus:ring-stone-300"
    >
      <option value="all">All IPs</option>
      {!hasActive && value && <option value={value}>Selected IP</option>}
      {ips.map((ip) => (
        <option key={ip.ip_id} value={ip.ip_id}>
          {ip.ip_name}
        </option>
      ))}
    </select>
  );
}

/** Append the active dashboard IP filter to a Tasks deep-link as `ip_id`
 *  (the param the board reads), preserving any existing query string. */
function withIp(path: string, ipId: string | null): string {
  if (!ipId) return path;
  const [base, qs] = path.split("?");
  const p = new URLSearchParams(qs);
  p.set("ip_id", ipId);
  return `${base}?${p.toString()}`;
}

function RangeToggle({ days, onChange }: { days: Days; onChange: (d: Days) => void }) {
  const opts: Days[] = [7, 30, 90];
  return (
    <div className="inline-flex rounded-lg border border-stone-200 bg-white p-0.5">
      {opts.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
            days === d
              ? "bg-stone-900 text-white"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          {d}d
        </button>
      ))}
    </div>
  );
}

/** Compact USD formatter for the hero + per-IP figures. "1234567" → "$1.2M". */
const fmtUsdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

function UnlicensedMarketHero({ totalUsd }: { totalUsd: number }) {
  return (
    <div className="rounded-2xl bg-stone-900 text-white px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
      <div>
        <div className="text-[11px] uppercase tracking-[0.14em] font-semibold text-stone-300">
          Estimated unlicensed market
        </div>
        <p className="text-xs text-stone-400 mt-0.5 max-w-md">
          Sum of price × quantity across open infringement findings.
          Excludes dismissed and already-enforced cases.
        </p>
      </div>
      <div className="text-4xl sm:text-5xl font-black tabular-nums leading-none">
        {fmtUsdCompact.format(totalUsd || 0)}
      </div>
    </div>
  );
}

function KpiRow({ kpis, ipId }: { kpis: DashboardSummary["kpis"]; ipId: string | null }) {
  const tiles: Array<{
    label: string;
    value: number;
    to: string | null;
    accent?: string;
  }> = [
    { label: "To triage", value: kpis.to_triage, to: withIp("/monitoring/tasks?status=pending", ipId), accent: "text-stone-900" },
    { label: "In progress", value: kpis.in_progress, to: withIp("/monitoring/tasks?status=takedown_sent", ipId), accent: "text-amber-700" },
    { label: "Enforced (30d)", value: kpis.enforced_30d, to: withIp("/monitoring/tasks?status=enforced", ipId), accent: "text-emerald-700" },
    { label: "High risk", value: kpis.high_risk, to: withIp("/monitoring/tasks", ipId), accent: "text-red-700" },
    { label: "IPs monitored", value: kpis.ips_monitored, to: "/monitoring/settings" },
    { label: "Platforms monitored", value: kpis.platforms_monitored, to: "/monitoring/settings" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
      {tiles.map((t) => (
        <KpiTile key={t.label} {...t} />
      ))}
    </div>
  );
}

function KpiTile({
  label,
  value,
  to,
  accent = "text-stone-900",
}: {
  label: string;
  value: number;
  to: string | null;
  accent?: string;
}) {
  const inner = (
    <>
      <div className={`text-2xl font-black tabular-nums ${accent}`}>{value}</div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-stone-400 mt-1">
        {label}
      </div>
    </>
  );
  const cls =
    "rounded-2xl border border-stone-200 bg-white px-4 py-4 transition-colors";
  return to ? (
    <Link to={to} className={`${cls} hover:border-stone-300 hover:bg-stone-50 block`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

function CardShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-3">
      <div>
        <h2 className="text-sm font-bold text-stone-900">{title}</h2>
        {subtitle && <p className="text-xs text-stone-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function TimeSeriesCard({
  timeseries,
}: {
  timeseries: DashboardSummary["timeseries"];
}) {
  const data = useMemo(
    () =>
      timeseries.map((p) => ({
        day: p.day,
        label: shortDay(p.day),
        findings: p.findings,
      })),
    [timeseries],
  );
  const empty = data.every((d) => d.findings === 0);
  return (
    <CardShell title="Findings over time">
      {empty ? (
        <p className="text-xs text-stone-400 py-12 text-center">
          No findings yet in this window.
        </p>
      ) : (
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 6, right: 12, bottom: 4, left: -10 }}>
              <CartesianGrid stroke="#f4f4f4" />
              <XAxis dataKey="label" stroke="#a8a29e" tick={{ fontSize: 11 }} />
              <YAxis stroke="#a8a29e" tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  border: "1px solid #e7e5e4",
                  borderRadius: 8,
                }}
              />
              <Line
                type="monotone"
                dataKey="findings"
                stroke="#b91c1c"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </CardShell>
  );
}

function PlatformsCard({
  platforms,
}: {
  platforms: DashboardSummary["platforms"];
}) {
  const data = useMemo(
    () =>
      platforms.slice(0, 8).map((p) => ({
        ...p,
        open: Math.max(p.findings - p.enforced, 0),
      })),
    [platforms],
  );
  return (
    <CardShell title="Top platforms" subtitle="Findings per marketplace; enforced is the resolved share.">
      {data.length === 0 ? (
        <p className="text-xs text-stone-400 py-8 text-center">No platform data yet.</p>
      ) : (
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 10 }}>
              <CartesianGrid stroke="#f4f4f4" />
              <XAxis type="number" stroke="#a8a29e" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="domain"
                stroke="#a8a29e"
                tick={{ fontSize: 11 }}
                width={110}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  border: "1px solid #e7e5e4",
                  borderRadius: 8,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="open" name="Open" stackId="a" fill="#fca5a5" radius={[0, 4, 4, 0]} />
              <Bar dataKey="enforced" name="Enforced" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </CardShell>
  );
}

function SellersCard({
  sellers,
  ipId,
}: {
  sellers: DashboardSummary["sellers"];
  ipId: string | null;
}) {
  const rows = sellers.slice(0, 10);
  return (
    <CardShell title="Top sellers" subtitle="Most-flagged sellers across all platforms.">
      {rows.length === 0 ? (
        <p className="text-xs text-stone-400 py-8 text-center">No seller data yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-stone-400 border-b border-stone-100">
                <th className="py-2 pr-3 font-semibold">Seller</th>
                <th className="py-2 pr-3 font-semibold">Platform</th>
                <th className="py-2 pr-3 font-semibold text-right">Findings</th>
                <th className="py-2 pr-3 font-semibold text-right">Rating</th>
                <th className="py-2 font-semibold text-right">Sales</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s, i) => {
                const target = sellerLink(s.seller_name, s.domain, ipId);
                return (
                  <tr key={`${s.seller_name}-${s.domain}-${i}`} className="border-b border-stone-50 last:border-0 hover:bg-stone-50 transition-colors">
                    <td className="py-2 pr-3 font-medium text-stone-800 truncate max-w-[14rem]">
                      {target ? (
                        <Link to={target} className="hover:underline">
                          {s.seller_name}
                        </Link>
                      ) : (
                        <span className="text-stone-400">unknown</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-stone-500">{s.domain}</td>
                    <td className="py-2 pr-3 text-right tabular-nums font-semibold text-stone-900">
                      {s.findings}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-stone-600">
                      {s.rating != null ? s.rating.toFixed(1) : "—"}
                    </td>
                    <td className="py-2 text-right tabular-nums text-stone-600">
                      {s.sales != null ? s.sales.toLocaleString() : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </CardShell>
  );
}

function IpsCard({
  ips,
  activeIpId,
  onSelectIp,
}: {
  ips: DashboardSummary["ips"];
  activeIpId: string | null;
  onSelectIp: (next: string | null) => void;
}) {
  const rows = ips.slice(0, 8);
  const maxFindings = rows.reduce((m, r) => Math.max(m, r.findings), 0);
  return (
    <CardShell
      title="Top IPs"
      subtitle="Estimated unlicensed market and finding count per IP. Click to filter."
    >
      {rows.length === 0 ? (
        <p className="text-xs text-stone-400 py-8 text-center">No IP data yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((ip) => {
            const pct = maxFindings ? Math.round((ip.findings / maxFindings) * 100) : 0;
            const usd = ip.unlicensed_market_usd ?? 0;
            const active = ip.ip_id === activeIpId;
            return (
              <li key={ip.ip_id}>
                <button
                  type="button"
                  onClick={() => onSelectIp(active ? null : ip.ip_id)}
                  title={active ? "Clear IP filter" : `Filter dashboard to ${ip.ip_name}`}
                  className={`w-full flex items-center gap-3 text-left rounded-lg px-2 -mx-2 py-1 transition-colors ${
                    active ? "bg-stone-100" : "hover:bg-stone-50"
                  }`}
                >
                  <span
                    className={`text-sm w-32 truncate ${active ? "font-semibold text-stone-900" : "text-stone-700"}`}
                    title={ip.ip_name}
                  >
                    {ip.ip_name}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div
                      className={`h-full ${active ? "bg-stone-700" : "bg-stone-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span
                    className="text-xs tabular-nums font-semibold text-stone-900 w-16 text-right"
                    title={`Estimated unlicensed market: $${usd.toLocaleString()}`}
                  >
                    {usd > 0 ? fmtUsdCompact.format(usd) : <span className="text-stone-300">—</span>}
                  </span>
                  <span
                    className="text-xs tabular-nums text-stone-500 w-10 text-right"
                    title={`${ip.findings} finding${ip.findings === 1 ? "" : "s"}`}
                  >
                    {ip.findings}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </CardShell>
  );
}

function CountriesCard({
  countries,
}: {
  countries: DashboardSummary["countries"];
}) {
  const rows = countries.slice(0, 10);
  const max = rows.reduce((m, r) => Math.max(m, r.findings), 0);
  return (
    <CardShell title="Countries" subtitle="Where the listings ship from (free-text).">
      {rows.length === 0 ? (
        <p className="text-xs text-stone-400 py-8 text-center">No country data yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((c, i) => {
            const pct = max ? Math.round((c.findings / max) * 100) : 0;
            return (
              <li key={`${c.country}-${i}`} className="flex items-center gap-3">
                <span className="text-sm text-stone-700 w-28 truncate">
                  {c.country || <span className="text-stone-400">unknown</span>}
                </span>
                <div className="flex-1 h-2 rounded-full bg-stone-100 overflow-hidden">
                  <div
                    className="h-full bg-stone-400"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs tabular-nums font-semibold text-stone-700 w-10 text-right">
                  {c.findings}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </CardShell>
  );
}

/** Build the Tasks deep-link for a seller row. Returns null for blank
 *  seller names so the row falls back to "unknown" text. Threads the active
 *  dashboard IP filter through as `ip_id` when set. */
function sellerLink(
  seller: string | null,
  domain: string | null,
  ipId: string | null,
): string | null {
  if (!seller) return null;
  const p = new URLSearchParams();
  p.set("seller", seller);
  if (domain) p.set("platform", domain);
  if (ipId) p.set("ip_id", ipId);
  return `/monitoring/tasks?${p.toString()}`;
}

function shortDay(iso: string): string {
  // iso looks like "2026-05-28" or full ISO timestamp.
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-40 bg-stone-200 rounded" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-stone-100" />
        ))}
      </div>
      <div className="h-72 rounded-2xl bg-stone-100" />
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="h-72 rounded-2xl bg-stone-100" />
        <div className="h-72 rounded-2xl bg-stone-100" />
      </div>
    </div>
  );
}
