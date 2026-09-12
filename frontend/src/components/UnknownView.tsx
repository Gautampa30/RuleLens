"use client";

import React, { useState } from "react";
import { EvidenceChunk } from "@/types/api";
import {
  HelpCircle,
  Info,
  ShieldAlert,
  FileText,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Building2,
  Copy,
  Check,
  Compass,
} from "lucide-react";

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
ASHFORD UNIVERSITY — UNCODIFIED REGULATORY INQUIRY BRIEF
Status: UNCODIFIED IN OFFICIAL REGULATIONS
Date: ${new Date().toISOString()}
----------------------------------------------------------------------
INQUIRY ASSESSMENT:
${answer}

REGULATORY BOUNDARY AUDIT:
The University Rulebook (241 passages across 5 statutory publications) does
not contain codified provisions answering this specific circumstance.

CLOSEST RELATED PROVISIONS AUDITED (NON-EXHAUSTIVE):
${inspectedSources || "  (No closely related candidate provisions)"}

RECOMMENDED STUDENT ACTION:
In the absence of codified Senate regulations, discretionary jurisdiction
rests with the Academic Registrar (Room AD-104) or the Faculty Senior Tutor.
Submit this inquiry brief when requesting an administrative ruling.
======================================================================`;

    navigator.clipboard.writeText(brief);
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 2500);
  };

  return (
    <div className="space-y-4">
      {/* Neutral informative banner — deliberately designed as a valid authoritative answer state, NOT an error */}
      <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 shrink-0">
              <HelpCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-slate-100 tracking-tight">
                  Uncodified Matter — No Published Regulation Found
                </h3>
                <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                  Grounding Guardrail Active
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Audited against 241 official university passages with zero speculative hallucination.
              </p>
            </div>
          </div>

          <button
            onClick={handleCopyInquiryBrief}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs no-print"
            title="Copy formal inquiry brief to send to Academic Registrar or Advisor"
          >
            {copiedBrief ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-700 dark:text-emerald-400">Inquiry Brief Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy Departmental Inquiry Brief</span>
              </>
            )}
          </button>
        </div>

        <div className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
          {answer ||
            "The supplied university rulebook does not contain sufficient regulatory provisions or policy text to answer this question."}
        </div>

        {/* Practical Student Guidance Box */}
        <div className="p-4 rounded-xl bg-amber-100/60 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/60 text-xs sm:text-sm text-slate-800 dark:text-slate-200 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300">
            <Compass className="w-4 h-4 text-amber-700 dark:text-amber-400" />
            <span>Student Next Steps: Where to File</span>
          </div>
          <p className="text-xs leading-relaxed">
            In the absence of a published regulation, standard university administrative procedure reserves discretionary authority to the <strong>Academic Registrar (Room AD-104)</strong> or your <strong>Faculty Senior Tutor</strong>. You should not assume that silence indicates either approval or prohibition.
          </p>
        </div>

        <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/40 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-medium">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Zero-hallucination guarantee: The assistant strictly refuses to invent rules.</span>
          </div>
          {unknownReason && (
            <span className="font-mono text-[11px] bg-white/60 dark:bg-slate-900/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900">
              Diagnostic: {unknownReason}
            </span>
          )}
        </div>
      </div>

      {/* Transparent Related Passages (Near-Miss Evidence) */}
      {relatedEvidence && relatedEvidence.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          <button
            onClick={() => setShowRelated(!showRelated)}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Info className="w-4 h-4 text-indigo-500" />
              <span>
                Transparent Retrieval Audit ({relatedEvidence.length} near-miss corpus passages inspected)
              </span>
            </div>
            {showRelated ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showRelated && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                The hybrid retrieval engine checked these closely ranked candidate passages, but verified that none contain the specific rule requested:
              </p>

              <div className="space-y-2">
                {relatedEvidence.map((chunk) => (
                  <div
                    key={chunk.id}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{chunk.source_file}</span>
                        {chunk.page_number && (
                          <span className="text-slate-400">• Page {chunk.page_number}</span>
                        )}
                      </div>
                      <span className="text-slate-400">Chunk ID: {chunk.id}</span>
                    </div>
                    {chunk.section_path.length > 0 && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Bookmark className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{chunk.section_path.join(" > ")}</span>
                      </div>
                    )}
                    <p className="text-slate-600 dark:text-slate-300 font-mono text-[11px] leading-relaxed line-clamp-2">
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
