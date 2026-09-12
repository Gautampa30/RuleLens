"use client";

import React, { useState } from "react";
import { ContradictionPair } from "@/types/api";

interface ContradictionViewProps {
  pairs: ContradictionPair[];
}

export const ContradictionView: React.FC<ContradictionViewProps> = ({ pairs }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!pairs || pairs.length === 0) return null;

  const handleCopyConflictMemo = (pair: ContradictionPair, index: number) => {
    const memo = `======================================================================
ASHFORD UNIVERSITY — STATUTORY CONFLICT COMPARISON REPORT
Subject: ${pair.policy_subject.toUpperCase()} (${pair.conflict_type.toUpperCase()} CONFLICT)
Timestamp: ${new Date().toISOString()}
----------------------------------------------------------------------
CONFLICT ASSESSMENT:
${pair.explanation}

PROVISION 01:
- Source: ${pair.claim_a.source_file}${pair.claim_a.page_number ? `, Page ${pair.claim_a.page_number}` : ""}
- Section: ${pair.claim_a.section_path.join(" > ")}
- Mandated Rule: ${pair.claim_a.value} (${pair.claim_a.claim_type})
- Verbatim Text: "${pair.claim_a.passage_text}" [Chunk ID: ${pair.claim_a.chunk_id}]

PROVISION 02:
- Source: ${pair.claim_b.source_file}${pair.claim_b.page_number ? `, Page ${pair.claim_b.page_number}` : ""}
- Section: ${pair.claim_b.section_path.join(" > ")}
- Mandated Rule: ${pair.claim_b.value} (${pair.claim_b.claim_type})
- Verbatim Text: "${pair.claim_b.passage_text}" [Chunk ID: ${pair.claim_b.chunk_id}]
----------------------------------------------------------------------
Source: Verified university academic regulations corpus.
RuleLens does not choose a winner when the supplied authorities disagree.
======================================================================`;

    navigator.clipboard.writeText(memo);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  return (
    <div className="space-y-12">
      {pairs.map((pair, idx) => (
        <div key={idx} className="space-y-8">
          {/* 1. Header: VERIFICATION REPORT · CONTRADICTORY */}
          <div className="flex flex-wrap items-baseline justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
            <div className="space-y-1">
              <div className="text-[11px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Verification Report
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-600 dark:bg-rose-500 inline-block" />
                <span className="text-sm font-bold tracking-tight text-rose-800 dark:text-rose-400">
                  CONTRADICTORY
                </span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  Conflicting provisions detected in university statute
                </span>
              </div>
            </div>

            {/* Secondary Action Tool */}
            <button
              onClick={() => handleCopyConflictMemo(pair, idx)}
              className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors underline underline-offset-4 cursor-pointer no-print"
            >
              {copiedIndex === idx ? "Excerpt copied to clipboard" : "Copy comparison excerpt"}
            </button>
          </div>

          {/* 2. Headline & Your Result */}
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-serif font-medium text-slate-950 dark:text-slate-50 tracking-tight">
                Conflicting provisions detected: {pair.policy_subject}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                RuleLens does not choose a winner when the supplied authorities disagree.
              </p>
            </div>

            <div className="pt-2">
              <div className="text-xs font-mono uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-2">
                Your Result
              </div>
              <div className="text-lg sm:text-xl text-slate-900 dark:text-slate-100 leading-relaxed font-normal max-w-4xl">
                No single authoritative answer can be given because the supplied corpus contains incompatible provisions governing the same situation.
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-1.5">
              <div className="text-[11px] font-mono uppercase tracking-wider font-semibold text-slate-500">
                Why No Single Answer Is Given
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
                {pair.explanation}
              </p>
            </div>
          </div>

          {/* 3. Conflicting Provisions: Refined Two-Column Statutory Comparison */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="text-xs uppercase font-mono tracking-wider font-bold text-slate-700 dark:text-slate-300">
              Conflicting Provisions
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
              {/* Provision 01 */}
              <div className="p-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111622] space-y-3 shadow-xs">
                <div className="flex flex-wrap items-baseline justify-between text-xs text-slate-500 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                    PROVISION 01
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">
                    {pair.claim_a.source_file} {pair.claim_a.page_number ? `· p. ${pair.claim_a.page_number}` : ""}
                  </span>
                </div>

                <div className="text-xs text-slate-500">
                  Section: <span className="font-medium text-slate-800 dark:text-slate-200">{pair.claim_a.section_path.join(" > ")}</span>
                </div>

                <div className="text-xs bg-rose-50/50 dark:bg-rose-950/20 p-2.5 rounded border border-rose-100 dark:border-rose-900/40">
                  <span className="text-slate-500">Mandated Rule:</span>{" "}
                  <span className="font-bold text-rose-800 dark:text-rose-300 font-mono">
                    {pair.claim_a.value} {pair.claim_a.value_unit || ""}
                  </span>
                </div>

                <blockquote className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 font-serif italic pl-3.5 border-l-2 border-rose-400 dark:border-rose-600 py-1">
                  &ldquo;{pair.claim_a.passage_text}&rdquo;
                </blockquote>

                <div className="text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                  Chunk ID: {pair.claim_a.chunk_id}
                </div>
              </div>

              {/* Provision 02 */}
              <div className="p-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111622] space-y-3 shadow-xs">
                <div className="flex flex-wrap items-baseline justify-between text-xs text-slate-500 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                    PROVISION 02
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">
                    {pair.claim_b.source_file} {pair.claim_b.page_number ? `· p. ${pair.claim_b.page_number}` : ""}
                  </span>
                </div>

                <div className="text-xs text-slate-500">
                  Section: <span className="font-medium text-slate-800 dark:text-slate-200">{pair.claim_b.section_path.join(" > ")}</span>
                </div>

                <div className="text-xs bg-rose-50/50 dark:bg-rose-950/20 p-2.5 rounded border border-rose-100 dark:border-rose-900/40">
                  <span className="text-slate-500">Mandated Rule:</span>{" "}
                  <span className="font-bold text-rose-800 dark:text-rose-300 font-mono">
                    {pair.claim_b.value} {pair.claim_b.value_unit || ""}
                  </span>
                </div>

                <blockquote className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 font-serif italic pl-3.5 border-l-2 border-rose-400 dark:border-rose-600 py-1">
                  &ldquo;{pair.claim_b.passage_text}&rdquo;
                </blockquote>

                <div className="text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                  Chunk ID: {pair.claim_b.chunk_id}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
