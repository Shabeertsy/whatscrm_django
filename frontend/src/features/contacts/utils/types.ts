export interface CTag {
  id: string;
  name: string;
  color: string;
  contact_count: number;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  notes: string;
  tags: CTag[];
  created_at: string;
  wa_id?: string;
}

export interface WAContact {
  wa_id: string;
  name: string;
  phone: string;
  profile_pic_url: string;
  source: string;
}

export const TAG_COLORS = [
  '#007e3a', '#2563eb', '#7c3aed', '#dc2626',
  '#d97706', '#0891b2', '#be185d', '#4d7c0f'
];
