---
tags: [event-registration, backlog, design]
aliases: [registration hardening, seat-cap redesign, dup-registration plan, expression-of-interest]
created: 2026-09-09
updated: 2026-09-09
---

# Registration Integrity Hardening — Finalized Design (not yet implemented)

> [!note] Status
> Design finalized 2026-09-09 across a full item-by-item review with the
> project owner. Nothing in this doc is built yet — implementation is
> deferred to a future session. This supersedes [[BACKLOG.md]] item 2 as
> the source of truth for that item's plan, and expands it with a new
> item (6) surfaced during review.

## Problem statement

- Today, `register_attendee` (`supabase/migrations/0001_init.sql`) claims
  capacity (`seats_taken += n`, status `pending`) at **submission** time —
  in both manual *and* PhonePe modes — before any payment is confirmed.
  `RegistrationForm.tsx` calls `/api/register` (which runs this RPC) before
  it ever calls `/api/phonepe/initiate`, so an abandoned/incomplete PhonePe
  checkout squats on a seat exactly like an unpaid manual submission does.
  This is **not a manual-only risk**.
- Nothing expires an unpaid `pending` row — it holds capacity indefinitely
  until an admin manually notices and rejects it.
- Nothing stops one person submitting many times (large `num_attendees`, or
  several separate submissions) — no per-submission cap, no per-contact
  dedupe check exists.
- The original brief ([[../problemStatement.txt]]) also calls for an
  "expression of interest" flow once the guaranteed cap fills — recorded
  in [[architecture.md]] but never fully designed until this session (see
  Item 6 below).

> [!note] Framing correction that shaped this design
> `seat_number` is a misnomer — there's no theater-style seat assignment,
> just a sequential ID volunteers use on the day; actual seating is
> volunteer-assisted and first-come-first-served in person, unrelated to
> registration order. Moving the actual capacity claim from submission-time
> to verification-time rarely reorders real-world outcomes (verification
> tends to happen in roughly submission order) — it mainly closes the
> "claim a slot, never pay" hole.

## Decisions

### Item 1 — Duplicate email/phone detection

- Pre-check lives in `registerAttendee` (`src/lib/registration/register.ts`),
  run before the `register_attendee` RPC call — a read, not part of the
  seat-cap atomicity invariant, so it doesn't belong inside the RPC.
- Comparison is normalized: email lowercased/trimmed; phone normalized the
  same way already used for WhatsApp messaging (`91<10 digits>`).
- Applies to both the public registration route and the admin walk-in/cash
  route (both funnel through `registerAttendee`) — one code path.
- Match scope: existing `pending` or `verified` row for the same event,
  matching on email OR phone.
- Behavior on match: don't hard-block. `registerAttendee` returns
  structured duplicate info (existing registration id) instead of
  throwing; the public API surfaces "you already have a registration, ID
  `xxxx` — contact us at CONTACT_EMAIL/CONTACT_PHONE if you need to change
  it." The admin route gets the same info back and needs a way to proceed
  anyway (e.g. a confirmation in the admin UI), since admins may knowingly
  register a genuine second household member sharing a phone/email —
  exact admin-side UX for "proceed anyway" TBD at implementation time.
- **Open (Item-6-related):** whether this check should also cover
  `waitlisted`/EOI rows — not decided (see Caveats).

### Item 2 — Per-submission ticket cap

- Cap value: **4** attendees per submission.
- Client-side: change the `num_attendees` input in `RegistrationForm.tsx`
  from a free-text box to a dropdown/select limited to 1–4, so a normal
  user never even encounters the error path.
- Server-side (defense-in-depth against direct API/RPC calls): extend
  `register_attendee`'s existing `if p_num_attendees < 1` guard to also
  check the upper bound and **reject** (raise exception) — not clamp —
  when `num_attendees > 4`. Rejecting matches the existing guard's style
  and never silently registers fewer people than requested.
- Distinct from Item 5's reserve buffer: this cap is about a single
  submission's size and applies regardless of remaining event capacity;
  the buffer is about headroom near the event-wide seat cap.
- **Open (Item-6-related):** whether this cap applies to EOI submissions
  too — not decided (see Caveats).

### Item 3 — Move capacity claim from submission to verification time

