---
tags: [event-registration, architecture]
aliases: [architecture, design]
created: 2026-09-08
---

# Architecture (as built)

> [!note] Provenance
> The project owner drafted an initial architecture in
> [[../proposedArchitecture.txt]] (Next.js + Supabase + Vercel + PhonePe —
> kept as historical record, not maintained further). This doc is the
> **revised, approved** version worked out with Claude and is the one to keep
> current — [[../proposedArchitecture.txt]] should be treated as superseded.

## Context

Registration site for Swami Sarvapriyananda's visit to Ramakrishna Math
Halasuru, Bangalore (31 Oct 2026, 6–7:30pm). First 500 registrations get a
guaranteed seat (payment required, verified manually for now); overflow
becomes an "expression of interest" waitlist that can be re-invited if a
larger venue becomes viable. See [[../problemStatement.txt]] for the original
brief.

Constraints that shaped the design: 5–10 hours for an end-to-end prototype,
up to ~1 week total for a hardened v1. PhonePe merchant account isn't set up
yet, so payment verification is manual for launch, with payment logic
isolated so switching to automatic verification later touches only one
module. Reuse for other math centers is a soft goal — cheap config-driven
reuse is fine, a multi-tenant admin UI is explicitly not.

## Stack

- **Frontend:** Next.js (App Router, TypeScript), Tailwind — `/home/aj/app/src/app`
- **Backend:** Next.js serverless API routes (same repo) — `src/app/api/**`
- **Database + Auth:** Supabase (Postgres + Supabase Auth for admin login)
- **Email:** Resend (ticket delivery)
- **Hosting (planned):** Netlify — switched from the originally planned
  Vercel (2026-09-08), see [[nextSteps.md]] "Next action" for why
- **Payment (Phase B, sandbox only):** PhonePe

## Data Model

**`events`** — one seeded row for now; holds venue/date/seat-cap/FAQ config so
a future event could reuse this codebase without a multi-tenant UI (see
`supabase/seed.sql`, selected at runtime via the `EVENT_SLUG` env var).

**`registrations`** — one row per signup. Status lifecycle:
`pending` (guaranteed seat claimed, payment ref submitted, awaiting manual
verification) → `verified` (ticket sent) or `rejected` (Phase B, releases the
seat). `waitlisted` is a separate branch (no seat, cap was full), not a stage
in that lifecycle — see [[nextSteps.md]] for the not-yet-built re-invite flow.

