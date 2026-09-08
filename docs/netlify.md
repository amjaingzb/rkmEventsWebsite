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

## The safe deploy workflow (adopt this)

- **Iterate with draft deploys, not production.** `netlify deploy --build`
  (no `--prod` flag) builds and uploads to a unique preview URL without
  touching the live site — confirmed via the CLI's own help text ("Creates
  a draft deploy by default"). Use this for every test/verification cycle.
- **Only `netlify deploy --build --prod` when a change is confirmed ready**
  to go live — treat it as a deliberate, infrequent action, not a routine
  step after every edit.
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
