"use client";

import { Plus, Trash2, Zap } from "lucide-react";
import { Question, LogicJump, QuestionType, JumpOperator } from "@/lib/types";

const OPERATORS_BY_TYPE: Record<QuestionType, JumpOperator[]> = {
  short_text: ["equals", "not_equals"],
  long_text: ["equals", "not_equals"],
  email: ["equals", "not_equals"],
  multiple_choice: ["equals", "not_equals"],
  dropdown: ["equals", "not_equals"],
  yes_no: ["equals", "not_equals"],
  number: ["equals", "not_equals", "greater_than", "less_than"],
  rating: ["equals", "not_equals", "greater_than", "less_than"],
};

const OP_LABEL: Record<JumpOperator, string> = {
  equals: "is",
  not_equals: "is not",
  greater_than: "is greater than",
  less_than: "is less than",
};

export function LogicEditor({
  question,
  allQuestions,
  onChange,
}: {
  question: Question;
  allQuestions: Question[];
  onChange: (jumps: LogicJump[]) => void;
}) {
  const jumps = question.logic_jumps || [];
  const operators = OPERATORS_BY_TYPE[question.type as QuestionType] || ["equals", "not_equals"];

  // Candidate targets: later questions + "end"
  const myIdx = allQuestions.findIndex((q) => q.id === question.id);
  const targets = [
    ...allQuestions.filter((_, i) => i > myIdx).map((q) => ({ value: q.id, label: q.title || "Untitled" })),
    { value: "end", label: "End the form" },
  ];

  const addRule = () => {
    const defaultTarget = targets[0]?.value || "end";
    const defaultValue =
      question.type === "yes_no"
        ? true
        : question.type === "multiple_choice" || question.type === "dropdown"
        ? question.options[0]?.id || ""
        : question.type === "number" || question.type === "rating"
        ? 1
        : "";
    onChange([
      ...jumps,
      { operator: "equals", value: defaultValue, target: defaultTarget } as LogicJump,
    ]);
  };

  const update = (i: number, patch: Partial<LogicJump>) => {
    onChange(jumps.map((j, idx) => (idx === i ? { ...j, ...patch } : j)));
  };

  const remove = (i: number) => onChange(jumps.filter((_, idx) => idx !== i));

  return (
    <div className="border-t border-line pt-5 mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-slate2" />
          <span className="text-xs uppercase tracking-wider text-slate2 font-semibold">
            Logic jumps
          </span>
        </div>
        <button onClick={addRule} className="tf-btn-ghost text-xs" data-testid="add-logic-jump">
          <Plus size={12} /> Add rule
        </button>
      </div>

      {jumps.length === 0 ? (
        <p className="text-xs text-slate2 italic">
          No rules. Answers flow to the next question by default.
        </p>
      ) : (
        <div className="space-y-2">
          {jumps.map((j, i) => (
            <div
              key={i}
              className="flex items-center flex-wrap gap-2 border border-line rounded-lg p-2.5 text-sm"
              data-testid={`logic-rule-${i}`}
            >
              <span className="text-slate2">If answer</span>
              <select
                value={j.operator}
                onChange={(e) => update(i, { operator: e.target.value as JumpOperator })}
                className="border border-line rounded px-2 py-1 text-sm bg-paper focus:outline-none focus:border-ink"
                data-testid={`rule-op-${i}`}
              >
                {operators.map((op) => (
                  <option key={op} value={op}>
                    {OP_LABEL[op]}
                  </option>
                ))}
              </select>

              <ValueInput question={question} value={j.value} onChange={(v) => update(i, { value: v })} testid={`rule-val-${i}`} />

              <span className="text-slate2">jump to</span>
              <select
                value={j.target}
                onChange={(e) => update(i, { target: e.target.value })}
                className="border border-line rounded px-2 py-1 text-sm bg-paper focus:outline-none focus:border-ink flex-1 min-w-[120px]"
                data-testid={`rule-target-${i}`}
              >
                {targets.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => remove(i)}
                className="text-slate2 hover:text-red-600 p-1"
                aria-label="Remove rule"
                data-testid={`remove-rule-${i}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ValueInput({
  question,
  value,
  onChange,
  testid,
}: {
  question: Question;
  value: any;
  onChange: (v: any) => void;
  testid?: string;
}) {
  if (question.type === "yes_no") {
    return (
      <select
        value={value === true ? "true" : "false"}
        onChange={(e) => onChange(e.target.value === "true")}
        className="border border-line rounded px-2 py-1 text-sm bg-paper focus:outline-none focus:border-ink"
        data-testid={testid}
      >
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }
  if (question.type === "multiple_choice" || question.type === "dropdown") {
    return (
      <select
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        className="border border-line rounded px-2 py-1 text-sm bg-paper focus:outline-none focus:border-ink"
        data-testid={testid}
      >
        {question.options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  if (question.type === "number" || question.type === "rating") {
    return (
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        className="border border-line rounded px-2 py-1 text-sm w-24 bg-paper focus:outline-none focus:border-ink"
        data-testid={testid}
      />
    );
  }
  return (
    <input
      type="text"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Value"
      className="border border-line rounded px-2 py-1 text-sm bg-paper focus:outline-none focus:border-ink min-w-[120px]"
      data-testid={testid}
    />
  );
}
