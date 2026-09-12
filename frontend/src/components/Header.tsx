"use client";

import React, { useState } from "react";
import { BookOpen, Database, CheckCircle2, AlertCircle, ChevronDown, FileText } from "lucide-react";
import { CorpusStatus, HealthResponse } from "@/types/api";

interface HeaderProps {
  health: HealthResponse | null;
  corpusStatus: CorpusStatus | null;
  healthLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  corpusStatus,
  healthLoading,
}) => {
  const [showStatusModal, setShowStatusModal] = useState(false);

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-slate-100">
                RuleLens
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                v1.0
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Evidence-Grounded Academic Regulation Assistant
            </p>
          </div>
        </div>

        {/* Live Corpus & Index Status Pill */}
        <div className="flex items-center gap-2">
          {healthLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Checking corpus engine...</span>
            </div>
          ) : health?.index_ready ? (
            <button
              onClick={() => setShowStatusModal(!showStatusModal)}
              className="group flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 hover:border-emerald-500/60 transition-all cursor-pointer"
              title="Click to view loaded corpus details"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">Corpus Online:</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                {health.chunk_count} Chunks
              </span>
              <span className="text-slate-400">•</span>
              <span className="hidden md:inline text-slate-600 dark:text-slate-400">
                {health.claim_count} Policy Claims
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:translate-y-0.5 transition-transform" />
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 px-3 py-1.5 rounded-full border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Index Offline</span>
            </div>
          )}
        </div>
      </div>

      {/* Corpus Status Dropdown / Drawer */}
      {showStatusModal && corpusStatus && (
        <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-4 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Authoritative Corpus Inventory</span>
              </div>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium"
              >
                Close ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {corpusStatus.documents.map((doc) => (
                <div
                  key={doc.file}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 flex flex-col justify-between"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <FileText className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                        {doc.doc_title}
                      </h4>
                      <p className="text-[11px] font-mono text-slate-400">
                        {doc.file}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                    <span>{doc.chunks} passages</span>
                    {doc.claims > 0 && (
                      <span className="font-medium text-indigo-600 dark:text-indigo-400">
                        {doc.claims} rule claims
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Lexical BM25 (k1=1.5, b=0.75)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Semantic Embeddings (all-MiniLM-L6-v2, 384-dim)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Reciprocal Rank Fusion (k=60)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Deterministic Contradiction Engine</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