- Registration submission no longer touches `events.seats_taken` or
  assigns a registration number — it just inserts the row (`status` stays
  `pending`, `registration_number` stays `null`).
- The atomic claim-or-waitlist logic (the same single-`UPDATE ... WHERE
  ... RETURNING` pattern as today's `register_attendee` /
  `reject_registration`) moves into a new RPC (e.g.
  `claim_and_verify_registration`), invoked from the shared seam
  `markVerifiedAndIssueTicket` (`src/lib/ticket/issue.ts`) — the same seam
  both `manual.ts` and `phonepe.ts` already funnel through per the
  payment-module boundary in the root `CLAUDE.md`. Only that shared seam
  changes; the payment modules themselves don't.
- PhonePe path claims via the same seam from `applyConfirmedPhonePeSuccess`
  (`src/lib/payment/phonepe.ts`), called by both `api/phonepe/webhook` and
  `api/phonepe/status` — no divergence between the two confirmation paths.
- Edge case: if capacity is full at verification time (a rare,
  near-cap-boundary race), the registration falls to `waitlisted` *after*
  a real payment was confirmed. Mitigated by the reserve buffer (Item 5)
  so this stays rare; when it happens, an admin resolves it manually
  (refund/next-batch invite) — no new blocking admin-UI flow. Admin
  dashboard should make these visible (e.g. a filter/flag for waitlisted
  rows that have `payment_reference`/`payment_amount` set).
- Stale `pending` rows: manual cleanup only (existing `reject_registration`
  flow) — no auto-expiry. Confirmed lower priority now that a stale
  pending row no longer holds a seat.
- **Critical implementation constraint:** the new
  `claim_and_verify_registration` RPC must **not** carry over today's
  `is_registration_open = true` WHERE-clause check from
  `register_attendee`. That flag is repurposed by Item 6 as the manual
  pause switch, and pause must gate *new submissions only* — never block
  admins from verifying/clearing an existing backlog (see Caveats §6).

### Item 4 — Manual-mode SLA acknowledgment copy

- On the confirmation page (`src/app/confirmation/[id]/page.tsx`) and the
  pending-status email (`sendStatusEmail` in `src/lib/ticket/email.ts`),
  add a line for manual mode only: ticket verification/issuance may take
  up to **5 days**; contact CONTACT_EMAIL/CONTACT_PHONE with payment proof
  if not received by then. Pure copy change, no logic change.

### Item 5 — Remaining-capacity buffer + admin display

- Buffer default value: **10** (out of `guaranteed_seat_cap` 500),
  repurposing the existing unused `waitlist_alert_threshold` column.
  Editable from the Item 6 settings panel (both for testing and real
  operation).
- Threshold formulas (finalized together with Item 6):
  - `auto_pause` (backlog relief): `confirmedBooking + outstanding >= cap - buffer`
  - EOI trigger (true fullness): `confirmedBooking >= cap`
  - where `confirmedBooking` = `events.seats_taken` (verified seats, post
    Item 3) and `outstanding` = sum of `num_attendees` across `pending`
    rows for the event (excludes `waitlisted`/EOI rows).
- Admin display of live remaining capacity
  (`guaranteed_seat_cap - seats_taken`, plus the outstanding/pending
  count) is folded into the Item 6 settings panel rather than a separate
  display — same underlying numbers, one place for admin to look.

### Item 6 — Public registration states: Open / Full-EOI / Paused *(new — not in the original brief's detail, but implements its "expression of interest" requirement)*

> [!note] Where this came from
> `problemStatement.txt`: "After 500 reservations, guaranteed reservations
> should close but expression of interest could still be recorded... if
> there are enough interest, say another 200, then a larger venue can be
> chosen and the people who have expressed interest can be reached out to
> rebook." `docs/architecture.md` already named this concept but it was
> never fully designed until this session, alongside a new ask: a manual
> "pause" lever for when the manual-verification backlog builds up.

Three states for the public site, in priority order (higher wins):

