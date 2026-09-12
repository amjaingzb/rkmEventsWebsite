---
tags: [reference, concepts, qna]
aliases: [concepts, technical concepts, glossary]
created: 2026-09-08
updated: 2026-09-12
---

# Technical Concepts (Q&A)

> [!note] What this file is
> Personal reference for the project owner — plain-language explanations of
> technical concepts that came up in conversation with Claude. Not
> instructions for Claude to follow; just an accumulating Q&A log. Add new
> entries at the bottom as more come up.

---

## Q: We already have a subdomain `rkm-halasuru-registration.netlify.app` — why doesn't that solve our Resend blocker? How would another subdomain (e.g. `amit.simplicie.com`) help?

`#dns` `#resend` `#email` `#hosting`

**Short answer:** Resend needs a domain *you can add DNS records to*, not just a URL your site happens to load at.

Resend verification works by giving you a few DNS records (a TXT record for SPF, a CNAME/TXT pair for DKIM) that you must add to a domain's DNS control panel to prove you own it. Only then will Resend let you send email from an address on that domain to *any* recipient — until then, it only delivers to the email address that owns the Resend account.

- `netlify.app` is **Netlify's** domain, not ours. Our site just lives on a slot of it. We have no DNS control panel for `netlify.app` itself, so there's nowhere for us to add Resend's records — that's why this subdomain can't unblock Resend, no matter how long the site has been live there.
- `amit.simplicie.com` is different because your brother's **Cloudflare DNS panel** for `simplicie.com` gives real access to add DNS records under that subdomain. Resend can verify at the subdomain level (you don't need the whole root domain). Once verified, email can send from something like `tickets@amit.simplicie.com` and reach anyone.

**Two separate uses of the same subdomain**, easy to conflate:
1. **Resend DNS records** → unblocks email sending to real recipients.
2. **CNAME pointing the subdomain at Netlify** → unblocks a nicer website URL. Purely cosmetic, optional, unrelated to #1.

This means the Resend blocker doesn't actually require waiting on the `ramakrishnamath.in` admin — any domain/subdomain where you can personally add DNS records (like your brother's) works just as well.

---

## Q: My brother needed an MX record (`simplicie.com MX smtp.google.com`) in Cloudflare for his Gmail-on-his-own-domain setup. Why would he need that just for something like Resend?

`#dns` `#mx-records` `#email` `#resend`

**He doesn't need it for Resend — MX records and Resend's records solve two different problems: receiving mail vs. sending mail.**

- A plain personal Gmail account (`someone@gmail.com`) never touches DNS — Google already owns `gmail.com`. But an inbox at his *own* domain (`he@simplicie.com`) is **Google Workspace**: Gmail's infrastructure, wearing his domain name. For that to work, the internet needs to know where to deliver mail addressed to `simplicie.com` — that's what an **MX record** does: "mail for this domain → route to Google's mail servers." Without it, mail sent to `he@simplicie.com` bounces. So yes, he genuinely needs it just to *receive* email there — nothing to do with Resend.
- **Resend's TXT/DKIM records** do the opposite job: they prove that *outgoing* mail claiming to be from a domain (e.g. `noreply@amit.simplicie.com`) is legitimately from us, so spam filters trust it. They have no effect on where incoming mail to that domain goes.

Both can exist on the same domain at once, doing unrelated jobs:
- **MX record** → only needed if someone wants to *receive* email at an address on that domain.
- **Resend's TXT/DKIM records** → needed to *send* our ticket emails so they reach any recipient.

For this project we only need the second one — no MX record required on whatever subdomain we verify with Resend.

---

## Q: If Simplicie were a bundled hosting+email provider (site hosting at `site1.simplicie.com` *and* email at `user1@simplicie.com`, all through their own webapp, no separate DNS panel access) — would that put us in the exact same bind as Netlify?

`#dns` `#resend` `#hosting` `#email`

**Yes, exactly the same bind.** The determining factor was never "who hosts the site" or "who provides email" — it's specifically whether you have write access to a **DNS control panel** for that domain (or a subdomain of it).

In that hypothetical, you could host a site there and send/receive email through their webapp using their infrastructure — but you could not verify the domain with Resend, because verification means adding a TXT/DKIM record to the domain's DNS, and you'd have no panel to add it to. They own the DNS, not you.

