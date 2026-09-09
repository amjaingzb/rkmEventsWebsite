---
tags: [git, process]
aliases: [tagging strategy, git tags]
created: 2026-09-09
---

# Git Tagging Strategy

> [!note] Purpose
> Tags exist as **fallback/rollback points**, not a changelog. Keep the
> count low — a tag list you have to scroll through has already lost its
> value. When in doubt, don't tag.

## When a tag is warranted

Only for a real milestone:
- A production deploy actually going live (not a draft/preview deploy).
- A test confirming a load-bearing invariant holds (e.g. the seat-cap
  concurrency test).
- The point right before starting a heavy or risky change, especially
  close to a deadline/demo — so there's a known-good rollback target.
- A frozen "what the audience saw" point right before a demo itself.

## When not to tag

Routine commits, doc-only updates, small fixes, work-in-progress states —
regular commit history already covers these; `git log` is enough.

## Process

Claude should **proactively suggest** tagging (not silently create tags)
whenever a milestone like the above is reached during a session — e.g.
right after a production deploy, right after a concurrency/invariant test
passes, or right before starting a large/risky implementation with a demo
coming up. Suggest a short tag name and a one-line reason; only create it
if the project owner says yes.

## Existing tags

Run `git tag -l -n1` for the current list with descriptions — not
duplicated here to avoid this doc going stale.
