"use client";

import React, { useState } from "react";
import { ContradictionPair } from "@/types/api";
import {
  AlertTriangle,
  GitCompare,
  FileText,
  Bookmark,
  Users,
  Scale,
  Copy,
  Check,
  ShieldAlert,
  ArrowRightLeft,
  GraduationCap,
} from "lucide-react";

interface ContradictionViewProps {
  pairs: ContradictionPair[];
}

export const ContradictionView: React.FC<ContradictionViewProps> = ({ pairs }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!pairs || pairs.length === 0) return null;

  const handleCopyConflictMemo = (pair: ContradictionPair, index: number) => {
    const memo = `======================================================================
ASHFORD UNIVERSITY — NOTICE OF REGULATORY CONFLICT & PETITION FOR DIRECTIVE
Subject: ${pair.policy_subject.toUpperCase()} (${pair.conflict_type.toUpperCase()} CONFLICT)
Date: ${new Date().toISOString()}
----------------------------------------------------------------------
CONTRADICTION SUMMARY:
${pair.explanation}

PROVISION 1:
- Source: ${pair.claim_a.source_file}${pair.claim_a.page_number ? `, Page ${pair.claim_a.page_number}` : ""}
- Section: ${pair.claim_a.section_path.join(" > ")}
- Mandate: ${pair.claim_a.value} (${pair.claim_a.claim_type})
- Verbatim Text: "${pair.claim_a.passage_text}" [Chunk ID: ${pair.claim_a.chunk_id}]

PROVISION 2:
- Source: ${pair.claim_b.source_file}${pair.claim_b.page_number ? `, Page ${pair.claim_b.page_number}` : ""}
- Section: ${pair.claim_b.section_path.join(" > ")}
- Mandate: ${pair.claim_b.value} (${pair.claim_b.claim_type})
- Verbatim Text: "${pair.claim_b.passage_text}" [Chunk ID: ${pair.claim_b.chunk_id}]

STUDENT ACTION ADVISORY:
In accordance with University Senate Administrative Protocol, students facing
irreconcilable regulatory directives must submit petition filings jointly to
both designated administrative authorities to prevent procedural deadlock.
======================================================================`;

    navigator.clipboard.writeText(memo);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  return (
    <div className="space-y-6">
      {pairs.map((pair, idx) => (
        <div
          key={idx}
          className="rounded-2xl border-2 border-rose-300 dark:border-rose-900/80 bg-rose-50/40 dark:bg-rose-950/20 shadow-lg overflow-hidden transition-all"
        >
          {/* Top Banner Alert */}
          <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-amber-900 px-6 py-5 text-white">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20">
                  <AlertTriangle className="w-5 h-5 text-rose-200 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                      Irreconcilable University Policy Conflict
                    </h3>
                    <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-black/30 text-rose-200 font-bold border border-rose-300/20">
                      {pair.conflict_type} conflict
                    </span>
                  </div>
                  <p className="text-xs text-rose-100 mt-0.5">
                    Regulatory Matter: <code className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-white">{pair.policy_subject}</code>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyConflictMemo(pair, idx)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 text-white transition-all cursor-pointer shadow-2xs no-print"
                  title="Copy formal conflict petition to submit to Academic Registrar"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Conflict Memo Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Formal Registry Memo</span>
                    </>
                  )}
                </button>

                <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/10 border border-white/20">
                  <Scale className="w-3.5 h-3.5" />
                  <span>Deterministic Audit</span>
                </div>
              </div>
            </div>

            {/* Conflict Explanation */}
            <div className="mt-4 pt-3 border-t border-white/20 text-xs sm:text-sm text-rose-50 leading-relaxed font-normal">
              {pair.explanation}
            </div>
          </div>

          {/* Student Protective Advisory Box */}
          <div className="mx-4 sm:mx-6 mt-5 p-4 rounded-xl border border-amber-300/80 dark:border-amber-800/80 bg-amber-50/90 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Student Protective Advisory: How to Proceed</span>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200">
              Because these two regulations mandate mutually incompatible procedures, <strong>do not rely on verbal approval from one administrator</strong>. When submitting an application or appeal on this matter, address your petition simultaneously to <strong>both designated authorities</strong>, explicitly citing both provisions below. Request a joint written determination to ensure your academic standing is legally protected.
            </p>
          </div>

          {/* Side-by-Side Comparison Container */}
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
              <GitCompare className="w-4 h-4" />
              <span>Direct Statutory Comparator</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Provision A */}
              <div className="rounded-xl border-2 border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900 p-4 sm:p-5 flex flex-col justify-between shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 px-3 py-1 bg-slate-100 dark:bg-slate-800 border-b border-l border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 rounded-bl-lg">
                  Provision 1 (Rulebook A)
                </div>

                <div className="space-y-3">
                  {/* File & Section info */}
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      <span className="font-mono">{pair.claim_a.source_file}</span>
                      {pair.claim_a.page_number && (
                        <span className="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                          Page {pair.claim_a.page_number}
                        </span>
                      )}
                    </div>
                    {pair.claim_a.section_path.length > 0 && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                        <Bookmark className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{pair.claim_a.section_path.join(" > ")}</span>
                      </p>
                    )}
                  </div>

                  {/* Mandate / Value Highlight */}
                  <div className="p-3 rounded-lg bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-rose-600 dark:text-rose-400 block mb-1">
                      Mandated Directive:
                    </span>
                    <p className="text-sm font-extrabold text-rose-950 dark:text-rose-200 font-mono">
                      {pair.claim_a.value} {pair.claim_a.value_unit || ""}
                    </p>
                    {pair.claim_a.affected_population && (
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>Scope: <span className="font-semibold">{pair.claim_a.affected_population}</span></span>
                      </div>
                    )}
                  </div>

                  {/* Verbatim Source Passage */}
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                      Verbatim Text from Source:
                    </span>
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 leading-relaxed max-h-48 overflow-y-auto">
                      &ldquo;{pair.claim_a.passage_text}&rdquo;
                    </div>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span>Chunk: {pair.claim_a.chunk_id}</span>
                  <span className="font-semibold text-rose-700 dark:text-rose-400">Conflict Branch A</span>
                </div>
              </div>

              {/* Provision B */}
              <div className="rounded-xl border-2 border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900 p-4 sm:p-5 flex flex-col justify-between shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 px-3 py-1 bg-slate-100 dark:bg-slate-800 border-b border-l border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 rounded-bl-lg">
                  Provision 2 (Rulebook B)
                </div>

                <div className="space-y-3">
                  {/* File & Section info */}
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      <span className="font-mono">{pair.claim_b.source_file}</span>
                      {pair.claim_b.page_number && (
                        <span className="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                          Page {pair.claim_b.page_number}
                        </span>
                      )}
                    </div>
                    {pair.claim_b.section_path.length > 0 && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                        <Bookmark className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{pair.claim_b.section_path.join(" > ")}</span>
                      </p>
                    )}
                  </div>

                  {/* Mandate / Value Highlight */}
                  <div className="p-3 rounded-lg bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-rose-600 dark:text-rose-400 block mb-1">
                      Mandated Directive:
                    </span>
                    <p className="text-sm font-extrabold text-rose-950 dark:text-rose-200 font-mono">
                      {pair.claim_b.value} {pair.claim_b.value_unit || ""}
                    </p>
                    {pair.claim_b.affected_population && (
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>Scope: <span className="font-semibold">{pair.claim_b.affected_population}</span></span>
                      </div>
                    )}
                  </div>

                  {/* Verbatim Source Passage */}
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                      Verbatim Text from Source:
                    </span>
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 leading-relaxed max-h-48 overflow-y-auto">
                      &ldquo;{pair.claim_b.passage_text}&rdquo;
                    </div>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span>Chunk: {pair.claim_b.chunk_id}</span>
                  <span className="font-semibold text-rose-700 dark:text-rose-400">Conflict Branch B</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

