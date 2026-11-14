import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractText, getDocumentProxy, renderPageAsImage } from "unpdf";
import type {
  CardTerms,
  Clause,
  Citation,
  Doc,
  Fact,
  HealthTerms,
  LoanTerms,
  ProductType,
  RedFlag,
} from "@/lib/bharosa";

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const OCR_PAGE_LIMIT = 4;
const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|bmp|tiff?)$/i;

export interface IntakeFields {
  sumInsured?: number;
  premium?: number;
  copayPct?: number;
  roomCap?: number;
  waitingMonths?: number;
  principal?: number;
  annualPct?: number;
  months?: number;
  fee?: number;
  prepayPct?: number;
  lateFee?: number;
  creditLimit?: number;
  minDuePct?: number;
  annualFee?: number;
}

export interface ExtractedUpload {
  name: string;
  pages: string[];
  text: string;
  type: ProductType;
  fields: IntakeFields;
  missing: string[];
}

const MONEY_UNITS: Record<string, number> = {
  k: 1_000,
  thousand: 1_000,
  lakh: 100_000,
  lac: 100_000,
  lakhs: 100_000,
  crore: 10_000_000,
  cr: 10_000_000,
};

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function inr(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function toPaise(value: number) {
  return Math.max(0, Math.round(value * 100));
}

function moneyValue(raw: string, unit?: string) {
  const numeric = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(numeric)) return 0;
  return numeric * (unit ? (MONEY_UNITS[unit.toLowerCase()] ?? 1) : 1);
}

function amountAfter(text: string, labels: RegExp) {
  const match = labels.exec(text);
  if (!match) return null;
  const tail = text.slice(match.index + match[0].length, match.index + match[0].length + 110);
  const amount = /(?:₹|rs\.?|inr)?\s*([\d][\d,]*(?:\.\d{1,2})?)\s*(k|thousand|lakhs?|lacs?|crores?|cr)?/i.exec(
    tail,
  );
  if (!amount) return null;
  return moneyValue(amount[1], amount[2]);
}

function percentAfter(text: string, labels: RegExp) {
  const match = labels.exec(text);
  if (!match) return null;
  const tail = text.slice(match.index + match[0].length, match.index + match[0].length + 100);
  const percent = /([\d]+(?:\.\d{1,2})?)\s*(?:%|percent\b|per\s*cent\b)/i.exec(tail);
  return percent ? Number(percent[1]) : null;
}

function monthsAfter(text: string, labels: RegExp) {
  const match = labels.exec(text);
  if (!match) return null;
  const tail = text.slice(match.index + match[0].length, match.index + match[0].length + 90);
  const months = /([\d]{1,3})\s*(?:months?|mahine|emi)\b/i.exec(tail);
  if (months) return Number(months[1]);
  const years = /([\d]{1,2})\s*(?:years?|yrs?|saal)\b/i.exec(tail);
  if (years) return Number(years[1]) * 12;
  return null;
}

function splitClauses(pages: string[], docId: string): Clause[] {
  const clauses: Clause[] = [];
  pages.forEach((page, pageIndex) => {
    const blocks = page
      .split(/\n{2,}|\r?\n/)
      .map(clean)
      .filter((line) => line.length >= 24);
    let buffer = "";
    for (const block of blocks) {
      buffer = buffer ? `${buffer} ${block}` : block;
      if (buffer.length < 90) continue;
      const text = buffer.slice(0, 1200);
      clauses.push({
        id: `${docId}-c${clauses.length + 1}`,
        page: pageIndex + 1,
        section: `Page ${pageIndex + 1}`,
        text,
        keywords: [],
      });
      buffer = "";
      if (clauses.length >= 120) break;
    }
    if (buffer.length >= 24 && clauses.length < 120) {
      clauses.push({
        id: `${docId}-c${clauses.length + 1}`,
        page: pageIndex + 1,
        section: `Page ${pageIndex + 1}`,
        text: buffer.slice(0, 1200),
        keywords: [],
      });
    }
  });
  if (!clauses.length) {
    clauses.push({
      id: `${docId}-c1`,
      page: 1,
      section: "Page 1",
      text: pages.join(" ").slice(0, 1200) || "No readable text was found.",
      keywords: [],
    });
  }
  return clauses;
}

function cite(clause: Clause): Citation {
  return {
    page: clause.page,
    clause: clause.section,
    quote: clause.text.slice(0, 240),
  };
}

function firstClause(clauses: Clause[], labels: RegExp) {
  return clauses.find((clause) => labels.test(clause.text));
}

