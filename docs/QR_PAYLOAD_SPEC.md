---
tags: [event-registration, tickets, qr]
created: 2026-09-08
---

# QR Ticket Payload Spec

Frozen contract for the ticket QR code. Any future scanner (including the
existing mobile app mentioned for another math center) must implement this
exact format to validate tickets.

## Format

Pipe-delimited string, three fields:

```
<regId>|<eventSlug>|<sig>
```

- `regId` — the registration's UUID (`registrations.id`).
- `eventSlug` — the `events.slug` this registration belongs to.
- `sig` — hex-encoded `HMAC-SHA256("${regId}.${eventSlug}", TICKET_HMAC_SECRET)`.

Implementation: [[../src/lib/ticket/qr.ts]] (`buildQrPayload` / `verifyQrPayload`).

## Why pipe-delimited instead of JSON

Shorter payload → denser QR code → faster scan. A generic phone QR scanner
that doesn't parse the format at all still gets a human-readable registration
ID by just reading the decoded text.

## Versioning

There is no explicit `v` field in the wire format currently — v1 is implicit
(3 pipe-delimited fields). If the payload format ever changes, prepend a
version segment (`v2|regId|eventSlug|sig`) and have `verifyQrPayload` branch
on segment count, so already-issued v1 tickets don't need reissuing.

## Validation modes for a future scanner app

- **Online** (not built yet): hit a `GET /api/ticket/verify?payload=...`
  endpoint that re-checks `registrations.status = 'verified'` server-side and
  re-derives the HMAC. Preferred — no secret leaves the server.
- **Offline**: the scanner app ships with `TICKET_HMAC_SECRET` (or a derived
  key) and recomputes the signature locally without a network call. Tradeoff:
  distributing the secret to a mobile app widens its exposure — flagged in
  [[BACKLOG.md]], not solved yet.

## Anti-forgery property

`verifyQrPayload` uses `crypto.timingSafeEqual` for the signature comparison,
so a forged payload with a guessed/incorrect `sig` is rejected regardless of
`regId`/`eventSlug` content. Tampering with any character of a genuine payload
invalidates the signature.
