"use client";

import React, { useState } from "react";
import { EvidenceChunk } from "@/types/api";
import { HelpCircle, Info, ShieldAlert, FileText, ChevronDown, ChevronUp, Bookmark } from "lucide-react";

interface UnknownViewProps {
  unknownReason?: string | null;
  relatedEvidence?: EvidenceChunk[];
  answer: string;
}

export const UnknownView: React.FC<UnknownViewProps> = ({
  unknownReason,
  relatedEvidence = [],
  answer,
}) => {
  const [showRelated, setShowRelated] = useState(false);

  return (
    <div className="space-y-4">
      {/* Neutral informative banner — deliberately designed as a valid authoritative answer state, NOT an error */}
      <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 shrink-0">
            <HelpCircle className="w-6 h-6" />
          </div>

          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 tracking-tight">
                No Authoritative Policy Found
              </h3>
              <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                Grounding Guardrail Active
              </span>
            </div>

            <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
              {answer ||
                "The supplied university rulebook does not contain sufficient regulatory provisions or policy text to answer this question."}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Zero hallucination policy: Unstated matters are never inferred</span>
              </div>
              {unknownReason && (
                <div className="flex items-center gap-1.5 font-mono text-[11px] bg-white/60 dark:bg-slate-900/60 px-2 py-0.5 rounded border border-amber-200/60 dark:border-amber-900/40">
                  <span>Engine Diagnostic: {unknownReason}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transparent Related Passages (Near-Miss Evidence) */}
      {relatedEvidence && relatedEvidence.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          <button
            onClick={() => setShowRelated(!showRelated)}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Info className="w-4 h-4 text-indigo-500" />
              <span>
                Transparent Retrieval Audit ({relatedEvidence.length} near-miss corpus passages inspected)
              </span>
            </div>
            {showRelated ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showRelated && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                The hybrid retrieval engine checked these closely ranked passages, but correctly determined none contain the specific rule requested:
              </p>

              <div className="space-y-2">
                {relatedEvidence.map((chunk) => (
                  <div
                    key={chunk.id}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{chunk.source_file}</span>
                        {chunk.page_number && (
                          <span className="text-slate-400">• p.{chunk.page_number}</span>
                        )}
                      </div>
                      <span className="text-slate-400">ID: {chunk.id}</span>
                    </div>
                    {chunk.section_path.length > 0 && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Bookmark className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{chunk.section_path.join(" > ")}</span>
                      </div>
                    )}
                    <p className="text-slate-600 dark:text-slate-300 font-mono text-[11px] leading-relaxed line-clamp-2">
                      {chunk.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
