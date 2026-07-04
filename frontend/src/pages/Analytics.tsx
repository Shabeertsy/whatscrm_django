import React from "react";
import PageHeader from "../components/shared/PageHeader";
import StatCard from "../features/analytics/StatCard";
import PerformanceChart from "../features/analytics/PerformanceChart";
import { getMetrics } from "../features/analytics/api";
import { useTeamStore } from "../store/teamStore";
import { Plus, CheckCircle, TrendingUp, AlertTriangle } from "lucide-react";
import { useRouter } from "../router";


export function Analytics() {
  const [teamState] = useTeamStore();
  const { navigate } = useRouter();
  const metrics = getMetrics(teamState.credits);

  const logs = [
    { time: "Just now", type: "success", text: "Flow 'Welcome Msg' ran successfully for +15552345678" },
  ];

  return (
    <div className="space-y-6 min-w-0 transition duration-200">
      <PageHeader
        title="Dashboard Overview"
        description="Welcome back! Manage your WhatsApp CRM campaigns and automations."
      >
        {/* <button
          onClick={() => navigate("#campaigns")}
          className="px-4 py-2 bg-[#007e3a] hover:bg-[#00662f] text-white text-xs font-bold rounded-lg shadow-md shadow-[#007e3a]/15 hover:shadow-[#007e3a]/25 transition duration-200 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Launch Campaign</span>
        </button> */}
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, idx) => (
          <StatCard key={idx} label={m.label} val={m.val} desc={m.desc} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PerformanceChart />
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-205 border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm transition duration-200">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">Live System Log</h4>
          <div className="space-y-4 font-sans">
            {logs.map((act, index) => (
              <div key={index} className="flex space-x-3 text-xs">
                <div className="mt-0.5">
                  {act.type === "success" && <CheckCircle className="h-4 w-4 text-[#007e3a]" />}
                  {act.type === "info" && <TrendingUp className="h-4 w-4 text-emerald-500" />}
                  {act.type === "warning" && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                </div>
                <div className="flex-1">
                  <p className="text-slate-700 dark:text-slate-300 font-medium">{act.text}</p>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">{act.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
