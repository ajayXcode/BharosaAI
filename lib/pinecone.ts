import type { Clause, Doc } from "@/lib/bharosa";

const API_VERSION = "2026-07";

function host() {
  const raw = process.env.PINECONE_HOST ?? "";
  if (!raw) return "";
  return raw.startsWith("http") ? raw.replace(/\/+$/, "") : `https://${raw.replace(/\/+$/, "")}`;
}

export function pineconeEnabled() {
  return Boolean(process.env.PINECONE_API_KEY && host());
}

export function pineconeIndexName() {
  return process.env.PINECONE_INDEX ?? "paytm";
}

/** One namespace per authenticated user keeps document data tenant-isolated. */
function namespaceFor(userId: string) {
  return `user-${userId.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 220)}`;
}

function headers() {
  const key = process.env.PINECONE_API_KEY;
  if (!key) throw new Error("PINECONE_API_KEY is not configured");
  return {
    "Api-Key": key,
    "content-type": "application/json",
    "X-Pinecone-Api-Version": API_VERSION,
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = host();
  if (!base) throw new Error("PINECONE_HOST is not configured");
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers ?? {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Pinecone ${response.status}: ${body.slice(0, 240)}`);
  }
  return (body ? JSON.parse(body) : {}) as T;
}

interface UpsertResponse {
  upserted_count?: number;
  usage?: { embed_total_tokens?: number };
}

interface SearchMatch {
  _id: string;
  _score: number;
  chunk_text?: string;
  clauseId?: string;
  documentId?: string;
  page?: number;
  section?: string;
}

interface SearchResponse {
  matches?: SearchMatch[];
}

/**
 * Replace a document's clause vectors. Pinecone's document schema embeds
 * `chunk_text` with llama-text-embed-v2 (1024 dimensions), so the app never
 * needs to hold or transmit raw embeddings.
 */
export async function indexDocument(
  userId: string,
  doc: Doc,
): Promise<{ indexed: number; skipped: boolean }> {
  if (!pineconeEnabled()) return { indexed: 0, skipped: true };
  if (!doc.clauses.length) return { indexed: 0, skipped: false };
  const namespace = namespaceFor(userId);

  await deleteDocumentVectors(userId, doc.id).catch(() => undefined);

  const documents = doc.clauses.map((clause) => ({
    _id: vectorId(doc.id, clause.id),
    title: doc.name.slice(0, 200),
    chunk_text: clause.text.slice(0, 6000),
    documentId: doc.id,
    documentName: doc.name.slice(0, 200),
    clauseId: clause.id,
    page: clause.page,
    section: clause.section.slice(0, 120),
    productType: doc.type,
    issuer: doc.issuer.slice(0, 160),
    indexedAt: new Date().toISOString(),
  }));

  let indexed = 0;
  for (let start = 0; start < documents.length; start += 40) {
    const batch = documents.slice(start, start + 40);
    const result = await request<UpsertResponse>(
      `/namespaces/${encodeURIComponent(namespace)}/documents/upsert`,
      { method: "POST", body: JSON.stringify({ documents: batch }) },
    );
    indexed += result.upserted_count ?? batch.length;
  }
  return { indexed, skipped: false };
}

function vectorId(documentId: string, clauseId: string) {
  return `${documentId}::${clauseId}`.replace(/[^a-zA-Z0-9:_-]/g, "-").slice(0, 120);
}

export async function deleteDocumentVectors(userId: string, documentId: string) {
  if (!pineconeEnabled()) return;
  await request(`/namespaces/${encodeURIComponent(namespaceFor(userId))}/documents/delete`, {
    method: "POST",
    body: JSON.stringify({ filter: { documentId: { $eq: documentId } } }),
  });
}

/** Semantic clause retrieval narrowed to one document. */
export async function searchDocumentClauses(
  userId: string,
  documentId: string,
  query: string,
  topK = 8,
): Promise<Array<Clause & { score: number }>> {
  if (!pineconeEnabled() || !query.trim()) return [];
  const result = await request<SearchResponse>(
    `/namespaces/${encodeURIComponent(namespaceFor(userId))}/documents/search`,
    {
      method: "POST",
      body: JSON.stringify({
        top_k: Math.max(1, Math.min(20, topK)),
        filter: { documentId: { $eq: documentId } },
        score_by: [{ type: "embed", fields: ["chunk_text"], query: query.slice(0, 1000) }],
        include_fields: ["chunk_text", "clauseId", "documentId", "page", "section"],
      }),
    },
  );
  return (result.matches ?? [])
    .filter((match) => match.clauseId && match.chunk_text)
    .map((match) => ({
      id: match.clauseId as string,
      page: match.page ?? 1,
      section: match.section ?? "",
      text: match.chunk_text as string,
      keywords: [],
      score: match._score ?? 0,
    }));
}

export interface PineconeHealth {
  configured: boolean;
  connected: boolean;
  index: string;
  dimension: number | null;
  vectors: number | null;
  error?: string;
}

export async function pineconeHealth(): Promise<PineconeHealth> {
  const base: PineconeHealth = {
    configured: pineconeEnabled(),
    connected: false,
    index: pineconeIndexName(),
    dimension: null,
    vectors: null,
  };
  if (!pineconeEnabled()) return base;
  try {
    const stats = await request<{
      dimension?: number;
      totalVectorCount?: number;
      namespaces?: Record<string, { record_count?: number }>;
    }>("/describe_index_stats", { method: "GET" });
    const namespaceVectors = Object.values(stats.namespaces ?? {}).reduce(
      (sum, item) => sum + (item.record_count ?? 0),
      0,
    );
    return {
      ...base,
      connected: true,
      dimension: stats.dimension ?? 1024,
      vectors: stats.totalVectorCount ?? namespaceVectors,
    };
  } catch (error) {
    return {
      ...base,
      error: error instanceof Error ? error.message : "Pinecone health check failed",
    };
  }
}
