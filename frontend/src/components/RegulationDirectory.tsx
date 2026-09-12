"use client";

import React, { useState } from "react";
import {
  Search,
  ExternalLink,
  X,
} from "lucide-react";

interface RegulationDirectoryProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSelectQuery: (query: string) => void;
  isInline?: boolean;
}

interface RegulationDoc {
  id: string;
  title: string;
  code: string;
  filename: string;
  format: "Markdown" | "Markdown Table" | "Official PDF";
  clauseRange: string;
  description: string;
  sampleQuery: string;
}

export const REGULATION_DOCS: RegulationDoc[] = [
  {
    id: "academic-regs",
    title: "Ashford University Academic Regulations",
    code: "AUR-2024-001",
    filename: "academic_regulations.md",
    format: "Markdown",
    clauseRange: "§1.1 – §8.4",
    description:
      "Statutory regulations governing student registration, grading system, academic probation, course withdrawal, and degree conferral.",
    sampleQuery: "What happens to an Incomplete grade if not resolved within one semester?",
  },
  {
    id: "graduate-policies",
    title: "Ashford University Graduate Studies Policy",
    code: "GSP-2024-002",
    filename: "graduate_policies.md",
    format: "Markdown",
    clauseRange: "§1.1 – §6.2",
    description:
      "Postgraduate academic requirements, thesis committee constitution, 16-week extension limits, and Graduate Studies Committee authority.",
    sampleQuery: "Who approves a late course withdrawal?",
  },
  {
    id: "fee-schedule",
    title: "Fee Schedule and Financial Obligations Policy",
    code: "FSP-2024-003",
    filename: "fee_schedule.md",
    format: "Markdown Table",
    clauseRange: "§1.0 – §4.2",
    description:
      "Statutory fee calendar, tuition payment deadlines (Autumn 15 Sept, Spring 15 Jan, Summer 10 June), $75 monthly late fee, and refund schedule.",
    sampleQuery: "When is the tuition payment deadline for the Autumn semester?",
  },
  {
    id: "appeals-code",
    title: "Appeals and Academic Conduct Policy",
    code: "AACP-2024-004",
    filename: "appeals_and_conduct.md",
    format: "Markdown",
    clauseRange: "§1.1 – §5.4",
    description:
      "Academic appeals procedures, Academic Appeals Panel composition, academic integrity standards, and probation exit requirements.",
    sampleQuery: "What are the valid grounds for an academic appeal?",
  },
  {
    id: "research-handbook",
    title: "Research Degrees Handbook",
    code: "RDH-2024-005",
    filename: "research_degrees_handbook.pdf",
    format: "Official PDF",
    clauseRange: "Pages 1 – 6 (§1.0 – §8.4)",
    description:
      "Practical procedural handbook for doctoral and MPhil researchers, supervisory responsibilities, and 6-month formal extension limit.",
    sampleQuery: "What is the maximum duration of a formal thesis submission extension for a research degree student?",
  },
];

export const RegulationDirectory: React.FC<RegulationDirectoryProps> = ({
  isOpen = true,
  onClose,
  onSelectQuery,
  isInline = false,
}) => {
  const [filterText, setFilterText] = useState("");

  if (!isOpen && !isInline) return null;

  const filteredDocs = REGULATION_DOCS.filter(
    (doc) =>
      doc.title.toLowerCase().includes(filterText.toLowerCase()) ||
      doc.description.toLowerCase().includes(filterText.toLowerCase()) ||
      doc.filename.toLowerCase().includes(filterText.toLowerCase()) ||
      doc.code.toLowerCase().includes(filterText.toLowerCase())
  );

  const content = (
    <div className="space-y-6">
      {/* Header / Filter Bar */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
            Regulation Library
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif text-slate-950 dark:text-slate-50 tracking-tight">
            Authoritative Repository
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            5 PUBLICATIONS · 9,891 INGESTED WORDS · ASHFORD UNIVERSITY STATUTES
          </p>
        </div>

        {/* Filter Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter publications..."
            className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111622] text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#183b56] dark:focus:border-sky-400"
          />
        </div>
      </div>

      {/* Institutional Table List with Explicit Column Headers */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#111622] shadow-xs">
        <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-slate-100/70 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
          <div className="col-span-5">Document Title & Code</div>
          <div className="col-span-2">Format</div>
          <div className="col-span-3">Provisions / Range</div>
          <div className="col-span-2 text-right">Action</div>
        </div>

        <div className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
          {filteredDocs.map((doc, index) => (
            <div
              key={doc.id}
              className={`p-5 grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center transition-colors ${
                index % 2 === 1 ? "bg-slate-50/40 dark:bg-[#0e131d]/40" : ""
              } hover:bg-slate-100/50 dark:hover:bg-slate-800/30`}
            >
              {/* Document Title & File */}
              <div className="md:col-span-5 space-y-1">
                <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  {doc.title}
                </div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <span>{doc.code}</span>
                  <span>·</span>
                  <span>{doc.filename}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 pt-0.5">
                  {doc.description}
                </p>
              </div>

              {/* Format */}
              <div className="md:col-span-2">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {doc.format}
                </span>
              </div>

              {/* Provisions Range */}
              <div className="md:col-span-3 text-xs font-mono text-slate-600 dark:text-slate-400">
                {doc.clauseRange}
              </div>

              {/* Action Button */}
              <div className="md:col-span-2 md:text-right pt-1 md:pt-0">
                <button
                  onClick={() => {
                    onSelectQuery(doc.sampleQuery);
                    if (onClose) onClose();
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#183b56] dark:text-sky-400 hover:underline underline-offset-4 cursor-pointer"
                >
                  <span>Test query</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}

          {filteredDocs.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400 font-mono">
              No regulation document matches &ldquo;{filterText}&rdquo;
            </div>
          )}
        </div>
      </div>

      <div className="pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
        <span>5 authoritative publications indexed · Grounded in codified corpus</span>
        {onClose && (
          <button
            onClick={onClose}
            className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white underline cursor-pointer"
          >
            Close Repository
          </button>
        )}
      </div>
    </div>
  );

  if (isInline) {
    return <section id="regulation-library" className="py-6">{content}</section>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#111622] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 space-y-6">
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {content}
      </div>
    </div>
  );
};
