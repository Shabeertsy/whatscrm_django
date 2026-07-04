import React from "react";
import { Contact } from "./api";
import DataTable from "../../components/shared/DataTable";

interface ContactTableProps {
  contacts: Contact[];
}

export function ContactTable({ contacts }: ContactTableProps) {
  const columns = [
    { header: "Name", accessor: (c: Contact) => <span className="font-bold text-slate-900 dark:text-slate-100">{c.name}</span> },
    { header: "Phone", accessor: "phone" as keyof Contact },
    { header: "Email", accessor: "email" as keyof Contact },
    {
      header: "Status",
      accessor: (c: Contact) => (
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            c.status === "Active" ? "bg-[#007e3a]/10 text-[#007e3a]" : "bg-slate-100 text-slate-500"
          }`}
        >
          {c.status}
        </span>
      )
    }
  ];

  return (
    <DataTable
      columns={columns}
      data={contacts}
      keyExtractor={(c) => c.id}
    />
  );
}

export default ContactTable;
