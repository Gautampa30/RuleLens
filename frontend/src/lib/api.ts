import { CorpusStatus, HealthResponse, QueryResponse } from "@/types/api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function checkBackendHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE_URL}/health`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new ApiError(res.status, `Backend health check failed: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchCorpusStatus(): Promise<CorpusStatus> {
  const res = await fetch(`${API_BASE_URL}/corpus/status`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new ApiError(res.status, `Failed to fetch corpus status: ${res.statusText}`);
  }
  return res.json();
}

export async function queryRuleLens(
  question: string,
  topK?: number
): Promise<QueryResponse> {
  const res = await fetch(`${API_BASE_URL}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question: question.trim(),
      ...(topK ? { top_k: topK } : {}),
    }),
  });

  if (!res.ok) {
    let errorDetail = "";
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || JSON.stringify(errJson);
    } catch {
      errorDetail = res.statusText;
    }
    throw new ApiError(
      res.status,
      errorDetail || `Query failed with status ${res.status}`,
      errorDetail
    );
  }

  return res.json();
}
