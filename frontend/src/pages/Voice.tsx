import React, { useState } from "react";
import PageHeader from "../components/shared/PageHeader";
import Dialer from "../features/voice/Dialer";
import CallLogTable from "../features/voice/CallLogTable";
import { initialCallLogs, CallLog } from "../features/voice/api";
import { useTwilioDevice } from "../features/voice/useTwilioDevice";

export function Voice() {
  const [logs, setLogs] = useState<CallLog[]>(initialCallLogs);

  useTwilioDevice();

  const handleCall = (phone: string) => {
    const newCall: CallLog = {
      id: `v_${Date.now()}`,
      name: "Outgoing Lead",
      phone,
      duration: "0m 00s",
      type: "Outgoing",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setLogs([newCall, ...logs]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="WebRTC Voice & Calls"
        description="Trigger client calls directly from your CRM panel or review incoming call histories."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CallLogTable logs={logs} />
        </div>
        <div>
          <Dialer onCall={handleCall} />
        </div>
      </div>
    </div>
  );
}

export default Voice;
