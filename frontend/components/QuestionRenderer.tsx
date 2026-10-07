"use client";

import { Question, AnswerPayload } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, CornerDownLeft, Star, Check } from "lucide-react";
import { cx } from "@/lib/utils";

// Shared "one question at a time" renderer, used in both preview and public form.
export function QuestionScreen({
  question,
  index,
  total,
  value,
  onChange,
  onNext,
  onBack,
  error,
  autoFocus = true,
  firstQuestion,
  accentColor,
}: {
  question: Question;
  index: number;
  total: number;
  value: any;
  onChange: (v: any) => void;
  onNext: () => void;
  onBack?: () => void;
  error?: string | null;
  autoFocus?: boolean;
  firstQuestion?: boolean;
  accentColor?: string;
}) {
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        const target = e.target as HTMLElement;
        if (question.type !== "long_text" || target.tagName !== "TEXTAREA") {
          e.preventDefault();
          setTouched(true);
          onNext();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onNext, question.type]);

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-2xl mx-auto px-6 py-10"
    >
      <div className="flex items-baseline gap-3 mb-5 opacity-70 text-sm font-medium">
        <span data-testid="question-counter">{index + 1} <span aria-hidden>→</span><span className="sr-only"> of {total}</span></span>
      </div>

      <h2
        className="text-2xl md:text-[1.75rem] font-normal leading-snug tracking-normal mb-3"
        data-testid="question-title"
      >
        {question.title || <span className="opacity-30">Untitled question</span>}
        {question.required && <span className="ml-1" style={{ color: accentColor || "#ff6b4a" }}>*</span>}
      </h2>
      {question.description && (
        <p className="opacity-70 text-base md:text-[1.15rem] font-light mb-8">{question.description}</p>
      )}
      {!question.description && <div className="mb-8" />}

      <QuestionInput
        question={question}
        value={value}
        onChange={onChange}
        onEnter={() => {
          setTouched(true);
          onNext();
        }}
        autoFocus={autoFocus}
      />

      {error && touched && (
        <p className="text-sm mt-3" style={{ color: accentColor || "#ff6b4a" }} data-testid="validation-error">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 mt-10">
        <button
          onClick={() => {
            setTouched(true);
            onNext();
          }}
          className="tf-btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-md font-semibold"
          style={{ background: "var(--tf-btn-bg, #0e0e0e)", color: "var(--tf-btn-fg, #fff)" }}
          data-testid="next-button"
        >
          {index === total - 1 ? "Submit" : "OK"} <CornerDownLeft size={16} />
        </button>
        <span className="text-xs opacity-60 hidden sm:inline">
          press <kbd className="px-1.5 py-0.5 border border-current/20 rounded">Enter ↵</kbd>
        </span>

        <div className="flex-1" />
        {!firstQuestion && onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3 py-2 rounded hover:bg-black/5 text-sm opacity-70"
            data-testid="back-button"
            type="button"
          >
            <ChevronLeft size={16} /> Back
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function QuestionInput({
  question,
  value,
  onChange,
  onEnter,
  autoFocus,
}: {
  question: Question;
  value: any;
  onChange: (v: any) => void;
  onEnter: () => void;
  autoFocus?: boolean;
}) {
  switch (question.type) {
    case "short_text":
    case "email":
    case "number": {
      const type = question.type === "number" ? "number" : question.type === "email" ? "email" : "text";
      return (
        <input
          type={type}
          autoFocus={autoFocus}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            question.type === "email"
              ? "name@example.com"
              : question.type === "number"
              ? "Type a number..."
              : "Type your answer here..."
          }
          className="tf-input"
          data-testid="input-field"
        />
      );
    }
    case "long_text":
      return (
        <textarea
          autoFocus={autoFocus}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer here..."
          className="tf-textarea"
          data-testid="input-field"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onEnter();
            }
          }}
        />
      );
    case "yes_no":
      return (
        <div className="flex flex-col gap-3">
          {[
            { label: "Yes", val: true, key: "Y" },
            { label: "No", val: false, key: "N" },
          ].map((opt) => (
            <button
              key={opt.label}
              onClick={() => onChange(opt.val)}
              className="tf-option"
              data-selected={value === opt.val}
              data-testid={`yesno-${opt.label.toLowerCase()}`}
              type="button"
            >
              <span className="keyhint">{opt.key}</span>
              <span>{opt.label}</span>
              {value === opt.val && <Check className="ml-auto" size={18} />}
            </button>
          ))}
        </div>
      );
    case "multiple_choice":
      return (
        <div className="flex flex-col gap-3">
          {question.options.map((opt, i) => (
            <button
              key={opt.id}
              onClick={() => onChange(opt.id)}
              className="tf-option"
              data-selected={value === opt.id}
              data-testid={`mc-option-${i}`}
              type="button"
            >
              <span className="keyhint">{String.fromCharCode(65 + i)}</span>
              <span>{opt.label}</span>
              {value === opt.id && <Check className="ml-auto" size={18} />}
            </button>
          ))}
          {question.options.length === 0 && (
            <p className="text-slate2 italic">No options yet.</p>
          )}
        </div>
      );
    case "dropdown":
      return (
        <select
          autoFocus={autoFocus}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="tf-input appearance-none cursor-pointer"
          data-testid="input-field"
        >
          <option value="">Select an option...</option>
          {question.options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case "rating": {
      const scale = question.rating_scale || 5;
      const current = typeof value === "number" ? value : 0;
      return (
        <div className="flex flex-wrap gap-2" data-testid="rating-wrap">
          {Array.from({ length: scale }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => onChange(n)}
              className={cx(
                "w-12 h-12 rounded-lg border-2 flex items-center justify-center transition-all",
                current >= n
                  ? "bg-ink border-ink text-paper"
                  : "border-line text-slate2 hover:border-ink"
              )}
              type="button"
              data-testid={`rating-${n}`}
              aria-label={`Rate ${n}`}
            >
              <Star size={18} fill={current >= n ? "currentColor" : "none"} />
            </button>
          ))}
        </div>
      );
    }
  }
}

