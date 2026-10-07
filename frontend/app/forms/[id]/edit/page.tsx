"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  Plus,
  GripVertical,
  Trash2,
  Check,
  Eye,
  Globe,
  ChevronLeft,
  X,
  Copy,
  ExternalLink,
  Palette,
} from "lucide-react";
import { api } from "@/lib/api";
import { Form, Question, QuestionType, LogicJump, Theme } from "@/lib/types";
import { QUESTION_TYPES, QUESTION_TYPE_LABEL } from "@/lib/questionTypes";
import { cx } from "@/lib/utils";
import { QuestionScreen, ProgressBar, validateAnswer } from "@/components/QuestionRenderer";
import { TypeformLogo } from "@/components/Logo";
import { ThemePanel } from "@/components/ThemePanel";
import { LogicEditor } from "@/components/LogicEditor";
import { nextIndex } from "@/lib/logic";
import { themeStyle, resolveTheme } from "@/lib/theme";

export default function BuilderPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.id as string;

  const [form, setForm] = useState<Form | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showPublished, setShowPublished] = useState(false);
  const dirtyRef = useRef(false);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getForm(formId);
        setForm(data);
        if (data.questions.length) setSelectedId(data.questions[0].id);
      } catch (e: any) {
        toast.error(e.message);
      }
    })();
  }, [formId]);

  const scheduleSave = (updatedForm: Form) => {
    dirtyRef.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(updatedForm), 700);
  };

  const persist = async (f: Form) => {
    setSaving(true);
    // Mark clean at the START of the save — any edits during save flip it back to true.
    dirtyRef.current = false;
    try {
      const updated = await api.updateForm(f.id, {
        title: f.title,
        description: f.description,
        thank_you_message: f.thank_you_message,
        theme: f.theme || undefined,
        questions: f.questions.map((q, idx) => ({
          id: q.id,
          type: q.type,
          title: q.title,
          description: q.description,
          required: q.required,
          order_index: idx,
          rating_scale: q.rating_scale ?? 5,
          options: q.options.map((o, oi) => ({ id: o.id, label: o.label, order_index: oi })),
          logic_jumps: q.logic_jumps || undefined,
        })),
      });
      // If no further edits happened during the save, use the authoritative server copy.
      if (!dirtyRef.current) {
        const sel = selectedId;
        const prevIdx = f.questions.findIndex((q) => q.id === sel);
        setForm(updated);
        if (prevIdx >= 0 && updated.questions[prevIdx]) {
          setSelectedId(updated.questions[prevIdx].id);
        }
      } else {
        // User kept typing while saving — only backfill real IDs onto any tmp-ids
        // we created locally, preserving the user's unsaved edits.
        setForm((cur) => {
          if (!cur) return cur;
          const nextQs = cur.questions.map((q, i) => {
            const srv = updated.questions[i];
            if (!srv) return q;
            const useSrvQId = q.id.startsWith("tmp-");
            const nextOpts = q.options.map((o, oi) => {
              const srvOpt = srv.options[oi];
              return srvOpt && o.id.startsWith("topt-")
                ? { ...o, id: srvOpt.id }
                : o;
            });
            return { ...q, id: useSrvQId ? srv.id : q.id, options: nextOpts };
          });
          return { ...cur, questions: nextQs, public_slug: updated.public_slug, is_published: updated.is_published };
        });
        if (selectedId && selectedId.startsWith("tmp-")) {
          const idx = f.questions.findIndex((q) => q.id === selectedId);
          if (idx >= 0 && updated.questions[idx]) setSelectedId(updated.questions[idx].id);
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate2">Loading your form…</div>
      </div>
    );
  }

  const selected = form.questions.find((q) => q.id === selectedId) || null;

  const updateForm = (patch: Partial<Form>) => {
    const next = { ...form, ...patch };
    setForm(next);
    scheduleSave(next);
  };

  const updateQuestion = (id: string, patch: Partial<Question>) => {
    const next = {
      ...form,
      questions: form.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    };
    setForm(next);
    scheduleSave(next);
  };

  const addQuestion = (type: QuestionType) => {
    const q: Question = {
      id: `tmp-${Math.random().toString(36).slice(2, 10)}`,
      type,
      title: "",
      description: "",
      required: false,
      order_index: form.questions.length,
      rating_scale: type === "rating" ? 5 : null,
      options:
        type === "multiple_choice" || type === "dropdown"
          ? [
              { id: `topt-${Math.random().toString(36).slice(2)}`, label: "Option 1", order_index: 0 },
              { id: `topt-${Math.random().toString(36).slice(2)}`, label: "Option 2", order_index: 1 },
            ]
          : [],
    };
    const next = { ...form, questions: [...form.questions, q] };
    setForm(next);
    setSelectedId(q.id);
    setShowTypePicker(false);
    scheduleSave(next);
  };

  const removeQuestion = (id: string) => {
    const idx = form.questions.findIndex((q) => q.id === id);
    const next = { ...form, questions: form.questions.filter((q) => q.id !== id) };
    setForm(next);
    if (selectedId === id) {
      const nextSel = next.questions[Math.max(0, idx - 1)]?.id || null;
      setSelectedId(nextSel);
    }
    scheduleSave(next);
  };

  const onDragEnd = (ev: DragEndEvent) => {
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    const oldIdx = form.questions.findIndex((q) => q.id === active.id);
    const newIdx = form.questions.findIndex((q) => q.id === over.id);
    const next = { ...form, questions: arrayMove(form.questions, oldIdx, newIdx) };
    setForm(next);
    scheduleSave(next);
  };

  const handlePublish = async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      await persist(form);
    }
    try {
      const updated = await api.publishForm(form.id);
      setForm(updated);
      setShowPublished(true);
      toast.success("Form published 🎉");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleUnpublish = async () => {
    try {
      const updated = await api.unpublishForm(form.id);
      setForm(updated);
      toast.success("Form unpublished");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const publicUrl =
    form.public_slug && typeof window !== "undefined"
      ? `${window.location.origin}/form/${form.public_slug}`
      : "";

  return (
    <div className="h-screen flex flex-col bg-app-bg relative">
      {/* Top bar */}
      <header className="h-[60px] shrink-0 px-4 md:px-5 flex items-center gap-3 bg-paper">
        <Link href="/forms" className="flex items-center gap-2 text-slate2 hover:text-ink text-[15px]" data-testid="back-to-dashboard" aria-label="Back to forms">
          <TypeformLogo size={18} className="text-ink" /> <span className="hidden sm:inline">Forms</span>
        </Link>
        <span className="text-mute">/</span>
        <input
          value={form.title}
          onChange={(e) => updateForm({ title: e.target.value })}
          className="text-[15px] font-medium border-none focus:outline-none bg-transparent px-2 py-1 rounded hover:bg-app-bg min-w-[160px]"
          data-testid="form-title-input"
        />
        <nav className="hidden lg:flex items-center gap-1 mx-auto text-sm">
          <span className="px-3 py-1.5 rounded-lg bg-canvas font-medium text-ink">Create</span>
          <button className="px-3 py-1.5 rounded-lg text-slate2 hover:bg-canvas" onClick={() => form.is_published ? setShowPublished(true) : toast("Publish the form to get a share link")}>Share</button>
          <Link href={`/forms/${form.id}/results`} className="px-3 py-1.5 rounded-lg text-slate2 hover:bg-canvas">Results</Link>
        </nav>
        <span className="text-xs text-slate2 hidden md:inline">
          {saving ? "Saving..." : dirtyRef.current ? "Unsaved" : "Saved"}
        </span>
        <button
          className="tf-btn-ghost"
          onClick={() => setShowTheme(true)}
          data-testid="design-btn"
        >
          <Palette size={16} /> Design
        </button>
        <button
          className="tf-btn-ghost"
          onClick={() => setShowPreview(true)}
          data-testid="preview-btn"
        >
          <Eye size={16} /> Preview
        </button>
        {form.is_published ? (
          <>
            <Link
              href={`/forms/${form.id}/results`}
              className="tf-btn-ghost text-sm"
              data-testid="results-btn"
            >
              Results
            </Link>
            <button className="tf-btn-ghost text-sm" onClick={handleUnpublish} data-testid="unpublish-btn">
              Unpublish
            </button>
            <button
              className="tf-btn"
              onClick={() => setShowPublished(true)}
              data-testid="share-btn"
            >
              <Globe size={16} /> Share
            </button>
          </>
        ) : (
          <button className="tf-btn" onClick={handlePublish} data-testid="publish-btn">
            <Globe size={16} /> Publish
          </button>
        )}
      </header>

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[270px_1fr_360px] overflow-hidden">
        {/* Question list */}
        <aside className="bg-paper p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] uppercase tracking-[0.1em] text-slate2 font-semibold">Content</h3>
            <button
              onClick={() => setShowTypePicker(true)}
              className="w-7 h-7 rounded-md bg-ink text-paper flex items-center justify-center hover:bg-ink-soft transition-colors"
              data-testid="add-question-btn"
              aria-label="Add question"
            >
              <Plus size={14} />
            </button>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={form.questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-1.5">
                {form.questions.map((q, i) => (
                  <SortableRow
                    key={q.id}
                    q={q}
                    index={i}
                    active={selectedId === q.id}
                    onSelect={() => setSelectedId(q.id)}
                    onDelete={() => removeQuestion(q.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {form.questions.length === 0 && (
            <button
              onClick={() => setShowTypePicker(true)}
              className="w-full border-2 border-dashed border-line rounded-lg p-6 text-slate2 text-sm hover:border-ink hover:text-ink transition-colors mt-2"
              data-testid="add-first-question"
            >
              <Plus size={18} className="inline mb-1" /> Add your first question
            </button>
          )}
        </aside>

        {/* Centre: live preview canvas */}
        <section className="hidden md:flex flex-col p-3 overflow-hidden bg-paper">
          <div
            className="themed flex-1 rounded-2xl overflow-y-auto flex flex-col border border-line"
            style={themeStyle(form.theme)}
          >
            <div className="px-5 py-3 text-xs opacity-60 font-medium flex items-center justify-between">
              <span>Live preview</span>
              {selected && <span>Question {form.questions.findIndex((q) => q.id === selected.id) + 1}</span>}
            </div>
            <div className="flex-1 flex items-center justify-center">
              {selected ? (
                <PreviewSingle question={selected} index={form.questions.findIndex((q) => q.id === selected.id)} total={form.questions.length} accentColor={resolveTheme(form.theme).accent_color} />
              ) : (
                <p className="opacity-60 italic">Nothing to preview yet.</p>
              )}
            </div>
          </div>
        </section>

        {/* Editor */}
        <section className="overflow-y-auto p-5 bg-paper border-l border-line">
          {selected ? (
            <QuestionEditor
              key={selected.id}
              question={selected}
              allQuestions={form.questions}
              onChange={(patch) => updateQuestion(selected.id, patch)}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-slate2">
              Select or add a question to start editing.
            </div>
          )}
        </section>

      </div>

      {/* Full preview modal */}
      <AnimatePresence>
        {showPreview && (
          <FullPreview form={form} onClose={() => setShowPreview(false)} />
        )}
      </AnimatePresence>

      {/* Type picker modal */}
      <AnimatePresence>
        {showTypePicker && (
          <TypePickerModal
            onPick={(t) => addQuestion(t)}
            onClose={() => setShowTypePicker(false)}
          />
        )}
      </AnimatePresence>

      {/* Published modal */}
      <AnimatePresence>
        {showPublished && form.public_slug && (
          <PublishedModal
            url={publicUrl}
            slug={form.public_slug}
            onClose={() => setShowPublished(false)}
          />
        )}
      </AnimatePresence>

      {/* Theme / Design modal */}
      <AnimatePresence>
        {showTheme && (
          <ThemePanel
            theme={form.theme}
            onChange={(t) => updateForm({ theme: t })}
            onClose={() => setShowTheme(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SortableRow({
  q,
  index,
  active,
  onSelect,
  onDelete,
}: {
  q: Question;
  index: number;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cx(
        "flex items-center gap-2 px-2 py-2 rounded-lg border group transition-all",
        active ? "tf-selected" : "border-transparent hover:bg-paper/80"
      )}
      data-testid={`question-row-${index}`}
    >
      <button
        className="drag-handle text-slate2 opacity-40 group-hover:opacity-100"
        {...attributes}
        {...listeners}
        data-testid={`drag-handle-${index}`}
        aria-label="Drag to reorder"
      >
        <GripVertical size={14} />
      </button>
      <button onClick={onSelect} className="flex-1 text-left" data-testid={`select-question-${index}`}>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate2 w-5">{index + 1}</span>
          <span className="text-sm line-clamp-1 font-medium">
            {q.title || <span className="italic text-slate2">Untitled</span>}
          </span>
        </div>
        <div className="text-[10px] text-slate2 uppercase tracking-wider mt-0.5 ml-7">
          {QUESTION_TYPE_LABEL[q.type as QuestionType]}
        </div>
      </button>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-slate2 hover:text-red-600 p-1"
        style={{}}
        data-testid={`delete-question-${index}`}
        aria-label="Delete question"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function QuestionEditor({
  question,
  allQuestions,
  onChange,
}: {
  question: Question;
  allQuestions: Question[];
  onChange: (patch: Partial<Question>) => void;
}) {
  const addOption = () => {
    const next = [
      ...question.options,
      {
        id: `topt-${Math.random().toString(36).slice(2)}`,
        label: `Option ${question.options.length + 1}`,
        order_index: question.options.length,
      },
    ];
    onChange({ options: next });
  };

  return (
    <div className="w-full">
      <div className="text-xs uppercase tracking-wider text-slate2 mb-2">
        {QUESTION_TYPE_LABEL[question.type as QuestionType]}
      </div>
      <input
        value={question.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="Your question"
        className="w-full text-xl font-medium leading-tight border-none focus:outline-none bg-transparent mb-3"
        data-testid="editor-title"
      />
      <input
        value={question.description || ""}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="Description (optional)"
        className="w-full text-slate2 border-none focus:outline-none bg-transparent mb-6"
        data-testid="editor-description"
      />

      {(question.type === "multiple_choice" || question.type === "dropdown") && (
        <div className="mb-6">
          <div className="text-xs uppercase tracking-wider text-slate2 font-semibold mb-3">Options</div>
          <div className="flex flex-col gap-2">
            {question.options.map((o, i) => (
              <div key={o.id} className="flex items-center gap-2">
                <span className="w-6 text-sm text-slate2">{String.fromCharCode(65 + i)}.</span>
                <input
                  value={o.label}
                  onChange={(e) => {
                    const next = question.options.map((x) =>
                      x.id === o.id ? { ...x, label: e.target.value } : x
                    );
                    onChange({ options: next });
                  }}
                  className="flex-1 border border-line rounded-lg px-3 py-2 focus:outline-none focus:border-ink"
                  data-testid={`option-input-${i}`}
                />
                <button
                  onClick={() => onChange({ options: question.options.filter((x) => x.id !== o.id) })}
                  className="text-slate2 hover:text-red-600 p-1"
                  aria-label="Remove option"
                  data-testid={`remove-option-${i}`}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <button
              onClick={addOption}
              className="tf-btn-ghost text-sm w-fit"
              data-testid="add-option-btn"
            >
              <Plus size={14} /> Add option
            </button>
          </div>
        </div>
      )}

      {question.type === "rating" && (
        <div className="mb-6">
          <div className="text-xs uppercase tracking-wider text-slate2 font-semibold mb-3">Scale</div>
          <div className="flex gap-2">
            {[5, 7, 10].map((n) => (
              <button
                key={n}
                onClick={() => onChange({ rating_scale: n })}
                className={cx(
                  "px-4 py-2 rounded-lg border text-sm font-medium",
                  (question.rating_scale ?? 5) === n
                    ? "bg-ink text-paper border-ink"
                    : "border-line hover:border-ink"
                )}
                data-testid={`scale-${n}`}
              >
                1 - {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="border-t border-line pt-5 mt-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={question.required}
            onChange={(e) => onChange({ required: e.target.checked })}
            className="w-4 h-4 accent-ink"
            data-testid="required-toggle"
          />
          <span className="text-sm">Required</span>
        </label>
      </div>

      {/* Logic Jumps */}
      <LogicEditor
        question={question}
        allQuestions={allQuestions}
        onChange={(jumps) => onChange({ logic_jumps: jumps })}
      />
    </div>
  );
}

function PreviewSingle({ question, index, total, accentColor }: { question: Question; index: number; total: number; accentColor?: string }) {
  const [val, setVal] = useState<any>(undefined);
  useEffect(() => setVal(undefined), [question.id, question.type]);
  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        <QuestionScreen
          question={question}
          index={index}
          total={total}
          value={val}
          onChange={setVal}
          onNext={() => {}}
          firstQuestion
          accentColor={accentColor}
        />
      </AnimatePresence>
    </div>
  );
}

function FullPreview({ form, onClose }: { form: Form; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const q = form.questions[idx];
  const progress = form.questions.length ? ((idx + (done ? 1 : 0)) / form.questions.length) * 100 : 0;
  const theme = resolveTheme(form.theme);

  const next = () => {
    const v = answers[q.id];
    const error = validateAnswer(q, v);
    if (error) {
      setErr(error);
      return;
    }
    setErr(null);
    const target = nextIndex(form.questions, idx, v);
    if (target === -1) {
      setDone(true);
    } else {
      setHistory((h) => [...h, idx]);
      setIdx(target);
    }
  };

  const back = () => {
    const prev = history[history.length - 1];
    if (prev !== undefined) {
      setHistory((h) => h.slice(0, -1));
      setIdx(prev);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col themed"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={themeStyle(form.theme)}
    >
      <ProgressBar progress={progress} />
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/10 z-10"
        data-testid="close-preview"
      >
        <X size={20} />
      </button>

      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div key="thanks" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="text-center">
                <h2 className="text-4xl font-medium mb-3">All done.</h2>
                <p className="opacity-70 mb-6">{form.thank_you_message}</p>
                <button className="tf-btn-ghost" onClick={onClose}>
                  Close preview
                </button>
              </div>
            </motion.div>
          ) : form.questions.length === 0 ? (
            <p className="opacity-60 italic">Add a question to preview.</p>
          ) : (
            <QuestionScreen
              key={q.id}
              question={q}
              index={idx}
              total={form.questions.length}
              value={answers[q.id]}
              onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
              onNext={next}
              onBack={back}
              firstQuestion={history.length === 0}
              error={err}
              accentColor={theme.accent_color}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function TypePickerModal({ onPick, onClose }: { onPick: (t: QuestionType) => void; onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.96 }}
        animate={{ scale: 1 }}
        className="relative bg-paper rounded-2xl p-6 w-full max-w-xl shadow-lift border border-line"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-2xl">Add a question</h3>
          <button onClick={onClose} className="text-slate2 hover:text-ink">
            <X size={20} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {QUESTION_TYPES.map((t) => (
            <button
              key={t.type}
              onClick={() => onPick(t.type)}
              className="flex items-center gap-3 p-3 rounded-lg border border-line hover:border-ink hover:bg-app-bg transition-colors text-left"
              data-testid={`type-${t.type}`}
            >
              <div className="w-9 h-9 rounded-md bg-app-bg flex items-center justify-center">
                <t.icon size={18} />
              </div>
              <div>
                <div className="font-medium text-sm">{t.label}</div>
                <div className="text-xs text-slate2">{t.description}</div>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function PublishedModal({ url, slug, onClose }: { url: string; slug: string; onClose: () => void }) {
  const copy = async () => {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.96 }}
        animate={{ scale: 1 }}
        className="relative bg-paper rounded-2xl p-7 w-full max-w-md shadow-lift border border-line"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="w-14 h-14 rounded-full bg-ink text-paper flex items-center justify-center mb-5"
        >
          <Check size={24} />
        </motion.div>
        <h3 className="font-display text-2xl mb-2">Your form is live</h3>
        <p className="text-slate2 mb-5 text-sm">Share this link with your audience.</p>
        <div className="flex gap-2 mb-5">
          <input
            readOnly
            value={url}
            className="flex-1 bg-app-bg border border-line rounded-lg px-3 py-2 text-sm"
            data-testid="public-url"
          />
          <button className="tf-btn" onClick={copy} data-testid="copy-url">
            <Copy size={14} />
          </button>
        </div>
        <div className="flex gap-2 justify-end">
          <button className="tf-btn-ghost" onClick={onClose}>
            Done
          </button>
          <a href={`/form/${slug}`} target="_blank" rel="noreferrer" className="tf-btn" data-testid="open-form">
            Open form <ExternalLink size={14} />
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}
