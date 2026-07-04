import React from "react";
import DataTable from "../../components/shared/DataTable";
import { CallLog } from "./api";

interface CallLogTableProps {
  logs: CallLog[];
}

export function CallLogTable({ logs }: CallLogTableProps) {
  const columns = [
    { header: "Name / Contact", accessor: (l: CallLog) => <span className="font-bold text-slate-900 dark:text-slate-100">{l.name}</span> },
    { header: "Phone Number", accessor: "phone" as keyof CallLog },
    {
      header: "Call Type",
      accessor: (l: CallLog) => (
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            l.type === "Incoming" && "bg-emerald-100 text-emerald-800"
          } ${l.type === "Outgoing" && "bg-[#007e3a]/10 text-[#007e3a]"} ${
            l.type === "Missed" && "bg-rose-105 bg-rose-100 text-rose-800"
          }`}
        >
          {l.type}
        </span>
      )
    },
    { header: "Duration", accessor: "duration" as keyof CallLog },
    { header: "Time", accessor: "time" as keyof CallLog }
  ];

  return (
    <DataTable
      columns={columns}
      data={logs}
      keyExtractor={(l) => l.id}
    />
  );
}

export default CallLogTable;
