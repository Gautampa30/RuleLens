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
    <div className="space-y-8">
      {/* 1. Header: VERIFICATION RESULT · UNKNOWN */}
      <div className="flex flex-wrap items-baseline justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="space-y-1">
          <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Verification Result
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-500 inline-block" />
            <span className="text-sm font-semibold tracking-tight text-amber-800 dark:text-amber-400">
              UNKNOWN
            </span>
            <span className="text-xs text-zinc-400">·</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              No authoritative rule found in university statute
            </span>
          </div>
        </div>

        {/* Secondary Action Tool */}
        <button
          onClick={handleCopyInquiryBrief}
          className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors underline underline-offset-4 cursor-pointer no-print"
        >
          {copiedBrief ? "Inquiry note copied" : "Copy inquiry note"}
        </button>
      </div>

      {/* 2. Formal No Determination & Your Answer */}
      <div className="space-y-4 pt-2">
        <div className="space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-serif font-medium text-zinc-950 dark:text-zinc-50 tracking-tight">
            No authoritative rule found.
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            The supplied rulebook does not establish an answer to this question.
          </p>
        </div>

        <div className="pt-2">
          <div className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
            Your Answer
          </div>
          <div className="text-base sm:text-lg text-zinc-800 dark:text-zinc-200 leading-relaxed font-normal">
            {answer ||
              "The supplied university rulebook does not establish a rule for this question."}
          </div>
        </div>

        {/* Why Unknown / Guardrail note */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
            RuleLens will not infer or invent a policy beyond the verified corpus.
            {unknownReason && <span className="ml-2 font-mono">[{unknownReason}]</span>}
          </p>
        </div>
      </div>

      {/* 3. Compact Expandable Near-Miss Candidate Passages Audit */}
      {relatedEvidence.length > 0 && (
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
          <button
            type="button"
            onClick={() => setShowRelated(!showRelated)}
            className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <span>Evidence audit · {relatedEvidence.length} related passages inspected</span>
            {showRelated ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showRelated && (
            <div className="space-y-3 pt-2 animate-in fade-in-50 duration-150">
              <p className="text-xs text-zinc-500 italic">
                The retrieval engine audited these closely related provisions, but deterministically verified that none establish an authoritative rule for the inquiry:
              </p>

              <div className="space-y-3">
                {relatedEvidence.map((chunk) => (
                  <div
                    key={chunk.id}
                    className="p-3.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-1.5 text-xs"
                  >
                    <div className="flex flex-wrap items-baseline justify-between text-zinc-500">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {chunk.source_file} {chunk.page_number ? `· p. ${chunk.page_number}` : ""}
                      </span>
                      <span className="font-mono text-[10px] text-zinc-400">ID: {chunk.id}</span>
                    </div>
                    {chunk.section_path?.length > 0 && (
                      <div className="text-[11px] text-zinc-400">
                        {chunk.section_path.join(" > ")}
                      </div>
                    )}
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 font-serif italic pl-3 border-l-2 border-zinc-300 dark:border-zinc-700">
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
