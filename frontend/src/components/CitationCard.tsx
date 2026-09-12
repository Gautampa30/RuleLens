"use client";

import React, { useState } from "react";
import { Citation, EvidenceChunk } from "@/types/api";
import { FileText, Copy, Check, ChevronRight, Hash, Bookmark } from "lucide-react";

interface CitationCardProps {
  citation: Citation;
}

export const CitationCard: React.FC<CitationCardProps> = ({ citation }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(citation.passage_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPdf = citation.source_file.toLowerCase().endsWith(".pdf");

  return (
    <div
      id={`citation-${citation.index}`}
      className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700/60 transition-all p-4 space-y-3"
    >
      {/* Header Metadata */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-xs font-bold ring-1 ring-indigo-500/20">
            [{citation.index}]
          </span>
          <div className="flex flex-col">
            <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100 leading-tight">
              {citation.doc_title}
            </span>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              <span className="font-mono text-indigo-600 dark:text-indigo-400">
                {citation.source_file}
              </span>
              {citation.page_number && (
                <>
                  <span>•</span>
                  <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                    Page {citation.page_number}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Copy verbatim passage"
        >
          {copied ? (
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Section Breadcrumbs */}
      {citation.section_path && citation.section_path.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 px-2.5 py-1 rounded-md border border-slate-100 dark:border-slate-800">
          <Bookmark className="w-3 h-3 text-slate-400 mr-0.5 shrink-0" />
          {citation.section_path.map((sec, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />}
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {sec}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Verbatim Passage Box */}
      <div className="relative pl-3 border-l-2 border-indigo-400/60 dark:border-indigo-500/60 bg-slate-50/50 dark:bg-slate-900/40 p-3 rounded-r-lg">
        <p className="text-xs sm:text-sm leading-relaxed font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap select-text">
          {citation.passage_text}
        </p>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
        <span className="flex items-center gap-1">
          <Hash className="w-3 h-3 text-slate-400" />
          <span>Chunk ID: {citation.chunk_id}</span>
        </span>
        <span className="uppercase text-[9px] font-sans font-semibold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
          Verbatim Corpus Ground Truth
        </span>
      </div>
    </div>
  );
};
