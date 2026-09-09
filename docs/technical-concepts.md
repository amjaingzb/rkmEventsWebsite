---
tags: [reference, concepts, qna]
aliases: [concepts, technical concepts, glossary]
created: 2026-09-08
updated: 2026-09-08
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
