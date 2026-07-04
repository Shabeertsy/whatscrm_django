export interface Campaign {
  id: string;
  name: string;
  status: "Running" | "Paused" | "Completed" | "Draft";
  sent: number;
  delivered: number;
  read: number;
  replied: number;
}

export const initialCampaigns: Campaign[] = [
  { id: "c1", name: "June Product Launch", status: "Running", sent: 1200, delivered: 1180, read: 950, replied: 340 },
  { id: "c2", name: "Easter Discount Blast", status: "Completed", sent: 3500, delivered: 3420, read: 2900, replied: 810 },
  { id: "c3", name: "Inactive Lead Reactivation", status: "Paused", sent: 800, delivered: 750, read: 500, replied: 42 },
  { id: "c4", name: "Beta Tester Invitation", status: "Draft", sent: 0, delivered: 0, read: 0, replied: 0 }
];
