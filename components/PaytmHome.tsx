"use client";

import {
  BatteryFull,
  Bell,
  BrainCircuit,
  ChevronRight,
  CircleHelp,
  Copy,
  Eye,
  EyeOff,
  Headphones,
  History,
  House,
  Landmark,
  Languages,
  Lightbulb,
  QrCode,
  ScanLine,
  Signal,
  Smartphone,
  UserRound,
  Wallet,
  Wifi,
} from "lucide-react";
import { useState } from "react";

const UPI_ACTIONS = [
  { label: "Scan & Pay", icon: QrCode },
  { label: "To Mobile or Contact", icon: Smartphone },
  { label: "To Bank a/c or UPI ID", icon: Landmark },
  { label: "To Self A/c", icon: UserRound },
];

const RECHARGES = [
  { label: "Mobile Recharge", icon: Smartphone },
  { label: "Electricity Bill", icon: Lightbulb },
  { label: "DTH Recharge", icon: ScanLine },
  { label: "FASTag Recharge", icon: Wallet },
];

const RECENT = [
  {
    name: "Chai Point",
    detail: "Yesterday, 6:54 pm · HDFC Bank",
    amount: "− ₹60",
    tone: "bg-[#f97316]",
  },
  {
    name: "BESCOM Electricity",
    detail: "Yesterday, 6:39 pm · HDFC Bank",
    amount: "− ₹1,860",
    tone: "bg-[#fb923c]",
  },
];

/**
 * The Paytm app home screen. Bharosa AI appears here as one of the Paytm
 * features; opening it hands control to the full Bharosa flow.
 */
