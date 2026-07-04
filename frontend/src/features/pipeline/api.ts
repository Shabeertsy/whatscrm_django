export interface Deal {
  id: string;
  name: string;
  phone: string;
  value: number;
  stage: string;
}

export const initialDeals: Deal[] = [
  { id: "d1", name: "Acme Corp Deal", phone: "+1 (555) 234-5678", value: 1200, stage: "new" },
  { id: "d2", name: "Sarah Connor Consulting", phone: "+44 7911 123456", value: 3400, stage: "contacted" },
  { id: "d3", name: "John Connor Solutions", phone: "+49 170 1234567", value: 850, stage: "demo" },
  { id: "d4", name: "Global Industries Stack", phone: "+1 (555) 987-6543", value: 5400, stage: "closed" }
];
