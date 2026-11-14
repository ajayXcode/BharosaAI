"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BatteryFull,
  Bell,
  Bot,
  BrainCircuit,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock,
  Copy,
  Eye,
  EyeOff,
  FileCheck2,
  FileText,
  FlaskConical,
  Headphones,
  House,
  Languages,
  Loader2,
  MessageSquare,
  Mic,
  ReceiptText,
  ScanLine,
  Send,
  Signal,
  ShieldCheck,
  Upload,
  UserRound,
  Wallet,
  Wifi,
  X,
} from "lucide-react";
import type {
  ChatMessage,
  Citation,
  EmptyWorkspace,
  Lang,
  PaymentIntent,
  Severity,
  WorkspaceData,
  WorkspaceResponse,
} from "@/lib/bharosa";
import { Button, Chip, Logo, Skeleton, cn, formatDate } from "@/components/ui";
import { HomeScreen } from "@/components/HomeScreen";
import { PaytmHome } from "@/components/PaytmHome";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UploadDocument } from "@/components/UploadDocument";
import { useRealtimeWorkspace } from "@/lib/use-realtime";

const LANGS: { id: Lang; label: string }[] = [
  { id: "en", label: "EN" },
  { id: "hi", label: "हिं" },
  { id: "hinglish", label: "HI" },
];

const SEVERITY: Record<Severity, { label: string; className: string }> = {
  high: { label: "High", className: "bg-bad-soft text-[#b42318]" },
  medium: { label: "Medium", className: "bg-warn-soft text-[#b54708]" },
  low: { label: "Low", className: "bg-sky-soft text-navy" },
};

type Tab = "decode" | "warn" | "test" | "ask" | "act";

type RecorderState = "idle" | "recording" | "processing";