The only reason your brother's real `simplicie.com` situation is different is that he separately has a **Cloudflare account** controlling its DNS/nameservers, independent of whatever hosting or email he uses on top. That DNS panel is what unlocks adding Resend's (or anyone else's) verification records. Bundled hosting+email with no exposed DNS control — which is most cheap all-in-one platforms, and is exactly Netlify's `netlify.app` subdomain — leaves you stuck exactly where we are now with Resend.

**One-line rule:** it's not about what services a domain provides you — it's about whether you personally hold the keys to its DNS records.

---

## Q: What are we actually doing when we add Resend's DKIM/SPF/DMARC records — and why do these all serve the same goal?

`#dns` `#resend` `#email` `#dkim` `#spf` `#dmarc`

**All three are outbound-authentication layers with the same goal: prove to receiving mail servers that mail from this domain is legitimate, so it doesn't land in spam (and so Resend unlocks sending to any recipient, not just the account owner's own inbox).** They don't do different jobs — they add independent signals that stack:

- **DKIM** — cryptographic signature. Resend publishes a public key as a TXT record (`resend._domainkey...`); every email they send on your behalf is signed with the matching private key. Receiving servers check the signature against the DNS-published key to confirm the content wasn't forged or tampered with.
- **SPF** — a simpler allowlist: "which mail servers are authorized to send as this domain?" Published as a TXT record listing allowed senders (e.g. Amazon SES's servers, ending `~all`).
- **DMARC** (optional) — a policy layer telling receivers what to do if DKIM/SPF *fail* (e.g. `p=none` = do nothing special yet, just monitor — the least strict setting).

**Important: none of this enables *receiving* email at the domain.** That's a separate concern requiring an MX record pointed at a real mailbox provider (see the Gmail/Workspace MX question above). DKIM/SPF/DMARC only affect whether outbound mail *sent from* this domain is trusted by the recipient's spam filter.

---

## Q: Resend's SPF setup also asked for an MX record (`send.rkmhalasuru → feedback-smtp...amazonses.com`). Doesn't that contradict "these records are only about sending, not receiving"?

`#dns` `#mx-records` `#spf` `#resend` `#amazon-ses`

**No contradiction — this MX record is part of the SPF sending mechanism itself, not a "receive email here" setup.** It's easy to conflate with the earlier Gmail/Workspace MX record because it's the same *kind* of DNS record, but it solves a completely different problem.

- SPF doesn't actually check the visible "From:" address you see in your inbox — it checks the **envelope sender / Return-Path**, a lower-level technical address used for bounce/delivery-failure handling.
- Resend's underlying delivery provider (Amazon SES) sets up a dedicated **"MAIL FROM" domain** for this — here, `send.rkmhalasuru.simplicie.com` — as the Return-Path domain for all mail it sends on your behalf.
- Internet mail standards (RFC 5321) require that any domain used as a Return-Path/MAIL FROM address **must have an MX record**, so that if a bounce needs to be generated, there's a defined place to route it. That's the only purpose of this record — it points to Amazon's own bounce-handling server, not to any inbox you own.

Nobody will ever send a normal email *to* `send.rkmhalasuru.simplicie.com`, and no mailbox exists there. It's internal plumbing required by the SPF/bounce-handling spec — still squarely in "sending" territory, not a parallel receiving setup.

---

## Q: For PhonePe, how does the app find out a payment succeeded — and if PhonePe's server calls Netlify (not my laptop), how would my local test even know?

`#phonepe` `#webhooks` `#supabase` `#architecture`

**There are two independent ways this app learns "did the payment succeed?", and a shared database is what makes both work no matter which server is involved.**

- **Way A — browser status-check.** When you land back on the confirmation page after paying, that page itself asks PhonePe directly, "how did this payment go?" and updates the registration based on the answer. This only needs *your browser* to reach *whichever server served that page* — no public internet round-trip required.
- **Way B — the real webhook.** PhonePe's own server proactively calls *our* server the instant payment completes, with no browser involved at all. The catch: PhonePe's servers live on the public internet and can't reach a laptop or local container (`localhost`, `172.28.1.2`, etc.) — those addresses only mean something inside your own network. So the webhook has to point at a public URL instead, in this project's case a Netlify draft deploy.

**The piece that ties them together: Supabase, the actual database.** It's not tied to localhost or Netlify — it's a separate, independent cloud database that *both* your local dev server and the Netlify deploy connect to as clients, using the same credentials. So Way B's real flow is:
1. PhonePe calls Netlify's webhook (the only address it can actually reach).
2. Netlify's webhook code updates the *shared* Supabase database — "this registration is now verified."
3. Your local dev server, when you refresh the confirmation page, reads from that *same* Supabase database and sees the update.

Neither server ever talks to the other directly — Supabase is the shared source of truth both read/write. That's also why registration/payment testing has worked seamlessly switching between local and Netlify all session: it's always been the same underlying database underneath, regardless of which server happened to handle a given request.

**One-line rule:** a webhook needs a public URL because it's the *internet* (PhonePe's servers) calling in — but once that call lands anywhere and updates the shared database, every other server reading from that same database sees the result, local dev included.

