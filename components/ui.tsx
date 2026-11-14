"use client";

import type { ReactNode } from "react";

export function cn(...values: (string | false | null | undefined)[]) {
  return values.filter(Boolean).join(" ");
}

export function money(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

export function timeAgo(iso: string | null | undefined) {
  if (!iso) return "—";
  const seconds = Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / 1000),
  );
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export function clock(iso?: string | null, withSeconds = false) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" } : {}),
  });
}

export function clockRange(iso: string) {
  const t = new Date(iso).getTime();
  return `${clock(new Date(t - 30000).toISOString())}–${clock(
    new Date(t + 30000).toISOString(),
  )}`;
}

export function Logo({
  className = "",
  tone = "light",
}: {
  className?: string;
  tone?: "light" | "dark";
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="#00baf2" />
        <path
          d="M8.5 22.5v-13h5.8a4.1 4.1 0 0 1 0 8.2H8.5"
          fill="none"
          stroke="#002e6e"
          strokeWidth="2.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m20.5 12.8 2.7 2.7 4.1-4.2"
          fill="none"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className={cn(
          "text-[18px] font-extrabold leading-none tracking-[-0.035em]",
          tone === "light" ? "text-white" : "text-navy",
        )}
      >
        bharosa<span className="text-sky"> ai</span>
      </span>
    </span>
  );
}

export function formatDate(iso: string, withYear = false) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function SectionLabel({
  index,
  children,
  tone = "dark",
}: {
  index: string;
  children: ReactNode;
  tone?: "light" | "dark";
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-2.5 font-mono text-[10.5px] font-medium tracking-[0.18em] uppercase",
        tone === "light" ? "text-sky" : "text-ink-3",
      )}
    >
      <span className={tone === "light" ? "text-white/45" : "text-ink-3"}>{index}</span>
      <span className={cn("h-px w-7", tone === "light" ? "bg-white/20" : "bg-line")} />
      {children}
    </p>
  );
}

const CHIP_TONES: Record<string, string> = {
  neutral: "bg-page text-ink-2 ring-line",
  sky: "bg-sky-soft text-navy-2 ring-sky/20",
  ok: "bg-ok-soft text-[#067647] ring-ok/20",
  warn: "bg-warn-soft text-[#b54708] ring-warn/20",
  bad: "bg-bad-soft text-[#b42318] ring-bad/20",
  navy: "bg-navy text-white ring-navy",
};

export function Chip({
  tone = "neutral",
  className,
  children,
}: {
  tone?: keyof typeof CHIP_TONES;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        CHIP_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const BUTTON: Record<string, string> = {
  primary:
    "bg-sky text-white shadow-[0_4px_12px_-4px_rgba(0,186,242,0.7)] hover:bg-[#00a6d9]",
  approve:
    "bg-ok text-white shadow-[0_4px_12px_-4px_rgba(18,183,106,0.7)] hover:bg-[#0e9f5c]",
  secondary:
    "bg-card text-navy ring-1 ring-inset ring-line shadow-[0_1px_2px_rgba(16,24,40,0.05)] hover:bg-page",
  ghost: "text-ink-2 hover:bg-page hover:text-navy",
  danger: "text-[#b42318] hover:bg-bad-soft",
  dark: "bg-white/10 text-white ring-1 ring-inset ring-white/15 hover:bg-white/20",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof BUTTON;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:shrink-0",
        size === "sm" && "h-7 px-2.5 text-xs [&_svg]:size-3.5",
        size === "md" && "h-8 px-3 text-[13px] [&_svg]:size-4",
        size === "lg" && "h-10 px-5 text-sm [&_svg]:size-4",
        BUTTON[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-line/80 bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_28px_-18px_rgba(0,46,110,0.28)]",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  icon,
  title,
  meta,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-3 border-b border-line/80 px-4 py-2.5",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {icon && <span className="text-sky [&_svg]:size-4">{icon}</span>}
        <h2 className="truncate text-[13px] font-semibold text-navy">{title}</h2>
      </div>
      {meta && <div className="shrink-0 text-xs text-ink-3">{meta}</div>}
    </header>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-line/70", className)} />;
}
