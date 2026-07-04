import React from "react";

export function PerformanceChart() {
  const data = [
    { day: "Mon", camp: 40, auto: 60 },
    { day: "Tue", camp: 55, auto: 70 },
    { day: "Wed", camp: 80, auto: 90 },
    { day: "Thu", camp: 45, auto: 65 },
    { day: "Fri", camp: 60, auto: 80 },
    { day: "Sat", camp: 30, auto: 45 },
    { day: "Sun", camp: 42, auto: 50 }
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-205 border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm min-w-0 transition duration-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Daily Message Deliveries</h4>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Comparing campaigns vs automation triggers</p>
        </div>
        <div className="flex items-center space-x-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-md">
          <span className="flex items-center"><span className="h-2 w-2 rounded-full bg-[#007e3a] mr-1.5"></span>Campaigns</span>
          <span className="flex items-center"><span className="h-2 w-2 rounded-full bg-emerald-300 mr-1.5"></span>Automation</span>
        </div>
      </div>
      <div className="h-48 flex items-end space-x-5 pt-4 border-b border-slate-100 dark:border-slate-800">
        {data.map((d, index) => (
          <div key={index} className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer">
            <div className="w-full flex space-x-1.5 h-full items-end">
              <div
                style={{ height: `${d.camp}%` }}
                className="w-1/2 bg-[#007e3a] rounded-t-sm group-hover:bg-[#00662f] transition-all duration-300"
              ></div>
              <div
                style={{ height: `${d.auto}%` }}
                className="w-1/2 bg-emerald-300 rounded-t-sm group-hover:bg-emerald-400 transition-all duration-300"
              ></div>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-550 mt-2 font-bold">{d.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PerformanceChart;