---

## Q: If we let a monk edit the FAQ/agenda directly, won't every site visit have to re-read the database — isn't that expensive on a free tier?

`#caching #supabase #netlify #content`

**Short answer: no — the full design lives in its own doc now,
[[content-editability-design.md]], because it grew into a real
architecture discussion. This entry is just a pointer + the one-line
takeaway.**

The key idea: content gets read from the database only **at the moment
someone edits it, or once right after** — not on every visitor's page
load. In between edits, the site serves a cached copy for free (0 DB
reads), no matter how many people are browsing. This works via Next.js's
tag-based cache invalidation (`revalidateTag`), confirmed fully supported
on Netlify and cheap relative to a production deploy (see the linked doc
for the full cost table and the Netlify docs quoted verbatim). A 5-minute
safety-net window exists too, but it's not a running timer costing
anything — it's a lazy check only evaluated if a visitor happens to show
up during that window.

See [[content-editability-design.md]] for the full architecture, the
rejected alternative (a `whatChanged` polling flag) and why, the complete
cost model, and red flags to resolve before implementing.

---

## Q: We have two Supabase keys, RLS is "on" with zero rules, and the anon key is visible in the browser's page source — isn't that already a blunder?

`#supabase` `#rls` `#security` `#anon-key` `#service-role-key` `#architecture`

**No — but it's a fair thing to be suspicious of, and the two keys need to be understood separately.**

**The two keys Supabase hands you, and what protects each one:**
- **Secret / "service role" key** — the master key. Used only by our server code (API routes). It **bypasses RLS entirely**, always has full access, and has no policy-based safety net at all. Its *only* protection is that it must never reach a browser — never a `NEXT_PUBLIC_*` env var, never shipped in client JS. If this one ever leaked, every row of every table is instantly readable/writable, full stop.
- **Public / "anon" key** — designed to be safe to expose publicly. It's *supposed* to be constrained entirely by Row-Level Security (RLS) policies written on each table. This app's `/admin/login` page does use it directly in the browser (that's how Supabase Auth's sign-in form works) — normal and expected, not a leak. It shows up in page source because it's meant to.

**Why "RLS enabled, zero policies" is safe today, not a blunder:** in Postgres/Supabase, enabling RLS with no policies written defaults to **deny-all** for that role. It's a locked door with no key issued — not an open door. So right now, if anything tried to use the anon key to read/write `registrations` or `events` directly, it would be rejected. Nothing in this app currently issues such a request (the only anon-key usage is the Auth login handshake, a separate subsystem from the data tables).

**So what's the actual risk, if not "already broken"?** It's a *latent gap*, not a live one — one future mistake away from becoming exploitable, with nothing currently in place to catch that mistake. Concrete ways this could flip from safe to broken:
1. **A permissive policy gets added under pressure.** Someone building a new feature (e.g. "let a registrant view their own ticket") wires it up with the anon key straight from the browser, hits a permission error, and "fixes" it with `CREATE POLICY ... USING (true)` — which means "anyone can read any row." Ships, works, demo's fine — and now every registrant's name/email/phone is one browser dev-tools `fetch()` away from anyone.
2. **Copy-pasted tutorial code.** Supabase's own quickstarts commonly show `supabase.from('table').select('*')` called directly from client-side React (see below — that's the intended Supabase pitch). If that pattern gets pasted into this codebase without noticing this app's convention is "always go through the service-role API route," and a permissive policy exists (or someone assumes "RLS is on" means "it's handled"), it silently leaks instead of failing loudly.
3. **A dashboard fat-finger.** Someone toggles a "enable anon read access" helper in the Supabase web UI while debugging something unrelated — now that one click is the entire security model for that table.

