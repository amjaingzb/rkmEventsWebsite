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

> [!warning] Production deploy gate before the demo — confirmed 2026-09-09
> A production Netlify deploy (`netlify deploy --build --prod`) is a
> **required task before the Adhyaksha Maharaj demo**, but the project
> owner has deliberately deferred it — Netlify prod deploys cost credits
> (15 each, see [[netlify.md]]), and they don't want to burn multiple
> redeploys while still iterating locally. **Do not deploy to production
> proactively** — wait until both: (1) local development work is actually
> done/frozen for the demo, and (2) an appointment with Adhyaksha Maharaj is
> confirmed/scheduled. Only then deploy the final commit. Until that
> trigger, keep working locally (`npm run dev`) as normal; a draft deploy
> (`--alias demo`, not `--prod`) remains fine anytime it's actually needed
> to test something real deploy-only (e.g. the PhonePe webhook, see item 0
> below) since draft deploys don't cost production credits the same way.
> Currently deployed prod build is commit `25fdd96` — local `main` is
> already ahead of that (PhonePe integration, Resend/Netlify domain setup
> docs, etc.), so the gap between deployed-vs-latest will keep growing
> until this gate is lifted.

> [!note] Working mode, confirmed 2026-09-08
> Back to local-only development (`npm run dev` / `scripts/server.sh`).
> Claude deploys to Netlify — draft or production — **only when explicitly
> asked**, never automatically as part of finishing a task. See
> [[netlify.md]] for the full deploy workflow (draft deploys are free and
> fully functional, even demo-able, via a stable alias URL; production
> costs 15 credits and is reserved for deliberate publishes).

**Site is live** — https://rkm-halasuru-registration.netlify.app, currently
serving commit `25fdd96` (see [[netlify.md]] "Deployment log" for what's
actually deployed vs. what's in git — they can drift now that deploys are
manual/on-request).

**Open to-dos:**

0. **Draft-deploy to test PhonePe end to end via the real webhook** —
   `supabase/migrations/0004_phonepe_and_payment_mode.sql` has been run
   against the live Supabase project (2026-09-09), so registration, the
   PhonePe sandbox flow, and the admin payment-mode toggle all work from
   `npm run dev`. What's left: the real inbound PhonePe webhook can't
   reach `localhost` — one `netlify deploy --build --alias demo` gets a
   stable public URL to test the actual scan-QR → "Simulate Success" →
   webhook-fires loop. See [[architecture.md]] "Payment Module Boundary"
   and [[BACKLOG.md]] item 6.
1. **Update the DNS instructions sent to the admin (Bluehost)** — the
   message already sent
   (`Type: CNAME, Host: events, Points To: cname.vercel-dns.com`) was
   written for Vercel and is wrong for Netlify. Netlify doesn't have one
   universal CNAME target like Vercel does — the exact record only appears
   after adding the custom domain in Netlify's dashboard (Domain management
   → Add a domain you already own → enter `events.<yourdomain>`), and it's
   generated specific to this site (likely a CNAME to
   `rkm-halasuru-registration.netlify.app`, but needs confirming there, not
   guessed). The Resend TXT/CNAME part of that same message is unaffected
   and can stay as originally planned. Not yet done — needs the project
   owner to either do the "Add domain" step or ask Claude to (dashboard
   action, not blocked on CLI access).
2. **Push local commits to `origin/main`** — local `main` is currently
   ahead of `origin/main` (check `git status -sb` for the exact count, it
   shifts each session). Push from your own machine, or ask Claude to set
   up credentials in-session.
