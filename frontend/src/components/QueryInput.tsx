"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, Loader2, Sparkles, CheckCircle2, HelpCircle, AlertTriangle } from "lucide-react";

interface QueryInputProps {
  onSearch: (question: string) => void;
  isLoading: boolean;
}

interface ExampleQuery {
  label: string;
  query: string;
  expectedState: "ANSWERABLE" | "UNKNOWN" | "CONTRADICTORY";
}

const EXAMPLE_QUERIES: ExampleQuery[] = [
  {
    label: "Tuition Deadline",
    query: "What is the tuition payment deadline for the Autumn semester?",
    expectedState: "ANSWERABLE",
  },
  {
    label: "Honors GPA",
    query: "What is the minimum cumulative GPA required for Latin honors at graduation?",
    expectedState: "ANSWERABLE",
  },
  {
    label: "Military Leave",
    query: "What is the university policy on leave of absence for military service?",
    expectedState: "UNKNOWN",
  },
  {
    label: "ID Card Replacement",
    query: "What is the fee for replacing a lost student ID card?",
    expectedState: "UNKNOWN",
  },
  {
    label: "Withdrawal Approval (Conflict)",
    query: "Who must approve a graduate student late course withdrawal after week 8?",
    expectedState: "CONTRADICTORY",
  },
  {
    label: "Leave Duration (Conflict)",
    query: "How many consecutive semesters may a student remain on approved leave of absence?",
    expectedState: "CONTRADICTORY",
  },
];

export const QueryInput: React.FC<QueryInputProps> = ({
  onSearch,
  isLoading,
}) => {
  const [question, setQuestion] = useState("");
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

  return (
    <div className="w-full space-y-4">
      {/* Search Bar Form */}
      <form onSubmit={handleSubmit} className="relative group">
        <div className="relative flex items-center shadow-lg rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-800 focus-within:border-indigo-500 dark:focus-within:border-indigo-400 bg-white dark:bg-slate-900 transition-all">
          <div className="pl-4 pr-2 text-slate-400">
            <Search className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask any academic regulation or policy question (e.g., deadlines, GPA thresholds, withdrawal rules)..."
            disabled={isLoading}
            className="w-full py-4 pr-32 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm sm:text-base font-normal bg-transparent focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="absolute right-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 font-medium text-sm transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Evaluating...</span>
              </>
            ) : (
              <>
                <span>Inspect Rules</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Example Prompts */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Select an authoritative test question to verify state classification:</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {EXAMPLE_QUERIES.map((ex) => {
            const isSelected = question === ex.query;
            let badgeIcon = <CheckCircle2 className="w-3 h-3 text-emerald-500" />;
            let borderStyle = "hover:border-emerald-400/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20";
            if (ex.expectedState === "UNKNOWN") {
              badgeIcon = <HelpCircle className="w-3 h-3 text-amber-500" />;
              borderStyle = "hover:border-amber-400/50 hover:bg-amber-50/50 dark:hover:bg-amber-950/20";
            } else if (ex.expectedState === "CONTRADICTORY") {
              badgeIcon = <AlertTriangle className="w-3 h-3 text-rose-500" />;
              borderStyle = "hover:border-rose-400/50 hover:bg-rose-50/50 dark:hover:bg-rose-950/20";
            }

            return (
              <button
                key={ex.query}
                type="button"
                onClick={() => handleSelectExample(ex.query)}
                disabled={isLoading}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all text-left cursor-pointer disabled:cursor-not-allowed ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20"
                    : `border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 ${borderStyle}`
                }`}
              >
                {badgeIcon}
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  {ex.label}
                </span>
                <span className="hidden md:inline text-slate-400">
                  [{ex.expectedState}]
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
