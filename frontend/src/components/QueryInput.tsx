"use client";

import React, { useState, useRef } from "react";
import {
  Search,
  Loader2,
  CheckCircle2,
  HelpCircle,
  AlertTriangle,
  X,
  CornerDownLeft,
  Sparkles,
} from "lucide-react";

interface QueryInputProps {
  onSearch: (question: string) => void;
  isLoading: boolean;
}

interface ExampleQuery {
  id: string;
  category: "gpa" | "fees" | "withdrawal" | "appeals" | "thesis" | "unanswerable";
  label: string;
  query: string;
  expectedState: "ANSWERABLE" | "UNKNOWN" | "CONTRADICTORY";
  hint: string;
}

const CATEGORIES = [
  { id: "all", label: "All Scenarios" },
  { id: "fees", label: "📅 Fees & Deadlines" },
  { id: "gpa", label: "🎓 GPA & Probation" },
  { id: "withdrawal", label: "📝 Late Withdrawal" },
  { id: "appeals", label: "⚖️ Appeals Code" },
  { id: "thesis", label: "🔬 Research Degree (PDF)" },
  { id: "unanswerable", label: "🚫 Hard Near-Misses" },
] as const;

const EXAMPLE_QUERIES: ExampleQuery[] = [
  // Canonical Triad
  {
    id: "canonical-fees",
    category: "fees",
    label: "Tuition Deadline (Canonical)",
    query: "When is the tuition payment deadline?",
    expectedState: "ANSWERABLE",
    hint: "Verified against fee_schedule.md statutory calendar",
  },
  {
    id: "canonical-withdrawal",
    category: "withdrawal",
    label: "Withdrawal Approval Authority (Conflict C-001)",
    query: "Who approves a late course withdrawal?",
    expectedState: "CONTRADICTORY",
    hint: "Academic Regs §5.3 (Dean) vs Graduate Policies §2.6 (Committee)",
  },
  {
    id: "canonical-military",
    category: "unanswerable",
    label: "Military Leave Filing (Near-Miss U-001)",
    query: "What is the deadline for submitting a military leave request?",
    expectedState: "UNKNOWN",
    hint: "Plausible uncodified circumstance; zero hallucination",
  },
  // Specific Real-World Dilemmas
  {
    id: "autumn-tuition",
    category: "fees",
    label: "Autumn Tuition Balance Due",
    query: "What is the tuition payment deadline for the Autumn semester?",
    expectedState: "ANSWERABLE",
    hint: "Exact date: 15 September (fee_schedule.md)",
  },
  {
    id: "probation-gpa",
    category: "gpa",
    label: "Probation Exit GPA Threshold (Conflict C-002)",
    query: "What GPA must an undergraduate student achieve to exit academic probation?",
    expectedState: "CONTRADICTORY",
    hint: "Academic Regs §6.1 (2.0 cumulative) vs Appeals Code §3.2 (2.3 term)",
  },
  {
    id: "thesis-extension",
    category: "thesis",
    label: "Thesis Extension Max Duration (Conflict C-003)",
    query: "What is the maximum duration of a formal thesis submission extension for a research degree student?",
    expectedState: "CONTRADICTORY",
    hint: "Graduate Policies §5.4 (16 weeks) vs Handbook PDF §8.3 (6 months)",
  },
  {
    id: "appeals-grounds",
    category: "appeals",
    label: "Valid Academic Appeal Grounds",
    query: "What are the valid grounds for an academic appeal?",
    expectedState: "ANSWERABLE",
    hint: "Appeals Code §1.2 statutory grounds",
  },
  {
    id: "parking-refund",
    category: "unanswerable",
    label: "Parking Permit Refund on Leave (Near-Miss U-007)",
    query: "What is the refund policy for laboratory equipment deposits?",
    expectedState: "UNKNOWN",
    hint: "Plausible fee-related near-miss absent from fee table",
  },
];

export const QueryInput: React.FC<QueryInputProps> = ({
  onSearch,
  isLoading,
}) => {
  const [question, setQuestion] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim() && !isLoading) {
      onSearch(question.trim());
    }
  };

  const handleSelectExample = (q: string) => {
    setQuestion(q);
    onSearch(q);
  };

  const filteredExamples =
    activeCategory === "all"
      ? EXAMPLE_QUERIES
      : EXAMPLE_QUERIES.filter((ex) => ex.category === activeCategory);

  return (
    <div className="w-full space-y-4">
      {/* Registry Terminal Search Bar */}
      <form onSubmit={handleSubmit} className="relative group">
        <div className="relative flex items-center shadow-lg rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-800 focus-within:border-indigo-600 dark:focus-within:border-indigo-400 bg-white dark:bg-slate-900 transition-all">
          <div className="pl-4 pr-2 text-slate-400">
            <Search className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors" />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask any university policy question (e.g., tuition deadlines, withdrawal approval, probation exit GPA)..."
            disabled={isLoading}
            className="w-full py-4 pr-36 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm sm:text-base font-normal bg-transparent focus:outline-none disabled:opacity-60"
          />

          {question && !isLoading && (
            <button
              type="button"
              onClick={() => {
                setQuestion("");
                inputRef.current?.focus();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mr-1 cursor-pointer"
              title="Clear inquiry"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="absolute right-2 px-4 sm:px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 font-semibold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Auditing...</span>
              </>
            ) : (
              <>
                <span>Inspect Rules</span>
                <CornerDownLeft className="w-3.5 h-3.5 opacity-60 hidden sm:inline" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Scenario Categories & Interactive Prompts */}
      <div className="space-y-2.5">
        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1 rounded-full font-medium whitespace-nowrap transition-colors cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-slate-900 text-white dark:bg-indigo-600 dark:text-white shadow-2xs"
                  : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Example Query Chips */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filteredExamples.map((ex) => {
            const isSelected = question === ex.query;
            let badgeIcon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
            let stateBadge = (
              <span className="px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-mono text-[10px] font-bold border border-emerald-200 dark:border-emerald-800/60">
                ANSWERABLE
              </span>
            );

            if (ex.expectedState === "UNKNOWN") {
              badgeIcon = <HelpCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
              stateBadge = (
                <span className="px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-mono text-[10px] font-bold border border-amber-200 dark:border-amber-800/60">
                  UNKNOWN
                </span>
              );
            } else if (ex.expectedState === "CONTRADICTORY") {
              badgeIcon = <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
              stateBadge = (
                <span className="px-1.5 py-0.2 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-mono text-[10px] font-bold border border-rose-200 dark:border-rose-800/60">
                  CONTRADICTORY
                </span>
              );
            }

            return (
              <button
                key={ex.id}
                type="button"
                onClick={() => handleSelectExample(ex.query)}
                disabled={isLoading}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer disabled:cursor-not-allowed flex items-start gap-2.5 ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20"
                    : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200 shadow-2xs"
                }`}
              >
                <div className="mt-0.5">{badgeIcon}</div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {ex.label}
                    </span>
                    {stateBadge}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 font-normal">
                    {ex.query}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

