import { AsyncLocalStorage } from "node:async_hooks";
import { getDb, loadSnapshot, saveSnapshot } from "@/lib/db";
import { nvidiaEvidenceAnswer, nvidiaStressNarrative } from "@/lib/nvidia";
import { indexDocument, searchDocumentClauses } from "@/lib/pinecone";

const STORE_KEY = "__bharosa_ai_workspace_v1__";
const HYDRATED_KEY = "__bharosa_ai_hydrated_v1__";

export type Lang = "en" | "hi" | "hinglish";
export type ProductType = "health_insurance" | "loan" | "credit_card";
export type Evidence = "stated" | "inferred" | "not_available";
export type Severity = "high" | "medium" | "low";
export type DocStatus = "uploaded" | "parsed" | "analysed";

export interface Citation {
  page: number;
  clause: string;
  quote: string;
}

export interface Clause {
  id: string;
  page: number;
  section: string;
  text: string;
  keywords: string[];
}

export interface Fact {
  key: string;
  label: string;
  value: string;
  evidence: Evidence;
  source?: Citation;
}

export interface RedFlag {
  id: string;
  ruleId: string;
  severity: Severity;
  title: Record<Lang, string>;
  explain: Record<Lang, string>;
  example: string;
  source: Citation;
}

export interface LoanTerms {
  principalPaise: number;
  annualPct: number;
  months: number;
  feePaise: number;
  otherPaise: number;
  prepayPct: number;
  prepayFeePaise: number;
  latePct: number;
  lateMinPaise: number;
  payee: string;
}

export interface HealthTerms {
  sumInsuredPaise: number;
  premiumPaise: number;
  copayPct: number;
  roomCapPct: number;
  roomCapPaise: number;
  roomDays: number;
  roomPerDayPaise: number;
  claimPaise: number;
  subLimitPaise: number;
  waitingMonths: number;
  payee: string;
}

export interface CardTerms {
  creditLimitPaise: number;
  revolveBalancePaise: number;
  annualPct: number;
  minDuePct: number;
  minDueFloorPaise: number;
  lateFeePaise: number;
  annualFeePaise: number;
  annualFeeWaiverSpendPaise: number;
  graceDays: number;
  cashAdvancePct: number;
  forexMarkupPct: number;
  payee: string;
}

export interface Doc {
  id: string;
  slug: string;
  name: string;
  issuer: string;
  type: ProductType;
  pages: number;
  hash: string;
  status: DocStatus;
  clauses: Clause[];
  facts: Fact[];
  flags: RedFlag[];
  loan?: LoanTerms;
  health?: HealthTerms;
  card?: CardTerms;
}

export interface LoanCalc {
  kind: "loan";
  principalPaise: number;
  emiPaise: number;
  months: number;
  totalPaise: number;
  interestPaise: number;
  feesPaise: number;
  netDisbursalPaise: number;
  aprPct: number;
  prepayPaise: number;
  outstandingAfterYearPaise: number;
  assumptions: string[];
}

export interface HealthCalc {
  kind: "health";
  claimPaise: number;
  roomDeductPaise: number;
  admissiblePaise: number;
  copayPaise: number;
  insurerPaysPaise: number;
  outOfPocketPaise: number;
  roomCapPaise: number;
  assumptions: string[];
}

export interface CardCalc {
  kind: "card";
  limitPaise: number;
  balancePaise: number;
  aprPct: number;
  monthlyInterestPaise: number;
  minDuePaise: number;
  monthsAtMinDue: number;
  interestAtMinDuePaise: number;
  lateFeePaise: number;
  annualFeePaise: number;
  graceDays: number;
  assumptions: string[];
}

export type Calc = LoanCalc | HealthCalc | CardCalc;

export type StressScenario = "hospitalization" | "prepay" | "revolve";

export interface StressLine {
  label: string;
  amountPaise: number;
  tone: "cost" | "cover" | "saving" | "neutral";
}

export interface StressResult {
  id: string;
  documentId: string;
  scenario: StressScenario;
  title: string;
  input: Record<string, number>;
  lines: StressLine[];
  verdict: string;
  citations: Citation[];
  assumptions: string[];
  narrative?: string;
  engine: "rules" | "nvidia";
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "bharosa";
  text: string;
  citations: Citation[];
  grounded: boolean;
  lang: Lang;
  engine?: "nvidia" | "rules";
  at: string;
}

export interface PaymentIntent {
  id: string;
  documentId: string;
  amountPaise: number;
  payee: string;
  purpose: string;
  status: "awaiting_approval" | "paid";
  createdAt: string;
  approvedAt?: string;
  token: string;
}

export interface Reminder {
  id: string;
  documentId: string;
  title: string;
  dueAt: string;
  channel: "in-app" | "whatsapp";
  status: "scheduled";
  createdAt: string;
}

export interface Escalation {
  id: string;
  documentId: string;
  reason: string;
  status: "open";
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  actor: "user" | "system" | "bharosa";
  event: string;
  meta: string;
  at: string;
}

export interface Metrics {
  documentsAnalysed: number;
  citationsChecked: number;
  citationsVerified: number;
  questions: number;
  notAvailable: number;
  paymentsPaise: number;
  timeToSummarySec: number;
}

export interface DocSummary {
  id: string;
  name: string;
  issuer: string;
  type: ProductType;
  pages: number;
  status: DocStatus;
  flags: number;
  facts: number;
}

export interface Analysis {
  documentId: string;
  productType: ProductType;
  summary: string;
  facts: Fact[];
  redFlags: RedFlag[];
  calc: Calc;
  citationsChecked: number;
  citationsVerified: number;
  lang: Lang;
}

interface Store {
  docs: Doc[];
  activeDocId: string;
  lang: Lang;
  chat: Record<string, ChatMessage[]>;
  payments: PaymentIntent[];
  reminders: Reminder[];
  escalations: Escalation[];
  audit: AuditEvent[];
  stress: StressResult[];
  metrics: Metrics;
}

// ---------------------------------------------------------------------------
// Money + deterministic calculators
// ---------------------------------------------------------------------------