3. **Resend domain verification — DONE, confirmed 2026-09-09.** Resend now
   shows "Domain verified: Your domain is ready to send emails." for
   `rkmhalasuru.simplicie.com`. `TICKET_FROM_EMAIL` updated in
   `0_SECRETS/env.local` from `onboarding@resend.dev` to
   `tickets@rkmhalasuru.simplicie.com`, dev server restarted, and confirmed
   live end-to-end: registered + verified a test entry
   (`bhikajicama09@gmail.com`, seat 6, "Resend Verify Test") through the
   admin dashboard, ticket email delivered with no `403 validation_error`
   and no error in the dev server log — the sandbox-sender restriction
   ([[BACKLOG.md]] item 7) is resolved. That test registration was left in
   place (verified, harmless) rather than deleted — see the existing
   "smaller open item" below about clearing test registrations before real
   ones start coming in.
   Background — the project owner has direct Cloudflare DNS access
   via their brother's account for `simplicie.com`, and verified
   `rkmhalasuru.simplicie.com` directly (subdomain, not `amit.simplicie.com`
   as originally guessed — see [[technical-concepts.md]] for the DNS/Resend
   background Q&A this walkthrough built up).
   - **Domain added in Resend**, region ap-northeast-1 (not ap-south-1 —
     that's just what Resend assigned, no functional issue).
   - **All 4 DNS records added in Cloudflare**, confirmed via screenshot,
     all "DNS only" (not proxied): DKIM TXT (`resend._domainkey.rkmha...`),
     SPF MX (`send.rkmhalasuru` → `feedback-smtp.ap-northeast-1.amazonses.com`,
     priority 10), SPF TXT (`send.rkmhalasuru` → `v=spf1
     include:amazonses.com ~all`), DMARC TXT (`_dmarc` → `v=DMARC1;
     p=none;`). Existing records on the same zone (brother's Gmail/Workspace
     MX + DKIM) were left untouched — confirmed via screenshot.
   - Clicked "I've already added the records" in Resend — as of 2026-09-09
     all 3 checks show **pending**, Resend's banner says DNS propagation
     "may take a few hours." **Next action to resume:** go back to
     resend.com/domains → the `rkmhalasuru.simplicie.com` domain, check if
     it now shows verified; if still pending after a few hours, re-check
     Cloudflare records are unchanged and re-click "I've already added the
     records." Once verified, update `TICKET_FROM_EMAIL` (in
     `0_SECRETS/env.local` and wherever mirrored) from `onboarding@resend.dev`
     to something like `tickets@rkmhalasuru.simplicie.com`, restart the dev
     server, and send a real test registration to a second inbox (not the
     Resend account owner's) to confirm the `403 validation_error` is gone.
   - **Netlify custom domain — DONE (2026-09-09).**
     `rkmhalasuru.simplicie.com` is now the Netlify project's Primary
     domain, HTTPS enabled with a valid Let's Encrypt certificate (issued
     2026-09-09, auto-renews before Dec 8). Cloudflare CNAME
     `rkmhalasuru.simplicie.com → rkm-halasuru-registration.netlify.app`,
     left "DNS only" (not proxied). Along the way: had to also add a
     one-time Netlify domain-ownership-verification TXT record
     (`subdomain-owner-verific...`) because `simplicie.com`'s root was
     already registered to a Netlify project elsewhere; and deleted a
     leftover unused `amit.simplicie.com` CNAME from a prior attempt
     (same target, tagged "Amit-unused") to avoid multiple aliases pointing
     at the same site. **Not yet done:** actually load
     `https://rkmhalasuru.simplicie.com` in a browser to confirm the site
     renders correctly end-to-end (cert is confirmed valid, but the live
     page load itself hasn't been checked yet).
   - See [[BACKLOG.md]] item 16 for a deferred, purely-cosmetic follow-up
     (renaming the Netlify project itself) — confirmed not to affect any of
     the records above.
4. Run [[setup.md]]'s concurrency load test against a test event to confirm
   the atomic seat-cap RPC behaves correctly under concurrent requests.

The admin dashboard is feature-complete (round 2 polish pass) — see
"Recently completed" below. All of that work is committed and deployed.

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

Footer/error-message contact email is now `amjain.gzb@gmail.com`
(project owner decision, 2026-09-09, switched from the earlier
`bhikajicama09@gmail.com` placeholder) — still a placeholder personal
inbox, not the final org contact. Swap `CONTACT_EMAIL` in
`src/lib/contact.ts` when the real one is ready; every message that shows
contact info (footer, rejected status message/email/WhatsApp, confirmation
page, registration form error) reads from that one constant. See
[[dev-accounts.md]] for the full email-role breakdown.

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

- **2026-09-08 (PhonePe sandbox integration + always-on UPI display)** —
  built while waiting on the Resend domain handover, so the project owner
  can demo both a manual and an automated payment flow to Adhyaksha
  Swamiji before he decides which to keep:
  - The registration page (and the confirmation page, while `pending`)
    now always shows the Math's UPI ID (`ramakri13482@kbl`), a scannable
    QR (`GET api/upi/qr`), and a `upi://pay?...` mobile deep-link
    (`UpiPaymentInfo.tsx`) — regardless of payment mode. Closes a real gap:
    the FAQ already promised "you will see our bank transfer details and
    UPI QR code" during registration, but nothing rendered it before this.
  - Registration fee is now a single fixed constant, ₹500/attendee
    (`PRICE_PER_ATTENDEE_INR` in `src/lib/payment/pricing.ts`) — the old
    free-text "Amount paid" input (self-reported, never checked against
    attendee count) is gone; the amount is computed and shown read-only
    everywhere.
  - New `src/lib/payment/phonepe.ts` — a real, working PhonePe PG v1
    sandbox client (public test credentials, no merchant account needed):
    initiate + webhook signature verification + a status-check
    reconciliation fallback, all funneling through the existing
    `markVerifiedAndIssueTicket` seam unchanged. Not a synchronous
    `PaymentModule` implementation (PhonePe is webhook-driven) — see
    [[architecture.md]] for why that's still the right isolation boundary.
  - New `events.payment_mode` column (`'manual'` | `'phonepe_sandbox'`),
    toggleable live from `/admin/dashboard` with **no redeploy** —
    explicitly needed because the project owner will be demoing from a
    venue without dev-environment access.
  - Caught and fixed a real bug during build verification: `/` had gotten
    statically prerendered at build time (Next.js's static-generation
    heuristic), which would have baked in whatever `payment_mode` was set
    at build time and made the "no redeploy" toggle silently not work.
    Fixed with `export const dynamic = "force-dynamic"` on `src/app/page.tsx`.
  - Build/lint verified clean; homepage and the new UPI QR endpoint
    live-tested against the running dev server. Migration
    `0004_phonepe_and_payment_mode.sql` run against the live Supabase
    project 2026-09-09 — see item 0 above for what's still left (a
    Netlify draft deploy to test the real inbound webhook).
