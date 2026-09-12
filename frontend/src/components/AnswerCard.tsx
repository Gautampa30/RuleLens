"use client";

import React from "react";
import { Citation, QueryMetadata, QueryState } from "@/types/api";
import { StateBadge } from "./StateBadge";
import { CitationCard } from "./CitationCard";
import { Clock, ShieldCheck, FileCheck, Layers } from "lucide-react";

interface AnswerCardProps {
  state: QueryState;
  answer: string;
  citations: Citation[];
  metadata?: QueryMetadata;
}

export const AnswerCard: React.FC<AnswerCardProps> = ({
  state,
  answer,
  citations,
  metadata,
}) => {
  // Helper to format text with clickable citation links [1], [2] etc.
  const renderFormattedAnswer = (text: string) => {
    // Split by citation markers like [1], [2]
    const parts = text.split(/(\[\d+\])/g);
    return parts.map((part, index) => {
      const match = part.match(/\[(\d+)\]/);
      if (match) {
        const citationNum = match[1];
        return (
          <a
            key={index}
            href={`#citation-${citationNum}`}
            className="inline-flex items-center justify-center font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900 px-1.5 py-0.5 mx-0.5 rounded border border-indigo-200 dark:border-indigo-800 transition-colors"
          >
            [{citationNum}]
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="space-y-6">
      {/* Primary Answer Box */}
      <div className="rounded-2xl border-2 border-emerald-500/30 dark:border-emerald-500/20 bg-gradient-to-b from-emerald-50/40 via-white to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900 p-6 sm:p-7 shadow-lg space-y-4">
        {/* Header with State Badge & Performance Metrics */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <StateBadge state={state} size="lg" />
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Verified by Academic Policy Engine
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
            {metadata?.duration_ms !== undefined && (
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{metadata.duration_ms} ms</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              <span>{citations.length} Verified Sources</span>
            </div>
          </div>
        </div>

        {/* Answer Content */}
        <div className="text-slate-800 dark:text-slate-100 text-base sm:text-lg leading-relaxed font-normal">
          {answer.includes("LLM generation unavailable") && citations.length > 0 ? (
            <div className="space-y-3">
              <p className="font-medium text-slate-900 dark:text-slate-50">
                Authoritative provisions found in the university rulebook:
              </p>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 text-sm sm:text-base font-normal text-slate-800 dark:text-slate-200">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 mr-2">[1]</span>
                <span>{citations[0].passage_text}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                Direct verbatim evidence displayed (deterministic grounded mode active).
              </p>
            </div>
          ) : (
            renderFormattedAnswer(answer)
          )}
        </div>

        {/* Guarantee Banner */}
        <div className="pt-2 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>Every sentence is traceable to the authoritative cited corpus passages below.</span>
        </div>
      </div>

      {/* Supporting Evidence & Citations Section */}
      {citations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              <FileCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Authoritative Evidence & Citations ({citations.length})</span>
            </div>
            <span className="text-xs text-slate-400">
              Click any citation to verify verbatim wording
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {citations.map((c) => (
              <CitationCard key={c.index} citation={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