function fullText(clauses: Clause[]) {
  return clauses.map((clause) => clause.text).join("\n");
}

export function classifyDocument(text: string): ProductType {
  const lower = text.toLowerCase();
  const score = {
    health_insurance:
      (lower.match(/sum insured|health|hospital|mediclaim|policy|copay|co-pay|waiting period/g) ?? [])
        .length,
    loan: (lower.match(/loan|emi|kfs|interest rate|sanction|disburse|prepay|tenure/g) ?? []).length,
    credit_card:
      (lower.match(/credit card|card|minimum due|revolving|mitc|annual fee|statement/g) ?? [])
        .length,
  };
  return (Object.entries(score).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "loan") as ProductType;
}

export function extractFields(text: string, type: ProductType): IntakeFields {
  const fields: IntakeFields = {};

  if (type === "loan") {
    const principal = amountAfter(text, /(?:loan amount|sanctioned amount|amount sanctioned|principal amount|amount of loan)/i);
    if (principal) fields.principal = principal;
    const rate = percentAfter(text, /(?:interest rate|rate of interest|annual interest|roi)/i);
    if (rate) fields.annualPct = rate;
    const months = monthsAfter(text, /(?:tenure|loan term|repayment period|duration)/i);
    if (months) fields.months = months;
    const fee = amountAfter(text, /(?:processing fee|origination fee|upfront fee|documentation charges)/i);
    if (fee) fields.fee = fee;
    const prepay = percentAfter(text, /(?:prepayment|foreclosure|pre-closure)/i);
    if (prepay) fields.prepayPct = prepay;
    const late = amountAfter(text, /(?:late payment|penal charge|bounce charge)/i);
    if (late) fields.lateFee = late;
  }

  if (type === "health_insurance") {
    const sum = amountAfter(text, /(?:sum insured|sum assured|coverage amount|insured amount)/i);
    if (sum) fields.sumInsured = sum;
    const premium = amountAfter(text, /(?:premium|annual premium)/i);
    if (premium) fields.premium = premium;
    const copay = percentAfter(text, /(?:co-?pay|co-?payment)/i);
    if (copay !== null) fields.copayPct = copay;
    const room = amountAfter(text, /(?:room rent|room charges|room rent limit)/i);
    if (room) fields.roomCap = room;
    const waiting = monthsAfter(text, /(?:waiting period|pre-existing)/i);
    if (waiting) fields.waitingMonths = waiting;
  }

  if (type === "credit_card") {
    const limit = amountAfter(text, /(?:credit limit|credit line)/i);
    if (limit) fields.creditLimit = limit;
    const apr = percentAfter(text, /(?:annual percentage rate|apr|annual interest|revolving interest|interest rate)/i);
    if (apr) fields.annualPct = apr;
    const minDue = percentAfter(text, /(?:minimum due|minimum amount due|minimum payment)/i);
    if (minDue !== null) fields.minDuePct = minDue;
    const late = amountAfter(text, /(?:late payment fee|late fee|late payment charge)/i);
    if (late) fields.lateFee = late;
    const annual = amountAfter(text, /(?:annual fee|joining fee|membership fee)/i);
    if (annual) fields.annualFee = annual;
  }

  return fields;
}

function missingFields(type: ProductType, fields: IntakeFields) {
  const missing: string[] = [];
  if (type === "loan") {
    if (!fields.principal) missing.push("principal");
    if (!fields.annualPct) missing.push("annualPct");
    if (!fields.months) missing.push("months");
  }
  if (type === "health_insurance" && !fields.sumInsured) missing.push("sumInsured");
  if (type === "credit_card") {
    if (!fields.creditLimit) missing.push("creditLimit");
    if (!fields.annualPct) missing.push("annualPct");
  }
  return missing;
}

async function runOcr(image: Uint8Array): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const cachePath = join(tmpdir(), "bharosa-tessdata");
  await mkdir(cachePath, { recursive: true });
  const worker = await createWorker("eng", 1, { cachePath });
  try {
    const result = await worker.recognize(Buffer.from(image));
    return clean(result.data.text);
  } finally {
    await worker.terminate();
  }
}

