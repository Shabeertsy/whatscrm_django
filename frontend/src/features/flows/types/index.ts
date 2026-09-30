export type FieldType = "text_input" | "textarea" | "dropdown" | "radio" | "checkbox" | "dynamic_dropdown" | "dynamic_checkbox";

export interface FieldOption {
  id: string;
  label: string;
}

/** Config for a dynamic dropdown backed by an external API */
export interface ApiConfig {
  url: string;
  id_field: string;     // JSON key to use as option id      (default "id")
  label_field: string;  // JSON key to use as option title   (default "name")
  results_key: string;  // Nested key path e.g. "results" or "data.items" (leave blank if top-level array)
  filter_param: string; // field_id of previous field whose value is sent as query param
  screen: string;       // which screen id this field belongs to (auto-set)
  headers: Record<string, string>;
}

export interface FlowField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options: FieldOption[];
  apiConfig?: ApiConfig;
}

export interface FlowScreen {
  id: string;
  title: string;
  fields: FlowField[];
}
