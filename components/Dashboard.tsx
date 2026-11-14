"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  Bot,
  BrainCircuit,
  Check,
  CircleAlert,
  CircleCheck,
  Clock,
  Database,
  Download,
  FileCheck2,
  FileSearch,
  FileText,
  FlaskConical,
  Gauge,
  IndianRupee,
  Languages,
  Loader2,
  MessageSquare,
  Mic,
  RotateCcw,
  Quote,
  ScanText,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import type { StressResult } from "@/lib/bharosa";
import { useRealtimeWorkspace } from "@/lib/use-realtime";
import { UploadDocument } from "@/components/UploadDocument";
import { ManageDocuments } from "@/components/ManageDocuments";
import type {
  ChatMessage,
  Citation,
  EmptyWorkspace,
  Lang,
  PaymentIntent,
  RedFlag,
  Severity,
  WorkspaceData,
  WorkspaceResponse,
} from "@/lib/bharosa";
import { WorkspacePhone } from "@/components/WorkspacePhone";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Button,
  Card,
  CardHeader,
  Chip,
  Logo,
  Skeleton,
  cn,
  formatDate,
  timeAgo,
} from "@/components/ui";

const LANGS: { id: Lang; label: string; short: string }[] = [
  { id: "en", label: "English", short: "EN" },
  { id: "hi", label: "हिंदी", short: "हिं" },
  { id: "hinglish", label: "Hinglish", short: "HI" },
];

const SEVERITY: Record<Severity, { label: string; tone: "bad" | "warn" | "sky"; bar: string }> = {
  high: { label: "High risk", tone: "bad", bar: "border-l-bad" },
  medium: { label: "Medium", tone: "warn", bar: "border-l-warn" },
  low: { label: "Low", tone: "sky", bar: "border-l-sky" },
};

type RecorderState = "idle" | "recording" | "processing";

