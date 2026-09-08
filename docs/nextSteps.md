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
`.env.local`. Steps are in [[setup.md]]. Nothing dynamic (registration,
payment verification, ticket email) can be end-to-end tested until this is
done — the code is written but unverified against a real database. The
static homepage, by contrast, is fully real and viewable right now via
`npm run dev` — no env setup needed for that part.

Alternatively, tell Claude to walk you through account creation live in a
session.

Smaller open item: footer contact email/phone is still a placeholder —
send that whenever you have it.

## Queue (after Supabase/Resend unblocks dynamic testing)

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
   - PhonePe sandbox demo (isolated, not linked into the real flow)
   - Push the local git repo to a GitHub remote (repo is initialized
     locally with one commit as of 2026-09-08; no remote configured yet —
     see the step-by-step given in-session, repeat on request)

Full rationale and the complete deferred-items list: [[BACKLOG.md]].

## Recently completed

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