1. **Paused** — the OR of two independent signals, deliberately kept
   separate to avoid flag-drift (a single shared flag written by both
   auto-logic and an admin could fight itself):
   - `manual_pause`: a stored boolean admin flips from a new settings
     panel — persists exactly as admin set it, never touched by the
     formula below. Backed by the existing (currently unused-in-app-code)
     `events.is_registration_open` column, repurposed for this.
   - `auto_pause`: **not stored** — recomputed fresh on every request as
     `confirmedBooking + outstanding >= cap - buffer`. This is the
     backlog-relief condition: too many unverified submissions piling up,
     so stop accepting new ones until admins catch up. Clears itself
     automatically as the backlog drops, with no risk of an admin's manual
     setting being silently reversed by the calculation.
   - Effective paused = `manual_pause OR auto_pause`. When paused, the
     public registration page shows only an admin-set custom message —
     **no form, no data collection at all**. Message text is a new
     `pause_message` column (one field covers both triggers for now).
2. **Full → EOI form** (automatic, independent of Paused). Triggers when
   `confirmedBooking >= cap` — verified seats alone have reached the cap.
   Shows a lighter form: name/email/phone only, **no payment collected**.
   Reuses the existing `waitlisted` registration status — no new
   table/status, since this is the same concept as the problem
   statement's "expression of interest" and today's waitlist. Copy:
   "seating is full — leave your info, we'll reach out if seats open or a
   bigger venue is arranged."
3. **Open** (default/normal) — today's full registration form and flow.

Admin-tunable settings (new panel on the existing admin dashboard,
`src/app/admin/dashboard/page.tsx` — not a separate route): seat cap
(`guaranteed_seat_cap`), buffer value (`waitlist_alert_threshold`, default
10), manual pause toggle (`is_registration_open`), and pause message text
(new `pause_message` column). Dashboard should also show the live numbers
(confirmedBooking, outstanding, cap, buffer) so admin can see why
`auto_pause` is (or isn't) active.

Related but out of scope for this item: [[BACKLOG.md]] item 5 ("waitlist
re-invite tooling" — CSV export/bulk-notify for re-engaging
waitlisted/EOI people) remains a separate, already-tracked backlog item;
this design makes it more likely to matter soon but doesn't itself build
the re-invite tooling.

## Terminology rename: `seat_number` → `registration_number`

Confirmed safe: **not** part of the frozen QR wire format —
[[QR_PAYLOAD_SPEC.md]]'s payload is `regId|eventSlug|sig`, no seat field.

**Expanded scope from this review:** the concern raised wasn't the
internal label — it was that showing a "seat number" to attendees falsely
implies assigned/theater-style seating (front row/back row), when actual
seating is volunteer-assisted, first-come-first-served on the day,
unrelated to registration order. Resolved as **remove from user-facing
text entirely, keep internal-only**:

- **Removed from user-facing surfaces**: the ticket email (`sendTicketEmail`
  in `src/lib/ticket/email.ts`, currently the `Seat No:` line) and the
  confirmation page (`src/app/confirmation/[id]/page.tsx`, currently the
  "Seat number:" block). Registrants no longer see this number at all.
- **Added to the user-facing ticket email**: the registrant's own phone
  number, alongside the existing Registration ID/QR code — purely
  informational for the registrant's own reference (not a new lookup
  mechanism).
- **Kept internal-only, renamed**: `AdminTable.tsx` ("Seat #" column
  header → "Reg. No." or similar) and `src/app/api/admin/export/route.ts`
  CSV column — admin/volunteer reference only (e.g. day-of check-in
  ordering), never shown to the registrant.
- **No new ID/lookup scheme added.** A short suffix on the long
  registration ID (for easier phone communication) was considered but
  confirmed unnecessary: `AdminTable.tsx`'s existing search
  (`matchesSearch`, `src/components/AdminTable.tsx:51`) already matches on
  phone and email, so admins can already look someone up on a call
  without the registration ID. The existing long registration ID stays as
  the only ID, shown to users purely for their own reference.
- Mechanical rename (same pattern repeated across each): schema migration
  (`registrations.seat_number` → `registration_number`, plus whatever
  `0003_null_seat_number_on_reject.sql` references), `src/lib/ticket/
  issue.ts` (`seatNumber` field, `toTicketEmailInput`),
  `src/app/api/admin/registrations/route.ts`. Docs mentioning the field
  going forward: [[setup.md]], [[nextSteps.md]], [[BACKLOG.md]]
  (historical entries stay worded as written).

