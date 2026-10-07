"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Search,
  LayoutGrid,
  List as ListIcon,
  Palette,
  Plug,
  Users,
  Mic,
  Send,
  PanelsTopLeft,
  ChevronRight,
  Plus,
  MoreHorizontal,
  Copy,
  Trash2,
  Edit3,
  BarChart3,
  Globe,
  HelpCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { FormSummary } from "@/lib/types";
import { cx, timeAgo } from "@/lib/utils";
import { TypeformLogo } from "@/components/Logo";

export default function DashboardPage() {
  const router = useRouter();
  const [forms, setForms] = useState<FormSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<FormSummary | null>(null);
  const [prompt, setPrompt] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  const refresh = async () => {
    try {
      const data = await api.listForms();
      setForms(data);
    } catch (e: any) {
      toast.error(e.message || "Failed to load forms");
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const f = await api.createForm({ title: "Untitled form" });
      toast.success("Form created");
      router.push(`/forms/${f.id}/edit`);
    } catch (e: any) {
      toast.error(e.message || "Could not create form");
    } finally {
      setCreating(false);
    }
  };

  // "Type or paste your form questions": every non-empty line becomes a question.
  const handleCreateFromPrompt = async () => {
    const lines = prompt.split("\n").map((l) => l.replace(/^\s*(\d+[.)]|[-*•])\s*/, "").trim()).filter(Boolean);
    if (!lines.length) return;
    setCreating(true);
    try {
      const f = await api.createForm({ title: "Untitled form" });
      await api.updateForm(f.id, {
        questions: lines.map((title, i) => ({
          type: /email/i.test(title) ? "email" : "short_text",
          title,
          required: false,
          order_index: i,
          options: [],
        })),
      });
      toast.success("Form created");
      router.push(`/forms/${f.id}/edit`);
    } catch (e: any) {
      toast.error(e.message || "Could not create form");
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try { await api.duplicateForm(id); toast.success("Form duplicated"); refresh(); }
    catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.deleteForm(confirmDelete.id);
      toast.success("Form deleted");
      setConfirmDelete(null);
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleRename = async () => {
    if (!renameId) return;
    try {
      await api.updateForm(renameId, { title: renameValue.trim() || "Untitled form" });
      toast.success("Renamed");
      setRenameId(null);
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const togglePublish = async (f: FormSummary) => {
    try {
      if (f.is_published) { await api.unpublishForm(f.id); toast.success("Unpublished"); }
      else { await api.publishForm(f.id); toast.success("Published"); }
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const filtered = (forms || []).filter((f) => f.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="tf-frame">
      {/* Top bar: breadcrumb left, help + avatar right (matches Typeform app chrome) */}
      <header className="h-[62px] shrink-0 flex items-center justify-between px-3">
        <div className="flex items-center gap-5">
        <Link href="/" className="text-ink" aria-label="Home"><TypeformLogo size={20} wordmark /></Link>
        <div className="h-5 w-px bg-line" />
        <nav className="flex items-center gap-2 text-[15px] text-slate2" data-testid="breadcrumb">
          <PanelsTopLeft size={17} />
          <Link href="/forms" className="hover:text-ink" data-testid="brand-logo">Forms</Link>
          <ChevronRight size={14} className="text-mute" />
          <span>{forms && forms.length ? "My forms" : "New form"}</span>
        </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-6 w-px bg-line" />
          <button className="text-slate2 hover:text-ink" aria-label="Help">
            <HelpCircle size={22} strokeWidth={1.6} />
          </button>
          <Link href="/login" className="tf-avatar" title="Account" data-testid="user-avatar">HF</Link>
        </div>
      </header>

      <div className="flex gap-3 flex-1 min-h-0">
        <aside className="hidden md:flex w-[230px] shrink-0 flex-col gap-1 pt-2 pr-1" data-testid="sidebar">
          <button className="tf-btn-primary w-full mb-4" onClick={handleCreate} disabled={creating}>
            <Plus size={16} /> Create form
          </button>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-mute mb-1">Workspace</p>
          <span className="flex items-center gap-3 px-3 py-2 rounded-xl bg-canvas text-ink font-medium text-sm">
            <PanelsTopLeft size={17} /> Forms
            <span className="ml-auto text-xs text-slate2">{forms ? forms.length : 0}</span>
          </span>
          {[
            { icon: Palette, label: "Themes" },
            { icon: Plug, label: "Integrations" },
            { icon: Users, label: "Team" },
          ].map((it) => (
            <button
              key={it.label}
              onClick={() => toast(`${it.label} is coming soon`)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate2 hover:bg-canvas hover:text-ink text-sm text-left"
            >
              <it.icon size={17} /> {it.label}
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-purple-soft text-purple2 font-medium">Soon</span>
            </button>
          ))}
          <div className="mt-auto p-3 rounded-2xl text-sm" style={{ background: "linear-gradient(135deg,#f6ffd6,#f1e2f7)" }}>
            <p className="font-medium text-ink mb-1">Typeform Builder</p>
            <p className="text-slate2 text-xs leading-snug">Build forms people actually enjoy filling out.</p>
          </div>
        </aside>
      <main className="tf-canvas tf-canvas-color flex-1 min-w-0 px-6 md:px-12 pt-14 pb-14">
        {/* Typeform AI create panel */}
        <section className="max-w-[560px] mx-auto text-center">
          <p className="text-[15px] font-medium text-slate2 mb-4">Create a form</p>
          <h1 className="text-[2rem] md:text-[2.15rem] leading-tight font-light text-ink mb-10" data-testid="dashboard-title">
            What would you like to create?
          </h1>

          <div className="tf-ai-box text-left">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleCreateFromPrompt();
              }}
              placeholder="Paste your questions, one per line."
              className="w-full h-[130px] resize-none bg-transparent px-4 pt-4 text-[16px] text-ink placeholder:text-slate2/70 focus:outline-none"
              data-testid="ai-prompt"
            />
            <div className="flex items-center justify-between px-3 pb-3">
              <div className="flex items-center gap-1.5 text-ink">
                <button className="p-1.5 rounded hover:bg-canvas" aria-label="Voice input" onClick={() => toast("Voice input is coming soon")}>
                  <Mic size={19} strokeWidth={1.6} />
                </button>
                <button className="p-1.5 rounded hover:bg-canvas" aria-label="Attach" onClick={() => toast("Attachments are coming soon")}>
                  <Plus size={20} strokeWidth={1.6} />
                </button>
                <button className="p-1.5 rounded hover:bg-canvas" aria-label="More" onClick={() => toast("More options are coming soon")}>
                  <MoreHorizontal size={20} strokeWidth={1.6} />
                </button>
              </div>
              <button
                onClick={handleCreateFromPrompt}
                disabled={!prompt.trim() || creating}
                aria-label="Create form from questions"
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:bg-canvas disabled:text-mute bg-ink text-white"
                data-testid="ai-submit"
              >
                <Send size={16} strokeWidth={1.6} />
              </button>
            </div>
          </div>

          <div className="h-px bg-line mt-14 mb-14 mx-4" />

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button className="tf-btn-canvas" onClick={handleCreate} disabled={creating} data-testid="create-form-btn">
              {creating ? "Creating..." : "Start from scratch"}
            </button>
            <button className="tf-btn-canvas" onClick={() => toast("CRM sync is coming soon")}>
              Sync to CRM
              <span className="flex gap-2">
                <span className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-[#ff7a59] font-bold text-sm">H</span>
                <span className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-[#00a1e0] font-bold text-sm">S</span>
              </span>
            </button>
          </div>
        </section>

        {/* Existing forms */}
        <section className="max-w-6xl mx-auto mt-20">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[1.15rem] font-medium text-ink">My workspace</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search forms"
                  className="h-10 w-44 md:w-60 rounded-xl border border-line bg-white pl-9 pr-3 text-sm focus:outline-none focus:border-ink"
                  data-testid="search-input"
                />
              </div>
              <div className="flex rounded-xl border border-line bg-white p-0.5">
                <button aria-label="Grid view" onClick={() => setView("grid")} className={cx("w-9 h-9 rounded-[10px] flex items-center justify-center", view === "grid" ? "bg-canvas text-ink" : "text-mute")}><LayoutGrid size={16} /></button>
                <button aria-label="List view" onClick={() => setView("list")} className={cx("w-9 h-9 rounded-[10px] flex items-center justify-center", view === "list" ? "bg-canvas text-ink" : "text-mute")}><ListIcon size={16} /></button>
              </div>
            </div>
          </div>
          {forms === null ? (
            <GridSkeleton />
          ) : filtered.length === 0 ? (
            <div className="bg-paper rounded-2xl p-10 text-center text-slate2" data-testid="empty-state">
              No forms yet. Describe one above or start from scratch.
            </div>
          ) : (
            <div className={view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5" : "flex flex-col gap-3"} data-testid="forms-grid">
              {filtered.map((f, i) => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  className="tf-card relative group overflow-hidden hover:-translate-y-0.5 transition-transform"
                  data-testid={`form-card-${f.id}`}
                >
                  <div
                    className={view === "grid" ? "h-28 px-5 pt-4 flex items-end" : "h-12 px-5 flex items-center"}
                    style={{
                      background: `linear-gradient(135deg, ${(f.theme as any)?.background_color || "#f1e2f7"}, ${(f.theme as any)?.accent_color || "#a45bb8"})`,
                    }}
                  >
                    <span
                      className="text-[1.05rem] font-medium leading-tight line-clamp-2 mb-3"
                      style={{ color: (f.theme as any)?.text_color || "#2a222b" }}
                    >
                      {f.title}
                    </span>
                  </div>
                  <div className="p-5">
                  <div className="flex items-start justify-between mb-5">
                    <span
                      className={cx("tf-chip", f.is_published ? "tf-chip-live" : "tf-chip-draft")}
                      data-testid={`form-status-${f.id}`}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: f.is_published ? "#c58fd4" : "#9d98a1" }}
                      />
                      {f.is_published ? "Published" : "Draft"}
                    </span>

                    <div className="relative">
                      <button
                        className="opacity-50 hover:opacity-100 p-1 rounded hover:bg-line"
                        onClick={() => setMenuOpenId(menuOpenId === f.id ? null : f.id)}
                        data-testid={`form-menu-${f.id}`}
                        aria-label="Form actions"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                      {menuOpenId === f.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                          <div className="absolute right-0 mt-1 w-48 bg-paper border border-line rounded-xl shadow-lift z-20 py-1 text-sm overflow-hidden">
                            <MenuBtn testid={`rename-${f.id}`} icon={<Edit3 size={14} />} onClick={() => { setRenameId(f.id); setRenameValue(f.title); setMenuOpenId(null); }}>
                              Rename
                            </MenuBtn>
                            <MenuBtn testid={`duplicate-${f.id}`} icon={<Copy size={14} />} onClick={() => { handleDuplicate(f.id); setMenuOpenId(null); }}>
                              Duplicate
                            </MenuBtn>
                            <MenuBtn testid={`toggle-publish-${f.id}`} icon={<Globe size={14} />} onClick={() => { togglePublish(f); setMenuOpenId(null); }}>
                              {f.is_published ? "Unpublish" : "Publish"}
                            </MenuBtn>
                            <div className="border-t border-line my-1" />
                            <MenuBtn testid={`delete-${f.id}`} icon={<Trash2 size={14} />} danger onClick={() => { setConfirmDelete(f); setMenuOpenId(null); }}>
                              Delete
                            </MenuBtn>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <Link href={`/forms/${f.id}/edit`}>
                    <h3 className="text-[1.25rem] font-medium leading-tight mb-2 line-clamp-2 group-hover:text-purple2 transition-colors">
                      {f.title}
                    </h3>
                  </Link>
                  {f.description && (
                    <p className="text-sm text-slate2 line-clamp-2 mb-4">{f.description}</p>
                  )}

                  <div className="flex items-center justify-between text-xs text-slate2 pt-3 border-t border-line relative z-10">
                    <div className="flex items-center gap-3">
                      <span>{f.question_count} questions</span>
                      <span className="opacity-50">·</span>
                      <Link
                        href={`/forms/${f.id}/results`}
                        className="hover:text-ink inline-flex items-center gap-1"
                        data-testid={`results-link-${f.id}`}
                      >
                        <BarChart3 size={12} /> {f.response_count} responses
                      </Link>
                    </div>
                    <span>{timeAgo(f.updated_at)}</span>
                  </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </main>
      </div>

      <AnimatePresence>
        {renameId && (
          <Modal onClose={() => setRenameId(null)}>
            <h3 className="text-[1.4rem] font-medium mb-4">Rename form</h3>
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full border border-line rounded-xl px-3 py-2.5 text-base focus:outline-none focus:border-ink"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              data-testid="rename-input"
            />
            <div className="flex justify-end gap-2 mt-5">
              <button className="tf-btn-ghost" onClick={() => setRenameId(null)}>Cancel</button>
              <button className="tf-btn" onClick={handleRename} data-testid="rename-save">Save</button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDelete && (
          <Modal onClose={() => setConfirmDelete(null)}>
            <h3 className="text-[1.4rem] font-medium mb-2">Delete form?</h3>
            <p className="text-slate2 mb-5">
              "{confirmDelete.title}" and all of its responses will be permanently removed.
            </p>
            <div className="flex justify-end gap-2">
              <button className="tf-btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button
                className="tf-btn"
                style={{ background: "#c0392b" }}
                onClick={handleDelete}
                data-testid="confirm-delete"
              >
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuBtn({
  children,
  icon,
  onClick,
  danger,
  testid,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  testid?: string;
}) {
  return (
    <button
      data-testid={testid}
      onClick={onClick}
      className={cx(
        "w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-line-soft text-sm transition-colors",
        danger && "text-red-600"
      )}
    >
      {icon} {children}
    </button>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-paper rounded-2xl p-7 w-full max-w-md shadow-lift border border-line"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="rounded-2xl h-40 animate-pulse bg-line/60" />
      ))}
    </div>
  );
}
