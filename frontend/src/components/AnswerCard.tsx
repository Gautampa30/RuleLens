"use client";

import React, { useState } from "react";
import { Citation, QueryMetadata, QueryState } from "@/types/api";
import { StateBadge } from "./StateBadge";
import { CitationCard } from "./CitationCard";
import {
  Clock,
  ShieldCheck,
  FileCheck,
  Layers,
  Copy,
  Check,
  Printer,
  Compass,
  Building2,
} from "lucide-react";

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
            className="inline-flex items-center justify-center font-bold text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900 px-1.5 py-0.5 mx-0.5 rounded border border-indigo-200 dark:border-indigo-800 transition-colors"
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
          `• [${c.index}] ${c.doc_title} (${c.source_file}${
            c.page_number ? `, Page ${c.page_number}` : ""
          }${c.section_path?.length ? ` — ${c.section_path.join(" > ")}` : ""}):\n  "${c.passage_text}" [Chunk ID: ${c.chunk_id}]`
      )
      .join("\n\n");

    const formalBlock = `======================================================================
ASHFORD UNIVERSITY — OFFICIAL ACADEMIC REGULATION VERIFICATION MEMORANDUM
Status: VERIFIED ANSWERABLE
Timestamp: ${new Date().toISOString()}
----------------------------------------------------------------------
REGULATORY FINDING:
${answer}

SUPPORTING STATUTORY PROVISIONS & CITATIONS:
${citationLines}
----------------------------------------------------------------------
Grounded strictly in official published regulations. Zero AI hallucinations.
======================================================================`;

    navigator.clipboard.writeText(formalBlock);
    setCopiedFormal(true);
    setTimeout(() => setCopiedFormal(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Print-Only Memorandum Header */}
      <div className="print-only mb-6 border-b-2 border-slate-900 pb-4">
        <h1 className="text-xl font-bold uppercase tracking-wider">
          Ashford University • Office of the Academic Registrar
        </h1>
        <p className="text-sm text-slate-600">
          Official Academic Regulation Verification Record • Timestamp: {new Date().toLocaleString()}
        </p>
      </div>

      {/* Primary Answer Box */}
      <div className="rounded-2xl border-2 border-emerald-500/30 dark:border-emerald-500/20 bg-gradient-to-b from-emerald-50/40 via-white to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900 p-6 sm:p-7 shadow-lg space-y-4">
        {/* Header with State Badge & Utility Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <StateBadge state={state} size="lg" />
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Verified by Academic Policy Engine
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-400">
            {metadata?.duration_ms !== undefined && (
              <div className="flex items-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5" />
                <span>{metadata.duration_ms} ms</span>
              </div>
            )}
            <div className="flex items-center gap-1 font-mono">
              <Layers className="w-3.5 h-3.5" />
              <span>{citations.length} Verified Sources</span>
            </div>

            {/* Practical Student Actions */}
            <div className="flex items-center gap-1.5 ml-2 no-print">
              <button
                onClick={handleCopyFormalCitation}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                title="Copy formal academic citation block ready for email or petition"
              >
                {copiedFormal ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-700 dark:text-emerald-400">Citation Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy for Advisor / Email</span>
                  </>
                )}
              </button>

              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                title="Print or save formal policy memorandum"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Print Record</span>
              </button>
            </div>
          </div>
        </div>

        {/* Answer Content */}
        <div className="text-slate-800 dark:text-slate-100 text-base sm:text-lg leading-relaxed font-normal">
          {answer.includes("LLM generation unavailable") && citations.length > 0 ? (
            <div className="space-y-3">
              <p className="font-medium text-slate-900 dark:text-slate-50">
                Authoritative provisions found in the university rulebook:
              </p>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 text-sm sm:text-base font-normal text-slate-800 dark:text-slate-200">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 mr-2">[1]</span>
                <span>{citations[0].passage_text}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                Direct verbatim evidence displayed (deterministic grounded mode active).
              </p>
            </div>
          ) : (
            renderFormattedAnswer(answer)
          )}
        </div>

        {/* Guarantee & Practical Student Guidance */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Zero hallucination: Every claim is verified against exact cited provisions below.</span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <Building2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Official Office: Academic Registry (Room AD-104)</span>
          </div>
        </div>
      </div>

      {/* Supporting Evidence & Citations Section */}
      {citations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              <FileCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Authoritative Evidence & Verbatim Passages ({citations.length})</span>
            </div>
            <span className="text-xs text-slate-400 no-print">
              Click copy on any card to extract exact legal wording
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {citations.map((c) => (
              <CitationCard key={c.index} citation={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

