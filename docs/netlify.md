---
tags: [event-registration, hosting, netlify]
aliases: [netlify, hosting, deploy]
created: 2026-09-08
updated: 2026-09-08
---

# Netlify — hosting notes

> [!note] Why Netlify
> Originally planned to host on Vercel; switched 2026-09-08 because Vercel's
> Hobby plan ToS restricts free-tier use to non-commercial use and explicitly
> lists "processing payment from visitors" as commercial usage — a real risk
> for this site, which collects a payment reference from registrants.
> Cloudflare Pages was considered and ruled out too (its Workers Free plan
> caps CPU time at 10ms/request, a structural mismatch for an SSR-heavy
> Next.js app). Full writeup: [[nextSteps.md]] "Recently completed"
> (2026-09-08 entry).

Site: **https://rkm-halasuru-registration.netlify.app**
Netlify account: `amjain.gzb@gmail.com`, team "15 Commandments" (slug
`amjain-gzb`).

## The one thing that matters: credits, not "commercial use"

Netlify's Free plan has no non-commercial-use restriction (verified against
its ToS/Acceptable Use Policy directly) — the real constraint is a
**300 credits/month hard cap**, and it resets each billing cycle with **no
rollover**. If the balance hits zero, **every site on the account goes
down** ("Site not available") until the next cycle or an upgrade. This is
an outage risk, not just a soft limit — worth being deliberate about.

> [!warning] What costs credits (confirmed against Netlify's own billing docs)
> - **Production deploy — 15 credits, flat, every time.** This is the
>   dominant cost. At 300 credits/month, that's a theoretical ceiling of
>   ~20 production deploys/month, fewer once bandwidth/requests/compute
>   also draw from the same pool.
> - **Deploy Previews / branch deploys — 0 credits.** Completely free,
>   unlimited.
> - Bandwidth: 20 credits/GB. Web requests: 2 credits/10k. Compute
>   (functions): 10 credits/GB-hour. At this site's scale (a few hundred
>   registrants per event, admin dashboard usage) these are minor compared
>   to deploy credits — the real discipline is around *how often you hit
>   production*, not raw traffic.

## The workflow (adopt this — confirmed with project owner 2026-09-08)

**Default is local-only development**, same as before hosting existed:
`npm run dev` / `scripts/server.sh`. **Claude deploys to Netlify — draft or
production — only when explicitly asked**, never as a routine part of
finishing a task. This replaces any earlier assumption that a working
change should get pushed to Netlify automatically.

When a deploy IS requested:

- **Draft deploys are fully working, not just a diff-check tool** — same
  functions, same Supabase/Resend connection (env vars apply to all deploy
  contexts, not just production), just served from a non-primary URL.
  **You can demo from a draft deploy.** Default choice for
  everything: `netlify deploy --build` (no `--prod`) — 0 credits, unlimited.
- **For a stable, reusable demo link** (so repeated free draft deploys land
  on the same URL instead of a new random one each time), use an alias:
  `netlify deploy --build --alias demo` → always
  `https://demo--rkm-halasuru-registration.netlify.app`. Free every time,
  no matter how many times it's redeployed.
- **`netlify deploy --build --prod` only when the project owner explicitly
  wants the real, permanent production URL updated** — this is the one
  that costs 15 credits and is the deliberate, infrequent action.
- **Not git-linked, and don't link it without discussing first.** The site
  was created and deployed via the Netlify CLI directly
  (`netlify sites:create` + `netlify env:import` + `netlify deploy --build
  --prod`), not by connecting the GitHub repo through Netlify's dashboard.
  That's deliberate: git-linking makes every push to `main` an automatic
  production deploy (15 credits, no manual gate), which is easy to burn
  through by accident during active development. If this gets linked later,
  do it with a branch-based workflow in mind (feature branches get free
  branch deploys; only merge to `main` — which triggers a paid production
  deploy — when a change is actually done), and confirm the setup first.
- **Check remaining balance** anytime at
  `https://app.netlify.com/teams/amjain-gzb/billing` before a deploy-heavy
  session, especially close to a live event.

## Deployment log

> [!note] What's actually live right now
> Tracks which git commit the **production** URL is currently serving, so
> "is the live site up to date with the code" is always answerable without
> guessing. Update this on every `--prod` deploy (draft/alias deploys don't
> need an entry — they're disposable).

| Date | Commit | Type | URL |
|------|--------|------|-----|
| 2026-09-08 | `25fdd96` "Switch hosting plan from Vercel to Netlify, document why" | production | https://rkm-halasuru-registration.netlify.app |

Note: commits after `25fdd96` (doc-only changes) are **not yet reflected**
in the live production deploy — they don't affect app behavior since
`docs/` isn't part of the build, but if any future commit touches actual
app code, remember production is pinned to `25fdd96` until the next
explicitly-requested `--prod` deploy.

## Per-context env vars (NEXT_PUBLIC_APP_MODE)

`NEXT_PUBLIC_APP_MODE` (see [[architecture.md]] "Environment mode") should
be `live` for the true production URL only, and `development` everywhere
else (draft deploys, the `demo` alias) — so a draft/demo deploy always
stays sandboxed (PhonePe on sandbox credentials, the `⚠ Development /
Preview` banner visible) even though it's a real, fully-working deploy.
Since env vars currently apply uniformly to every context (imported once
via `netlify env:import`), this needs Netlify's per-context CLI overrides,
a one-time setup:

```
netlify env:set NEXT_PUBLIC_APP_MODE development          # default for all contexts (draft/branch deploys)
netlify env:set NEXT_PUBLIC_APP_MODE live --context production
```

And later, once a real PhonePe merchant account exists:

```
netlify env:set PHONEPE_MERCHANT_ID <real-id> --context production
netlify env:set PHONEPE_SALT_KEY <real-key> --context production
netlify env:set PHONEPE_SALT_INDEX <real-index> --context production
netlify env:set PHONEPE_BASE_URL https://api.phonepe.com/apis/hermes --context production
```

> [!warning] Not yet run
> These commands haven't been run against the real Netlify account yet —
> confirm with the project owner before running them, same as any other
> account-affecting action. Until then, every context (including
> production) still resolves `NEXT_PUBLIC_APP_MODE` to its unset default
> (`development`), so a `--prod` deploy today would still show the preview
> banner and use PhonePe sandbox credentials.

## Other things to know

- **Function timeout: 60 seconds**, synchronous, fixed across all plans
  including Free (not configurable, but also not a real constraint for
  anything this app does — registration/verify/email routes are all
  well under a second).
- **Env vars** were imported once from `.env.local` via
  `netlify env:import .env.local`. If `.env.local` changes (new secret,
  rotated key), re-run that command (or `netlify env:set KEY value` for a
  single var) — Netlify won't pick up local `.env.local` changes on its
  own since the site isn't git-linked/build-triggered from local file
  changes.
- **No commercial-use ToS restriction** — verified directly against
  Netlify's Terms of Service and Acceptable Use Policy, unlike Vercel's
  Hobby plan. Nothing to route around here.
