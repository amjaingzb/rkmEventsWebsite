---
tags: [event-registration, backlog]
created: 2026-09-08
aliases: [TBD list]
---

# Backlog / TBD

Running list of things intentionally deferred past the Phase A prototype.
Update this whenever something is skipped for time — don't let it get lost.

## Go-Live Checklist (2026-09-08)

> [!warning] Must fix before any real public registrations open
> - ~~**Not deployed anywhere**~~ — **done (2026-09-08).** Live at
>   https://rkm-halasuru-registration.netlify.app (Netlify, not the
>   originally planned Vercel — see [[nextSteps.md]] "Recently completed"
>   for why). Not git-linked yet, so deploys are manual via the Netlify CLI;
>   pushing to `main` does not auto-deploy.
> - **Resend domain not verified** — `TICKET_FROM_EMAIL` is still the shared
>   `onboarding@resend.dev` sandbox sender, which only delivers to the Resend
>   account owner's own email (see item 7 below). Blocks ticket delivery to
>   everyone else. Blocked on an external person handing over subdomain
>   access (project owner, 2026-09-08) — not an actionable Claude task right
>   now. Note: unrelated to site hosting — the site can stay on a free
>   `*.netlify.app` domain regardless of which domain email sends from.
> - **No rate limiting on `/api/register`** (item 11) — a scripted flood
>   could exhaust the 500-seat cap with junk entries.
> - **Duplicate submissions unblocked** (item 2) — same person can claim a
>   seat more than once.
> - **npm audit: 1 moderate + 1 high advisory** (item 14), fix requires a
>   breaking Next 16 upgrade.
> - **Footer contact is a personal placeholder Gmail** (`bhikajicama09@gmail.com`,
>   `src/lib/contact.ts`), not a real org contact — fine for demo/dev, swap
>   before real attendees rely on it for payment disputes.

> [!note] Should fix before wider rollout, not necessarily before a demo
> RLS policies (item 1), admin-verify concurrency untested (item 3), no
> admin audit log (item 10), no retry/alert on email send failure (item 7),
> waitlist re-invite has no tooling (item 5).

> [!warning] Not yet done for Phase A launch
> Items 1–3 below are the highest-risk gaps if this goes live before Phase B.

1. **Row-Level Security (RLS)** — `events`/`registrations` currently have no
   RLS policies; all access goes through the service-role key from server-side
   API routes only (never exposed to the browser), so there's no direct public
   exposure today, but RLS should still be added as defense-in-depth before
   wider rollout: anon role restricted to executing `register_attendee` only,
   admin role gated by an authenticated check. See plan Phase B.
2. **Duplicate submissions** — nothing currently stops the same person
   registering twice (same email/phone). Decide desired behavior (block,
   warn, or allow and let admin merge) before Phase B ships.
3. **Idempotency of admin verify** — `markVerifiedAndIssueTicket` guards
   against a double-click resending the email (via the `status = 'pending'`
   WHERE clause), but this hasn't been tested under true concurrent requests.
4. **Rejection + seat release flow** — built 2026-09-08 as part of item 5a
   below (`POST /api/admin/reject`, atomic seat release via
   `reject_registration()`). Scoped to `pending` rows only.
5. **Waitlist re-invite tooling** — no CSV export or bulk-notify mechanism;
   organizers currently would need to query Supabase directly to re-engage
   the waitlist if a bigger venue is arranged.
