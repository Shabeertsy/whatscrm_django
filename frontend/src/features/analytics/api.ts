export interface Metric {
  label: string;
  val: string;
  desc: string;
  success: boolean;
}

export function getMetrics(credits: number): Metric[] {
  return [
    { label: "Active WhatsApp Instances", val: "3 / 5 Lines", desc: "2 licenses unused", success: true },
    { label: "Total Sent (Month)", val: "12,482", desc: "+14.2% from last week", success: true },
    { label: "Automation Success Rate", val: "98.4%", desc: "12 failovers resolved", success: true },
    { label: "Automation Success Rate", val: "98.4%", desc: "12 failovers resolved", success: true }
  ];
}
