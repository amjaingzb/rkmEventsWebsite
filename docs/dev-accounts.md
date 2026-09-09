---
tags: [event-registration, accounts, dev-mode]
aliases: [dev accounts, test emails, personal emails]
created: 2026-09-09
updated: 2026-09-09
---

# Personal email roles (dev mode)

> [!note] Why this doc exists
> The project owner has several personal Gmail/Yahoo inboxes in play across
> Supabase, Resend, Netlify, and in-app test data. Their roles had drifted
> across [[nextSteps.md]] mentions and were never defined in one place —
> this doc is that one place. Confirmed with the project owner 2026-09-09.
> Update this file (not just [[nextSteps.md]]) whenever a role changes or a
> new dev/test inbox is added.

## Roles

| Email | Role | Where it's used |
|---|---|---|
| `amjain.gzb@gmail.com` | **Webadmin / infra contact.** Used to sign up almost everywhere. | Supabase account owner, Resend account owner (API key), Netlify account (`amjain-gzb` team), git commit author (`userEmail` in Claude Code) |
| `bhikajicama09@gmail.com` | **Public-facing contact address.** Placeholder until a real org inbox exists. | `CONTACT_EMAIL` in `src/lib/contact.ts` (footer, rejected-status copy, form error fallback); also one of the two admin login credentials in `0_SECRETS/users.website` |
| `ruchisai197518@gmail.com` | **Test customer/registrant.** | Use as the "attendee" email when manually testing the public registration form |
| `sairam_197518@yahoo.in` | **Test customer/registrant.** | Same as above — second test identity, useful when a test needs two distinct registrants (e.g. duplicate-submission checks, seat-cap load testing) |

> [!warning] Don't mix roles
> Keep `amjain.gzb@gmail.com` out of registrant test data (it's the infra/
> admin identity, not a "customer") and keep the two test-customer inboxes
> out of admin/service-account roles. This separation is what makes
> switching between dev-mode testing and live/production usage
> unambiguous — e.g. when scanning the `registrations` table for real vs.
> test rows, or deciding what to purge before real registrations start (see
> [[nextSteps.md]] "smaller open item" on clearing test registrations).

## Where each role actually lives (code vs. account vs. nothing)

> [!note] There is no central "mode switch"
> None of this toggles via an env var or config flag — each role lives in a
> different place, confirmed 2026-09-09:

- **Public contact email** — one hardcoded constant,
  `CONTACT_EMAIL` in `src/lib/contact.ts`. Going live is a one-line edit to
  a real org/volunteer address; every surface that shows contact info reads
  from that constant, so nothing else needs to change.
- **Webadmin/infra email** (`amjain.gzb@gmail.com`) — not stored in code or
  env at all. It's whoever owns the external accounts (Supabase project,
  Resend account, Netlify team `amjain-gzb`). Changing it means
  transferring those account ownerships, not editing a file.
- **Test-customer emails** — not stored anywhere; just typed in ad hoc when
  manually testing the registration form.
- **Admin dashboard login** — fully DB-driven already, independent of both
  code and this doc. `requireAdminSession()`
  (`src/lib/supabase/server.ts:54`) accepts *any* authenticated Supabase
  Auth user — there is no hardcoded admin email or allowlist in the app.
  Who counts as an admin is controlled entirely in **Supabase dashboard →
  Authentication → Users**: add, remove, or change an admin's
  email/password there anytime, no code change or redeploy needed, takes
  effect immediately. `0_SECRETS/users.website` is just a local backup note
  of current credentials — the app never reads that file.

## Live vs. dev-mode toggle

Nothing code-level keys off these emails — the same `EVENT_SLUG` /
Supabase project is used in both modes (see [[architecture.md]]). The
separation above is a **convention for who's-who**, not a technical
env-var switch. When the project goes live:

- `CONTACT_EMAIL` should move off `bhikajicama09@gmail.com` to a real org
  address (see [[BACKLOG.md]] go-live checklist).
- Test registrations under the two test-customer inboxes should be cleared
  from `registrations` (see [[nextSteps.md]]).
- `amjain.gzb@gmail.com`'s role as the infra/service-account owner doesn't
  change at go-live — it stays the Supabase/Resend/Netlify account holder
  regardless of dev vs. live.
