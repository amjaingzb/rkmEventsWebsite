---
tags: [event-registration, testing, demo-2026-09-10]
aliases: [test checklist, demo test cases]
created: 2026-09-10
---

# Manual Test Checklist (pre-demo, 2026-09-10)

> [!note] Purpose
> Short, demo-day checklist — not exhaustive regression coverage. See
> [[BACKLOG.md]] for known gaps (e.g. no automated test suite besides
> [[setup.md]]'s concurrency load test).

## Public / registrant flow

1. Load the homepage — hero, agenda, speaker bio, venue map, FAQ all render, no console errors.
2. Submit a valid registration (manual payment mode) → lands on confirmation page as `pending`.
3. Admin verifies it → ticket email arrives with QR code rendering correctly.
4. Submit a second registration with a **different** identity, 2-4 attendees → fee scales correctly (₹500 × attendees).
5. Mobile: full scroll-spy nav, form, and confirmation page — no horizontal scroll, tap targets usable.
6. If demoing PhonePe: toggle payment mode → "Pay online" button redirects to PhonePe checkout and completes.

## Admin dashboard

7. Log in at `/admin/login` → redirects to `/admin/dashboard`.
8. Tabs (All/Pending/Verified/Waitlisted/Rejected) filter correctly; search box finds a row by name/phone/email.
9. Reject a pending row → status flips, seat count doesn't change (never held one).
10. Resend ticket email on a verified row → confirms sent, no error.
11. Add a walk-in/cash registration → immediately verified + ticketed (or waitlisted if cap is full).
12. CSV export downloads with all expected columns.
13. `/admin/content` — edit one field (e.g. Contact phone) → save → confirm it updates live on the public page with no redeploy.

## Negative / edge cases

14. Full name with digits → blocked client-side with inline error (item 15, fixed today).
15. Phone: too short, too long, and a valid 10-digit number **starting with `91`** (e.g. `9123456789`) → only the first two are rejected (regression check for today's bug fix).
16. Resubmit with the same email/phone as an existing pending/verified registration → 409 "already registered", not a silent duplicate.
17. Submit with `numAttendees` at the max (4) → succeeds; confirm the UI has no way to exceed it.
18. Force the seat cap to `seats_taken` (or near it) → confirms Full/EOI form appears instead of the payment form, no crash.
19. Toggle "Pause registrations" in admin → public page shows only the pause message, no form.

## Known non-issues (already checked)

- Map iframe blank on first mobile load — resolved by a manual reload, not a code bug (2026-09-10).
- Hero/speaker photo cropping — already fixed in an earlier session (`object-cover object-top` etc.) — reconfirm visually only if time permits.
