import React, { useState, useEffect } from "react";
import { usePipeline } from "../pipeline/hooks/usePipeline";
import { getDeals, Deal } from "../pipeline/api";



type Timeframe = "daily" | "weekly" | "monthly";


export function PerformanceChart() {
  const [timeframe, setTimeframe] = useState<Timeframe>(() => {
    return (localStorage.getItem("performance_chart_timeframe") as Timeframe) || "daily";
  });
  const [isFiltering, setIsFiltering] = useState(false);
  const [chartDeals, setChartDeals] = useState<Deal[]>([]);
  const { activePipeline, isLoading: isPipelineLoading } = usePipeline();

  // Fetch filtered deals from the backend
  useEffect(() => {
    if (!activePipeline) return;

    let isMounted = true;
    setIsFiltering(true);

    getDeals(activePipeline.id, timeframe)
      .then(deals => {
        if (isMounted) {
          setChartDeals(deals);
          setIsFiltering(false);
        }
      })
      .catch(err => {
        console.error("Failed to fetch chart deals:", err);
        if (isMounted) setIsFiltering(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activePipeline, timeframe]);



  // Handle dropdown change
  const handleTimeframeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTimeframe = e.target.value as Timeframe;
    setTimeframe(newTimeframe);
    localStorage.setItem("performance_chart_timeframe", newTimeframe);
  };

  // Create chart data from backend stages and fetched deals
  const chartData = activePipeline?.stages.map(stage => {
    const dealsInStage = chartDeals.filter(d => d.stage === stage.id).length;

    return {
      name: stage.title,
      deals: dealsInStage,
      color: stage.color || "#60a5fa"
    };
  }) || [];

  const maxValue = chartData.length > 0
    ? Math.max(...chartData.map(d => d.deals))
    : 0;

  // Add 20% headroom to the max value for the Y-axis scale, minimum of 5
  const yAxisMax = Math.max(Math.ceil(maxValue * 1.2), 5);
  const yAxisTicks = [yAxisMax, Math.round(yAxisMax * 0.75), Math.round(yAxisMax * 0.5), Math.round(yAxisMax * 0.25), 0];



  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-205 border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm min-w-0 transition duration-200 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 capitalize">{timeframe} Pipeline Deals</h4>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg shadow-sm">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-sm"></span>
            <span>Deals</span>
          </div>

          <select
            value={timeframe}
            onChange={handleTimeframeChange}
            className="text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer shadow-sm transition-all"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>

      {isPipelineLoading || isFiltering ? (
        <div className="flex-1 min-h-[16rem] flex flex-col items-center justify-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          <span className="text-xs font-medium text-slate-400">Loading data...</span>
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex-1 min-h-[16rem] flex flex-col items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">No pipeline stages found</span>
          <span className="text-xs text-slate-400 dark:text-slate-500 mt-1">Create stages to see your pipeline metrics</span>
        </div>
      ) : (
        <div className="relative flex-1 min-h-[16rem] flex animate-in fade-in duration-300">
          {/* Y-Axis Grid Lines & Labels */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none z-0">
            {yAxisTicks.map((tick, i) => (
              <div key={i} className="flex items-center w-full relative">
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 w-8 text-right pr-3 -translate-y-1/2 absolute left-0">
                  {tick}
                </span>
                <div className="w-full border-t border-dashed border-slate-200 dark:border-slate-700/60 ml-8"></div>
              </div>
            ))}
          </div>

          {/* X-Axis Chart Area */}
          <div className="ml-8 flex-1 pl-2 overflow-x-auto hide-scrollbar z-10">
            {/* Added pt-12 so the tooltip has room to render without being clipped */}
            <div className="flex items-end space-x-6 min-w-max h-full pt-12 px-4 pb-1">
              {chartData.map((d, index) => {
                const dealsHeight = d.deals === 0 ? 0 : Math.max((d.deals / yAxisMax) * 100, 2);

                return (
                  <div key={index} className="flex flex-col items-center h-full justify-end group relative w-14">
                    {/* Tooltip */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-20 flex flex-col items-center">
                      <div className="bg-slate-800 text-white text-xs font-semibold py-1 px-2.5 rounded-md shadow-lg whitespace-nowrap">
                        {d.deals} {d.deals === 1 ? 'Deal' : 'Deals'}
                      </div>
                      <div className="w-2 h-2 bg-slate-800 transform rotate-45 -mt-1.5"></div>
                    </div>

                    {/* Bar */}
                    <div className="w-full flex justify-center h-full items-end pb-7">
                      {d.deals === 0 ? (
                        <div className="w-8 h-[2px] bg-slate-200 dark:bg-slate-700 rounded-full cursor-default"></div>
                      ) : (
                        <div
                          style={{ height: `${dealsHeight}%`, backgroundColor: d.color }}
                          className="w-10 rounded-t-md opacity-90 group-hover:opacity-100 group-hover:w-11 transition-all duration-300 shadow-sm relative overflow-hidden cursor-pointer"
                        >
                          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none"></div>
                        </div>
                      )}
                    </div>

                    {/* X-Axis Label */}
                    <span
                      className="absolute bottom-0 text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate w-20 text-center group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors"
                      title={d.name}
                    >
                      {d.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PerformanceChart;