// Thank-you screen
export function ThankYou({ message }: { message?: string | null }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-2xl mx-auto px-6 py-10 text-center"
      data-testid="thank-you-screen"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
        className="w-16 h-16 mx-auto rounded-full bg-ink text-paper flex items-center justify-center mb-6"
      >
        <Check size={28} />
      </motion.div>
      <h2 className="font-display text-4xl mb-3">All done.</h2>
      <p className="text-slate2 text-lg whitespace-pre-wrap">
        {message || "Thanks for your response!"}
      </p>
    </motion.div>
  );
}

// Progress bar
export function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="tf-progress">
      <motion.div
        className="tf-progress-fill"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.35 }}
      />
    </div>
  );
}

// Validate a single answer client-side
export function validateAnswer(q: Question, value: any): string | null {
  const emptyText = value === undefined || value === null || (typeof value === "string" && value.trim() === "");
  if (q.required && emptyText && value !== false && value !== 0) {
    return "This field is required";
  }
  if (!q.required && emptyText) return null;
  if (q.type === "email") {
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(String(value))) {
      return "Please enter a valid email";
    }
  }
  if (q.type === "number") {
    if (isNaN(Number(value))) return "Please enter a valid number";
  }
  if (q.type === "multiple_choice" || q.type === "dropdown") {
    const ok = q.options.some((o) => o.id === value);
    if (!ok) return "Please choose an option";
  }
  if (q.type === "rating") {
    const n = Number(value);
    const scale = q.rating_scale || 5;
    if (!Number.isInteger(n) || n < 1 || n > scale) return `Please rate from 1 to ${scale}`;
  }
  return null;
}

// Build payload from local state
export function buildAnswers(questions: Question[], answers: Record<string, any>): AnswerPayload[] {
  return questions
    .filter((q) => {
      const v = answers[q.id];
      return v !== undefined && v !== null && !(typeof v === "string" && v.trim() === "");
    })
    .map((q) => ({ question_id: q.id, value: answers[q.id] }));
}
