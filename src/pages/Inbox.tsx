import { Link, useSearchParams } from "react-router-dom";
import { ClearanceInboxView } from "./Clearance";
import { MonitoringInboxView } from "./Findings";

type InboxTab = "clearance" | "monitoring";

/**
 * Unified Inbox — JIRA-style board mixing the two item types.
 *   - "Clearance" tab: pre-launch reviews (the old /clearance Linear list)
 *   - "Monitoring" tab: live infringement findings Kanban (the old /findings)
 *
 * Tab state lives in `?tab=` so dashboard deep links + sidebar badges can
 * point straight at the right section. Default tab is Clearance because
 * those items always need a human decision; monitoring findings are
 * triage-only.
 */
export default function Inbox() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab");
  const tab: InboxTab = raw === "monitoring" ? "monitoring" : "clearance";

  function setTab(next: InboxTab) {
    const p = new URLSearchParams(params);
    p.set("tab", next);
    setParams(p, { replace: false });
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">Inbox</h1>
          <p className="mt-1 text-sm text-stone-500">
            Clearance reviews and live monitoring findings in one place.
          </p>
        </div>
        <Link
          to="/ip-reviews/new"
          className="px-3 py-1.5 rounded-lg border border-stone-300 text-stone-800 text-xs font-semibold hover:bg-stone-50"
        >
          + New clearance
        </Link>
      </div>

      <div className="flex items-center gap-6 border-b border-stone-200">
        <TabButton
          active={tab === "clearance"}
          onClick={() => setTab("clearance")}
          label="Clearance"
        />
        <TabButton
          active={tab === "monitoring"}
          onClick={() => setTab("monitoring")}
          label="Monitoring"
        />
      </div>

      {tab === "clearance" ? <ClearanceInboxView /> : <MonitoringInboxView />}
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