function money(paise: number, fraction = 0) {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    maximumFractionDigits: fraction,
    minimumFractionDigits: fraction,
  })}`;
}

function pct(value: number) {
  return `${value.toFixed(1)}%`;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "The request failed.");
  return payload;
}

export function Dashboard({ embed = false }: { embed?: boolean }) {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [empty, setEmpty] = useState<EmptyWorkspace | null>(null);
  const [fatal, setFatal] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "ok" | "bad" } | null>(null);
  const [question, setQuestion] = useState("");
  const [voice, setVoice] = useState<RecorderState>("idle");
  const [intent, setIntent] = useState<(PaymentIntent & { token: string }) | null>(null);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [reason, setReason] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [health, setHealth] = useState<{
    database: { connected: boolean; configured: boolean };
    vectors?: { configured: boolean; connected: boolean; index: string; vectors: number | null };
    ai: { nvidia: string };
  } | null>(null);
  const [verification, setVerification] = useState<{
    checked: number;
    verified: number;
    sources: number;
    passed: boolean;
    verifiedAt: string;
    documentName: string;
  } | null>(null);

  const load = async () => {
    try {
      const next = await api<WorkspaceResponse>("/api/workspace");
      if (next.empty) {
        setEmpty(next);
        setData(null);
      } else {
        setData(next);
        setEmpty(null);
      }
      setFatal(false);
    } catch {
      setFatal(true);
    }
  };

  useRealtimeWorkspace(() => {
    void load();
  });

  useEffect(() => {
    void load();
    void fetch("/api/health", { cache: "no-store" })
      .then((response) => response.json())
      .then((next) => setHealth(next))
      .catch(() => setHealth(null));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const run = async (key: string, task: () => Promise<void>) => {
    setBusy(key);
    try {
      await task();
    } catch (error) {
      setToast({ text: error instanceof Error ? error.message : "Something went wrong.", tone: "bad" });
    } finally {
      setBusy(null);
    }
  };

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  };

  const openDoc = (documentId: string) =>
    run("doc", async () => {
      const next = await api<WorkspaceData>("/api/documents", {
        method: "POST",
        body: JSON.stringify({ documentId }),
      });
      setData(next);
      setIntent(null);
    });

  const analyse = () =>
    run("analyse", async () => {
      const next = await api<WorkspaceData>("/api/analyse", {
        method: "POST",
        body: JSON.stringify({ documentId: data?.activeDocId }),
      });
      setData(next);
      setToast({ text: "Analysis refreshed. Every figure came from the calculators.", tone: "ok" });
    });

  const switchLang = (lang: Lang) =>
    run("lang", async () => {
      await api("/api/translate", { method: "POST", body: JSON.stringify({ lang }) });
      await load();
    });

  const send = async () => {
    if (!data || !question.trim()) return;
    const text = question.trim();
    setQuestion("");
    await run("ask", async () => {
      const result = await api<{ messages: ChatMessage[] }>("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          documentId: data.activeDocId,
          question: text,
          lang: data.lang,
        }),
      });
      setData((prev) => (prev ? { ...prev, messages: result.messages } : prev));
    });
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
  };

  const startVoice = async () => {
    if (voice === "recording") {
      stopRecording();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setToast({ text: "Microphone access is not supported in this browser.", tone: "bad" });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size === 0) {
          setVoice("idle");
          return;
        }
        setVoice("processing");
        try {
          const form = new FormData();
          form.set("file", blob, "voice.webm");
          form.set("lang", data?.lang ?? "en");
          const response = await fetch("/api/voice/stt", { method: "POST", body: form });
          const payload = (await response.json()) as { transcript?: string; error?: string };
          if (!response.ok || !payload.transcript) {
            throw new Error(payload.error ?? "Could not understand the audio.");
          }
          setQuestion(payload.transcript);
        } catch (err) {
          setToast({
            text: err instanceof Error ? err.message : "Voice input failed.",
            tone: "bad",
          });
        } finally {
          setVoice("idle");
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setVoice("recording");
    } catch {
      setToast({ text: "Microphone permission was not granted.", tone: "bad" });
    }
  };

  const openCheckpoint = () =>
    run("checkpoint", async () => {
      if (!data) return;
      const next = await api<{ intent: PaymentIntent & { token: string } }>("/api/act", {
        method: "POST",
        body: JSON.stringify({
          action: "payment_intent",
          documentId: data.activeDocId,
        }),
      });
      setIntent(next.intent);
    });

  const approve = () =>
    run("approve", async () => {
      if (!intent) return;
      await api("/api/act", {
        method: "POST",
        body: JSON.stringify({
          action: "payment_confirm",
          intentId: intent.id,
          token: intent.token,
          approvedAt: new Date().toISOString(),
        }),
      });
      setIntent(null);
      await load();
      setToast({ text: "Payment approval recorded in the audit log.", tone: "ok" });
    });

  const remind = () =>
    run("remind", async () => {
      if (!data) return;
      await api("/api/act", {
        method: "POST",
        body: JSON.stringify({ action: "reminder", documentId: data.activeDocId }),
      });
      await load();
      setToast({ text: "Reminder scheduled for 7 days from now.", tone: "ok" });
    });

  const escalateCase = () =>
    run("escalate", async () => {
      if (!data) return;
      await api("/api/escalate", {
        method: "POST",
        body: JSON.stringify({
          documentId: data.activeDocId,
          reason: reason || "Sensitive case needs human review",
        }),
      });
      setReason("");
      setEscalateOpen(false);
      await load();
      setToast({ text: "Case handed to a human with the transcript and citations.", tone: "ok" });
    });

  const verify = () =>
    run("verify", async () => {
      if (!data) return;
      const result = await api<{
        verification: {
          checked: number;
          verified: number;
          sources: number;
          passed: boolean;
          verifiedAt: string;
          documentName: string;
        };
      }>("/api/verify", {
        method: "POST",
        body: JSON.stringify({ documentId: data.activeDocId }),
      });
      setVerification(result.verification);
      await load();
      setToast({
        text: result.verification.passed
          ? `${result.verification.verified}/${result.verification.checked} quotes verified against the source.`
          : "Evidence check found a mismatch — review before acting.",
        tone: result.verification.passed ? "ok" : "bad",
      });
    });

  return (
    <div className="grid h-dvh min-h-0 grid-cols-1 bg-[#082a5e] min-[1280px]:grid-cols-[minmax(0,1fr)_392px]">
      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-page min-[1280px]:my-3 min-[1280px]:ml-3 min-[1280px]:rounded-[22px] min-[1280px]:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.7)]">
      <header className="shrink-0 bg-navy px-3 py-2.5 text-white lg:px-4">
        <div className="flex items-center gap-3">
          <Logo tone="light" className="shrink-0" />
          <span className="hidden h-6 w-px bg-white/15 sm:block" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold leading-tight">
              {data?.active.name ?? "Bharosa analysis workspace"}
            </p>
            <p className="truncate text-[10.5px] text-white/55">
              {data?.active.issuer ?? "Upload a policy or loan document to begin"} · Evidence-first review
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <span
              className="hidden items-center gap-1.5 rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold text-white/80 ring-1 ring-white/10 sm:flex"
              title={health?.database.connected ? "Persisted in Supabase" : "Workspace storage unavailable"}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  health?.database.connected ? "bg-ok" : "bg-warn",
                )}
              />
              <Database className="size-3" />
              {health?.database.connected ? "Supabase live" : "Storage degraded"}
            </span>
            <span
              className="hidden items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-semibold text-emerald-300 ring-1 ring-emerald-300/20 md:flex"
              title={
                health?.vectors?.connected
                  ? `${health.vectors.vectors ?? 0} clauses in Pinecone · ${health.vectors.index}`
                  : "Pinecone vector index is not reachable"
              }
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  health?.vectors?.connected ? "bg-emerald-400" : "bg-warn",
                )}
              />
              Pinecone {health?.vectors?.index ?? "paytm"}
            </span>
            <span
              className="hidden items-center gap-1 rounded-full bg-sky/15 px-2 py-1 text-[10px] font-semibold text-sky ring-1 ring-sky/20 md:flex"
              title="Answers are generated by NVIDIA and gated by clause verification"
            >
              <BrainCircuit className="size-3" />
              NVIDIA
            </span>
            {!embed && (
              <a
                href="/app"
                className="hidden text-[11px] font-semibold text-white/65 hover:text-white md:block"
              >
                Customer app
              </a>
            )}
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex cursor-pointer items-center gap-1.5 rounded-full bg-sky px-2.5 py-1.5 text-[10.5px] font-semibold text-[#002e6e] transition hover:bg-white"
              title="Sign out"
            >
              <UserRound className="size-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="shrink-0 border-b border-line bg-card px-3 py-2 lg:px-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="font-mono text-[9.5px] font-medium tracking-[0.16em] text-ink-3 uppercase">
              Library
            </span>
            <div className="flex max-w-full overflow-x-auto rounded-lg bg-page p-0.5 ring-1 ring-line">
              {(data?.documents ?? []).map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => void openDoc(doc.id)}
                  disabled={busy !== null}
                  className={cn(
                    "cursor-pointer rounded-[7px] px-2 py-1 text-[11px] font-semibold whitespace-nowrap transition-colors",
                    data?.activeDocId === doc.id
                      ? "bg-card text-navy shadow-[0_1px_2px_rgba(16,24,40,0.08)]"
                      : "text-ink-3 hover:text-navy",
                  )}
                  title={doc.name}
                >
                  {doc.type === "loan" ? "Loan" : doc.type === "credit_card" ? "Card" : "Health"} ·{" "}
                  {doc.name.split("—")[1]?.trim() ?? doc.name}
                </button>
              ))}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <UploadDocument
              onDone={(next) => {
                setData(next);
                setIntent(null);
                setToast({
                  text: `Parsed ${next.active.name} · ${next.active.clauses.length} searchable clauses.`,
                  tone: "ok",
                });
              }}
            />
            {data && (
              <ManageDocuments
                data={data}
                onDone={(next, message) => {
                  setData(next);
                  setIntent(null);
                  setToast({ text: message, tone: "ok" });
                }}
              />
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void analyse()}
              disabled={busy !== null || !data}
            >
              {busy === "analyse" ? <Loader2 className="animate-spin" /> : <ScanText />}
              Run analysis
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => void (data && openDoc(data.activeDocId))}
              disabled={busy !== null || !data}
            >
              <FileSearch />
              Open document
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {fatal && !data ? (
          <div className="p-4">
            <ErrorCard onRetry={() => void load()} />
          </div>
        ) : empty ? (
          <EmptyWorkspaceState
            empty={empty}
            onDone={(next) => {
              setData(next);
              setEmpty(null);
              setToast({ text: `Indexed ${next.active.clauses.length} clauses. Your workspace is ready.`, tone: "ok" });
            }}
          />
        ) : !data ? (
          <Loading />
        ) : (
          <div className="mx-auto w-full max-w-[1600px] p-3 lg:p-4">
            <div className="grid grid-cols-2 gap-2.5 min-[1050px]:grid-cols-4">
              <Stat
                icon={<FileCheck2 />}
                label="Documents analysed"
                value={`${data.metrics.documentsAnalysed}`}
                sub={`${data.documents.length} in your library`}
                tone="sky"
              />
              <Stat
                icon={<ShieldCheck />}
                label="Citations verified"
                value={`${data.metrics.citationsVerified}/${data.metrics.citationsChecked}`}
                sub="Every quote matched to a page"
                tone="ok"
              />
              <Stat
                icon={<Gauge />}
                label="Time to summary"
                value={`${data.metrics.timeToSummarySec}s`}
                sub="Ingest to plain-language summary"
                tone="navy"
              />
              <Stat
                icon={<MessageSquare />}
                label="Questions answered"
                value={`${data.metrics.questions}`}
                sub={`${data.metrics.notAvailable} refused as not available`}
                tone="warn"
              />
            </div>

            <div className="mt-2.5 grid gap-2.5 min-[1100px]:grid-cols-[minmax(0,1fr)_340px]">
              <div className="flex min-w-0 flex-col gap-2.5">
                <SummaryCard
                  data={data}
                  busy={busy}
                  onLang={(lang) => void switchLang(lang)}
                />
                <FactsCard data={data} />
                <FlagsCard data={data} />
                <StressCard
                  key={data.activeDocId}
                  data={data}
                  onWorkspace={(next) => setData(next)}
                />
                <ChatCard
                  data={data}
                  question={question}
                  setQuestion={setQuestion}
                  onSend={() => void send()}
                  onVoice={() => void startVoice()}
                  voice={voice}
                  busy={busy === "ask"}
                />
              </div>

              <div className="flex min-w-0 flex-col gap-2.5">
                <NumbersCard data={data} />
                {data.compare && <CompareCard data={data} />}
                <ActCard
                  data={data}
                  intent={intent}
                  busy={busy}
                  escalateOpen={escalateOpen}
                  reason={reason}
                  setReason={setReason}
                  onToggleEscalate={() => setEscalateOpen((open) => !open)}
                  onCheckpoint={() => void openCheckpoint()}
                  onApprove={() => void approve()}
                  onCancel={() => setIntent(null)}
                  onRemind={() => void remind()}
                  onEscalate={() => void escalateCase()}
                />
                <AuditCard
                  data={data}
                  busy={busy}
                  verification={verification}
                  onVerify={() => void verify()}
                />
              </div>
            </div>

            <p className="mt-3 text-[10.5px] leading-relaxed text-ink-3">
              Bharosa AI provides guidance, not a lending or claim decision, and never submits a
              payment without an explicit approval. Figures come from the terms extracted from your
              uploaded document and deterministic calculators.
            </p>

            {toast && (
              <div
                className={cn(
                  "fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold text-white shadow-lg",
                  toast.tone === "ok" ? "bg-navy" : "bg-[#b42318]",
                )}
              >
                {toast.tone === "ok" ? <Check className="size-3.5" /> : <CircleAlert className="size-3.5" />}
                {toast.text}
              </div>
            )}
          </div>
        )}
      </div>
      </div>
      {!embed && <WorkspacePhone className="hidden min-[1280px]:flex" />}
    </div>
  );
}

function EmptyWorkspaceState({
  empty,
  onDone,
}: {
  empty: EmptyWorkspace;
  onDone: (next: WorkspaceData) => void;
}) {
  const steps = [
    "Upload a policy, loan agreement or card terms document.",
    "Clauses are extracted and indexed in Pinecone for retrieval.",
    "Ask questions and every answer links back to the source page.",
  ];
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3 p-4 lg:p-6">
      <div className="rounded-2xl bg-navy p-5 text-white shadow-[0_20px_50px_-30px_rgba(7,21,42,0.8)]">
        <p className="font-mono text-[9.5px] tracking-[0.18em] text-sky uppercase">Private workspace</p>
        <h2 className="mt-2 text-[24px] font-extrabold tracking-[-0.04em]">
          Start with your own document
        </h2>
        <p className="mt-2 max-w-xl text-[12.5px] leading-relaxed text-white/65">
          Your library is empty. Upload a real policy or loan document to create a searchable,
          citation-backed workspace. Nothing is preloaded and nothing is shared between accounts.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <UploadDocument
            onDone={onDone}
            trigger={
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-sky px-4 py-2.5 text-[12.5px] font-bold text-navy transition hover:bg-white"
              >
                <ScanText className="size-4" />
                Upload your first document
              </button>
            }
          />
          <span className="text-[10.5px] text-white/40">PDF, photo or text · encrypted in transit</span>
        </div>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step} className="rounded-xl border border-line bg-card p-3.5">
            <span className="grid size-6 place-items-center rounded-full bg-sky-soft font-mono text-[10px] font-bold text-navy">
              {index + 1}
            </span>
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-2">{step}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-line bg-card px-3.5 py-2.5 text-[10px] text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-ok" /> Supabase RLS
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-sky" /> Pinecone clause retrieval
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-ink-3" /> {empty.audit.length} workspace event
        </span>
      </div>
    </div>
  );
}

function SummaryCard({
  data,
  busy,
  onLang,
}: {
  data: WorkspaceData;
  busy: string | null;
  onLang: (lang: Lang) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={<Sparkles />}
        title="30-second summary"
        meta={
          <div className="flex rounded-md bg-page p-0.5 ring-1 ring-line">
            {LANGS.map((lang) => (
              <button
                key={lang.id}
                type="button"
                onClick={() => onLang(lang.id)}
                disabled={busy !== null}
                className={cn(
                  "cursor-pointer rounded-[5px] px-1.5 py-0.5 text-[10px] font-bold transition-colors",
                  data.lang === lang.id ? "bg-card text-navy shadow-sm" : "text-ink-3 hover:text-navy",
                )}
                title={lang.label}
              >
                {lang.short}
              </button>
            ))}
          </div>
        }
      />
      <div className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip tone="sky">
            {data.active.type === "loan"
              ? "Loan · Key Fact Statement"
              : data.active.type === "credit_card"
                ? "Card · Most Important Terms & Conditions"
                : "Health · Customer Information Sheet"}
          </Chip>
          <Chip tone={data.active.status === "analysed" ? "ok" : "warn"}>
            {data.active.status}
          </Chip>
          <span className="font-mono text-[10px] text-ink-3">{data.active.pages} pages</span>
          <span className="ml-auto inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#067647]">
            <BadgeCheck className="size-3.5" />
            {data.analysis.citationsVerified}/{data.analysis.citationsChecked} citations verified
          </span>
        </div>
        <p className="mt-2.5 text-[13px] leading-relaxed text-ink-2">{data.analysis.summary}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line/70 pt-2 text-[10px] text-ink-3">
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-ok" /> Stated in document
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-warn" /> Inferred by calculator
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-ink-3" /> Not available
          </span>
          <span className="ml-auto inline-flex items-center gap-1">
            <Languages className="size-3" /> {LANGS.find((lang) => lang.id === data.lang)?.label}
          </span>
        </div>
      </div>
    </Card>
  );
}

function FactsCard({ data }: { data: WorkspaceData }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={<FileText />}
        title="Extracted facts"
        meta={<span>{data.analysis.facts.length} fields · each with a source</span>}
      />
      <div className="grid gap-x-4 gap-y-0 px-4 py-1 sm:grid-cols-2">
        {data.analysis.facts.map((fact) => (
          <div key={fact.key} className="border-b border-line/60 py-2 last:border-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10.5px] font-medium text-ink-3">{fact.label}</p>
              <Chip
                tone={fact.evidence === "stated" ? "ok" : fact.evidence === "inferred" ? "warn" : "neutral"}
                className="shrink-0 !px-1.5 !text-[9.5px]"
              >
                {fact.evidence === "not_available" ? "not available" : fact.evidence}
              </Chip>
            </div>
            <p className="mt-0.5 text-[12.5px] font-semibold text-navy">{fact.value}</p>
            {fact.source && <Cite citation={fact.source} />}
          </div>
        ))}
      </div>
    </Card>
  );
}

function FlagsCard({ data }: { data: WorkspaceData }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={<AlertTriangle />}
        title="Red flags"
        meta={<span>{data.analysis.redFlags.length} clauses need attention</span>}
      />
      <div className="divide-y divide-line/60">
        {data.analysis.redFlags.map((flag) => (
          <FlagRow key={flag.id} flag={flag} lang={data.lang} />
        ))}
      </div>
    </Card>
  );
}

function FlagRow({ flag, lang }: { flag: RedFlag; lang: Lang }) {
  const severity = SEVERITY[flag.severity];
  return (
    <article className={cn("border-l-[3px] px-4 py-2.5", severity.bar)}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip tone={severity.tone} className="!px-1.5 !text-[9.5px]">
              {severity.label}
            </Chip>
            <span className="font-mono text-[9.5px] text-ink-3">{flag.id}</span>
          </div>
          <h3 className="mt-1 text-[12.5px] font-semibold text-navy">{flag.title[lang] ?? flag.title.en}</h3>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-2">
            {flag.explain[lang] ?? flag.explain.en}
          </p>
          <p className="mt-1 text-[10.5px] leading-relaxed text-ink-3">
            <span className="font-semibold text-ink-2">In real life: </span>
            {flag.example}
          </p>
          <Cite citation={flag.source} />
        </div>
      </div>
    </article>
  );
}

function StressCard({
  data,
  onWorkspace,
}: {
  data: WorkspaceData;
  onWorkspace: (next: WorkspaceData) => void;
}) {
  const isHealth = data.active.type === "health_insurance";
  const isCard = data.active.type === "credit_card";
  const [claim, setClaim] = useState(
    Math.round((data.active.health?.claimPaise ?? 0) / 100),
  );
  const [room, setRoom] = useState(
    Math.round((data.active.health?.roomPerDayPaise ?? 0) / 100),
  );
  const [days, setDays] = useState(data.active.health?.roomDays ?? 1);
  const [month, setMonth] = useState(12);
  const [balance, setBalance] = useState(
    Math.round((data.active.card?.revolveBalancePaise ?? 0) / 100),
  );
  const [months, setMonths] = useState(6);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const latest = data.stress.find((item) => item.documentId === data.activeDocId);

  const runStress = async () => {
    setBusy(true);
    setError("");
    try {
      const payload = isHealth
        ? {
            documentId: data.activeDocId,
            scenario: "hospitalization",
            claimPaise: Math.round(claim * 100),
            roomPerDayPaise: Math.round(room * 100),
            roomDays: days,
          }
        : isCard
          ? {
              documentId: data.activeDocId,
              scenario: "revolve",
              balancePaise: Math.round(balance * 100),
              months,
            }
          : {
              documentId: data.activeDocId,
              scenario: "prepay",
              prepayMonth: month,
            };
      const result = await api<{ stress: StressResult; workspace: WorkspaceData }>(
        "/api/stress",
        { method: "POST", body: JSON.stringify(payload) },
      );
      onWorkspace(result.workspace);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not run the stress test.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={<FlaskConical />}
        title="Bharosa Stress Test"
        meta={<span className="font-mono text-[9.5px]">what-if · cited</span>}
      />
      <div className="px-4 py-3">
        <p className="text-[11px] leading-relaxed text-ink-2">
          {isHealth
            ? "Try a hospital bill before it happens. Room cap and co-pay are applied exactly as written in the policy."
            : isCard
              ? "See what carrying a balance actually costs. Interest is computed on the reducing balance, not guessed by a model."
              : "Check whether prepaying is worth the foreclosure charge. The calculator compares remaining interest with the fee."}
        </p>

        <div className="mt-2.5 grid grid-cols-2 gap-2">
          {isHealth ? (
            <>
              <label className="text-[10px] font-medium text-ink-3">
                Hospital bill (₹)
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={claim}
                  onChange={(event) => setClaim(Number(event.target.value))}
                  className="mt-1 h-8 w-full rounded-lg border border-line bg-page px-2 text-[12px] font-semibold text-navy outline-none focus:border-sky"
                />
              </label>
              <label className="text-[10px] font-medium text-ink-3">
                Room rent / day (₹)
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={room}
                  onChange={(event) => setRoom(Number(event.target.value))}
                  className="mt-1 h-8 w-full rounded-lg border border-line bg-page px-2 text-[12px] font-semibold text-navy outline-none focus:border-sky"
                />
              </label>
              <label className="text-[10px] font-medium text-ink-3">
                Days in hospital
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={days}
                  onChange={(event) => setDays(Number(event.target.value))}
                  className="mt-1 h-8 w-full rounded-lg border border-line bg-page px-2 text-[12px] font-semibold text-navy outline-none focus:border-sky"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setClaim(Math.round((data.active.health?.claimPaise ?? 0) / 100));
                  setRoom(Math.round((data.active.health?.roomPerDayPaise ?? 0) / 100));
                  setDays(data.active.health?.roomDays ?? 1);
                }}
                className="h-7 cursor-pointer rounded-md bg-page px-1.5 text-[9.5px] font-semibold text-ink-2 ring-1 ring-line hover:text-navy"
              >
                Use policy scenario
              </button>
            </>
          ) : isCard ? (
            <>
              <label className="text-[10px] font-medium text-ink-3">
                Balance to revolve (₹)
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={balance}
                  onChange={(event) => setBalance(Number(event.target.value))}
                  className="mt-1 h-8 w-full rounded-lg border border-line bg-page px-2 text-[12px] font-semibold text-navy outline-none focus:border-sky"
                />
              </label>
              <label className="text-[10px] font-medium text-ink-3">
                Months to clear
                <input
                  type="number"
                  min={1}
                  max={36}
                  value={months}
                  onChange={(event) => setMonths(Number(event.target.value))}
                  className="mt-1 h-8 w-full rounded-lg border border-line bg-page px-2 text-[12px] font-semibold text-navy outline-none focus:border-sky"
                />
              </label>
              <div className="col-span-2 flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setBalance(50000);
                    setMonths(6);
                  }}
                  className="h-7 flex-1 cursor-pointer rounded-md bg-page px-1.5 text-[9.5px] font-semibold text-ink-2 ring-1 ring-line hover:text-navy"
                >
                  ₹50k · 6 months
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBalance(100000);
                    setMonths(12);
                  }}
                  className="h-7 flex-1 cursor-pointer rounded-md bg-page px-1.5 text-[9.5px] font-semibold text-ink-2 ring-1 ring-line hover:text-navy"
                >
                  ₹1L · 12 months
                </button>
              </div>
            </>
          ) : (
            <>
              <label className="col-span-2 text-[10px] font-medium text-ink-3">
                Prepay after EMI number
                <input
                  type="number"
                  min={1}
                  max={data.active.loan?.months ?? 24}
                  value={month}
                  onChange={(event) => setMonth(Number(event.target.value))}
                  className="mt-1 h-8 w-full rounded-lg border border-line bg-page px-2 text-[12px] font-semibold text-navy outline-none focus:border-sky"
                />
              </label>
              <div className="col-span-2 flex gap-1">
                <button
                  type="button"
                  onClick={() => setMonth(6)}
                  className="h-7 flex-1 cursor-pointer rounded-md bg-page px-1.5 text-[9.5px] font-semibold text-ink-2 ring-1 ring-line hover:text-navy"
                >
                  After 6 EMIs
                </button>
                <button
                  type="button"
                  onClick={() => setMonth(12)}
                  className="h-7 flex-1 cursor-pointer rounded-md bg-page px-1.5 text-[9.5px] font-semibold text-ink-2 ring-1 ring-line hover:text-navy"
                >
                  After 12 EMIs
                </button>
              </div>
            </>
          )}
        </div>

        <Button
          variant="primary"
          size="sm"
          className="mt-2 w-full"
          onClick={() => void runStress()}
          disabled={busy}
        >
          {busy ? <Loader2 className="animate-spin" /> : <FlaskConical />}
          {busy ? "Calculating from the document…" : "Run stress test"}
        </Button>
        {error && <p className="mt-1 text-[10px] text-[#b42318]">{error}</p>}

        {latest && (
          <div className="rc-pop mt-2.5 rounded-xl border border-sky/25 bg-sky-soft/30 p-2.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11.5px] font-bold text-navy">{latest.title}</p>
              {latest.engine === "nvidia" ? (
                <Chip tone="sky" className="!px-1.5 !text-[9px]">
                  <BrainCircuit className="mr-0.5 size-2.5" /> NVIDIA
                </Chip>
              ) : (
                <Chip tone="ok" className="!px-1.5 !text-[9px]">
                  <CircleCheck className="mr-0.5 size-2.5" /> verified maths
                </Chip>
              )}
            </div>
            <p className="mt-1 text-[10.5px] leading-relaxed text-ink-2">
              {latest.narrative ?? latest.verdict}
            </p>
            <dl className="mt-2 space-y-1 border-t border-sky/20 pt-1.5">
              {latest.lines.map((line) => (
                <div key={line.label} className="flex items-center justify-between gap-2 text-[10.5px]">
                  <dt className="text-ink-3">{line.label}</dt>
                  <dd
                    className={cn(
                      "font-semibold tabular",
                      line.tone === "cost"
                        ? "text-[#b42318]"
                        : line.tone === "cover" || line.tone === "saving"
                          ? "text-[#067647]"
                          : "text-navy",
                    )}
                  >
                    {money(line.amountPaise)}
                  </dd>
                </div>
              ))}
            </dl>
            {latest.citations.map((citation, index) => (
              <Cite key={`${latest.id}-${index}`} citation={citation} />
            ))}
            <details className="mt-1">
              <summary className="cursor-pointer text-[9.5px] font-medium text-ink-3">
                Assumptions ({latest.assumptions.length})
              </summary>
              <ul className="mt-1 space-y-0.5">
                {latest.assumptions.map((item) => (
                  <li key={item} className="text-[9.5px] leading-relaxed text-ink-3">
                    · {item}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </div>
    </Card>
  );
}

function ChatCard({
  data,
  question,
  setQuestion,
  onSend,
  onVoice,
  voice,
  busy,
}: {
  data: WorkspaceData;
  question: string;
  setQuestion: (value: string) => void;
  onSend: () => void;
  onVoice: () => void;
  voice: RecorderState;
  busy: boolean;
}) {
  const listening = voice === "recording";
  const processingVoice = voice === "processing";
  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={<Bot />}
        title="Ask this document"
        meta={
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="size-3 text-ok" /> cited answers only
          </span>
        }
      />
      <div className="max-h-[330px] space-y-2.5 overflow-y-auto px-4 py-3">
        {data.messages.length === 0 ? (
          <>
            <p className="text-[11.5px] leading-relaxed text-ink-2">
              Ask about waiting periods, fees, EMI, room rent, exclusions or prepayment. If the answer
              is not in the document, Bharosa AI says so instead of guessing.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {data.suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setQuestion(suggestion)}
                  className="cursor-pointer rounded-full border border-line bg-page px-2.5 py-1 text-[10.5px] font-medium text-ink-2 transition-colors hover:border-sky/40 hover:text-navy"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </>
        ) : (
          data.messages.map((message) =>
            message.role === "user" ? (
              <div key={message.id} className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-navy px-3 py-1.5 text-[11.5px] leading-relaxed text-white">
                  {message.text}
                </p>
              </div>
            ) : (
              <div key={message.id} className="flex gap-2">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-sky-soft text-navy">
                  <Bot className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11.5px] leading-relaxed text-ink">{message.text}</p>
                  {message.engine === "nvidia" && (
                    <Chip tone="sky" className="mt-1 !px-1.5 !text-[9px]">
                      <BrainCircuit className="mr-0.5 size-2.5" /> NVIDIA · evidence-gated
                    </Chip>
                  )}
                  {message.grounded ? (
                    <div className="mt-1 space-y-0.5">
                      {message.citations.map((citation, index) => (
                        <Cite key={`${message.id}-${index}`} citation={citation} />
                      ))}
                    </div>
                  ) : (
                    <Chip tone="neutral" className="mt-1">
                      Not available in this document
                    </Chip>
                  )}
                </div>
              </div>
            ),
          )
        )}
        {busy && (
          <div className="flex items-center gap-1.5 text-[10.5px] text-ink-3">
            <Loader2 className="size-3 animate-spin" /> Checking the document…
          </div>
        )}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
        className="flex items-center gap-1.5 border-t border-line/70 px-3 py-2"
      >
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={
            listening ? "Listening… tap to stop" : processingVoice ? "Transcribing…" : "Ask about this document"
          }
          className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-page px-2.5 text-[11.5px] text-ink outline-none placeholder:text-ink-3 focus:border-sky"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={onVoice}
          disabled={busy || processingVoice}
          title={listening ? "Stop recording" : "Voice input (Sarvam)"}
          aria-label={listening ? "Stop recording" : "Dictate a question"}
        >
          {processingVoice ? <Loader2 className="animate-spin" /> : <Mic className={listening ? "text-bad animate-pulse" : undefined} />}
        </Button>
        <Button variant="primary" size="sm" type="submit" disabled={busy || !question.trim()}>
          <Send />
        </Button>
      </form>
    </Card>
  );
}

function NumbersCard({ data }: { data: WorkspaceData }) {
  const calc = data.analysis.calc;
  const loan = calc.kind === "loan" ? calc : null;
  const health = calc.kind === "health" ? calc : null;
  const card = calc.kind === "card" ? calc : null;
  const interestWidth =
    loan && loan.totalPaise > 0 ? Math.min(100, (loan.interestPaise / loan.totalPaise) * 100) : 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={<IndianRupee />}
        title="Deterministic numbers"
        meta={<span className="font-mono text-[9.5px]">code, not the LLM</span>}
      />
      {loan ? (
        <div className="px-4 py-3">
          <p className="text-[10px] font-medium tracking-wide text-ink-3 uppercase">Monthly EMI</p>
          <p className="mt-0.5 text-[27px] leading-none font-extrabold tracking-tight text-navy tabular">
            {money(loan.emiPaise, 0)}
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sky">
            <div className="h-full rounded-full bg-navy" style={{ width: `${interestWidth}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[9.5px] text-ink-3">
            <span>Principal + fees</span>
            <span>Interest {money(loan.interestPaise)}</span>
          </div>
          <dl className="mt-3 space-y-1.5">
            <Row label="Total repayment" value={money(loan.totalPaise)} strong />
            <Row label="Interest over tenure" value={money(loan.interestPaise)} />
            <Row label="Upfront fees" value={money(loan.feesPaise)} />
            <Row label="Money you receive" value={money(loan.netDisbursalPaise)} />
            <Row label="Effective APR" value={pct(loan.aprPct)} strong />
            <Row
              label="Prepay after 12 EMIs"
              value={`${money(loan.prepayPaise)} est.`}
            />
          </dl>
          <Assumptions items={loan.assumptions} />
        </div>
      ) : health ? (
        <div className="px-4 py-3">
          <p className="text-[10px] font-medium tracking-wide text-ink-3 uppercase">
            Your share · {money(health.claimPaise)} claim, {data.active.health?.roomDays ?? 1}-day stay
          </p>
          <p className="mt-0.5 text-[27px] leading-none font-extrabold tracking-tight text-navy tabular">
            {money(health.outOfPocketPaise)}
          </p>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-ok">
            <div
              className="h-full bg-bad"
              style={{ width: `${(health.outOfPocketPaise / health.claimPaise) * 100}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[9.5px] text-ink-3">
            <span>You pay</span>
            <span>Insurer pays {money(health.insurerPaysPaise)}</span>
          </div>
          <dl className="mt-3 space-y-1.5">
            <Row label="Hospital bill" value={money(health.claimPaise)} />
            <Row label="Room-rent deduction" value={`− ${money(health.roomDeductPaise)}`} />
            <Row label="Admissible bill" value={money(health.admissiblePaise)} />
            <Row label={`${data.active.health?.copayPct ?? 0}% co-pay`} value={money(health.copayPaise)} />
            <Row label="Insurer pays" value={money(health.insurerPaysPaise)} strong />
            <Row label="Your out-of-pocket" value={money(health.outOfPocketPaise)} strong />
          </dl>
          <Assumptions items={health.assumptions} />
        </div>
      ) : card ? (
        <div className="px-4 py-3">
          <p className="text-[10px] font-medium tracking-wide text-ink-3 uppercase">
            Monthly interest on {money(card.balancePaise)} revolve
          </p>
          <p className="mt-0.5 text-[27px] leading-none font-extrabold tracking-tight text-navy tabular">
            {money(card.monthlyInterestPaise)}
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-page ring-1 ring-line">
            <div
              className="h-full rounded-full bg-bad"
              style={{ width: `${Math.min(100, (card.monthlyInterestPaise / card.balancePaise) * 100)}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[9.5px] text-ink-3">
            <span>Interest this month</span>
            <span>{pct(card.aprPct)} annualised</span>
          </div>
          <dl className="mt-3 space-y-1.5">
            <Row label="Credit limit" value={money(card.limitPaise)} />
            <Row label="Minimum due now" value={money(card.minDuePaise)} strong />
            <Row label="Months at minimum due" value={`${card.monthsAtMinDue} months`} />
            <Row label="Interest at minimum due" value={money(card.interestAtMinDuePaise)} strong />
            <Row label="Late fee" value={money(card.lateFeePaise)} />
            <Row label="Annual fee" value={money(card.annualFeePaise)} />
          </dl>
          <Assumptions items={card.assumptions} />
        </div>
      ) : null}
    </Card>
  );
}

