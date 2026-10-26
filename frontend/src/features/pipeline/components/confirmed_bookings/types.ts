import { ConfirmedBooking } from '../../api';


export interface ExtraFieldColumn {
  key: string;
  label: string;
}

export interface BookingFieldConfig {
  key: string;
  label: string;
  type: string;
  options?: string[];
  required?: boolean;
}

export interface EditingBookingFormData {
  id: string;
  name: string;
  value: number | string;
  contact_name: string;
  contact_phone: string;
  note: string;
  extra_data: Record<string, any>;
  rawBooking: ConfirmedBooking;
}