Full column definitions: `supabase/migrations/0001_init.sql`. New columns
added 2026-09-08 in `supabase/migrations/0004_phonepe_and_payment_mode.sql`:
`events.payment_mode`, and on `registrations` —
`phonepe_merchant_txn_id` (our own dash-stripped-uuid correlation id,
uniquely indexed), `phonepe_transaction_id` (PhonePe's own), and
`phonepe_raw_response` (jsonb, for debugging). **Not yet applied to the
live Supabase project** — needs to be run in the SQL editor, same process
as `0002`/`0003` before it.

## The Core Invariant: Atomic Seat Cap

`guaranteed_seat_cap` (default 500) must never be oversold under concurrent
registrations. This is enforced entirely inside one Postgres function,
`register_attendee`, via a single atomic
`UPDATE events SET seats_taken = seats_taken + n WHERE seats_taken + n <= cap RETURNING`.
Postgres serializes concurrent UPDATEs on the same row, so there is no
read-then-write race window — never reintroduce an application-level
count-then-insert check.

> [!warning] Known simplification
> A multi-seat booking that would overflow the remaining cap falls entirely
> to waitlist rather than partial-filling. Tracked in [[BACKLOG.md]].

Releasing a seat (admin reject, `pending` rows only) uses the same
single-UPDATE-with-guard pattern in a second function, `reject_registration`
(`supabase/migrations/0002_reject_and_release_seat.sql`) — atomically flips
status to `rejected` and decrements `seats_taken` by `num_attendees` in one
call, no read-then-write gap there either.

## Payment Module Boundary

`src/lib/payment/types.ts` defines one interface (`PaymentModule.verifyPayment`)
for **synchronous** verification, implemented by `src/lib/payment/manual.ts`
(production path today — admin clicks Verify).

`src/lib/payment/phonepe.ts` (built 2026-09-08) is a real, working PhonePe
PG v1 sandbox integration — **not** a synchronous `PaymentModule`
implementation, since PhonePe is two-phase/webhook-driven with no shared
request context between initiate and verify. It exports
`initiatePhonePePayment` (called by `POST api/phonepe/initiate`),
`verifyPhonePeWebhookSignature` + `decodePhonePeWebhookBody` (called by
`POST api/phonepe/webhook`, the S2S callback), `checkPhonePeStatus` (called
by `GET api/phonepe/status`, a reconciliation fallback for when the
browser's redirect lands before the webhook does), and
`applyConfirmedPhonePeSuccess` — the one function both the webhook and
status routes call, which checks the confirmed amount matches
`num_attendees × PRICE_PER_ATTENDEE_INR` before doing anything else.

Both `manual.ts` and `phonepe.ts` funnel every success path through the
same downstream seam, `markVerifiedAndIssueTicket()` in
`src/lib/ticket/issue.ts`, which stays payment-method-agnostic and
untouched. **This is the isolation point that actually matters** — nothing
outside `src/lib/payment/**` and the two `api/phonepe/*` routes knows
PhonePe's request/checksum shapes.

Uses PhonePe's public sandbox test credentials (merchant id `PGTESTPAYUAT`)
as the built-in fallback default — no merchant account needed, sandbox
demo only, never treat as a real payment guarantee. See the loud comment
atop `phonepe.ts`.

### Payment mode switch

`events.payment_mode` (`'manual'` | `'phonepe_sandbox'`, default `'manual'`)
is admin-toggleable at runtime from `/admin/dashboard`
(`AdminPaymentModeToggle.tsx` → `POST api/admin/payment-mode`) — no
redeploy needed, so both flows can be demoed live in one sitting. `/` is
`force-dynamic` specifically so this takes effect immediately (a
statically-prerendered homepage would otherwise bake in whatever mode was
active at build time).

### Static UPI display

The Math's UPI VPA (`ramakri13482@kbl`, `src/lib/payment/upi.ts`) plus a
QR code (`GET api/upi/qr`, `src/lib/payment/upiQr.ts`, same `qrcode`
pattern as `ticket/qr.ts`) and a `upi://pay?...` mobile deep-link
(`UpiPaymentInfo.tsx`) always render on the registration page and on the
confirmation page (while `pending`), regardless of payment mode — no
user-agent sniffing; mobile OSes intercept the `upi://` scheme natively,
desktop just shows the QR as the always-working fallback. The registration
fee is a single fixed constant, `PRICE_PER_ATTENDEE_INR` in
`src/lib/payment/pricing.ts` (currently ₹500/attendee) — not yet
admin-editable; a future generalization for reuse by other events is
tracked in [[BACKLOG.md]], not built now.

## Auth

Admins log in via real Supabase Auth (`/admin/login`). `src/lib/supabase/server.ts`
exposes two distinct clients: `createServiceClient()` (service-role key,
bypasses RLS, used for all data access from API routes) and
`createSessionClient()`/`requireAdminSession()` (anon key + request cookies,
used only to check "is there a logged-in admin?"). Never use the service-role
client to check auth, never use the session client for data reads/writes.
`/admin` is the single entry point — it checks the session server-side and
redirects to `/admin/dashboard` or `/admin/login` — and
`AdminLogoutButton.tsx` calls the browser Supabase client's `signOut()`.

Admin-entered walk-in/cash registrations (`POST api/admin/manual-register`)
go through the same `registerAttendee()` helper
(`src/lib/registration/register.ts`) as the public form — the seat-cap
invariant above is never bypassed for admin-entered rows either — then
immediately call `markVerifiedAndIssueTicket()` since cash is already in
hand, rather than landing in the pending queue.

## Tickets / QR

Pipe-delimited, HMAC-signed payload — frozen contract in [[QR_PAYLOAD_SPEC.md]],
meant to be scanned later by an existing mobile app the project owner already
has for another math center. **Confirmed deferred to post-prototype** — the
scanning app is out of scope until after the demo to Adhyaksha Swamiji; manual
visual QR/ticket check at the door is acceptable for the prototype.

The ticket email embeds the QR as a real CID attachment (`src/lib/ticket/email.ts`,
`buildQrBuffer` in `src/lib/ticket/qr.ts`), not an inline `data:` URI — Gmail and
most clients strip inline data-URI images from HTML mail, which silently broke
the QR in testing (2026-09-08). Don't revert to `buildQrDataUrl`/`toDataURL` for
the email path; that helper still exists for other uses (e.g. admin preview UI)
but must never feed the ticket email again.

## API Routes

| Route | Purpose | Auth |
|---|---|---|
| `POST api/register` | validate + call the atomic RPC | public |
| `GET api/admin/pending` | list pending registrations | admin session |
| `POST api/admin/verify` | mark verified, issue ticket | admin session |
| `POST api/admin/reject` | reject (pending only) + release seat atomically | admin session |
| `GET api/admin/waitlist-export` (Phase B) | CSV export (waitlist only, for re-invite) | admin session |
| `GET api/admin/registrations` | full list, all statuses, `?status=` filter | admin session |
| `POST api/admin/resend` | resend ticket email (verified) or a plain status email (pending/waitlisted/rejected) | admin session |
| `GET api/admin/export` | CSV export of all registrations | admin session |
| `POST api/admin/manual-register` | admin-entered walk-in/cash registration; auto-verifies + issues ticket immediately | admin session |
| `POST api/phonepe/initiate` | start a PhonePe sandbox checkout for a `pending` registration | public |
| `POST api/phonepe/webhook` | PhonePe's S2S callback; signature-verified, auto-verifies + issues ticket | public, webhook signature |
| `GET api/phonepe/status` | reconciliation fallback (redirect-vs-webhook race) + local-dev testing path | public |
| `GET api/upi/qr` | static UPI payment QR (PNG), always shown regardless of mode | public |
| `POST api/admin/payment-mode` | flips `events.payment_mode`, no redeploy needed | admin session |

## Pages

`/` — single-page layout: Hero, SpeakerSection, VenueParkingSection (venue +
parking), FaqSection (inline accordion, not a separate route), then the
registration form, then Footer. Components live under
`src/components/static/`; content is currently Lorem Ipsum placeholders
(see [[BACKLOG.md]] item 12) pending real copy from the project owner.
Also `/confirmation/[id]`, `/admin/login`, `/admin/dashboard`.

## Phasing

See [[nextSteps.md]] for current status and the live queue, and [[BACKLOG.md]]
for the full list of deferred items with rationale. Roughly:

- **Phase A** (5–10 hrs): schema, atomic RPC, manual payment path, QR + email,
  bare pages, no RLS, no styling.
- **Phase B** (to ~1 week): RLS, waitlist tooling, rejection/seat-release,
  real content + styling, PhonePe sandbox demo.
