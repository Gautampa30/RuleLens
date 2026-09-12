"use client";

import React, { useState } from "react";
import { EvidenceChunk } from "@/types/api";
import { ChevronDown, ChevronUp } from "lucide-react";

interface UnknownViewProps {
  unknownReason?: string | null;
  relatedEvidence?: EvidenceChunk[];
  answer: string;
}

export const UnknownView: React.FC<UnknownViewProps> = ({
  unknownReason,
  relatedEvidence = [],
  answer,
}) => {
  const [showRelated, setShowRelated] = useState(false);
  const [copiedBrief, setCopiedBrief] = useState(false);

  const handleCopyInquiryBrief = () => {
    const inspectedSources = relatedEvidence
      .slice(0, 3)
      .map(
        (c) =>
          `  - ${c.source_file}${c.section_path?.length ? ` (${c.section_path.join(" > ")})` : ""}: "${c.text.slice(0, 120)}..."`
      )
      .join("\n");

    const brief = `======================================================================
ASHFORD UNIVERSITY — UNCODIFIED REGULATORY INQUIRY RECORD
Status: UNKNOWN (NO AUTHORITATIVE RULE FOUND)
Timestamp: ${new Date().toISOString()}
----------------------------------------------------------------------
INQUIRY ASSESSMENT:
${answer}

REGULATORY BOUNDARY AUDIT:
The supplied academic regulations corpus does not contain codified provisions
establishing a governing rule for this question.

CANDIDATE PROVISIONS AUDITED (NON-EXHAUSTIVE):
${inspectedSources || "  (No closely related candidate provisions)"}
----------------------------------------------------------------------
Source: Verified university academic regulations corpus. Zero AI extrapolation.
======================================================================`;

    navigator.clipboard.writeText(brief);
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 2500);
  };

  return (
    <div className="space-y-10">
      {/* 1. Header: VERIFICATION REPORT · UNKNOWN */}
      <div className="flex flex-wrap items-baseline justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="text-[11px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Verification Report
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-500 inline-block" />
            <span className="text-sm font-bold tracking-tight text-amber-800 dark:text-amber-400">
              UNKNOWN
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-xs text-slate-600 dark:text-slate-400">
              No authoritative rule found in university statute
            </span>
          </div>
        </div>

        {/* Secondary Action Tool */}
        <button
          onClick={handleCopyInquiryBrief}
          className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors underline underline-offset-4 cursor-pointer no-print"
        >
          {copiedBrief ? "Inquiry note copied" : "Copy inquiry note"}
        </button>
      </div>

      {/* 2. Formal No Determination & Your Result */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-serif font-medium text-slate-950 dark:text-slate-50 tracking-tight">
            No authoritative rule found.
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            The supplied rulebook does not establish an answer to this question.
          </p>
        </div>

        <div className="pt-3">
          <div className="text-xs font-mono uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-2">
            Your Result
          </div>
          <div className="text-lg sm:text-xl text-slate-900 dark:text-slate-100 leading-relaxed font-normal max-w-4xl">
            {answer ||
              "The supplied university rulebook does not establish a rule for this question."}
          </div>
        </div>

        {/* Why This Is Unknown */}
        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-1.5">
          <div className="text-[11px] font-mono uppercase tracking-wider font-semibold text-slate-500">
            Why This Is Unknown
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
            The supplied corpus was comprehensively searched using BM25 lexical scan and dense vector semantic retrieval. While related academic provisions were audited, none codify a governing policy for this specific situation. RuleLens will not infer or invent a policy beyond the verified corpus.
            {unknownReason && <span className="ml-1.5 font-mono text-slate-400">[{unknownReason}]</span>}
          </p>
        </div>
      </div>

      {/* 3. Compact Evidence Audit (10 related passages inspected) */}
      {relatedEvidence.length > 0 && (
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <button
            type="button"
            onClick={() => setShowRelated(!showRelated)}
            className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
          >
            <span>Evidence Audit · {relatedEvidence.length} related passages inspected</span>
            {showRelated ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showRelated && (
            <div className="space-y-3 pt-2 animate-in fade-in-50 duration-150">
              <p className="text-xs text-slate-500 italic">
                The retrieval engine audited these closely related candidate provisions, but deterministically verified that none address the specific inquiry:
              </p>

              <div className="divide-y divide-slate-200/80 dark:divide-slate-800/80 border-t border-b border-slate-200/80 dark:border-slate-800/80">
                {relatedEvidence.map((chunk) => (
                  <div
                    key={chunk.id}
                    className="py-4 space-y-1.5 text-xs"
                  >
                    <div className="flex flex-wrap items-baseline justify-between text-slate-500">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {chunk.source_file} {chunk.page_number ? `· p. ${chunk.page_number}` : ""}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">Chunk ID: {chunk.id}</span>
                    </div>
                    {chunk.section_path?.length > 0 && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {chunk.section_path.join(" > ")}
                      </div>
                    )}
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-serif italic pl-3 border-l-2 border-slate-300 dark:border-slate-700 py-1">
                      &ldquo;{chunk.text}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