async function ocrPdfPages(buffer: Uint8Array): Promise<{ pages: string[]; totalPages: number }> {
  const pdf = await getDocumentProxy(buffer);
  const totalPages = pdf.numPages;
  if (totalPages > OCR_PAGE_LIMIT) {
    throw new Error(
      `This scan has ${totalPages} pages. OCR reads up to ${OCR_PAGE_LIMIT} pages at a time — split the scan or upload the text PDF.`,
    );
  }
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    const image = await renderPageAsImage(pdf, pageNumber, {
      scale: 1.6,
      format: "png",
      canvasImport: () => import("@napi-rs/canvas"),
    });
    pages.push(await runOcr(image));
  }
  return { pages, totalPages };
}

export async function readUpload(
  file: File,
): Promise<{ name: string; pages: string[]; totalPages: number; ocr: boolean }> {
  if (file.size === 0) throw new Error("The uploaded file is empty.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Please upload a file smaller than 12 MB.");
  const buffer = new Uint8Array(await file.arrayBuffer());
  const name = file.name || "Uploaded document";
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(name);
  const isImage = file.type.startsWith("image/") || IMAGE_EXTENSIONS.test(name);

  if (isPdf) {
    // PDF.js detaches the input buffer, so keep a copy for the OCR fallback.
    const { text, totalPages } = await extractText(buffer.slice(), { mergePages: false });
    const pages = text.map((page) => clean(page));
    if (pages.join("").length >= 80) {
      return { name, pages: pages.slice(0, totalPages), totalPages, ocr: false };
    }

    const scanned = await ocrPdfPages(buffer);
    if (scanned.pages.join("").length < 80) {
      throw new Error(
        "This scan is too blurry to read. Photograph the pages straight-on in good light, or upload the original text PDF.",
      );
    }
    return { name, pages: scanned.pages, totalPages: scanned.totalPages, ocr: true };
  }

  if (isImage) {
    const text = await runOcr(buffer);
    if (text.length < 80) {
      throw new Error(
        "We could not read enough text from that photo. Use a sharp, well-lit image that fills the frame with the document.",
      );
    }
    return { name, pages: [text], totalPages: 1, ocr: true };
  }

  if (file.type.startsWith("text/") || /\.(txt|md|text)$/i.test(name)) {
    const text = new TextDecoder().decode(buffer);
    if (clean(text).length < 80) throw new Error("The text file is too short to analyse.");
    const pages = text.split(/\f/).map(clean).filter(Boolean);
    return { name, pages, totalPages: pages.length, ocr: false };
  }

  throw new Error("Upload a PDF, a JPG/PNG/WebP photo, or a plain-text (.txt) document.");
}

export function analyseText(input: {
  name: string;
  pages: string[];
  type: ProductType;
  fields: IntakeFields;
}): ExtractedUpload {
  const text = input.pages.join("\n");
  const detected = extractFields(text, input.type);
  const fields: IntakeFields = { ...detected };
  for (const [key, value] of Object.entries(input.fields)) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      fields[key as keyof IntakeFields] = value;
    }
  }
  return {
    name: input.name,
    pages: input.pages,
    text,
    type: input.type,
    fields,
    missing: missingFields(input.type, fields),
  };
}