export function PaytmHome({
  onOpenBharosa,
  embed = false,
}: {
  onOpenBharosa: () => void;
  embed?: boolean;
}) {
  const [hidden, setHidden] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f3f6fa]">
      <header className="shrink-0 bg-white px-3.5 pt-2.5 pb-2">
        {embed && (
          <div className="flex items-center justify-between pb-1.5 text-[9.5px] font-bold text-[#002970]">
            <span className="w-10 tabular-nums">9:41</span>
            <span className="flex items-center gap-1">
              <Signal className="size-3" strokeWidth={2.5} />
              <Wifi className="size-3" strokeWidth={2.5} />
              <BatteryFull className="size-4" strokeWidth={2} />
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-full bg-[#00baf2] text-[10px] font-bold text-white">
              KN
            </span>
            <span className="text-[18px] font-extrabold tracking-[-0.035em] text-[#00baf2]">Paytm</span>
          </div>
          <div className="flex items-center gap-0.5 text-[#002970]">
            <button type="button" className="grid size-7 cursor-pointer place-items-center rounded-full hover:bg-[#f3f6fa]" aria-label="Language">
              <Languages className="size-4" />
            </button>
            <button type="button" className="grid size-7 cursor-pointer place-items-center rounded-full hover:bg-[#f3f6fa]" aria-label="Notifications">
              <Bell className="size-4" />
            </button>
            <button type="button" className="grid size-7 cursor-pointer place-items-center rounded-full hover:bg-[#f3f6fa]" aria-label="Support">
              <Headphones className="size-4" />
            </button>
            <button type="button" className="grid size-7 cursor-pointer place-items-center rounded-full hover:bg-[#f3f6fa]" aria-label="Profile">
              <UserRound className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-2.5">
        <section className="rounded-2xl bg-white p-3">
          <p className="text-[11.5px] font-bold text-[#002970]">UPI Money Transfer</p>
          <div className="mt-2.5 grid grid-cols-4 gap-1">
            {UPI_ACTIONS.map((action) => (
              <div key={action.label} className="flex flex-col items-center gap-1 text-center">
                <span className="grid size-11 place-items-center rounded-full bg-[#00baf2] text-white shadow-[0_4px_10px_-4px_rgba(0,186,242,0.7)]">
                  <action.icon className="size-5" />
                </span>
                <span className="text-[8.5px] leading-tight font-semibold text-[#002970]">{action.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#f3f6fa] px-2 py-1 text-[8.5px] font-semibold text-[#002970]">
              Balance &amp; History <ChevronRight className="size-2.5" />
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#f3f6fa] px-2 py-1 text-[8.5px] font-semibold text-[#002970]">
              Receive Money <ChevronRight className="size-2.5" />
            </span>
          </div>
          <p className="mt-1.5 flex items-center gap-1 font-mono text-[8px] text-[#667085]">
            UPI ID: 98xxxxxx00@ptyes <Copy className="size-2.5 text-[#00baf2]" />
          </p>
        </section>

        <section className="flex items-center gap-2.5 rounded-2xl bg-white p-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e6f7fc] text-[#00baf2]">
            <Landmark className="size-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-medium text-[#667085]">Total Balance · HDFC Bank ••4521</p>
            <p className="mt-0.5 text-[21px] font-extrabold tracking-tight text-[#002970] tabular">
              {hidden ? "••••••" : "₹12,848"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setHidden((value) => !value)}
            className="grid size-7 cursor-pointer place-items-center rounded-full text-[#667085] hover:bg-[#f3f6fa]"
            aria-label={hidden ? "Show balance" : "Hide balance"}
          >
            {hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </section>

        <button
          type="button"
          onClick={onOpenBharosa}
          className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-[#00baf2]/30 bg-gradient-to-r from-[#002970] to-[#003c8f] p-3 text-left shadow-[0_10px_24px_-16px_rgba(0,41,112,0.7)] transition active:scale-[0.99]"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#00baf2] text-white">
            <BrainCircuit className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-white">
              Bharosa AI
              <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[7.5px] font-bold tracking-wide text-[#7dd3fc] uppercase">
                New
              </span>
            </span>
            <span className="mt-0.5 block text-[9.5px] leading-relaxed text-white/70">
              Understand loans, cards &amp; policies with cited answers before you pay or sign.
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-white/60" />
        </button>

        <section className="rounded-2xl bg-white p-3">
          <div className="flex items-center justify-between">
            <p className="text-[11.5px] font-bold text-[#002970]">Recharges &amp; Bill Payments</p>
            <span className="text-[9px] font-semibold text-[#00baf2]">View all</span>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1">
            {RECHARGES.map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-1 text-center">
                <span className="grid size-10 place-items-center rounded-full border border-[#00baf2]/30 text-[#00baf2]">
                  <item.icon className="size-4" />
                </span>
                <span className="text-[8px] leading-tight font-semibold text-[#344054]">{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl bg-white">
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
            <p className="text-[11.5px] font-bold text-[#002970]">Recent Payments</p>
            <span className="text-[9px] font-semibold text-[#00baf2]">See all</span>
          </div>
          <ul className="divide-y divide-[#eef2f6]">
            {RECENT.map((item) => (
              <li key={item.name} className="flex items-center gap-2.5 px-3 py-2">
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white ${item.tone}`}
                >
                  {item.name.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[10.5px] font-semibold text-[#002970]">{item.name}</span>
                  <span className="block truncate text-[8.5px] text-[#667085]">{item.detail}</span>
                </span>
                <span className="shrink-0 text-[10.5px] font-bold text-[#002970] tabular">{item.amount}</span>
              </li>
            ))}
          </ul>
        </section>

        <p className="pb-1 text-center text-[8.5px] leading-relaxed text-[#98a2b3]">
          Paytm demo shell · Bharosa AI is a Paytm feature
        </p>
      </main>

      <nav className="relative grid shrink-0 grid-cols-5 border-t border-[#e4e7ec] bg-white pt-2 pb-3.5">
        {[
          { label: "Home", icon: House, active: true },
          { label: "History", icon: History, active: false },
          { label: null, icon: null, active: false },
          { label: "Help", icon: CircleHelp, active: false },
          { label: "Alerts", icon: Bell, active: false },
        ].map((item) =>
          item.label && item.icon ? (
            <div
              key={item.label}
              className={`flex flex-col items-center gap-0.5 text-[9px] font-semibold ${
                item.active ? "text-[#002970]" : "text-[#667085]"
              }`}
            >
              <item.icon className={`size-[18px] ${item.active ? "text-[#00baf2]" : ""}`} />
              {item.label}
            </div>
          ) : (
            <span key="scan-slot" aria-hidden />
          ),
        )}
        <div className="absolute -top-5 left-1/2 flex -translate-x-1/2 flex-col items-center">
          <span className="grid size-[52px] place-items-center rounded-full bg-[#00baf2] text-white shadow-[0_10px_24px_-6px_rgba(0,186,242,0.8)] ring-[5px] ring-white">
            <ScanLine className="size-6" />
          </span>
          <span className="mt-0.5 text-[9px] font-semibold text-[#002970]">Scan</span>
        </div>
      </nav>
    </div>
  );
}
