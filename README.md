# Bharosa AI

Bharat's evidence-linked financial copilot — **Explain → Verify → Act.**

Bharosa AI turns an insurance policy, loan Key Fact Statement or credit-card MITC into a cited
plain-language answer, stress-tests hypothetical situations, shows the real-life cost, and guides
the next step with explicit consent.

This is a multi-user SaaS workspace, not a demo: Supabase Auth accounts, a private workspace per
user, Supabase persistence, NVIDIA evidence-gated answers and Pinecone clause retrieval. New
accounts start with an empty workspace and upload their own document. There is no seeded sample
library and no public demo mode.

The dashboard is designed as a single screen: analytics and document tools on the left, the
customer's live phone on the right (at 1280px and wider). The phone renders the same authenticated
workspace at `/app?embed=1`, so an upload, approval or language change appears in both views.

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Marketing site and product overview |
| `/login` | Supabase email/password, Google and GitHub sign-in and account creation |
| `/auth/callback` | Supabase OAuth code exchange, then redirect to the workspace |
| `/admin` | Owner-only user list with Free / Pro / Enterprise plan controls |
| `/dashboard` | Private workspace: document library, facts, red flags, stress test, cited chat, verify, Act, live customer phone |
| `/app` | Private mobile-first customer journey: Home, Alerts, Test, Ask, Act |
| `/dashboard?embed=1`, `/app?embed=1` | Chrome-free versions used inside the phone frame |

