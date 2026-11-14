"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Crown,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  Building2,
  FileText,
} from "lucide-react";
import { Logo } from "@/components/ui";
import type { Plan } from "@/lib/admin";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  provider: string;
  createdAt: string;
  lastSignInAt: string | null;
  plan: Plan;
  documents: number;
}

const PLAN_META: Record<Plan, { label: string; className: string }> = {
  free: { label: "Free", className: "bg-page text-ink-2 border-line" },
  pro: { label: "Pro", className: "bg-sky-soft text-navy border-sky/30" },
  enterprise: { label: "Enterprise", className: "bg-ok-soft text-[#067647] border-ok/30" },
};

export function AdminPanel({
  demoEmail,
  demoPassword,
}: {
  demoEmail: string;
  demoPassword: string;
}) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [email, setEmail] = useState(demoEmail);
  const [password, setPassword] = useState(demoPassword);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totals, setTotals] = useState({ users: 0, free: 0, pro: 0, enterprise: 0 });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      if (response.status === 401) {
        setAuthed(false);
        return;
      }
      const data = (await response.json()) as {
        users?: AdminUser[];
        totals?: typeof totals;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Could not load users");
      setUsers(data.users ?? []);
      setTotals(data.totals ?? { users: 0, free: 0, pro: 0, enterprise: 0 });
      setAuthed(true);
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : "Could not load users");
      setAuthed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setLoginBusy(true);
    setLoginError(null);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not sign in");
      setAuthed(true);
      await load();
    } catch (cause) {
      setLoginError(cause instanceof Error ? cause.message : "Could not sign in");
    } finally {
      setLoginBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setUsers([]);
  }

  async function changePlan(user: AdminUser, plan: Plan) {
    setSavingId(user.id);
    try {
      const response = await fetch("/api/admin/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: user.id, plan, email: user.email, name: user.name }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not update plan");
      setUsers((list) => list.map((item) => (item.id === user.id ? { ...item, plan } : item)));
      setTotals((value) => {
        const counts = { ...value };
        counts[user.plan] -= 1;
        counts[plan] += 1;
        return counts;
      });
      setToast(`${user.email} → ${PLAN_META[plan].label}`);
      setTimeout(() => setToast(null), 2600);
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : "Could not update plan");
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-page text-ink">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-4 px-5">
          <Link href="/" aria-label="Bharosa AI home">
            <Logo tone="dark" />
          </Link>
          <span className="rounded-full bg-sky-soft px-2.5 py-0.5 text-[10.5px] font-bold tracking-[0.1em] text-navy uppercase">
            Admin
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-page px-2.5 text-[11.5px] font-semibold text-ink-2 transition hover:text-navy"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            {authed ? (
              <button
                type="button"
                onClick={() => void logout()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-navy px-3 text-[11.5px] font-bold text-white transition hover:bg-navy-2"
              >
                <LogOut className="size-3.5" /> Sign out
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] px-5 py-8">
        {authed === null ? (
          <div className="flex h-64 items-center justify-center text-ink-3">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : !authed ? (
          <div className="mx-auto mt-6 w-full max-w-md">
            <div className="rounded-3xl border border-line bg-card p-7 shadow-[0_24px_70px_-32px_rgba(16,24,40,0.35)]">
              <span className="grid size-10 place-items-center rounded-xl bg-sky-soft text-navy">
                <ShieldCheck className="size-5" />
              </span>
              <h1 className="mt-4 text-[24px] font-extrabold tracking-[-0.04em] text-navy">
                Admin control panel
              </h1>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">
                View every registered account and grant Free, Pro or Enterprise access.
              </p>
              <form onSubmit={signIn} className="mt-5 space-y-3">
                <label className="block">
                  <span className="text-[11.5px] font-semibold text-ink-2">Admin email</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-1.5 h-11 w-full rounded-xl border border-line bg-page px-3.5 text-[13.5px] outline-none transition focus:border-sky focus:bg-card focus:ring-4 focus:ring-sky/15"
                  />
                </label>
                <label className="block">
                  <span className="text-[11.5px] font-semibold text-ink-2">Password</span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-1.5 h-11 w-full rounded-xl border border-line bg-page px-3.5 text-[13.5px] outline-none transition focus:border-sky focus:bg-card focus:ring-4 focus:ring-sky/15"
                  />
                </label>
                {loginError ? (
                  <p className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-[12px] font-medium text-[#b42318]">
                    {loginError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={loginBusy}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-navy text-[13.5px] font-bold text-white transition hover:bg-navy-2 disabled:opacity-60"
                >
                  {loginBusy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                  Enter admin panel
                </button>
              </form>
              <div className="mt-5 rounded-xl border border-dashed border-sky/40 bg-sky-soft/60 p-3">
                <p className="text-[10px] font-bold tracking-[0.12em] text-navy/60 uppercase">
                  Demo credentials
                </p>
                <p className="mt-1 font-mono text-[11.5px] text-navy">{demoEmail}</p>
                <p className="font-mono text-[11.5px] text-navy">{demoPassword}</p>
              </div>
            </div>
            <p className="mt-4 text-center text-[11px] text-ink-3">
              <Link href="/" className="font-semibold hover:text-navy">
                ← Back to bharosa ai
              </Link>
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] font-semibold tracking-[0.18em] text-ink-3 uppercase">
                  Owner controls
                </p>
                <h1 className="mt-1.5 text-[26px] font-extrabold tracking-[-0.04em] text-navy">
                  Users &amp; subscription plans
                </h1>
                <p className="mt-1 text-[12.5px] text-ink-2">
                  Every account visible to this admin. Grant access in one click.
                </p>
              </div>
              {toast ? (
                <span className="rc-pop rounded-full bg-navy px-3.5 py-1.5 text-[11.5px] font-semibold text-white">
                  {toast}
                </span>
              ) : null}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Users, label: "Total users", value: totals.users },
                { icon: Sparkles, label: "Free", value: totals.free },
                { icon: Crown, label: "Pro", value: totals.pro },
                { icon: Building2, label: "Enterprise", value: totals.enterprise },
              ].map((card) => (
                <div key={card.label} className="rounded-2xl border border-line bg-card p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-ink-3">{card.label}</span>
                    <card.icon className="size-4 text-sky" />
                  </div>
                  <p className="mt-2 text-[24px] font-extrabold tracking-[-0.03em] text-navy tabular">
                    {card.value}
                  </p>
                </div>
              ))}
            </div>

            {loadError ? (
              <p className="mt-4 rounded-xl bg-bad-soft px-4 py-3 text-[12.5px] font-medium text-[#b42318]">
                {loadError}
              </p>
            ) : null}

            <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-card">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <h2 className="text-[13px] font-bold text-navy">All accounts</h2>
                <span className="text-[11px] text-ink-3">{users.length} visible</span>
              </div>
              {loading ? (
                <div className="flex h-32 items-center justify-center text-ink-3">
                  <Loader2 className="size-5 animate-spin" />
                </div>
              ) : users.length === 0 ? (
                <div className="px-4 py-10 text-center text-[12.5px] text-ink-3">
                  No accounts yet. Users appear here as soon as they sign up with email, Google or GitHub.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left">
                    <thead>
                      <tr className="border-b border-line bg-page text-[10.5px] font-bold tracking-[0.08em] text-ink-3 uppercase">
                        <th className="px-4 py-2.5">User</th>
                        <th className="px-4 py-2.5">Auth</th>
                        <th className="px-4 py-2.5">Docs</th>
                        <th className="px-4 py-2.5">Joined</th>
                        <th className="px-4 py-2.5">Last sign-in</th>
                        <th className="px-4 py-2.5">Privilege / plan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {users.map((user) => (
                        <tr key={user.id} className="text-[12.5px]">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-navy">{user.name}</p>
                            <p className="text-[11px] text-ink-3">{user.email}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-full border border-line bg-page px-2 py-0.5 text-[10.5px] font-semibold text-ink-2 capitalize">
                              {user.provider}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-ink-2">
                            <span className="inline-flex items-center gap-1">
                              <FileText className="size-3.5 text-ink-3" /> {user.documents}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-ink-2">
                            {new Date(user.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-4 py-3 text-ink-2">
                            {user.lastSignInAt
                              ? new Date(user.lastSignInAt).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                })
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10.5px] font-bold ${PLAN_META[user.plan].className}`}
                              >
                                {PLAN_META[user.plan].label}
                              </span>
                              <select
                                value={user.plan}
                                disabled={savingId === user.id}
                                onChange={(event) => void changePlan(user, event.target.value as Plan)}
                                className="h-8 cursor-pointer rounded-lg border border-line bg-page px-2 text-[11.5px] font-semibold text-ink outline-none focus:border-sky"
                              >
                                <option value="free">Free plan</option>
                                <option value="pro">Pro plan</option>
                                <option value="enterprise">Enterprise plan</option>
                              </select>
                              {savingId === user.id ? (
                                <Loader2 className="size-3.5 animate-spin text-ink-3" />
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-ink-3">
              Plan changes are stored in Supabase <span className="font-mono">user_plans</span> and take
              effect immediately. Set <span className="font-mono">ADMIN_EMAIL</span> and{" "}
              <span className="font-mono">ADMIN_PASSWORD</span> in your environment to replace the demo
              credentials.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
