import { ConfirmedBooking } from '../../api';


export interface ExtraFieldColumn {
  key: string;
  label: string;
  type?: string;         // 'text' | 'number' | 'date' | 'select'
  options?: string[];
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

/** One active filter on a dynamic extra field */
export interface DynamicFieldFilter {
  key: string;
  type: 'text' | 'number' | 'date' | 'select';
  // text / select
  value?: string;
  // number range
  numMin?: string;
  numMax?: string;
  // date range
  dateFrom?: string;
  dateTo?: string;
}
