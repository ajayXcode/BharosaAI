"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const options = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function ThemeToggle({
  className = "",
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const active = mounted ? theme ?? "system" : "system";
  const Icon = options.find((o) => o.value === active)?.icon ?? Monitor;

  function cycle() {
    const idx = options.findIndex((o) => o.value === active);
    setTheme(options[(idx + 1) % options.length].value);
  }

  return (
    <button
      type="button"
      onClick={cycle}
      title={`Theme: ${active}${mounted ? ` (${resolvedTheme ?? ""})` : ""} — click to change`}
      aria-label={`Theme: ${active}. Click to switch light, dark or system.`}
      className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2 text-[10.5px] font-semibold transition ${
        tone === "dark"
          ? "bg-white/10 text-white/80 ring-1 ring-white/15 hover:bg-white/20 hover:text-white"
          : "bg-page text-ink-2 ring-1 ring-line hover:bg-sky-soft hover:text-navy"
      } ${className}`}
    >
      <Icon className="size-3.5" />
      <span className="hidden capitalize sm:inline">{active}</span>
    </button>
  );
}
