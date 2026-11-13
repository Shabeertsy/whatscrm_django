export interface WhatsappInstance {
  id: string;
  display_name: string;
  instance_type?: 'meta_cloud' | 'scanned_device';
  phone_number_id: string;
  whatsapp_business_account_id: string;
  app_id?: string;
  access_token?: string; 
  webhook_verify_token: string;
  is_active: boolean;
  evolution_instance_name?: string;
  evolution_status?: string;
  evolution_phone?: string;
  evolution_qr_code?: string;
  created_at: string;
  updated_at?: string;
}

export interface WhatsappInstancePayload {
  display_name: string;
  instance_type?: 'meta_cloud' | 'scanned_device';
  phone_number_id: string;
  whatsapp_business_account_id: string;
  app_id?: string;
  access_token: string;
  webhook_verify_token?: string;
}
