"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { ChevronUp, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import { PublicForm, Question } from "@/lib/types";
import {
  QuestionScreen,
  ProgressBar,
  ThankYou,
  validateAnswer,
  buildAnswers,
} from "@/components/QuestionRenderer";
import { themeStyle, resolveTheme } from "@/lib/theme";
import { nextIndex } from "@/lib/logic";

export default function PublicFormPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [form, setForm] = useState<PublicForm | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [err, setErr] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getPublicForm(slug);
        setForm(data);
      } catch (e: any) {
        setNotFound(true);
      }
    })();
  }, [slug]);

  const themedStyle = useMemo(() => themeStyle(form?.theme), [form?.theme]);
  const theme = useMemo(() => resolveTheme(form?.theme), [form?.theme]);

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-bg px-6" data-testid="not-found">
        <div className="text-center max-w-md">
          <h1 className="font-display text-4xl mb-3">Form not found</h1>
          <p className="text-slate2">This form may have been unpublished or the link is incorrect.</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate2">Loading…</div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="themed min-h-screen" style={themedStyle}>
        <WelcomeScreen form={form} onStart={() => setStarted(true)} />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="themed min-h-screen flex flex-col" style={themedStyle}>
        <ProgressBar progress={100} />
        <div className="flex-1 flex items-center justify-center">
          <ThankYou message={form.thank_you_message} />
        </div>
      </div>
    );
  }

  const q = form.questions[idx];
  const progress = ((idx + 1) / form.questions.length) * 100;

  const goToNext = async () => {
    const v = answers[q.id];
    const error = validateAnswer(q, v);
    if (error) {
      setErr(error);
      return;
    }
    setErr(null);

    const target = nextIndex(form.questions, idx, v);
    if (target === -1) {
      // Submit
      setSubmitting(true);
      try {
        await api.submitResponse(slug, { answers: buildAnswers(form.questions, answers) });
        setSubmitted(true);
      } catch (e: any) {
        toast.error(e.message || "Submission failed");
      } finally {
        setSubmitting(false);
      }
    } else {
      setHistory((h) => [...h, idx]);
      setIdx(target);
    }
  };

  const goBack = () => {
    setErr(null);
    const prev = history[history.length - 1];
    if (prev !== undefined) {
      setHistory((h) => h.slice(0, -1));
      setIdx(prev);
    }
  };

  return (
    <div className="themed min-h-screen flex flex-col" ref={containerRef} style={themedStyle}>
      <ProgressBar progress={progress} />
      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <QuestionScreen
            key={q.id}
            question={q}
            index={idx}
            total={form.questions.length}
            value={answers[q.id]}
            onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
            onNext={goToNext}
            onBack={goBack}
            firstQuestion={history.length === 0}
            error={err}
            accentColor={theme.accent_color}
          />
        </AnimatePresence>
      </div>

      <div className="fixed bottom-5 right-5 flex items-center gap-3 z-20">
        <span className="hidden sm:inline-flex items-center px-3 py-2 rounded-md text-xs font-medium bg-white/90 text-ink shadow-sm border border-black/5">
          Powered by <b className="ml-1">Typeform</b>
        </span>
        <div className="flex rounded-md overflow-hidden shadow-sm" style={{ background: theme.button_color, color: theme.button_text_color }}>
          <button
            onClick={goBack}
            disabled={history.length === 0}
            className="w-9 h-9 flex items-center justify-center disabled:opacity-40 border-r border-white/20"
            data-testid="nav-prev"
            aria-label="Previous"
          >
            <ChevronUp size={18} />
          </button>
          <button
            onClick={goToNext}
            disabled={submitting}
            className="w-9 h-9 flex items-center justify-center"
            data-testid="nav-next"
            aria-label="Next"
          >
            <ChevronDown size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function WelcomeScreen({ form, onStart }: { form: PublicForm; onStart: () => void }) {
  const theme = resolveTheme(form.theme);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") onStart();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onStart]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl text-center"
      >
        <h1
          className="text-[2.5rem] md:text-[3.25rem] leading-[1.1] font-normal tracking-tight mb-6"
          data-testid="welcome-title"
        >
          {form.title}
        </h1>
        {form.description && (
          <p className="opacity-70 text-lg md:text-xl mb-10 max-w-xl mx-auto leading-relaxed">
            {form.description}
          </p>
        )}
        <div className="inline-flex items-center gap-3">
          <button
            className="tf-btn-primary inline-flex items-center gap-2 px-7 py-3.5 rounded-lg text-base font-medium"
            style={{ background: theme.button_color, color: theme.button_text_color }}
            onClick={onStart}
            data-testid="start-btn"
          >
            Start <span className="opacity-70">→</span>
          </button>
          <span className="text-xs opacity-60 hidden sm:inline">
            press <kbd className="px-1.5 py-0.5 border border-current/20 rounded">Enter ↵</kbd>
          </span>
        </div>
        <p className="text-xs opacity-50 mt-5">
          Takes about {Math.max(1, Math.ceil(form.questions.length * 0.3))} minute
          {form.questions.length > 3 ? "s" : ""}
        </p>
      </motion.div>
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs opacity-60">
        Made with <span className="font-medium" style={{ color: theme.text_color }}>Typeform</span>
      </div>
    </div>
  );
}
