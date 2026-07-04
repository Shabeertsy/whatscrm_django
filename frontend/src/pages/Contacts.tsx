import React, { useState } from "react";
import PageHeader from "../components/shared/PageHeader";
import ContactTable from "../features/contacts/ContactTable";
import ContactForm from "../features/contacts/ContactForm";
import ContactImportModal from "../features/contacts/ContactImportModal";
import { initialContacts, Contact } from "../features/contacts/api";
import { Plus } from "lucide-react";

export function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const handleAddContact = (newC: Omit<Contact, "id">) => {
    const contactWithId: Contact = {
      ...newC,
      id: `c_${Date.now()}`
    };
    setContacts([contactWithId, ...contacts]);
  };

  const handleImport = (count: number) => {
    // Generate mock imported contacts
    const imported: Contact[] = Array.from({ length: count }).map((_, idx) => ({
      id: `imported_${Date.now()}_${idx}`,
      name: `Imported Lead ${idx + 1}`,
      phone: `+1 (555) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`,
      email: `lead_${idx + 1}@imported.com`,
      status: "Active"
    }));
    setContacts([...imported, ...contacts]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts & Leads"
        description="Manage your customer entries, phone directories, and marketing opt-ins."
      >
        <button
          onClick={() => setIsImportOpen(true)}
          className="px-4 py-2 border border-[#007e3a] text-[#007e3a] hover:bg-[#007e3a]/5 text-xs font-bold rounded-lg transition duration-200"
        >
          Import Contacts
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ContactTable contacts={contacts} />
        </div>
        <div>
          <ContactForm onAdd={handleAddContact} />
        </div>
      </div>

      <ContactImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImport}
      />
    </div>
  );
}

export default Contacts;
