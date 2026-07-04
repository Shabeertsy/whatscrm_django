export interface WhatsappInstance {
  id: string;
  display_name: string;
  phone_number_id: string;
  whatsapp_business_account_id: string;
  access_token?: string; 
  webhook_verify_token: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface WhatsappInstancePayload {
  display_name: string;
  phone_number_id: string;
  whatsapp_business_account_id: string;
  access_token: string;
  webhook_verify_token?: string;
}
