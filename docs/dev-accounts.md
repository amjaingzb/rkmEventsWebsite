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
| `amjain.gzb@gmail.com` | **Webadmin / infra contact, and public-facing contact address.** Used to sign up almost everywhere; also the placeholder public contact until a real org inbox exists (switched here from `bhikajicama09@gmail.com`, project owner decision 2026-09-09). | Supabase account owner, Resend account owner (API key), Netlify account (`amjain-gzb` team), git commit author (`userEmail` in Claude Code); `CONTACT_EMAIL` in `src/lib/contact.ts` (footer, rejected-status copy, form error fallback) |
| `bhikajicama09@gmail.com` | **Admin login only** (no longer the public contact address). | One of the two admin login credentials in `0_SECRETS/users.website` |
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

> [!note] There IS now a central mode switch — `NEXT_PUBLIC_APP_MODE`
> As of 2026-09-09 this is no longer true for `CONTACT_EMAIL` (see below) —
> updated to match. See [[architecture.md]] "Environment mode" for the
> full toggle design; `NEXT_PUBLIC_APP_MODE` doesn't touch any of the other
> roles on this page (webadmin/infra, admin login, test customers), only
> `CONTACT_EMAIL` and PhonePe credentials today.

- **Public contact email** — resolved by `src/lib/contact.ts` via the
  compile-time `NEXT_PUBLIC_APP_MODE` toggle (`src/lib/appMode.ts`):
  `DEV_CONTACT_EMAIL` in development, `LIVE_CONTACT_EMAIL` in live mode.
  Both are still `amjain.gzb@gmail.com` for now — going live for real means
  updating `LIVE_CONTACT_EMAIL` to a real org/volunteer address and setting
  `NEXT_PUBLIC_APP_MODE=live` in the production Netlify context (see
  [[netlify.md]]); every surface that shows contact info reads from the
  same `CONTACT_EMAIL` export, so nothing else needs to change.
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

The same `EVENT_SLUG` / Supabase project is used in both modes (see
[[architecture.md]]) — that part is still just a convention, not a
technical switch. `CONTACT_EMAIL` specifically now IS a technical switch
via `NEXT_PUBLIC_APP_MODE` (see above). When the project goes live:

- Update `LIVE_CONTACT_EMAIL` in `src/lib/contact.ts` to a real org
  address, then set `NEXT_PUBLIC_APP_MODE=live` in the production Netlify
  context (see [[BACKLOG.md]] go-live checklist and [[netlify.md]]).
- Test registrations under the two test-customer inboxes should be cleared
  from `registrations` (see [[nextSteps.md]]).
- `amjain.gzb@gmail.com`'s role as the infra/service-account owner doesn't
  change at go-live — it stays the Supabase/Resend/Netlify account holder
  regardless of dev vs. live.
