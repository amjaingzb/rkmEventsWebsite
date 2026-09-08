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

Phase A is now confirmed working end-to-end against the real Supabase project
(see "Recently completed" below) — a real test registration was submitted,
verified via `/admin/dashboard`, and the ticket email with a working QR was
received. Next up, in order:

1. **Design + build out the admin dashboard** — the project owner expects
   more than the current pending-only table with a single Verify button:
   full registration list across all statuses, resend-ticket-email, a
   CSV/Excel export of all registrations, WhatsApp send, and the reject
   action. See [[BACKLOG.md]] item 5a for the full breakdown — this needs a
   scoping/design pass before implementation, not a quick bolt-on.
2. Run [[setup.md]]'s concurrency load test against a test event to confirm
   the atomic seat-cap RPC behaves correctly under concurrent requests.
3. Push the local git repo to a GitHub remote — a remote
   (`github.com/amjaingzb/rkmEventsWebsite`) is now configured, but this
   sandbox has no push credentials; push from your own machine, or set up
   credentials in-session if you want Claude to do it.

Deprioritized: QR anti-forgery testing and the mobile scanning app are no
longer near-term — confirmed by the project owner (2026-09-08) as post-
prototype-demo work; manual visual ticket check is fine until then. See
[[BACKLOG.md]] item 9.

Smaller open item: footer contact email/phone is still a placeholder —
send that whenever you have it.

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
