"use client";

import React, { useState } from "react";
import {
  BookOpen,
  FileText,
  Calendar,
  Scale,
  GraduationCap,
  ChevronRight,
  Search,
  X,
  ShieldCheck,
} from "lucide-react";

interface RegulationDirectoryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuery: (query: string) => void;
}

interface RegulationDoc {
  id: string;
  title: string;
  filename: string;
  format: "Markdown" | "Markdown Table" | "Official PDF";
  clauseRange: string;
  description: string;
  icon: React.ReactNode;
  sampleQueries: { label: string; query: string }[];
  keyTopics: string[];
}

const REGULATION_DOCS: RegulationDoc[] = [
  {
    id: "academic-regs",
    title: "University Academic Regulations 2025/26",
    filename: "academic_regulations.md",
    format: "Markdown",
    clauseRange: "§1.1 – §8.4",
    description:
      "Core statutory framework governing undergraduate and general academic affairs, course enrollment, grading scales, GPA requirements, and late withdrawal procedures.",
    icon: <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
    keyTopics: [
      "Minimum 2.0 GPA requirement",
      "Week 8 course drop deadline",
      "Dean's late withdrawal approval (§5.3)",
      "Incomplete grade expiration",
    ],
    sampleQueries: [
      {
        label: "Undergraduate GPA Requirement",
        query: "What is the minimum cumulative GPA required to remain in Good Academic Standing?",
      },
      {
        label: "Incomplete Grade Rules",
        query: "What happens to an Incomplete grade if not resolved within one semester?",
      },
    ],
  },
  {
    id: "graduate-policies",
    title: "Graduate Studies Policies & Procedures",
    filename: "graduate_policies.md",
    format: "Markdown",
    clauseRange: "§1.1 – §6.2",
    description:
      "Postgraduate academic standards, master's and doctoral progression, supervisory committees, and Graduate Studies Committee authority.",
    icon: <GraduationCap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
    keyTopics: [
      "Minimum 3.0 Graduate GPA",
      "Graduate Studies Committee approval (§2.6)",
      "16-week thesis extension (§5.4)",
      "Supervisory committee constitution",
    ],
    sampleQueries: [
      {
        label: "Graduate GPA Threshold",
        query: "What cumulative GPA must a graduate student maintain to remain in good standing?",
      },
      {
        label: "Graduate Withdrawal Authority (Conflict)",
        query: "Who approves a late course withdrawal?",
      },
    ],
  },
  {
    id: "fee-schedule",
    title: "Tuition, Mandatory Fees & Deadline Schedule",
    filename: "fee_schedule.md",
    format: "Markdown Table",
    clauseRange: "§1.0 – §4.2",
    description:
      "Official financial calendar, semester payment deadlines, instalment plans, penalty fee schedules, and tuition refund percentage brackets.",
    icon: <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
    keyTopics: [
      "Autumn balance due 15 September",
      "Spring balance due 15 January",
      "Summer session due 10 June",
      "$150 late fee & refund sliding scale",
    ],
    sampleQueries: [
      {
        label: "Autumn Payment Deadline",
        query: "When is the tuition payment deadline for the Autumn semester?",
      },
      {
        label: "Tuition Refund Percentage",
        query: "What is the refund percentage for tuition if withdrawing in Week 2?",
      },
    ],
  },
  {
    id: "appeals-code",
    title: "Academic Appeals & Student Conduct Code",
    filename: "appeals_and_conduct.md",
    format: "Markdown",
    clauseRange: "§1.1 – §5.4",
    description:
      "Due process standards, valid grounds for academic appeals, committee hearings, probation exit requirements, and academic misconduct sanctions.",
    icon: <Scale className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
    keyTopics: [
      "15-day filing deadline for appeals",
      "Probation exit requirement (§3.2 term GPA 2.3)",
      "Appeals Board procedures",
      "Academic integrity sanctions",
    ],
    sampleQueries: [
      {
        label: "Appeal Grounds",
        query: "What are the valid grounds for an academic appeal?",
      },
      {
        label: "Probation Exit GPA (Conflict)",
        query: "What GPA must an undergraduate student achieve to exit academic probation?",
      },
    ],
  },
  {
    id: "research-handbook",
    title: "Research Degrees Handbook (Official PDF)",
    filename: "research_degrees_handbook.pdf",
    format: "Official PDF",
    clauseRange: "Pages 1 – 6 (§1.0 – §8.4)",
    description:
      "Formal regulatory manual for PhD and MPhil candidates, doctoral supervisory standards, viva voce examination panels, and formal extension limits.",
    icon: <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
    keyTopics: [
      "Official PDF document with page numbers",
      "Six months formal extension limit (§8.3, p.5)",
      "Viva voce examination panel composition",
      "Independent external examiner requirements",
    ],
    sampleQueries: [
      {
        label: "Doctoral Examination Panel",
        query: "How many examiners must be on a PhD thesis examination panel?",
      },
      {
        label: "Thesis Extension Limit (Conflict)",
        query: "What is the maximum duration of a formal thesis submission extension for a research degree student?",
      },
    ],
  },
];

export const RegulationDirectory: React.FC<RegulationDirectoryProps> = ({
  isOpen,
  onClose,
  onSelectQuery,
}) => {
  const [filterText, setFilterText] = useState("");

  if (!isOpen) return null;

  const filteredDocs = REGULATION_DOCS.filter(
    (doc) =>
      doc.title.toLowerCase().includes(filterText.toLowerCase()) ||
      doc.description.toLowerCase().includes(filterText.toLowerCase()) ||
      doc.filename.toLowerCase().includes(filterText.toLowerCase()) ||
      doc.keyTopics.some((t) => t.toLowerCase().includes(filterText.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in-50 duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/80 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Office of the Academic Registrar • Official Corpus Directory</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              University Academic Regulations Repository
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              All 5 authoritative regulatory publications currently ingested, indexed, and deterministically verified by RuleLens.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close directory"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Filter Box */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter by regulation, section code (§), or topic (e.g., GPA, withdrawal, fee deadline, thesis)..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
            />
          </div>
        </div>

        {/* Documents List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-indigo-300 dark:hover:border-indigo-700/60 hover:shadow-md transition-all space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                    {doc.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                      {doc.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                      <span>{doc.filename}</span>
                      <span>•</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                        {doc.clauseRange}
                      </span>
                    </div>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                    doc.format === "Official PDF"
                      ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900"
                      : doc.format === "Markdown Table"
                      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900"
                      : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                  }`}
                >
                  {doc.format}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                {doc.description}
              </p>

              {/* Key topics covered */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {doc.keyTopics.map((topic, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  >
                    • {topic}
                  </span>
                ))}
              </div>

              {/* Sample Queries for quick testing */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-400">
                  Quick Query:
                </span>
                {doc.sampleQueries.map((sq, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      onSelectQuery(sq.query);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    <span>{sq.label}</span>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          ))}

          {filteredDocs.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              No regulations match &ldquo;{filterText}&rdquo;.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Total Ingested Words: 9,891 • 5 Distinct Documents</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium transition-colors cursor-pointer"
          >
            Close Directory
          </button>
        </div>
      </div>
    </div>
  );
};
