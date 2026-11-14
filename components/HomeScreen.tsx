"use client";

import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  Check,
  ChevronRight,
  CircleAlert,
  Clock,
  Copy,
  Eye,
  EyeOff,
  FileText,
  FlaskConical,
  MessageSquare,
  Plus,
  ReceiptText,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Upload,
  Volume2,
  Wallet,
} from "lucide-react";
import type { Citation, WorkspaceData } from "@/lib/bharosa";
import { cn, formatDate } from "@/components/ui";
import { UploadDocument } from "@/components/UploadDocument";

type HomeTab = "warn" | "test" | "ask" | "act";

function money(paise: number, fraction = 0) {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    maximumFractionDigits: fraction,
    minimumFractionDigits: fraction,
  })}`;
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className="rounded-xl border border-line bg-card px-2.5 py-2">
      <p className="text-[8.5px] font-medium text-ink-3">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-[14px] font-extrabold tracking-tight tabular",
          tone === "warn" ? "text-[#b54708]" : "text-navy",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function SourceLine({ citation }: { citation: Citation }) {
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

export function HomeScreen({
  data,
  busy,
  hidden,
  onToggleHidden,
  onSpeak,
  onWarn,
  onNavigate,
  onSelectDoc,
  onUploaded,
  onFlash,
}: {
  data: WorkspaceData;
  busy: boolean;
  hidden: boolean;
  onToggleHidden: () => void;
  onSpeak: () => void;
  onWarn: () => void;
  onNavigate: (tab: HomeTab) => void;
  onSelectDoc: (id: string) => void;
  onUploaded: (workspace: WorkspaceData) => void;
  onFlash: (text: string) => void;
}) {
  const loan = data.analysis.calc.kind === "loan" ? data.analysis.calc : null;
  const health = data.analysis.calc.kind === "health" ? data.analysis.calc : null;
  const card = data.analysis.calc.kind === "card" ? data.analysis.calc : null;
  const headline = loan
    ? money(loan.principalPaise)
    : health
      ? money(data.active.health?.sumInsuredPaise ?? 0)
      : card
        ? money(card.limitPaise)
        : "—";
  const coverLabel = loan ? "Loan amount" : health ? "Total cover" : card ? "Credit limit" : "Document";
  const policyId = `BHR-${data.active.id.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase()}`;
  const last4 = String(Math.abs(data.active.hash.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)) % 10000).padStart(4, "0");
  const payee =
    data.active.loan?.payee ??
    data.active.health?.payee ??
    data.active.card?.payee ??
    data.active.issuer;

  const copyId = () => {
    if (!navigator.clipboard) {
      onFlash(policyId);
      return;
    }
    void navigator.clipboard
      .writeText(policyId)
      .then(() => onFlash("Document ID copied."))
      .catch(() => onFlash(policyId));
  };

  const payments = data.payments.slice(0, 3).map((payment) => ({
    name: payment.payee,
    detail: `${payment.purpose} · ${formatDate(payment.createdAt)}`,
    amount: payment.amountPaise,
    paid: payment.status === "paid",
  }));
  const due = loan
    ? [
        { name: payee, detail: "Processing fee · due now", amount: loan.feesPaise, paid: false },
        { name: "Monthly EMI", detail: "Next cycle · approval required", amount: loan.emiPaise, paid: false },
      ]
    : health
      ? [
          { name: payee, detail: "Annual premium · due now", amount: data.active.health?.premiumPaise ?? 0, paid: false },
          { name: "Estimated claim share", detail: "From your policy terms", amount: health.outOfPocketPaise, paid: false },
        ]
      : card
        ? [
            { name: payee, detail: "Annual fee · due now", amount: data.active.card?.annualFeePaise ?? 0, paid: false },
            { name: "Minimum due", detail: "This statement · approval required", amount: card.minDuePaise, paid: false },
          ]
        : [];
  const recent = payments.length > 0 ? payments : due;

  const actions = [
    {
      label: "Scan doc",
      node: (
        <UploadDocument
          onDone={onUploaded}
          trigger={
            <button
              type="button"
              className="flex cursor-pointer flex-col items-center gap-1 rounded-xl px-0.5 py-1 transition hover:bg-page/70"
            >
              <span className="grid size-11 place-items-center rounded-[15px] bg-sky text-white shadow-[0_4px_10px_-3px_rgba(0,186,242,0.6)]">
                <ScanLine className="size-5" />
              </span>
              <span className="text-[8.5px] font-semibold text-ink-2">Scan doc</span>
            </button>
          }
        />
      ),
    },
    {
      label: "Upload",
      node: (
        <UploadDocument
          onDone={onUploaded}
          trigger={
            <button
              type="button"
              className="flex cursor-pointer flex-col items-center gap-1 rounded-xl px-0.5 py-1 transition hover:bg-page/70"
            >
              <span className="grid size-11 place-items-center rounded-[15px] bg-sky text-white shadow-[0_4px_10px_-3px_rgba(0,186,242,0.6)]">
                <Upload className="size-5" />
              </span>
              <span className="text-[8.5px] font-semibold text-ink-2">Upload</span>
            </button>
          }
        />
      ),
    },
    {
      label: "Ask AI",
      node: (
        <button
          type="button"
          onClick={() => onNavigate("ask")}
          className="group flex cursor-pointer flex-col items-center gap-1 rounded-xl px-0.5 py-1 transition hover:bg-page/70"
        >
          <span className="grid size-11 place-items-center rounded-[15px] bg-sky text-white shadow-[0_4px_10px_-3px_rgba(0,186,242,0.6)] transition group-hover:-translate-y-0.5">
            <MessageSquare className="size-5" />
          </span>
          <span className="text-[8.5px] font-semibold text-ink-2">Ask AI</span>
        </button>
      ),
    },
    {
      label: "Pay safely",
      node: (
        <button
          type="button"
          onClick={() => onNavigate("act")}
          className="group flex cursor-pointer flex-col items-center gap-1 rounded-xl px-0.5 py-1 transition hover:bg-page/70"
        >
          <span className="grid size-11 place-items-center rounded-[15px] bg-sky text-white shadow-[0_4px_10px_-3px_rgba(0,186,242,0.6)] transition group-hover:-translate-y-0.5">
            <Wallet className="size-5" />
          </span>
          <span className="text-[8.5px] font-semibold text-ink-2">Pay safely</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-2.5">
      <section className="rc-fade-up rounded-2xl border border-line bg-card px-3 pt-2.5 pb-2">
        <div className="flex items-center justify-between">
          <p className="text-[11.5px] font-bold text-navy">Protection & payments</p>
          <span className="rounded-full bg-ok-soft px-1.5 py-0.5 text-[8px] font-bold text-[#067647]">
            Active cover
          </span>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-0.5">{actions.map((action) => <div key={action.label}>{action.node}</div>)}</div>
        <div className="mt-1.5 flex gap-1.5">
          <button
            type="button"
            onClick={() => onNavigate("warn")}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-full bg-sky-soft py-1.5 text-[8.5px] font-semibold text-navy"
          >
            Risk detail <ChevronRight className="size-2.5" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate("act")}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-full bg-sky-soft py-1.5 text-[8.5px] font-semibold text-navy"
          >
            Talk to a human <ChevronRight className="size-2.5" />
          </button>
        </div>
        <div className="mt-1.5 flex items-center justify-between border-t border-line/70 pt-1.5">
          <p className="flex items-center gap-1 font-mono text-[8px] tracking-wide text-ink-3">
            DOC ID: {policyId}
            <button
              type="button"
              onClick={copyId}
              className="cursor-pointer text-sky hover:text-navy"
              aria-label="Copy document ID"
            >
              <Copy className="size-2.5" />
            </button>
          </p>
          <p className="text-[8px] font-medium text-ink-3">{payee}</p>
        </div>
      </section>

      <section className="flex items-center gap-2.5 rounded-2xl border border-line bg-card px-3 py-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sky-soft text-navy">
          <ShieldCheck className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[9px] font-medium text-ink-3">
            {coverLabel} · {data.active.issuer} ••{last4}
          </p>
          <p className="mt-0.5 text-[21px] leading-none font-extrabold tracking-tight text-navy tabular">
            {hidden ? "••••••" : headline}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleHidden}
          className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-full text-ink-3 hover:bg-page hover:text-navy"
          aria-label={hidden ? "Show amount" : "Hide amount"}
        >
          {hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </section>

      <section className="rounded-2xl border border-line bg-card px-3 py-2">
        <div className="flex items-center justify-between">
          <p className="text-[11.5px] font-bold text-navy">Cover & bills</p>
          <button
            type="button"
            onClick={() => onNavigate("act")}
            className="cursor-pointer text-[9px] font-semibold text-sky"
          >
            View all
          </button>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1">
          <button
            type="button"
            onClick={() => onNavigate("test")}
            className="flex cursor-pointer flex-col items-center gap-1 rounded-lg py-0.5 hover:bg-page/60"
          >
            <span className="grid size-10 place-items-center rounded-full border border-sky/25 text-sky">
              <FlaskConical className="size-4" />
            </span>
            <span className="text-[8px] font-semibold text-ink-2">Stress test</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("act")}
            className="flex cursor-pointer flex-col items-center gap-1 rounded-lg py-0.5 hover:bg-page/60"
          >
            <span className="grid size-10 place-items-center rounded-full border border-sky/25 text-sky">
              <Bell className="size-4" />
            </span>
            <span className="text-[8px] font-semibold text-ink-2">Reminders</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("warn")}
            className="flex cursor-pointer flex-col items-center gap-1 rounded-lg py-0.5 hover:bg-page/60"
          >
            <span className="grid size-10 place-items-center rounded-full border border-sky/25 text-sky">
              <AlertTriangle className="size-4" />
            </span>
            <span className="text-[8px] font-semibold text-ink-2">Alerts</span>
          </button>
          <UploadDocument
            onDone={onUploaded}
            trigger={
              <button
                type="button"
                className="flex cursor-pointer flex-col items-center gap-1 rounded-lg py-0.5 hover:bg-page/60"
              >
                <span className="grid size-10 place-items-center rounded-full border border-sky/25 text-sky">
                  <Plus className="size-4" />
                </span>
                <span className="text-[8px] font-semibold text-ink-2">Add doc</span>
              </button>
            }
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-line bg-card">
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
          <p className="text-[11.5px] font-bold text-navy">
            {payments.length > 0 ? "Recent payments" : "Payments & dues"}
          </p>
          <button
            type="button"
            onClick={() => onNavigate("act")}
            className="cursor-pointer text-[9px] font-semibold text-sky"
          >
            See all
          </button>
        </div>
        <ul className="divide-y divide-line/60">
          {recent.map((item, index) => (
            <li key={`${item.name}-${index}`}>
              <button
                type="button"
                onClick={() => onNavigate("act")}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left hover:bg-page/60"
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                    index % 2 === 0 ? "bg-sky-soft text-navy" : "bg-warn-soft text-[#b54708]",
                  )}
                >
                  {item.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[10.5px] font-semibold text-navy">{item.name}</span>
                  <span className="block truncate text-[8.5px] text-ink-3">{item.detail}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[10.5px] font-bold text-navy tabular">
                    {item.paid ? "−" : ""}
                    {money(item.amount)}
                  </span>
                  <span className="block text-[7.5px] font-medium text-ink-3">
                    {item.paid ? "Approved" : "Review"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="overflow-hidden rounded-xl border border-line bg-card">
        <div className="flex items-center justify-between border-b border-line/70 px-3 py-2">
          <p className="text-[11px] font-semibold text-navy">Your documents</p>
          <span className="text-[9px] text-ink-3">{data.documents.length} in workspace</span>
        </div>
        <ul className="divide-y divide-line/60">
          {data.documents.map((doc) => {
            const active = doc.id === data.activeDocId;
            return (
              <li key={doc.id}>
                <button
                  type="button"
                  onClick={() => onSelectDoc(doc.id)}
                  disabled={busy || active}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors",
                    active ? "bg-sky-soft/50" : "hover:bg-page/70",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-lg",
                      active ? "bg-sky text-white" : "bg-page text-ink-3",
                    )}
                  >
                    <FileText className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[10.5px] font-semibold text-navy">
                      {doc.name.split("—")[0]?.trim() ?? doc.name}
                    </span>
                    <span className="block text-[8.5px] text-ink-3">
                      {doc.type === "loan" ? "Loan" : doc.type === "credit_card" ? "Card" : "Health"} ·{" "}
                      {doc.flags} flags · {doc.pages}p
                    </span>
                  </span>
                  {active ? (
                    <BadgeCheck className="size-3.5 shrink-0 text-sky" />
                  ) : (
                    <ChevronRight className="size-3.5 shrink-0 text-ink-3" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rc-fade-up overflow-hidden rounded-xl border border-line bg-card">
        <div className="flex items-center justify-between border-b border-line/70 px-3 py-2">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-navy">
            <Sparkles className="size-3.5 text-sky" /> 30-second summary
          </p>
          <button
            type="button"
            onClick={onSpeak}
            className="inline-flex cursor-pointer items-center gap-1 text-[9.5px] font-semibold text-ink-3 hover:text-navy"
          >
            <Volume2 className="size-3" /> Listen
          </button>
        </div>
        <p className="px-3 py-2.5 text-[11px] leading-relaxed text-ink-2">{data.analysis.summary}</p>
        <div className="flex items-center gap-1 border-t border-line/70 px-3 py-1.5">
          <BadgeCheck className="size-3 text-[#067647]" />
          <span className="text-[9px] font-medium text-[#067647]">
            {data.analysis.citationsVerified}/{data.analysis.citationsChecked} citations verified
          </span>
          <span className="ml-auto font-mono text-[8.5px] text-ink-3">{data.active.pages} pages</span>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        {loan ? (
          <>
            <MiniStat label="Monthly EMI" value={money(loan.emiPaise)} />
            <MiniStat label="Effective APR" value={`${loan.aprPct.toFixed(1)}%`} tone="warn" />
            <MiniStat label="You receive" value={money(loan.netDisbursalPaise)} />
            <MiniStat label="Total repayment" value={money(loan.totalPaise)} />
          </>
        ) : health ? (
          <>
            <MiniStat label="Sum insured" value={money(data.active.health?.sumInsuredPaise ?? 0)} />
            <MiniStat label={`You pay on ${money(health.claimPaise)}`} value={money(health.outOfPocketPaise)} tone="warn" />
            <MiniStat label="Room rent cap" value={`${money(health.roomCapPaise)}/day`} />
            <MiniStat label="Co-pay" value={`${data.active.health?.copayPct ?? 0}%`} />
          </>
        ) : card ? (
          <>
            <MiniStat label="Credit limit" value={money(card.limitPaise)} />
            <MiniStat label="Monthly interest" value={money(card.monthlyInterestPaise)} tone="warn" />
            <MiniStat label="Minimum due" value={money(card.minDuePaise)} />
            <MiniStat label="Revolving APR" value={`${card.aprPct}%`} tone="warn" />
          </>
        ) : null}
      </div>

      <section className="overflow-hidden rounded-xl border border-line bg-card">
        <div className="flex items-center justify-between border-b border-line/70 px-3 py-2">
          <p className="text-[11px] font-semibold text-navy">What the document says</p>
          <span className="text-[9px] text-ink-3">{data.analysis.facts.length} facts</span>
        </div>
        <ul className="divide-y divide-line/60">
          {data.analysis.facts.slice(0, 5).map((fact) => (
            <li key={fact.key} className="px-3 py-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-ink-3">{fact.label}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[8.5px] font-semibold",
                    fact.evidence === "stated"
                      ? "bg-ok-soft text-[#067647]"
                      : "bg-warn-soft text-[#b54708]",
                  )}
                >
                  {fact.evidence}
                </span>
              </div>
              <p className="text-[11px] font-semibold text-navy">{fact.value}</p>
              {fact.source && <SourceLine citation={fact.source} />}
            </li>
          ))}
        </ul>
      </section>

      <button
        type="button"
        onClick={onWarn}
        className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-warn/20 bg-warn-soft/50 px-3 py-2 text-left"
      >
        <span className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-[#b54708]" />
          <span className="text-[11px] font-semibold text-[#7a3b06]">
            {data.analysis.redFlags.length} red flags found
          </span>
        </span>
        <ChevronRight className="size-4 text-[#b54708]" />
      </button>

      <section className="overflow-hidden rounded-xl border border-line bg-card">
        <div className="flex items-center justify-between border-b border-line/70 px-3 py-2">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-navy">
            <Clock className="size-3.5 text-sky" /> Recent activity
          </p>
          <span className="text-[9px] text-ink-3">{data.audit.length} events</span>
        </div>
        <ul className="divide-y divide-line/60">
          {data.audit.slice(0, 3).map((event) => (
            <li key={event.id} className="flex items-center gap-2 px-3 py-1.5">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-page text-ink-3">
                <ReceiptText className="size-3" />
              </span>
              <span className="min-w-0 flex-1 truncate text-[9.5px] font-medium text-ink-2">
                {event.event}
              </span>
              <span className="shrink-0 text-[8px] text-ink-3">{formatDate(event.at)}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="flex items-center justify-center gap-1 text-[8.5px] text-ink-3">
        <Check className="size-2.5 text-ok" /> Guidance, not approval or claim advice.
      </p>
    </div>
  );
}
