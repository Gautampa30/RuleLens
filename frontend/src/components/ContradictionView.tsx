"use client";

import React, { useState } from "react";
import { ContradictionPair } from "@/types/api";
import { GitCompare, Copy, Check } from "lucide-react";

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
              <div className="text-[11px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">
                Verification Report
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 dark:bg-rose-400 inline-block shadow-xs shadow-rose-500/50" />
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
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#A0A5B1] hover:text-slate-900 dark:hover:text-white transition-colors underline underline-offset-4 cursor-pointer no-print"
            >
              {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-rose-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedIndex === idx ? "Excerpt copied" : "Copy comparison excerpt"}</span>
            </button>
          </div>

          {/* 2. Headline & Elevated Answer Card */}
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-serif font-medium text-slate-950 dark:text-slate-50 tracking-tight">
                Conflicting provisions detected: {pair.policy_subject}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-[#A0A5B1]">
                RuleLens does not choose a winner when the supplied authorities disagree.
              </p>
            </div>

            {/* THE ELEVATED ANSWER CARD WITH AMBIENT CRIMSON/ROSE GLOW */}
            <div className="relative group/answer pt-1">
              {/* Ambient rose/crimson radial glow */}
              <div
                className="absolute -inset-1.5 sm:-inset-2.5 rounded-3xl bg-gradient-to-r from-rose-500/20 via-rose-600/10 to-red-500/20 dark:from-rose-500/25 dark:via-rose-600/15 dark:to-red-500/20 blur-xl sm:blur-2xl -z-10 pointer-events-none opacity-85 transition-opacity"
                aria-hidden="true"
              />

              {/* Elevated Glassmorphic Card */}
              <div className="relative rounded-xl sm:rounded-2xl border border-rose-500/25 dark:border-white/[0.08] bg-white/95 dark:bg-[#191d24]/85 backdrop-blur-md p-6 sm:p-8 lg:p-9 shadow-lg shadow-rose-950/5 dark:shadow-2xl dark:shadow-black/60 space-y-4 animate-in fade-in zoom-in-[0.98] duration-300">
                {/* Overline Label + Split/GitCompare Icon */}
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-800/50">
                    <GitCompare className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span className="text-[11px] font-mono uppercase tracking-widest font-bold text-rose-800 dark:text-rose-300">
                      YOUR RESULT
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-rose-700/80 dark:text-rose-400/80 hidden sm:inline-flex items-center gap-1">
                    <span>Incompatible Statutory Mandates</span>
                  </span>
                </div>

                {/* Main Conflict Result Text: 22–24px, medium weight, clean sans-serif */}
                <div className="text-xl sm:text-2xl text-slate-900 dark:text-white leading-relaxed font-medium font-sans tracking-tight max-w-4xl">
                  No single authoritative answer can be given because the supplied corpus contains incompatible provisions governing the same situation.
                </div>

                {/* Subdued footer conflict metadata */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-white/[0.06] text-xs font-mono text-slate-500 dark:text-[#A0A5B1]">
                  <span>Direct Discrepancy: {pair.conflict_type} contradiction</span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">Unresolved Statutory Discrepancy</span>
                </div>
              </div>
            </div>

            {/* 3. Subdued Explanation: Why No Single Answer Is Given */}
            <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-1.5">
              <div className="text-[11px] font-mono uppercase tracking-wider font-semibold text-slate-500 dark:text-[#A0A5B1]">
                Why No Single Answer Is Given
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-[#A0A5B1] leading-relaxed max-w-3xl">
                {pair.explanation}
              </p>
            </div>
          </div>

          {/* 4. Conflicting Provisions: Refined Two-Column Statutory Comparison */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="text-xs uppercase font-mono tracking-wider font-bold text-slate-600 dark:text-[#A0A5B1]">
              Conflicting Provisions
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
              {/* Provision 01 */}
              <div className="p-5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#141720]/80 backdrop-blur-xs space-y-3 shadow-xs">
                <div className="flex flex-wrap items-baseline justify-between text-xs text-slate-500 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                    PROVISION 01
                  </span>
                  <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {pair.claim_a.source_file} {pair.claim_a.page_number ? `· p. ${pair.claim_a.page_number}` : ""}
                  </span>
                </div>

                <div className="text-xs text-slate-500 dark:text-[#A0A5B1]">
                  Section: <span className="font-medium text-slate-800 dark:text-slate-200">{pair.claim_a.section_path.join(" > ")}</span>
                </div>

                <div className="text-xs bg-rose-50/60 dark:bg-rose-950/30 p-2.5 rounded-lg border border-rose-100 dark:border-rose-900/50">
                  <span className="text-slate-500 dark:text-slate-400">Mandated Rule:</span>{" "}
                  <span className="font-bold text-rose-800 dark:text-rose-300 font-mono">
                    {pair.claim_a.value} {pair.claim_a.value_unit || ""}
                  </span>
                </div>

                <blockquote className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 font-serif italic pl-3.5 border-l-2 border-rose-400 dark:border-rose-600 py-1">
                  &ldquo;{pair.claim_a.passage_text}&rdquo;
                </blockquote>

                <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                  Chunk ID: {pair.claim_a.chunk_id}
                </div>
              </div>

              {/* Provision 02 */}
              <div className="p-5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#141720]/80 backdrop-blur-xs space-y-3 shadow-xs">
                <div className="flex flex-wrap items-baseline justify-between text-xs text-slate-500 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                    PROVISION 02
                  </span>
                  <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {pair.claim_b.source_file} {pair.claim_b.page_number ? `· p. ${pair.claim_b.page_number}` : ""}
                  </span>
                </div>

                <div className="text-xs text-slate-500 dark:text-[#A0A5B1]">
                  Section: <span className="font-medium text-slate-800 dark:text-slate-200">{pair.claim_b.section_path.join(" > ")}</span>
                </div>

                <div className="text-xs bg-rose-50/60 dark:bg-rose-950/30 p-2.5 rounded-lg border border-rose-100 dark:border-rose-900/50">
                  <span className="text-slate-500 dark:text-slate-400">Mandated Rule:</span>{" "}
                  <span className="font-bold text-rose-800 dark:text-rose-300 font-mono">
                    {pair.claim_b.value} {pair.claim_b.value_unit || ""}
                  </span>
                </div>

                <blockquote className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 font-serif italic pl-3.5 border-l-2 border-rose-400 dark:border-rose-600 py-1">
                  &ldquo;{pair.claim_b.passage_text}&rdquo;
                </blockquote>

                <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800/60">
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
