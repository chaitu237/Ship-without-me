---
name: deployment-hardening
description: >
  Use before real users depend on a deploy, or when asking whether something is production
  ready.
---

# Deployment hardening

**The question this skill answers:** what changes when a stranger depends on this?

Everything below is a control that only matters once someone you have never met is
trusting the app with their data, their money, or their Monday morning. Before that, none
of it is worth doing. After that, all of it is.

---

## 1. Derive security headers from what an attacker would try

Each header blocks one specific attack. Ship the ones whose attack applies.

```
Can a user's browser be tricked into…
├─ downgrading to HTTP? ──────────► Strict-Transport-Security
├─ running your page in an iframe
│  on someone else's site? ───────► X-Frame-Options / CSP frame-ancestors
├─ executing an injected script? ─► Content-Security-Policy
├─ misinterpreting a file type? ──► X-Content-Type-Options: nosniff
└─ leaking the URL to a third
   party via the referrer? ───────► Referrer-Policy
```

**CSP is the one that takes effort and the one that pays.** Start in report-only, collect
violations for a week, then enforce. Skipping it because it is fiddly is how a compromised
third-party script exfiltrates session tokens — and you ship third-party scripts.

## 2. Derive caching from whether the URL changes when the content does

This is the whole rule, and getting it backwards is the most common deploy bug.

```
Does this URL change when its content changes?
├─ yes — content-hashed asset ──► cache FOREVER
│         Cache-Control: public, max-age=31536000, immutable
├─ no — the HTML entry point ───► never cache
│         Cache-Control: no-cache
└─ it's per-user data ──────────► private, no-store.
                                   NEVER cacheable at a shared CDN.
```

`no-store` on **everything** throws away the entire benefit of content hashing — every
repeat visit redownloads the whole bundle, which is slow and expensive on metered mobile
data. And a cached authenticated response at a shared CDN serves one customer's dashboard
to another.

## 3. Derive the bundle budget from who is loading it

```
Who downloads this, on what?
├─ Desk users on broadband ──────► ≤400 KB initial JS is comfortable
├─ Mobile users on 4G ───────────► ≤200 KB
└─ Emerging-market mobile,
   metered, possibly 2G ─────────► ≤100 KB, and it is a product requirement,
                                    not a performance nicety
```

Set the number and **fail the build past it**. Without a gate, bundles only grow.

When you blow it, the causes are almost always in this order: an unpurged utility-CSS
config, a whole icon set imported instead of individual icons, a chart or PDF library
loaded on the landing page, then unoptimised images.

## 4. Derive environment separation from what a mistake would cost

```
If someone ran this against the wrong environment, what breaks?
└─ Real customer data → the environments must not be able to reach each other.
   Separate databases. Separate credentials for every third party.
   A leaked staging key must not touch production.
```

Staging matches production's runtime version, region and config — a staging environment
that differs in any of those tests nothing.

**Block indexing on non-production.** `X-Robots-Tag: noindex` plus `Disallow: /`. A
staging site outranking production is common and embarrassing.

## 5. Derive secret handling from the fact that git remembers

Never in the repo. Not in a committed `.env`, not in a config file, not in a comment.
**Scan history before making a repo public** — deleting a file does not remove it from git
history, and anything ever committed by accident is burned. Rotate it; do not "clean it up".

`.env.example` lists every key with a **placeholder**, and the app validates at boot so a
missing variable fails loudly rather than producing a mystery 500.

## 6. Derive backup policy from how much you could afford to lose

```
If the database vanished right now, how much work would be lost?
└─ That number is your backup interval. Then:
   · stored in a DIFFERENT region or account than the primary
   · RESTORED ONCE into a scratch environment, before launch, with the date recorded
```

**An untested backup is a belief, not a backup.** Most backup failures are discovered
during the first real incident, which is the worst possible time.

## 7. Derive rollback from whether the last version can still run

```
Can the previous build run against the CURRENT database?
├─ yes ──► rollback is one command. Verify you have tried it.
└─ no ───► you cannot roll back. That is why migrations deploy
            SEPARATELY and ADDITIVELY, before the code that uses them.
```

A destructive migration shipped alongside its code means the only way out of a bad deploy
is forward, at 3am, under pressure.

## 8. Logging that is useful and not a liability

- Structured, with a **request id the user can quote** from an error page.
- **Never log** tokens, passwords, card numbers, or national ID numbers. Redact at the
  logger, not at each call site — call sites get forgotten.
- Alert on what a user would notice: error rate, p95 latency, failed logins. Not CPU.
- Upload source maps privately; do not serve them publicly.

---

## Verify

```bash
ship detect --rules deploy --url https://<app>
```

**Automated:** missing security headers, `no-store` on hashed assets, missing compression,
bundle over budget, secrets in the repo, `.env.example` drift.

**Judgement:**

- [ ] Every applicable header shipped; CSP enforced, not just report-only
- [ ] Hashed assets immutable, HTML `no-cache`, user data `private`
- [ ] Bundle budget set from who actually loads it, and enforced in CI
- [ ] Environments cannot reach each other's data; non-production is noindex
- [ ] Git history scanned for secrets before going public
- [ ] A backup restored into a scratch environment, with the date recorded
- [ ] Rollback performed once, successfully, on purpose

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| Repeat visits are slow | `no-store` on content-hashed assets |
| One customer saw another's dashboard | authenticated response cached at a shared CDN |
| A third-party script exfiltrated data | no CSP |
| Staging outranks production in search | non-production indexable |
| Secret leaked after open-sourcing | git history never scanned |
| Restore failed during an incident | backup never tested |
| Bad deploy could not be rolled back | destructive migration shipped with its code |
| Slow only for mobile users | budget set for broadband |

## Don't

- Don't autoscale, load test, or optimise cost before you have users.
- Don't add Kubernetes to run one container.
- Don't put a WAF in front of an app with no security headers. Fix the app.
- Don't build a status page before you have a monitor to feed it.