export function inr(paise: number, fraction = 0) {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    maximumFractionDigits: fraction,
    minimumFractionDigits: fraction,
  })}`;
}

export function emi(principalPaise: number, annualPct: number, months: number) {
  const r = annualPct / 12 / 100;
  if (r === 0) return Math.round(principalPaise / months);
  const f = Math.pow(1 + r, months);
  return Math.round((principalPaise * r * f) / (f - 1));
}

function presentValue(rate: number, payment: number, months: number) {
  if (rate === 0) return payment * months;
  return (payment * (1 - Math.pow(1 + rate, -months))) / rate;
}

export function apr(netDisbursalPaise: number, emiPaise: number, months: number) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 120; i += 1) {
    const mid = (lo + hi) / 2;
    if (presentValue(mid, emiPaise, months) > netDisbursalPaise) lo = mid;
    else hi = mid;
  }
  const monthly = (lo + hi) / 2;
  return (Math.pow(1 + monthly, 12) - 1) * 100;
}

export function outstanding(
  principalPaise: number,
  annualPct: number,
  months: number,
  paid: number,
) {
  const r = annualPct / 12 / 100;
  if (r === 0) return Math.round(principalPaise * (1 - paid / months));
  const f = Math.pow(1 + r, paid);
  return Math.round(
    principalPaise * f - emi(principalPaise, annualPct, months) * ((f - 1) / r),
  );
}

export function loanCalc(doc: Doc): LoanCalc {
  const terms = doc.loan;
  if (!terms) throw new Error("Not a loan document");
  const emiPaise = emi(terms.principalPaise, terms.annualPct, terms.months);
  const feesPaise = Math.round(terms.feePaise + terms.otherPaise);
  const netDisbursalPaise = terms.principalPaise - feesPaise;
  const totalPaise = emiPaise * terms.months + feesPaise;
  const outstandingAfterYearPaise = Math.max(
    0,
    outstanding(terms.principalPaise, terms.annualPct, terms.months, 12),
  );
  return {
    kind: "loan",
    principalPaise: terms.principalPaise,
    emiPaise,
    months: terms.months,
    totalPaise,
    interestPaise: Math.max(0, emiPaise * terms.months - terms.principalPaise),
    feesPaise,
    netDisbursalPaise,
    aprPct: apr(netDisbursalPaise, emiPaise, terms.months),
    prepayPaise: Math.round(
      (outstandingAfterYearPaise * terms.prepayPct) / 100 + terms.prepayFeePaise,
    ),
    outstandingAfterYearPaise,
    assumptions: [
      "EMI uses the quoted fixed rate and full tenure.",
      "Fees are deducted from the disbursed amount.",
      "APR solves the monthly IRR, then annualises it.",
      "Prepayment estimate assumes 12 EMIs already paid.",
    ],
  };
}

export function healthCalc(doc: Doc): HealthCalc {
  const terms = doc.health;
  if (!terms) throw new Error("Not a health document");
  const roomDeductPaise =
    Math.max(0, terms.roomPerDayPaise - terms.roomCapPaise) * terms.roomDays;
  const admissiblePaise = Math.max(0, terms.claimPaise - roomDeductPaise);
  const copayPaise = Math.round((admissiblePaise * terms.copayPct) / 100);
  const insurerPaysPaise = admissiblePaise - copayPaise;
  return {
    kind: "health",
    claimPaise: terms.claimPaise,
    roomDeductPaise,
    admissiblePaise,
    copayPaise,
    insurerPaysPaise,
    outOfPocketPaise: terms.claimPaise - insurerPaysPaise,
    roomCapPaise: terms.roomCapPaise,
    assumptions: [
      `${terms.roomDays}-day hospital stay at ${inr(terms.roomPerDayPaise)} per day.`,
      `Room rent capped at ${terms.roomCapPct}% of sum insured (${inr(terms.roomCapPaise)} per day).`,
      `${terms.copayPct}% co-pay applies after the room-rent deduction.`,
      "No deductibles, taxes or non-payable items are included.",
    ],
  };
}

export function cardCalc(doc: Doc): CardCalc {
  const terms = doc.card;
  if (!terms) throw new Error("Not a credit card document");
  const monthly = terms.annualPct / 12 / 100;
  const monthlyInterestPaise = Math.round(terms.revolveBalancePaise * monthly);
  const minDuePaise = Math.round(
    Math.max(
      (terms.revolveBalancePaise * terms.minDuePct) / 100,
      terms.minDueFloorPaise,
    ),
  );
  let balance = terms.revolveBalancePaise;
  let interest = 0;
  let months = 0;
  while (balance > 0 && months < 120) {
    const charge = balance * monthly;
    const due = Math.max((balance * terms.minDuePct) / 100, terms.minDueFloorPaise);
    const pay = Math.min(balance + charge, due);
    balance = balance + charge - pay;
    interest += charge;
    months += 1;
  }
  return {
    kind: "card",
    limitPaise: terms.creditLimitPaise,
    balancePaise: terms.revolveBalancePaise,
    aprPct: terms.annualPct,
    monthlyInterestPaise,
    minDuePaise,
    monthsAtMinDue: months,
    interestAtMinDuePaise: Math.round(interest),
    lateFeePaise: terms.lateFeePaise,
    annualFeePaise: terms.annualFeePaise,
    graceDays: terms.graceDays,
    assumptions: [
      `${inr(terms.revolveBalancePaise)} is carried forward at ${terms.annualPct}% annual interest.`,
      `Minimum due is ${terms.minDuePct}% of the balance, with a ${inr(terms.minDueFloorPaise)} floor.`,
      "Interest is compounded monthly; no new spends are added in this estimate.",
      `The ${inr(terms.annualFeePaise)} annual fee is waived only above ${inr(terms.annualFeeWaiverSpendPaise)} annual spend.`,
    ],
  };
}

export function calcFor(doc: Doc): Calc {
  if (doc.type === "loan") return loanCalc(doc);
  if (doc.type === "credit_card") return cardCalc(doc);
  return healthCalc(doc);
}

function citationFor(clause: Clause): Citation {
  return { page: clause.page, clause: clause.section, quote: clause.text };
}

function cite(clauses: Clause[], id: string): Citation {
  const clause = clauses.find((item) => item.id === id);
  if (!clause) throw new Error(`Missing clause ${id}`);
  return citationFor(clause);
}

/** Cite the clause that actually discusses a topic in an uploaded document. */
function citeMatching(clauses: Clause[], pattern: RegExp): Citation {
  const clause =
    clauses.find((item) => pattern.test(item.text)) ??
    clauses.find((item) => pattern.test(item.section)) ??
    clauses[0];
  if (!clause) throw new Error("This document has no clauses to cite");
  return citationFor(clause);
}

export function getDoc(id: string) {
  return getStore().docs.find((doc) => doc.id === id);
}

function findDoc(docs: Doc[], id: string) {
  return docs.find((doc) => doc.id === id);
}

// ---------------------------------------------------------------------------
// Language-aware summaries and copy
// ---------------------------------------------------------------------------

const NOT_AVAILABLE: Record<Lang, string> = {
  en: "This is not stated in the document, so I will not guess. It is marked “Not available” — please confirm with the insurer or lender in writing.",
  hi: "यह दस्तावेज़ में नहीं लिखा है, इसलिए मैं अनुमान नहीं लगाऊंगा। इसे “उपलब्ध नहीं” माना गया है — कृपया बीमाकर्ता या कर्ज़दाता से लिखित पुष्टि करें।",
  hinglish: "Yeh document mein nahi likha hai, isliye main guess nahi karunga. Ise “Not available” mark kiya gaya hai — insurer ya lender se likhit confirm karein.",
};

export function summaryFor(doc: Doc, lang: Lang) {
  if (doc.type === "loan" && doc.loan) {
    const c = loanCalc(doc);
    const principal = inr(doc.loan.principalPaise);
    const emiText = inr(c.emiPaise);
    const total = inr(c.totalPaise);
    const net = inr(c.netDisbursalPaise);
    const aprText = c.aprPct.toFixed(1);
    if (lang === "hi") {
      return `${principal} का लोन, ${doc.loan.months} महीने, ${doc.loan.annualPct}% सालाना। EMI ${emiText} है। फीस काटकर हाथ में ${net} आते हैं और कुल ${total} चुकाने हैं — असली APR लगभग ${aprText}%।`;
    }
    if (lang === "hinglish") {
      return `${principal} ka loan, ${doc.loan.months} mahine, ${doc.loan.annualPct}% saalana. EMI ${emiText} hai. Fees katne ke baad haath mein ${net} aate hain aur total ${total} chukana hai — asli APR lagbhag ${aprText}%.`;
    }
    return `A ${principal} loan over ${doc.loan.months} months at ${doc.loan.annualPct}%. The EMI is ${emiText}. After fees you receive ${net} but repay ${total} — an effective APR of about ${aprText}%.`;
  }

  if (doc.type === "credit_card" && doc.card) {
    const c = cardCalc(doc);
    const limit = inr(c.limitPaise);
    const balance = inr(c.balancePaise);
    const monthly = inr(c.monthlyInterestPaise);
    const minDue = inr(c.minDuePaise);
    if (lang === "hi") {
      return `${limit} की क्रेडिट लिमिट, ${doc.card.annualPct}% सालाना ब्याज। ${balance} बकाया पर हर महीने लगभग ${monthly} ब्याज और ${minDue} मिनिमम ड्यू बनता है। ${doc.card.graceDays} दिन की ब्याज-मुक्त अवधि सिर्फ पूरा भुगतान करने पर मिलती है।`;
    }
    if (lang === "hinglish") {
      return `${limit} ki credit limit, ${doc.card.annualPct}% annual interest. ${balance} baaki par har mahine lagbhag ${monthly} interest aur ${minDue} minimum due banta hai. ${doc.card.graceDays}-day interest-free period sirf full payment par milta hai.`;
    }
    return `A ${limit} credit limit with ${doc.card.annualPct}% annual interest. Carrying ${balance} adds about ${monthly} in interest every month, while the minimum due is ${minDue}. The ${doc.card.graceDays}-day interest-free period applies only when the full statement is paid.`;
  }

  const c = healthCalc(doc);
  const sum = inr(doc.health?.sumInsuredPaise ?? 0);
  const premium = inr(doc.health?.premiumPaise ?? 0);
  const oop = inr(c.outOfPocketPaise);
  const claim = inr(c.claimPaise);
  const roomCap = inr(doc.health?.roomCapPaise ?? 0);
  const copay = doc.health?.copayPct ?? 0;
  const waiting = doc.health?.waitingMonths ?? 0;
  if (lang === "hi") {
    return `${sum} का स्वास्थ्य कवर, सालाना प्रीमियम ${premium}। पुरानी बीमारी के लिए ${waiting} महीने की प्रतीक्षा अवधि। रूम रेंट ${roomCap}/दिन पर सीमित और हर क्लेम पर ${copay}% को-पे है — ${claim} के बिल पर ${oop} आपको देना पड़ सकता है।`;
  }
  if (lang === "hinglish") {
    return `${sum} ka health cover, annual premium ${premium}. Purani bimari ke liye ${waiting} mahine waiting period. Room rent ${roomCap}/day cap aur har claim par ${copay}% co-pay — ${claim} ke bill par ${oop} aapko dena pad sakta hai.`;
  }
  return `A ${sum} health cover with a ${premium} annual premium. Pre-existing conditions have a ${waiting}-month waiting period. Room rent is capped at ${roomCap} a day and every claim carries ${copay}% co-pay — a ${claim} bill can leave you paying ${oop}.`;
}

export function flagTitle(flag: RedFlag, lang: Lang) {
  return flag.title[lang] ?? flag.title.en;
}

export function flagExplain(flag: RedFlag, lang: Lang) {
  return flag.explain[lang] ?? flag.explain.en;
}

// ---------------------------------------------------------------------------
// Citation verification
// ---------------------------------------------------------------------------

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").replace(/[“”"]/g, "").trim();
}

function quoteIsInDoc(doc: Doc, citation: Citation) {
  return doc.clauses.some(
    (clause) =>
      clause.page === citation.page &&
      normalize(clause.text).includes(normalize(citation.quote)),
  );
}

export function verifyCitations(doc: Doc) {
  const citations = [
    ...doc.facts.map((fact) => fact.source).filter((item): item is Citation => !!item),
    ...doc.flags.map((flag) => flag.source),
  ];
  return {
    checked: citations.length,
    verified: citations.filter((citation) => quoteIsInDoc(doc, citation)).length,
  };
}

export function analysisFor(doc: Doc, lang: Lang): Analysis {
  const verified = verifyCitations(doc);
  return {
    documentId: doc.id,
    productType: doc.type,
    summary: summaryFor(doc, lang),
    facts: doc.facts,
    redFlags: doc.flags,
    calc: calcFor(doc),
    citationsChecked: verified.checked,
    citationsVerified: verified.verified,
    lang,
  };
}

// ---------------------------------------------------------------------------
// Cited chat
// ---------------------------------------------------------------------------

const SUGGESTIONS: Record<ProductType, string[]> = {
  loan: [
    "What is the real cost of this loan?",
    "What is the foreclosure charge?",
    "What happens if I pay late?",
    "How much is deducted before disbursal?",
  ],
  health_insurance: [
    "When does cover start?",
    "What is the room rent limit?",
    "What is excluded from this policy?",
    "What is the waiting period?",
  ],
  credit_card: [
    "What is the monthly interest on a balance?",
    "What is the minimum amount due?",
    "What happens if I pay late?",
    "Is there an interest-free period?",
  ],
};

export function suggestionsFor(docId: string) {
  const doc = getDoc(docId);
  return doc ? SUGGESTIONS[doc.type] : [];
}

const STOP = new Set([
  "what",
  "when",
  "where",
  "which",
  "does",
  "this",
  "that",
  "with",
  "from",
  "have",
  "will",
  "your",
  "about",
  "into",
  "they",
  "them",
  "there",
  "here",
  "document",
  "policy",
  "loan",
  "please",
  "kya",
  "hai",
  "hain",
  "mera",
  "meri",
  "kitna",
  "kitni",
  "kaise",
  "kaun",
  "main",
  "mein",
  "par",
  "ke",
  "ka",
  "ki",
]);

function tokens(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9₹%.\u0900-\u097F]+/)
    .filter((token) => token.length > 2 && !STOP.has(token));
}

function bestClause(doc: Doc, question: string) {
  const words = tokens(question);
  let best: { clause: Clause; score: number } | null = null;
  for (const clause of doc.clauses) {
    let score = 0;
    for (const word of words) {
      if (clause.keywords.some((keyword) => keyword.includes(word) || word.includes(keyword))) {
        score += 3;
      } else if (normalize(clause.text).includes(word)) {
        score += 1;
      }
    }
    if (!best || score > best.score) best = { clause, score };
  }
  return best;
}

function message(
  text: string,
  citations: Citation[],
  lang: Lang,
  grounded: boolean,
  engine: "nvidia" | "rules" = "rules",
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "bharosa",
    text,
    citations,
    grounded,
    lang,
    engine,
    at: new Date().toISOString(),
  };
}

function localizedQuote(citation: Citation, lang: Lang) {
  if (lang === "hi") {
    return `दस्तावेज़ पेज ${citation.page}, क्लॉज़ ${citation.clause} कहता है: “${citation.quote}”`;
  }
  if (lang === "hinglish") {
    return `Document page ${citation.page}, clause ${citation.clause} kehta hai: “${citation.quote}”`;
  }
  return `The document says on page ${citation.page}, clause ${citation.clause}: “${citation.quote}”`;
}

function loanAnswer(doc: Doc, question: string, lang: Lang): ChatMessage | null {
  const terms = doc.loan;
  if (!terms) return null;
  const c = loanCalc(doc);
  const q = question.toLowerCase();
  const map =
    doc.id === "loan-kfs-b"
      ? {
          terms: "lb-terms",
          emi: "lb-terms",
          fee: "lb-fee",
          insurance: "lb-insurance",
          prepay: "lb-prepay",
          late: "lb-late",
          rate: "lb-rate",
        }
      : {
          terms: "la-terms",
          emi: "la-emi",
          fee: "la-fee",
          insurance: "la-insurance",
          prepay: "la-prepay",
          late: "la-late",
          rate: "la-rate",
        };
  const pick = (...ids: string[]) => ids.map((id) => cite(doc.clauses, id));

  if (/(emi|monthly|per month|instal|kitna|mahina)/.test(q)) {
    const text =
      lang === "hi"
        ? `आपकी मासिक EMI ${inr(c.emiPaise)} है, ${terms.months} महीने के लिए। कुल ${inr(c.totalPaise)} चुकाएंगे, जिसमें ${inr(c.interestPaise)} ब्याज और ${inr(c.feesPaise)} फीस शामिल है।`
        : lang === "hinglish"
          ? `Aapki monthly EMI ${inr(c.emiPaise)} hai, ${terms.months} mahine ke liye. Total ${inr(c.totalPaise)} chukayenge, jisme ${inr(c.interestPaise)} interest aur ${inr(c.feesPaise)} fees hai.`
          : `Your EMI is ${inr(c.emiPaise)} a month for ${terms.months} months. Over the full tenure you repay ${inr(c.totalPaise)}, including ${inr(c.interestPaise)} interest and ${inr(c.feesPaise)} in fees.`;
    return message(text, pick(map.terms, map.emi), lang, true);
  }

  if (/(rate|fixed|float|change|badal|revise)/.test(q)) {
    const clause = doc.clauses.find((item) => item.id === map.rate);
    if (!clause) return null;
    const text =
      lang === "hi"
        ? `दस्तावेज़ के अनुसार: “${clause.text}” यह जानना ज़रूरी है क्योंकि दर बदलने पर EMI बढ़ सकती है।`
        : lang === "hinglish"
          ? `Document ke according: “${clause.text}” Yeh important hai kyunki rate badalne par EMI badh sakti hai.`
          : `According to the document: “${clause.text}” This matters because a rate change can raise your EMI.`;
    return message(text, [{ page: clause.page, clause: clause.section, quote: clause.text }], lang, true);
  }

  if (/(real cost|true cost|total|apr|effective|interest|costly|mehnga|kitna lagega)/.test(q)) {
    const text =
      lang === "hi"
        ? `कागज़ पर दर ${terms.annualPct}% है, लेकिन फीस के बाद असली सालाना लागत (APR) लगभग ${c.aprPct.toFixed(1)}% है। ₹${(terms.principalPaise / 100).toLocaleString("en-IN")} में से ${inr(c.feesPaise)} कटकर ${inr(c.netDisbursalPaise)} मिलते हैं; कुल ${inr(c.totalPaise)} चुकाने हैं।`
        : lang === "hinglish"
          ? `Paper par rate ${terms.annualPct}% hai, lekin fees ke baad asli annual cost (APR) lagbhag ${c.aprPct.toFixed(1)}% hai. ₹${(terms.principalPaise / 100).toLocaleString("en-IN")} mein se ${inr(c.feesPaise)} katkar ${inr(c.netDisbursalPaise)} milte hain; total ${inr(c.totalPaise)} chukana hai.`
          : `The headline rate is ${terms.annualPct}%, but the effective annual cost (APR) is about ${c.aprPct.toFixed(1)}%. Of the ₹${(terms.principalPaise / 100).toLocaleString("en-IN")} loan, ${inr(c.feesPaise)} is deducted, so you receive ${inr(c.netDisbursalPaise)} and repay ${inr(c.totalPaise)}.`;
    return message(text, pick(map.terms, map.fee, map.insurance), lang, true);
  }

  if (/(prepay|foreclos|close early|jaldi|band)/.test(q)) {
    const text =
      lang === "hi"
        ? `छह EMI के बाद प्रीपेमेंट संभव है: बकाया मूलधन का ${terms.prepayPct}% और ${inr(terms.prepayFeePaise)}। 12 EMI के बाद बकाया लगभग ${inr(c.outstandingAfterYearPaise)} है, इसलिए शुल्क लगभग ${inr(c.prepayPaise)} बैठेगा।`
        : lang === "hinglish"
          ? `6 EMI ke baad prepayment possible hai: outstanding principal ka ${terms.prepayPct}% plus ${inr(terms.prepayFeePaise)}. 12 EMI ke baad outstanding lagbhag ${inr(c.outstandingAfterYearPaise)} hai, to charge lagbhag ${inr(c.prepayPaise)} hoga.`
          : `Prepayment is allowed after six EMIs at ${terms.prepayPct}% of the outstanding principal plus ${inr(terms.prepayFeePaise)}. After 12 EMIs the balance is about ${inr(c.outstandingAfterYearPaise)}, so the charge would be roughly ${inr(c.prepayPaise)}.`;
    return message(text, pick(map.prepay), lang, true);
  }

  if (/(late|penalty|miss|overdue|der)/.test(q)) {
    const flag = doc.flags.find((item) => item.ruleId === "late_penalty");
    const text = flag ? flagExplain(flag, lang) : localizedQuote(pick(map.late)[0], lang);
    return message(
      `${text} ${lang === "en" ? `Minimum charge: ${inr(terms.lateMinPaise)}.` : ""}`.trim(),
      pick(map.late),
      lang,
      true,
    );
  }

  if (/(fee|processing|deduct|charge|insurance|kata)/.test(q)) {
    const text =
      lang === "hi"
        ? `प्रोसेसिंग फीस ${inr(terms.feePaise)} और बीमा ${inr(terms.otherPaise)} कुल ${inr(c.feesPaise)} है, जो पैसा देने से पहले कटता है। इसलिए हाथ में ${inr(c.netDisbursalPaise)} आते हैं।`
        : lang === "hinglish"
          ? `Processing fee ${inr(terms.feePaise)} aur insurance ${inr(terms.otherPaise)}, total ${inr(c.feesPaise)} hai, jo disbursal se pehle cut hota hai. Isliye haath mein ${inr(c.netDisbursalPaise)} aate hain.`
          : `The processing fee is ${inr(terms.feePaise)} and insurance is ${inr(terms.otherPaise)} — ${inr(c.feesPaise)} in total, deducted before disbursal. You receive ${inr(c.netDisbursalPaise)}.`;
    return message(text, pick(map.fee, map.insurance), lang, true);
  }

  if (/(tenure|how long|months|kitne saal|duration)/.test(q)) {
    const text =
      lang === "hi"
        ? `लोन की अवधि ${terms.months} महीने है। EMI ${inr(c.emiPaise)} प्रति माह।`
        : lang === "hinglish"
          ? `Loan ki tenure ${terms.months} mahine hai. EMI ${inr(c.emiPaise)} per month.`
          : `The loan runs for ${terms.months} months, with an EMI of ${inr(c.emiPaise)}.`;
    return message(text, pick(map.terms), lang, true);
  }

  if (/(debit|auto|bank|mandate|account)/.test(q) && doc.id !== "loan-kfs-b") {
    return message(localizedQuote(pick("la-debit")[0], lang), pick("la-debit"), lang, true);
  }

  if (/(default|recall|unpaid|60)/.test(q) && doc.id !== "loan-kfs-b") {
    return message(localizedQuote(pick("la-recall")[0], lang), pick("la-recall"), lang, true);
  }

  return null;
}

function healthAnswer(doc: Doc, question: string, lang: Lang): ChatMessage | null {
  const terms = doc.health;
  if (!terms) return null;
  const c = healthCalc(doc);
  const q = question.toLowerCase();
  const pick = (...ids: string[]) => ids.map((id) => cite(doc.clauses, id));

  if (/(waiting|pre-existing|ped|diabetes|start|cover kab|when.*cover)/.test(q)) {
    const text =
      lang === "hi"
        ? `सामान्य बीमारी के लिए 30 दिन की प्रतीक्षा है। डायबिटीज़, बीपी जैसी पुरानी बीमारी 36 महीने लगातार पॉलिसी के बाद कवर होंगी।`
        : lang === "hinglish"
          ? `Normal illness ke liye 30 din ki waiting hai. Diabetes, BP jaisi purani bimari 36 mahine lagatar policy ke baad cover hogi.`
          : `There is a 30-day initial waiting period. Pre-existing conditions such as diabetes or blood pressure are covered only after 36 months of continuous cover.`;
    return message(text, pick("h-initial", "h-ped"), lang, true);
  }

  if (/(room|rent|hospital.*room)/.test(q)) {
    const flag = doc.flags.find((item) => item.ruleId === "room_rent_cap");
    const text =
      lang === "hi"
        ? `रूम रेंट ${inr(terms.roomCapPaise)} प्रति दिन (बीमा राशि का ${terms.roomCapPct}%) तक ही मान्य है। ${flag ? flag.explain.hi : ""}`
        : lang === "hinglish"
          ? `Room rent ${inr(terms.roomCapPaise)} per day (sum insured ka ${terms.roomCapPct}%) tak hi valid hai. ${flag ? flag.explain.hinglish : ""}`
          : `Room rent is capped at ${inr(terms.roomCapPaise)} per day (${terms.roomCapPct}% of sum insured). ${flag ? flag.explain.en : ""}`;
    return message(text.trim(), pick("h-room"), lang, true);
  }

  if (/(co-?pay|out.of.pocket|claim|1.2|120000|kitna dena)/.test(q)) {
    const text =
      lang === "hi"
        ? `₹1,20,000 के 5-दिन के क्लेम में ₹8,000/दिन के कमरे पर ${inr(c.roomDeductPaise)} कटते हैं। मान्य बिल ${inr(c.admissiblePaise)}, 20% को-पे ${inr(c.copayPaise)}, बीमाकर्ता ${inr(c.insurerPaysPaise)} देगा और आपको ${inr(c.outOfPocketPaise)} देना होगा।`
        : lang === "hinglish"
          ? `₹1,20,000 ke 5-din claim mein ₹8,000/day room par ${inr(c.roomDeductPaise)} cut hote hain. Valid bill ${inr(c.admissiblePaise)}, 20% co-pay ${inr(c.copayPaise)}, insurer ${inr(c.insurerPaysPaise)} dega aur aapko ${inr(c.outOfPocketPaise)} dena hoga.`
          : `On a ₹1,20,000 claim with a 5-day stay at ₹8,000 a day, ${inr(c.roomDeductPaise)} is deducted for the room cap. The admissible bill is ${inr(c.admissiblePaise)}; with 20% co-pay you pay ${inr(c.copayPaise)}, the insurer pays ${inr(c.insurerPaysPaise)}, and your total out-of-pocket is ${inr(c.outOfPocketPaise)}.`;
    return message(text, pick("h-room", "h-copay"), lang, true);
  }

  if (/(cataract|eye|sublimit|sub-limit)/.test(q)) {
    const text =
      lang === "hi"
        ? `कैटरैक्ट का इलाज ₹2,00,000 प्रति पॉलिसी वर्ष तक ही कवर है, भले ही बीमा राशि ₹5,00,000 हो।`
        : lang === "hinglish"
          ? `Cataract treatment ₹2,00,000 per policy year tak hi cover hai, chahe sum insured ₹5,00,000 ho.`
          : `Cataract treatment is capped at ₹2,00,000 per policy year, even though the sum insured is ₹5,00,000.`;
    return message(text, pick("h-cataract"), lang, true);
  }

  if (/(exclud|dental|cosmetic|spectacle|chashma|not covered)/.test(q)) {
    return message(localizedQuote(pick("h-exclusion")[0], lang), pick("h-exclusion"), lang, true);
  }

  if (/(premium|cost|price|kitna bharna)/.test(q)) {
    const text =
      lang === "hi"
        ? `सालाना प्रीमियम ${inr(terms.premiumPaise)} है, करों के अलावा।`
        : lang === "hinglish"
          ? `Annual premium ${inr(terms.premiumPaise)} hai, taxes ke alawa.`
          : `The annual premium is ${inr(terms.premiumPaise)}, exclusive of taxes.`;
    return message(text, pick("h-premium"), lang, true);
  }

  if (/(sum insured|coverage|cover amount|kitna cover)/.test(q)) {
    return message(localizedQuote(pick("h-sum")[0], lang), pick("h-sum"), lang, true);
  }

  if (/(day.?care|restor)/.test(q)) {
    return message(
      localizedQuote(pick("h-daycare")[0], lang),
      pick("h-daycare", "h-restore"),
      lang,
      true,
    );
  }

  return null;
}

function cardAnswer(doc: Doc, question: string, lang: Lang): ChatMessage | null {
  const terms = doc.card;
  if (!terms) return null;
  const c = cardCalc(doc);
  const q = question.toLowerCase();
  const pick = (...ids: string[]) => ids.map((id) => cite(doc.clauses, id));

  if (/(interest|apr|revolv|monthly|carry|carrying|cost)/.test(q)) {
    const text =
      lang === "hi"
        ? `₹50,000 बकाया पर इस महीने लगभग ${inr(c.monthlyInterestPaise)} ब्याज लगेगा। सिर्फ मिनिमम ड्यू भरते रहने पर करीब ${c.monthsAtMinDue} महीने और ${inr(c.interestAtMinDuePaise)} ब्याज लग सकता है।`
        : lang === "hinglish"
          ? `₹50,000 baaki par is mahine lagbhag ${inr(c.monthlyInterestPaise)} interest lagega. Sirf minimum due bharte rehne par karib ${c.monthsAtMinDue} mahine aur ${inr(c.interestAtMinDuePaise)} interest lag sakta hai.`
          : `Carrying ₹50,000 costs about ${inr(c.monthlyInterestPaise)} in interest this month. Paying only the minimum could take about ${c.monthsAtMinDue} months and cost ${inr(c.interestAtMinDuePaise)} in interest.`;
    return message(text, pick("cc-apr", "cc-mindue"), lang, true, "rules");
  }

  if (/(minimum|min due|due amount|kam se kam)/.test(q)) {
    const text =
      lang === "hi"
        ? `मिनिमम ड्यू बैलेंस का 5% या ₹200 (जो ज़्यादा हो) है — ₹50,000 पर ${inr(c.minDuePaise)}। यह लेट फीस टालता है, कर्ज़ नहीं मिटाता।`
        : lang === "hinglish"
          ? `Minimum due balance ka 5% ya ₹200 (jo zyada ho) hai — ₹50,000 par ${inr(c.minDuePaise)}. Yeh late fee taalta hai, debt nahi mitaata.`
          : `The minimum due is 5% of the balance or ₹200, whichever is higher — ${inr(c.minDuePaise)} on ₹50,000. It avoids a late fee; it does not clear the debt.`;
    return message(text, pick("cc-mindue"), lang, true, "rules");
  }

  if (/(late|miss|penalty|overdue)/.test(q)) {
    const clause = doc.clauses.find((item) => item.id === "cc-late")!;
    const text =
      lang === "hi"
        ? `दस्तावेज़ कहता है: “${clause.text}” यानी ₹500 फीस के अलावा ब्याज भी चलता रहेगा।`
        : lang === "hinglish"
          ? `Document kehta hai: “${clause.text}” Matlab ₹500 fee ke alawa interest bhi chalta rahega.`
          : `The document says: “${clause.text}” So a missed minimum due adds ₹500 and interest keeps running.`;
    return message(text, [cite(doc.clauses, "cc-late")], lang, true, "rules");
  }

  if (/(cash|withdraw|atm)/.test(q)) {
    const clause = doc.clauses.find((item) => item.id === "cc-cash")!;
    const text =
      lang === "hi"
        ? `कैश एडवांस पर 2.5% (कम से कम ₹500) फीस है और उसी दिन से ब्याज शुरू होता है — 45 दिन की छूट नहीं।`
        : lang === "hinglish"
          ? `Cash advance par 2.5% (kam se kam ₹500) fee aur usi din se interest — 45 din ki grace nahi.`
          : `A cash advance costs 2.5% (minimum ₹500) and starts interest the same day — no 45-day grace.`;
    return message(text, [cite(doc.clauses, "cc-cash"), { page: clause.page, clause: clause.section, quote: clause.text }], lang, true, "rules");
  }

  if (/(forex|foreign|international|markup)/.test(q)) {
    const clause = doc.clauses.find((item) => item.id === "cc-forex")!;
    const text =
      lang === "hi"
        ? `विदेशी लेनदेन पर 3.5% मार्कअप लगता है। ₹10,000 के खर्च पर ₹350 अतिरिक्त।`
        : lang === "hinglish"
          ? `Foreign transaction par 3.5% markup. ₹10,000 spend par ₹350 extra.`
          : `Foreign transactions carry a 3.5% markup. A ₹10,000 spend adds ₹350.`;
    return message(text, [{ page: clause.page, clause: clause.section, quote: clause.text }], lang, true, "rules");
  }

  if (/(annual|fee|waiver)/.test(q)) {
    const clause = doc.clauses.find((item) => item.id === "cc-annual")!;
    const text =
      lang === "hi"
        ? `सालाना फीस ₹999 है, जो सिर्फ ₹2,00,000 से ज़्यादा खर्च पर माफ होती है।`
        : lang === "hinglish"
          ? `Annual fee ₹999 hai, jo sirf ₹2,00,000 se zyada spend par waiver hoti hai.`
          : `The annual fee is ₹999 and is waived only above ₹2,00,000 in annual spends.`;
    return message(text, [{ page: clause.page, clause: clause.section, quote: clause.text }], lang, true, "rules");
  }

  if (/(grace|interest.free|45|free period)/.test(q)) {
    const clause = doc.clauses.find((item) => item.id === "cc-grace")!;
    const text =
      lang === "hi"
        ? `45 दिन की ब्याज-मुक्त अवधि सिर्फ पूरा बिल भरने पर मिलती है। आंशिक भुगतान करने पर नए खर्चों पर छूट खत्म।`
        : lang === "hinglish"
          ? `45 din ki interest-free period sirf full bill bharne par milti hai. Partial payment par naye spends ki grace khatam.`
          : `The 45-day interest-free period applies only when the full bill is paid. A partial payment removes grace on new spends.`;
    return message(text, [{ page: clause.page, clause: clause.section, quote: clause.text }], lang, true, "rules");
  }

  return null;
}

function calcContext(doc: Doc): Record<string, string | number> {
  const calc = calcFor(doc);
  if (calc.kind === "loan") {
    return {
      emi: inr(calc.emiPaise),
      total_repayment: inr(calc.totalPaise),
      interest: inr(calc.interestPaise),
      fees: inr(calc.feesPaise),
      net_disbursal: inr(calc.netDisbursalPaise),
      apr_pct: calc.aprPct.toFixed(2),
      prepayment_after_12_emis: inr(calc.prepayPaise),
    };
  }
  if (calc.kind === "health") {
    return {
      claim: inr(calc.claimPaise),
      room_deduction: inr(calc.roomDeductPaise),
      admissible: inr(calc.admissiblePaise),
      copay: inr(calc.copayPaise),
      insurer_pays: inr(calc.insurerPaysPaise),
      out_of_pocket: inr(calc.outOfPocketPaise),
    };
  }
  return {
    balance: inr(calc.balancePaise),
    monthly_interest: inr(calc.monthlyInterestPaise),
    minimum_due: inr(calc.minDuePaise),
    months_at_minimum: calc.monthsAtMinDue,
    interest_at_minimum: inr(calc.interestAtMinDuePaise),
    apr_pct: calc.aprPct,
  };
}

export async function ask(docId: string, question: string, lang: Lang) {
  const store = getStore();
  const doc = getDoc(docId);
  if (!doc) throw new Error("Document not found");
  const clean = question.trim().slice(0, 300);
  if (!clean) throw new Error("Ask a question first");

  const history = store.chat[doc.id] ?? (store.chat[doc.id] = []);
  history.push({
    id: crypto.randomUUID(),
    role: "user",
    text: clean,
    citations: [],
    grounded: true,
    lang,
    at: new Date().toISOString(),
  });

  let result: ChatMessage | null = null;
  // Uploaded documents are answered only from their own text and retrieved
  // clauses. The typed rule engine is never used for customer uploads.
  if (!doc.id.startsWith("upload-")) {
    try {
      result =
        doc.type === "loan"
          ? loanAnswer(doc, clean, lang)
          : doc.type === "credit_card"
            ? cardAnswer(doc, clean, lang)
            : healthAnswer(doc, clean, lang);
    } catch {
      result = null;
    }
  }

  const userId = requestContext.getStore()?.userId;
  let retrieved: Clause[] = [];
  if (userId) {
    try {
      retrieved = await searchDocumentClauses(userId, doc.id, clean, 8);
    } catch (error) {
      console.warn(
        "[pinecone] retrieval failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  if (!result) {
    const facts = Object.fromEntries(doc.facts.map((fact) => [fact.label, fact.value]));
    const ai = await nvidiaEvidenceAnswer({
      doc,
      question: clean,
      lang,
      facts,
      calc: calcContext(doc),
      evidence: retrieved.length ? retrieved : undefined,
    });
    if (ai?.grounded) {
      const citations = ai.citationIds
        .map((id) => doc.clauses.find((clause) => clause.id === id))
        .filter((clause): clause is Clause => Boolean(clause))
        .map(citationFor);
      result = message(
        ai.text,
        citations.length
          ? citations
          : retrieved.length
            ? [citationFor(retrieved[0])]
            : [],
        lang,
        true,
        "nvidia",
      );
    } else if (ai && !ai.grounded) {
      result = message(NOT_AVAILABLE[lang], [], lang, false, "nvidia");
    }
  }

  if (!result && retrieved.length) {
    const match = retrieved[0];
    const citation: Citation = {
      page: match.page,
      clause: match.section || match.id,
      quote: match.text,
    };
    result = message(localizedQuote(citation, lang), [citation], lang, true);
  }

  if (!result) {
    const match = bestClause(doc, clean);
    if (match && match.score >= 3) {
      result = message(localizedQuote(cite(doc.clauses, match.clause.id), lang), [
        cite(doc.clauses, match.clause.id),
      ], lang, true);
    }
  }

  if (!result) {
    result = message(NOT_AVAILABLE[lang], [], lang, false);
    store.metrics.notAvailable += 1;
  }

  history.push(result);
  store.metrics.questions += 1;
  pushAudit(
    "user",
    "Question answered",
    `${doc.name} · ${result.grounded ? `${result.citations.length} citation(s)` : "not available"}${result.engine === "nvidia" ? " · NVIDIA" : ""}`,
  );
  store.chat[doc.id] = history.slice(-24);
  return { messages: store.chat[doc.id], answer: result };
}

// ---------------------------------------------------------------------------
// Stress test + real-life cost simulation
// ---------------------------------------------------------------------------

export interface StressInput {
  documentId?: string;
  scenario?: StressScenario;
  claimPaise?: number;
  roomPerDayPaise?: number;
  roomDays?: number;
  prepayMonth?: number;
  balancePaise?: number;
  months?: number;
}

function bounded(value: number | undefined, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function stressTest(input: StressInput): StressResult {
  const store = getStore();
  const docId = input.documentId ?? store.activeDocId;
  const doc = getDoc(docId);
  if (!doc) throw new Error("Document not found");
  const scenario: StressScenario =
    input.scenario ??
    (doc.type === "loan" ? "prepay" : doc.type === "credit_card" ? "revolve" : "hospitalization");

  let result: Omit<StressResult, "id" | "createdAt" | "engine">;

  if (doc.type === "health_insurance" && doc.health) {
    if (scenario !== "hospitalization") throw new Error("This document supports a hospitalisation scenario");
    const terms = doc.health;
    const claim = bounded(input.claimPaise, terms.claimPaise, 100000, 100_00_00_000);
    const room = bounded(input.roomPerDayPaise, terms.roomPerDayPaise, 0, 2000000);
    const days = bounded(input.roomDays, terms.roomDays, 1, 60);
    const roomDeduct = Math.max(0, room - terms.roomCapPaise) * days;
    const admissible = Math.max(0, claim - roomDeduct);
    const copay = (admissible * terms.copayPct) / 100;
    const insurerPays = admissible - copay;
    const outOfPocket = claim - insurerPays;
    result = {
      documentId: doc.id,
      scenario,
      title: `Hospitalisation · ${inr(claim)} bill, ${inr(room)}/day for ${days} days`,
      input: { claimPaise: claim, roomPerDayPaise: room, roomDays: days },
      lines: [
        { label: "Hospital bill", amountPaise: claim, tone: "neutral" },
        { label: "Room-rent deduction", amountPaise: roomDeduct, tone: "cost" },
        { label: `${terms.copayPct}% co-pay`, amountPaise: copay, tone: "cost" },
        { label: "Insurer pays", amountPaise: insurerPays, tone: "cover" },
        { label: "You pay out of pocket", amountPaise: outOfPocket, tone: "cost" },
      ],
      verdict: `On a ${inr(claim)} bill, the insurer pays ${inr(insurerPays)} and you pay ${inr(outOfPocket)}. The room cap adds ${inr(roomDeduct)} to your share before co-pay.`,
      citations: [
        citeMatching(doc.clauses, /room|rent/i),
        citeMatching(doc.clauses, /co-?pay|deduct/i),
      ],
      assumptions: [
        `Room rent above ${inr(terms.roomCapPaise)}/day is deducted for all ${days} days.`,
        "Associated expenses are reduced in the same proportion, then co-pay applies.",
        "No deductibles, taxes or non-payable items are included.",
      ],
    };
  } else if (doc.type === "loan" && doc.loan) {
    if (scenario !== "prepay") throw new Error("This document supports a prepayment scenario");
    const terms = doc.loan;
    const month = bounded(input.prepayMonth, 12, 1, terms.months);
    const balance = Math.max(0, outstanding(terms.principalPaise, terms.annualPct, terms.months, month));
    const charge = (balance * terms.prepayPct) / 100 + terms.prepayFeePaise;
    const emiPaise = emi(terms.principalPaise, terms.annualPct, terms.months);
    const remaining = terms.months - month;
    const interestIfContinue = Math.max(0, emiPaise * remaining - balance);
    const net = interestIfContinue - charge;
    result = {
      documentId: doc.id,
      scenario,
      title: `Prepay after ${month} EMI${month === 1 ? "" : "s"}`,
      input: { prepayMonth: month },
      lines: [
        { label: "Outstanding principal", amountPaise: balance, tone: "neutral" },
        { label: `${terms.prepayPct}% foreclosure charge`, amountPaise: charge, tone: "cost" },
        { label: "Interest saved by closing now", amountPaise: interestIfContinue, tone: "saving" },
        {
          label: net >= 0 ? "Net saving after charge" : "Net cost of prepaying now",
          amountPaise: Math.abs(net),
          tone: net >= 0 ? "saving" : "cost",
        },
      ],
      verdict:
        net >= 0
          ? `Prepaying after ${month} EMIs saves about ${inr(net)} after the foreclosure charge.`
          : `Prepaying now costs about ${inr(-net)} more than continuing the loan because the charge exceeds the remaining interest.`,
      citations: [citeMatching(doc.clauses, /prepay|foreclos|early closure/i)],
      assumptions: [
        `Outstanding is calculated after ${month} paid EMIs.`,
        "The foreclosure charge is a percentage of outstanding principal plus any fixed fee.",
        "No tax, processing delay or reinvestment of the saved EMI is modelled.",
      ],
    };
  } else if (doc.type === "credit_card" && doc.card) {
    if (scenario !== "revolve") throw new Error("This document supports a revolving-balance scenario");
    const terms = doc.card;
    const balance = bounded(input.balancePaise, terms.revolveBalancePaise, 100000, terms.creditLimitPaise);
    const months = bounded(input.months, 6, 1, 36);
    const monthlyPayment = emi(balance, terms.annualPct, months);
    const totalPaid = monthlyPayment * months;
    const interest = totalPaid - balance;
    result = {
      documentId: doc.id,
      scenario,
      title: `Revolve ${inr(balance)} for ${months} month${months === 1 ? "" : "s"}`,
      input: { balancePaise: balance, months },
      lines: [
        { label: "Balance carried", amountPaise: balance, tone: "neutral" },
        { label: `Interest at ${terms.annualPct}% APR`, amountPaise: interest, tone: "cost" },
        { label: "Monthly payment to clear", amountPaise: monthlyPayment, tone: "neutral" },
        { label: "Total repaid", amountPaise: totalPaid, tone: "cost" },
      ],
      verdict: `Clearing ${inr(balance)} over ${months} months costs ${inr(interest)} in interest at ${terms.annualPct}% annualised.`,
      citations: [
        citeMatching(doc.clauses, /interest|apr|annual percentage/i),
        citeMatching(doc.clauses, /minimum due|revolv/i),
      ],
      assumptions: [
        `Interest is ${terms.annualPct / 12}% per month on the reducing balance.`,
        "No new spends, fees or late payments are added during the period.",
        "The payment is fixed and starts one month after the balance is carried.",
      ],
    };
  } else {
    throw new Error("This document does not support a stress test");
  }

  const full: StressResult = {
    ...result,
    lines: result.lines.map((line) => ({
      ...line,
      amountPaise: Math.round(line.amountPaise),
    })),
    id: `str_${crypto.randomUUID().slice(0, 8)}`,
    engine: "rules",
    createdAt: new Date().toISOString(),
  };
  store.stress.unshift(full);
  store.stress = store.stress.slice(0, 12);
  pushAudit("bharosa", "Stress test calculated", `${doc.name} · ${full.title}`);
  return full;
}

export async function addStressNarrative(result: StressResult): Promise<StressResult> {
  const doc = getDoc(result.documentId);
  if (!doc) return result;
  const narrative = await nvidiaStressNarrative(result, doc, getStore().lang);
  if (!narrative) return result;
  const store = getStore();
  const target = store.stress.find((item) => item.id === result.id);
  if (target) {
    target.narrative = narrative;
    target.engine = "nvidia";
  }
  return target ?? { ...result, narrative, engine: "nvidia" };
}

export function verifyEvidence(docId?: string) {
  const store = getStore();
  const doc = getDoc(docId ?? store.activeDocId);
  if (!doc) throw new Error("Document not found");
  const verified = verifyCitations(doc);
  const sources = doc.facts.filter((fact) => fact.source).length + doc.flags.length;
  pushAudit(
    "bharosa",
    "Evidence verified",
    `${doc.name} · ${verified.verified}/${verified.checked} quotes matched · ${sources} sources`,
  );
  return {
    documentId: doc.id,
    documentName: doc.name,
    checked: verified.checked,
    verified: verified.verified,
    sources,
    passed: verified.checked > 0 && verified.checked === verified.verified,
    verifiedAt: new Date().toISOString(),
    citations: [
      ...doc.flags.slice(0, 3).map((flag) => ({ id: flag.id, ...flag.source })),
      ...doc.facts.filter((fact) => fact.source).slice(0, 2).map((fact) => ({ id: fact.key, ...fact.source }) ),
    ],
  };
}

// ---------------------------------------------------------------------------
// Compare, translate, act, audit
// ---------------------------------------------------------------------------

export function compareLoans(aId: string, bId: string) {
  const a = getDoc(aId);
  const b = getDoc(bId);
  if (!a?.loan || !b?.loan) throw new Error("Choose two loan offers to compare");
  const ca = loanCalc(a);
  const cb = loanCalc(b);
  const offers = [a, b].map((doc, index) => {
    const c = index === 0 ? ca : cb;
    return {
      id: doc.id,
      name: doc.name.split("—")[1]?.trim() ?? doc.name,
      emiPaise: c.emiPaise,
      totalPaise: c.totalPaise,
      interestPaise: c.interestPaise,
      feesPaise: c.feesPaise,
      netDisbursalPaise: c.netDisbursalPaise,
      aprPct: c.aprPct,
      flags: doc.flags.length,
    };
  });
  const lowerTotal = ca.totalPaise <= cb.totalPaise ? a : b;
  const lowerApr = ca.aprPct <= cb.aprPct ? a : b;
  return {
    offers,
    cheaper: lowerTotal.id,
    lowerApr: lowerApr.id,
    differencePaise: Math.abs(Math.round(ca.totalPaise - cb.totalPaise)),
    verdict:
      lowerTotal.id === lowerApr.id
        ? `${lowerTotal.name} is cheaper on both total repayment and effective APR.`
        : `${lowerTotal.name} has the lower total repayment, while ${lowerApr.name} has the lower effective APR — check the fee assumptions before choosing.`,
  };
}

export function translate(lang: Lang) {
  const store = getStore();
  store.lang = lang;
  const doc = requireActiveDoc();
  pushAudit("user", "Language changed", `${doc.name} · ${lang}`);
  return analysisFor(doc, lang);
}

export function createPayment(
  docId: string,
  amountPaise: number,
  payee: string,
  purpose: string,
) {
  const store = getStore();
  const doc = getDoc(docId);
  if (!doc) throw new Error("Document not found");
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
    throw new Error("Enter a valid amount");
  }
  if (amountPaise > 50000000) throw new Error("Payments are capped at ₹5,00,000 per approval");
  const intent: PaymentIntent = {
    id: `pay_${crypto.randomUUID().slice(0, 8)}`,
    documentId: doc.id,
    amountPaise,
    payee:
      payee.trim().slice(0, 80) ||
      (doc.type === "loan"
        ? (doc.loan?.payee ?? "Lender")
        : doc.type === "credit_card"
          ? (doc.card?.payee ?? "Card issuer")
          : (doc.health?.payee ?? "Insurer")),
    purpose: purpose.trim().slice(0, 120),
    status: "awaiting_approval",
    createdAt: new Date().toISOString(),
    token: `apr_${crypto.randomUUID()}`,
  };
  store.payments.unshift(intent);
  pushAudit("user", "Trust checkpoint opened", `${inr(intent.amountPaise)} · ${intent.payee}`);
  return intent;
}

export function confirmPayment(intentId: string, token: string, approvedAt: string) {
  const store = getStore();
  const intent = store.payments.find((item) => item.id === intentId);
  if (!intent) throw new Error("Payment intent not found");
  if (intent.status === "paid") throw new Error("This payment is already approved");
  if (!token || token !== intent.token) throw new Error("Approval token missing or invalid");
  if (!approvedAt) throw new Error("Explicit approval is required before payment");
  intent.status = "paid";
  intent.approvedAt = new Date().toISOString();
  store.metrics.paymentsPaise += intent.amountPaise;
  pushAudit("user", "Payment approval recorded", `${inr(intent.amountPaise)} · ${intent.payee}`);
  return intent;
}

export function addReminder(docId: string) {
  const store = getStore();
  const doc = getDoc(docId);
  if (!doc) throw new Error("Document not found");
  const due = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  const reminder: Reminder = {
    id: `rem_${crypto.randomUUID().slice(0, 8)}`,
    documentId: doc.id,
    title:
      doc.type === "loan"
        ? "Next EMI reminder"
        : doc.type === "credit_card"
          ? "Credit card bill reminder"
          : "Premium due reminder",
    dueAt: due.toISOString(),
    channel: "in-app",
    status: "scheduled",
    createdAt: new Date().toISOString(),
  };
  store.reminders.unshift(reminder);
  pushAudit("user", "Reminder scheduled", `${reminder.title} · 7 days`);
  return reminder;
}

export function escalate(docId: string, reason: string) {
  const store = getStore();
  const doc = getDoc(docId);
  if (!doc) throw new Error("Document not found");
  const escalation: Escalation = {
    id: `esc_${crypto.randomUUID().slice(0, 8)}`,
    documentId: doc.id,
    reason: reason.trim().slice(0, 240) || "Sensitive case needs human review",
    status: "open",
    createdAt: new Date().toISOString(),
  };
  store.escalations.unshift(escalation);
  pushAudit("user", "Case escalated to a human", escalation.reason);
  return escalation;
}

export function ingest(docId: string) {
  const doc = getDoc(docId);
  if (!doc) throw new Error("Document not found");
  doc.status = "parsed";
  pushAudit("system", "Document parsed", `${doc.name} · ${doc.pages} pages`);
  return doc;
}

export function analyseDoc(docId: string) {
  const store = getStore();
  const doc = getDoc(docId);
  if (!doc) throw new Error("Document not found");
  doc.status = "analysed";
  store.metrics.documentsAnalysed = Math.max(store.metrics.documentsAnalysed, 1);
  const verified = verifyCitations(doc);
  pushAudit(
    "bharosa",
    "Analysis completed",
    `${doc.flags.length} flags · ${verified.verified}/${verified.checked} citations verified`,
  );
  return analysisFor(doc, store.lang);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function seed(): Store {
  return {
    docs: [],
    activeDocId: "",
    lang: "en",
    chat: {},
    payments: [],
    reminders: [],
    escalations: [],
    stress: [],
    audit: [
      {
        id: crypto.randomUUID(),
        actor: "system",
        event: "Private workspace created",
        meta: "Isolated to your account · Supabase row-level security",
        at: minutesAgo(1),
      },
    ],
    metrics: {
      documentsAnalysed: 0,
      citationsChecked: 0,
      citationsVerified: 0,
      questions: 0,
      notAvailable: 0,
      paymentsPaise: 0,
      timeToSummarySec: 0,
    },
  };
}

interface RequestContext {
  userId: string;
  store: Store;
}

const requestContext = new AsyncLocalStorage<RequestContext>();

/** Current user's workspace, or a process fallback outside a request. */
function getStore(): Store {
  const context = requestContext.getStore();
  if (context) return context.store;
  const holder = globalThis as typeof globalThis & { [STORE_KEY]?: Store };
  if (!holder[STORE_KEY]) holder[STORE_KEY] = seed();
  return holder[STORE_KEY];
}

const RETIRED_SAMPLE_IDS = new Set(["health-cis", "loan-kfs-a", "loan-kfs-b", "card-mitc"]);

function normalizeSnapshot(raw: Partial<Store>): Store {
  const base = seed();
  const docs = (Array.isArray(raw.docs) ? raw.docs : []).filter(
    (doc) => doc && !RETIRED_SAMPLE_IDS.has(doc.id),
  );
  const active = findDoc(docs, raw.activeDocId ?? "") ?? docs[0];
  const docIds = new Set(docs.map((doc) => doc.id));
  const belongsToDocument = (item: { documentId: string }) => docIds.has(item.documentId);
  return {
    ...base,
    ...raw,
    docs,
    chat: raw.chat ?? {},
    payments: (raw.payments ?? []).filter(belongsToDocument),
    reminders: (raw.reminders ?? []).filter(belongsToDocument),
    escalations: (raw.escalations ?? []).filter(belongsToDocument),
    stress: (raw.stress ?? []).filter(belongsToDocument),
    audit: raw.audit?.length ? raw.audit : base.audit,
    metrics: { ...base.metrics, ...(raw.metrics ?? {}) },
    activeDocId: active?.id ?? "",
  };
}

/** Retained for older call sites; per-request hydration happens in runWithUser. */
export async function ready(): Promise<void> {
  if (requestContext.getStore()) return;
  await runWithUser("local", async () => undefined);
}

/**
 * Run a handler inside one authenticated user's private workspace.
 * The snapshot is loaded once per request and written back afterwards.
 */
export async function runWithUser<T>(userId: string, fn: () => Promise<T> | T): Promise<T> {
  let store: Store | null = null;
  if (getDb()) {
    try {
      const snapshot = await loadSnapshot<Partial<Store>>(userId);
      if (snapshot) store = normalizeSnapshot(snapshot);
    } catch (error) {
      console.warn(
        "[supabase] workspace load failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }
  const context: RequestContext = { userId, store: store ?? seed() };
  return requestContext.run(context, fn);
}

/** Add a document parsed from a real upload to this user's workspace. */
export async function addDocument(doc: Doc) {
  const store = getStore();
  const existing = store.docs.findIndex((item) => item.id === doc.id);
  if (existing >= 0) store.docs[existing] = doc;
  else store.docs.push(doc);
  store.activeDocId = doc.id;
  store.metrics.documentsAnalysed += 1;
  pushAudit("system", "Document uploaded and parsed", `${doc.name} · ${doc.pages} pages · ${doc.clauses.length} clauses`);

  const userId = requestContext.getStore()?.userId;
  if (userId) {
    try {
      const indexed = await indexDocument(userId, doc);
      if (!indexed.skipped) {
        pushAudit(
          "system",
          "Clauses indexed for retrieval",
          `${indexed.indexed} clauses · Pinecone document index`,
        );
      }
    } catch (error) {
      console.warn(
        "[pinecone] indexing failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }
  return doc;
}

/** Rename one document in the current user's library. */
export function renameDocument(documentId: string, name: string) {
  const store = getStore();
  const doc = getDoc(documentId);
  if (!doc) throw new Error("Document not found");
  const next = name.replace(/\s+/g, " ").trim().slice(0, 90);
  if (next.length < 2) throw new Error("Use at least 2 characters for the document name.");
  const previous = doc.name;
  doc.name = next;
  pushAudit("user", "Document renamed", `${previous} → ${next}`);
  return doc;
}

/** Remove a document and everything derived from it in this workspace. */
export function deleteDocument(documentId: string) {
  const store = getStore();
  const index = store.docs.findIndex((doc) => doc.id === documentId);
  if (index < 0) throw new Error("Document not found");
  const [removed] = store.docs.splice(index, 1);
  delete store.chat[removed.id];
  store.stress = store.stress.filter((item) => item.documentId !== removed.id);
  store.payments = store.payments.filter((item) => item.documentId !== removed.id);
  store.reminders = store.reminders.filter((item) => item.documentId !== removed.id);
  store.escalations = store.escalations.filter((item) => item.documentId !== removed.id);
  if (store.activeDocId === removed.id) {
    store.activeDocId = store.docs.length
      ? store.docs[Math.min(index, store.docs.length - 1)].id
      : "";
  }
  pushAudit("user", "Document removed", `${removed.name} · citations and derived checks deleted`);
  return removed.id;
}

/** Mirror the current user's engine state into Supabase. */
export async function persistWorkspace(): Promise<boolean> {
  const store = getStore();
  const context = requestContext.getStore();
  const userId = context?.userId;
  const db = getDb();
  if (!db || !userId) return false;
  try {
    await saveSnapshot(store, userId, userId);

    const { error: docsError } = await db.from("documents").upsert(
      store.docs.map((doc) => ({
        id: doc.id,
        slug: doc.slug,
        name: doc.name,
        issuer: doc.issuer,
        type: doc.type,
        pages: doc.pages,
        status: doc.status,
      })),
    );
    if (docsError) throw docsError;

    const { error: clausesError } = await db.from("clauses").upsert(
      store.docs.flatMap((doc) =>
        doc.clauses.map((clause) => ({
          id: clause.id,
          document_id: doc.id,
          page: clause.page,
          section: clause.section,
          body: clause.text,
          keywords: clause.keywords,
        })),
      ),
    );
    if (clausesError) throw clausesError;

    const analyses = store.docs.map((doc) => {
      const analysis = analysisFor(doc, store.lang);
      return {
        document_id: doc.id,
        lang: store.lang,
        summary: analysis.summary,
        facts: analysis.facts,
        red_flags: analysis.redFlags,
        calc: analysis.calc,
        citations_checked: analysis.citationsChecked,
        citations_verified: analysis.citationsVerified,
        engine: "rules",
      };
    });
    const { error: analysisError } = await db
      .from("analyses")
      .upsert(analyses, { onConflict: "document_id,lang" });
    if (analysisError) throw analysisError;

    const messages = Object.entries(store.chat).flatMap(([documentId, items]) =>
      items.map((item) => ({
        id: item.id,
        document_id: documentId,
        role: item.role,
        body: item.text,
        citations: item.citations,
        grounded: item.grounded,
        lang: item.lang,
        engine: item.engine ?? "rules",
        created_at: item.at,
      })),
    );
    if (messages.length) {
      const { error } = await db
        .from("chat_messages")
        .upsert(messages, { onConflict: "id" });
      if (error) throw error;
    }

    if (store.payments.length) {
      const { error } = await db.from("payment_intents").upsert(
        store.payments.map((payment) => ({
          id: payment.id,
          document_id: payment.documentId,
          amount_paise: payment.amountPaise,
          payee: payment.payee,
          purpose: payment.purpose,
          status: payment.status,
          token: payment.token,
          approved_at: payment.approvedAt ?? null,
          created_at: payment.createdAt,
        })),
        { onConflict: "id" },
      );
      if (error) throw error;
    }

    if (store.reminders.length) {
      const { error } = await db.from("reminders").upsert(
        store.reminders.map((reminder) => ({
          id: reminder.id,
          document_id: reminder.documentId,
          title: reminder.title,
          due_at: reminder.dueAt,
          channel: reminder.channel,
          status: reminder.status,
          created_at: reminder.createdAt,
        })),
        { onConflict: "id" },
      );
      if (error) throw error;
    }

    if (store.escalations.length) {
      const { error } = await db.from("escalations").upsert(
        store.escalations.map((escalation) => ({
          id: escalation.id,
          document_id: escalation.documentId,
          reason: escalation.reason,
          status: escalation.status,
          created_at: escalation.createdAt,
        })),
        { onConflict: "id" },
      );
      if (error) throw error;
    }

    if (store.audit.length) {
      const { error } = await db.from("audit_events").upsert(
        store.audit.map((event) => ({
          id: event.id,
          actor: event.actor,
          event: event.event,
          meta: event.meta,
          created_at: event.at,
        })),
        { onConflict: "id" },
      );
      if (error) throw error;
    }

    if (store.stress.length) {
      const { error } = await db.from("stress_tests").upsert(
        store.stress.map((item) => ({
          id: item.id,
          document_id: item.documentId,
          scenario: item.scenario,
          input: item.input,
          result: {
            title: item.title,
            lines: item.lines,
            verdict: item.verdict,
            citations: item.citations,
            assumptions: item.assumptions,
          },
          narrative: item.narrative ?? null,
          engine: item.engine,
          created_at: item.createdAt,
        })),
        { onConflict: "id" },
      );
      if (error) throw error;
    }

    return true;
  } catch (error) {
    console.warn(
      "[supabase] persist failed:",
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}

function pushAudit(actor: AuditEvent["actor"], event: string, meta: string) {
  const store = getStore();
  store.audit.unshift({
    id: crypto.randomUUID(),
    actor,
    event,
    meta,
    at: new Date().toISOString(),
  });
  store.audit = store.audit.slice(0, 30);
}

function getActiveDoc() {
  const store = getStore();
  return getDoc(store.activeDocId) ?? store.docs[0];
}

function requireActiveDoc() {
  const doc = getActiveDoc();
  if (!doc) throw new Error("Upload a document to start your workspace");
  return doc;
}

export function setActiveDoc(docId: string) {
  const store = getStore();
  const doc = getDoc(docId);
  if (!doc) throw new Error("Document not found");
  store.activeDocId = doc.id;
  pushAudit("user", "Document opened", doc.name);
  return doc;
}

export function metricsFor(): Metrics {
  const store = getStore();
  const verified = store.docs.reduce(
    (acc, doc) => {
      const item = verifyCitations(doc);
      acc.checked += item.checked;
      acc.verified += item.verified;
      return acc;
    },
    { checked: 0, verified: 0 },
  );
  return {
    ...store.metrics,
    documentsAnalysed: store.docs.length,
    citationsChecked: verified.checked,
    citationsVerified: verified.verified,
    paymentsPaise: store.payments
      .filter((payment) => payment.status === "paid")
      .reduce((total, payment) => total + payment.amountPaise, 0),
  };
}

export interface WorkspaceData {
  empty?: false;
  documents: DocSummary[];
  activeDocId: string;
  active: Doc;
  lang: Lang;
  analysis: Analysis;
  messages: ChatMessage[];
  suggestions: string[];
  payments: Omit<PaymentIntent, "token">[];
  reminders: Reminder[];
  escalations: Escalation[];
  audit: AuditEvent[];
  stress: StressResult[];
  metrics: Metrics;
  compare: ReturnType<typeof compareLoans> | null;
}

export interface EmptyWorkspace {
  empty: true;
  documents: DocSummary[];
  activeDocId: null;
  lang: Lang;
  messages: [];
  payments: Omit<PaymentIntent, "token">[];
  reminders: Reminder[];
  escalations: Escalation[];
  audit: AuditEvent[];
  metrics: Metrics;
}

export type WorkspaceResponse = WorkspaceData | EmptyWorkspace;

export function workspace(): WorkspaceData {
  const store = getStore();
  const doc = requireActiveDoc();
  const documents: DocSummary[] = store.docs.map((item) => ({
    id: item.id,
    name: item.name,
    issuer: item.issuer,
    type: item.type,
    pages: item.pages,
    status: item.status,
    flags: item.flags.length,
    facts: item.facts.length,
  }));
  return {
    documents,
    activeDocId: doc.id,
    active: doc,
    lang: store.lang,
    analysis: analysisFor(doc, store.lang),
    messages: store.chat[doc.id] ?? [],
    suggestions: suggestionsFor(doc.id),
    payments: store.payments.map(({ token: _token, ...rest }) => rest),
    reminders: store.reminders,
    escalations: store.escalations,
    audit: store.audit,
    stress: store.stress,
    metrics: metricsFor(),
    compare: (() => {
      const loans = store.docs.filter((item) => item.loan);
      return loans.length >= 2 ? compareLoans(loans[0].id, loans[1].id) : null;
    })(),
  };
}

/** Safe response for new accounts that have not uploaded a document yet. */
export function workspaceOrEmpty(): WorkspaceResponse {
  const store = getStore();
  if (store.docs.length === 0) {
    return {
      empty: true,
      documents: [],
      activeDocId: null,
      lang: store.lang,
      messages: [],
      payments: [],
      reminders: [],
      escalations: [],
      audit: store.audit,
      metrics: metricsFor(),
    };
  }
  return workspace();
}

export function act(input: {
  action: string;
  documentId?: string;
  amountPaise?: number;
  payee?: string;
  purpose?: string;
  intentId?: string;
  token?: string;
  approvedAt?: string;
  reason?: string;
}) {
  const store = getStore();
  const docId = input.documentId ?? store.activeDocId;
  switch (input.action) {
    case "payment_intent": {
      const doc = getDoc(docId);
      if (!doc) throw new Error("Document not found");
      const defaultAmount =
        doc.type === "loan"
          ? (doc.loan?.feePaise ?? 0)
          : doc.type === "credit_card"
            ? (doc.card?.annualFeePaise ?? 0)
            : (doc.health?.premiumPaise ?? 0);
      return {
        intent: createPayment(
          docId,
          input.amountPaise ?? defaultAmount,
          input.payee ??
            (doc.type === "loan"
              ? (doc.loan?.payee ?? doc.issuer)
              : doc.type === "credit_card"
                ? (doc.card?.payee ?? doc.issuer)
                : (doc.health?.payee ?? doc.issuer)),
          input.purpose ??
            (doc.type === "loan"
              ? "Loan processing fee"
              : doc.type === "credit_card"
                ? "Credit card annual fee"
                : "Health policy premium"),
        ),
      };
    }
    case "payment_confirm": {
      const payment = confirmPayment(
        input.intentId ?? "",
        input.token ?? "",
        input.approvedAt ?? "",
      );
      return {
        payment: {
          id: payment.id,
          status: payment.status,
          approvedAt: payment.approvedAt,
          amountPaise: payment.amountPaise,
          payee: payment.payee,
        },
      };
    }
    case "reminder":
      return { reminder: addReminder(docId) };
    case "analyse":
      return { analysis: analyseDoc(docId) };
    case "ingest":
      return { document: ingest(docId) };
    default:
      throw new Error("Unknown action");
  }
}
