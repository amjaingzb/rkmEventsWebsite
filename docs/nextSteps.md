---
tags: [event-registration, next-steps]
aliases: [next steps, todo, status]
created: 2026-09-08
updated: 2026-09-12 (later)
---

# Next Steps

> [!note] How to use this file
> This is the async-work anchor. Come back, open a session, ask "what's
> next" — the answer is the **Next action** section below. Claude should
> update this file at the end of every work session: move finished items to
> "Recently completed", update "Next action", and refresh the queue.

## Next action

> [!note] Demo (2026-09-11) went very well — post-demo follow-ups (2026-09-12)
> Adhyaksha Maharaj was "very highly appreciative." Two things came out of
> the debrief, both purely brainstorming/logging so far, no code changed:
> - **Admin password rotated** (project owner did this directly in the
>   Supabase dashboard — no code/deploy involved, see [[dev-accounts.md]]
>   "Admin dashboard login") since the old shared login had gone to several
>   people during demo prep.
> - Discussed the risk that `/admin/content` writes are unversioned
>   (overwrite-only, no rollback, and the project is staying on Supabase's
>   free tier so there's no point-in-time DB recovery to fall back on
>   either) — agreed direction is a `content_history` audit/rollback table,
>   logged as [[BACKLOG.md]] item 27, to be designed as its own feature
>   later, not started.
> - Adhyaksha Maharaj is excited about reusing this site for similar
>   events, and may ask for a second event to be stood up even before this
>   one happens — logged as [[BACKLOG.md]] item 28, pure TBD, no direction
>   chosen (a floated cheap option is duplicating the whole
>   site/repo per event rather than building real multi-tenant UI).
>   **Deliberately deferred further, same day**: project owner will ask
>   Maharaj to hold off on a second event until after the 31 Oct 2026 event
>   is done, to keep pressure off this decision for now — not to be picked
>   up before then.
> - **[[BACKLOG.md]] item 25 (admin dashboard mobile redesign) built and
>   merged to `main` 2026-09-12** after a code review (presentation-only
>   change, both layouts share the same components/data, no logic risk).
>   Two breakpoints only, as scoped: desktop table pixel-unchanged, new
>   mobile card-per-row view added. Also fixed a horizontal-overflow bug
>   in the dashboard page's own header row, found while testing this.
>   `npm run build`/`lint` clean, both breakpoints verified live via
>   chrome-devtools, and the project owner confirmed the real mobile
>   rendering/feel on their phone via a Netlify draft deploy
>   (`demo--` alias). Feature branch deleted post-merge. **Closed.**

> [!note] Grounded feature-summary doc + a `/summary` testers page built (2026-09-10)
> Project owner wanted a genuinely-accurate (not oversold) feature summary to
> hand to Adhyaksha Maharaj at the demo, and later to volunteers helping test
> the site. Built as `docs/product-summary.html` — a self-contained,
> print-to-PDF-ready one-pager (Fraunces/Karla type, saffron/maroon/gold
> palette matching the site), grouped by area (Registration, Payments &
> Seat Guarantee, Tickets, Admin Operations, Content Management) with each
> row tagged **Live / Sandbox demo / Planned**, plus a short roadmap
> (door-scanning app, waitlist re-invite, mobile admin dashboard, tiered
> admin roles, PhonePe going live, and reuse for other Math events).
> Deliberately **not** linked from [[home.md]] and doesn't mention code
> paths or BACKLOG/TBD items — it's an output-only doc meant to be handed
> off as-is, not read as project context.
>
> Also published as a Claude Artifact (private link, owner can share/export
> to PDF from there) and mirrored as a real page on the site itself at
> **`/summary`** (`src/app/summary/page.tsx`, public, no auth, not linked
> from any nav — see [[architecture.md]] "Pages") so it can be handed to
> volunteer testers as a live URL, not just a static file. Both copies kept
> in sync by hand (same content, not templated from one source) — if the
> feature list changes again, update both. `npm run build`/`lint` clean.
> Redeployed to the `demo--` draft alias so `/summary` is live there too.

