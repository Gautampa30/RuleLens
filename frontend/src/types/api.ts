export type QueryState = "ANSWERABLE" | "UNKNOWN" | "CONTRADICTORY";

export interface EvidenceChunk {
  id: string;
  source_file: string;
  source_type: "markdown" | "pdf";
  doc_title: string;
  section_path: string[];
  page_number?: number | null;
  char_offset: number;
  text: string;
  word_count: number;
}

export interface Citation {
  index: number;
  chunk_id: string;
  source_file: string;
  doc_title: string;
  section_path: string[];
  page_number?: number | null;
  passage_text: string;
  claim_text?: string | null;
}

export interface ConflictingClaimDetail {
  chunk_id: string;
  source_file: string;
  section_path: string[];
  page_number?: number | null;
  passage_text: string;
  policy_subject: string;
  claim_type: string;
  affected_population: string;
  value: string;
  value_unit?: string | null;
  raw_text: string;
}

export interface ContradictionPair {
  conflict_type: string;
  policy_subject: string;
  claim_a: ConflictingClaimDetail;
  claim_b: ConflictingClaimDetail;
  explanation: string;
}

export interface QueryMetadata {
  duration_ms?: number;
  top_k?: number;
  retrieved_count?: number;
  llm_generated?: boolean;
  llm_model?: string;
  llm_error?: string | null;
}

export interface QueryResponse {
  state: QueryState;
  answer: string;
  citations: Citation[];
  contradiction_pairs: ContradictionPair[];
  unknown_reason?: string | null;
  related_evidence: EvidenceChunk[];
  metadata: QueryMetadata;
}

export interface DocumentStatus {
  file: string;
  doc_title: string;
  chunks: number;
  claims: number;
}

export interface CorpusStatus {
  documents: DocumentStatus[];
  total_chunks: number;
  total_claims: number;
  embeddings_loaded: boolean;
  bm25_ready: boolean;
}

export interface HealthResponse {
  status: string;
  index_ready: boolean;
  chunk_count: number;
  claim_count: number;
  bm25_ready: boolean;
  embedding_ready: boolean;
  llm_ready: boolean;
  llm_model: string;
}
