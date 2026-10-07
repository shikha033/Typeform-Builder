import { QuestionType } from "./types";
import {
  AlignLeft,
  Type,
  List,
  ChevronDown,
  Mail,
  Hash,
  CheckSquare,
  Star,
  type LucideIcon,
} from "lucide-react";

export const QUESTION_TYPES: {
  type: QuestionType;
  label: string;
  icon: LucideIcon;
  description: string;
}[] = [
  { type: "short_text", label: "Short text", icon: Type, description: "Single-line input" },
  { type: "long_text", label: "Long text", icon: AlignLeft, description: "Multi-line input" },
  { type: "multiple_choice", label: "Multiple choice", icon: List, description: "Pick one option" },
  { type: "dropdown", label: "Dropdown", icon: ChevronDown, description: "Select from list" },
  { type: "email", label: "Email", icon: Mail, description: "Email address" },
  { type: "number", label: "Number", icon: Hash, description: "Numeric input" },
  { type: "yes_no", label: "Yes / No", icon: CheckSquare, description: "Boolean choice" },
  { type: "rating", label: "Rating", icon: Star, description: "Star rating" },
];

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = Object.fromEntries(
  QUESTION_TYPES.map((q) => [q.type, q.label])
) as Record<QuestionType, string>;
