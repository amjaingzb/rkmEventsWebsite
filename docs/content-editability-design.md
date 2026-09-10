---
tags: [event-registration, architecture, content, caching, netlify, design]
aliases: [content editability, pseudo-dynamic content, content caching design]
created: 2026-09-10
updated: 2026-09-10
---

# Content-editability design (pseudo-dynamic content)

> [!note] Status
> **Design finalized through discussion (2026-09-10), not yet implemented.**
> No code has changed for this yet. See [[nextSteps.md]] "To discuss later"
> for how this surfaced, and [[BACKLOG.md]] item 12 for the current state of
> content (hardcoded JSX, real copy already in place).

## The problem

The project owner expects Swamiji/volunteers to keep requesting wording
changes — FAQ, agenda, speaker bio, hero text — right up until the last
minute before a demo, based on past experience with this kind of review
cycle. Today all of that ("pseudo-dynamic content" — static-looking but
subject to change) is hardcoded JSX inside `src/components/static/*.tsx`
(confirmed: `FaqSection.tsx` is a `"use client"` component with the FAQ
array typed directly into the file). Changing a single FAQ answer today
means editing a code file and pushing a full Netlify production deploy —
**15 credits every time**, out of a 300-credit/month hard cap (see
[[netlify.md]]). That's the constraint driving all of this: minimize
code-deploys for pure copy changes, without overspending on database reads
either (Supabase is also free-tier).

## Rejected approach: a `whatChanged` polling flag

Earlier idea: an enum column (e.g. `whatChanged = 8` meaning "FAQ changed"),
checked on a timer, reset after being read. **Rejected** — it still
requires a recurring read to *notice* the flag (polling, just cheaper
per-poll), doesn't eliminate DB reads the way on-demand cache invalidation
does, and has a real correctness gap: a single-value enum can't represent
"FAQ and Agenda both changed in the same window" without a bitmask/queue,
which is exactly the kind of state-juggling the chosen approach avoids
entirely.

## Chosen architecture

**Two different fetch patterns already coexist in this codebase — use both,
matched to the right data:**

- **Always-fresh, every request** — what `src/app/page.tsx` already does
  today for `events` (seat count, pause toggle) via
  `export const dynamic = "force-dynamic"`. Correct for that data (must
  never be stale), and **unrelated to this plan** — content should NOT
  reuse this pattern.
