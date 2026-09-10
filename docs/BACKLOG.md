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
> - ~~**Resend domain not verified**~~ — **done (2026-09-09).** Domain
>   `rkmhalasuru.simplicie.com` verified in Resend; `TICKET_FROM_EMAIL`
>   updated and confirmed delivering to non-owner inboxes with no
>   `403 validation_error`. See [[nextSteps.md]] item 3.
> - **No rate limiting on `/api/register`** (item 11) — a scripted flood
>   could exhaust the 500-seat cap with junk entries.
> - ~~**Duplicate submissions unblocked**~~ — **done (2026-09-09)**, see
>   item 2 below. Migrations `0007`-`0011` applied and confirmed live; a
>   manual UI pass is still open, see [[nextSteps.md]] "Next action".
> - **npm audit: 1 moderate + 1 high advisory** (item 14), fix requires a
>   breaking Next 16 upgrade.
> - **Contact info is a personal placeholder Gmail/phone**
>   (`amjain.gzb@gmail.com` / `9731007760`), not a real org contact — fine
>   for demo/dev, swap before real attendees rely on it for payment
>   disputes. As of 2026-09-10 this is DB-backed
>   (`events.contact_email`/`contact_phone`/`contact_whatsapp_number`),
>   editable live via `/admin/content` → Contact, no code change or
>   redeploy needed — see [[dev-accounts.md]] and
>   [[content-editability-design.md]].

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
2. **Duplicate submissions — done (2026-09-09).** Implemented per
   [[registration-integrity.md]] (duplicate detection against pending/
   verified rows, per-submission cap of 4, and the seat-cap-claim-timing
   redesign that came out of the same discussion). Migrations `0007`-`0011`
   applied to the live Supabase project and confirmed directly against it
   — a manual UI pass is still open, see [[nextSteps.md]] "Next action".
3. **Idempotency of admin verify — strengthened (2026-09-09).**
   `markVerifiedAndIssueTicket` now delegates to `claim_and_verify_registration`,
   which row-locks the registration (`for update`) before checking
   `status = 'pending'` — a real fix, not just a guard, for a double-click
   racing a PhonePe webhook/status-poll on the same row. Still not
   load-tested under true concurrency on the *admin verify* path itself
   (the load test in [[setup.md]] exercises the same RPC, but via a direct
   service-role call, not through the authenticated admin route).
4. **Rejection + seat release flow** — built 2026-09-08 as part of item 5a
   below (`POST /api/admin/reject`, atomic seat release via
   `reject_registration()`). Scoped to `pending` rows only.
