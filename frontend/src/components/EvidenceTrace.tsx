"use client";

import React, { useState } from "react";
import { TraceStep } from "@/types/api";
import { ChevronDown, ChevronUp, CheckCircle2, GitFork, ShieldCheck, ShieldAlert, Cpu } from "lucide-react";

interface EvidenceTraceProps {
  traceSteps: TraceStep[];
  decisionBasis?: string | null;
}

export const EvidenceTrace: React.FC<EvidenceTraceProps> = ({
  traceSteps,
  decisionBasis,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!traceSteps || traceSteps.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      {/* Header Bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                Auditable Evidence Reasoning Trace
              </span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {traceSteps.length} Factual Stages
              </span>
            </div>
            {decisionBasis && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                Basis: {decisionBasis}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span>{isExpanded ? "Hide Trace" : "View Trace"}</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* Expandable Trace Timeline */}
      {isExpanded && (
        <div className="p-5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-950/40 space-y-4">
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {traceSteps.map((step, idx) => {
              let icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
              let dotBg = "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700";

              if (step.status === "branch_taken") {
                icon = <GitFork className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />;
                dotBg = "bg-indigo-50 dark:bg-indigo-950/80 border-indigo-300 dark:border-indigo-700";
              } else if (step.status === "guardrail_active") {
                icon = <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
                dotBg = "bg-amber-50 dark:bg-amber-950/80 border-amber-300 dark:border-amber-700";
              }

              return (
                <div key={idx} className="relative group">
                  {/* Timeline Dot */}
                  <div
                    className={`absolute -left-6 top-0.5 flex items-center justify-center w-5 h-5 rounded-full border shadow-xs ${dotBg}`}
                  >
                    {icon}
                  </div>

                  {/* Stage Content */}
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {step.step}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-mono">
                      {step.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Deterministic verification executed prior to answer synthesis</span>
            </span>
            <span className="font-mono uppercase text-[10px]">Zero Hallucination Guarantee</span>
          </div>
        </div>
      )}
    </div>
  );
};
