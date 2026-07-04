import React, { useState } from "react";
import PageHeader from "../components/shared/PageHeader";
import CampaignList from "../features/campaigns/CampaignList";
import CampaignWizard from "../features/campaigns/CampaignWizard";
import TemplateEditor from "../features/campaigns/TemplateEditor";
import { initialCampaigns, Campaign } from "../features/campaigns/api";
import { Plus } from "lucide-react";

export function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const handleLaunchCampaign = (name: string) => {
    const newCamp: Campaign = {
      id: `c_${Date.now()}`,
      name,
      status: "Running",
      sent: 0,
      delivered: 0,
      read: 0,
      replied: 0
    };
    setCampaigns([newCamp, ...campaigns]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="WABA Broadcast Campaigns"
        description="Launch marketing templates and broadcast newsletters directly to your contact lists."
      >
        <button
          onClick={() => setIsWizardOpen(true)}
          className="px-4 py-2 bg-[#007e3a] hover:bg-[#00662f] text-white text-xs font-bold rounded-lg shadow-md transition duration-200 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Launch Campaign</span>
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CampaignList campaigns={campaigns} />
        </div>
        <div>
          <TemplateEditor />
        </div>
      </div>

      <CampaignWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onLaunch={handleLaunchCampaign}
      />
    </div>
  );
}

export default Campaigns;
