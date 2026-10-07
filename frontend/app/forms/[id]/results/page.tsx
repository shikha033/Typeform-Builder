"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, Users, TrendingUp, Download, Globe } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Form, FormStats, ResponseSummary, ResponseRecord } from "@/lib/types";
import { formatDate, cx } from "@/lib/utils";
import { QUESTION_TYPE_LABEL } from "@/lib/questionTypes";
import { TypeformLogo } from "@/components/Logo";

type Tab = "summary" | "individual";

export default function ResultsPage() {
  const params = useParams();
  const formId = params.id as string;

  const [form, setForm] = useState<Form | null>(null);
  const [stats, setStats] = useState<FormStats | null>(null);
  const [list, setList] = useState<ResponseSummary[]>([]);
  const [tab, setTab] = useState<Tab>("summary");
  const [selectedResp, setSelectedResp] = useState<ResponseRecord | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [f, s, l] = await Promise.all([
          api.getForm(formId),
          api.getStats(formId),
          api.listResponses(formId),
        ]);
        setForm(f);
        setStats(s);
        setList(l);
      } catch (e: any) {
        toast.error(e.message);
      }
    })();
  }, [formId]);

  const openResponse = async (id: string) => {
    try {
      const r = await api.getResponse(formId, id);
      setSelectedResp(r);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (!form || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate2">Loading results…</div>
      </div>
    );
  }

  const questionsById = Object.fromEntries(form.questions.map((q) => [q.id, q]));

  return (
  <div className="min-h-screen tf-canvas-color">
    <header className="h-[60px] bg-paper px-5 flex items-center gap-3">
      <Link
        href="/forms"
        className="flex items-center gap-2 text-slate2 hover:text-ink text-[15px]"
        data-testid="back-to-dashboard"
      >
        <TypeformLogo size={18} className="text-ink" />
        <span className="hidden sm:inline">Forms</span>
      </Link>

      <span className="text-mute">/</span>

      <div className="flex-1 min-w-0">
        <h1 className="text-[15px] font-medium truncate">{form.title}</h1>
      </div>

      <Link
        href={`/forms/${form.id}/edit`}
        className="tf-btn-ghost text-sm"
        data-testid="edit-link"
      >
        Edit form
      </Link>

      <a
        href={api.csvUrl(form.id)}
        className="tf-btn-accent text-sm"
        data-testid="export-csv-btn"
        download
      >
        <Download size={14} /> Export CSV
      </a>
    </header>
      <div className="max-w-6xl mx-auto px-6 py-10 relative">
        <div className="ambient-purple w-[500px] h-[220px] -top-10 right-20" />

        <div className="mb-8 relative">
          <p className="text-xs uppercase tracking-[0.1em] text-purple2 font-semibold mb-2">Results</p>
          <h1 className="text-[2rem] md:text-[2.4rem] font-light leading-tight">
            {form.title}
          </h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard icon={<Users size={18} />} label="Total responses" value={stats.total_responses} testid="stat-total" />
          <StatCard icon={<TrendingUp size={18} />} label="Questions" value={form.questions.length} testid="stat-questions" />
          <StatCard
            icon={<Globe size={18} />}
            label="Status"
            value={form.is_published ? "Live" : "Draft"}
            testid="stat-status"
          />
        </div>

        <div className="flex gap-1 border-b border-line mb-6">
          <TabBtn active={tab === "summary"} onClick={() => setTab("summary")} testid="tab-summary">
            Summary
          </TabBtn>
          <TabBtn active={tab === "individual"} onClick={() => setTab("individual")} testid="tab-individual">
            Responses ({list.length})
          </TabBtn>
        </div>

        {tab === "summary" ? (
          <div className="space-y-5" data-testid="summary-panel">
            {stats.questions.map((qs, i) => (
              <motion.div
                key={qs.question_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="tf-card p-6"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate2 font-semibold">
                    {QUESTION_TYPE_LABEL[qs.question_type as keyof typeof QUESTION_TYPE_LABEL] || qs.question_type}
                    <h3 className="font-display text-lg">{qs.question_title || "Untitled"}</h3>
                  </div>
                  <span className="text-xs text-slate2">{qs.response_count} responses</span>
                </div>

                <StatRenderer qs={qs} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="tf-card overflow-hidden" data-testid="individual-panel">
            {list.length === 0 ? (
              <div className="p-10 text-center text-slate2">
                No responses yet. Share your form to collect responses.
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-app-bg text-xs uppercase tracking-wider text-slate2">
                    <th className="text-left px-4 py-3">#</th>
                    <th className="text-left px-4 py-3">Submitted</th>
                    <th className="text-left px-4 py-3">Answers</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r, i) => (
                    <tr
                      key={r.id}
                      className="border-t border-line hover:bg-app-bg cursor-pointer"
                      onClick={() => openResponse(r.id)}
                      data-testid={`response-row-${i}`}
                    >
                      <td className="px-4 py-3 text-sm text-slate2">#{list.length - i}</td>
                      <td className="px-4 py-3 text-sm">{formatDate(r.submitted_at)}</td>
                      <td className="px-4 py-3 text-sm">{r.answer_count} answers</td>
                      <td className="px-4 py-3 text-sm text-right text-slate2">View →</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {selectedResp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setSelectedResp(null)} />
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-paper rounded-2xl p-7 w-full max-w-2xl shadow-lift border border-line max-h-[85vh] overflow-y-auto"
            data-testid="response-detail-modal"
          >
            <div className="mb-5">
              <div className="text-xs text-slate2 mb-1">Response · {formatDate(selectedResp.submitted_at)}</div>
              <h3 className="font-display text-2xl">Individual response</h3>
            </div>
            <div className="space-y-5">
              {form.questions.map((q) => {
                const a = selectedResp.answers.find((x) => x.question_id === q.id);
                let display: string = "—";
                if (a) {
                  if (q.type === "multiple_choice" || q.type === "dropdown") {
                    display = q.options.find((o) => o.id === a.value_option_id)?.label || "—";
                  } else if (q.type === "yes_no") {
                    display = a.value_bool ? "Yes" : "No";
                  } else if (q.type === "rating" || q.type === "number") {
                    display = a.value_number != null ? String(a.value_number) : "—";
                  } else {
                    display = a.value_text || "—";
                  }
                }
                return (
                  <div key={q.id} className="border-l-2 border-line pl-4">
                    <div className="text-xs text-slate2 uppercase tracking-wider">{q.title || "Untitled"}</div>
                    <div className="text-base mt-1">{display}</div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end mt-6">
              <button className="tf-btn-ghost" onClick={() => setSelectedResp(null)} data-testid="close-response">
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, testid }: { icon: React.ReactNode; label: string; value: any; testid?: string }) {
  return (
    <div className="tf-card p-5" data-testid={testid}>
      <div className="flex items-center gap-2 text-slate2 text-xs mb-2 uppercase tracking-[0.08em] font-semibold">{icon}{label}</div>
      <div className="font-display text-[2.25rem] leading-none">{value}</div>
    </div>
  );
}

function TabBtn({ children, active, onClick, testid }: { children: React.ReactNode; active?: boolean; onClick: () => void; testid?: string }) {
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className={cx(
        "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
        active ? "border-purple2 text-ink" : "border-transparent text-slate2 hover:text-ink"
      )}
    >
      {children}
    </button>
  );
}

function StatRenderer({ qs }: { qs: any }) {
  if (qs.option_counts) {
    const max = Math.max(1, ...Object.values<number>(qs.option_counts));
    return (
      <div className="space-y-2">
        {Object.entries<number>(qs.option_counts).map(([label, count]) => (
          <div key={label}>
            <div className="flex justify-between text-sm mb-1">
              <span>{label}</span>
              <span className="text-slate2">{count}</span>
            </div>
            <div className="h-2 bg-line rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(count / max) * 100}%` }}
                className="h-full bg-ink"
              />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (qs.yes_count != null || qs.no_count != null) {
    const total = (qs.yes_count || 0) + (qs.no_count || 0);
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-app-bg rounded-lg p-4">
          <div className="text-xs text-slate2">Yes</div>
          <div className="font-display text-3xl">{qs.yes_count || 0}</div>
          <div className="text-xs text-slate2">{total ? Math.round(((qs.yes_count || 0) / total) * 100) : 0}%</div>
        </div>
        <div className="bg-app-bg rounded-lg p-4">
          <div className="text-xs text-slate2">No</div>
          <div className="font-display text-3xl">{qs.no_count || 0}</div>
          <div className="text-xs text-slate2">{total ? Math.round(((qs.no_count || 0) / total) * 100) : 0}%</div>
        </div>
      </div>
    );
  }
  if (qs.distribution) {
    const max = Math.max(1, ...Object.values<number>(qs.distribution));
    return (
      <div>
        <div className="text-sm text-slate2 mb-3">Average: <span className="text-ink font-semibold">{qs.average ?? "—"}</span></div>
        <div className="flex items-end gap-2 h-28">
          {Object.entries<number>(qs.distribution).map(([k, v]) => (
            <div key={k} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex-1 flex items-end">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(v / max) * 100}%` }}
                  className="w-full bg-ink rounded-t-md min-h-[2px]"
                />
              </div>
              <span className="text-xs text-slate2">{k}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (qs.average != null) {
    return <div className="text-sm text-slate2">Average: <span className="text-ink font-semibold">{qs.average}</span></div>;
  }
  if (qs.text_answers) {
    return (
      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {qs.text_answers.length === 0 && <div className="text-slate2 text-sm italic">No answers yet.</div>}
        {qs.text_answers.map((a: string, i: number) => (
          <div key={i} className="text-sm bg-app-bg rounded px-3 py-2 border border-line">{a}</div>
        ))}
      </div>
    );
  }
  return null;
}