- **Cached, refreshed only when told to** — Next.js's Data Cache +
  `revalidateTag`, confirmed fully supported on Netlify (see "Netlify
  verification" below). This is the pattern for FAQ/Agenda/Speaker/Hero
  text.

**One cache tag per content area**, not one shared flag:

```
FAQ save        → revalidateTag("faq")
Agenda save     → revalidateTag("agenda")
Speaker save    → revalidateTag("speaker")
Hero copy save  → revalidateTag("hero")
```

Editing one area only invalidates that area's cache entry — no shared
state to collide over, no bitmask needed. Next.js's tag system already
supports arbitrarily many independent tags natively.

**A 5-minute cache TTL exists only as a backstop**, not the primary
mechanism, in case a `revalidateTag` call is ever missed (bug, forgotten
wire-up). Important clarification reached during discussion: **this is not
a running timer/cron/clock.** No background process counts down. A cache
entry just stores a plain timestamp of when it was generated; the
"is this stale?" check is a simple comparison done lazily, only as a side
effect of an actual visitor's request. If zero visitors show up during a
stale window, the check never runs and nothing happens — it costs nothing
when idle. This is the standard HTTP `stale-while-revalidate` pattern
(RFC 5861), not something proprietary being built here. When the backstop
does fire, it re-runs the **real** fetch (not a lightweight "did anything
change" probe — that concept doesn't exist in this design), but this is
cheap: the content tables are small, and Next.js dedupes concurrent
requests during the same stale window down to exactly one regeneration,
not one per visitor.

## Visual flow

The "backstop" path (nothing explicitly invalidated the cache; the 5-minute
TTL is what eventually catches it):

```
                         VISITOR REQUESTS THE PAGE
                                    │
                                    ▼
                    Is the content cache older than 5 min?
                                    │
                ┌───────────────────┴───────────────────┐
                │ NO (fresh)                              │ YES (stale)
                ▼                                          ▼
     Serve cached FAQ/agenda text            Serve the OLD cached text anyway
     COST: $0 — no DB read at all            (visitor sees it instantly, no wait)
                                              COST: $0 for THIS visitor
                                                          │
                                                          ▼
                                    Has another regeneration already started
                                    for this same stale window?
                                                          │
                                ┌─────────────────────────┴─────────────────────────┐
                                │ YES (someone else already triggered it)             │ NO (first one to notice)
                                ▼                                                      ▼
                    Do nothing, just wait for it              Kick off ONE background re-fetch
                    COST: $0                                  of the actual FAQ/agenda table
                                                                COST: 1 small DB read, one time,
                                                                shared by everyone in this window
```

The everyday path (an explicit edit triggers instant, targeted invalidation
— this is what should be used in practice, the backstop above is only for
when this path is somehow skipped):

```
                    SOMEONE EDITS CONTENT (monk/you hits "Save")
                                    │
                                    ▼
                    1 DB read  (load current text to show in the edit box)
                    1 DB write (save the new text)          }  COST: 2 small DB ops,
                    1 tiny signal: "FAQ changed, go refresh"    happens once per edit,
                    (this is the revalidateTag call — no        regardless of visitor count
                     DB cost itself, just a note to the cache)
                                    │
                                    ▼
                    NEXT visitor after this edit loads the page
                    → cache sees the "FAQ changed" note
                    → does the ONE real re-fetch right then
                    COST: 1 small DB read, paid once, by whichever
                    visitor happens to be first through the door
                                    │
                                    ▼
                    EVERY visitor after that, until the next edit
                    COST: $0 — served from the now-fresh cache
```

Each content area (FAQ, Agenda, Speaker, Hero) runs through this
independently — its own tag, its own cache entry, its own 5-minute
backstop clock (evaluated lazily, per area) — so editing one never forces
a refetch of the others.

## Cost model

| Situation | DB reads | DB writes | Function/compute runs |
|---|---|---|---|
| Normal visitor, cache fresh | 0 | 0 | 1 (page request — already happens today, unrelated to this feature) |
| Normal visitor, cache stale, someone else already regenerating | 0 | 0 | 1 (page request only) |
| Normal visitor, cache stale, first to notice (backstop path) | 1 (small table) | 0 | 1 page request + 1 background regeneration |
| Content edit (Save) | 1 (load current value) | 1 (save new value) | 1 page request + 1 tiny `revalidateTag` call (near-zero compute) |
| First visitor after an edit | 1 (fresh pull) | 0 | 1 page request |
| Every subsequent visitor, no new edits | 0 | 0 | 1 page request each |

> [!note] Important boundary — not an action item for this plan
> The "1 page request" row above happens for *every* visitor regardless —
> that's the pre-existing seat-count/pause-status check
> (`createServiceClient()` + `getCapacitySnapshot` in `page.tsx`), already
> shipped, already accepted, and **completely unrelated to content
> caching**. This design adds effectively zero incremental cost on top of
> that — content DB reads/writes only show up at the moment of an edit, or
> once right after, never as a function of visitor volume. Keep these two
> cost centers mentally separate when reasoning about scale. Whether *that*
> existing per-visit check itself holds up under a large simultaneous demo
> burst is a genuinely separate question, not addressed or changed by this
> plan — worth a one-line pointer in [[BACKLOG.md]] if it's ever worth
> load-testing, but out of scope here.

## Netlify verification (done 2026-09-10, via curl against Netlify's own docs)

- **ISR / on-demand + time-based revalidation: confirmed "Full Support"**
  on Netlify's Next.js Runtime v5 (`@netlify/plugin-nextjs`), auto-installs
  at build time with zero config — matches this repo (no `netlify.toml`,
  no manual plugin entry, deploys already work). Source:
  `docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview`:
  > "static page responses are automatically cached at the edge and can be
  > revalidated by path or by tag... both the App Router and Pages Router
  > support on-demand and time-based revalidation"
- **Cost confirmed cheap relative to deploys.** Netlify's own billing docs
  (`docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work`)
  put Production deploys at a **flat 15 credits every time**, while Compute
  (what a `revalidateTag` call draws from) is billed **per GB-hour of
  actual execution time** — a millisecond-scale call costs a vanishingly
  small fraction of a GB-hour. Same 300-credit pool, wildly different
  scale; frequent content edits would need to reach a very high volume
  before Compute cost rivals a single deploy.

## Red flags to check before implementing (not yet resolved)

1. **A direct edit via Supabase's own table editor does NOT trigger
   `revalidateTag` automatically.** If the near-term/pre-demo editing path
   is "you edit the row directly in Supabase's dashboard" (the
   zero-build-effort option discussed for the demo crunch), nothing in that
   flow calls `revalidateTag` — the change would only surface once the
   5-minute backstop happens to fire on the next visitor after that window,
   not instantly. Either accept that lag for the fast/manual path, or build
   a minimal "trigger revalidate" endpoint/button to hit after any direct
   DB edit. **This needs a decision before relying on direct table edits
   for last-minute demo fixes.**
2. **RLS/grants gotcha, seen before on this project** (per
   [[nextSteps.md]] "2026-09-08 dynamic testing unblocked" —
   `service_role` had no default grants on new tables). Any new
   content table needs the same explicit
   `GRANT SELECT/INSERT/UPDATE` treatment `register_attendee` needed, or
   reads/writes will fail with a permission-denied error, not an RLS error.
3. **Content today lives inside `"use client"` components** (e.g.
   `FaqSection.tsx`). Moving to DB-backed content means lifting the fetch
   up into `page.tsx` (server component) and passing data down as props —
   the client components keep their interactivity (accordion state etc.),
   they just stop owning their own copy. Needs care not to regress the
   recently-finished visual redesign ([[nextSteps.md]] 2026-09-09 entry).
4. **This migration itself requires one code deploy to ship** (the
   fetch-from-DB code change is still code). After that one deploy, content
   edits need zero further deploys — but the migration isn't "free," it's a
   one-time cost, worth timing deliberately (not mid-crunch before a demo).
5. **Multi-tenancy stays minimal per the root `CLAUDE.md`.** This should
   stay scoped to the one seeded event row's content areas — don't build
   generic multi-event content management as part of this.
6. **Which editing "front door" (step 5/6 below) is actually needed** is
   still an open decision — see [[nextSteps.md]] "To discuss later" for the
   (a) direct Supabase table edit vs (b) monk-facing admin content tab
   trade-off already discussed. Recommendation reached: rely on (a) for the
   pre-demo crunch (given red flag 1's caveat), treat (b) as post-demo,
   only-if-editing-traffic-warrants-it work.

## Inventory pass — done (2026-09-10)

> [!note] Decided together with the project owner
> Went through `src/components/static/*.tsx` file by file (plus
> `src/app/layout.tsx` metadata) and sorted every content area found.

**DB-backed (volatile):**

1. **Hero** (`Hero.tsx`) — reuses `events.title`/`event_date`/
   `start_time`/`end_time`/`venue_name` for the title/date/time/venue
   chips; new storage needed for the hero photo URL and the CTA copy.
2. **Agenda** (`AgendaSection.tsx`) — new storage, no existing column fits
   a list of time-slot rows.
3. **Speaker bio** (`SpeakerSection.tsx`) — reuses `events.speaker` for
   the name; new storage for the highlight bullets, full-bio paragraphs,
   and speaker photo URL.
4. **FAQ** (`FaqSection.tsx`) — reuses `events.faq_json`, but its shape
   needs to grow from a flat list to match the 3-category grouping
   actually in use on the page today.
5. **Venue & Parking** (`VenueParkingSection.tsx`) — reuses
   `events.venue_name`/`venue_address`/`parking_info`; new storage for
   the Google Maps embed link.
6. **Contact settings** (new area, not in `src/components/static/`) —
   email, phone, and a WhatsApp **number only** (the app builds the
   `wa.me` link the same way the existing per-registrant deep links
   already do — a full free-text URL was rejected as editable into
   something broken). Replaces the `CONTACT_EMAIL` constant
   (`src/lib/contact.ts`) everywhere it's currently used: the footer, the
   rejected-status email/WhatsApp copy, the confirmation page, and the
   registration form's error fallback. This was raised by the project
   owner mid-review — the footer today shows only an email, and should
   also show phone/WhatsApp; rather than add those as footer-only fields
   (which would leave `CONTACT_EMAIL` itself still hardcoded and create a
   second, driftable copy of the email), all three became one shared
   settings row consumed everywhere contact info appears.

**Photo hosting decision (raised during the pass):** a DB column holding
just a path under `public/images/` wouldn't actually remove the need for
a deploy when someone wants a genuinely *new* photo (not just re-pointing
at an already-bundled file) — that file still has to land in the repo.
Decided: hero and speaker photos move to a **Supabase Storage bucket**,
with the DB column holding the resulting public URL, so a photo swap has
zero deploy cost, matching every other item on this list. This adds a
bucket + upload path to the shape-design step below; not yet designed.

**Left hardcoded (stable):**

- **Footer** (`Footer.tsx`) — structure only. Its address line reuses
  `events.venue_address`; its contact line reads the new contact
  settings above. The component itself doesn't move to the DB.
- **Navbar** (`Navbar.tsx`) — nav labels/links/logo. Deliberately kept
  out of scope: its `href`s are anchor-coupled to the actual section
  `id`s at compile time, so a DB-edited link could silently break
  scroll-spy with no build-time check to catch it.
- **Page `<title>`/meta `description`** (`src/app/layout.tsx`) —
  duplicates Hero's title/date text. Low value to make editable (mostly
  invisible except browser tabs/search snippets), flagged but not
  included.

## Implementation plan

1. ~~**Inventory pass**~~ — **done, see above (2026-09-10).**
2. ~~**Shape design per area**~~ — **done (2026-09-10)**, see
   `supabase/migrations/0012_content_editability.sql`: new columns
   `hero_photo_url`/`hero_cta_text`/`hero_badge_text`, `agenda_json`
   (`[{time, title}]`), `speaker_json`
   (`{highlights, fullBio, photoUrl}`), `faq_json` reshaped to
   `[{category, items: [{q, a}]}]`, `venue_maps_embed_url`, `parking_info`
   changed `text`→`jsonb` (`[{label?, text}]`), and `contact_email`/
   `contact_phone`/`contact_whatsapp_number` (the new shared Contact
   settings area, replacing `CONTACT_EMAIL`). All new columns on the
   existing `events` row — no new tables, per red flag 5 (multi-tenancy
   stays minimal). Hero/speaker photos are `text` URL columns only, not
   image storage — see the Photo hosting decision above.
3. ~~**One-time backfill**~~ — **done (2026-09-10)**, in the same
   migration: the real current copy from `src/components/static/*.tsx`
   backfilled into the `halasuru-sarvapriyananda-2026` row verbatim, so
   nothing regresses once the fetch moves server-side (step 4). Contact
   phone/WhatsApp (`9731007760`, project owner-provided — didn't exist
   anywhere in the codebase before this) backfilled for both fields.
   **Applied to the live Supabase project and verified (2026-09-10)** — ran
   by the project owner in the Supabase SQL editor; read back directly via
   the service-role key afterward and confirmed all counts match the
   source JSX exactly (4 agenda rows, 3 speaker highlights + 3 bio
   paragraphs, 3 FAQ categories / 11 items, 3 parking bullets, plus every
   Hero/Contact scalar field set). `hero_photo_url`/`speaker_json.photoUrl` still
   point at the existing `public/images/` paths as an interim value — the
   actual Supabase Storage bucket for photos (red flag/decision above)
   is separate infra, not yet created; swap those URLs once it exists.
4. **Move the fetch server-side** — lift each area's read into `page.tsx`
   (already a server component doing this for `events`), pass down as
   props into the existing client components (address red flag 3).
5. **Wire caching** — `unstable_cache` + one tag per content area; call
   `revalidateTag(<area>)` from whatever the chosen edit path turns out to
   be (address red flag 1 explicitly here, don't defer it).
6. **Decide and build the actual edit front door** — direct Supabase table
   edits (fast, zero build) vs. a monk-facing admin content tab (more
   build effort, removes the project owner from the editing loop
   permanently) — a deliberate, separate decision per red flag 6, not
   bundled into steps 1-5.

## Related docs

- [[nextSteps.md]] — where this discussion is tracked as "to discuss later"
- [[BACKLOG.md]] item 12 — current state of hardcoded content
- [[netlify.md]] — credit model this design is optimizing against
- [[technical-concepts.md]] — plain-language pointer entry to this doc
- [[architecture.md]] — overall system architecture this would extend
