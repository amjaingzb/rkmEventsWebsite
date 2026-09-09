---
tags: [event-registration, index]
aliases: [home, map]
created: 2026-09-08
updated: 2026-09-08
---

# Halasuru Event Registration — Docs Home

> [!note] Project
> Registration site for Swami Sarvapriyananda's visit to Ramakrishna Math
> Halasuru, Bangalore (31 Oct 2026). Original brief: [[../problemStatement.txt]].
> Original (superseded) architecture sketch: [[../proposedArchitecture.txt]] —
> see [[architecture.md]] for the current, maintained version.

## Start here

- **[[nextSteps.md]]** — what to do next, updated every session. Read this
  first if you're picking the project back up.
- [[architecture.md]] — the approved architecture: stack, data model, the
  atomic seat-cap invariant, payment module boundary, auth model
- [[setup.md]] — how to get a working local environment running
- [[QR_PAYLOAD_SPEC.md]] — the frozen QR ticket payload format/contract
- [[BACKLOG.md]] — full list of deferred/TBD items with rationale
- [[registration-integrity.md]] — finalized (not-yet-built) design for
  duplicate-registration detection, per-submission ticket cap, moving the
  seat-cap claim to verification time, the Open/Full-EOI/Paused public
  states, and the `seat_number` rename
- [[netlify.md]] — hosting: credit system, safe-deploy workflow, restrictions
  to keep in mind
- [[technical-concepts.md]] — plain-language Q&A log for the project owner's
  own reference (not instructions for Claude); add to it as such questions
  come up
- [[dev-accounts.md]] — which personal email plays which role (webadmin/
  infra, public contact, test customers) during dev mode

## Where things live in the repo

- `supabase/migrations/0001_init.sql` — schema + atomic seat-cap RPC
- `supabase/seed.sql` — seeds the single `events` row for this event
- `src/lib/payment/` — the payment module boundary (manual now, PhonePe
  sandbox demo later)
- `src/lib/ticket/` — QR generation + email + the verify→issue-ticket seam
- `scripts/load-test-register.ts` — concurrency test for the seat-cap RPC
- `CLAUDE.md` (repo root) — conventions/architecture notes for Claude Code
  sessions working in this codebase
