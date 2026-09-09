# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the dev server (http://localhost:3000)
- `npm run build` — production build (also runs TypeScript type-checking; treat build errors as blocking)
- `npm run lint` — ESLint
- `npx tsx --env-file=.env.local scripts/load-test-register.ts <baseUrl> <n>` — concurrency test for the atomic seat-cap claim; see README.md for the required test-event setup. There is no other test suite yet.

No env vars are provided in this repo. Copy `.env.local.example` to `.env.local` and fill in a real Supabase project + Resend key before the app will function beyond static pages — see README.md for full setup steps.

## Architecture

This is an event registration site (Next.js App Router + Supabase). Read `docs/home.md` first — it indexes `docs/BACKLOG.md` (deferred/TBD items, don't assume something is done without checking it) and `docs/QR_PAYLOAD_SPEC.md` (frozen ticket QR format).

**Keep `docs/` current.** Whenever you build a non-trivial feature or land a fix that changes behavior a doc describes, update the relevant file under `docs/` in the same session — don't leave it for later or batch it at the end. In particular: `docs/nextSteps.md` "Recently completed" / "Next action", `docs/BACKLOG.md` item status, and `docs/architecture.md` if the described structure changed. Trivial/cosmetic changes don't need a doc update.

**Seat-cap correctness is the core invariant.** `guaranteed_seat_cap` (default 500) on the `events` table must never be oversold under concurrent registrations. The claim happens at **payment verification time**, not registration submission time (moved there in `supabase/migrations/0009_verification_time_capacity_claim.sql`, per `docs/registration-integrity.md` Item 3 — an abandoned/incomplete checkout no longer squats on a seat). `register_attendee` just inserts a `pending` row unconditionally; the atomic claim-or-waitlist logic — a single `UPDATE ... WHERE seats_taken + n <= cap RETURNING`, still not in application code — lives in `claim_and_verify_registration`, called only from `markVerifiedAndIssueTicket()` (`src/lib/ticket/issue.ts`). Don't reintroduce a read-then-write count check in TypeScript, and don't move the claim back to submission time.

**Payment logic is isolated behind one interface** (`src/lib/payment/types.ts`) specifically so the payment method can change without touching the rest of the system:
- `src/lib/payment/manual.ts` — current production path (admin clicks Verify in the dashboard).
- `src/lib/payment/phonepe.ts` — Phase B sandbox-only demo, driven by a webhook instead of an admin click; not wired into the real registration flow.
- Both implementations call the same downstream seam, `markVerifiedAndIssueTicket()` in `src/lib/ticket/issue.ts`, which updates `registrations.status` and sends the ticket email. That function is the boundary: it and everything downstream of it (ticket generation, email) must stay payment-method-agnostic. When adding a new payment method, only `src/lib/payment/**` and the API route that invokes it should change.

**Auth model:** admins log in via real Supabase Auth (`/admin/login`, `src/lib/supabase/client.ts`). `src/lib/supabase/server.ts` exposes two distinct clients — `createServiceClient()` (service-role key, bypasses RLS, used for all data access from API routes) and `createSessionClient()`/`requireAdminSession()` (anon key + request cookies, used only to check "is there a logged-in admin?"). Never use the service-role client to check auth, and never call the session client for data reads/writes.

**Registration status lifecycle:** `pending` (payment ref submitted, no seat claimed yet — see the seat-cap note above) → `verified` (admin/webhook confirmed, seat claimed at that point, ticket sent) or `rejected` (Phase B). `waitlisted` (no seat, cap was full at verification time) is a separate branch, not a lifecycle stage — waitlisted registrations don't have a `registration_number` (renamed from `seat_number`, see `docs/registration-integrity.md`) and aren't expected to transition to `verified` without a separate re-invite process (not yet built, see `docs/BACKLOG.md`).

**QR tickets** are pipe-delimited `regId|eventSlug|sig` (HMAC-SHA256 signed) — see `src/lib/ticket/qr.ts` and `docs/QR_PAYLOAD_SPEC.md`. This format is a frozen external contract (a separate mobile app is expected to scan these later); don't change the format without updating the spec doc and considering backward compatibility with already-issued tickets.

**Multi-tenancy is intentionally minimal:** the `events` table holds per-event config (venue, dates, seat cap, FAQ) so a future event could reuse this codebase, but there's no admin UI for managing multiple events — one row is seeded via `supabase/seed.sql` and selected by the `EVENT_SLUG` env var. Don't build out multi-event UI unless asked; it was deliberately left minimal per the project owner's request.

**Git tags mark rollback points, not a changelog — see `docs/git-label-strategy.md`.** Keep the tag count low. Proactively suggest (don't silently create) a tag when a real milestone lands: a production deploy actually going live, a test confirming a load-bearing invariant (e.g. the seat-cap concurrency test), right before starting a large/risky change with a demo approaching, or right before a demo itself.