**The fix (already spec'd, see [[../BACKLOG.md]] Item 1):** write explicit, narrow RLS policies now, while everyone understands what they should be — anon restricted to executing `register_attendee` only (nothing else), admin gated by a real authenticated-session check — so there's a clear, reviewed contract in place *before* any of the above scenarios has a chance to happen, rather than relying on "nobody's asked it to do anything yet" as the only line of defense.

**One-line rule:** the anon key being visible is fine and intentional — the danger is a future *policy* being written wrong, not the key being "found." The secret key has no such story; it's protected by never leaving the server, full stop.

---

## Q: What are the two ways a browser can get data into/out of Supabase — and which one does this app use?

`#architecture` `#supabase` `#serverless` `#rls`

**Pattern A — via our own API route (what this app does today):**
```
Browser  →  Next.js API route (our server)  →  Supabase (using the secret key)
```
The browser never talks to Supabase directly. It calls our own backend, which uses the service-role key (never exposed to the browser) to do the actual database work and returns just the result. All permission logic (is this an admin? is a seat available?) lives in our own TypeScript, fully under our control.

**Pattern B — browser talks to Supabase directly (the "anon key + RLS" pitch):**
```
Browser  →  Supabase directly (using the anon key)
```
No API route at all — client-side JS calls Supabase's API straight from the browser tab (e.g. `supabase.from('registrations').select('*')` running inside a user's page). This is Supabase's (and Firebase's) headline feature — skip writing a backend, get security entirely from RLS/security-rules policies. Most Supabase tutorials are written this way because it's the fastest path to a demo.

This app is 100% Pattern A. The RLS discussion above matters because the danger isn't "we're doing Pattern B insecurely" — it's "something might introduce a bit of Pattern B later (a shortcut, a tutorial snippet) without anyone registering that doing so hands control over to whatever RLS policies exist at that moment."

---

## Q: The site's hosted on Netlify with no server we provision — isn't this architecture "serverless," like a Firebase-backed mobile app with no backend at all?

`#architecture` `#serverless` `#netlify` `#hosting`

**"Serverless" is being used to mean two unrelated things here — both your intuitions are correct, they're just answering different questions.**

**"Serverless" the compute model (what Netlify actually gives us):** this is about *how code runs*, not about client/server/db shape. It means no long-running process we provision and manage (no EC2 box, no Apache always listening) — our API route code packages as a function that spins up on-demand per request and disappears. Netlify hosts this app this way: our API routes *are* still server-side compute sitting between the browser and Supabase — they're just billed and run "on demand" rather than as a server we keep running 24/7.

**"Serverless" the architecture pattern (a Firebase-backed mobile game):** this is about whether a server-side layer exists in the request path *at all*. A mobile client talking straight to Firebase, with Firebase's security rules as the only gatekeeper, has no middle tier whatsoever — that's Pattern B above. There's no compute to run "on demand" in that path; the client is the only thing executing logic, and the database vendor's rules are the entire security boundary.

**Where the terms collide:** "serverless" became popular largely *through* the Pattern-B pitch (Firebase, then Supabase copied it) — "no backend to write, just rules!" — so people use "serverless" for both "no backend at all" and "backend that runs as on-demand functions" interchangeably. They're independent axes:

| | Has a middle-tier server | No middle tier |
|---|---|---|
| **Always-on compute** | Apache/EC2 backend | (n/a) |
| **On-demand compute** | **This app** — Next.js API routes on Netlify | A Firebase-backed mobile game |

This app picked "server tier, but on-demand" — it never provisioned a traditional always-on server, but it does have a server tier (our API routes), unlike the fully server-less Firebase game.
