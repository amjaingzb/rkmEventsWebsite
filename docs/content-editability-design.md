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

## Implementation plan (once approved — not started)

1. **Inventory pass** — decide which content areas are actually volatile
   (FAQ, Agenda, Speaker bio, Hero copy are the current candidates) vs.
   stable enough to leave hardcoded. Do this together with the project
   owner, not unilaterally.
2. **Shape design per area** — structured tables/JSON columns matching each
   area's real shape (reuse `events.faq_json`/`parking_info`, already
   unused in `supabase/seed.sql`, where they fit) rather than one generic
   `string_key`/`content_value` table — chosen specifically because it
   maps better to a future CSV-per-section workflow than a flat KV table
   would.
3. **One-time backfill** — migrate the current hardcoded JSX content for
   each chosen area into its DB row(s), so nothing regresses visually on
   day one.
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
