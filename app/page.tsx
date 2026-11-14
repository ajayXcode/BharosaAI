import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  BrainCircuit,
  Check,
  Database,
  FileSearch,
  Fingerprint,
  LockKeyhole,
  Quote,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Smartphone,
} from "lucide-react";
import { Logo } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PLANS } from "@/lib/plans";

const capabilities = [
  {
    icon: ScanLine,
    title: "Read the real document",
    body: "Upload a policy, key fact statement or card terms. Text and scanned pages are parsed into clauses with page numbers.",
  },
  {
    icon: Database,
    title: "Index every clause",
    body: "Clauses are embedded and stored in a private Pinecone namespace for your account, so retrieval stays within your own document.",
  },
  {
    icon: Quote,
    title: "Answer with evidence",
    body: "Every factual answer must name the clause it came from. If the document does not say it, the answer is marked not available.",
  },
  {
    icon: ShieldCheck,
    title: "Act with consent",
    body: "Payments and escalations stay behind an explicit approval checkpoint. Nothing is submitted on your behalf without it.",
  },
];

const steps = [
  {
    number: "01",
    title: "Upload",
    body: "PDF, photo or text. The document is stored against your authenticated account.",
    icon: FileSearch,
  },
  {
    number: "02",
    title: "Understand",
    body: "Get a plain-language summary, extracted facts, risk flags and a deterministic cost calculation.",
    icon: BookOpenCheck,
  },
  {
    number: "03",
    title: "Ask & verify",
    body: "Ask in English, Hindi or Hinglish. Each answer links back to the page and clause.",
    icon: BrainCircuit,
  },
  {
    number: "04",
    title: "Decide",
    body: "Review the next step, approve it deliberately, then keep the audit trail.",
    icon: BadgeCheck,
  },
];

