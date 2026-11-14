"use client";

import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FileUp, Loader2, Upload, X } from "lucide-react";
import type { ProductType, WorkspaceData } from "@/lib/bharosa";
import { Button, cn } from "@/components/ui";

const TYPES: Array<{ id: ProductType | "auto"; label: string }> = [
  { id: "auto", label: "Detect" },
  { id: "health_insurance", label: "Health" },
  { id: "loan", label: "Loan" },
  { id: "credit_card", label: "Card" },
];

const FIELDS: Record<
  ProductType,
  Array<{ key: string; label: string; suffix: string; step?: string }>
> = {
  loan: [
    { key: "principal", label: "Loan amount", suffix: "₹" },
    { key: "annualPct", label: "Interest rate", suffix: "% p.a.", step: "0.01" },
    { key: "months", label: "Tenure", suffix: "months" },
    { key: "fee", label: "Upfront fees", suffix: "₹" },
    { key: "prepayPct", label: "Prepayment charge", suffix: "%", step: "0.01" },
  ],
  health_insurance: [
    { key: "sumInsured", label: "Sum insured", suffix: "₹" },
    { key: "premium", label: "Annual premium", suffix: "₹" },
    { key: "copayPct", label: "Co-pay", suffix: "%", step: "0.01" },
    { key: "roomCap", label: "Room rent cap / day", suffix: "₹" },
    { key: "waitingMonths", label: "Waiting period", suffix: "months" },
  ],
  credit_card: [
    { key: "creditLimit", label: "Credit limit", suffix: "₹" },
    { key: "annualPct", label: "Revolving APR", suffix: "%", step: "0.01" },
    { key: "minDuePct", label: "Minimum due", suffix: "%", step: "0.01" },
    { key: "lateFee", label: "Late fee", suffix: "₹" },
    { key: "annualFee", label: "Annual fee", suffix: "₹" },
  ],
};

export function UploadDocument({
  onDone,
  trigger,
}: {
  onDone: (workspace: WorkspaceData) => void;
  trigger?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ProductType | "auto">("auto");
  const [file, setFile] = useState<File | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [needsFields, setNeedsFields] = useState(false);
  const [pages, setPages] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const fieldDefs = FIELDS[type === "auto" ? "health_insurance" : type];

  const reset = () => {
    setFile(null);
    setValues({});
    setNeedsFields(false);
    setPages(null);
    setError("");
    setBusy(false);
  };

  const close = () => {
    if (busy) return;
    setOpen(false);
    reset();
  };

  const submit = async () => {
    if (!file) {
      setError("Choose a document, photo or text file first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      if (type !== "auto" || needsFields) form.set("type", type);
      if (needsFields) form.set("fields", JSON.stringify(values));
      const response = await fetch("/api/documents/upload", { method: "POST", body: form });
      const payload = (await response.json()) as WorkspaceData & {
        error?: string;
        missing?: string[];
        extracted?: Record<string, number>;
        pages?: number;
        type?: ProductType;
        ocr?: boolean;
      };
      if (response.status === 422) {
        const detectedType = payload.type ?? (type === "auto" ? "health_insurance" : type);
        const next: Record<string, string> = {};
        setType(detectedType);
        for (const field of FIELDS[detectedType]) {
          const value = payload.extracted?.[field.key];
          next[field.key] = typeof value === "number" ? String(value) : "";
        }
        setValues(next);
        setPages(payload.pages ?? null);
        setNeedsFields(true);
        setError(
          payload.error ??
            `${payload.ocr ? "OCR read the scan. " : ""}Add the missing values to continue.`,
        );
        return;
      }
      if (!response.ok) throw new Error(payload.error ?? "Upload failed.");
      onDone(payload);
      setOpen(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {trigger ? (
        <span className="contents" onClick={() => setOpen(true)}>
          {trigger}
        </span>
      ) : (
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)} disabled={busy}>
          <Upload />
          Upload
        </Button>
      )}

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-navy/45 p-3 backdrop-blur-sm sm:items-center">
          <div className="rc-pop max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-2xl border border-line bg-card p-4 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[14px] font-bold text-navy">Scan or upload a document</p>
                <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-2">
                  PDF, photo or text, up to 12 MB. Scans are read with OCR; the extracted text and
                  citations are saved only in your private workspace.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg text-ink-3 hover:bg-page hover:text-navy"
                aria-label="Close upload"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-3">
              <p className="text-[10px] font-semibold text-ink-3 uppercase">Document type</p>
              <div className="mt-1 flex rounded-lg bg-page p-0.5 ring-1 ring-line">
                {TYPES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setType(item.id);
                      setNeedsFields(false);
                      setValues({});
                    }}
                    className={cn(
                      "flex-1 cursor-pointer rounded-[7px] px-2 py-1.5 text-[10.5px] font-semibold transition-colors",
                      type === item.id ? "bg-card text-navy shadow-sm" : "text-ink-3 hover:text-navy",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => input.current?.click()}
              className="mt-3 flex w-full cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed border-line bg-page/60 px-3 py-5 text-center hover:border-sky/50 hover:bg-sky-soft/40"
            >
              <FileUp className="size-5 text-sky" />
              <span className="text-[11.5px] font-semibold text-navy">
                {file ? file.name : "Choose a PDF, photo or .txt file"}
              </span>
              <span className="text-[9.5px] text-ink-3">
                {file
                  ? `${(file.size / 1024).toFixed(0)} KB${pages ? ` · ${pages} pages` : ""}${file.type.startsWith("image/") ? " · OCR" : ""}`
                  : "JPG, PNG, WebP, PDF or TXT · scans and photos are OCR-ready"}
              </span>
            </button>
            <input
              ref={input}
              type="file"
              accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp,.bmp,.tif,.tiff,text/plain,application/pdf,image/*"
              className="hidden"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setNeedsFields(false);
                setValues({});
                setError("");
              }}
            />

            {needsFields && (
              <div className="mt-3 rounded-xl border border-line bg-page/50 p-3">
                <p className="text-[10.5px] font-semibold text-navy">
                  Confirm the key numbers
                </p>
                <p className="mt-0.5 text-[9.5px] leading-relaxed text-ink-3">
                  These power the calculators. Pre-filled values were found in the document; edit
                  anything that looks wrong. Blank optional values stay at zero.
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {fieldDefs.map((field) => (
                    <label key={field.key} className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-medium text-ink-3">{field.label}</span>
                      <span className="flex items-center gap-1 rounded-lg border border-line bg-card px-2 py-1">
                        <input
                          type="number"
                          min="0"
                          step={field.step ?? "1"}
                          value={values[field.key] ?? ""}
                          onChange={(event) =>
                            setValues((prev) => ({ ...prev, [field.key]: event.target.value }))
                          }
                          className="w-full bg-transparent text-[11px] font-semibold text-navy outline-none tabular"
                          placeholder="0"
                        />
                        <span className="text-[9px] text-ink-3">{field.suffix}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p className="mt-2 rounded-lg bg-bad-soft px-2.5 py-1.5 text-[10px] leading-relaxed font-medium text-[#b42318]">
                {error}
              </p>
            )}

            <div className="mt-3 flex items-center justify-end gap-1.5">
              <Button variant="ghost" size="sm" onClick={close} disabled={busy}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={() => void submit()} disabled={busy || !file}>
                {busy ? <Loader2 className="animate-spin" /> : <Upload />}
                {busy
                  ? "Reading document…"
                  : needsFields
                    ? "Finish analysis"
                    : "Upload & analyse"}
              </Button>
            </div>
          </div>
          </div>,
          document.body,
        )}
    </>
  );
}
