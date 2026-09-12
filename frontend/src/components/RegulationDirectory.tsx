"use client";

import React, { useState } from "react";
import {
  FileText,
  Search,
  X,
  ExternalLink,
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Regulation Library
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            5 authoritative regulatory instruments indexed and verified by RuleLens.
          </p>
        </div>

        {/* Filter Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter documents..."
            className="pl-8 pr-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
          />
        </div>
      </div>

      {/* Institutional Table List */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200/80 dark:divide-zinc-800/80">
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            className="py-5 flex flex-col md:flex-row md:items-baseline justify-between gap-4 group"
          >
            {/* Left: Document Info */}
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                  {doc.title}
                </span>
                <span className="font-mono text-xs text-zinc-400">
                  ({doc.code})
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                  {doc.format}
                </span>
              </div>
              <div className="text-[11px] font-mono text-zinc-400">
                <span>File: {doc.filename}</span>
                <span className="mx-2">·</span>
                <span>Provisions: {doc.clauseRange}</span>
              </div>
            </div>

            {/* Right: Sample Query Action */}
            <div className="shrink-0 pt-1 md:pt-0">
              <button
                onClick={() => {
                  onSelectQuery(doc.sampleQuery);
                  if (onClose) onClose();
                }}
                className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 underline flex items-center gap-1 cursor-pointer"
              >
                <span>Test query</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}

        {filteredDocs.length === 0 && (
          <div className="py-8 text-center text-xs text-zinc-400">
            No regulation document matches &ldquo;{filterText}&rdquo;
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-mono">
        <span>Total Ingested Words: 9,891 · 5 Statutory Instruments</span>
        {onClose && (
          <button
            onClick={onClose}
            className="text-xs text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white underline cursor-pointer"
          >
            Close Directory
          </button>
        )}
      </div>
    </div>
  );

  if (isInline) {
    return <section id="regulation-library" className="py-12">{content}</section>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-xs">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 space-y-6">
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {content}
      </div>
    </div>
  );
};