const faqs = [
  {
    q: "Where do my documents go?",
    a: "Documents are stored in your private Supabase workspace behind row-level security. Clause text is indexed in a per-user Pinecone namespace. Neither is shared with another account.",
  },
  {
    q: "Can Bharosa make a payment on its own?",
    a: "No. A payment intent needs an explicit approval token created by you. The product records the decision and never auto-debits an account.",
  },
  {
    q: "What happens if the document does not answer a question?",
    a: "The answer is refused and labelled not available instead of guessed. Every factual sentence must be supported by a retrieved clause.",
  },
  {
    q: "Which languages are supported?",
    a: "English, Hindi and Hinglish for explanations and questions. Source quotes remain in the language of your document.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-page text-ink">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-navy/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
          <Link href="/" aria-label="Bharosa AI home">
            <Logo tone="light" />
          </Link>
          <nav className="ml-auto hidden items-center gap-6 text-[12.5px] font-semibold text-white/65 md:flex">
            <a href="#product" className="transition hover:text-white">Product</a>
            <a href="#security" className="transition hover:text-white">Security</a>
            <a href="#plans" className="transition hover:text-white">Plans</a>
            <a href="#faq" className="transition hover:text-white">FAQ</a>
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <ThemeToggle className="hidden sm:inline-flex" />
            <Link
              href="/login"
              className="hidden rounded-full px-3 py-2 text-[12.5px] font-semibold text-white/75 transition hover:text-white sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-full bg-sky px-3.5 py-2 text-[12.5px] font-bold text-[#002e6e] transition hover:bg-white"
            >
              Open workspace
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-navy text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(760px circle at 12% 5%, rgba(0,186,242,0.3), transparent 55%), radial-gradient(620px circle at 92% 85%, rgba(0,186,242,0.14), transparent 55%)",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 pt-16 pb-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-24 lg:pb-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/75">
              <Sparkles className="size-3.5 text-sky" />
              Evidence-first document intelligence
            </span>
            <h1 className="mt-5 max-w-2xl text-[42px] leading-[1.03] font-extrabold tracking-[-0.055em] sm:text-[58px]">
              Know what you signed.
              <span className="block text-sky">Before it costs you.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-7 text-white/65">
              Bharosa AI turns insurance policies, loan offers and card terms into a cited
              plain-language review. Every fact, flag and answer points to the page it came from.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-sky px-5 py-3 text-[13.5px] font-bold text-[#002e6e] shadow-[0_12px_30px_-12px_rgba(0,186,242,0.9)] transition hover:bg-white"
              >
                Start with your document
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="#product"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-[13.5px] font-semibold text-white/80 transition hover:border-white/30 hover:text-white"
              >
                See how it works
              </a>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-white/45">
              <span className="inline-flex items-center gap-1.5">
                <LockKeyhole className="size-3.5" /> Private per account
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Fingerprint className="size-3.5" /> Supabase auth + RLS
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Database className="size-3.5" /> Pinecone clause index
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[440px]">
            <div className="absolute -inset-4 rounded-[2rem] bg-sky/10 blur-2xl" aria-hidden />
            <div className="relative rounded-[1.75rem] border border-white/12 bg-white/[0.07] p-3 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.65)] backdrop-blur">
              <div className="rounded-[1.25rem] bg-card p-4 text-ink shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-navy">
                    <FileSearch className="size-3.5 text-sky" /> Policy review
                  </span>
                  <span className="rounded-full bg-ok-soft px-2 py-0.5 text-[9px] font-bold text-[#067647]">
                    Source linked
                  </span>
                </div>
                <div className="mt-3 rounded-xl bg-page p-3">
                  <p className="text-[9px] font-bold tracking-wide text-ink-3 uppercase">Your question</p>
                  <p className="mt-1 text-[11.5px] font-semibold text-navy">
                    Is the room rent limit stated in this policy?
                  </p>
                </div>
                <div className="mt-2.5 rounded-xl border border-line p-3">
                  <p className="text-[9px] font-bold tracking-wide text-ink-3 uppercase">Cited answer</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-2">
                    The answer appears here only when a retrieved clause supports it. If the
                    document is silent, the result is marked not available.
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-sky-soft px-2 py-1.5 text-[9px] font-semibold text-navy">
                    <Quote className="size-3" />
                    Page and clause shown for every claim
                  </div>
                </div>
                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  {["Extracted facts", "Risk flags", "Cost check"].map((label) => (
                    <div key={label} className="rounded-lg border border-line bg-card p-2">
                      <span className="grid size-5 place-items-center rounded-full bg-page">
                        <Check className="size-3 text-ok" />
                      </span>
                      <p className="mt-1.5 text-[8.5px] font-semibold leading-tight text-ink-2">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between rounded-xl bg-navy px-3 py-2 text-white">
                <span className="inline-flex items-center gap-1.5 text-[9px] font-semibold text-white/70">
                  <Smartphone className="size-3.5 text-sky" /> Customer phone and analyst view stay in sync
                </span>
                <span className="size-1.5 rounded-full bg-ok" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="product" className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
        <div className="max-w-2xl">
          <p className="font-mono text-[10px] font-semibold tracking-[0.18em] text-ink-3 uppercase">
            The review layer
          </p>
          <h2 className="mt-2 text-[30px] font-extrabold tracking-[-0.045em] text-navy sm:text-[38px]">
            Four checks, one source of truth
          </h2>
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2">
            No sample library and no fabricated balances. The workspace is built around the
            document you upload and the clauses it actually contains.
          </p>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {capabilities.map((item) => (
            <div
              key={item.title}
              className="group rounded-2xl border border-line bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-28px_rgba(7,21,42,0.45)]"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-sky-soft text-navy">
                <item.icon className="size-4.5" />
              </span>
              <h3 className="mt-3 text-[13px] font-bold text-navy">{item.title}</h3>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-2">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-card">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] font-semibold tracking-[0.18em] text-ink-3 uppercase">
                How it works
              </p>
              <h2 className="mt-2 text-[30px] font-extrabold tracking-[-0.045em] text-navy">
                From upload to a decision you can defend
              </h2>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-navy underline decoration-sky decoration-2 underline-offset-4"
            >
              Open the workspace <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-4">
            {steps.map((step) => (
              <div key={step.number} className="relative rounded-2xl bg-page p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-ink-3">{step.number}</span>
                  <step.icon className="size-4 text-sky" />
                </div>
                <h3 className="mt-4 text-[13px] font-bold text-navy">{step.title}</h3>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-2">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl bg-navy p-6 text-white sm:p-8">
            <span className="grid size-10 place-items-center rounded-xl bg-sky/15 text-sky">
              <LockKeyhole className="size-5" />
            </span>
            <h2 className="mt-4 text-[28px] font-extrabold tracking-[-0.04em]">
              Your document is not training data
            </h2>
            <p className="mt-3 text-[12.5px] leading-relaxed text-white/60">
              Each account has its own workspace row, storage prefix and vector namespace. Access
              is checked on the server for every request, not hidden in the browser.
            </p>
            <div className="mt-5 space-y-2">
              {[
                "Supabase Auth session cookies, refreshed server-side",
                "Row-level security on workspace data",
                "Per-user Pinecone namespace with metadata filters",
                "Citation gate before any answer is shown",
              ].map((line) => (
                <div key={line} className="flex items-start gap-2 text-[11.5px] text-white/75">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-sky" />
                  {line}
                </div>
              ))}
            </div>
          </div>
          <div id="faq" className="rounded-3xl border border-line bg-card p-6 sm:p-8">
            <p className="font-mono text-[10px] font-semibold tracking-[0.18em] text-ink-3 uppercase">
              Straight answers
            </p>
            <div className="mt-4 divide-y divide-line">
              {faqs.map((item) => (
                <details key={item.q} className="group py-3.5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[12.5px] font-bold text-navy">
                    {item.q}
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-page text-ink-3 transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-2 pr-8 text-[11.5px] leading-relaxed text-ink-2">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-sky-soft">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 px-5 py-12 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-[25px] font-extrabold tracking-[-0.04em] text-navy">
              Start with the document you already have.
            </h2>
            <p className="mt-1.5 text-[12.5px] text-ink-2">
              Create a private workspace, upload once, and ask your first question.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-navy px-5 py-3 text-[13px] font-bold text-white transition hover:bg-navy-2"
          >
            Open workspace <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <section id="plans" className="border-t border-line bg-page">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
          <div className="max-w-2xl">
            <p className="font-mono text-[10px] font-semibold tracking-[0.18em] text-ink-3 uppercase">
              Our Subscription Plans
            </p>
            <h2 className="mt-2 text-[30px] font-extrabold tracking-[-0.045em] text-navy sm:text-[38px]">
              Pay for the clarity, not the paperwork
            </h2>
            <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2">
              Every plan keeps your documents private to your account. Upgrade when you need voice,
              comparisons and team controls — cancel anytime.
            </p>
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-3xl border p-5 ${
                  plan.featured
                    ? "border-sky/40 bg-navy text-white shadow-[0_24px_60px_-32px_rgba(0,46,110,0.6)]"
                    : "border-line bg-card"
                }`}
              >
                {plan.featured ? (
                  <span className="absolute -top-2.5 right-4 rounded-full bg-sky px-2.5 py-0.5 text-[9.5px] font-bold tracking-wide text-[#002e6e] uppercase">
                    Most popular
                  </span>
                ) : null}
                <h3
                  className={`text-[13px] font-bold tracking-[0.02em] uppercase ${
                    plan.featured ? "text-sky" : "text-ink-3"
                  }`}
                >
                  {plan.name}
                </h3>
                <p className="mt-2 flex items-baseline gap-1.5">
                  <span
                    className={`text-[32px] font-extrabold tracking-[-0.04em] ${
                      plan.featured ? "text-white" : "text-navy"
                    }`}
                  >
                    {plan.price}
                  </span>
                  <span className={`text-[11px] ${plan.featured ? "text-white/55" : "text-ink-3"}`}>
                    {plan.period}
                  </span>
                </p>
                <p
                  className={`mt-1.5 text-[11.5px] leading-relaxed ${
                    plan.featured ? "text-white/60" : "text-ink-2"
                  }`}
                >
                  {plan.note}
                </p>
                <ul className="mt-4 flex-1 space-y-2">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className={`flex items-start gap-2 text-[11.5px] ${
                        plan.featured ? "text-white/80" : "text-ink-2"
                      }`}
                    >
                      <Check
                        className={`mt-0.5 size-3.5 shrink-0 ${plan.featured ? "text-sky" : "text-ok"}`}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`mt-5 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl text-[12.5px] font-bold transition ${
                    plan.featured
                      ? "bg-sky text-[#002e6e] hover:bg-white"
                      : "bg-navy text-white hover:bg-navy-2"
                  }`}
                >
                  {plan.id === "free" ? "Start for free" : plan.id === "pro" ? "Choose Pro" : "Talk to us"}
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[10.5px] text-ink-3">
            Plans are assigned by the workspace owner. Enterprise seats are provisioned from the
            admin panel.
          </p>
        </div>
      </section>

      <footer className="border-t border-line bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between">
          <Logo tone="dark" />
          <p className="max-w-lg text-[10.5px] leading-relaxed text-ink-3">
            Guidance only. Bharosa AI is not an insurer, lender or investment adviser and does not
            approve claims. Always confirm material terms with the issuer.
          </p>
          <div className="flex gap-4 text-[11px] font-semibold text-ink-2">
            <Link href="/login" className="hover:text-navy">Sign in</Link>
            <a href="#security" className="hover:text-navy">Security</a>
            <a href="#plans" className="hover:text-navy">Plans</a>
            <Link href="/admin" className="hover:text-navy">Admin</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
