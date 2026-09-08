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
- **Hosting (planned):** Vercel
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

Full column definitions: `supabase/migrations/0001_init.sql`.

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

## Payment Module Boundary

`src/lib/payment/types.ts` defines one interface (`PaymentModule.verifyPayment`)
implemented by:
- `src/lib/payment/manual.ts` — production path today (admin clicks Verify).
- `src/lib/payment/phonepe.ts` — Phase B sandbox-only demo, webhook-driven,
  not wired into the real registration flow.

Both call the same downstream seam, `markVerifiedAndIssueTicket()` in
`src/lib/ticket/issue.ts`, which is payment-method-agnostic. **This is the
isolation point** — adding or changing a payment method should only touch
`src/lib/payment/**` and the API route that invokes it.

## Auth

Admins log in via real Supabase Auth (`/admin/login`). `src/lib/supabase/server.ts`
exposes two distinct clients: `createServiceClient()` (service-role key,
bypasses RLS, used for all data access from API routes) and
`createSessionClient()`/`requireAdminSession()` (anon key + request cookies,
used only to check "is there a logged-in admin?"). Never use the service-role
client to check auth, never use the session client for data reads/writes.

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
| `POST api/admin/reject` (Phase B) | reject + release seat | admin session |
| `GET api/admin/waitlist-export` (Phase B) | CSV export (waitlist only) | admin session |
| `GET api/admin/registrations` (Phase B) | full list, all statuses | admin session |
| `POST api/admin/resend` (Phase B) | resend ticket email for a verified row | admin session |
| `GET api/admin/export` (Phase B) | CSV/Excel export of all registrations | admin session |
| `api/phonepe/initiate` / `webhook` (Phase B) | sandbox demo only | public / webhook signature |

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