- **2026-09-08 (deployed to Netlify, switched from planned Vercel)** — site
  is now live at https://rkm-halasuru-registration.netlify.app, smoke-tested
  (homepage, `/admin/login`, and an auth-gated API route all responding
  correctly). Originally planned to deploy to Vercel per [[architecture.md]],
  but the project owner flagged (a second opinion from Gemini, verified
  directly against Vercel's own terms pages) that Vercel's Hobby plan
  restricts free-tier use to "personal or non-commercial use" and explicitly
  lists "requesting or processing payment from visitors" as commercial
  usage — a real risk for this site, which collects a payment reference from
  registrants even though actual money moves off-site via UPI/bank transfer.
  Cloudflare Pages was evaluated next and ruled out for a different, more
  fundamental reason: its Workers Free plan caps CPU time at 10ms/request
  (rendering time counts, network waits don't) — a structural mismatch for
  an SSR-heavy Next.js app like this one (registration form, admin
  dashboard, QR PNG generation), not something fixable by avoiding
  bleeding-edge features. Netlify has neither restriction (verified
  directly: no commercial-use clause in its ToS/AUP, 60s synchronous
  function timeout fixed across all plans including Free — not the 10s
  originally assumed). Setup: `netlify sites:create` (site name
  `rkm-halasuru-registration`, team "15 Commandments"), `netlify env:import
  .env.local` to port all secrets, `netlify deploy --build --prod`. **Not
  git-linked** — deploys are manual via the CLI for now; pushing to `main`
  does not auto-deploy. See "Next action" for the optional GitHub-link
  follow-up.
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