## API surface

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/signup` | POST | Create a confirmed Supabase account and start a session |
| `/api/auth/login` | POST | Password sign-in with HTTP-only session cookies |
| `/api/auth/logout` | POST | Clear the session |
| `/api/auth/me` | GET | Current account |
| `/api/auth/realtime` | GET | Short-lived realtime token for the signed-in user |
| `/api/workspace` | GET | The signed-in user's workspace, or a typed empty state |
| `/api/documents` | GET / POST / PATCH / DELETE | List, open, rename or remove a document |
| `/api/documents/upload` | POST | Extract text (incl. OCR), detect the product, confirm missing numbers, index clauses in Pinecone |
| `/api/ingest` | POST | Parse step for a document |
| `/api/analyse` | POST | Facts, flags, calculators and summary |
| `/api/chat` | POST | Pinecone clause retrieval plus evidence-gated NVIDIA answer; falls back to the retrieved clause |
| `/api/stress` | POST | Hypothetical scenario → deterministic impact + citations |
| `/api/verify` | POST | Re-check every quote against its source clause |
| `/api/translate` | POST | Re-render in English / Hindi / Hinglish |
| `/api/compare` | POST | Two loan offers on total cost and APR |
| `/api/act` | POST | Payment approval request/confirmation, reminder, analyse or ingest |
| `/api/escalate` | POST | Human handoff with transcript and citations |
| `/api/metrics` | GET | Citation and usage metrics |
| `/api/health` | GET | Supabase, Pinecone and NVIDIA status (no secrets) |
| `/api/voice/stt` | POST | Sarvam speech-to-text for a recorded question |
| `/api/voice/tts` | POST | Sarvam text-to-speech for reading an answer aloud |
| `/api/admin/login` | POST | Admin panel sign-in (separate owner cookie) |
| `/api/admin/logout` | POST | Clear the admin cookie |
| `/api/admin/users` | GET | All accounts, auth provider, document count and granted plan |
| `/api/admin/plan` | POST | Grant Free, Pro or Enterprise to a user |

Every endpoint except `/api/health`, `/api/auth/*` and `/api/admin/*` requires a session.
Authentication is checked before request bodies are parsed for document mutations. Requests without
a session get `401`; admin endpoints return `401` without the admin cookie.

## Theme

The UI ships light, dark and system themes (`next-themes`). The toggle is in the landing header, the
dashboard header and the customer app; the choice is remembered per browser and follows the OS when
set to **System**. Dark mode swaps surface, text and border tokens in `app/globals.css`, while brand
navy panels stay deep navy for contrast.

## Social sign-in

`/login` offers Google and GitHub through Supabase OAuth. The callback route is `/auth/callback`.
Add these exact URLs in Supabase → Authentication → URL Configuration (Redirect URLs):

- `http://localhost:3000/auth/callback`
- `https://bharosa-ai-paytm.vercel.app/auth/callback`
- `https://bharosa-ai-paytm-<deployment>.vercel.app/auth/callback` for preview deployments

Enable the Google and GitHub providers under Authentication → Providers and paste their client ID and
secret there. Your Supabase callback (`https://<ref>.supabase.co/auth/v1/callback`) stays as the
provider-side redirect; the app URL above is where Supabase returns the user.

## Admin panel and plans

`/admin` is the owner console. It lists every account Supabase can see (email, provider, documents,
join and last sign-in dates) and lets you grant **Free**, **Pro** or **Enterprise** in one click. The
grant is stored in Supabase `app_metadata.plan`, which users cannot edit from the browser. Optional
mirroring to `supabase/migrations/20261114000000_saas_plans.sql` gives you a queryable table.

Demo credentials (override with `ADMIN_EMAIL` / `ADMIN_PASSWORD`):

- Email: `admin@bharosa.ai`
- Password: `BharosaAdmin@123`

The public pricing section at `/#plans` mirrors the same three plans.

## Finance-only answers

`lib/bharosa.ts` runs a scope guard before retrieval. A question is answered only when it uses
finance vocabulary (loan, EMI, interest, premium, claim, card, bank, …) or words that appear in the
uploaded document. Anything else — food, cricket, movies, weather, coding, small talk — gets a short
scope refusal instead of a model call, so the assistant never answers unrelated questions.

## Document upload

`POST /api/documents/upload` accepts a text PDF, a JPG/PNG/WebP/BMP/TIFF photo, or a `.txt` file up
to 12 MB. `unpdf` extracts text PDFs; image uploads and scanned PDFs go through OCR (`tesseract.js`,
with scanned PDF pages rasterised by `@napi-rs/canvas`). The product is detected (health / loan /
card, or chosen explicitly), and the server parses key terms (sum insured, premium, co-pay, room cap,
waiting period; principal, rate, tenure, fees, prepayment; limit, APR, minimum due, fees). If an
essential term is not in the text, the API returns `422` with the missing fields and the values it
did find, and the UI asks the user to confirm them rather than inventing numbers.

Extracted terms become facts with page/clause citations; every calculator input is either stated in
the document or confirmed by the user. OCR reads one photo or up to four scanned PDF pages per
upload; larger scans are rejected rather than partially analysed. Documents can be renamed or
removed from the dashboard library; removing one also drops its chat, stress results, payments,
reminders, escalations and Pinecone vectors. Removing the last document returns the same empty
workspace as a new account, with onboarding to upload another document.

## Pinecone document database

Pinecone is the clause retrieval layer for uploaded documents. The configured index is a
**document-schema index** named `paytm`; it must be written through the Documents API, not the
legacy vectors API. Writes use `X-Pinecone-Api-Version: 2026-07`.

- Each account gets a private namespace: `user-<supabase-user-id>`.
- Each clause is stored with metadata `{ documentId, clauseId, page, section, productType, issuer }`
  and the `chunk_text` field. The index owns the `llama-text-embed-v2` embedding and sparse
  `pinecone-sparse-english-v0` fields, so the app sends text, not vectors.
- Chat retrieves the top 8 clauses filtered to the active document, then passes them to NVIDIA as
  the only evidence. If NVIDIA is unavailable, the top retrieved clause becomes the cited answer.
- Deleting a document deletes its vectors from the user's namespace.

Set these in `.env` (never commit the key):

```bash
PINECONE_API_KEY=your_key_here
PINECONE_INDEX=paytm
PINECONE_HOST=https://your-index-host.pinecone.io
```

If Pinecone is not configured, uploads still work and chat falls back to the local clause search;
`/api/health` reports the vector status explicitly.

## NVIDIA NIM

`lib/nvidia.ts` calls `https://integrate.api.nvidia.com/v1/chat/completions` server-side with
`nvidia/nemotron-3.5-lightning-30b-a3b`, `temperature: 0.1` and
`chat_template_kwargs: { enable_thinking: false }`.

The evidence gate works like this:

1. Uploaded questions skip the legacy typed rule engine entirely.
2. Pinecone returns the clauses most relevant to the question.
3. NVIDIA receives only those clauses plus calculated figures and must reply with
   `{ "answer": "...", "citation_ids": ["..."], "grounded": true|false }`.
4. The server keeps only citation ids that exist in the document. Invalid, ungrounded or timed-out
   answers fall back to the retrieved clause or a **"Not available"** response.

Set the key in `.env` (never commit it):

```bash
NVIDIA_API_KEY=your_key_here
```

## Supabase

The linked cloud project is **`paytm hackathon`** (`iuxctvffkagizfegnoer`, Mumbai). Apply the
migrations in `supabase/migrations` with the Supabase CLI:

```bash
npx supabase link --project-ref <ref>
npx supabase db push
```

Required `.env` values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

How the SaaS layer works:

- **Auth:** Supabase GoTrue email/password. `middleware.ts` refreshes the HTTP-only cookie session
  and protects `/app` and `/dashboard`. Signup provisions a confirmed account server-side via the
  admin API, then signs the user in.
- **Tenancy:** `runWithUser` loads `workspace_state` by the authenticated user id, so every request
  sees only that user's documents, chats, stress tests, payments and audit trail.
- **RLS:** `workspace_state` has owner-only select/insert/update/delete policies
  (`auth.uid()::text = id`). Other domain tables remain service-role-only and are never exposed to
  the browser.
- **Realtime:** workspace tables are in the `supabase_realtime` publication. The UI subscribes to
  the user's own row with its session token and refreshes when another tab or device changes data.
- **Fallback:** without Supabase env vars the app runs in-memory per process; `/api/health` reports
  the real status without exposing secrets.

## Deterministic finance

`lib/bharosa.ts` holds the pure calculators:

- EMI: `P · r · (1+r)^n / ((1+r)^n − 1)`
- Total repayment including upfront fees
- Effective APR by solving the monthly IRR, then annualising
- Prepayment cost from the outstanding balance, compared with remaining interest
- Co-pay and room-rent-cap out-of-pocket, including the associated-bill deduction
- Card interest on the reducing balance, minimum-due repayment path, late fee and annual fee

Money is returned as integer paise. The model never does this arithmetic; it only narrates numbers
the calculators produced.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npx tsc --noEmit
npm run build
npm start
```

Set the same Pinecone/Supabase/NVIDIA values in the deployment environment. If a stale
`PINECONE_API_KEY` exists in the shell, it overrides `.env` for `next start`; verify with
`GET /api/health` that the vector connection is `connected: true`.

Stack: Next.js 16 (App Router, Turbopack), React 19, Tailwind v4, TypeScript, lucide-react,
`@supabase/supabase-js`, `@supabase/ssr`, `unpdf`, `tesseract.js`, `@napi-rs/canvas`, sarvamai,
Pinecone Documents API.

## Real vs. not yet connected

**Real:** accounts and sessions, per-user data isolation with RLS, cloud persistence across server
restarts, live cross-tab/device refresh, Pinecone clause indexing and retrieval, NVIDIA
evidence-gated answers, deterministic calculators, citation verification, approval-token guard and
audit trail, text-PDF and photo/scan OCR with a confirm-fields flow, document rename/delete, and
rate limiting.

**Not yet connected:** payment execution. Approving a payment request records an internal
`paid` intent and an audit event with a one-time token, but no money moves until a payment provider
(and its merchant KYC) is connected. Insurer/lender integrations and email verification also need
external production onboarding. The UI does not claim otherwise.

Rate limiting is in-process per identity/IP: upload 6 per 10 minutes, chat 20/min, stress 30/min,
login 10 per 10 minutes, signup 6 per 10 minutes. A multi-instance deployment should move this to
Redis.
