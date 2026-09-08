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

**You**: create a Supabase project and a Resend account, then fill in
`.env.local`. Steps are in [[setup.md]]. Nothing else can be end-to-end
tested until this is done — the code is written but unverified against a
real database.

Alternatively, tell Claude to walk you through account creation live in a
session.

## Queue (after the above unblocks testing)

1. Run [[setup.md]]'s concurrency load test against a test event to confirm
   the atomic seat-cap RPC behaves correctly under concurrent requests.
2. Manually test the full flow: submit a registration → log into
   `/admin/dashboard` → verify it → confirm the ticket email with QR arrives.
3. Test the QR anti-forgery property (tamper a signature, confirm rejection)
   — see [[QR_PAYLOAD_SPEC.md]].
4. Once Phase A is confirmed working end-to-end, start Phase B per
   [[architecture.md]]:
   - RLS policies (`supabase/migrations/0002_rls.sql`, not yet written)
   - Rejection + seat-release flow (`api/admin/reject`)
   - Waitlist tooling (CSV export, re-invite process)
   - Real FAQ/parking/speaker content (replace placeholders in `supabase/seed.sql`)
   - Styling pass toward the Chennai Math reference site's polish
   - PhonePe sandbox demo (isolated, not linked into the real flow)

Full rationale and the complete deferred-items list: [[BACKLOG.md]].

## Recently completed

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
