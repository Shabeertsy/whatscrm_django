import React, { useState } from "react";
import PageHeader from "../components/shared/PageHeader";
import KanbanBoard from "../features/pipeline/KanbanBoard";
import { initialDeals, Deal } from "../features/pipeline/api";
import { Plus } from "lucide-react";

export function Pipeline() {
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [stages, setStages] = useState<{ id: string; title: string }[]>([
    { id: "new", title: "Incoming Leads" },
    { id: "contacted", title: "Contacted / Pitching" },
    { id: "demo", title: "Demo Booked" },
    { id: "closed", title: "Closed Won" }
  ]);

  const handleMoveDeal = (id: string, nextStage: string) => {
    setDeals(
      deals.map((d) => (d.id === id ? { ...d, stage: nextStage } : d))
    );
  };

  const handleAddDeal = () => {
    const name = prompt("Enter Deal Name:");
    if (!name) return;
    const value = parseInt(prompt("Enter Deal Value ($):") || "0");
    const phone = prompt("Enter Phone:");
    if (!phone) return;

    const newDeal: Deal = {
      id: `d_${Date.now()}`,
      name,
      phone,
      value,
      stage: stages[0]?.id || "new"
    };

    setDeals([...deals, newDeal]);
  };

  const handleAddStage = () => {
    const title = prompt("Enter new Stage Title:");
    if (!title) return;
    const id = title.toLowerCase().trim().replace(/\s+/g, "-");

    if (stages.some(s => s.id === id)) {
      alert("A stage with this identifier already exists.");
      return;
    }

    setStages([...stages, { id, title }]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM Deal Pipeline"
        description="Track lead conversions, deals value, and sales pipelines."
      >
        <button
          onClick={handleAddStage}
          className="px-4 py-2 border border-[#007e3a] text-[#007e3a] hover:bg-[#007e3a]/5 text-xs font-bold rounded-lg transition duration-200 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Stage</span>
        </button>
        <button
          onClick={handleAddDeal}
          className="px-4 py-2 bg-[#007e3a] hover:bg-[#00662f] text-white text-xs font-bold rounded-lg shadow-md transition duration-200 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Deal</span>
        </button>
      </PageHeader>

      <KanbanBoard stages={stages} deals={deals} onMoveDeal={handleMoveDeal} />
    </div>
  );
}

export default Pipeline;