function money(paise: number, fraction = 0) {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    maximumFractionDigits: fraction,
    minimumFractionDigits: fraction,
  })}`;
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

export function CustomerApp({ embed = false }: { embed?: boolean }) {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [empty, setEmpty] = useState<EmptyWorkspace | null>(null);
  const [tab, setTab] = useState<Tab>("decode");
  const [insideBharosa, setInsideBharosa] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [voice, setVoice] = useState<RecorderState>("idle");
  const [intent, setIntent] = useState<(PaymentIntent & { token: string }) | null>(null);
  const [paid, setPaid] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      setError(null);
    } catch {
      setError("Could not reach your workspace.");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useRealtimeWorkspace(() => {
    void load();
  });

  const run = async (key: string, task: () => Promise<void>) => {
    setBusy(key);
    try {
      await task();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      window.setTimeout(() => setError(null), 3200);
    } finally {
      setBusy(null);
    }
  };

  const switchLang = (lang: Lang) =>
    run("lang", async () => {
      await api("/api/translate", { method: "POST", body: JSON.stringify({ lang }) });
      await load();
    });

  const cycleLang = () => {
    const current = LANGS.findIndex((item) => item.id === data?.lang);
    const next = LANGS[(current + 1) % LANGS.length];
    if (next) void switchLang(next.id);
  };

  const flash = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(null), 3600);
  };

  const uploaded = (next: WorkspaceData) => {
    setData(next);
    setEmpty(null);
    setTab("decode");
    setPaid(false);
    setIntent(null);
    flash(`Added ${next.active.name}. ${next.active.clauses.length} clauses are searchable.`);
  };

  const selectDoc = (documentId: string) =>
    run("doc", async () => {
      const next = await api<WorkspaceData>("/api/documents", {
        method: "POST",
        body: JSON.stringify({ documentId }),
      });
      setData(next);
      setPaid(false);
      setIntent(null);
    });

  const playBase64 = async (base64: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => URL.revokeObjectURL(url);
    await audio.play();
  };

  const speak = () => {
    if (!data) return;
    void run("speak", async () => {
      const result = await api<{ audio?: string; error?: string }>("/api/voice/tts", {
        method: "POST",
        body: JSON.stringify({ text: data.analysis.summary, lang: data.lang }),
      });
      if (result.audio) {
        await playBase64(result.audio);
      } else if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(data.analysis.summary);
        utterance.lang = data.lang === "hi" ? "hi-IN" : "en-IN";
        window.speechSynthesis.speak(utterance);
      }
    });
  };

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
      setError("Microphone access is not supported in this browser.");
      window.setTimeout(() => setError(null), 2800);
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
          setError(err instanceof Error ? err.message : "Voice input failed.");
          window.setTimeout(() => setError(null), 3200);
        } finally {
          setVoice("idle");
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setVoice("recording");
    } catch {
      setError("Microphone permission was not granted.");
      window.setTimeout(() => setError(null), 2800);
    }
  };

  const openCheckpoint = () =>
    run("checkpoint", async () => {
      if (!data) return;
      const next = await api<{ intent: PaymentIntent & { token: string } }>("/api/act", {
        method: "POST",
        body: JSON.stringify({ action: "payment_intent", documentId: data.activeDocId }),
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
      setPaid(true);
      await load();
    });

  const remind = () =>
    run("remind", async () => {
      if (!data) return;
      await api("/api/act", {
        method: "POST",
        body: JSON.stringify({ action: "reminder", documentId: data.activeDocId }),
      });
      await load();
    });

  const escalate = () =>
    run("escalate", async () => {
      if (!data) return;
      await api("/api/escalate", {
        method: "POST",
        body: JSON.stringify({
          documentId: data.activeDocId,
          reason: "Customer asked for a human after reviewing the red flags",
        }),
      });
      await load();
    });

  if (!insideBharosa)
    return <PaytmHome embed={embed} onOpenBharosa={() => setInsideBharosa(true)} />;

  if (empty) return <EmptyCustomer onDone={uploaded} onBack={() => setInsideBharosa(false)} />;

  return (
    <div className="flex h-dvh flex-col bg-page">
      <header className="shrink-0 border-b border-line bg-card px-3.5 pt-2.5 pb-2">
        {embed && (
          <div className="flex items-center justify-between pb-1.5 text-[9.5px] font-bold text-navy">
            <span className="w-10 tabular-nums">9:41</span>
            <span className="flex items-center gap-1">
              <Signal className="size-3" strokeWidth={2.5} />
              <Wifi className="size-3" strokeWidth={2.5} />
              <BatteryFull className="size-4" strokeWidth={2} />
            </span>
          </div>
        )}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex items-center gap-1 justify-self-start">
            <button
              type="button"
              onClick={() => setInsideBharosa(false)}
              className="grid size-7 cursor-pointer place-items-center rounded-full text-navy hover:bg-page"
              aria-label="Back to Paytm"
              title="Back to Paytm"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="grid size-8 place-items-center rounded-full bg-navy text-[10px] font-bold text-white">
              KS
            </span>
          </div>
          <div className="justify-self-center text-center leading-none">
            <span className="block text-[18px] font-extrabold tracking-[-0.035em] text-[#00baf2]">
              Paytm
            </span>
            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-sky-soft px-1.5 py-0.5 text-[7.5px] font-bold tracking-wide text-navy uppercase">
              <BrainCircuit className="size-2.5" /> Bharosa AI
            </span>
          </div>
          <div className="flex items-center gap-0.5 justify-self-end">
            <ThemeToggle tone="light" className="!size-7 !px-0 sm:!h-7" />
            <button
              type="button"
              onClick={cycleLang}
              disabled={busy !== null || !data}
              className="flex cursor-pointer items-center gap-0.5 rounded-full px-1 py-1 text-[9px] font-bold text-navy hover:bg-page disabled:opacity-50"
              title="Switch language"
            >
              <Languages className="size-3.5" />
              {data?.lang === "hi" ? "हिं" : data?.lang === "hinglish" ? "HI" : "EN"}
            </button>
            <button
              type="button"
              onClick={() => setTab("warn")}
              className="relative grid size-7 cursor-pointer place-items-center rounded-full text-navy hover:bg-page"
              aria-label="Alerts"
            >
              <Bell className="size-4" />
              {data && data.analysis.redFlags.length > 0 && (
                <span className="absolute top-1 right-1 size-1.5 rounded-full bg-bad ring-2 ring-card" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setTab("ask")}
              className="grid size-7 cursor-pointer place-items-center rounded-full text-navy hover:bg-page"
              aria-label="Help"
            >
              <Headphones className="size-4" />
            </button>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-page/80 px-2 py-1">
          <FileText className="size-3 shrink-0 text-sky" />
          <p className="min-w-0 flex-1 truncate text-[9.5px] font-semibold text-ink-2">
            {data?.active.name ?? "Loading document…"}
          </p>
          {data && (
            <Chip tone="sky" className="shrink-0 !bg-sky-soft !text-navy !ring-sky/20">
              {data.active.type === "loan"
                ? "Loan"
                : data.active.type === "credit_card"
                  ? "Card"
                  : "Health"}
            </Chip>
          )}
        </div>
      </header>

      {error && (
        <div className="shrink-0 bg-bad-soft px-3 py-1.5 text-[10.5px] font-medium text-[#b42318]">
          {error}
        </div>
      )}
      {notice && (
        <div className="shrink-0 bg-ok-soft px-3 py-1.5 text-[10px] font-medium text-[#067647]">
          {notice}
        </div>
      )}

      <main className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {!data ? (
          <div className="space-y-2">
            <Skeleton className="h-40" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : tab === "decode" ? (
          <HomeScreen
            data={data}
            busy={busy !== null}
            hidden={hidden}
            onToggleHidden={() => setHidden((value) => !value)}
            onSpeak={speak}
            onWarn={() => setTab("warn")}
            onNavigate={setTab}
            onSelectDoc={(id) => void selectDoc(id)}
            onUploaded={uploaded}
            onFlash={flash}
          />
        ) : tab === "warn" ? (
          <WarnTab data={data} />
        ) : tab === "test" ? (
          <StressTab
            key={data.activeDocId}
            data={data}
            onWorkspace={(next) => setData(next)}
          />
        ) : tab === "ask" ? (
          <AskTab
            data={data}
            question={question}
            setQuestion={setQuestion}
            onSend={() => void send()}
            onVoice={() => void startVoice()}
            voice={voice}
            busy={busy === "ask"}
          />
        ) : (
          <ActTab
            data={data}
            intent={intent}
            paid={paid}
            busy={busy}
            onCheckpoint={() => void openCheckpoint()}
            onApprove={() => void approve()}
            onCancel={() => setIntent(null)}
            onRemind={() => void remind()}
            onEscalate={() => void escalate()}
          />
        )}
        <p className="mt-3 text-center text-[9px] leading-relaxed text-ink-3">
          Guidance from your own document, not approval or claim advice.
        </p>
      </main>

      <nav className="relative grid shrink-0 grid-cols-5 border-t border-line bg-card pt-2 pb-3.5">
        {(
          [
            ["decode", "Home", House],
            ["warn", "Alerts", Bell],
            [null, null, null],
            ["ask", "Ask", MessageSquare],
            ["act", "Act", ShieldCheck],
          ] as const
        ).map(([id, label, Icon], index) =>
          id && label ? (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-0.5 py-1 text-[9px] font-semibold transition-colors",
                tab === id ? "text-navy" : "text-ink-3",
              )}
            >
              <Icon className={cn("size-4.5", tab === id && "text-sky")} />
              {label}
            </button>
          ) : (
            <span key={`gap-${index}`} aria-hidden />
          ),
        )}
        <div className="absolute -top-5 left-1/2 flex -translate-x-1/2 flex-col items-center">
          <UploadDocument
            onDone={uploaded}
            trigger={
              <button
                type="button"
                aria-label="Scan or upload a document"
                className="grid size-[52px] cursor-pointer place-items-center rounded-full bg-sky text-white shadow-[0_10px_24px_-6px_rgba(0,186,242,0.8)] ring-[5px] ring-card transition hover:bg-[#00a6d9] active:scale-95"
              >
                <ScanLine className="size-6" />
              </button>
            }
          />
          <span className="mt-0.5 text-[9px] font-semibold text-navy">Scan</span>
        </div>
      </nav>
    </div>
  );
}

function EmptyCustomer({
  onDone,
  onBack,
}: {
  onDone: (next: WorkspaceData) => void;
  onBack: () => void;
}) {
  return (
    <div className="flex h-dvh flex-col bg-page">
      <header className="shrink-0 border-b border-line bg-card px-3.5 py-3">
        <div className="flex items-center justify-between">
          <div className="leading-none">
            <span className="block text-[18px] font-extrabold tracking-[-0.035em] text-[#00baf2]">Paytm</span>
            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-sky-soft px-1.5 py-0.5 text-[7.5px] font-bold tracking-wide text-navy uppercase">
              <BrainCircuit className="size-2.5" /> Bharosa AI
            </span>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex cursor-pointer items-center gap-0.5 rounded-full bg-sky-soft px-2 py-1 text-[9px] font-bold text-navy"
          >
            <ChevronLeft className="size-3" /> Paytm
          </button>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="rounded-2xl bg-navy p-4 text-white">
          <p className="font-mono text-[8.5px] tracking-[0.16em] text-sky uppercase">Your documents</p>
          <h1 className="mt-1.5 text-[19px] font-extrabold tracking-[-0.03em]">
            Add your first policy or loan
          </h1>
          <p className="mt-1.5 text-[11px] leading-relaxed text-white/60">
            We read only the document you upload. Answers always show the page and clause behind
            them.
          </p>
          <UploadDocument
            onDone={onDone}
            trigger={
              <button
                type="button"
                className="mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-sky px-3 py-2.5 text-[11.5px] font-bold text-navy"
              >
                <ScanLine className="size-4" />
                Upload or scan a document
              </button>
            }
          />
        </div>
        <div className="mt-2.5 space-y-2">
          {[
            "Upload a PDF, photo or text file.",
            "Review the plain-language summary and red flags.",
            "Ask questions and act only after approval.",
          ].map((line, index) => (
            <div key={line} className="flex items-center gap-2.5 rounded-xl border border-line bg-card px-3 py-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-sky-soft font-mono text-[9px] font-bold text-navy">
                {index + 1}
              </span>
              <p className="text-[10.5px] font-medium text-ink-2">{line}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-[9px] leading-relaxed text-ink-3">
          Private to your account. Delete a document any time from Manage.
        </p>
      </main>
    </div>
  );
}

function WarnTab({ data }: { data: WorkspaceData }) {
  return (
    <div className="space-y-2.5">
      <div className="rounded-xl bg-navy px-3 py-2.5 text-white">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold">
          <AlertTriangle className="size-3.5 text-sky" /> What could cost you
        </p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-white/60">
          Every flag below is matched to a page and clause. Nothing is invented.
        </p>
      </div>
      {data.analysis.redFlags.map((flag) => (
        <details
          key={flag.id}
          className={cn(
            "rc-fade-up overflow-hidden rounded-xl border border-line bg-card",
            flag.severity === "high" && "border-l-[3px] border-l-bad",
            flag.severity === "medium" && "border-l-[3px] border-l-warn",
          )}
        >
          <summary className="cursor-pointer list-none px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[8.5px] font-bold uppercase",
                  SEVERITY[flag.severity].className,
                )}
              >
                {SEVERITY[flag.severity].label}
              </span>
              <span className="font-mono text-[8.5px] text-ink-3">{flag.id}</span>
              <span className="ml-auto text-[9px] text-ink-3">p.{flag.source.page}</span>
            </div>
            <p className="mt-1 text-[11.5px] font-semibold leading-snug text-navy">
              {flag.title[data.lang] ?? flag.title.en}
            </p>
          </summary>
          <div className="border-t border-line/60 px-3 py-2">
            <p className="text-[10.5px] leading-relaxed text-ink-2">
              {flag.explain[data.lang] ?? flag.explain.en}
            </p>
            <p className="mt-1 text-[9.5px] leading-relaxed text-ink-3">
              <b className="text-ink-2">Example: </b>
              {flag.example}
            </p>
            <CiteLine citation={flag.source} />
          </div>
        </details>
      ))}
      <div className="flex items-start gap-1.5 rounded-xl border border-line bg-card px-3 py-2">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-ok" />
        <p className="text-[9.5px] leading-relaxed text-ink-3">
          Not a rejection. These are the clauses to negotiate or confirm before you sign.
        </p>
      </div>
    </div>
  );
}

function StressTab({
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
  const [days, setDays] = useState(data.active.health?.roomDays ?? 5);
  const [month, setMonth] = useState(12);
  const [balance, setBalance] = useState(
    Math.round((data.active.card?.revolveBalancePaise ?? 5000000) / 100),
  );
  const [months, setMonths] = useState(6);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const latest = data.stress.find((item) => item.documentId === data.activeDocId);

  const run = async () => {
    setBusy(true);
    setError("");
    try {
      const payload = isHealth
        ? {
            documentId: data.activeDocId,
            scenario: "hospitalization",
            claimPaise: claim * 100,
            roomPerDayPaise: room * 100,
            roomDays: days,
          }
        : isCard
          ? {
              documentId: data.activeDocId,
              scenario: "revolve",
              balancePaise: balance * 100,
              months,
            }
          : { documentId: data.activeDocId, scenario: "prepay", prepayMonth: month };
      const result = await api<{ workspace: WorkspaceData }>("/api/stress", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      onWorkspace(result.workspace);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not run the test.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="rounded-xl bg-navy px-3 py-2.5 text-white">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold">
          <FlaskConical className="size-3.5 text-sky" /> Bharosa AI Stress Test
        </p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-white/60">
          A hypothetical, calculated from your document — not a guess.
        </p>
      </div>

      <section className="rounded-xl border border-line bg-card p-3">
        <div className="grid grid-cols-2 gap-2">
          {isHealth ? (
            <>
              <label className="col-span-2 text-[9px] font-medium text-ink-3">
                Hospital bill (₹)
                <input
                  type="number"
                  value={claim}
                  step={5000}
                  onChange={(event) => setClaim(Number(event.target.value))}
                  className="mt-0.5 h-7 w-full rounded-md border border-line bg-page px-2 text-[11px] font-semibold text-navy outline-none focus:border-sky"
                />
              </label>
              <label className="text-[9px] font-medium text-ink-3">
                Room / day (₹)
                <input
                  type="number"
                  value={room}
                  step={500}
                  onChange={(event) => setRoom(Number(event.target.value))}
                  className="mt-0.5 h-7 w-full rounded-md border border-line bg-page px-2 text-[11px] font-semibold text-navy outline-none focus:border-sky"
                />
              </label>
              <label className="text-[9px] font-medium text-ink-3">
                Days
                <input
                  type="number"
                  value={days}
                  min={1}
                  max={60}
                  onChange={(event) => setDays(Number(event.target.value))}
                  className="mt-0.5 h-7 w-full rounded-md border border-line bg-page px-2 text-[11px] font-semibold text-navy outline-none focus:border-sky"
                />
              </label>
            </>
          ) : isCard ? (
            <>
              <label className="text-[9px] font-medium text-ink-3">
                Balance (₹)
                <input
                  type="number"
                  value={balance}
                  step={5000}
                  onChange={(event) => setBalance(Number(event.target.value))}
                  className="mt-0.5 h-7 w-full rounded-md border border-line bg-page px-2 text-[11px] font-semibold text-navy outline-none focus:border-sky"
                />
              </label>
              <label className="text-[9px] font-medium text-ink-3">
                Months
                <input
                  type="number"
                  value={months}
                  min={1}
                  max={36}
                  onChange={(event) => setMonths(Number(event.target.value))}
                  className="mt-0.5 h-7 w-full rounded-md border border-line bg-page px-2 text-[11px] font-semibold text-navy outline-none focus:border-sky"
                />
              </label>
            </>
          ) : (
            <label className="col-span-2 text-[9px] font-medium text-ink-3">
              Prepay after EMI number
              <input
                type="number"
                value={month}
                min={1}
                max={data.active.loan?.months ?? 24}
                onChange={(event) => setMonth(Number(event.target.value))}
                className="mt-0.5 h-7 w-full rounded-md border border-line bg-page px-2 text-[11px] font-semibold text-navy outline-none focus:border-sky"
              />
            </label>
          )}
        </div>
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy}
          className="mt-2 flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-sky text-[11px] font-semibold text-white hover:bg-[#00a6d9] disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <FlaskConical className="size-3.5" />}
          {busy ? "Calculating…" : "Show the real impact"}
        </button>
        {error && <p className="mt-1 text-[9.5px] text-[#b42318]">{error}</p>}
      </section>

      {latest && (
        <section className="rc-fade-up overflow-hidden rounded-xl border border-sky/25 bg-card">
          <div className="flex items-center justify-between border-b border-line/70 bg-sky-soft/40 px-3 py-2">
            <p className="text-[10.5px] font-semibold text-navy">{latest.title}</p>
            <Chip tone="sky" className="!px-1.5 !text-[8.5px]">
              {latest.engine === "nvidia" ? (
                <><BrainCircuit className="mr-0.5 size-2.5" /> NVIDIA</>
              ) : (
                "verified maths"
              )}
            </Chip>
          </div>
          <p className="px-3 py-2 text-[10.5px] leading-relaxed text-ink-2">
            {latest.narrative ?? latest.verdict}
          </p>
          <dl className="space-y-1 border-t border-line/70 px-3 py-2">
            {latest.lines.map((line) => (
              <div key={line.label} className="flex justify-between gap-2 text-[10px]">
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
          <div className="border-t border-line/70 px-3 py-1.5">
            {latest.citations.map((citation, index) => (
              <CiteLine key={`${latest.id}-${index}`} citation={citation} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AskTab({
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
    <div className="space-y-2.5">
      <div className="rounded-xl bg-navy px-3 py-2.5 text-white">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold">
          <Bot className="size-3.5 text-sky" /> Ask this document
        </p>
        <p className="mt-0.5 text-[10px] text-white/60">
          Cited answers in {data.lang === "hi" ? "Hindi" : data.lang === "hinglish" ? "Hinglish" : "English"}.
          If it is not in the file, Bharosa AI will not guess.
        </p>
      </div>

      <div className="space-y-2">
        {data.messages.length === 0 ? (
          <>
            <p className="text-[10.5px] text-ink-3">Try one of these:</p>
            <div className="flex flex-wrap gap-1.5">
              {data.suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setQuestion(suggestion)}
                  className="cursor-pointer rounded-full border border-line bg-card px-2.5 py-1 text-[10px] font-medium text-ink-2"
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
                <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-navy px-3 py-1.5 text-[10.5px] leading-relaxed text-white">
                  {message.text}
                </p>
              </div>
            ) : (
              <div key={message.id} className="flex gap-1.5">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-sky-soft text-navy">
                  <Bot className="size-3" />
                </span>
                <div className="min-w-0 flex-1 rounded-xl rounded-tl-sm border border-line bg-card px-2.5 py-1.5">
                  <p className="text-[10.5px] leading-relaxed text-ink">{message.text}</p>
                  {message.grounded ? (
                    message.citations.map((citation, index) => (
                      <CiteLine key={`${message.id}-${index}`} citation={citation} />
                    ))
                  ) : (
                    <span className="mt-1 inline-block rounded-full bg-page px-1.5 py-0.5 text-[8.5px] font-semibold text-ink-3">
                      Not available in this document
                    </span>
                  )}
                </div>
              </div>
            ),
          )
        )}
        {busy && (
          <p className="flex items-center gap-1 text-[9.5px] text-ink-3">
            <Loader2 className="size-3 animate-spin" /> Checking the document…
          </p>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
        className="sticky bottom-0 flex items-center gap-1 rounded-xl border border-line bg-card p-1.5"
      >
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={
            listening ? "Listening… tap to stop" : processingVoice ? "Transcribing…" : "Ask a question"
          }
          className="h-8 min-w-0 flex-1 bg-transparent px-1.5 text-[11px] text-ink outline-none placeholder:text-ink-3"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={onVoice}
          disabled={busy || processingVoice}
          aria-label={listening ? "Stop recording" : "Dictate"}
          title={listening ? "Stop recording" : "Voice input (Sarvam)"}
        >
          {processingVoice ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Mic className={listening ? "text-bad animate-pulse" : undefined} />
          )}
        </Button>
        <button
          type="submit"
          disabled={busy || !question.trim()}
          className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg bg-sky text-white disabled:opacity-40"
          aria-label="Send question"
        >
          <Send className="size-3.5" />
        </button>
      </form>
    </div>
  );
}

function ActTab({
  data,
  intent,
  paid,
  busy,
  onCheckpoint,
  onApprove,
  onCancel,
  onRemind,
  onEscalate,
}: {
  data: WorkspaceData;
  intent: (PaymentIntent & { token: string }) | null;
  paid: boolean;
  busy: string | null;
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

  return (
    <div className="space-y-2.5">
      <div className="rounded-xl bg-navy px-3 py-2.5 text-white">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold">
          <ShieldCheck className="size-3.5 text-sky" /> You stay in control
        </p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-white/60">
          A 30-second checkpoint before any payment. No auto-submit, no hidden mandate.
        </p>
      </div>

      {paid && (
        <div className="rc-fade-up flex items-center gap-2 rounded-xl border border-ok/30 bg-ok-soft px-3 py-2">
          <Check className="size-4 text-[#067647]" />
          <div>
            <p className="text-[10.5px] font-semibold text-[#067647]">Payment approved</p>
            <p className="text-[9px] text-[#067647]/80">Receipt recorded in the audit trail.</p>
          </div>
        </div>
      )}

      {intent ? (
        <div className="rc-pop rounded-xl border border-sky/30 bg-card p-3">
          <p className="flex items-center gap-1.5 text-[9px] font-bold tracking-[0.12em] text-navy uppercase">
            <ShieldCheck className="size-3 text-sky" /> Trust Checkpoint
          </p>
          <div className="mt-2 space-y-1.5 text-[10.5px]">
            <div className="flex justify-between">
              <span className="text-ink-3">Payee</span>
              <b className="text-navy">{intent.payee}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-3">Amount</span>
              <b className="tabular text-navy">{money(intent.amountPaise)}</b>
            </div>
            <div className="flex justify-between gap-3">
              <span className="shrink-0 text-ink-3">For</span>
              <span className="text-right font-medium text-ink">{intent.purpose}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-3">Risk flags on file</span>
              <b className="text-[#b42318]">{data.analysis.redFlags.length}</b>
            </div>
          </div>
          <div className="mt-2 flex gap-1.5">
            <Button variant="secondary" size="sm" className="flex-1" onClick={onCancel}>
              <X /> Cancel
            </Button>
            <Button variant="approve" size="sm" className="flex-1" onClick={onApprove} disabled={busy !== null}>
              {busy === "approve" ? <Loader2 className="animate-spin" /> : <Check />} Approve
            </Button>
          </div>
        </div>
      ) : (
        <section className="rounded-xl border border-line bg-card p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] text-ink-3">Next payment</p>
              <p className="text-[11.5px] font-semibold text-navy">{payee}</p>
              <p className="mt-0.5 text-[9px] text-ink-3">
                {isLoan ? "Processing fee" : isCard ? "Annual fee" : "Annual premium"}
              </p>
            </div>
            <p className="text-[20px] font-extrabold tracking-tight text-navy tabular">{money(amount)}</p>
          </div>
          <Button variant="primary" size="lg" className="mt-2 w-full" onClick={onCheckpoint} disabled={busy !== null}>
            {busy === "checkpoint" ? <Loader2 className="animate-spin" /> : <Wallet />}
            Review payment request
          </Button>
          <p className="mt-1 text-center text-[8.5px] text-ink-3">
            Records your approval · requires a connected payment provider to move money
          </p>
        </section>
      )}

      <button
        type="button"
        onClick={onRemind}
        disabled={busy !== null}
        className="flex w-full cursor-pointer items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 text-left"
      >
        <Bell className="size-4 text-sky" />
        <span className="min-w-0 flex-1">
          <span className="block text-[10.5px] font-semibold text-navy">Remind me before the due date</span>
          <span className="block text-[9px] text-ink-3">
            {data.reminders.length > 0
              ? `${data.reminders.length} scheduled · next ${formatDate(data.reminders[0].dueAt)}`
              : "In-app reminder, 7 days before"}
          </span>
        </span>
        <ChevronRight className="size-3.5 text-ink-3" />
      </button>

      <button
        type="button"
        onClick={onEscalate}
        disabled={busy !== null}
        className="flex w-full cursor-pointer items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 text-left"
      >
        <UserRound className="size-4 text-sky" />
        <span className="min-w-0 flex-1">
          <span className="block text-[10.5px] font-semibold text-navy">Talk to a human</span>
          <span className="block text-[9px] text-ink-3">Sends the transcript and citations</span>
        </span>
        <ArrowRight className="size-3.5 text-ink-3" />
      </button>

      <div className="rounded-xl border border-line bg-card px-3 py-2">
        <p className="flex items-center gap-1.5 text-[9.5px] font-semibold text-ink-2">
          <Clock className="size-3 text-ink-3" /> Recent activity
        </p>
        <ul className="mt-1 space-y-1">
          {data.audit.slice(0, 3).map((event) => (
            <li key={event.id} className="flex items-center gap-1.5 text-[8.5px] text-ink-3">
              <span className="size-1 rounded-full bg-sky" />
              <span className="truncate">{event.event}</span>
              <span className="ml-auto shrink-0">{formatDate(event.at)}</span>
            </li>
          ))}
        </ul>
      </div>

      {data.escalations.length > 0 && (
        <p className="flex items-center gap-1 text-[9px] text-[#067647]">
          <BadgeCheck className="size-3" /> {data.escalations.length} human escalation
          {data.escalations.length === 1 ? "" : "s"} open
        </p>
      )}
      {data.metrics.paymentsPaise > 0 && (
        <p className="flex items-center gap-1 text-[9px] text-ink-3">
          <Languages className="size-3" /> Approved payments: {money(data.metrics.paymentsPaise)}
        </p>
      )}
    </div>
  );
}

function CiteLine({ citation }: { citation: Citation }) {
  return (
    <details className="mt-0.5">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[8.5px] text-ink-3">
        <CircleAlert className="size-2.5" /> p.{citation.page} · cl. {citation.clause}
      </summary>
      <p className="mt-0.5 border-l-2 border-sky/40 pl-1.5 text-[8.5px] leading-relaxed text-ink-2">
        “{citation.quote}”
      </p>
    </details>
  );
}
