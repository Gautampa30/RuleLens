"use client";

import React, { useEffect, useState, useRef } from "react";
import { Header } from "@/components/Header";
import { QueryInput } from "@/components/QueryInput";
import { AnswerCard } from "@/components/AnswerCard";
import { ContradictionView } from "@/components/ContradictionView";
import { UnknownView } from "@/components/UnknownView";
import { EvidenceTrace } from "@/components/EvidenceTrace";
import { RegulationDirectory } from "@/components/RegulationDirectory";
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
} from "@/types/api";
import {
  CheckCircle2,
  HelpCircle,
  AlertTriangle,
  RefreshCw,
  AlertOctagon,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [corpusStatus, setCorpusStatus] = useState<CorpusStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  const [currentQuery, setCurrentQuery] = useState("");
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resultsRef = useRef<HTMLDivElement>(null);

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

    // Scroll to results area smoothly
    setTimeout(() => {
      if (resultsRef.current) {
        resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);

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
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors antialiased selection:bg-zinc-200 dark:selection:bg-zinc-800">
      {/* 01 — Restrained Header with Prominent Ashford University Presence */}
      <Header
        health={health}
        corpusStatus={corpusStatus}
        healthLoading={healthLoading}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-24 sm:space-y-32">
        {/* 02 — Editorial Hero & Query Section */}
        <section id="query-section" className="space-y-10 sm:space-y-12">
          <div className="space-y-4 max-w-3xl">
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-600" />
              <span>Ashford University · Academic Regulations 2024–2025</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif tracking-tight text-zinc-950 dark:text-zinc-50 leading-[1.12]">
              Know what the rulebook actually says.
            </h1>

            <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              RuleLens verifies academic policies against the codified university statute. Every response is grounded in retrieved clauses, backed by exact statutory citations, and protected by deterministic contradiction detection.
            </p>
          </div>

          {/* Search Bar Component */}
          <div className="pt-2">
            <QueryInput onSearch={handleSearch} isLoading={isLoading} />
          </div>
        </section>

        {/* 03 — Dedicated Verification Report Surface */}
        <div ref={resultsRef} className="scroll-mt-24">
          {isLoading && (
            <section className="py-20 flex flex-col items-center justify-center space-y-4 text-center rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/80 dark:border-zinc-800/80">
              <RefreshCw className="w-6 h-6 text-zinc-400 animate-spin" />
              <div className="space-y-1">
                <h3 className="font-serif text-lg text-zinc-800 dark:text-zinc-200">
                  Verifying Against Codified Corpus…
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                  Ashford University Academic Regulations · BM25 + Dense Semantic Scan · Contradiction Analysis
                </p>
              </div>
            </section>
          )}

          {error && (
            <section className="p-6 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200 flex items-start gap-4">
              <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <h4 className="font-semibold text-sm">System Verification Error</h4>
                <p className="text-xs leading-relaxed text-rose-800 dark:text-rose-300">{error}</p>
                <button
                  onClick={() => currentQuery && handleSearch(currentQuery)}
                  className="text-xs font-medium underline underline-offset-4 hover:text-rose-950 dark:hover:text-rose-100 cursor-pointer"
                >
                  Retry verification
                </button>
              </div>
            </section>
          )}

          {response && !isLoading && (
            <section className="relative rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/90 p-6 sm:p-10 lg:p-12 space-y-10 shadow-xs">
              {/* Question Header Recap */}
              <div className="space-y-1 pb-6 border-b border-zinc-200/80 dark:border-zinc-800">
                <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                  Evaluated Student Inquiry
                </div>
                <h2 className="text-xl sm:text-2xl font-serif text-zinc-950 dark:text-zinc-50 font-normal">
                  &ldquo;{currentQuery}&rdquo;
                </h2>
              </div>

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
                <UnknownView
                  unknownReason={response.unknown_reason}
                  relatedEvidence={response.related_evidence}
                  answer={response.answer}
                />
              )}

              {/* Contradictory State View */}
              {response.state === "CONTRADICTORY" && (
                <div className="space-y-8">
                  <ContradictionView pairs={response.contradiction_pairs} />

                  {/* Summary commentary */}
                  {response.answer && (
                    <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
                      <div className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        Statutory Conflict Summary
                      </div>
                      <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 font-normal">
                        {response.answer}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Evidence Trace Audit Trail */}
              <EvidenceTrace
                traceSteps={response.trace_steps || []}
                decisionBasis={response.decision_basis}
              />
            </section>
          )}
        </div>

        {/* 04 — The Three-State Standard */}
        <section id="decision-standards" className="space-y-12 pt-8 border-t border-zinc-200 dark:border-zinc-800">
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              System Architecture
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif tracking-tight text-zinc-950 dark:text-zinc-50">
              The Three-State Standard
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              Most AI assistants produce plausible-sounding prose even when rules do not exist or directly conflict. RuleLens enforces an auditable, deterministic contract with exactly three valid outcomes:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-6">
            {/* 1. Answerable */}
            <div
              onClick={() => handleSearch("When is the tuition payment deadline?")}
              className="group p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all cursor-pointer space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-serif font-medium text-base text-zinc-900 dark:text-zinc-100">
                    Answerable
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Codified rules directly govern the situation. Answers are synthesized strictly from retrieved passages with verbatim citations, clause references, and page numbers.
              </p>
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                <span className="text-[11px] font-mono text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors">
                  &ldquo;When is tuition payment due?&rdquo; →
                </span>
              </div>
            </div>

            {/* 2. Unknown */}
            <div
              onClick={() => handleSearch("What is the deadline for submitting a military leave request?")}
              className="group p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all cursor-pointer space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="font-serif font-medium text-base text-zinc-900 dark:text-zinc-100">
                    Unknown
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                The regulation corpus does not specify a governing rule. RuleLens explicitly refuses to extrapolate, invent policies, or substitute model pre-training knowledge.
              </p>
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                <span className="text-[11px] font-mono text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors">
                  &ldquo;Military leave deadline?&rdquo; →
                </span>
              </div>
            </div>

            {/* 3. Contradictory */}
            <div
              onClick={() => handleSearch("Who approves a late course withdrawal?")}
              className="group p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all cursor-pointer space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span className="font-serif font-medium text-base text-zinc-900 dark:text-zinc-100">
                    Contradictory
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Two or more official publications state incompatible rules for the same circumstance. RuleLens isolates both provisions side-by-side without resolving them by guessing.
              </p>
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                <span className="text-[11px] font-mono text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors">
                  &ldquo;Who approves late withdrawal?&rdquo; →
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 05 — Editorial Case Study: Contradiction in Statute */}
        <section id="demonstration" className="space-y-8 pt-8 border-t border-zinc-200 dark:border-zinc-800">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-4">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Case Study in Conflict
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif tracking-tight text-zinc-950 dark:text-zinc-50">
                When two official policies disagree.
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
                Somewhere in university regulations is a sentence that contradicts another sentence. One clause delegates late withdrawal authority solely to the Faculty Dean. Another clause requires approval by the Graduate Studies Committee.
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
                Generic chatbots arbitrarily pick one answer depending on prompt phrasing. RuleLens surfaces both contradictory provisions side-by-side with exact statutory clauses.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => handleSearch("Who approves a late course withdrawal?")}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:bg-zinc-800 dark:hover:bg-white transition-colors cursor-pointer"
                >
                  <span>Verify this contradiction live</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-4 bg-white dark:bg-zinc-900/60 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
              <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                Corpus Comparison Preview · Contradiction C-01
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Academic Regulations §5.3
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400 italic text-[11px] leading-relaxed">
                    &ldquo;Withdrawals after Week 8 require written authorization solely from the Dean of Faculty.&rdquo;
                  </p>
                  <div className="text-[10px] font-mono text-zinc-400">academic_regulations.md</div>
                </div>

                <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Graduate Policies §2.6
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400 italic text-[11px] leading-relaxed">
                    &ldquo;All late withdrawal petitions must be approved exclusively by the Graduate Studies Committee.&rdquo;
                  </p>
                  <div className="text-[10px] font-mono text-zinc-400">graduate_policies.md</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 06 — Codified Regulation Library */}
        <section id="regulation-library" className="space-y-6 pt-8 border-t border-zinc-200 dark:border-zinc-800">
          <RegulationDirectory
            isInline={true}
            onSelectQuery={handleSearch}
          />
        </section>
      </main>

      {/* 07 — Institutional Editorial Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-12 text-xs text-zinc-500 font-normal transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-baseline justify-between gap-6">
          <div className="space-y-1">
            <div className="font-serif font-medium text-sm text-zinc-900 dark:text-zinc-100">
              RuleLens · Academic Policy Verification
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Ashford University Academic Regulations 2024–2025 · Indexed Corpus: 241 chunks across 5 publications.
            </p>
          </div>

          <div className="text-xs text-zinc-400 dark:text-zinc-500 space-y-1 md:text-right font-mono">
            <div>BM25 Lexical + Dense Embeddings · Reciprocal Rank Fusion</div>
            <div>Deterministic Three-State Verification Engine</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
