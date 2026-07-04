import React from "react";
import DataTable from "../../components/shared/DataTable";
import { Campaign } from "./api";

interface CampaignListProps {
  campaigns: Campaign[];
}

export function CampaignList({ campaigns }: CampaignListProps) {
  const columns = [
    { header: "Campaign Name", accessor: (c: Campaign) => <span className="font-bold text-slate-900 dark:text-slate-100">{c.name}</span> },
    {
      header: "Status",
      accessor: (c: Campaign) => (
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            c.status === "Running" ? "bg-[#007e3a]/10 text-[#007e3a]" : ""
          } ${c.status === "Completed" ? "bg-emerald-100 text-emerald-800" : ""} ${
            c.status === "Paused" ? "bg-amber-100 text-amber-800" : ""
          } ${c.status === "Draft" ? "bg-slate-100 text-slate-500" : ""}`}
        >
          {c.status}
        </span>
      )
    },
    { header: "Sent", accessor: "sent" as keyof Campaign, className: "text-right" },
    { header: "Delivered", accessor: "delivered" as keyof Campaign, className: "text-right" },
    {
      header: "Read Rate",
      className: "text-right",
      accessor: (c: Campaign) => (
        <span className="font-bold text-slate-800 dark:text-slate-200">
          {c.sent > 0 ? `${Math.round((c.read / c.delivered) * 100)}%` : "0%"}
        </span>
      )
    },
    {
      header: "Reply Rate",
      className: "text-right",
      accessor: (c: Campaign) => (
        <span className="font-bold text-slate-800 dark:text-slate-200">
          {c.sent > 0 ? `${Math.round((c.replied / c.delivered) * 100)}%` : "0%"}
        </span>
      )
    }
  ];

  return (
    <DataTable
      columns={columns}
      data={campaigns}
      keyExtractor={(c) => c.id}
    />
  );
}

export default CampaignList;
