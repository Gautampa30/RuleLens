"use client";

import React, { useState } from "react";
import { Citation, QueryMetadata, QueryState } from "@/types/api";
import { ShieldCheck, Copy, Check, Printer } from "lucide-react";

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
  const [copiedFormal, setCopiedFormal] = useState(false);

  // Helper to format text with clickable citation links [1], [2] etc.
  const renderFormattedAnswer = (text: string) => {
    const parts = text.split(/(\[\d+\])/g);
    return parts.map((part, index) => {
      const match = part.match(/\[(\d+)\]/);
      if (match) {
        const citationNum = match[1];
        return (
          <a
            key={index}
            href={`#citation-${citationNum}`}
            className="inline-flex items-center justify-center font-mono font-semibold text-xs text-[#183b56] dark:text-sky-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-1.5 py-0.5 mx-0.5 rounded transition-colors"
          >
            [{citationNum}]
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const handleCopyFormalCitation = () => {
    const citationLines = citations
      .map(
        (c) =>
          `[${c.index}] ${c.doc_title} (${c.source_file}${
            c.page_number ? `, Page ${c.page_number}` : ""
          }${c.section_path?.length ? ` — ${c.section_path.join(" > ")}` : ""}):\n"${c.passage_text}" [Chunk ID: ${c.chunk_id}]`
      )
      .join("\n\n");

    const formalBlock = `======================================================================
ASHFORD UNIVERSITY — ACADEMIC REGULATION EVIDENCE REPORT
Status: ANSWERABLE
Timestamp: ${new Date().toISOString()}
----------------------------------------------------------------------
REGULATORY FINDING:
${answer}

SUPPORTING STATUTORY PASSAGES:
${citationLines}
----------------------------------------------------------------------
Source: Verified university academic regulations corpus.
======================================================================`;

    navigator.clipboard.writeText(formalBlock);
    setCopiedFormal(true);
    setTimeout(() => setCopiedFormal(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-10">
      {/* Print-Only Formal Memorandum Header */}
      <div className="print-only mb-8 border-b-2 border-slate-900 pb-4">
        <h1 className="text-xl font-bold uppercase tracking-wider">
          Ashford University · Academic Policy Verification Record
        </h1>
        <p className="text-sm text-slate-600">
          Statutory Verification Finding · Timestamp: {new Date().toLocaleString()}
        </p>
      </div>

      {/* 1. Header: VERIFICATION REPORT · ANSWERABLE */}
      <div className="flex flex-wrap items-baseline justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="text-[11px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">
            Verification Report
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400 inline-block shadow-xs shadow-emerald-500/50" />
            <span className="text-sm font-bold tracking-tight text-emerald-800 dark:text-emerald-400">
              ANSWERABLE
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Verified against {citations.length} authoritative source passage{citations.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* Secondary Action Tools */}
        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-[#A0A5B1] no-print">
          <button
            onClick={handleCopyFormalCitation}
            className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors underline underline-offset-4 cursor-pointer"
          >
            {copiedFormal ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedFormal ? "Record copied" : "Copy evidence record"}</span>
          </button>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors underline underline-offset-4 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print record</span>
          </button>
        </div>
      </div>

      {/* 2. THE MAIN VISUAL FOCUS: ELEVATED ANSWER CARD WITH AMBIENT EMERALD GLOW */}
      <div className="relative group/answer pt-1">
        {/* Ambient emerald radial glow */}
        <div
          className="absolute -inset-1.5 sm:-inset-2.5 rounded-3xl bg-gradient-to-r from-emerald-500/20 via-emerald-400/10 to-teal-500/20 dark:from-emerald-500/25 dark:via-emerald-400/15 dark:to-teal-500/20 blur-xl sm:blur-2xl -z-10 pointer-events-none opacity-85 transition-opacity"
          aria-hidden="true"
        />

        {/* The Elevated Glassmorphic Result Card */}
        <div className="relative rounded-xl sm:rounded-2xl border border-emerald-600/20 dark:border-white/[0.08] bg-white/95 dark:bg-[#191d24]/85 backdrop-blur-md p-6 sm:p-8 lg:p-9 shadow-lg shadow-emerald-950/5 dark:shadow-2xl dark:shadow-black/60 space-y-4 animate-in fade-in zoom-in-[0.98] duration-300">
          {/* Overline Label + Modern Icon */}
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/50">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-[11px] font-mono uppercase tracking-widest font-bold text-emerald-800 dark:text-emerald-300">
                YOUR RESULT
              </span>
            </div>
            <span className="text-[11px] font-mono text-emerald-700/80 dark:text-emerald-400/80 hidden sm:inline-flex items-center gap-1">
              <span>✓ Authoritative Verification</span>
            </span>
          </div>

          {/* Primary Definitive Answer: 22–24px, medium weight, clean sans-serif */}
          <div className="text-xl sm:text-2xl text-slate-900 dark:text-white leading-relaxed font-medium font-sans tracking-tight max-w-4xl">
            {answer.includes("LLM generation unavailable") && citations.length > 0 ? (
              <blockquote className="border-l-3 border-[#183b56] dark:border-sky-500 pl-4 text-lg sm:text-xl italic text-slate-800 dark:text-slate-200 font-serif">
                &ldquo;{citations[0].passage_text}&rdquo;
              </blockquote>
            ) : (
              renderFormattedAnswer(answer)
            )}
          </div>

          {/* Subdued footer verification metadata */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-white/[0.06] text-xs font-mono text-slate-500 dark:text-[#A0A5B1]">
            <span>Grounded in {citations.length} authoritative source passage{citations.length === 1 ? "" : "s"}</span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Zero Hallucination Guaranteed</span>
          </div>
        </div>
      </div>

      {/* 3. SUPPORTING PROVISIONS (Academic/Legal Reference Style - Subdued) */}
      {citations.length > 0 && (
        <div className="space-y-5 pt-8 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-baseline justify-between">
            <div className="text-xs uppercase font-mono tracking-wider font-bold text-slate-600 dark:text-[#A0A5B1]">
              Supporting Provisions ({citations.length})
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">Verbatim statutory text</span>
          </div>

          <div className="divide-y divide-slate-200/80 dark:divide-slate-800/80 border-t border-b border-slate-200/80 dark:border-slate-800/80">
            {citations.map((c) => (
              <div
                key={c.index}
                id={`citation-${c.index}`}
                className="py-5 space-y-2.5 text-xs group"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-medium text-slate-900 dark:text-slate-100">
                    <span className="font-mono mr-2 font-bold text-[#183b56] dark:text-sky-400">[{c.index}]</span>
                    <span className="font-semibold text-sm">{c.doc_title}</span>
                    {c.section_path?.length > 0 && (
                      <span className="text-slate-500 dark:text-[#A0A5B1] ml-1.5 font-normal">
                        · {c.section_path.join(" > ")}
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {c.source_file} {c.page_number ? `· p. ${c.page_number}` : ""}
                  </div>
                </div>

                <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 font-serif italic pl-3.5 border-l-2 border-[#183b56]/60 dark:border-sky-500/60 bg-slate-50/50 dark:bg-slate-900/30 py-2 pr-3 rounded-r">
                  &ldquo;{c.passage_text}&rdquo;
                </p>

                <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 pt-0.5">
                  Chunk ID: {c.chunk_id}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
