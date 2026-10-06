import React from "react";
import { TextCursor, AlignLeft, List, Circle, CheckSquare, Calendar } from "lucide-react";
import { FieldType } from "../types";

export const FIELD_TYPES: { type: FieldType; icon: React.ReactNode; label: string }[] = [
  { type: "text_input", icon: <TextCursor className="w-3.5 h-3.5" />, label: "Short Text" },
  { type: "textarea", icon: <AlignLeft className="w-3.5 h-3.5" />, label: "Long Text" },
  { type: "dropdown", icon: <List className="w-3.5 h-3.5" />, label: "Dropdown" },
  { type: "radio", icon: <Circle className="w-3.5 h-3.5" />, label: "Single Choice" },
  { type: "checkbox", icon: <CheckSquare className="w-3.5 h-3.5" />, label: "Multi Choice" },
  { type: "dynamic_dropdown", icon: <List className="w-3.5 h-3.5" />, label: "API Dropdown" },
  { type: "dynamic_checkbox", icon: <CheckSquare className="w-3.5 h-3.5" />, label: "API Multi-Select" },
  { type: "date", icon: <Calendar className="w-3.5 h-3.5" />, label: "Date" },
];
