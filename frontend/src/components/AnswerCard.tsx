"use client";

import React, { useState } from "react";
import { Citation, QueryMetadata, QueryState } from "@/types/api";

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
          <div className="text-[11px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Verification Report
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-500 inline-block" />
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
        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 no-print">
          <button
            onClick={handleCopyFormalCitation}
            className="hover:text-slate-900 dark:hover:text-white transition-colors underline underline-offset-4 cursor-pointer"
          >
            {copiedFormal ? "Record copied to clipboard" : "Copy evidence record"}
          </button>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <button
            onClick={handlePrint}
            className="hover:text-slate-900 dark:hover:text-white transition-colors underline underline-offset-4 cursor-pointer"
          >
            Print record
          </button>
        </div>
      </div>

      {/* 2. THE MAIN VISUAL FOCUS: YOUR RESULT */}
      <div className="space-y-3">
        <div className="text-xs font-mono uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
          Your Result
        </div>
        <div className="text-lg sm:text-xl text-slate-900 dark:text-slate-50 leading-relaxed font-normal max-w-4xl">
          {answer.includes("LLM generation unavailable") && citations.length > 0 ? (
            <div className="space-y-3">
              <blockquote className="border-l-3 border-[#183b56] dark:border-sky-500 pl-4 text-base italic text-slate-800 dark:text-slate-200">
                &ldquo;{citations[0].passage_text}&rdquo;
              </blockquote>
            </div>
          ) : (
            renderFormattedAnswer(answer)
          )}
        </div>

        <div className="pt-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
          ✓ Verified against {citations.length} authoritative source publication passage{citations.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* 3. SUPPORTING PROVISIONS (Academic/Legal Reference Style) */}
      {citations.length > 0 && (
        <div className="space-y-5 pt-8 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-baseline justify-between">
            <div className="text-xs uppercase font-mono tracking-wider font-bold text-slate-700 dark:text-slate-300">
              Supporting Provisions ({citations.length})
            </div>
            <span className="text-xs text-slate-400 font-mono">Verbatim statutory text</span>
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
                      <span className="text-slate-500 dark:text-slate-400 ml-1.5 font-normal">
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

                <div className="text-[10px] font-mono text-slate-400 pt-0.5">
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
