import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import { getDashboardSummary, type DashboardSummary } from "../api";

type Days = 7 | 30 | 90;

/**
 * Tenant dashboard. One round-trip to /api/monitoring/dashboard/summary; KPI
 * tiles deep-link into the filtered Findings board.
 */
export default function Dashboard() {
  const [days, setDays] = useState<Days>(30);
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    // Kick the fetch; don't reset state synchronously here — the next
    // resolved value replaces it. (Avoids cascading renders.)
    getDashboardSummary(days)
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
  }, [days]);

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
            Last {data.days} day{data.days === 1 ? "" : "s"} of monitoring activity.
          </p>
        </div>
        <RangeToggle days={days} onChange={setDays} />
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
            to="/monitors"
            className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-full bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-colors"
          >
            Start monitoring an IP →
          </Link>
        </div>
      ) : (
        <>
          <KpiRow kpis={data.kpis} />
          <TimeSeriesCard timeseries={data.timeseries} />
          <div className="grid lg:grid-cols-2 gap-4">
            <PlatformsCard platforms={data.platforms} />
            <SellersCard sellers={data.sellers} />
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <IpsCard ips={data.ips} />
            <CountriesCard countries={data.countries} />
          </div>
        </>
      )}
    </div>
  );
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

function KpiRow({ kpis }: { kpis: DashboardSummary["kpis"] }) {
  const tiles: Array<{
    label: string;
    value: number;
    to: string | null;
    accent?: string;
  }> = [
    { label: "To triage", value: kpis.to_triage, to: "/findings?status=pending", accent: "text-stone-900" },
    { label: "Confirmed", value: kpis.confirmed, to: "/findings?status=confirmed", accent: "text-blue-700" },
    { label: "In progress", value: kpis.in_progress, to: "/findings?status=takedown_sent", accent: "text-amber-700" },
    { label: "Enforced (30d)", value: kpis.enforced_30d, to: "/findings?status=enforced", accent: "text-emerald-700" },
    { label: "High risk", value: kpis.high_risk, to: "/findings", accent: "text-red-700" },
    { label: "IPs monitored", value: kpis.ips_monitored, to: "/monitors" },
    { label: "Platforms monitored", value: kpis.platforms_monitored, to: "/monitors" },
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
}: {
  sellers: DashboardSummary["sellers"];
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
              {rows.map((s, i) => (
                <tr key={`${s.seller_name}-${s.domain}-${i}`} className="border-b border-stone-50 last:border-0">
                  <td className="py-2 pr-3 font-medium text-stone-800 truncate max-w-[14rem]">
                    {s.seller_name || <span className="text-stone-400">unknown</span>}
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CardShell>
  );
}

function IpsCard({ ips }: { ips: DashboardSummary["ips"] }) {
  const data = useMemo(
    () => ips.slice(0, 8).map((i) => ({ name: i.ip_name, findings: i.findings, enforced: i.enforced })),
    [ips],
  );
  return (
    <CardShell title="Top IPs" subtitle="Most findings per protected IP.">
      {data.length === 0 ? (
        <p className="text-xs text-stone-400 py-8 text-center">No IP data yet.</p>
      ) : (
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 10 }}>
              <CartesianGrid stroke="#f4f4f4" />
              <XAxis type="number" stroke="#a8a29e" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#a8a29e"
                tick={{ fontSize: 11 }}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  border: "1px solid #e7e5e4",
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="findings" name="Findings" fill="#78716c" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
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
              <li key={`${c.location}-${i}`} className="flex items-center gap-3">
                <span className="text-sm text-stone-700 w-28 truncate">
                  {c.location || <span className="text-stone-400">unknown</span>}
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
