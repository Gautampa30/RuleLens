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
    <div id="query-section" className="w-full space-y-6">
      {/* Editorial Search Bar */}
      <form onSubmit={handleSubmit} className="relative w-full">
        <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl focus-within:border-zinc-900 dark:focus-within:border-zinc-300 focus-within:ring-1 focus-within:ring-zinc-900 dark:focus-within:ring-zinc-300 transition-all shadow-xs">
          <div className="pl-4 pr-2 text-zinc-400">
            <Search className="w-5 h-5 text-zinc-400" />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask an academic regulation question..."
            disabled={isLoading}
            className="w-full py-3.5 pr-32 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 text-sm sm:text-base font-normal bg-transparent focus:outline-none disabled:opacity-60"
          />

          {question && !isLoading && (
            <button
              type="button"
              onClick={() => {
                setQuestion("");
                inputRef.current?.focus();
              }}
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 mr-1 cursor-pointer"
              title="Clear inquiry"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="absolute right-1.5 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 disabled:text-zinc-400 dark:disabled:text-zinc-600 font-medium text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <span>Verify Rule</span>
            )}
          </button>
        </div>
      </form>

      {/* Subtle Verified Corpus Line */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-normal px-1">
        <span>241 verified passages · 13 policy claims · 5 source publications</span>
        <button
          type="button"
          onClick={() => setShowAllExamples(!showAllExamples)}
          className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors underline cursor-pointer"
        >
          {showAllExamples ? "Hide example library" : "Explore test cases"}
        </button>
      </div>

      {/* Understated Primary Inline Prompts */}
      {!showAllExamples && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-zinc-600 dark:text-zinc-400">
          <span className="text-zinc-400 dark:text-zinc-500">Try a question:</span>
          <button
            type="button"
            onClick={() => handleSelectQuery("When is the tuition payment deadline?")}
            className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors underline cursor-pointer"
          >
            &ldquo;When is tuition due?&rdquo;
          </button>
          <span className="text-zinc-300 dark:text-zinc-700">·</span>
          <button
            type="button"
            onClick={() => handleSelectQuery("Who approves a late course withdrawal?")}
            className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors underline cursor-pointer"
          >
            &ldquo;Who approves a late course withdrawal?&rdquo;
          </button>
          <span className="text-zinc-300 dark:text-zinc-700">·</span>
          <button
            type="button"
            onClick={() => handleSelectQuery("What is the deadline for submitting a military leave request?")}
            className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors underline cursor-pointer"
          >
            &ldquo;Is there a military leave deadline?&rdquo;
          </button>
        </div>
      )}

      {/* Expanded Clean Category Navigation (Scenario Explorer) */}
      {showAllExamples && (
        <div className="pt-2 space-y-3 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-4 overflow-x-auto pb-1 text-xs font-medium text-zinc-500 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`whitespace-nowrap transition-colors cursor-pointer pb-1 border-b-2 ${
                  activeCategory === cat.id
                    ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100"
                    : "border-transparent hover:text-zinc-800 dark:hover:text-zinc-300"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
            {filteredExamples.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => handleSelectQuery(ex.query)}
                className="group flex items-baseline justify-between p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 hover:border-zinc-400 dark:hover:border-zinc-600 text-left text-xs transition-colors cursor-pointer"
              >
                <span className="text-zinc-800 dark:text-zinc-200 font-medium group-hover:text-zinc-950 dark:group-hover:text-white">
                  {ex.query}
                </span>
                <span className={`text-[10px] uppercase font-mono tracking-wider ml-2 shrink-0 ${
                  ex.expectedState === "ANSWERABLE"
                    ? "text-emerald-700 dark:text-emerald-400"
                    : ex.expectedState === "CONTRADICTORY"
                    ? "text-rose-700 dark:text-rose-400"
                    : "text-amber-700 dark:text-amber-400"
                }`}>
                  {ex.expectedState}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