5a. **Admin dashboard full build — done (2026-09-08)**, migration applied and
    every action (list/filter/resend/export/WhatsApp/reject) verified live
    against the real Supabase project, including a direct check that reject
    correctly decrements `seats_taken`. Round 2 polish (same day, after a
    live walkthrough) added: `/admin` entry point + logout, event
    name/date in WhatsApp/resend messages, a Seat # column + search box,
    a Received/Confirmed timestamp split, and admin walk-in/cash
    registration — see [[nextSteps.md]] "Recently completed" for the full
    breakdown. One migration from that round
    (`0003_null_seat_number_on_reject.sql`, fixes a real seat-number-reuse
    collision bug found via testing) has now been run against the live
    project — confirmed 2026-09-08 by querying `registrations` directly
    (the one rejected row has `seat_number: null`). Built:
    - Full registrations view across all statuses, with tabs
      (All/Pending/Verified/Waitlisted/Rejected) — `GET /api/admin/registrations`.
    - Resend ticket email — `POST /api/admin/resend`, only for `verified`
      rows; re-runs just the email step via `resendTicketEmail()` in
      `src/lib/ticket/issue.ts` (shares the email-input mapping with
      `markVerifiedAndIssueTicket` so the two can't drift).
    - CSV export of all registrations — `GET /api/admin/export`. Plain CSV
      (not real .xlsx) per project owner decision — Excel opens it fine, no
      new dependency.
    - Send-by-WhatsApp — `wa.me` deep link per row, pre-filled with a
      status-appropriate message, phone normalized to `91<10 digits>`. Per
      project owner decision: manual-click first cut, not a real API
      integration (no WhatsApp Business account set up).
    - Reject action — `POST /api/admin/reject`, scoped to `pending` rows
      only (rejecting an already-verified/ticketed row is a separate
      "un-invite" flow, not built). Releases the claimed seat atomically via
      a new `reject_registration()` Postgres function
      (`supabase/migrations/0002_reject_and_release_seat.sql`), same
      single-UPDATE-with-guard shape as `register_attendee` — see
      [[architecture.md]].
6. **PhonePe production integration** — merchant account not set up yet.
   Only a *sandbox* demo module is planned (`src/lib/payment/phonepe.ts`),
   isolated from the real registration flow, to show stakeholders technical
   feasibility. See [[../problemStatement.txt]] and the payment module
   boundary in `src/lib/payment/types.ts`.
7. **Email deliverability** — no bounce handling or retry on send failure;
   a failed `sendTicketEmail`/`sendStatusEmail` call throws inside the
   calling route without a retry path (as of 2026-09-08 both now check the
   Resend SDK's `{data, error}` response and throw on `error` — previously
   the `error` field was silently ignored, so a rejected send looked like
   success). **Live blocker found 2026-09-08**: `TICKET_FROM_EMAIL` is still
   `onboarding@resend.dev`, Resend's shared unverified-domain sender —
   Resend restricts that sender to delivering **only** to the email address
   that owns the API key (confirmed live: sending to a second test address
   returned `403 validation_error`, "You can only send testing emails to
   your own email address"). Until a real domain is verified at
   resend.com/domains and `TICKET_FROM_EMAIL` points at an address on it,
   only the Resend account's own signup email can receive any ticket/status
   email — every other recipient will get a thrown 500 now (previously:
   silently nothing). Test inboxes available meanwhile: see
   [[nextSteps.md]].
8. **Multi-seat overflow behavior** — a booking with `numAttendees > 1` that
   would exceed the cap falls entirely to waitlist rather than partially
   filling remaining seats. Documented as intentional simplification in
   `supabase/migrations/0001_init.sql`, revisit if it causes user complaints.
9. **Mobile app QR-scanning integration** — see [[QR_PAYLOAD_SPEC.md]]; no
   online verify endpoint (`api/ticket/verify`) built yet, and the
   offline-scan secret-distribution tradeoff is unresolved. **Confirmed
   deferred (2026-09-08)** by the project owner: the companion scanning app
   is only in scope after the prototype demo to Adhyaksha Swamiji; manual
   ticket/QR visual check at the door is fine for now. Not a launch blocker —
   don't prioritize the QR anti-forgery test (BACKLOG-adjacent, was in
   [[nextSteps.md]]'s queue) ahead of this being actually needed.
10. **Admin audit log** — only `verified_by`/`verified_at` columns exist on
    `registrations`; no separate append-only audit trail of admin actions.
11. **Rate limiting / abuse protection** — `api/register` has no rate limit;
    a scripted flood could exhaust the 500-seat cap with junk entries.
12. **Content** — real content is now in place (as of 2026-09-08) for
    speaker bio, agenda, venue address/map, parking/transit rules, and all
    FAQs — sourced from the project owner via `delme-clipboard/input-data.txt`
    and hardcoded into `src/components/static/*.tsx`. Only the **footer
    contact email/phone** remains a `[PLACEHOLDER: ...]`. Note:
    `events.faq_json`/`parking_info` in `supabase/seed.sql` are still
    unused — the static sections are hardcoded JSX, not wired to read
    from the `events` table. Revisit only if multi-event reuse becomes a
    real near-term need (see the "Multi-tenancy" note in the root
    `CLAUDE.md` — deliberately minimal for now).
13. **Styling** — done for the first pass: nav bar (Home/Agenda/Speakers/
    Venue/FAQ/Register), saffron/maroon/gold/cream "spiritual" theme, serif
    display font, section structure modeled on the Chennai Math reference
    site. Landed 2026-09-08. Future polish (animations, richer imagery
    beyond the one banner/speaker photo, mobile QA beyond a quick check)
    is still open-ended but no longer blocking.
14. **npm audit: postcss (via Next.js 15.5.25)** — 1 moderate + 1 high
    advisory remain, fixed only by upgrading to Next 16 (breaking change).
    Deferred given the timeline; re-run `npm audit` and consider the Next 16
    migration before wider rollout.

## Refinement (post-prototype polish)

Not needed for the prototype demo; revisit once the site is past that stage.

15. **Client-side form validation** — `RegistrationForm.tsx` (and the admin
    walk-in equivalent) currently has no input-shape validation beyond HTML
    `required`/`type="email"`. Add, scoped to India-only (no international
    numbers/payments per project scope): full name rejects digits, phone
    requires exactly 10 digits (optionally auto-stripping a `+91`/`91`
    prefix rather than accepting arbitrary country codes). Server-side
    `register_attendee` stays the source of truth either way — this is purely
    UX (catch the mistake before submit, don't rely on client validation for
    correctness).
