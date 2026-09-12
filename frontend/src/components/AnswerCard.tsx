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
            className="inline-flex items-center justify-center font-mono font-medium text-xs text-zinc-900 dark:text-zinc-100 bg-zinc-200/80 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 px-1.5 py-0.5 mx-0.5 rounded transition-colors"
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
    <div className="space-y-8">
      {/* Print-Only Memorandum Header */}
      <div className="print-only mb-8 border-b border-zinc-900 pb-4">
        <h1 className="text-xl font-bold uppercase tracking-wider">
          Ashford University · Academic Regulation Finding
        </h1>
        <p className="text-sm text-zinc-600">
          Grounded Policy Verification Record · Timestamp: {new Date().toLocaleString()}
        </p>
      </div>

      {/* 1. Header: VERIFICATION RESULT · ANSWERABLE */}
      <div className="flex flex-wrap items-baseline justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="space-y-1">
          <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Verification Result
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-500 inline-block" />
            <span className="text-sm font-semibold tracking-tight text-emerald-800 dark:text-emerald-400">
              ANSWERABLE
            </span>
            <span className="text-xs text-zinc-400">·</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Verified against {citations.length} authoritative source passage{citations.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* Secondary Action Tools */}
        <div className="flex items-center gap-4 text-xs text-zinc-500 no-print">
          <button
            onClick={handleCopyFormalCitation}
            className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors underline underline-offset-4 cursor-pointer"
          >
            {copiedFormal ? "Record copied to clipboard" : "Copy evidence record"}
          </button>
          <span className="text-zinc-300 dark:text-zinc-700">·</span>
          <button
            onClick={handlePrint}
            className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors underline underline-offset-4 cursor-pointer"
          >
            Print record
          </button>
        </div>
      </div>

      {/* 2. THE MAIN VISUAL FOCUS: YOUR ANSWER */}
      <div className="space-y-3 pt-2">
        <div className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Your Answer
        </div>
        <div className="text-lg sm:text-xl text-zinc-900 dark:text-zinc-100 leading-relaxed font-normal">
          {answer.includes("LLM generation unavailable") && citations.length > 0 ? (
            <div className="space-y-3">
              <blockquote className="border-l-2 border-zinc-400 dark:border-zinc-600 pl-4 text-base italic text-zinc-700 dark:text-zinc-300">
                &ldquo;{citations[0].passage_text}&rdquo;
              </blockquote>
            </div>
          ) : (
            renderFormattedAnswer(answer)
          )}
        </div>
      </div>

      {/* 3. SUPPORTING PROVISIONS (Citations below the answer) */}
      {citations.length > 0 && (
        <div className="space-y-4 pt-8 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-baseline justify-between">
            <div className="text-xs uppercase font-mono tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
              Supporting Provisions ({citations.length})
            </div>
            <span className="text-xs text-zinc-400 font-mono">Verbatim statutory text</span>
          </div>

          <div className="space-y-4">
            {citations.map((c) => (
              <div
                key={c.index}
                id={`citation-${c.index}`}
                className="p-4 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-2 text-xs"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-zinc-500">
                  <div className="font-medium text-zinc-900 dark:text-zinc-200">
                    <span className="font-mono mr-1.5 font-semibold">[{c.index}]</span>
                    <span className="font-semibold">{c.doc_title}</span>
                    {c.section_path?.length > 0 && (
                      <span className="text-zinc-400 dark:text-zinc-500 ml-1">
                        · {c.section_path.join(" > ")}
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[11px] text-zinc-400">
                    {c.source_file} {c.page_number ? `· p. ${c.page_number}` : ""}
                  </div>
                </div>

                <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 font-serif italic pl-3 border-l-2 border-zinc-300 dark:border-zinc-700">
                  &ldquo;{c.passage_text}&rdquo;
                </p>

                <div className="text-[10px] font-mono text-zinc-400 pt-1">
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
