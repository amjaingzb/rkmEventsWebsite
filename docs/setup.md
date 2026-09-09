---
tags: [event-registration, setup]
aliases: [setup, getting-started]
created: 2026-09-08
---

# Setup

Needed before the app does anything beyond serve static pages.

## 1. Create a Supabase project

https://supabase.com — free tier is enough. From **Project Settings → API**,
grab:
- Project URL
- `anon` public key
- `service_role` secret key

## 2. Run the schema

Supabase SQL editor, in order:
- `supabase/migrations/0001_init.sql`
- `supabase/seed.sql` — creates the one Halasuru `events` row. Edit the
  placeholder `faq_json`/`parking_info` first if you want real content
  (currently `'[]'` / `'TBD'` — see [[BACKLOG.md]] item 12).

## 3. Create one admin user

Supabase dashboard → Authentication → Users → Add user (email + password).
This is the only login `/admin/login` needs — no self-serve admin signup.

## 4. Create a Resend account

https://resend.com (free tier) for ticket emails. Grab an API key and verify
a sending domain/email.

## 5. Fill in `.env.local`

Copy `.env.local.example` → `.env.local`, fill in:
- Supabase URL/keys from step 1
- `TICKET_HMAC_SECRET` — generate with `openssl rand -hex 32`
- Resend key + from-address from step 4
- PhonePe fields can stay blank — Phase B, not required to run Phase A.

## 6. Run it

```
npm install
npm run dev
```

Open http://localhost:3000.

## Testing the seat-cap concurrency guarantee

> [!warning] Don't test against the real event row
> Insert a second test event with a small cap first.

```sql
insert into events (slug, title, speaker, venue_name, venue_address,
  event_date, start_time, end_time, guaranteed_seat_cap)
values ('test-event', 'Test Event', 'Test', 'Test Venue', 'Test Address',
  '2099-01-01', '10:00', '11:00', 5);
```

Temporarily set `EVENT_SLUG=test-event` in `.env.local`, restart `npm run dev`, then:

```
npx tsx scripts/load-test-register.ts http://localhost:3000 20
```

Confirm exactly 5 registrations land `pending` with unique registration
numbers 1–5, the rest `waitlisted`, and `events.seats_taken` for
`test-event` equals exactly 5. Then switch `EVENT_SLUG` back to the real
event slug.

See [[architecture.md]] for why this is guaranteed to be race-safe.
