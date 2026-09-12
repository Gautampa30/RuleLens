"use client";

import React, { useState } from "react";
import { TraceStep } from "@/types/api";
import { ChevronDown, ChevronUp } from "lucide-react";

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
    <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
      >
        <span>Audit details · {isExpanded ? "Hide" : "Review"} verification trace ({traceSteps.length} steps)</span>
        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {isExpanded && (
        <div className="space-y-4 pt-2 animate-in fade-in-50 duration-150 text-xs">
          <div className="space-y-1">
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 uppercase font-mono tracking-wider text-[11px]">
              How This Decision Was Verified
            </h4>
            {decisionBasis && (
              <p className="text-zinc-500 italic">
                Decision basis: {decisionBasis}
              </p>
            )}
          </div>

          <div className="space-y-3 pl-3 border-l border-zinc-200 dark:border-zinc-800">
            {traceSteps.map((step, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[11px] text-zinc-400">0{idx + 1}.</span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{step.step}</span>
                  <span className={`text-[10px] font-mono uppercase tracking-wider ml-auto ${
                    step.status === "guardrail_active"
                      ? "text-amber-600 dark:text-amber-400"
                      : step.status === "branch_taken"
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-zinc-400"
                  }`}>
                    {step.status}
                  </span>
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 text-[11px] pl-5 leading-relaxed">
                  {step.detail}
                </p>
              </div>
            ))}
          </div>

          <div className="text-[11px] text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 font-mono">
            Deterministic state engine evaluated prior to answer articulation.
          </div>
        </div>
      )}
    </div>
  );
};
