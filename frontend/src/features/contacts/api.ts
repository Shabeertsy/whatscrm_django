export interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: "Active" | "Inactive";
}

export const initialContacts: Contact[] = [
  { id: "c1", name: "John Doe", phone: "+1 (555) 234-5678", email: "john@doe.com", status: "Active" },
  { id: "c2", name: "Alice Smith", phone: "+44 7911 123456", email: "alice@smith.com", status: "Active" },
  { id: "c3", name: "Bob Johnson", phone: "+49 170 1234567", email: "bob@johnson.com", status: "Inactive" },
  { id: "c4", name: "Charlie Brown", phone: "+1 (555) 987-6543", email: "charlie@brown.com", status: "Active" }
];
