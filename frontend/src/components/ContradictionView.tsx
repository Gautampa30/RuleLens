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

PROVISION 1:
- Source: ${pair.claim_a.source_file}${pair.claim_a.page_number ? `, Page ${pair.claim_a.page_number}` : ""}
- Section: ${pair.claim_a.section_path.join(" > ")}
- Mandated Rule: ${pair.claim_a.value} (${pair.claim_a.claim_type})
- Verbatim Text: "${pair.claim_a.passage_text}" [Chunk ID: ${pair.claim_a.chunk_id}]

PROVISION 2:
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
    <div className="space-y-10">
      {pairs.map((pair, idx) => (
        <div key={idx} className="space-y-8">
          {/* 1. Header: VERIFICATION RESULT · CONTRADICTORY */}
          <div className="flex flex-wrap items-baseline justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
            <div className="space-y-1">
              <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Verification Result
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-600 dark:bg-rose-500 inline-block" />
                <span className="text-sm font-semibold tracking-tight text-rose-800 dark:text-rose-400">
                  CONTRADICTORY
                </span>
                <span className="text-xs text-zinc-400">·</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Conflicting provisions detected in university statute
                </span>
              </div>
            </div>

            {/* Secondary Action Tool */}
            <button
              onClick={() => handleCopyConflictMemo(pair, idx)}
              className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors underline underline-offset-4 cursor-pointer no-print"
            >
              {copiedIndex === idx ? "Excerpt copied to clipboard" : "Copy comparison excerpt"}
            </button>
          </div>

          {/* 2. Headline & Why No Single Answer is Given */}
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-serif font-medium text-zinc-950 dark:text-zinc-50 tracking-tight">
                Conflicting provisions detected: {pair.policy_subject}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                RuleLens does not choose a winner when the supplied authorities disagree.
              </p>
            </div>

            <div className="pt-2">
              <div className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
                Why no single answer is given
              </div>
              <div className="text-base text-zinc-800 dark:text-zinc-200 leading-relaxed font-normal">
                {pair.explanation}
              </div>
            </div>
          </div>

          {/* 3. Side-by-Side Clean Comparison Layout */}
          <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="text-xs uppercase font-mono tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
              Competing Statutory Provisions
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
              {/* Provision 1 */}
              <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
                <div className="flex flex-wrap items-baseline justify-between text-xs text-zinc-500 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    Provision 1
                  </span>
                  <span className="font-mono text-[11px] text-zinc-400">
                    {pair.claim_a.source_file} {pair.claim_a.page_number ? `· p. ${pair.claim_a.page_number}` : ""}
                  </span>
                </div>

                <div className="text-xs text-zinc-500">
                  Section: <span className="font-medium text-zinc-700 dark:text-zinc-300">{pair.claim_a.section_path.join(" > ")}</span>
                </div>

                <div className="text-xs">
                  <span className="text-zinc-500">Mandated Rule:</span>{" "}
                  <span className="font-semibold text-rose-800 dark:text-rose-400 font-mono">
                    {pair.claim_a.value} {pair.claim_a.value_unit || ""}
                  </span>
                </div>

                <blockquote className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 font-serif italic pl-3 border-l-2 border-zinc-300 dark:border-zinc-700">
                  &ldquo;{pair.claim_a.passage_text}&rdquo;
                </blockquote>

                <div className="text-[10px] font-mono text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                  Chunk ID: {pair.claim_a.chunk_id}
                </div>
              </div>

              {/* Provision 2 */}
              <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
                <div className="flex flex-wrap items-baseline justify-between text-xs text-zinc-500 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    Provision 2
                  </span>
                  <span className="font-mono text-[11px] text-zinc-400">
                    {pair.claim_b.source_file} {pair.claim_b.page_number ? `· p. ${pair.claim_b.page_number}` : ""}
                  </span>
                </div>

                <div className="text-xs text-zinc-500">
                  Section: <span className="font-medium text-zinc-700 dark:text-zinc-300">{pair.claim_b.section_path.join(" > ")}</span>
                </div>

                <div className="text-xs">
                  <span className="text-zinc-500">Mandated Rule:</span>{" "}
                  <span className="font-semibold text-rose-800 dark:text-rose-400 font-mono">
                    {pair.claim_b.value} {pair.claim_b.value_unit || ""}
                  </span>
                </div>

                <blockquote className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 font-serif italic pl-3 border-l-2 border-zinc-300 dark:border-zinc-700">
                  &ldquo;{pair.claim_b.passage_text}&rdquo;
                </blockquote>

                <div className="text-[10px] font-mono text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
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
