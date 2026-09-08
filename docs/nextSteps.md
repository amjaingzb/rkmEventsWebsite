---
tags: [event-registration, next-steps]
aliases: [next steps, todo, status]
created: 2026-09-08
updated: 2026-09-08
---

# Next Steps

> [!note] How to use this file
> This is the async-work anchor. Come back, open a session, ask "what's
> next" — the answer is the **Next action** section below. Claude should
> update this file at the end of every work session: move finished items to
> "Recently completed", update "Next action", and refresh the queue.

## Next action

**Resend is only delivering to one inbox right now** — `TICKET_FROM_EMAIL`
is still `onboarding@resend.dev` (Resend's shared test sender), which Resend
restricts to delivering only to the email address that owns the API key
(confirmed live, 2026-09-08: sending elsewhere returns `403 validation_error`
— see [[BACKLOG.md]] item 7). Verify a real domain at resend.com/domains and
point `TICKET_FROM_EMAIL` at an address on it to unblock delivery to
everyone else. Until then, test sends only reach the Resend account's own
signup address. Four real inboxes are available for dev testing meanwhile:
`amjain.gzb@gmail.com`, `bhikajicama09@gmail.com`,
`ruchisai197518@gmail.com`, `sairam_197518@yahoo.in`.

The admin dashboard is now feature-complete (round 2 polish pass) — see
"Recently completed" below. **One manual step required:**

1. **Run `supabase/migrations/0003_null_seat_number_on_reject.sql`** in the
   Supabase SQL editor. Fixes a real bug found during testing: rejecting a
   registration released its seat count but left `seat_number` set on the
   rejected row, so that seat number gets reassigned to a future
   registration and the dashboard can show two different people with the
   same seat number. The migration also backfills any rows already affected.
2. Run [[setup.md]]'s concurrency load test against a test event to confirm
   the atomic seat-cap RPC behaves correctly under concurrent requests.
3. Push the local git repo to a GitHub remote — a remote
   (`github.com/amjaingzb/rkmEventsWebsite`) is now configured, but this
   sandbox has no push credentials; push from your own machine, or set up
   credentials in-session if you want Claude to do it.

Smaller open item: the live Supabase project now has a handful of test
registrations from dev-flow verification (`TEST-TXN-002`, `TEST-TXN-003`,
`TEST-TXN-REJECT-001`, and a `Test Cash Walkin` manual entry) — fine to leave
for now, but worth clearing out of `registrations` before real registrations
start coming in (they don't affect `seats_taken`/the cap once
rejected/verified, but they'll clutter the admin dashboard and CSV export).

Deprioritized: QR anti-forgery testing and the mobile scanning app are no
longer near-term — confirmed by the project owner (2026-09-08) as post-
prototype-demo work; manual visual ticket check is fine until then. See
[[BACKLOG.md]] item 9.

Footer/error-message contact email is now `bhikajicama09@gmail.com`
(project owner decision, 2026-09-08) — a placeholder personal inbox, not the
final org contact. Swap `CONTACT_EMAIL` in `src/lib/contact.ts` when the
real one is ready; every message that shows contact info (footer, rejected
status message/email/WhatsApp, confirmation page, registration form error)
reads from that one constant.

## Queue (after the admin dashboard work above)

1. Once the admin dashboard is scoped and built, start the rest of Phase B
   per [[architecture.md]]:
   - RLS policies (`supabase/migrations/0002_rls.sql`, not yet written —
     note: RLS is already *enabled* with no policies on `events`/
     `registrations` as of 2026-09-08, see "Recently completed", so `anon`
     has zero access today; this item is about writing the actual policies)
   - Rejection + seat-release flow (`api/admin/reject`)
   - Waitlist re-invite tooling (separate from the general CSV export above)
   - PhonePe sandbox demo (isolated, not linked into the real flow)

Full rationale and the complete deferred-items list: [[BACKLOG.md]].

## Recently completed

- **2026-09-08 (email fixes + contact info)** — 4 issues reported by the
  project owner after live testing:
  1. Rejected-registration email was bland compared to the WhatsApp message
     for the same status — the email was missing the event date and any
     footer/contact detail the WhatsApp text had. Fixed: `sendStatusEmail`
     (`src/lib/ticket/email.ts`) now also shows event date + registration ID
     and a "Need help? Contact us at..." line, same as the ticket email;
     threaded through from `sendStatusUpdateEmail` in `src/lib/ticket/issue.ts`.
  2. A registration made to a second test inbox never received its email.
     Root cause: **`resend.emails.send()` resolves `{data, error}` rather
     than throwing on API-level errors, and both `sendTicketEmail` and
     `sendStatusEmail` were ignoring the `error` field** — a rejected send
     looked identical to a successful one. Fixed: both now throw on
     `error`. Live-tested the specific failure with a throwaway script: the
     real cause is that `TICKET_FROM_EMAIL` is still Resend's shared
     `onboarding@resend.dev` sender, which only delivers to the API key
     owner's own signup email (`403 validation_error` on any other
     recipient) — not fixable in code, needs a verified domain at
     resend.com/domains. See [[BACKLOG.md]] item 7 and "Next action" above.
  3. Added [[BACKLOG.md]] item 15 (new "Refinement" section) for post-
     prototype client-side form validation — full name rejecting digits,
     phone scoped to exactly 10 India-only digits, no intl numbers.
  4. Real contact email wired in everywhere "contact us" is shown — new
     `CONTACT_EMAIL` constant (`src/lib/contact.ts`, currently
     `bhikajicama09@gmail.com`, a placeholder personal inbox per project
     owner decision) used by the footer, the shared `STATUS_MESSAGE.rejected`
     copy (so both the WhatsApp deep link and the status email pick it up
     automatically), the confirmation page's rejected copy, and the public
     registration form's generic error fallback.
  Build clean throughout (`npm run build`).
- **2026-09-08 (admin dashboard polish, round 2)** — feedback from a live
  walkthrough of round 1, fixed in one pass:
  - `/admin` entry point (`src/app/admin/page.tsx`) — redirects to
    `/admin/dashboard` if logged in, `/admin/login` otherwise, so there's one
    URL to remember. Plus a working Log out button
    (`src/components/AdminLogoutButton.tsx`).
  - WhatsApp messages now include event name/date context (previously just
    said "your registration is..." with no indication of which event) —
    `GET /api/admin/registrations` now also returns the event's
    title/date alongside the rows.
  - Resend generalized beyond `verified` rows: `POST /api/admin/resend` now
    tries `resendTicketEmail` first, and falls back to a new
    `sendStatusUpdateEmail` (plain status email, no QR) for
    pending/waitlisted/rejected rows — new `sendStatusEmail` in
    `src/lib/ticket/email.ts`, shared `STATUS_MESSAGE` copy in the new
    `src/lib/registration/statusMessages.ts` (same map feeds both the
    WhatsApp text and this email, so the two channels can't drift).
  - **Seat # column added** — `seat_number` was already being fetched but
    never rendered; now shown, plus a search box (name/phone/email/seat
    #/payment ref/reg ID) so a caller — especially a rejected one with no
    seat — can be found quickly.
  - "Submitted" renamed to "Received"; added a "Confirmed" column
    (`verified_at`) — previously the ticket email showed a confirmation
    time the dashboard didn't.
  - **Admin walk-in/cash registration** — new
    `src/components/AdminManualRegisterForm.tsx` + `POST
    /api/admin/manual-register`: admin types in a walk-in's details, it goes
    through the same atomic `register_attendee` RPC as the public form (seat
    cap never bypassed — factored into a shared `registerAttendee()` helper
    in `src/lib/registration/register.ts`, also now used by `POST
    /api/register`), then immediately verifies + issues the ticket in the
    same request since cash is already in hand (falls back to `waitlisted`
    with no auto-ticket if the cap was full at that instant).
  - **Bug found via live testing and fixed**: `reject_registration` (0002)
    released the seat count but left `seat_number` set on the rejected row,
    so a future registration reusing that seat number would collide with it
    in the dashboard. Fixed in
    `supabase/migrations/0003_null_seat_number_on_reject.sql` (nulls
    `seat_number` on reject + backfills existing rejected rows) — **not yet
    run against the live project**, see "Next action" above.
  - Build/lint clean throughout. Verified live via the chrome-devtools
    sidecar against the real Supabase project: `/admin` redirect, logout,
    walk-in cash registration (confirmed seat number, matching
    received/confirmed timestamps, ticket email sent), seat-number
    collision bug (caught this way), search filtering, and the resend→
    status-email fallback (confirmed zero server errors) all checked.
- **2026-09-08 (admin dashboard rebuild)** — full scope from [[BACKLOG.md]]
  item 5a, built after a scoping pass (WhatsApp: `wa.me` deep link, not a
  real API integration; export: CSV, not real .xlsx — both project owner
  decisions):
  - `GET /api/admin/registrations` (replaces the old pending-only
    `/api/admin/pending`, now removed) — full list with `?status=` filter;
    `AdminTable.tsx` now has status tabs (All/Pending/Verified/Waitlisted/
    Rejected) instead of a single pending table.
  - `POST /api/admin/resend` — resend the ticket email for a `verified` row.
    Refactored `src/lib/ticket/issue.ts` to share the reg→email-input
    mapping (`toTicketEmailInput`) between `markVerifiedAndIssueTicket` and
    the new `resendTicketEmail`, so they can't drift apart.
  - `GET /api/admin/export` — CSV of all registrations, all columns incl.
    status/seat/timestamps.
  - WhatsApp deep link per row (`wa.me/91<10-digit-phone>?text=...`),
    status-appropriate pre-filled message. No real WhatsApp API integration.
  - `POST /api/admin/reject` + new `reject_registration()` Postgres function
    (`supabase/migrations/0002_reject_and_release_seat.sql`, new
    `rejected_by`/`rejected_at` columns) — atomically rejects a `pending` row
    and releases its claimed seat, same single-UPDATE-with-guard pattern as
    `register_attendee`. Scoped to `pending` only; rejecting an already-
    verified/ticketed row is a separate un-invite flow, not built.
  - Build (`npm run build`) and lint clean. Verified live via the
    chrome-devtools sidecar against the real Supabase project: tab
    switching, resend (confirmed `ticket_sent_at` bumped), and CSV export
    all worked with zero console/server errors. Migration
    `0002_reject_and_release_seat.sql` was then run by the project owner in
    the Supabase SQL editor, and reject was verified live too: submitted a
    real test registration via `/api/register` (seats_taken 2→3), rejected
    it from the dashboard, confirmed status flipped to `rejected` and
    `seats_taken` correctly dropped back to 2 (checked directly against the
    `events` row, not just the UI) — the atomic release in
    `reject_registration()` works as designed.
- **2026-09-08 (dynamic testing unblocked)** — Supabase + Resend accounts
  created, `.env.local` filled in and verified end-to-end:
  - Secrets convention changed: real values now live in `0_SECRETS/env.local`
    (gitignored, project owner's own backup convention), with `.env.local`
    at the repo root as a symlink to it so Next.js still picks it up.
  - Ran `0001_init.sql` and `seed.sql` in the Supabase SQL editor, choosing
    "Run and enable RLS" — `events`/`registrations` now have RLS enabled
    with zero policies, so `anon` has no direct access (writing real policies
    is still open, see [[BACKLOG.md]] item 1).
  - Hit and fixed a real gap: this Supabase project had no default grants for
    `service_role`/`anon` on new tables (`permission denied for table`,
    Postgres error 42501 — distinct from RLS). Fixed with explicit
    `GRANT SELECT/INSERT/UPDATE` + `GRANT EXECUTE on register_attendee` to
    `service_role`. Worth checking on any future Supabase project created the
    same way — it is not safe to assume default privilege grants exist.
  - Admin user's password was lost/unknown twice during setup; the dashboard
    (this Supabase project's version) has no direct "set password" field, and
    the email-recovery link came back `otp_expired` (likely an email-client
    link-prescanner burning the one-time token) — worked around both times
    using the Supabase Admin REST API
    (`PUT /auth/v1/admin/users/{id}` with `{"password": ...}` via the
    service-role key) to set the password directly, no email round-trip.
  - Confirmed full flow live via the chrome-devtools sidecar: submitted a
    real registration → verified via `/admin/dashboard` → ticket email
    arrived. First attempt's QR was a broken image in Gmail — root cause and
    fix below.
  - **QR email bug**: the ticket email embedded the QR as an inline `data:`
    URI `<img src>`, which Gmail (and most clients) strip from HTML mail.
    Fixed by switching to a real CID attachment: `buildQrBuffer()` (new, in
    `src/lib/ticket/qr.ts`) returns a PNG `Buffer` via `QRCode.toBuffer`,
    sent as a Resend attachment with `content_id: "ticket-qr"`, referenced in
    the HTML as `<img src="cid:ticket-qr">`. Confirmed via a second live
    test — QR renders correctly in Gmail. See [[architecture.md]]'s Tickets/QR
    section — don't revert to the data-URI helper for the email path.
  - Per project owner request, the ticket email now also states number of
    attendees, payment amount, and the verification (confirmation)
    date/time — added to `TicketEmailInput` in `src/lib/ticket/email.ts` and
    threaded through from `markVerifiedAndIssueTicket` in
    `src/lib/ticket/issue.ts`.
  - Admin dashboard scope gap identified (project owner expected more than
    the current pending-only table) — captured as [[BACKLOG.md]] item 5a,
    not yet built.
  - Mobile QR-scanning app confirmed deferred to post-prototype-demo — see
    [[BACKLOG.md]] item 9.
  - Build (`npx tsc --noEmit`) verified clean after all code changes above.
- **2026-09-08 (later still)** — Real content pass + bug fixes from
  user screenshot review:
  - Pulled real content from the project owner (`delme-clipboard/input-data.txt`)
    into every static section: speaker bio (short + detailed), real agenda
    times, real venue address + live Google Maps embed, real
    parking/transit rules, and all 11 real FAQ entries grouped into 3
    categories. Only the footer contact email/phone is still a placeholder.
  - Added site navigation (Home/Agenda/Speakers/Venue/FAQ/Register) and a
    saffron/maroon/gold/cream "spiritual" visual theme with a serif
    display font, styled after the Chennai Math reference site's
    structure. New Agenda section added (wasn't in the original scaffold).
  - Fixed 3 real bugs the project owner caught via screenshots: (1) the
    RKM banner image was wrongly reused as the speaker's photo — it's
    actually Vivekananda/Ramakrishna/Sarada Devi, not Swami
    Sarvapriyananda, so it was pulled and replaced with a placeholder,
    then with the real speaker photo once provided; (2) the hero banner
    was cropping heads off — switched to an uncropped `object-contain`
    layout; (3) the Register section had an oversized empty gap below the
    FAQ — tightened spacing and gave the form a bordered card. (The 4th
    screenshot — the "N" bubble — was just Next.js's own dev-mode
    toolbar, not a bug.)
  - Initialized the git repo (`git init`, branch `main`) and made the
    first commit. No GitHub remote configured yet.
  - Build and lint pass throughout. Verified visually via the
    chrome-devtools sidecar (screenshots + console-error checks), not
    just build/lint.
- **2026-09-08 (later)** — Static content sections scaffolded on the
  homepage: Hero, SpeakerSection, VenueParkingSection, FaqSection (inline
  accordion), Footer — all under `src/components/static/`, wired into
  `src/app/page.tsx` above the registration form. All copy is Lorem Ipsum
  with `[PLACEHOLDER: ...]` comments marking what needs real content
  (speaker bio/photo, venue address/map, parking rules, FAQs, contact
  info). Build and lint pass. Doesn't touch Supabase, so viewable via
  `npm run dev` with no env setup. See [[BACKLOG.md]] items 12–13.
- **2026-09-08** — Phase A scaffolded: Next.js + Supabase project skeleton,
  schema + atomic seat-cap RPC, payment module boundary (manual only),
  QR ticket generation + email, registration/confirmation/admin-login/
  admin-dashboard pages. Build and lint pass. Fixed a critical Next.js CVE
  and other npm audit issues found during install. Not yet tested against a
  real Supabase project (blocked on account creation, see Next action above).
