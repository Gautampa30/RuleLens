"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, Database, CheckCircle2, AlertCircle, ChevronDown, FileText, Sun, Moon, ShieldCheck } from "lucide-react";
import { CorpusStatus, HealthResponse } from "@/types/api";

interface HeaderProps {
  health: HealthResponse | null;
  corpusStatus: CorpusStatus | null;
  healthLoading: boolean;
  onOpenDirectory?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  corpusStatus,
  healthLoading,
  onOpenDirectory,
}) => {
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("rulelens-theme") as "light" | "dark" | null;
      if (saved === "dark") {
        setTheme("dark");
        document.documentElement.classList.add("dark");
      } else {
        setTheme("light");
        document.documentElement.classList.remove("dark");
      }
    } catch (_) {}
  }, []);

  const toggleTheme = () => {
    try {
      if (theme === "light") {
        setTheme("dark");
        document.documentElement.classList.add("dark");
        localStorage.setItem("rulelens-theme", "dark");
      } else {
        setTheme("light");
        document.documentElement.classList.remove("dark");
        localStorage.setItem("rulelens-theme", "light");
      }
    } catch (_) {}
  };

  return (
    <header className="border-t-2 border-[#183b56] dark:border-sky-500 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#090b10]/95 backdrop-blur-md sticky top-0 z-30 transition-colors shadow-xs">
      {/* Upper Primary Tier */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand */}
        <div className="flex items-center gap-3.5 sm:gap-5">
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#183b56] dark:bg-sky-500 flex items-center justify-center text-white dark:text-slate-950 font-serif font-bold text-sm tracking-tight shadow-xs">
              RL
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-base tracking-tight text-slate-900 dark:text-slate-50 leading-tight">
                RuleLens
              </span>
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 leading-tight">
                Academic Policy Verification
              </span>
            </div>
          </a>
        </div>

        {/* Right Navigation & Status */}
        <div className="flex items-center gap-6 text-xs text-slate-600 dark:text-slate-300 font-medium">
          <nav className="hidden md:flex items-center gap-6">
            <a
              href="#query-section"
              className="hover:text-slate-950 dark:hover:text-white transition-colors"
            >
              Ask RuleLens
            </a>
            <a
              href="#decision-standards"
              className="hover:text-slate-950 dark:hover:text-white transition-colors"
            >
              How It Works
            </a>
            <a
              href="#regulation-library"
              className="hover:text-slate-950 dark:hover:text-white transition-colors"
            >
              Rulebook
            </a>
          </nav>

          {/* Subtle Trust Status Indicator */}
          {health?.index_ready ? (
            <button
              onClick={() => setShowStatusModal(!showStatusModal)}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer"
              title="Click to view loaded corpus inventory"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[11px]">Corpus verified · {health.chunk_count} chunks</span>
            </button>
          ) : healthLoading ? (
            <span className="hidden lg:inline text-slate-400 font-mono text-[11px]">Verifying corpus...</span>
          ) : null}

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={theme === "light" ? "Switch to Dark Theme" : "Switch to Light Theme"}
            aria-label="Toggle Theme"
          >
            {theme === "light" ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Secondary Institutional Sub-Strip */}
      <div className="border-t border-slate-200/70 dark:border-slate-800/70 bg-slate-100/70 dark:bg-[#0a0d14]/80 py-1.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-[11px] font-mono tracking-wider text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#183b56] dark:bg-sky-400" />
            <span className="font-semibold text-slate-900 dark:text-slate-200">ASHFORD UNIVERSITY</span>
            <span className="text-slate-400 dark:text-slate-600">·</span>
            <span>OFFICIAL REGULATION CORPUS (2024–2025)</span>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-[10px]">
            <span>HYBRID RETRIEVAL (BM25 + EMBEDDINGS)</span>
            <span>·</span>
            <span>DETERMINISTIC VERIFICATION</span>
          </div>
        </div>
      </div>

      {/* Corpus Status Dropdown / Drawer */}
      {showStatusModal && corpusStatus && (
        <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0e131d] px-4 sm:px-6 lg:px-8 py-5 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <Database className="w-4 h-4 text-[#183b56] dark:text-sky-400" />
                <span>Authoritative Corpus Inventory — Ashford University</span>
              </div>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium"
              >
                Close ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500 text-[11px] mb-1">Indexed Passages</div>
                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {corpusStatus.total_chunks} chunks
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-mono">✓ Statutory threshold met</div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500 text-[11px] mb-1">Policy Claims</div>
                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {corpusStatus.total_claims} claims
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-mono">Deterministic Rules</div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500 text-[11px] mb-1">Official Documents</div>
                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {corpusStatus.documents.length} publications
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-mono">Markdown + PDF</div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-slate-500 text-[11px] mb-1">Retrieval Engines</div>
                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {corpusStatus.bm25_ready && corpusStatus.embeddings_loaded ? "Operational" : "Initializing"}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-mono">BM25 + Dense Vectors</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
