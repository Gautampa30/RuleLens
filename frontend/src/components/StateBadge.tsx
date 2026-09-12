import React from "react";
import { CheckCircle2, HelpCircle, AlertTriangle } from "lucide-react";
import { QueryState } from "@/types/api";

interface StateBadgeProps {
  state: QueryState;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const StateBadge: React.FC<StateBadgeProps> = ({
  state,
  className = "",
  size = "md",
}) => {
  if (state === "ANSWERABLE") {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold tracking-wide ${
          size === "lg"
            ? "px-4 py-1.5 text-base"
            : size === "sm"
            ? "px-2.5 py-0.5 text-xs"
            : "px-3 py-1 text-sm"
        } ${className}`}
      >
        <CheckCircle2
          className={
            size === "lg"
              ? "w-5 h-5 text-emerald-600 dark:text-emerald-400"
              : size === "sm"
              ? "w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
              : "w-4 h-4 text-emerald-600 dark:text-emerald-400"
          }
        />
        <span>ANSWERABLE</span>
      </div>
    );
  }

  if (state === "UNKNOWN") {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-semibold tracking-wide ${
          size === "lg"
            ? "px-4 py-1.5 text-base"
            : size === "sm"
            ? "px-2.5 py-0.5 text-xs"
            : "px-3 py-1 text-sm"
        } ${className}`}
      >
        <HelpCircle
          className={
            size === "lg"
              ? "w-5 h-5 text-amber-600 dark:text-amber-400"
              : size === "sm"
              ? "w-3.5 h-3.5 text-amber-600 dark:text-amber-400"
              : "w-4 h-4 text-amber-600 dark:text-amber-400"
          }
        />
        <span>UNKNOWN</span>
      </div>
    );
  }

  // CONTRADICTORY
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold tracking-wide animate-pulse ${
        size === "lg"
          ? "px-4 py-1.5 text-base"
          : size === "sm"
          ? "px-2.5 py-0.5 text-xs"
          : "px-3 py-1 text-sm"
      } ${className}`}
    >
      <AlertTriangle
        className={
          size === "lg"
            ? "w-5 h-5 text-rose-600 dark:text-rose-400"
            : size === "sm"
            ? "w-3.5 h-3.5 text-rose-600 dark:text-rose-400"
            : "w-4 h-4 text-rose-600 dark:text-rose-400"
        }
      />
      <span>CONTRADICTORY</span>
    </div>
  );
};