5. **Waitlist re-invite tooling** — no CSV export or bulk-notify mechanism;
   organizers currently would need to query Supabase directly to re-engage
   the waitlist if a bigger venue is arranged. Note (2026-09-09): waitlisted
   rows now come from two distinct sources — Full-EOI signups (no payment
   fields) and the rare Item-3 verification-time race (has payment fields,
   flagged in the admin table) — see [[registration-integrity.md]]; any
   re-invite tooling should account for both.
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
6. **PhonePe sandbox integration — rewritten to V2 and confirmed working
   live end-to-end (2026-09-09).** Originally built
   2026-09-08 against PhonePe's **V1** PG API (salt-key/checksum auth,
   `PGTESTPAYUAT` public test credentials). Live end-to-end test on
   2026-09-09 hit `POST /api/phonepe/initiate` returning `"Key not found
   for the merchant"` directly from PhonePe. Root cause, confirmed via web
   search: **PhonePe has deprecated the entire V1 flow** — V1 salt-key
   credentials no longer work against any current PhonePe backend, sandbox
   included, regardless of which key/index values are used.
   - **Rewrite done, same day (2026-09-09)**: `src/lib/payment/phonepe.ts`
     now targets PhonePe's **V2 "Standard Checkout"** API — OAuth
     (`client_id`/`client_secret` → `O-Bearer` token via
     `POST .../v1/oauth/token`) instead of salt-key checksums,
     `checkout/v2/pay` / `checkout/v2/order/{id}/status` endpoints instead
     of `/pg/v1/pay` / `/pg/v1/status`, and SHA(username:password) webhook
     auth in the `Authorization` header instead of an `X-VERIFY` body
     checksum. `initiatePhonePePayment` no longer takes a `callbackUrl`
     param — V2's webhook URL is configured statically in the PhonePe
     Business Dashboard, not passed per-request. Endpoints and
     request/response shapes were verified directly against
     developer.phonepe.com on 2026-09-09 (not written from memory — see
     [[architecture.md]] "Payment Module Boundary" for the exact doc
     pages), specifically to avoid repeating how the V1 implementation went
     stale unnoticed. `npm run build` clean.
   - **New blocker found during the rewrite, distinct from the
     V1-deprecation issue, and since resolved**: unlike V1, PhonePe **V2
     has no publicly shared sandbox credential**. Every integrator — even
     in Test Mode — must sign up at `business.phonepe.com/pg/register`,
     enable the Test Mode toggle, and pull their own Client ID/Secret from
     Developer Settings. **The project owner did this signup on
     2026-09-09** — confirmed it needs only email/phone verification, no
     GST/PAN/business documents (those are only enforced later, at
     go-live). Client ID/Secret and a SHA-auth webhook (username/password)
     were created and are now in `0_SECRETS/env.local`
     (`PHONEPE_SANDBOX_CLIENT_ID/SECRET`,
     `PHONEPE_WEBHOOK_USERNAME/PASSWORD`) and on Netlify (`netlify env:set`,
     all contexts).
   - **Both confirmation paths tested live end-to-end, 2026-09-09** — three
     real test registrations, paid via GPay against PhonePe's UAT sandbox
     (test card `4242 4242 4242 4242` also works, no app needed; OTP
     `123456`):
     - **Browser status-check path**: confirmed working (`GET
       api/phonepe/status` correctly read a real order and marked a
       registration verified + sent the ticket email). Also caught a real,
       separate bug in the process: a `netlify deploy --build --alias demo`
       draft's webhook URL 404'd during PhonePe's own webhook-creation
       validation, because our route only exported `POST` — fixed with a
       no-op `GET` handler on `api/phonepe/webhook/route.ts` (dashboard
       validators commonly probe with GET; the real S2S callback logic is
       unchanged, still POST + signature-checked).
     - **Real S2S webhook path**: confirmed working independently (checked
       the database directly, without ever loading the confirmation page,
       after paying) — PhonePe's own server called the Netlify webhook,
       which verified the SHA signature and updated the shared Supabase
       database.
     - **Found and fixed along the way**: the webhook test's first run
       showed `status: verified` but `ticket_sent_at: null` — root cause
       was that Netlify's `TICKET_FROM_EMAIL` env var was never updated
       after the Resend domain verification (still the old
       `onboarding@resend.dev`, imported once back on 2026-09-08), so
       `sendTicketEmail` hit the same `403 validation_error` sandbox-sender
       restriction described in item 7, just on Netlify instead of local.
       Fixed with `netlify env:set TICKET_FROM_EMAIL
       tickets@rkmhalasuru.simplicie.com` + redeploy; re-tested and
       confirmed `ticket_sent_at` now populates correctly. **Worth
       remembering**: local (`0_SECRETS/env.local`) and Netlify env vars
       are two separate stores that don't auto-sync — any future local env
       change (new credential, rotated key) needs a matching `netlify
       env:set` or it'll silently drift like this one did.
   - Production PhonePe (real merchant account, `PHONEPE_PRODUCTION_*`
     vars) is still unset and out of scope — see below.
   - Two other real bugs found and fixed getting this far: (a)
     `service_role` had no `UPDATE` grant on `events`
     (`supabase/migrations/0005_grant_events_update.sql`, since the
     payment-mode toggle is the first code path to write to `events`
     directly rather than through a `SECURITY DEFINER` function) — see
     [[nextSteps.md]]; (b) none, that was the only toggle-blocking bug —
     the V1/V2 issue is separate, hit only once actually submitting a
     `phonepe_sandbox`-mode registration.
   - **Separate, real UX bug found in the same testing pass — fixed
     2026-09-09.** In `phonepe_sandbox` mode, `RegistrationForm.tsx` showed
     the copy "pay securely via PhonePe below" directly above the same
     generic, always-shown Math UPI QR/deep-link block
     (`UpiPaymentInfo.tsx`, works with any UPI app) — that QR had nothing
     to do with the actual PhonePe flow, which happens via a separate "Pay
     via PhonePe" button that redirects off-site. Misleading regardless of
     the V1/V2 break. Surfaced again ahead of a dual-payment-method demo
     (manual + PhonePe sandbox live side by side), so fixed same day:
     `<UpiPaymentInfo>` is now gated behind `!isPhonePe` in
     `RegistrationForm.tsx` and behind `paymentMode !== "phonepe_sandbox"`
     in `src/app/confirmation/[id]/page.tsx` (same overlap existed there
     too, on the pending-confirmation screen). The registrant-facing copy
     was also reworded away from naming PhonePe specifically ("pay
     securely online below (any UPI app, card, or netbanking)" / "Pay ₹500
     online") since PhonePe's hosted checkout accepts more than the
     PhonePe app. See [[nextSteps.md]] "Recently completed" for the full
     breakdown.
   - Manual verification (production path) is completely unaffected by any
     of this — only `phonepe_sandbox` mode is broken.
   - **Research absorbed, decision recorded (2026-09-09):** the project
     owner's own PhonePe research
     (`delme-clipboard/phonepe_integration_thoughts.md`) — merchant
     onboarding/pricing facts and the hosted-checkout UPI-only limitation —
     is now folded into [[architecture.md]] "Payment Module Boundary"
     (onboarding/pricing + UI-limitation subsections), so that clipboard
     file can be deleted. Also recorded there: the confirmed design for
     sandbox-vs-live once V2 is built — admin dashboard keeps exactly 2
     visible options (`manual`/`phonepe`, no 3rd dropdown entry), with
     sandbox-vs-live decided by a separate env-var config rather than a
     user-facing toggle, since V2's auth/shapes are identical across
     environments (only base URL + client credentials differ) — **now
     implemented as `NEXT_PUBLIC_APP_MODE`** (2026-09-09, see
     [[architecture.md]] "Environment mode"), superseding the originally
     proposed `PHONEPE_ENV=sandbox|live` name. See [[architecture.md]]
     "Future: sandbox vs. live config shape" for the full note. This
     BACKLOG item plus that architecture.md section are now the source of
     truth for PhonePe status; nothing further needs to be pulled from the
     clipboard file.
   - **2026-09-09, while testing the new `NEXT_PUBLIC_APP_MODE` toggle**
     (unrelated feature, landed same day, before the V2 rewrite):
     `/api/phonepe/initiate` still returned the same `"Key not found for
     the merchant"` error described above. Credential resolution was
     confirmed byte-identical before/after the `NEXT_PUBLIC_APP_MODE`
     change, so that was the pre-existing V1-deprecation issue, not a new
     regression — since superseded by the V2 rewrite above.
   **Production PhonePe integration remains out of scope** regardless —
   merchant account not set up, and even a fixed V2 sandbox must never be
   treated as a real payment guarantee.
7. **Email deliverability** — no bounce handling or retry on send failure;
   a failed `sendTicketEmail`/`sendStatusEmail` call throws inside the
   calling route without a retry path (as of 2026-09-08 both now check the
   Resend SDK's `{data, error}` response and throw on `error` — previously
   the `error` field was silently ignored, so a rejected send looked like
   success). **Live blocker found 2026-09-08, resolved 2026-09-09**:
   `TICKET_FROM_EMAIL` was `onboarding@resend.dev`, Resend's shared
   unverified-domain sender, which restricted delivery to only the email
   address that owns the API key (confirmed live: sending to a second test
   address returned `403 validation_error`, "You can only send testing
   emails to your own email address"). `rkmhalasuru.simplicie.com` is now
   verified in Resend and `TICKET_FROM_EMAIL` points at
   `tickets@rkmhalasuru.simplicie.com` — confirmed live delivering to a
   non-owner inbox with no error. Retry/bounce handling itself is still not
   built, that part of this item remains open.
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
   > [!note] Direction change under consideration (2026-09-09, thought only,
   > nothing built) — project owner is leaning away from a native Android
   > scanning app (complex, one-or-two-developer bandwidth) toward instead
   > adding a **volunteer-password-gated attendance page to this same
   > Next.js site**: takes a seat number and marks that registration
   > present, writing directly to the same Supabase DB (so it's
   > automatically synced everywhere, no separate datastore to reconcile).
   > If opened on a phone browser, camera-based QR scanning may work too
   > (would need a scanning lib + the not-yet-built `api/ticket/verify`
   > online-verify endpoint referenced above). Collision handling (two
   > volunteers marking the same seat, offline/flaky-connection behavior at
   > the door) is acknowledged as unresolved and would need designing before
   > building. This would likely replace, not complement, the
   > previously-discussed separate "sevaConnect" Android companion app.
   > Revisit after the prototype demo, same as the rest of this item — no
   > decision made yet, just recorded so the idea isn't lost.
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

15. **Client-side form validation — done for RegistrationForm/EoiForm
    (2026-09-10).** `src/lib/registration/validation.ts` added
    `validateFullName` (rejects digits) and `validatePhone` (strips a `+91`
    prefix, or a bare `91` prefix only when it's part of a 12-digit
    country-code+number string, then requires exactly 10 digits). Wired
    into `RegistrationForm.tsx` and `EoiForm.tsx`; server-side
    `register_attendee` remains the real gate either way. **Not done**:
    the admin walk-in form (`AdminManualRegisterForm.tsx`) — skipped for
    time ahead of the 2026-09-10 demo, internal-only so lower risk. A real
    bug was caught and fixed while testing this: the phone normalizer
    originally stripped a bare `91` prefix unconditionally, which
    corrupted genuinely valid 10-digit numbers starting with `91` (e.g.
    `9123456789`, common for Indian mobiles) down to 8 digits and
    incorrectly rejected them. See item 19 below for the follow-on UX gap
    this surfaced.
19. **Phone input UX gap — raised 2026-09-10, needs design thought before
    building.** The phone field on `RegistrationForm.tsx`/`EoiForm.tsx` is
    a blank text box with no placeholder, no format hint, and no visible
    country-code affordance — a user has to guess what to type, and item
    15's `normalizePhone()` accepts several different shapes (`91XXXXXXXXXX`
    only at exactly 12 digits, `+91XXXXXXXXXX`, or a plain 10-digit number)
    silently, with no feedback about what was understood. Project owner's
    direction: default a **separate, adjacent country-code field** to
    `+91` (user can change it if they ever need to, though the rest of the
    system is India-only per scope), and once the phone field loses focus,
    **rewrite the box's own value to the cleaned/normalized number** so
    the user sees exactly what was captured, not just what they typed.
    Two things need resolving before implementing, per the project owner:
    (a) confirm what shape `register_attendee`/the `registrations.phone`
    column actually expects/stores today (bare 10 digits? with country
    code? — normalize client and server to agree), and (b) work out the
    on-blur reformat behavior in detail (what happens on invalid input,
    whether the raw vs. cleaned value should both be visible, etc.).
    Deliberately not designed further yet — explicitly flagged by the
    project owner as "requires thinking later," not to be picked up
    same-day.
17. **Hierarchical admin roles** — raised 2026-09-10 while discussing
    [[content-editability-design.md]] step 6 (the edit front door). Today
    there is exactly one admin role: any Supabase Auth user who can log in
    sees/does everything (`requireAdminSession()` in
    `src/lib/supabase/server.ts` only checks "is there a session," no role
    distinction). Project owner wants additional, lower-privilege roles in
    the future (e.g. a content-editor role that can touch FAQ/Agenda/
    Speaker/Hero/Venue/Contact but not registrant PII/payment verification/
    CSV export) — **confirmed additive, not a replacement**: today's admin
    role stays a permanent super-user seeing everything, new roles are
    narrower slices carved out alongside it, not instead of it. Deliberately
    **not designed yet** — deferred as its own separate discussion, not
    bundled into content-editability. For now, the new admin content tab
    (step 6 of that doc) reuses the single existing admin login with no new
    role.
18. **Rename Netlify project** `rkm-halasuru-registration` →
    `rkm-halasuru-events` (project owner preference, 2026-09-09) — purely
    cosmetic, doesn't matter functionally since the demo will run under the
    `rkmhalasuru.simplicie.com` custom domain anyway (see [[nextSteps.md]]
    item 3, Part 2). If ever done: rename in Netlify's site settings, then
    update the `rkmhalasuru` CNAME target in Cloudflare from
    `rkm-halasuru-registration.netlify.app` to
    `rkm-halasuru-events.netlify.app`, and find/replace the old URL across
    `docs/` (`nextSteps.md`, `netlify.md`). Confirmed isolated: does not
    touch or require changes to any of the Resend DNS records (DKIM/SPF/
    DMARC live under `send.rkmhalasuru`/`resend._domainkey`/`_dmarc`,
    unrelated to the Netlify project name) or the Netlify ownership-
    verification TXT record. Only re-check needed if a PhonePe sandbox
    webhook URL was ever registered against the old `.netlify.app` URL
    directly (see [[architecture.md]] Payment Module Boundary) — would need
    re-registering with the new URL.
20. **Registration ID shown to registrants — question raised 2026-09-10,
    not decided.** The confirmation page (`src/app/confirmation/[id]/page.tsx`)
    displays the raw `registrations.id` UUID as "Registration ID," and the
    registration form's duplicate-detection error
    (`src/components/RegistrationForm.tsx`) also surfaces it
    ("You already have a registration (ID ...)"). Project owner questioned
    this: doesn't sit well with the earlier decision (see
    [[registration-integrity.md]] and the 2026-09-09 `seat_number` →
    `registration_number` rename) to drop the small human-friendly
    registration/seat number from registrant-facing surfaces in favor of
    phone number as the reference — yet this raw internal UUID, which is
    arguably *more* opaque and less useful to a registrant than that
    number ever was, is still shown. Explicitly flagged as **not
    critical, only worth doing if it's not a major change** — deferred
    rather than fixed same-session because it touches messaging in at
    least two places (confirmation page + duplicate-check error), not a
    one-line edit. If picked up: likely replace both with a reference to
    the registrant's own phone/email (already searchable in the admin
    dashboard), consistent with how the ticket email already does this.