export function buildUploadedDocument(upload: ExtractedUpload): Doc {
  const id = `upload-${createHash("sha256").update(upload.text).digest("hex").slice(0, 12)}`;
  const clauses = splitClauses(upload.pages, id);
  const text = fullText(clauses);
  const type = upload.type;
  const fields = upload.fields;
  const facts: Fact[] = [];
  const flags: RedFlag[] = [];
  const issuer = "Uploaded document";
  const name = upload.name.replace(/\.(pdf|txt|md|text)$/i, "").slice(0, 90) || "Uploaded document";

  const pushFact = (
    key: string,
    label: string,
    value: string,
    evidence: "stated" | "inferred" | "not_available",
    labels?: RegExp,
  ) => {
    const clause = labels ? firstClause(clauses, labels) : undefined;
    facts.push({
      key,
      label,
      value,
      evidence,
      ...(clause ? { source: cite(clause) } : {}),
    });
  };

  const pushFlag = (
    ruleId: string,
    severity: "high" | "medium" | "low",
    title: string,
    explain: string,
    example: string,
    labels?: RegExp,
  ) => {
    const clause = (labels ? firstClause(clauses, labels) : undefined) ?? clauses[0];
    flags.push({
      id: `RF-UP-${ruleId.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`,
      ruleId,
      severity,
      title: { en: title, hi: title, hinglish: title },
      explain: { en: explain, hi: explain, hinglish: explain },
      example,
      source: cite(clause),
    });
  };

  let loan: LoanTerms | undefined;
  let health: HealthTerms | undefined;
  let card: CardTerms | undefined;

  if (type === "loan") {
    const principal = toPaise(fields.principal ?? 0);
    const annualPct = fields.annualPct ?? 0;
    const months = Math.max(1, Math.round(fields.months ?? 0));
    const fee = toPaise(fields.fee ?? 0);
    const prepayPct = fields.prepayPct ?? 0;
    loan = {
      principalPaise: principal,
      annualPct,
      months,
      feePaise: fee,
      otherPaise: 0,
      prepayPct,
      prepayFeePaise: 0,
      latePct: 2,
      lateMinPaise: toPaise(fields.lateFee ?? 500),
      payee: issuer,
    };
    pushFact("principal", "Loan amount", inr(principal), "stated", /(?:loan amount|sanctioned|principal)/i);
    pushFact("interest_rate", "Interest rate", `${annualPct}% per year`, "stated", /(?:interest rate|rate of interest|roi)/i);
    pushFact("tenure", "Tenure", `${months} months`, "stated", /(?:tenure|repayment period|loan term)/i);
    if (fee) pushFact("fees", "Upfront fees", inr(fee), "stated", /(?:processing fee|origination|documentation charges)/i);
    pushFact("net_disbursal", "Net amount received", inr(Math.max(0, principal - fee)), "inferred");
    pushFact("total_repayment", "Total repayment", "Calculated in the analysis", "inferred");
    if (fee > 0) {
      pushFlag(
        "upfront-fee",
        "high",
        `${inr(fee)} is deducted before disbursal`,
        "The advertised rate applies to the full principal, but you receive less. The effective APR is higher than the quoted rate.",
        `On a ${inr(principal)} loan, ${inr(fee)} in fees means you receive ${inr(Math.max(0, principal - fee))}.`,
        /(?:processing fee|origination|documentation charges)/i,
      );
    }
    if (prepayPct > 0) {
      pushFlag(
        "prepayment",
        "medium",
        `${prepayPct}% prepayment charge`,
        "Closing the loan early can cost a percentage of the outstanding balance.",
        `Prepaying when ${inr(principal)} is outstanding could add about ${inr((principal * prepayPct) / 100)}.`,
        /(?:prepayment|foreclosure|pre-closure)/i,
      );
    }
    if (annualPct >= 20) {
      pushFlag(
        "high-rate",
        "high",
        `${annualPct}% annual interest`,
        "A high contractual rate compounds the cost of borrowing over the full tenure.",
        `Every ${inr(100000)} borrowed costs about ${inr((100000 * annualPct) / 100)} a year in interest alone.`,
        /(?:interest rate|rate of interest)/i,
      );
    }
  }

  if (type === "health_insurance") {
    const sumInsured = toPaise(fields.sumInsured ?? 0);
    const premium = toPaise(fields.premium ?? 0);
    const copayPct = fields.copayPct ?? 0;
    const roomCap = toPaise(fields.roomCap ?? 0);
    const waitingMonths = fields.waitingMonths ?? 0;
    health = {
      sumInsuredPaise: sumInsured,
      premiumPaise: premium,
      copayPct,
      roomCapPct: sumInsured ? Math.round((roomCap / sumInsured) * 1000) / 10 : 0,
      roomCapPaise: roomCap,
      roomDays: 5,
      roomPerDayPaise: 800000,
      claimPaise: Math.min(12000000, sumInsured || 12000000),
      subLimitPaise: 0,
      waitingMonths,
      payee: issuer,
    };
    pushFact("sum_insured", "Sum insured", inr(sumInsured), "stated", /(?:sum insured|sum assured|coverage amount)/i);
    if (premium) pushFact("premium", "Annual premium", inr(premium), "stated", /(?:premium)/i);
    pushFact("copay", "Co-payment", `${copayPct}%`, "stated", /(?:co-?pay|co-?payment)/i);
    if (roomCap) pushFact("room_cap", "Room rent limit", `${inr(roomCap)} per day`, "stated", /(?:room rent|room charges)/i);
    pushFact("waiting", "Waiting period", `${waitingMonths} months`, "stated", /(?:waiting period|pre-existing)/i);
    if (copayPct > 0) {
      pushFlag(
        "copay",
        "high",
        `${copayPct}% co-pay on every claim`,
        "You pay this share of the admissible bill even when the claim is approved.",
        `On a ${inr(12000000)} claim, a ${copayPct}% co-pay is ${inr((12000000 * copayPct) / 100)}.`,
        /(?:co-?pay|co-?payment)/i,
      );
    }
    if (roomCap && sumInsured && roomCap < sumInsured * 0.02) {
      pushFlag(
        "room-cap",
        "medium",
        `Room rent capped at ${inr(roomCap)} a day`,
        "Choosing a costlier room reduces the admissible bill, and associated charges can shrink with it.",
        `A room at ${inr(800000)} a day for five days exceeds the cap by ${inr(Math.max(0, 800000 - roomCap) * 5)}.`,
        /(?:room rent|room charges)/i,
      );
    }
    if (waitingMonths > 0) {
      pushFlag(
        "waiting",
        "high",
        `${waitingMonths}-month waiting period`,
        "Conditions that existed before the policy started are not covered until this period ends.",
        "A claim for a pre-existing condition inside the waiting period can be rejected.",
        /(?:waiting period|pre-existing)/i,
      );
    }
  }

  if (type === "credit_card") {
    const creditLimit = toPaise(fields.creditLimit ?? 0);
    const annualPct = fields.annualPct ?? 0;
    const minDuePct = fields.minDuePct ?? 5;
    const lateFee = toPaise(fields.lateFee ?? 0);
    const annualFee = toPaise(fields.annualFee ?? 0);
    card = {
      creditLimitPaise: creditLimit,
      revolveBalancePaise: Math.min(creditLimit, 5000000),
      annualPct,
      minDuePct,
      minDueFloorPaise: 20000,
      lateFeePaise: lateFee,
      annualFeePaise: annualFee,
      annualFeeWaiverSpendPaise: 0,
      graceDays: 45,
      cashAdvancePct: 2.5,
      forexMarkupPct: 3.5,
      payee: issuer,
    };
    pushFact("credit_limit", "Credit limit", inr(creditLimit), "stated", /(?:credit limit|credit line)/i);
    pushFact("apr", "Revolving APR", `${annualPct}%`, "stated", /(?:apr|annual percentage rate|annual interest)/i);
    pushFact("min_due", "Minimum due", `${minDuePct}% of balance`, "stated", /(?:minimum due|minimum payment)/i);
    if (lateFee) pushFact("late_fee", "Late fee", inr(lateFee), "stated", /(?:late payment|late fee)/i);
    if (annualFee) pushFact("annual_fee", "Annual fee", inr(annualFee), "stated", /(?:annual fee|joining fee)/i);
    if (annualPct >= 30) {
      pushFlag(
        "high-apr",
        "high",
        `${annualPct}% annual interest on revolving credit`,
        "Carrying a balance month to month makes the effective cost much higher than the headline rate.",
        `A ${inr(5000000)} balance can cost about ${inr((5000000 * annualPct) / 1200)} a month in interest.`,
        /(?:apr|annual percentage rate|revolving)/i,
      );
    }
    if (lateFee) {
      pushFlag(
        "late-fee",
        "medium",
        `${inr(lateFee)} late payment fee`,
        "Missing the due date adds a flat fee and interest keeps running.",
        "One missed due date adds the fee on top of that month's interest.",
        /(?:late payment|late fee)/i,
      );
    }
  }

  if (!facts.length) {
    pushFact(
      "document",
      "Document",
      "Text extracted successfully; no structured key fact matched.",
      "inferred",
    );
  }

  return {
    id,
    slug: id,
    name,
    issuer,
    type,
    pages: upload.pages.length,
    hash: `sha256:${createHash("sha256").update(text).digest("hex").slice(0, 16)}`,
    status: "analysed",
    clauses,
    facts,
    flags,
    loan,
    health,
    card,
  };
}

export const REQUIRED_FIELDS: Record<ProductType, Array<keyof IntakeFields>> = {
  loan: ["principal", "annualPct", "months"],
  health_insurance: ["sumInsured"],
  credit_card: ["creditLimit", "annualPct"],
};

export const FIELD_LABELS: Record<keyof IntakeFields, string> = {
  sumInsured: "Sum insured (₹)",
  premium: "Annual premium (₹)",
  copayPct: "Co-pay (%)",
  roomCap: "Room rent cap per day (₹)",
  waitingMonths: "Waiting period (months)",
  principal: "Loan amount (₹)",
  annualPct: "Interest rate (% per year)",
  months: "Tenure (months)",
  fee: "Upfront fees (₹)",
  prepayPct: "Prepayment charge (%)",
  lateFee: "Late fee (₹)",
  creditLimit: "Credit limit (₹)",
  minDuePct: "Minimum due (%)",
  annualFee: "Annual fee (₹)",
};
