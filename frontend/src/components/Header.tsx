"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, Database, CheckCircle2, AlertCircle, ChevronDown, FileText, Sun, Moon } from "lucide-react";
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
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-stone-50/95 dark:bg-zinc-950/95 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand + Ashford University Institutional Presence */}
        <div className="flex items-center gap-3.5 sm:gap-4">
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-stone-50 dark:text-zinc-950 font-serif font-bold text-sm tracking-tight shadow-xs">
              RL
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-base tracking-tight text-zinc-950 dark:text-zinc-50 leading-tight">
                RuleLens
              </span>
              <span className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400 leading-tight">
                Academic Policy Verification
              </span>
            </div>
          </a>

          <div className="hidden sm:block h-6 w-[1px] bg-zinc-200 dark:bg-zinc-800" />

          {/* Prominent but Tasteful Ashford University Indicator */}
          <div className="hidden sm:flex flex-col">
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 tracking-wide font-sans">
              Ashford University
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
              Official Regulation Corpus
            </span>
          </div>
        </div>

        {/* Right Navigation & Status */}
        <div className="flex items-center gap-6 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
          <nav className="hidden md:flex items-center gap-6">
            <a
              href="#query-section"
              className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Ask RuleLens
            </a>
            <a
              href="#decision-standards"
              className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              How It Works
            </a>
            <a
              href="#regulation-library"
              className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Rulebook
            </a>
          </nav>

          {/* Subtle Corpus Status */}
          {health?.index_ready ? (
            <button
              onClick={() => setShowStatusModal(!showStatusModal)}
              className="hidden lg:flex items-center gap-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              title="Click to view loaded corpus inventory"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Corpus verified · {health.chunk_count} chunks</span>
            </button>
          ) : healthLoading ? (
            <span className="hidden lg:inline text-zinc-400">Verifying corpus...</span>
          ) : null}

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
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

      {/* Corpus Status Dropdown / Drawer */}
      {showStatusModal && corpusStatus && (
        <div className="border-t border-zinc-200 dark:border-zinc-800 bg-stone-50/98 dark:bg-zinc-950/98 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-5 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                <Database className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                <span>Authoritative Corpus Inventory — Ashford University</span>
              </div>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-medium"
              >
                Close ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="text-zinc-400 text-[11px] mb-1">Indexed Passages</div>
                <div className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                  {corpusStatus.total_chunks} chunks
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">✓ Statutory threshold met</div>
              </div>

              <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="text-zinc-400 text-[11px] mb-1">Policy Claims</div>
                <div className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                  {corpusStatus.total_claims} claims
                </div>
                <div className="text-[10px] text-zinc-500 mt-1">Deterministic Rules</div>
              </div>

              <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="text-zinc-400 text-[11px] mb-1">Document Count</div>
                <div className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                  {corpusStatus.documents.length} instruments
                </div>
                <div className="text-[10px] text-zinc-500 mt-1">Markdown + PDF</div>
              </div>

              <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="text-zinc-400 text-[11px] mb-1">Retrieval Engines</div>
                <div className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                  {corpusStatus.bm25_ready && corpusStatus.embeddings_loaded ? "Operational" : "Initializing"}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">BM25 + Dense Vectors</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