function CompareCard({ data }: { data: WorkspaceData }) {
  const compare = data.compare;
  if (!compare) return null;
  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={<FileSearch />}
        title="Compare offers"
        meta={<span>{compare.offers.length} loan offers</span>}
      />
      <div className="px-4 py-3">
        <div className="space-y-2">
          {compare.offers.map((offer) => (
            <div
              key={offer.id}
              className={cn(
                "rounded-lg border p-2",
                compare.cheaper === offer.id
                  ? "border-ok/30 bg-ok-soft/50"
                  : "border-line bg-page/60",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-navy">{offer.name}</p>
                {compare.cheaper === offer.id && (
                  <Chip tone="ok" className="!px-1.5 !text-[9px]">
                    lower total
                  </Chip>
                )}
              </div>
              <div className="mt-1 grid grid-cols-3 gap-1 text-[10px]">
                <span className="text-ink-3">
                  EMI
                  <b className="block text-[11px] font-semibold text-ink">{money(offer.emiPaise)}</b>
                </span>
                <span className="text-ink-3">
                  Total
                  <b className="block text-[11px] font-semibold text-ink">{money(offer.totalPaise)}</b>
                </span>
                <span className="text-ink-3">
                  APR
                  <b className="block text-[11px] font-semibold text-ink">{pct(offer.aprPct)}</b>
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10.5px] leading-relaxed text-ink-2">
          {compare.verdict}
        </p>
        <p className="mt-1 text-[10px] text-ink-3">
          Difference in total repayment: <b>{money(compare.differencePaise)}</b>
        </p>
      </div>
    </Card>
  );
}

function ActCard({
  data,
  intent,
  busy,
  escalateOpen,
  reason,
  setReason,
  onToggleEscalate,
  onCheckpoint,
  onApprove,
  onCancel,
  onRemind,
  onEscalate,
}: {
  data: WorkspaceData;
  intent: (PaymentIntent & { token: string }) | null;
  busy: string | null;
  escalateOpen: boolean;
  reason: string;
  setReason: (value: string) => void;
  onToggleEscalate: () => void;
  onCheckpoint: () => void;
  onApprove: () => void;
  onCancel: () => void;
  onRemind: () => void;
  onEscalate: () => void;
}) {
  const isLoan = data.active.type === "loan";
  const isCard = data.active.type === "credit_card";
  const amount = isLoan
    ? (data.active.loan?.feePaise ?? 0)
    : isCard
      ? (data.active.card?.annualFeePaise ?? 0)
      : (data.active.health?.premiumPaise ?? 0);
  const payee = isLoan
    ? (data.active.loan?.payee ?? "Lender")
    : isCard
      ? (data.active.card?.payee ?? "Card issuer")
      : (data.active.health?.payee ?? "Insurer");
  const purpose = isLoan
    ? "Loan processing fee"
    : isCard
      ? "Credit card annual fee"
      : "Health policy premium";

  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={<Wallet />}
        title="Act with consent"
        meta={<span className="inline-flex items-center gap-1"><ShieldCheck className="size-3 text-ok" /> approval required</span>}
      />
      <div className="px-4 py-3">
        {!intent ? (
          <>
            <p className="text-[11px] leading-relaxed text-ink-2">
              Nothing is submitted without an explicit checkpoint. This records your approval
              for the <b>{purpose.toLowerCase()}</b>; your bank or UPI app still completes the
              transfer.
            </p>
            <div className="mt-2 flex items-center justify-between rounded-lg bg-page px-2.5 py-2 ring-1 ring-line">
              <div>
                <p className="text-[10px] text-ink-3">Payee</p>
                <p className="text-[11.5px] font-semibold text-navy">{payee}</p>
              </div>
              <p className="text-[16px] font-bold text-navy tabular">{money(amount)}</p>
            </div>
            <Button
              variant="primary"
              size="lg"
              className="mt-2 w-full"
              onClick={onCheckpoint}
              disabled={busy !== null}
            >
              {busy === "checkpoint" ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
              Open Trust Checkpoint
            </Button>
          </>
        ) : (
          <div className="rc-pop rounded-xl border border-sky/30 bg-sky-soft/40 p-2.5">
            <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] text-navy uppercase">
              <ShieldCheck className="size-3.5 text-sky" /> Trust Checkpoint · 30 seconds
            </p>
            <dl className="mt-2 space-y-1 text-[11px]">
              <div className="flex justify-between gap-2">
                <dt className="text-ink-3">Paying</dt>
                <dd className="font-semibold text-navy">{intent.payee}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink-3">Amount</dt>
                <dd className="font-semibold text-navy tabular">{money(intent.amountPaise)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink-3">For</dt>
                <dd className="text-right font-medium text-ink">{intent.purpose}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink-3">Red flags on file</dt>
                <dd className="font-semibold text-[#b42318]">{data.analysis.redFlags.length}</dd>
              </div>
            </dl>
            <p className="mt-1.5 text-[9.5px] leading-relaxed text-ink-3">
              Approving records an audit event with a one-time token. No money moves until a
              payment provider is connected and the approval is confirmed.
            </p>
            <div className="mt-2 flex gap-1.5">
              <Button variant="secondary" size="sm" className="flex-1" onClick={onCancel} disabled={busy !== null}>
                <X /> Cancel
              </Button>
              <Button variant="approve" size="sm" className="flex-1" onClick={onApprove} disabled={busy !== null}>
                {busy === "approve" ? <Loader2 className="animate-spin" /> : <Check />}
                Approve payment
              </Button>
            </div>
          </div>
        )}

        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <Button variant="secondary" size="sm" onClick={onRemind} disabled={busy !== null}>
            {busy === "remind" ? <Loader2 className="animate-spin" /> : <Bell />}
            Remind me
          </Button>
          <Button variant="secondary" size="sm" onClick={onToggleEscalate} disabled={busy !== null}>
            <UserRound />
            Ask a human
          </Button>
        </div>

        {escalateOpen && (
          <div className="rc-pop mt-2 rounded-lg border border-line bg-page p-2">
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={2}
              placeholder="What needs a human review?"
              className="w-full resize-none rounded-md border border-line bg-card p-1.5 text-[11px] outline-none focus:border-sky"
            />
            <Button
              variant="primary"
              size="sm"
              className="mt-1 w-full"
              onClick={onEscalate}
              disabled={busy !== null}
            >
              {busy === "escalate" ? <Loader2 className="animate-spin" /> : <ArrowUpRight />}
              Escalate with citations
            </Button>
          </div>
        )}

        {data.reminders.length > 0 && (
          <p className="mt-2 flex items-center gap-1 text-[10px] text-ink-3">
            <Clock className="size-3" /> {data.reminders.length} reminder
            {data.reminders.length === 1 ? "" : "s"} scheduled · next{" "}
            {formatDate(data.reminders[0].dueAt)}
          </p>
        )}
        {data.payments.some((payment) => payment.status === "paid") && (
          <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-[#067647]">
            <BadgeCheck className="size-3" /> Approval recorded ·{" "}
            {money(
              data.payments
                .filter((payment) => payment.status === "paid")
                .reduce((sum, payment) => sum + payment.amountPaise, 0),
            )}
          </p>
        )}
      </div>
    </Card>
  );
}

function buildReceipt(
  data: WorkspaceData,
  verification: {
    checked: number;
    verified: number;
    sources: number;
    passed: boolean;
    verifiedAt: string;
    documentName: string;
  } | null,
) {
  const lines: string[] = [];
  lines.push("Bharosa AI Decision Receipt");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Document: ${data.active.name} (${data.active.type})`);
  lines.push("");
  lines.push("Summary");
  lines.push(data.analysis.summary);
  lines.push("");
  lines.push("Facts");
  for (const fact of data.analysis.facts) {
    lines.push(`- ${fact.label}: ${fact.value} [${fact.evidence}]${fact.source ? ` (p.${fact.source.page})` : ""}`);
  }
  lines.push("");
  lines.push("Red flags");
  for (const flag of data.analysis.redFlags) {
    lines.push(`- [${flag.severity}] ${flag.title.en} (p.${flag.source.page}, ${flag.source.clause})`);
  }
  if (data.analysis.redFlags.length === 0) lines.push("- None detected");
  lines.push("");
  lines.push("Verification");
  if (verification) {
    lines.push(
      `${verification.verified}/${verification.checked} quotes matched across ${verification.sources} sources at ${verification.verifiedAt}`,
    );
  } else {
    lines.push(`${data.analysis.citationsVerified}/${data.analysis.citationsChecked} citations verified in analysis`);
  }
  lines.push("");
  lines.push("Actions & approvals");
  for (const p of data.payments) lines.push(`- Payment ${p.status}: ${p.payee} ${p.purpose} ${(p.amountPaise / 100).toFixed(0)} INR`);
  for (const r of data.reminders) lines.push(`- Reminder: ${r.title} due ${r.dueAt}`);
  for (const e of data.escalations) lines.push(`- Escalation ${e.status}: ${e.reason}`);
  if (!data.payments.length && !data.reminders.length && !data.escalations.length) lines.push("- No actions recorded");
  lines.push("");
  lines.push("Audit trail");
  for (const event of data.audit.slice(0, 20)) {
    lines.push(`- [${event.at}] ${event.actor}: ${event.event}${event.meta ? ` — ${event.meta}` : ""}`);
  }
  lines.push("");
  lines.push("Guidance only. Not legal, lending or claim advice. Verify with the issuer before acting.");
  return lines.join("\n");
}

function downloadReceipt(
  data: WorkspaceData,
  verification: {
    checked: number;
    verified: number;
    sources: number;
    passed: boolean;
    verifiedAt: string;
    documentName: string;
  } | null,
) {
  const text = buildReceipt(data, verification);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bharosa-receipt-${data.active.id}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function AuditCard({
  data,
  busy,
  verification,
  onVerify,
}: {
  data: WorkspaceData;
  busy: string | null;
  verification: {
    checked: number;
    verified: number;
    sources: number;
    passed: boolean;
    verifiedAt: string;
    documentName: string;
  } | null;
  onVerify: () => void;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={<Clock />}
        title="Verify + audit trail"
        meta={<span>immutable events</span>}
      />
      <div className="border-b border-line/70 px-4 py-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold text-navy">Evidence verification</p>
            <p className="text-[9.5px] text-ink-3">
              Re-check every quote against its source clause before acting.
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const text = buildReceipt(data, verification);
                void navigator.clipboard?.writeText(text);
              }}
              title="Copy decision receipt"
            >
              <FileText />
              Receipt
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => downloadReceipt(data, verification)}
              title="Download decision receipt"
            >
              <Download />
            </Button>
            <Button variant="secondary" size="sm" onClick={onVerify} disabled={busy !== null}>
              {busy === "verify" ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
              Verify
            </Button>
          </div>
        </div>
        {verification && (
          <p
            className={cn(
              "mt-1 flex items-center gap-1 text-[10px] font-semibold",
              verification.passed ? "text-[#067647]" : "text-[#b42318]",
            )}
          >
            {verification.passed ? <CircleCheck className="size-3" /> : <CircleAlert className="size-3" />}
            {verification.verified}/{verification.checked} quotes matched · {verification.sources} sources
            · {timeAgo(verification.verifiedAt)}
          </p>
        )}
      </div>
      <ol className="px-4 py-2">
        {data.audit.slice(0, 6).map((event) => (
          <li key={event.id} className="flex gap-2 border-b border-line/60 py-1.5 last:border-0">
            <span
              className={cn(
                "mt-1 size-1.5 shrink-0 rounded-full",
                event.actor === "bharosa" ? "bg-sky" : event.actor === "user" ? "bg-ok" : "bg-ink-3",
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium text-ink">{event.event}</p>
              <p className="truncate text-[10px] text-ink-3">{event.meta}</p>
            </div>
            <span className="shrink-0 text-[9.5px] text-ink-3">{timeAgo(event.at)}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function Cite({ citation }: { citation: Citation }) {
  return (
    <details className="group mt-1">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded text-[10px] font-medium text-ink-3 hover:text-navy">
        <Quote className="size-2.5" /> p.{citation.page} · cl. {citation.clause}
        <span className="text-[9px] text-ink-3 group-open:hidden">show quote</span>
      </summary>
      <blockquote className="mt-1 border-l-2 border-sky/40 pl-2 text-[10.5px] leading-relaxed text-ink-2">
        “{citation.quote}”
      </blockquote>
    </details>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-[10.5px] text-ink-3">{label}</dt>
      <dd className={cn("tabular text-[11.5px]", strong ? "font-bold text-navy" : "font-medium text-ink")}>
        {value}
      </dd>
    </div>
  );
}

function Assumptions({ items }: { items: string[] }) {
  return (
    <details className="mt-2 border-t border-line/60 pt-1.5">
      <summary className="cursor-pointer list-none text-[10px] font-semibold text-ink-3 hover:text-navy">
        Assumptions ({items.length})
      </summary>
      <ul className="mt-1 space-y-0.5">
        {items.map((item) => (
          <li key={item} className="text-[9.5px] leading-relaxed text-ink-3">
            · {item}
          </li>
        ))}
      </ul>
    </details>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: "sky" | "ok" | "navy" | "warn";
}) {
  return (
    <Card className="px-3 py-2">
      <div className="flex items-start justify-between gap-1">
        <p className="text-[10px] font-medium text-ink-3">{label}</p>
        <span
          className={cn(
            "grid size-5 place-items-center rounded-md [&_svg]:size-3",
            tone === "sky" && "bg-sky-soft text-navy",
            tone === "ok" && "bg-ok-soft text-[#067647]",
            tone === "navy" && "bg-navy text-white",
            tone === "warn" && "bg-warn-soft text-[#b54708]",
          )}
        >
          {icon}
        </span>
      </div>
      <p className="mt-1 text-[18px] leading-none font-extrabold tracking-tight text-navy tabular">
        {value}
      </p>
      <p className="mt-1 truncate text-[9.5px] text-ink-3">{sub}</p>
    </Card>
  );
}

function Loading() {
  return (
    <div className="grid gap-2.5 p-3 lg:p-4 min-[1100px]:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-2.5">
        <Skeleton className="h-32" />
        <Skeleton className="h-52" />
        <Skeleton className="h-56" />
      </div>
      <div className="space-y-2.5">
        <Skeleton className="h-64" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}

function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="p-5 text-center">
      <CircleAlert className="mx-auto size-6 text-bad" />
      <p className="mt-2 text-[13px] font-semibold text-navy">The workspace could not load</p>
      <p className="mt-1 text-[11.5px] text-ink-2">
        The workspace API did not answer. Check your connection and try again.
      </p>
      <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
        <RotateCcw /> Retry
      </Button>
    </Card>
  );
}
