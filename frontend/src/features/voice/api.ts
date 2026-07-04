export interface CallLog {
  id: string;
  name: string;
  phone: string;
  duration: string;
  type: "Incoming" | "Outgoing" | "Missed";
  time: string;
}

export const initialCallLogs: CallLog[] = [
  { id: "v1", name: "John Doe", phone: "+1 (555) 234-5678", duration: "2m 14s", type: "Incoming", time: "10:14 AM" },
  { id: "v2", name: "Alice Smith", phone: "+44 7911 123456", duration: "0m 45s", type: "Outgoing", time: "9:30 AM" },
  { id: "v3", name: "Bob Johnson", phone: "+49 170 1234567", duration: "0m 0s", type: "Missed", time: "Yesterday" }
];
