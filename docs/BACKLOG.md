---
tags: [event-registration, backlog]
created: 2026-09-08
aliases: [TBD list]
---

# Backlog / TBD

Running list of things intentionally deferred past the Phase A prototype.
Update this whenever something is skipped for time — don't let it get lost.

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
4. **Rejection + seat release flow** — no `api/admin/reject` yet; a rejected
   payment currently leaves the seat counted against the cap forever.
5. **Waitlist re-invite tooling** — no CSV export or bulk-notify mechanism;
   organizers currently would need to query Supabase directly to re-engage
   the waitlist if a bigger venue is arranged.
5a. **Admin dashboard is pending-only today** (2026-09-08) — `/admin/dashboard`
    (`src/components/AdminTable.tsx`) lists only `status = 'pending'` rows with
    a single Verify action. Project owner expects, and this is not yet built:
    - Full registrations view across all statuses (pending/verified/waitlisted/
      rejected), not just pending — with filtering.
    - Resend ticket email button (re-run just the email step of
      `markVerifiedAndIssueTicket` for an already-verified row, for a lost
      email / bounce).
    - CSV/Excel export of **all** registrations (this is broader than item 5's
      waitlist-specific export — organizers want a full export for
      offline reporting/reconciliation, not just re-invite lists).
    - Send-by-WhatsApp — no design yet (could be a `wa.me` deep link
      pre-filled per registrant as a first cut, or a real API integration
      later; needs a decision before building).
    - Reject action ties into item 4 above (currently no UI even once
      `api/admin/reject` exists).
    Scope this properly (probably its own doc section or a design pass) before
    building — it's more than a one-off addition to the existing table.
6. **PhonePe production integration** — merchant account not set up yet.
   Only a *sandbox* demo module is planned (`src/lib/payment/phonepe.ts`),
   isolated from the real registration flow, to show stakeholders technical
   feasibility. See [[../problemStatement.txt]] and the payment module
   boundary in `src/lib/payment/types.ts`.
7. **Email deliverability** — no bounce handling or retry on send failure;
   a failed `sendTicketEmail` call currently throws inside the verify route
   without a retry path.
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
