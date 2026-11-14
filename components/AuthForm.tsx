"use client";

import { useState } from "react";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabaseBrowser } from "@/lib/supabase/client";

type Mode = "login" | "signup";

export function AuthForm({ next = "/dashboard" }: { next?: string }) {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<"google" | null>(null);

  async function oauth(provider: "google") {
    setError(null);
    setOauthBusy(provider);
    try {
      const supabase = supabaseBrowser();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (oauthError) throw oauthError;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start social sign-in");
      setOauthBusy(null);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Something went wrong");
      window.location.assign(next.startsWith("/") ? next : "/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-3xl border border-line bg-card p-7 shadow-[0_24px_70px_-32px_rgba(16,24,40,0.35)] sm:p-9">
        <div className="flex items-center justify-between gap-3">
          <Logo tone="dark" />
          <ThemeToggle className="border-line bg-page text-ink-2 hover:bg-sky-soft hover:text-navy" />
        </div>
        <h1 className="mt-7 text-[26px] font-extrabold tracking-[-0.04em] text-ink">
          {mode === "login" ? "Sign in to your workspace" : "Create your workspace"}
        </h1>
        <p className="mt-2 text-[13.5px] leading-6 text-ink-2">
          {mode === "login"
            ? "Your documents, questions and decisions are private to your account."
            : "Real account, private data, live sync across your devices."}
        </p>

        <div className="mt-6">
          <button
            type="button"
            onClick={() => oauth("google")}
            disabled={busy || oauthBusy !== null}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-page text-[13px] font-semibold text-ink transition hover:border-sky/40 hover:bg-card disabled:opacity-60"
          >
            {oauthBusy === "google" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.7l4-3Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z"
                />
              </svg>
            )}
            Continue with Google
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3 text-[10.5px] font-semibold tracking-[0.12em] text-ink-3 uppercase">
          <span className="h-px flex-1 bg-line" />
          or use email
          <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={submit} className="mt-4 space-y-3.5">
          {mode === "signup" ? (
            <label className="block">
              <span className="text-[12px] font-semibold text-ink-2">Name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                className="mt-1.5 h-11 w-full rounded-xl border border-line bg-page px-3.5 text-[14px] outline-none transition focus:border-sky focus:bg-card focus:ring-4 focus:ring-sky/15"
                placeholder="Your name"
              />
            </label>
          ) : null}
          <label className="block">
            <span className="text-[12px] font-semibold text-ink-2">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              className="mt-1.5 h-11 w-full rounded-xl border border-line bg-page px-3.5 text-[14px] outline-none transition focus:border-sky focus:bg-card focus:ring-4 focus:ring-sky/15"
              placeholder="you@company.com"
            />
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold text-ink-2">Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="mt-1.5 h-11 w-full rounded-xl border border-line bg-page px-3.5 text-[14px] outline-none transition focus:border-sky focus:bg-card focus:ring-4 focus:ring-sky/15"
              placeholder="At least 8 characters"
            />
          </label>

          {error ? (
            <p className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-[12.5px] font-medium text-[#b42318]">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="group flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-navy text-[14px] font-semibold text-white transition hover:bg-navy-2 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {mode === "login" ? "Sign in" : "Create account"}
            {!busy ? <ArrowRight className="size-4 transition group-hover:translate-x-0.5" /> : null}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
          }}
          className="mt-5 w-full text-center text-[12.5px] font-semibold text-ink-2 transition hover:text-navy"
        >
          {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </div>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-[11.5px] text-ink-3">
        <ShieldCheck className="size-3.5" />
        Supabase Auth · per-user row-level security · encrypted session cookies
      </p>
    </div>
  );
}
