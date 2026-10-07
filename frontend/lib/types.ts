// Shared TypeScript types mirroring backend schemas

export type QuestionType =
  | "short_text"
  | "long_text"
  | "multiple_choice"
  | "dropdown"
  | "email"
  | "number"
  | "yes_no"
  | "rating";

export type JumpOperator = "equals" | "not_equals" | "greater_than" | "less_than";

export interface LogicJump {
  operator: JumpOperator;
  value: string | number | boolean | null;
  target: string; // question_id or "end"
}

export interface Theme {
  background_color?: string;
  text_color?: string;
  accent_color?: string;
  button_color?: string;
  button_text_color?: string;
  font_family?: "serif" | "sans" | "mono";
}

export interface QuestionOption {
  id: string;
  label: string;
  order_index: number;
}

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  description?: string | null;
  required: boolean;
  order_index: number;
  rating_scale?: number | null;
  options: QuestionOption[];
  logic_jumps?: LogicJump[] | null;
}

export interface Form {
  id: string;
  title: string;
  description?: string | null;
  is_published: boolean;
  public_slug?: string | null;
  thank_you_message?: string | null;
  theme?: Theme | null;
  created_at: string;
  updated_at: string;
  questions: Question[];
}

export interface FormSummary {
  id: string;
  title: string;
  description?: string | null;
  is_published: boolean;
  public_slug?: string | null;
  theme?: Theme | null;
  created_at: string;
  updated_at: string;
  response_count: number;
  question_count: number;
}

export interface PublicForm {
  id: string;
  title: string;
  description?: string | null;
  thank_you_message?: string | null;
  theme?: Theme | null;
  public_slug: string;
  questions: Question[];
}

export interface AnswerPayload {
  question_id: string;
  value: string | number | boolean | null;
}

export interface Answer {
  id: string;
  question_id: string;
  value_text?: string | null;
  value_number?: number | null;
  value_option_id?: string | null;
  value_bool?: boolean | null;
}

export interface ResponseRecord {
  id: string;
  form_id: string;
  submitted_at: string;
  answers: Answer[];
}

export interface ResponseSummary {
  id: string;
  submitted_at: string;
  answer_count: number;
}

export interface QuestionStats {
  question_id: string;
  question_title: string;
  question_type: string;
  response_count: number;
  option_counts?: Record<string, number> | null;
  yes_count?: number | null;
  no_count?: number | null;
  average?: number | null;
  distribution?: Record<string, number> | null;
  text_answers?: string[] | null;
}

export interface FormStats {
  form_id: string;
  total_responses: number;
  questions: QuestionStats[];
}
