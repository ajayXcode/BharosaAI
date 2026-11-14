import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your private Bharosa AI workspace.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") ? params.next : "/dashboard";
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-navy px-5 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(700px circle at 15% 10%, rgba(0,186,242,0.28), transparent 55%), radial-gradient(600px circle at 85% 90%, rgba(0,186,242,0.16), transparent 55%)",
        }}
      />
      <div className="relative flex w-full max-w-md flex-col items-center">
        <AuthForm next={next} />
        <Link href="/" className="mt-6 text-[12px] font-semibold text-white/70 transition hover:text-white">
          ← Back to bharosa ai
        </Link>
      </div>
    </main>
  );
}