> [!warning] Admin dashboard action redesign built (2026-09-10) — migration 0014 needs to be run before testing
> A long collaborative design pass (plan mode, `few-more-points-here-wondrous-candle.md`)
> reworked the admin dashboard's Verify/Reject/Notify buttons end to end,
> triggered by a real gap: rejecting someone was a one-way door with no
> way back, and no automatic notification. Built and committed, but
> **migration `0014_reinstate_and_reject_reason.sql` has not been run
> against the live Supabase project yet** — run it in the SQL editor
> before testing any of this (same pattern as every prior migration this
> project). What it adds: `reinstated_by`/`reinstated_at`,
> `rejection_reason`, `registration_mode` columns; a new
> `reinstate_registration()` RPC; extends `reject_registration()` and
> `register_attendee()` (both re-created with `drop function if exists`
> first, since Postgres treats a changed parameter list as a different
> function — adding a param via plain `create or replace` would have
> silently left the old signature callable too).
>
> **What changed, tab by tab**:
> - **Pending**: Verify/Reject unchanged for manual-mode rows. Reject now
>   opens a small inline reason field (not a native prompt — project
>   owner asked for this to be done properly since the demo moved to
>   tomorrow) and **auto-sends the rejection email** on click — no more
>   separate manual "Send email" step to remember. No "Notify again" on
>   pending (row leaves the tab immediately either way); WhatsApp kept
>   as the one channel that doesn't decide anything.
> - **Pending, PhonePe mode**: real gap found — the admin Verify button
>   never actually checked PhonePe payment status at all
>   (`manualPaymentModule.verifyPayment()` always returns `verified:
>   true` by design), and Reject could silently strand a genuine payer
>   if PhonePe's webhook arrived after the reject. New `registration_mode`
>   column (stamped per-row at creation, not derived from the event's
>   current toggle) now gates Verify/Reject/WhatsApp: disabled for 1
>   hour after submission on PhonePe rows, then enabled as a manual
>   override/fallback if the automation is genuinely stuck. Guarded both
>   client-side (`AdminTable.tsx`) and server-side
>   (`src/lib/registration/phonepeGate.ts`, used by both
>   `/api/admin/verify` and `/api/admin/reject`) — the server check
>   fails **open** (allows the action) on any unexpected error, since a
>   bug in this specific guard is lower-stakes than permanently
>   stranding an admin action.
> - **Verified / Waitlisted**: unchanged, confirmed aligned as originally
>   designed.
> - **Rejected**: no more separate "Reinstate" button — a single reused
>   **Verify** button (behind a `window.confirm()`) does reinstate +
>   claim + ticket in one motion. Converged on this after discussion: by
>   the time an admin revisits a rejected row, the actual payment check
>   has almost always already happened out-of-band (registrant called/
>   WhatsApp'd with proof), so a separate "Reinstate" click followed by a
>   third "now Verify" click was ceremony, not a second safety check.
> - **New**: a submission-acknowledgement email now fires automatically
>   on every registration (`/api/register`, `/api/register/eoi`) — until
>   today, submitting only ever showed a confirmation *page*, with zero
>   email until verify/reject/an admin's manual click. Subject line and
>   the confirmation page's headline now share one source
>   (`getStatusTitle` in `statusMessages.ts`) so they can't drift apart.
>
> **Two things explicitly raised and deferred, high priority, revisit
> after the demo — not designed or built, just logged**:
> 1. **The paid-but-waitlisted race.** The capacity buffer
>    (`computeAutoPause` in `src/lib/registration/capacity.ts`) stops
>    *new* submissions once verified+pending nears the cap, but doesn't
>    guarantee the existing pending backlog actually fits the remaining
>    seats — verification-order effects can still land a genuine payer
>    on `waitlisted` (flagged today as "⚠ paid — needs resolution" in
>    the admin table). Confirmed structurally: **this can only happen
>    near the cap boundary** (the race requires cumulative claims to
>    threaten exceeding `cap`; with headroom, every pending registration
>    succeeds automatically) — which may allow a simpler boundary-only
>    fix later instead of a general refund process. Not tested, not
>    resolved — needs a real walkthrough of what an admin is actually
>    supposed to do when they see that flag.
> 2. **Paused / auto-pause-due-to-backlog.** Confirmed this already
>    exists (built 2026-09-09, the non-Full-EOI Paused state — admin
>    manual toggle or the same buffer formula) — project owner had
>    forgotten it existed and want to revisit, discuss, test, and
>    resolve properly after the demo.
>
> **Done, same session**: migration 0014 applied (project owner ran it),
> full local smoke test passed via chrome-devtools — reject-with-reason
> → auto rejection email (verified no errors in server log) → reused
> Verify button reinstate+claim+ticket (confirmed `reinstated_by`/
> `reinstated_at` set, `rejected_by`/`rejected_at`/`rejection_reason`
> preserved as history, `events.seats_taken` incremented exactly once,
> Reg. No. 2 assigned) → cancel path (dismissed confirm, confirmed zero
> network call fired) → reject with a **blank** reason (confirmed no
> "Reason:" line shown, optional as designed). PhonePe gating verified
> both client- and server-side: submitted a real PhonePe-mode
> registration (`registration_mode` correctly stamped `phonepe`,
> real PhonePe UAT sandbox checkout redirect confirmed working), direct
> API calls to `/api/admin/verify` and `/api/admin/reject` both
> correctly returned `409` while gated; backdated the test row's
> `created_at` by 2 hours to simulate the window elapsing, confirmed
> both the UI (Verify/Reject/WhatsApp re-enabled) and the server (`200`
> on direct API calls) correctly opened up as the manual-override
> fallback. Submission acknowledgement email confirmed on the manual/
> paid path (no errors in server log); the EOI path shares the identical
> `sendStatusUpdateEmail` call so wasn't separately live-tested. `npm run
> build`/`lint` clean throughout, dev server restarted after each build
> (same stale-`.next` gotcha as always), `demo` draft alias redeployed
> with all of this.
>
> **Cleanup done (2026-09-10, later same day).** By the time this was
> revisited, the table held 10 rows total — not just the ones listed
> above but further clutter from later testing sessions too (PhonePe
> gate/failure test identities, a walk-in test, EOI test rows, etc.).
> Project owner ran `select reset_event_registrations('halasuru-sarvapriyananda-2026');`
> directly in the SQL editor (wipes all registrations + zeroes
> `seats_taken`) plus a manual `update events set guaranteed_seat_cap =
> 500 ...` — the reset function only zeroes `seats_taken`, it does **not**
> touch `guaranteed_seat_cap`, which had drifted to 40 from earlier
> capacity/EOI testing and needed a separate statement. Confirmed
> `waitlist_alert_threshold` (buffer) was untouched at its default of 10.
> Reseeded via the real public form + admin Verify button (same pattern as
> the 2026-09-09 reseed, using the [[dev-accounts.md]] test-customer
> identities): **Ruchi Jain** (Reg. No. 1, verified, ticket sent),
> **Sai Ram** (Reg. No. 3, 2 attendees, verified, ticket sent), **Lakshmi
> Iyer** (`ruchisai197518+lakshmi@gmail.com`, pending) — this intermediate
> state confirmed directly against Supabase: `seats_taken: 3`,
> `guaranteed_seat_cap: 500`, `payment_mode: manual`.
>
> **Superseded later the same day** — after the mobile PhonePe testing
> pass added more test rows (`test.phonepe.failure`, `testB.phonepe.failure`,
> `phonepe.expiry.userB`), the project owner ran a full
> `reset_event_registrations` wipe again rather than a targeted delete,
> clearing those 3 demo rows too. **Confirmed intentional** — the project
> owner wants to run the actual demo from a genuinely empty registrations
> table, not reseeded. Final pre-demo state confirmed directly against
> Supabase: 0 registrations, `seats_taken: 0`, `guaranteed_seat_cap: 500`,
> `payment_mode: manual`.

> [!warning] Demo postponed to tomorrow (2026-09-11) — ~10 hrs of runway left, cutoff 7 PM today (2026-09-10)
> Originally leaving for the demo within 1-2 hours (see the triage below,
> done earlier today); project owner confirmed 2026-09-10 the demo moved
> to tomorrow, giving roughly 10 more hours today to keep polishing before
> a 7 PM cutoff. Use this window for further manual-testing feedback passes
> (a short checklist is at [[manual-test-checklist.md]]) and any additional
> fixes that surface — same standing rule applies: **no production deploy
> without the project owner's explicit go-ahead**, keep working against
> the draft URL (`https://demo--rkm-halasuru-registration.netlify.app`,
> alias `demo`, redeployed after each fix so it always reflects local
> `main`).
>
> **Fixes landed since the original triage, from live manual-testing
> feedback (screenshots via `delme-clipboard/manualtestFeedback/`)**:
> - On-blur/on-change field validation (name/email/phone/payment
>   reference) — previously only validated on submit, which on mobile
>   looked like the Register button wasn't responding; see the item-15
>   entry below for the full validation history.
> - Confirmation page: dropped the redundant UPI payment QR (registrant
>   had already submitted a payment reference by that point), added a
>   "Back to homepage" link, and now shows full contact info
>   (email/phone/WhatsApp, all linked) instead of just an unlinked email.
> - Payment reference field now explicitly asks for the **last 4 digits**
>   of the UPI Ref. No./UTR/RRN (not the app's alphanumeric Transaction
>   ID) — a real, recurring pain point in manual-mode verification at the
>   Math. Fuller fix (server-side enforcement, per-UPI-app guidance) logged
>   as [[BACKLOG.md]] item 21.
> - Admin table: added a "Reg. ID (registrant-facing)" column — a
>   registrant reading their confirmation page's ID over a phone call had
>   no way to be located in the dashboard, since the existing "Reg. No."
>   column is a different field (`registration_number`, blank until
>   verified — confirmed still genuinely useful as a free headcount/order
>   reference, kept as-is, not renamed to "Seat No." — see
>   [[BACKLOG.md]] item 20 for why `seat_number` was deliberately renamed
>   away from in the first place, there's no assigned seating).
> - The real Supabase event data was fully wiped via
>   `select reset_event_registrations('halasuru-sarvapriyananda-2026');`
>   (run by the project owner directly in the SQL editor) — everything in
>   the registrations table right now is fresh test data from today's
>   testing pass, not the 2026-09-09 seeded demo rows. **Re-seed the 3
>   clean demo rows (or decide to leave it empty) before the actual demo**
>   — not yet done.
>
> Original same-day triage, still relevant for what's already decided:
> 1. ~~**BACKLOG.md item 15** — client-side form validation~~ — **done, this
>    session.** `src/lib/registration/validation.ts` (new) adds
>    `validateFullName` (rejects digits) and `validatePhone` (strips an
>    optional `+91`/`91` prefix, requires exactly 10 digits), wired into
>    both `RegistrationForm.tsx` and `EoiForm.tsx`. **Not** done for the
>    admin walk-in form (`AdminManualRegisterForm.tsx`) — skipped for time,
>    internal-only so lower risk. Verified live via chrome-devtools: a
>    name with digits and a 5-digit phone are now correctly blocked with
>    inline errors; a `+91 98765 43210` phone normalizes and submits
>    correctly. `npm run build` clean. **Caveat**: the first live test run
>    (before a dev-server restart picked up the change — known
>    build-while-dev-running stale-cache gotcha) let one bad row through
>    before the fix was actually live in the browser — see the cleanup
>    note below.
> 2. **BACKLOG.md item 17 (hierarchical admin roles) — considered and
>    explicitly deferred, not attempted today.** Discussed with the project
>    owner: this touches the auth/authorization boundary
>    (`requireAdminSession()`, every admin route) and was already flagged
>    as needing its own design discussion, not a same-day change this close
>    to a demo. Status unchanged from BACKLOG.md item 17 — still just a
>    confirmed-additive direction, nothing built.
> 3. ~~**Local test pass**~~ — **done, this session.** Registration → admin
>    Verify → ticket email confirmed end to end via chrome-devtools against
>    the real Supabase project ("Smoke Test Demo Run", Reg. No. 8, verified
>    9/10/2026 3:02:34 AM, `ticket_sent_at` stamped, zero errors in the dev
>    server log). Duplicate detection also incidentally re-confirmed (a
>    resubmission attempt against the already-seeded "Ruchi Jain" identity
>    was correctly blocked with a 409). **A real bug was found and fixed in
>    the process** — see the item-15 entry above: `normalizePhone()` was
>    stripping a bare `91` prefix from *any* phone starting with it, so a
>    genuinely valid 10-digit number like `9123456789` (common — lots of
>    real Indian mobile numbers start with 91) got miscounted as 8 digits
>    and rejected. Fixed to only strip `91` when it's part of a 12-digit
>    country-code+number string, or behind a literal `+91`. Would have been
>    an embarrassing false-rejection live at the demo if this hadn't been
>    caught first. **Not yet done**: admin walk-in registration, PhonePe
>    sandbox mode, and the EoiForm's own submit path weren't separately
>    smoke-tested this session (only RegistrationForm's manual-payment
>    path) — low risk since they share the same validation helper and RPC,
>    but worth knowing if something surfaces at the demo.
> 4. **Production deploy** (`netlify deploy --build --prod`, not a draft)
>    — **project owner will trigger this explicitly** after doing their own
>    testing pass (own computer, mobile) on top of the local pass above;
>    Claude should not deploy proactively (per [[netlify.md]] and standing
>    instruction). Once asked: (1) confirm local `main` has everything
>    wanted for the demo (today's two commits — validation + the phone-bug
>    fix — plus yesterday's UI redesign/hero/logo/favicon assets, `.next`
>    cache-corruption fix), (2) run the production deploy, (3) re-run a
>    sanity pass against the live site (project owner's ask) before the
>    demo, not just locally.
>
> **Cleanup needed before the demo, not done (blocked by the session's
> safety classifier — destructive live-data edit — same pattern as
> "2026-09-09 demo-data cleanup" below; flagged to the project owner
> rather than forced through)**: several throwaway `pending` rows are
> sitting in the real `halasuru-sarvapriyananda-2026` event's admin
> dashboard and should be rejected/deleted before the project owner shows
> the dashboard at the demo:
> - **From this session**: "John Doe123" / phone `12345` (pre-fix test,
>   still `pending`), "Test User Demo" / phone `+91 98765 43210` (still
>   `pending`), and **"Smoke Test Demo Run" / phone `9012345678`** — this
>   one is `verified` with a real ticket email sent to
>   `amjain.gzb+smoketest@gmail.com`, Reg. No. 8, so removing it will also
>   need `seats_taken` decremented (or use the reject flow, which does
>   this atomically for `pending` rows — a `verified` row needs the
>   separate un-invite path noted as not-yet-built elsewhere in this doc,
>   so may need a direct Supabase edit instead).
> - **Pre-existing, not from this session** — found while checking the
>   dashboard, previously undocumented: "Migration Check Dup" (pending,
>   `migration-check-eoi@example.com`), "Migration Check Open" (verified,
>   Reg. No. 7), "Ruchi Jain Ticket-Check" (both a pending and a verified
>   copy, `ruchisai197518+ticketcheck@gmail.com` variants), and
>   "Tester-PhonePe" (verified, Reg. No. 6) — look like leftovers from
>   earlier migration/ticket-email testing that were never swept up by the
>   2026-09-09 demo-data reset. Same cleanup applies.

> [!note] Content-editability: all 6 implementation-plan steps done
> > (2026-09-10)
> Full design in [[content-editability-design.md]] — read it before
> touching this area again, especially the "Implementation plan" section
> (each step's done-state and verification notes) and [[BACKLOG.md]]
> item 17 (role hierarchy, deliberately deferred, see below).
>
> **What shipped**: Hero, Agenda, Speaker bio, FAQ, Venue & Parking, and a
> new Contact settings area (email/phone/WhatsApp) are DB-backed as new
> columns on the existing `events` row (`0012_content_editability.sql`,
> `0013_hero_display_labels.sql` — both applied to the live Supabase
> project and verified by reading rows back). `src/app/page.tsx` fetches
> all of it through 6 independently `unstable_cache`-tagged reads
> (`content:<area>:<slug>`, `src/lib/content/getEventContent.ts`) and
> passes it as props into Hero/Agenda/Speaker/Venue/FAQ/Footer — those
> components no longer own their own copy. A new **`/admin/content`** page
> (linked from `/admin/dashboard`'s "Site content" button, behind the
> same single existing admin login — not a new role) lets the project
> owner edit any area and save; `PATCH /api/admin/content` writes the DB
> and calls `revalidateTag` in the same request, so edits go live
> immediately, no deploy, no waiting on the 5-minute cache backstop.
> Footer/Navbar stayed hardcoded as components per the original inventory
> call.
>
> **Verified live end-to-end** via the chrome-devtools sidecar with the
> real admin account: all 6 editor tabs render the actual current content
> correctly, an edit (Contact phone number) saved and appeared on the
> public homepage's footer instantly with zero console/server errors, then
> was reverted and re-confirmed. `npm run build`/`lint` clean throughout.
>
> **`CONTACT_EMAIL` constant fully retired (2026-09-10, same session)** —
> initially left split after step 4 (only Footer read the DB value, 5
> other places still imported the hardcoded constant, so editing Contact
> settings silently had no effect on them). Raised and fixed immediately:
> `getStatusMessage()` replaces the old `STATUS_MESSAGE` map,
> `sendTicketEmail`/`sendStatusEmail` take `contactEmail` as an input,
> `issue.ts` threads it from the `events` join, `GET
> /api/admin/registrations` returns it for the admin WhatsApp deep link,
> `EoiForm`/`RegistrationForm` take it as a prop, and the confirmation page
> selects it in its existing query. `src/lib/contact.ts` deleted — nothing
> imports it anymore. One save in `/admin/content` → Contact now updates
> every surface that shows it. Build/lint clean, verified live.
>
> **Not done, explicitly out of scope for this pass**:
> - Hero/speaker photo URLs still point at the existing `public/images/`
>   paths — the Supabase Storage bucket decided on for photo hosting is
>   separate infra, not yet created.
> - **Role hierarchy** — raised while deciding the edit front door;
>   project owner wants future lower-privilege admin roles (e.g. a
>   content-only editor). Confirmed **additive**: today's single admin
>   role stays a permanent super-user, new roles layer in alongside it.
>   Deliberately deferred as its own separate design discussion — see
>   [[BACKLOG.md]] item 17.
> - No client-side validation on the new editor's phone/email fields yet
>   (accepts anything, same gap the public form had before
>   [[BACKLOG.md]] item 15).
>
> None of this was a demo blocker and there was no rush — it's simply
> done now.

> [!note] Rounded favicon — done, switched to a different logo (2026-09-10)
> The Halasuru/Ulsoor-style shield badge previously in `icon.png`/
> `apple-icon.png` is a quatrefoil/scalloped medallion, not drawn as a
> circle — a plain circular mask would've clipped its four corner points.
> Project owner instead chose to swap in the general Ramakrishna Math &
> Mission seal (snake-swan-sun-lotus disc, naturally circular in its source
> art), from images they dropped in `delme-clipboard/icons/`:
> `Ramakrishna_Math___Ramakrishna_Mission_idtiPh1l5z_1.jpeg` → `icon.png`
> (48×48) and `Logo-Color-512px.jpg` → `apple-icon.png` (180×180). Both
> center-cropped to square, scaled to 90% with transparent padding (so the
> cobra's head loop — which touches the edge of the source art — stays
> fully inside the mask), then circle-masked. **Known mismatch, accepted by
> project owner**: the navbar/hero logo (`public/images/logo.png`) still
> shows the original shield badge, so the browser tab icon and the on-page
> logo are now two different (though both official) emblems. `npm run
> build` clean.

> [!note] Real photo/logo assets swapped in (2026-09-10)
> Follow-up to the visual redesign below, from real assets the project
> owner dropped in `delme-clipboard/`: Hero's building photo is now
> `public/images/hero-matha-photo.jpg` (real matha exterior, replacing the
> placeholder `rkm-halasuru.png`, which was deleted as unused elsewhere),
> `Navbar.tsx` now renders the real Ramakrishna Math emblem
> (`public/images/logo.png`) next to the wordmark, and the keynote speaker
> photo's circular crop was fixed (`object-cover` → `object-cover
> object-top` in `SpeakerSection.tsx`) since center-cropping the portrait
> source was cutting off the top of the head. `npm run build` and
> `npm run lint` clean; verified all three live in a browser session.

> [!note] Public page visual redesign done (2026-09-09)
> Restyled the public event page in place, component by component, per a
> screenshot-driven brief: `Navbar.tsx` (smooth scroll + IntersectionObserver
> scroll-spy), `Hero.tsx` (2-column desktop layout with date/time/venue
> chips), `SpeakerSection.tsx` (featured card, condensed bullet highlights +
> "Read full bio" toggle replacing three unbroken paragraphs),
> `FaqSection.tsx` (CSS grid-rows open/close transition + rotating chevron,
> same accordion state logic), and the register-section wrapper plus
> `RegistrationForm.tsx`/`EoiForm.tsx` (elevated card, new shared
> `src/components/FormInput.tsx` primitive, client-side inline validation
> messages layered on top of — not replacing — the existing
> submit/duplicate/PhonePe-redirect logic). No business logic, API calls, or
> the paused/full-eoi/open conditional in `page.tsx` changed — purely
> presentational. `npm run build` and `npm run lint` both clean; manually
> exercised scroll-spy, the FAQ transition, the bio toggle, and form
> validation in a live browser session (desktop + mobile viewport).

> [!note] Migrations applied + manual verification pass done, one real bug found and fixed (2026-09-09)
> All of [[registration-integrity.md]] is implemented (6 commits, one per
> implementation-order step — see "Recently completed" below), migrations
> `0007`-`0011` are applied to the live Supabase project, and a manual
> pass through the real running app (not just schema checks) confirmed
> the following, cleaning up every test row created afterward so live
> data was left exactly as found (`confirmed_booking: 6, outstanding: 1,
> cap: 500, buffer: 10`):
> - **Open state**: real submission via `POST /api/register` lands
>   `pending` with `events.seats_taken` unchanged; directly calling
>   `claim_and_verify_registration` (same RPC the admin Verify button
>   calls) then correctly flips it to `verified`, assigns a
>   `registration_number`, and increments `seats_taken` only at that point.
> - **Duplicate detection + per-submission cap**: confirmed a `waitlisted`
>   (EOI) row does *not* block a later duplicate (correct, out of match
>   scope), a `pending` row *does* block one (409 + existing ID), and both
>   `/api/register` and `/api/register/eoi` reject `numAttendees > 4`.
> - **Paused state**: manually flipping `is_registration_open` to `false`
>   correctly shows the admin's pause message with no form.
> - **Full-EOI state**: — **found and fixed a real bug**. With the
>   original `auto_pause` formula, forcing `guaranteed_seat_cap` down to
>   match `seats_taken` (to test "genuinely full") showed "Paused" forever,
>   never the EOI form — `auto_pause`'s formula was mathematically always
>   true whenever `Full` was too, so Full-EOI could never win the priority
>   check. Fixed by adding a `confirmedBooking < cap` guard to `auto_pause`
>   (`src/lib/registration/capacity.ts`) so it only fires as a backlog
>   brake *before* the cap is reached; re-tested both the backlog-pause
>   case and the genuinely-full case afterward, both now correct. See
>   [[registration-integrity.md]] Item 5 for the full writeup.
>
> **Both closed out (2026-09-09):**
> - **Admin-UI-to-email path, confirmed end to end.** Submitted a real
>   registration through the public form in manual-verification mode,
>   clicked **Verify** in the live admin dashboard, and confirmed
>   `ticket_sent_at` got stamped (i.e. the real Resend send succeeded —
>   `sendTicketEmail` throws on any API-level error and that throw would
>   have blocked the timestamp update). Confirmed by reading
>   `src/lib/ticket/email.ts` that the template has no seat-number field
>   anywhere and does include `Phone: ${input.phone}`. Two throwaway test
>   rows this created on the real event were flagged to the project owner
>   rather than auto-deleted (destructive live-data edits are blocked by
>   the session's own safety classifier); project owner said not to worry
>   about them for now.
> - **Concurrency load test re-run against `claim_and_verify_registration`,
>   confirmed race-safe.** Pointed `EVENT_SLUG` at the existing `test-event`
>   row (cap 5), fired 20 concurrent `POST /api/register` calls, then 20
>   concurrent `claim_and_verify_registration` RPC calls via
>   `scripts/load-test-register.ts`. Verified directly against Supabase:
>   exactly 5 `verified` rows with unique `registration_number`s 1–5, 15
>   `waitlisted` all with `registration_number: null`, `events.seats_taken`
>   exactly 5 — no oversell. Confirms the claim logic holds under real
>   concurrency now that it's called from verification time, not just
>   submission time. Test rows wiped via `reset_event_registrations`,
>   `EVENT_SLUG` switched back to `halasuru-sarvapriyananda-2026`, dev
>   server restarted.

> [!warning] CORRECTED 2026-09-10: no production deploy for tomorrow's demo — `demo--` draft only
> Superseded by the entry below — **production deploy is now explicitly
> off the table for the 2026-09-11 demo**, not just deferred. Reason: the
> PhonePe sandbox webhook is registered in the PhonePe dashboard against
> the `demo--` draft alias's URL specifically
> (`https://demo--rkm-halasuru-registration.netlify.app/api/phonepe/webhook`),
> confirmed working end-to-end there (see "Recently completed" 2026-09-10,
> PhonePe auto-reject test). A production deploy would serve from a
> different URL whose webhook was never registered with PhonePe, silently
> breaking the auto-verify/auto-reject flow on the URL actually being
> demoed. **The project owner will run the demo directly from
> `https://demo--rkm-halasuru-registration.netlify.app`.** If/when the
> project ever does move to production for real, the PhonePe webhook URL
> in the PhonePe Business Dashboard must be updated to the production URL
> first — see [[BACKLOG.md]] item 6.
>
> Original entry below, now historical — production deploys still cost
> Netlify credits and still shouldn't happen proactively, but the *demo*
> specifically will never use one:

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

0. **Update the DNS instructions sent to the admin (Bluehost)** —
   **downgraded to a fallback, confirmed 2026-09-09; not a demo blocker.**
   The Bluehost admin hasn't replied to the original (Vercel-targeted, now
   wrong-for-Netlify) DNS message at all. Project owner's plan: escalate
   directly to Adhyaksha Maharaj **after** the demo if needed, rather than
   chase the admin further now. Separately, the project owner's brother has
   already okayed loaning the `simplicie.com` subdomain path (the same
   mechanism already used for `rkmhalasuru.simplicie.com`, see
   [[nextSteps.md]] "Recently completed" 2026-09-09 and [[netlify.md]]) as a
   working fallback if the Bluehost domain never comes through — so the
   custom-domain need is already covered independent of this admin. No
   action needed here for the demo. If it's ever picked back up: the
   original message
   (`Type: CNAME, Host: events, Points To: cname.vercel-dns.com`) was
   written for Vercel and is wrong for Netlify — Netlify's exact CNAME
   target only appears after adding the custom domain in its dashboard
   (Domain management → Add a domain you already own → enter
   `events.<yourdomain>`), likely `rkm-halasuru-registration.netlify.app`
   but needs confirming there, not guessed. The Resend TXT/CNAME part of
   that same message is unaffected and can stay as originally planned.
1. ~~Push local commits to `origin/main`~~ — **stale, already done.**
   Confirmed 2026-09-10: `git rev-list --left-right --count
   origin/main...HEAD` reads `0 0`, local `main` and `origin/main` are
   identical. Superseded by the many commits since this item was written.
2. ~~Run [[setup.md]]'s concurrency load test~~ — **done (2026-09-09).**
   See "Recently completed" below. `EVENT_SLUG` confirmed back to
   `halasuru-sarvapriyananda-2026`.
3. **Manual mobile test pass — partially done 2026-09-10, still open.**
   Project owner tried the **admin dashboard** on a phone and found it
   genuinely bad — see [[BACKLOG.md]] item 25 (logged, deliberately
   deferred past the demo, not a quick fix). The **public** registration
   flow has *not* yet been separately confirmed on a real phone — still
   open, in particular:
   - Tapping the PhonePe button actually opens/deep-links into a UPI app
     correctly (a real device/OS behavior local `npm run dev` desktop
     testing can't confirm).
   - General "does the site look/behave broken on mobile" pass across the
     public pages (landing page, registration form, confirmation page) —
     layout, tap targets, no horizontal scroll, etc. (The admin dashboard
     is now a known-bad, deferred case — don't re-test it here, item 25
     already covers it.)
4. ~~Cosmetic fixes (hero whitespace, speaker photo crop)~~ — **stale,
   already done.** Confirmed via `git log`: `d2698c3` "Swap in real hero
   photo, logo, and fix speaker photo crop" (2026-09-09) addressed both.
   The broader "site looks a bit bland" / mock-screens-pass question was
   never picked up separately and remains open only if the project owner
   wants to raise it again — not a specific bug to chase.
5. **Attendance/QR-scanning — webapp, not a separate "sevaConnect" Android
   app (corrected 2026-09-09; superseded an earlier, incompatible note in
   this same slot).** Per [[BACKLOG.md]] item 9's "Direction change under
   consideration" note (also 2026-09-09), the project owner is leaning away
   from a native Android companion app entirely, toward a
   volunteer-password-gated attendance page built into this same Next.js
   site instead — takes a seat number, marks that registration present,
   writes directly to the same Supabase DB (no separate datastore to
   reconcile). This **replaces**, not enhances, the previously-discussed
   separate "sevaConnect" Android app. Still just a direction, nothing
   built: collision handling (two volunteers marking the same seat) and
   offline/flaky-connection behavior at the door are unresolved and need
   designing first; camera-based QR scanning from a phone browser would
   also need the not-yet-built `api/ticket/verify` online-verify endpoint.
   Confirmed out of scope before the demo — see [[BACKLOG.md]] item 9,
   revisit after.

The admin dashboard is feature-complete (round 2 polish pass) — see
"Recently completed" below. All of that work is committed and deployed.

~~Smaller open item: test registrations clutter~~ — **done (2026-09-09).**
See "Recently completed" below: all prior test/dev registrations wiped via
the new `reset_event_registrations()` DB function, replaced with 3 clean
demo entries (Ruchi Jain, Sai Ram — verified; Lakshmi Iyer — pending) using
the documented test-customer identities from [[dev-accounts.md]]. A real
bug was also found and fixed in the process: the admin dashboard and CSV
export weren't scoped to `EVENT_SLUG` at all, silently mixing in
registrations from any other event row (e.g. the `test-event` used for
load testing) — see below for the fix.

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
   - ~~RLS policies~~ — **written and applied 2026-09-12**,
     `supabase/migrations/0015_rls_policies.sql` — see "Recently completed"
     and [[BACKLOG.md]] item 1.
   - Rejection + seat-release flow (`api/admin/reject`)
   - Waitlist re-invite tooling (separate from the general CSV export above)
   - PhonePe sandbox demo (isolated, not linked into the real flow)

Full rationale and the complete deferred-items list: [[BACKLOG.md]].

## Recently completed

- **2026-09-12 (WhatsApp feedback channel + build-info badge added to
  `/summary`).** Project owner wanted a way for testers/volunteers to send
  feedback (bugs/suggestions) directly from `/summary`, but a full
  Supabase-backed feedback table + storage bucket + admin UI was judged
  overkill for the actual audience (2-3 people) — went with the lightest
  option instead:
  - A fixed bottom-right "Send feedback" button plus an inline
    "share what breaks on WhatsApp" link in the intro copy, both opening
    `wa.me/919731007760` with a pre-filled message
    (`src/app/summary/page.tsx`). Both render the same `WhatsAppIcon`
    helper component (white icon in a white circular badge on the FAB so
    it's visible against the WhatsApp-green background).
  - Prefill text carries two machine-parseable markers so the project
    owner can later search/automate on them: a fixed prefix
    `RKMH_EVTS_WSF_<epoch>` (unique per page load) and `[build <sha>]`
    (the commit the page was actually served from) — e.g.
    `[RKMH_EVTS_WSF_1789205983] [build 1de8434] Feedback: `.
  - New `scripts/generate-build-info.js` runs on every `predev`/`prebuild`
    (via new `package.json` scripts), writing `src/lib/build-info.json`
    (gitignored, regenerated every run) with the current commit sha/date.
    `/summary`'s footer renders a `Build <sha> · <date> · <context>` badge
    from it (`process.env.CONTEXT` gives Netlify's `production`/
    `deploy-preview`/`branch-deploy`, falls back to `"local"`) — lets
    anyone compare a live deploy's badge against `git log` to confirm
    which commit it's actually running.
  - A manual `CONTENT_REVIEWED_COMMIT` constant in the same file, bumped
    by hand only when the page's descriptive copy is actually edited — the
    gap between it and the auto build badge is the visible signal that
    `/summary`'s prose may be stale relative to the deployed code. Root
    `CLAUDE.md`'s docs-currency rule was extended to explicitly name this
    page alongside `docs/`.
  - Logged **[[BACKLOG.md]] item 29**: Telegram as a second feedback
    channel later (free bot automation), explicitly "extremely deferred."
  - `npm run build` clean; verified live via the chrome-devtools sidecar
    (button/icon/prefill text/badge all confirmed rendering correctly) —
    an earlier "icon not showing" report turned out to be a stale
    webpack HMR artifact from live-editing during the dev session, not a
    real bug; a dev-server restart cleared it. Not deployed — draft/prod
    deploys remain owner-triggered only.

- **2026-09-12 (RLS policies written, [[BACKLOG.md]] item 1, on `main` —
  kept separate from the not-yet-reviewed `admin-dashboard-mobile-redesign`
  branch).** `supabase/migrations/0015_rls_policies.sql`: enables RLS on
  `events`/`registrations`, revokes all direct table grants from `anon`
  (its only remaining door in is `register_attendee`, a `SECURITY DEFINER`
  function that bypasses RLS), adds an `authenticated full access` policy
  on both tables for the logged-in-admin case, and revokes the default
  `PUBLIC` execute grant — never actually revoked by any prior migration's
  `grant ... to service_role` — from every other admin-only RPC
  (`claim_and_verify_registration`, `reject_registration`,
  `reinstate_registration`, `event_capacity_snapshot`,
  `reset_event_registrations`). Defense-in-depth, not a live fix: nothing in
  the app calls Supabase directly with the anon key except the
  `/admin/login` auth handshake. **Applied to the live Supabase project via
  the SQL editor, 2026-09-12.**

  **Broke live registration for a few minutes, same day — caught and fixed
  immediately.** 0015's blanket revoke of `register_attendee`'s default
  `PUBLIC` execute grant removed access that had never been separately
  granted to `service_role` (unlike every other admin RPC, which already
  had its own explicit grant) — real registrations started failing with
  `permission denied for function register_attendee`. Fixed by
  `supabase/migrations/0016_fix_register_attendee_service_role_grant.sql`,
  applied live right after. All three post-apply checks then confirmed:
  public registration (driven live in a browser, reached real PhonePe
  sandbox checkout), admin dashboard (Verify action driven live, correctly
  claimed a seat and transitioned a test row to `verified`), and direct
  anon-key table/RPC access (curl — `SELECT`/`UPDATE`/`reject_registration`
  all rejected with `permission denied`, `register_attendee` still
  succeeds). See [[BACKLOG.md]] item 1 for the full writeup.

- **2026-09-10 (disabled the Hero/Speaker "photo URL" fields in the admin
  content editor).** Follow-up from the manual-test round below: the
  fields' old label implied a volunteer could self-serve a new photo,
  which wasn't actually true either way (see [[BACKLOG.md]] item 24 for
  the full reasoning, and [[content-editability-design.md]]'s "Photo
  hosting decision" for the original context). Project owner decided
  against building the real fix (Supabase Storage upload) right now —
  that bucket would live under their own account/billing with no abuse
  guardrails yet — so both fields are disabled/read-only in
  `AdminContentEditor.tsx` until it is built.

- **2026-09-10 (fixed 5 bugs from the first manual-test round, see
  `delme-clipboard/manualtestFeedback/testing_notes.md`).**
  1. `getStatusTitle`/`getStatusMessage` (statusMessages.ts) no longer say
     "Seat reserved" at pending time — now "Registration received —
     processing", since the seat claim doesn't happen until verification
     (see the seat-cap note above). Also fixed the rejected-status message
     repeating the contact email (the sent email's footer already has it).
  2. `validateFullName` (validation.ts) now rejects symbols (was only
     checking for digits) — a name like `wrong-name@/` was getting through.
     Enforced server-side in both `/api/register` and `/api/register/eoi`
     now too, not just the client form (those routes trusted client input
     entirely before).
  3. PhonePe sandbox failure/expiry now auto-rejects via
     `applyTerminalPhonePeFailure()` (phonepe.ts) — both the webhook and
     the `/api/phonepe/status` reconciliation route call it when the order
     state isn't COMPLETED or PENDING. Before this, a failed/expired
     PhonePe payment sat in `pending` for the full 1-hour manual-override
     window while still showing the registrant a success page and sending
     a confirmation email.
  4. "Seats full" EOI/waitlist copy reworded per feedback (EoiForm.tsx,
     confirmation page).
  5. Plain "WhatsApp" text links replaced with the actual WhatsApp glyph
     (new `src/components/WhatsAppIcon.tsx`, used in AdminTable, Footer,
     and the confirmation page).
  Deferred to [[BACKLOG.md]] per the tester's own notes: EOI→capacity
  re-invite flow, email/WhatsApp templating.

- **2026-09-10 (PhonePe auto-reject fix confirmed end-to-end against the
  real webhook, on the `demo` draft deploy).** The fix (item 3 above) had
  only ever been tested locally, and PhonePe's webhook is configured to
  call the Netlify URL, not `localhost` — so a local run only ever
  exercised the `/api/phonepe/status` reconciliation fallback, never the
  real server-to-server webhook. Redeployed `main` to the `demo` alias,
  switched `payment_mode` to `phonepe_sandbox`, submitted a real
  registration, and deliberately failed the PhonePe UAT checkout.
  Confirmed directly against Supabase: `status: rejected`, `rejected_by:
  null` (automated, not an admin click), `rejected_at` 18 seconds after
  `created_at`, `rejection_reason: "PhonePe payment failed"`,
  `registration_number`/`ticket_sent_at` both null — no seat claimed, no
  ticket issued. Registrant correctly got two emails: the submission
  acknowledgement (fires on every registration, unrelated feature) and
  then the rejection email once PhonePe reported failure — not a bug, both
  expected. This closes the "never fired against a real PhonePe" gap.
  **`payment_mode` was left at `phonepe_sandbox` after this test — not yet
  switched back to `manual`** — and a second leftover test row
  (`test.phonepe.failure`, still `pending`) needs clearing. Both need
  attention before the demo if manual mode is what's being shown.

- **2026-09-09 (implemented all of registration-integrity.md — duplicate
  detection, per-submission cap, seat_number rename, verification-time
  seat-cap claim, capacity buffer, Open/Full-EOI/Paused states).** Landed
  as 6 separate commits, one per implementation-order step, per the doc's
  own instruction:
  1. **Duplicate detection + per-submission cap + SLA copy** —
     `registerAttendee()` now checks pending/verified rows for a matching
     normalized email or phone before claiming, returning 409 with the
     existing registration ID instead of silently allowing a second claim;
     the admin walk-in form gets an explicit "register anyway" override.
     `register_attendee` now rejects `num_attendees > 4` (was unbounded),
     matching a new 1-4 dropdown on the public form. Manual-mode pending
     emails/confirmation page now mention the ~5 day verification SLA.
  2. **`seat_number` → `registration_number` rename** — removed entirely
     from the ticket email and confirmation page (replaced by the
     registrant's own phone number as a reference); kept internal-only in
     the admin table ("Reg. No.") and CSV export.
  3. **Seat-cap claim moved from submission time to verification time**
     (the architectural change) — `register_attendee` now just inserts a
     `pending` row; a new `claim_and_verify_registration` RPC (row-locked
     via `for update`) does the atomic claim, called only from
     `markVerifiedAndIssueTicket`. Closes the "claim a slot, never pay"
     hole. Found and fixed a real correctness bug this surfaced in
     `api/phonepe/status` (would have reported "verified" instead of
     "waitlisted" on the rare paid-but-capacity-filled race). Updated
     `scripts/load-test-register.ts` to exercise the claim at its new
     location.
  4. **Capacity buffer + shared snapshot** — repurposed the previously
     unused `waitlist_alert_threshold` column as an admin-editable buffer
     (default 10); one shared `event_capacity_snapshot()` function/
     `src/lib/registration/capacity.ts` module for the auto-pause and
     full-EOI formulas, used by both the public page and admin panel.
  5. **Open/Full-EOI/Paused public states** — `src/app/page.tsx` now picks
     one of three states per request: Paused (manual toggle OR
     auto-pause near the backlog buffer) shows only an admin-set message,
     no form; Full shows a new no-payment `EoiForm.tsx` (→ `POST
     api/register/eoi` → `registerInterest()`, always `waitlisted`); Open
     is today's form. New `AdminCapacitySettings.tsx` panel on the admin
     dashboard exposes seat cap/buffer/pause toggle/pause message plus the
     live numbers. Admin table now flags a `waitlisted` row that has
     payment fields set (the rare Item-3 race) distinctly from a normal
     EOI signup.
  - All five migrations (`0007`-`0011`) are written but **not yet applied
    to the live Supabase project** — see "Next action" above.
  - `npm run build` and `npm run lint` clean after every commit. Full
    manual pass (each public state, a real ticket email/confirmation-page
    check) still pending until the migrations are applied — no live
    Supabase/CLI access from this session.
  - See [[registration-integrity.md]] for the full design and all five
    "Open" caveat resolutions, and [[architecture.md]] for the as-built
    description.

- **2026-09-09 (dropped "PhonePe" branding from registrant-facing copy).**
  Project owner's concern: naming PhonePe explicitly ("pay securely via
  PhonePe below" / "Pay ₹500 via PhonePe") could make registrants think
  they specifically need the PhonePe app installed — when PhonePe's hosted
  checkout actually accepts any UPI app, card, or netbanking. Reworded in
  `src/components/RegistrationForm.tsx` (the only two registrant-facing
  strings that named it) to "pay securely online below (any UPI app, card,
  or netbanking)" / "Pay ₹500 online" — generic, payment-method-neutral
  copy. Internal naming (`api/phonepe/*` routes, `payment_mode` value
  `phonepe_sandbox`, the admin dashboard's "PhonePe sandbox (auto-verify)"
  label) is unaffected — only the two public strings a registrant actually
  sees changed. Build clean, verified live.
- **2026-09-09 (fixed the PhonePe/manual UI overlap bug ahead of a
  dual-payment-method demo).** Project owner is demoing **both** payment
  methods live (manual + PhonePe sandbox) — surfaced that
  [[BACKLOG.md]] item 6's known UX gap (the generic Math UPI QR/deep-link
  block still rendered even in `phonepe_sandbox` mode, alongside the
  actual "Pay via PhonePe" button) would be directly visible and confusing
  in exactly that demo. Cheap fix, done same day: gated
  `<UpiPaymentInfo>` behind `!isPhonePe` in
  `src/components/RegistrationForm.tsx`, and behind
  `paymentMode !== "phonepe_sandbox"` in
  `src/app/confirmation/[id]/page.tsx` (same overlap existed there too, on
  the pending-confirmation screen, not previously noticed). Build clean;
  verified live via the chrome-devtools sidecar in both modes — PhonePe
  mode now shows only the PhonePe button/copy, manual mode still shows the
  full UPI QR/reference-field flow unchanged. Dev server restarted after
  build (same stale-cache gotcha as before — never `npm run build` while
  `next dev` is running against the same `.next`).
- **2026-09-09 (demo-data cleanup + a real cross-event data-leak bug found
  and fixed).** Project owner wanted the live `registrations` table wiped
  of all dev/test clutter before the demo and reseeded with a small, clean
  set so the dashboard doesn't look like an empty prototype.
  - Added `reset_event_registrations(p_event_slug text)` in
    `supabase/migrations/0006_dev_reset_registrations.sql` — a
    `SECURITY DEFINER` RPC (same pattern as `register_attendee`/
    `reject_registration`) that atomically deletes all registrations for
    one event and zeroes its `seats_taken`, granted to `service_role` only.
    This is the "one-touch wipe" the project owner asked to have saved in
    the DB rather than re-derived each time — callable anytime via
    `supabase.rpc('reset_event_registrations', { p_event_slug })` with the
    service-role key, or `select reset_event_registrations('slug');` in the
    SQL editor. Not called from any app code.
  - Used it to wipe all 13 rows from the real event (including one,
    `Ruchi Jain`, the project owner initially wanted kept — then decided a
    full wipe + clean reseed was less confusing than a partial one).
  - **Bug found while verifying the wipe actually took**: the admin
    dashboard still showed 5 unrelated `Load Test *` rows after the wipe.
    Root cause — `GET /api/admin/registrations` and `GET /api/admin/export`
    never filtered by event at all; they returned every row in
    `registrations` regardless of `event_id`, only using `EVENT_SLUG` to
    fetch the event's title/date for display. Those 5 rows were leftovers
    from the `test-event` row used for the concurrency load test earlier
    this session. Fixed both routes to look up the event by `EVENT_SLUG`
    first and filter `registrations` on `event_id` — see
    `src/app/api/admin/registrations/route.ts` and
    `src/app/api/admin/export/route.ts`. This was a real latent bug
    independent of today's cleanup (multi-tenancy is minimal per the root
    `CLAUDE.md`, but any second `events` row — even a throwaway test one —
    was already leaking into the one production admin dashboard). `npm run
    build` clean; cleared the stray `test-event` rows with the same reset
    function and confirmed via a live dashboard reload (chrome-devtools
    sidecar) that only the intended rows show.
  - Reseeded via the real `POST /api/register` flow (not raw SQL) using the
    documented test-customer identities from [[dev-accounts.md]] —
    `ruchisai197518@gmail.com` / `sairam_197518@yahoo.in` — not the infra
    email: **Ruchi Jain** (seat 1, 1 attendee) and **Sai Ram** (seats 2-3, 2
    attendees) verified through the real admin dashboard "Verify" button
    (tickets sent, confirmed live), **Lakshmi Iyer** (seat 4, 1 attendee,
    also under `ruchisai197518@gmail.com`) left `pending` so the dashboard
    shows a realistic in-progress queue rather than everything already
    ticketed. `events.seats_taken` is now 4 for the real event.
  - Dev server was mid-toggled to `payment_mode = phonepe_sandbox` from
    earlier PhonePe testing when this was done — verification still went
    through the same `markVerifiedAndIssueTicket` seam either way, so it
    doesn't affect ticket correctness, but worth remembering to check
    `payment_mode` before a live demo walkthrough of the admin flow.
- **2026-09-09 (seat-cap concurrency load test — confirmed race-safe).**
  Ran [[setup.md]]'s test: inserted a `test-event` row (cap 5) via the
  Supabase SQL editor (service-role key lacks direct INSERT/DELETE grants on
  `events`/`registrations` for ad-hoc script writes — same category of gap
  as [[BACKLOG.md]] item on `service_role` grants, worth remembering if a
  future script needs table writes outside the RPC path), pointed
  `EVENT_SLUG` at it, restarted the dev server, and fired 20 concurrent
  `POST /api/register` calls via `scripts/load-test-register.ts`. Verified
  directly against Supabase (not just the app's JSON response): exactly 5
  `pending` with unique seat numbers 1–5, 15 `waitlisted` all with
  `seat_number: null`, and `events.seats_taken` exactly 5 — no oversell.
  Confirms `register_attendee`'s atomic `UPDATE ... WHERE ... RETURNING`
  guard holds under real concurrency, not just in theory. `EVENT_SLUG`
  switched back to `halasuru-sarvapriyananda-2026` and the dev server
  restarted; the `test-event` row itself was left in place (harmless,
  invisible to the app while `EVENT_SLUG` points elsewhere) so it can be
  reused for a future load test without repeating the SQL insert.
- **2026-09-09 (PhonePe V2 confirmed working live, end to end).** Following
  the V1 → V2 rewrite (see the entry below), the project owner signed up
  for a PhonePe sandbox account at business.phonepe.com — confirmed only
  email/phone verification is needed for Test Mode, no GST/PAN/business
  documents (those gate go-live, not sandbox access). Client ID/Secret and
  a SHA-auth webhook (username/password) were created and wired into both
  `0_SECRETS/env.local` and Netlify's env vars (`netlify env:set`, all
  contexts). Then ran three real test registrations, paid via GPay against
  PhonePe's UAT sandbox (a test card also works with no app needed:
  `4242 4242 4242 4242`, OTP `123456`):
  - Confirmed the **browser status-check fallback** path works (`GET
    api/phonepe/status`).
  - Confirmed the **real server-to-server webhook** path works
    independently — checked the database directly without ever loading
    the confirmation page after paying, and saw PhonePe's own server call
    the Netlify webhook, verify the SHA signature, and update the shared
    Supabase database (local dev server and Netlify both read/write the
    same Supabase project — that's what makes this work across the two
    different servers).
  - **Two real bugs found and fixed along the way:**
    1. PhonePe's webhook-creation form validates the URL with what looks
       like a plain `GET` before saving it; our webhook route only
       exported `POST`, so it 405'd and PhonePe's dashboard showed a
       generic `404 Not Found`. Fixed with a no-op `GET` handler on
       `src/app/api/phonepe/webhook/route.ts` — the real POST +
       signature-checked callback logic is unchanged.
    2. The webhook correctly marked a test registration `verified` but
       `ticket_sent_at` stayed `null` — Netlify's `TICKET_FROM_EMAIL` had
       never been updated after the Resend domain verification (still
       `onboarding@resend.dev` from the original `netlify env:import` on
       2026-09-08), so `sendTicketEmail` hit the same sandbox-sender `403
       validation_error` from [[BACKLOG.md]] item 7, just on Netlify
       instead of local. Fixed with `netlify env:set TICKET_FROM_EMAIL
       tickets@rkmhalasuru.simplicie.com` + redeploy; re-tested and
       confirmed the ticket email now sends. **General lesson**: local
       (`0_SECRETS/env.local`) and Netlify env vars are separate stores
       that don't auto-sync — any future local credential change needs a
       matching `netlify env:set` or it drifts silently like this one did.
  - Also used this session's draft deploy to fix a **stale build-cache
    crash** on the local dev server (`Cannot find module './331.js'`) —
    caused by running `npm run build` while `next dev` was also running
    against the same `.next` directory; fixed with `scripts/server.sh
    restart`. Not a code bug, just a "don't build and dev concurrently"
    gotcha worth remembering.
  - See [[BACKLOG.md]] item 6 for the full writeup. **This closes item 6**
    for sandbox purposes — production PhonePe (a real merchant account)
    remains separately out of scope.
- **2026-09-09 (PhonePe rewritten V1 → V2 — the "bigger task" from a
  previous session, correcting a gap where it had been documented as a
  known bug but never actually fixed).** `src/lib/payment/phonepe.ts`
  previously targeted PhonePe's deprecated V1 PG API; rewrote it to V2
  "Standard Checkout": OAuth (`client_id`/`client_secret` → `O-Bearer`
  token via `POST .../v1/oauth/token`, cached in-memory until near
  expiry) instead of salt-key checksums, `checkout/v2/pay` /
  `checkout/v2/order/{id}/status` endpoints, and SHA(username:password)
  webhook auth in the `Authorization` header instead of an `X-VERIFY` body
  checksum. `initiatePhonePePayment` dropped its `callbackUrl` param — V2's
  webhook URL is configured statically in the PhonePe dashboard, not
  passed per-request — so `src/app/api/phonepe/initiate/route.ts` and
  `src/app/api/phonepe/webhook/route.ts` were updated to match. Endpoints
  and request/response shapes verified directly against
  developer.phonepe.com (curl, not memory) before writing any code, since
  the V1 implementation had gone stale unnoticed the same way. `.env.local.example`
  updated with the new var names (`PHONEPE_ENV`, `PHONEPE_SANDBOX_*`,
  `PHONEPE_PRODUCTION_*`, `PHONEPE_WEBHOOK_USERNAME/PASSWORD`); dev-mode
  still forces the sandbox environment regardless of `PHONEPE_ENV`, same
  safety property as before. Build/lint clean.
  **New blocker found doing this** (not present in V1): PhonePe V2 has no
  publicly shared sandbox credential — a lightweight sandbox-only signup at
  business.phonepe.com is now required before this can be tested live, see
  item 0 above and [[BACKLOG.md]] item 6.
- **2026-09-09 (Resend domain verification + Netlify custom domain — both
  DONE, confirmed and tested).** Resend shows "Domain verified: Your domain
  is ready to send emails." for `rkmhalasuru.simplicie.com`.
  `TICKET_FROM_EMAIL` updated in `0_SECRETS/env.local` from
  `onboarding@resend.dev` to `tickets@rkmhalasuru.simplicie.com`, dev server
  restarted, and confirmed live end-to-end: registered + verified a test
  entry (`bhikajicama09@gmail.com`, seat 6, "Resend Verify Test") through
  the admin dashboard, ticket email delivered with no `403 validation_error`
  — the sandbox-sender restriction ([[BACKLOG.md]] item 7) is resolved. That
  test registration was left in place (verified, harmless) — see the
  "smaller open item" below about clearing test registrations before real
  ones start coming in. Background: the project owner has direct Cloudflare
  DNS access via their brother's account for `simplicie.com`, and verified
  `rkmhalasuru.simplicie.com` directly (subdomain, not `amit.simplicie.com`
  as originally guessed — see [[technical-concepts.md]] for the DNS/Resend
  background Q&A this built up). Domain added in Resend (region
  ap-northeast-1); all 4 DNS records added in Cloudflare (DKIM TXT, SPF MX,
  SPF TXT, DMARC TXT), all "DNS only", confirmed via screenshot; existing
  records on the same zone left untouched.
  **Netlify custom domain also DONE and confirmed working end-to-end**:
  `rkmhalasuru.simplicie.com` is the Netlify project's Primary domain,
  HTTPS enabled with a valid Let's Encrypt certificate (issued 2026-09-09,
  auto-renews before Dec 8), Cloudflare CNAME →
  `rkm-halasuru-registration.netlify.app`, "DNS only". Along the way: added
  a one-time Netlify domain-ownership-verification TXT record (root was
  already registered to a Netlify project elsewhere) and deleted a leftover
  unused `amit.simplicie.com` CNAME. The live page load at
  `https://rkmhalasuru.simplicie.com` has since been confirmed rendering
  correctly. See [[BACKLOG.md]] item 16 for a deferred, purely-cosmetic
  follow-up (renaming the Netlify project itself) — confirmed not to affect
  any of the above.
- **2026-09-09 (compile-time dev/live mode toggle + preview banner)** — new
  `NEXT_PUBLIC_APP_MODE` (`development`/`live`, defaults to `development`),
  resolved once in `src/lib/appMode.ts`. Deploy-time/compile-time, not a
  runtime feature flag — distinct from `events.payment_mode` (unchanged).
  Wired into two things:
  - `CONTACT_EMAIL` (`src/lib/contact.ts`) now picks `DEV_CONTACT_EMAIL` vs
    `LIVE_CONTACT_EMAIL` — both still `amjain.gzb@gmail.com` for now, but
    going live for real is now a one-constant edit instead of touching the
    export directly. See [[dev-accounts.md]].
  - `src/lib/payment/phonepe.ts` credential getters always resolve to the
    hardcoded sandbox defaults in development mode regardless of
    `PHONEPE_*` env vars (can't leak real creds into a dev run); in live
    mode they still fall back to sandbox if real creds are unset — by
    design, so a live deploy can demo PhonePe before a real merchant
    account exists. New `isUsingSandboxCredentials()` export exposes that
    state.
  - New `⚠ Development / Preview` banner
    (`src/components/EnvironmentBanner.tsx`, gated by
    `src/lib/environmentBanner.ts`, rendered site-wide from the root
    layout) is the visibility safety net for the case above: shown in dev
    mode always, and in live mode whenever `payment_mode = phonepe_sandbox`
    while PhonePe is still on sandbox credentials; hidden for
    `payment_mode = manual` or once real PhonePe credentials are set.
  - `.env.local.example` and `0_SECRETS/env.local` updated with the new
    var. Netlify per-context setup (`netlify env:set ... --context
    production`) documented in [[netlify.md]] but **not yet run** —
    needs the project owner's go-ahead first.
  - Build/lint clean. Verified live via the chrome-devtools sidecar: banner
    renders on home, admin login, and admin dashboard in default
    (development) mode; toggling `payment_mode` between `manual` and
    `phonepe_sandbox` while temporarily running a second local server with
    `NEXT_PUBLIC_APP_MODE=live` confirmed the banner correctly shows/hides
    per the condition above.
  - While testing, re-confirmed the pre-existing PhonePe V1 "Key not found
    for the merchant" issue (see [[BACKLOG.md]] item 6) — unrelated to this
    change, credential values confirmed byte-identical before/after.
  - See [[architecture.md]] "Environment mode" for the full design.

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
