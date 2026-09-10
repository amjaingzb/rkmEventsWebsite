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
> As of 2026-09-10 this no longer covers contact info at all (see below,
> updated to match) — only PhonePe credentials today. See
> [[architecture.md]] "Environment mode" for the full toggle design.

- **Public contact email/phone/WhatsApp** — as of 2026-09-10, DB-backed
  (`events.contact_email`/`contact_phone`/`contact_whatsapp_number`),
  editable live via `/admin/content` → Contact — no `NEXT_PUBLIC_APP_MODE`
  involvement, no dev/live distinction, no redeploy. Currently
  `amjain.gzb@gmail.com` / `9731007760` for both phone and WhatsApp — going
  live for real just means editing those three fields in that admin page.
  Every surface that shows contact info (footer, ticket/status emails, the
  admin WhatsApp deep link, the public form's error copy, the confirmation
  page) reads from the same DB row, so nothing else needs to change — see
  [[content-editability-design.md]].
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
technical switch. When the project goes live:

- Edit the real org contact email/phone/WhatsApp in `/admin/content` →
  Contact (see above — no longer a code constant or env toggle), then set
  `NEXT_PUBLIC_APP_MODE=live` in the production Netlify context for the
  PhonePe-credentials/banner behavior that toggle still controls (see
  [[BACKLOG.md]] go-live checklist and [[netlify.md]]).
- Test registrations under the two test-customer inboxes should be cleared
  from `registrations` (see [[nextSteps.md]]).
- `amjain.gzb@gmail.com`'s role as the infra/service-account owner doesn't
  change at go-live — it stays the Supabase/Resend/Netlify account holder
  regardless of dev vs. live.