## Cross-item consistency caveats (resolve during implementation)

Re-reading all items together surfaced interactions between Item 3 and
Item 6 that weren't pinned down item-by-item. None overturn a decision
above — they're gaps between two approved decisions needing one more small
call at implementation time.

1. **Two distinct ways a registration ends up `waitlisted` — must be
   visually distinguishable in admin.** (a) Item 6's Full-EOI path:
   created directly as `waitlisted` at submission time, when
   `confirmedBooking >= cap` was already true — no payment fields. (b)
   Item 3's rare race edge case: a `pending` row with a real payment
   reference gets verified but the atomic claim fails because capacity
   filled in the interim — falls to `waitlisted` *with* payment fields
   populated. (b) is the "genuinely paid but bumped, may need a refund"
   case; (a) is a normal EOI signup, no refund involved. Admin dashboard
   should label/filter these distinctly (e.g. by whether
   `payment_reference` is set), not lump all `waitlisted` rows together.
2. **EOI submissions need a lighter insert path that skips the payment
   requirement.** `registerAttendee` today requires `paymentReference`
   unconditionally for manual-mode events. The Full-EOI form collects no
   payment, so it needs either a new lightweight function/RPC, or a flag
   on `registerAttendee` that skips the payment-reference requirement and
   inserts straight to `waitlisted`. Decide the exact shape when
   implementing Item 6.
3. **Open: does the EOI path still collect `num_attendees`?** The problem
   statement frames EOI partly as headcount-gathering ("if there are
   enough interest, say another 200...") — suggesting yes, a count is
   still useful for venue-sizing even with no payment. Confirm when
   building Item 6's EOI form.
4. **Open: do Item 1 (duplicate check) and Item 2 (per-submission cap)
   apply to EOI submissions?** Not decided — quick call needed at
   implementation time.
5. **Open: should the admin walk-in/cash route respect Item 6's
   Paused/Full-EOI states, or always bypass both?** Leaning toward "admin
   always bypasses" (an admin handling a walk-in has direct knowledge of
   real seat availability the automatic thresholds don't), consistent
   with how admins already override normal flow elsewhere — but not
   explicitly confirmed this session.
6. **Pause must gate new submissions only, never block verifying
   already-pending registrations.** The whole point of `manual_pause`/
   `auto_pause` is to let admins catch up on a verification backlog — the
   check belongs in the submission-time page render (`src/app/page.tsx`,
   which renders `RegistrationForm`), not in the verification path. The
   new `claim_and_verify_registration` RPC must **not** inherit today's
   `is_registration_open = true` WHERE-clause check
   (`supabase/migrations/0001_init.sql:89`) — that would block admins from
   clearing the very backlog that triggered `auto_pause` in the first
   place.

## Suggested implementation order

Small/low-risk items first, landing each as its own reviewed change/PR
(not one giant commit):

1. Item 1 (duplicate detection) — independent, low-risk.
2. Item 2 (per-submission cap) — independent, low-risk.
3. Item 4 (SLA copy) — independent, pure copy.
4. `seat_number` → `registration_number` rename (incl. user-facing
   removal, adding phone to the ticket email) — independent, mechanical.
5. Item 3 (verification-time capacity claim) — the architectural change;
   its own reviewed unit, since it touches the core seat-cap invariant.
6. Item 5 (buffer value + threshold formulas) — depends on Item 3's
   confirmedBooking/outstanding concepts existing.
7. Item 6 (Open/Full-EOI/Paused states + admin settings panel) — depends
   on Items 3 and 5.

## Verification approach (once implemented)

- `npm run build` after each step (type-checking is part of the build).
- `npx tsx scripts/load-test-register.ts <baseUrl> <n>` re-run after Item 3
  lands — it exercises concurrent claims against the seat-cap RPC, which
  will have changed.
- Manual pass through the public registration form for each Item 6 state
  (Open, Full-EOI, Paused), using the admin settings panel to force each
  condition, against a local Supabase project.
- Manual check of a real ticket email/confirmation page after the rename,
  confirming no seat number appears and the phone number does.
- Update this doc's status and [[BACKLOG.md]] items 2/5 in the same
  session the corresponding work lands, per the root `CLAUDE.md`'s "keep
  docs current" instruction.
