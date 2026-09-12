"use client";

import React, { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { QueryInput } from "@/components/QueryInput";
import { AnswerCard } from "@/components/AnswerCard";
import { ContradictionView } from "@/components/ContradictionView";
import { UnknownView } from "@/components/UnknownView";
import { EvidenceTrace } from "@/components/EvidenceTrace";
import { StateBadge } from "@/components/StateBadge";
import {
  checkBackendHealth,
  fetchCorpusStatus,
  queryRuleLens,
  ApiError,
} from "@/lib/api";
import {
  CorpusStatus,
  HealthResponse,
  QueryResponse,
  QueryState,
} from "@/types/api";
import {
  BookOpen,
  CheckCircle2,
  HelpCircle,
  AlertTriangle,
  RefreshCw,
  AlertOctagon,
  ShieldCheck,
  Search,
} from "lucide-react";

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [corpusStatus, setCorpusStatus] = useState<CorpusStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  const [currentQuery, setCurrentQuery] = useState("");
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load backend status on mount
  useEffect(() => {
    let mounted = true;
    async function loadStatus() {
      try {
        setHealthLoading(true);
        const [h, cs] = await Promise.allSettled([
          checkBackendHealth(),
          fetchCorpusStatus(),
        ]);
        if (!mounted) return;
        if (h.status === "fulfilled") setHealth(h.value);
        if (cs.status === "fulfilled") setCorpusStatus(cs.value);
      } catch (err) {
        console.error("Health check error:", err);
      } finally {
        if (mounted) setHealthLoading(false);
      }
    }
    loadStatus();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSearch = async (question: string) => {
    setCurrentQuery(question);
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const data = await queryRuleLens(question);
      setResponse(data);
    } catch (err: unknown) {
      console.error("Query failed:", err);
      if (err instanceof ApiError) {
        setError(`API Error (${err.status}): ${err.message}`);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred while communicating with the backend.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      <Header
        health={health}
        corpusStatus={corpusStatus}
        healthLoading={healthLoading}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Intro / Hero section */}
        <section className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Deterministic Three-State Verification Architecture</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            Authoritative Academic Regulations Assistant
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
            Query university policy with zero hallucinations. Every answer is deterministically verified and grounded strictly in verbatim corpus provisions, classifying each query into exactly one of three states.
          </p>
        </section>

        {/* Query Input Box */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <QueryInput onSearch={handleSearch} isLoading={isLoading} />
        </section>

        {/* Evaluation / Results Container */}
        {isLoading && (
          <section className="py-12 flex flex-col items-center justify-center space-y-4 text-center animate-pulse">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-base">
                Evaluating Question Over Regulation Corpus...
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Executing BM25 lexical search • Dense vector semantic retrieval • Reciprocal Rank Fusion • Deterministic Contradiction Engine
              </p>
            </div>
          </section>
        )}

        {error && (
          <section className="p-4 rounded-2xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 flex items-start gap-3">
            <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <h4 className="font-bold text-sm">Query Execution Error</h4>
              <p className="text-xs">{error}</p>
              <button
                onClick={() => currentQuery && handleSearch(currentQuery)}
                className="mt-2 text-xs font-semibold text-rose-700 dark:text-rose-300 underline hover:no-underline cursor-pointer"
              >
                Retry Query
              </button>
            </div>
          </section>
        )}

        {response && !isLoading && (
          <section className="space-y-8 animate-in fade-in-50 duration-300">
            {/* Answerable State View */}
            {response.state === "ANSWERABLE" && (
              <AnswerCard
                state={response.state}
                answer={response.answer}
                citations={response.citations}
                metadata={response.metadata}
              />
            )}

            {/* Unknown State View */}
            {response.state === "UNKNOWN" && (
              <div className="space-y-6">
                <UnknownView
                  unknownReason={response.unknown_reason}
                  relatedEvidence={response.related_evidence}
                  answer={response.answer}
                />
              </div>
            )}

            {/* Contradictory State View */}
            {response.state === "CONTRADICTORY" && (
              <div className="space-y-6">
                <ContradictionView pairs={response.contradiction_pairs} />

                {/* Additional Answer / Summary if present */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Assistant Conflict Assessment
                    </span>
                    <StateBadge state="CONTRADICTORY" size="sm" />
                  </div>
                  <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                    {response.answer}
                  </p>
                </div>
              </div>
            )}

            {/* Evidence Trace Audit Trail */}
            <EvidenceTrace
              traceSteps={response.trace_steps || []}
              decisionBasis={response.decision_basis}
            />
          </section>
        )}

        {/* Empty State / Three States Architecture Guide */}
        {!response && !isLoading && !error && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
            <div className="p-5 rounded-2xl border border-emerald-200/60 dark:border-emerald-950 bg-emerald-50/30 dark:bg-emerald-950/10 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-sm text-emerald-900 dark:text-emerald-300">
                  1. ANSWERABLE
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                When clear, unambiguous regulatory provisions exist. Returns precise answers with verbatim citations, document source, section breadcrumb, and page number.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-amber-200/60 dark:border-amber-950 bg-amber-50/30 dark:bg-amber-950/10 space-y-2">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 className="font-bold text-sm text-amber-900 dark:text-amber-300">
                  2. UNKNOWN
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                When the policy manual does not state a rule. Guaranteed zero hallucination: explicitly refuses to extrapolate or invent uncodified rules.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-rose-200/60 dark:border-rose-950 bg-rose-50/30 dark:bg-rose-950/10 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                <h3 className="font-bold text-sm text-rose-900 dark:text-rose-300">
                  3. CONTRADICTORY
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                When multiple official provisions mandate conflicting rules for the same situation. Surfaces both passages side-by-side without guessing.
              </p>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 py-6 text-center text-xs text-slate-400 font-medium">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-slate-600 dark:text-slate-300 font-semibold">RuleLens</span>
            <span>— Academic Regulation Assistant</span>
          </div>
          <div>
            <span>Hybrid Retrieval • BM25 + Dense Vectors • Deterministic State Engine</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
