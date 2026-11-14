import type { Clause, Doc, Lang, StressResult } from "@/lib/bharosa";

const ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";
export const NVIDIA_MODEL =
  process.env.NVIDIA_MODEL ?? "nvidia/nemotron-3.5-lightning-30b-a3b";

export function nvidiaEnabled() {
  return Boolean(process.env.NVIDIA_API_KEY);
}

function money(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

interface ChatMessage {
  role: "system" | "user";
  content: string;
}

async function complete(messages: ChatMessage[], maxTokens = 500): Promise<string | null> {
  if (!nvidiaEnabled()) return null;
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        messages,
        max_tokens: maxTokens,
        temperature: 0.1,
        top_p: 0.9,
        chat_template_kwargs: { enable_thinking: false },
      }),
      signal: AbortSignal.timeout(18_000),
    });
    if (!response.ok) {
      console.warn(`[nvidia] ${response.status} ${await response.text().catch(() => "")}`);
      return null;
    }
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    return typeof content === "string" && content.trim() ? content.trim() : null;
  } catch (error) {
    console.warn("[nvidia] request failed:", error instanceof Error ? error.message : error);
    return null;
  }
}

const SUPPORT_STOP = new Set([
  "the", "and", "for", "with", "from", "this", "that", "these", "those", "does", "did",
  "not", "yes", "you", "your", "our", "its", "card", "policy", "loan", "document",
  "include", "includes", "included", "cover", "covers", "covered", "free", "available",
  "any", "have", "has", "can", "could", "will", "would", "should", "what", "when",
  "how", "much", "many", "there", "their", "them", "about", "into", "than", "then",
  "also", "only", "just", "but", "are", "was", "were", "been", "being", "per",
]);

function supportTokens(text: string) {
  return (text.toLowerCase().match(/[a-z][a-z0-9]{2,}|\d[\d,]{2,}/g) ?? []).filter(
    (token) => !SUPPORT_STOP.has(token),
  );
}

/**
 * A citation id existing is not enough: the answer must share a subject with the
 * text it cites. This catches a confident "no lounge access" answer cited to an
 * unrelated fee clause. Hindi answers quote English clauses, so the lexical check
 * is limited to English/Hinglish; Hindi still depends on the strict prompt.
 */
function supportedByCitations(answer: string, quotes: string[], lang: Lang) {
  if (lang === "hi") return true;
  const answerTokens = supportTokens(answer);
  if (answerTokens.length === 0) return false;
  const evidence = new Set(supportTokens(quotes.join(" ")));
  return answerTokens.some((token) => evidence.has(token));
}

const LANG_NAME: Record<Lang, string> = {
  en: "English",
  hi: "Hindi (Devanagari)",
  hinglish: "Hinglish (Roman script, natural Indian English mix)",
};

export interface EvidenceAnswer {
  text: string;
  citationIds: string[];
  grounded: boolean;
}

/**
 * Ask NVIDIA only about the supplied document. The answer must come back as
 * JSON with clause ids; anything unsupported is rejected by the caller.
 */
export async function nvidiaEvidenceAnswer(input: {
  doc: Doc;
  question: string;
  lang: Lang;
  facts: Record<string, string>;
  calc: Record<string, string | number>;
  evidence?: Clause[];
}): Promise<EvidenceAnswer | null> {
  const { doc, question, lang, facts, calc } = input;
  const evidence = (input.evidence?.length ? input.evidence : doc.clauses)
    .map(
      (clause) =>
        `[${clause.id}] page ${clause.page}, clause ${clause.section}: ${clause.text}`,
    )
    .join("\n");

  const raw = await complete(
    [
      {
        role: "system",
        content: `You are Bharosa AI, an evidence-linked financial document assistant.
Rules:
- Use ONLY the evidence and computed values below. Never use outside knowledge.
- If the evidence does not answer the question, set "grounded" to false and give a short "Not available" answer.
- If the question asks about a feature, benefit or exclusion that is not explicitly mentioned in the evidence, set "grounded" to false. Never answer from general knowledge, even if you know the product.
- Cite every factual sentence with one or more clause ids from the evidence. Never invent a clause id.
- Do not do arithmetic. Use the computed values exactly as given.
- Answer in ${LANG_NAME[lang]}. Keep it under 110 words, plain and specific.
- Return JSON only, no markdown, in exactly this shape:
{"answer":"...","citation_ids":["..."],"grounded":true}`,
      },
      {
        role: "user",
        content: `DOCUMENT: ${doc.name} (${doc.type})
FACTS: ${JSON.stringify(facts)}
COMPUTED: ${JSON.stringify(calc)}
EVIDENCE:
${evidence}

QUESTION: ${question}`,
      },
    ],
    420,
  );

  if (!raw) return null;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as {
      answer?: unknown;
      citation_ids?: unknown;
      grounded?: unknown;
    };
    if (typeof parsed.answer !== "string" || !parsed.answer.trim()) return null;
    const ids = Array.isArray(parsed.citation_ids)
      ? parsed.citation_ids.filter((id): id is string => typeof id === "string")
      : [];
    const valid = ids.filter((id) => doc.clauses.some((clause) => clause.id === id));
    const cited = doc.clauses.filter((clause) => valid.includes(clause.id));
    const grounded =
      parsed.grounded === true &&
      valid.length > 0 &&
      supportedByCitations(
        parsed.answer.trim(),
        cited.map((clause) => clause.text),
        lang,
      );
    if (!grounded) {
      return { text: parsed.answer.trim().slice(0, 800), citationIds: [], grounded: false };
    }
    return {
      text: parsed.answer.trim().slice(0, 800),
      citationIds: [...new Set(valid)].slice(0, 4),
      grounded: true,
    };
  } catch {
    return null;
  }
}

/** The model narrates numbers that were already computed; it never calculates them. */
export async function nvidiaStressNarrative(
  result: StressResult,
  doc: Doc,
  lang: Lang,
): Promise<string | null> {
  const sources = result.citations
    .map((citation) => `page ${citation.page}, clause ${citation.clause}: ${citation.quote}`)
    .join("\n");
  const numbers = result.lines
    .map((line) => `${line.label}: ${money(line.amountPaise)}`)
    .join("\n");

  const raw = await complete(
    [
      {
        role: "system",
        content: `You explain a deterministic financial stress test in ${LANG_NAME[lang]}.
Use only the supplied scenario and numbers. Do not add, change or recalculate any figure.
Mention the page/clause that drives the result. Two or three short sentences. No advice, no promises.`,
      },
      {
        role: "user",
        content: `DOCUMENT: ${doc.name}
SCENARIO: ${result.title}
INPUT: ${JSON.stringify(result.input)}
COMPUTED LINES:
${numbers}
VERDICT: ${result.verdict}
EVIDENCE:
${sources}`,
      },
    ],
    220,
  );

  return raw ? raw.replace(/\s+/g, " ").trim().slice(0, 520) : null;
}
