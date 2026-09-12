"use client";

import React, { useState, useRef } from "react";
import {
  Search,
  Loader2,
  X,
  ArrowRight,
} from "lucide-react";

interface QueryInputProps {
  onSearch: (question: string) => void;
  isLoading: boolean;
}

interface ExampleQuery {
  id: string;
  category: "fees" | "gpa" | "withdrawal" | "appeals" | "thesis" | "unanswerable";
  label: string;
  query: string;
  expectedState: "ANSWERABLE" | "UNKNOWN" | "CONTRADICTORY";
}

const CATEGORIES = [
  { id: "all", label: "All Topics" },
  { id: "fees", label: "Fees & Deadlines" },
  { id: "gpa", label: "GPA & Academic Standing" },
  { id: "withdrawal", label: "Course Withdrawal" },
  { id: "appeals", label: "Appeals Code" },
  { id: "thesis", label: "Research Degrees (PDF)" },
  { id: "unanswerable", label: "Uncodified / Near-Misses" },
] as const;

const EXAMPLE_QUERIES: ExampleQuery[] = [
  {
    id: "canonical-fees",
    category: "fees",
    label: "Tuition payment deadline",
    query: "When is the tuition payment deadline?",
    expectedState: "ANSWERABLE",
  },
  {
    id: "canonical-withdrawal",
    category: "withdrawal",
    label: "Late withdrawal authority (Conflict C-001)",
    query: "Who approves a late course withdrawal?",
    expectedState: "CONTRADICTORY",
  },
  {
    id: "canonical-military",
    category: "unanswerable",
    label: "Military leave deadline (Near-miss U-001)",
    query: "What is the deadline for submitting a military leave request?",
    expectedState: "UNKNOWN",
  },
  {
    id: "autumn-tuition",
    category: "fees",
    label: "Autumn semester tuition balance due date",
    query: "What is the tuition payment deadline for the Autumn semester?",
    expectedState: "ANSWERABLE",
  },
  {
    id: "probation-gpa",
    category: "gpa",
    label: "Undergraduate probation exit GPA (Conflict C-002)",
    query: "What GPA must an undergraduate student achieve to exit academic probation?",
    expectedState: "CONTRADICTORY",
  },
  {
    id: "thesis-extension",
    category: "thesis",
    label: "Thesis extension duration limit (Conflict C-003)",
    query: "What is the maximum duration of a formal thesis submission extension for a research degree student?",
    expectedState: "CONTRADICTORY",
  },
  {
    id: "appeals-grounds",
    category: "appeals",
    label: "Valid statutory grounds for academic appeal",
    query: "What are the valid grounds for an academic appeal?",
    expectedState: "ANSWERABLE",
  },
  {
    id: "lab-deposit",
    category: "unanswerable",
    label: "Laboratory equipment deposit refund (Near-miss U-007)",
    query: "What is the refund policy for laboratory equipment deposits?",
    expectedState: "UNKNOWN",
  },
];

export const QueryInput: React.FC<QueryInputProps> = ({
  onSearch,
  isLoading,
}) => {
  const [question, setQuestion] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [showAllExamples, setShowAllExamples] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim() && !isLoading) {
      onSearch(question.trim());
    }
  };

  const handleSelectQuery = (q: string) => {
    setQuestion(q);
    onSearch(q);
  };

  const filteredExamples =
    activeCategory === "all"
      ? EXAMPLE_QUERIES
      : EXAMPLE_QUERIES.filter((ex) => ex.category === activeCategory);

  return (
    <div id="query-section" className="w-full space-y-4">
      {/* Label / Eyebrow */}
      <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#183b56] dark:bg-sky-400" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">Ask RuleLens</span>
        </div>
        <span>Codified Statute Verification</span>
      </div>

      {/* Premium Verification Control */}
      <form onSubmit={handleSubmit} className="relative w-full">
        <div className="relative flex items-center bg-white dark:bg-[#111622] border border-slate-300 dark:border-slate-700 rounded-xl focus-within:border-[#183b56] dark:focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-[#183b56] dark:focus-within:ring-sky-500 transition-all shadow-xs">
          <div className="pl-4 pr-2 text-slate-400">
            <Search className="w-5 h-5 text-slate-400" />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask an academic regulation question (e.g. tuition deadlines, probation GPA, withdrawal authority)..."
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
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mr-1 cursor-pointer"
              title="Clear inquiry"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="absolute right-1.5 px-5 py-2.5 rounded-lg bg-[#183b56] hover:bg-[#112a3e] dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 font-semibold text-xs sm:text-sm tracking-wide transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-xs"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>VERIFY RULE</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Subtle Verified Corpus Line */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 font-normal px-1">
        <span className="font-mono text-[11px]">241 verified passages · 13 policy claims · 5 source publications</span>
        <button
          type="button"
          onClick={() => setShowAllExamples(!showAllExamples)}
          className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors underline cursor-pointer"
        >
          {showAllExamples ? "Hide test cases" : "Explore canonical test cases"}
        </button>
      </div>

      {/* Understated Primary Inline Prompts */}
      {!showAllExamples && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-600 dark:text-slate-400 px-1">
          <span className="text-slate-400 dark:text-slate-500">Try a question:</span>
          <button
            type="button"
            onClick={() => handleSelectQuery("When is the tuition payment deadline?")}
            className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors underline cursor-pointer font-medium"
          >
            &ldquo;When is tuition due?&rdquo;
          </button>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <button
            type="button"
            onClick={() => handleSelectQuery("Who approves a late course withdrawal?")}
            className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors underline cursor-pointer font-medium"
          >
            &ldquo;Who approves a late course withdrawal?&rdquo;
          </button>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <button
            type="button"
            onClick={() => handleSelectQuery("What is the deadline for submitting a military leave request?")}
            className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors underline cursor-pointer font-medium"
          >
            &ldquo;Is there a military leave deadline?&rdquo;
          </button>
        </div>
      )}

      {/* Expanded Category Navigation (Scenario Explorer) */}
      {showAllExamples && (
        <div className="pt-3 space-y-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4 overflow-x-auto pb-1 text-xs font-medium text-slate-500 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`whitespace-nowrap pb-1.5 transition-colors cursor-pointer border-b-2 ${
                  activeCategory === cat.id
                    ? "text-slate-900 dark:text-slate-100 border-[#183b56] dark:border-sky-400 font-semibold"
                    : "border-transparent hover:text-slate-800 dark:hover:text-slate-300"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
            {filteredExamples.map((ex) => (
              <div
                key={ex.id}
                onClick={() => handleSelectQuery(ex.query)}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111622] hover:border-slate-400 dark:hover:border-slate-600 transition-all cursor-pointer flex items-center justify-between gap-3 text-xs group"
              >
                <div className="space-y-0.5">
                  <div className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-slate-950 dark:group-hover:text-white">
                    {ex.label}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    &ldquo;{ex.query}&rdquo;
                  </div>
                </div>

                <span
                  className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                    ex.expectedState === "ANSWERABLE"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                      : ex.expectedState === "UNKNOWN"
                      ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                      : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                  }`}
                >
                  {ex.expectedState}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
