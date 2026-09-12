"use client";

import React, { useState } from "react";
import { EvidenceChunk } from "@/types/api";
import { AlertTriangle, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";

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
          `  - ${c.source_file}${c.section_path?.length ? ` (${c.section_path.join(" > ")}` : ""}): "${c.text.slice(0, 120)}..."`
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
          <div className="text-[11px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">
            Verification Report
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600 dark:bg-amber-400 inline-block shadow-xs shadow-amber-500/50" />
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
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#A0A5B1] hover:text-slate-900 dark:hover:text-white transition-colors underline underline-offset-4 cursor-pointer no-print"
        >
          {copiedBrief ? <Check className="w-3.5 h-3.5 text-amber-500" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedBrief ? "Inquiry note copied" : "Copy inquiry note"}</span>
        </button>
      </div>

      {/* 2. Formal No Determination & Elevated Result Card */}
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-serif font-medium text-slate-950 dark:text-slate-50 tracking-tight">
            No authoritative rule found.
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#A0A5B1]">
            The supplied rulebook does not establish an answer to this question.
          </p>
        </div>

        {/* THE ELEVATED ANSWER CARD WITH AMBIENT AMBER GLOW */}
        <div className="relative group/answer pt-1">
          {/* Ambient amber radial glow */}
          <div
            className="absolute -inset-1.5 sm:-inset-2.5 rounded-3xl bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-yellow-500/20 dark:from-amber-500/25 dark:via-amber-400/15 dark:to-yellow-500/20 blur-xl sm:blur-2xl -z-10 pointer-events-none opacity-85 transition-opacity"
            aria-hidden="true"
          />

          {/* Elevated Glassmorphic Card */}
          <div className="relative rounded-xl sm:rounded-2xl border border-amber-500/25 dark:border-white/[0.08] bg-white/95 dark:bg-[#191d24]/85 backdrop-blur-md p-6 sm:p-8 lg:p-9 shadow-lg shadow-amber-950/5 dark:shadow-2xl dark:shadow-black/60 space-y-4 animate-in fade-in zoom-in-[0.98] duration-300">
            {/* Overline Label + Caution Icon */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/50">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-[11px] font-mono uppercase tracking-widest font-bold text-amber-800 dark:text-amber-300">
                  YOUR RESULT
                </span>
              </div>
              <span className="text-[11px] font-mono text-amber-700/80 dark:text-amber-400/80 hidden sm:inline-flex items-center gap-1">
                <span>Deterministic No Determination</span>
              </span>
            </div>

            {/* Primary Result Text: 22–24px, medium weight, clean sans-serif */}
            <div className="text-xl sm:text-2xl text-slate-900 dark:text-white leading-relaxed font-medium font-sans tracking-tight max-w-4xl">
              {answer || "The supplied university rulebook does not establish an answer to this question."}
            </div>

            {/* Subdued footer status */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-white/[0.06] text-xs font-mono text-slate-500 dark:text-[#A0A5B1]">
              <span>No matching statutory policy clause exists in corpus</span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">Zero Hallucination Guarantee</span>
            </div>
          </div>
        </div>

        {/* 3. Subdued Rationale: Why This Is Unknown */}
        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-1.5">
          <div className="text-[11px] font-mono uppercase tracking-wider font-semibold text-slate-500 dark:text-[#A0A5B1]">
            Why This Is Unknown
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-[#A0A5B1] leading-relaxed max-w-3xl">
            The supplied corpus was comprehensively searched using BM25 lexical scan and dense vector semantic retrieval. While related academic provisions were audited, none codify a governing policy for this specific situation. RuleLens will not infer or invent a policy beyond the verified corpus.
            {unknownReason && <span className="ml-1.5 font-mono text-slate-400 dark:text-slate-500">[{unknownReason}]</span>}
          </p>
        </div>
      </div>

      {/* 4. Compact Evidence Audit (10 related passages inspected) */}
      {relatedEvidence.length > 0 && (
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <button
            type="button"
            onClick={() => setShowRelated(!showRelated)}
            className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold text-slate-600 dark:text-[#A0A5B1] hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
          >
            <span>Evidence Audit · {relatedEvidence.length} related passages inspected</span>
            {showRelated ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showRelated && (
            <div className="space-y-3 pt-2 animate-in fade-in-50 duration-150">
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
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
                      <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">Chunk ID: {chunk.id}</span>
                    </div>
                    {chunk.section_path?.length > 0 && (
                      <div className="text-[11px] text-slate-500 dark:text-[#A0A5B1]">
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
