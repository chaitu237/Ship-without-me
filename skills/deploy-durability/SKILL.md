---
name: deploy-durability
description: >
  Use when a deployed app is unreachable, intermittently down, or behaves differently in
  production than it does locally.
license: MIT
metadata:
  routing: conditional
  applies-when: "deployed=true"
---

# Deploy durability

**The question this skill answers:** what is different between the machine where it works
and the machine where it doesn't?

That difference is always in one of four places: **the code that was deployed, the
configuration it got, the network in front of it, or the resources it was given.**
Diagnose in that order — each rules out the next, and guessing skips straight past the
cheap answers.

---

## 1. Derive which layer is broken, before touching anything

```
curl -sI both origins — the platform subdomain AND the custom domain, separately.

What comes back?
├─ 200 on one, 404 on the other ──► NETWORK layer. Routing or DNS.
│                                     The app is fine. Stop touching the app.
├─ 404 on both ───────────────────► the DEPLOY does not exist.
│                                     Deleted, sleeping, or the first build never finished.
├─ 5xx ───────────────────────────► the app boots then crashes. Go to §3.
├─ 520 / 522 ─────────────────────► DNS resolves, origin refuses.
│                                     The record points at something dead.
├─ Timeout ───────────────────────► RESOURCE layer. Cold start or exhaustion.
└─ 200 but a blank page ──────────► the HTML shipped, the bundle did not.
                                     Network tab, not server logs.
```

**The most common mistake is editing code when the symptom is network-layer.** A 404 on
one origin and 200 on the other is never a code bug.

## 2. Derive config problems from what differs between environments

Missing environment variables are the single most common cause of "works locally, 500 in
production" — because locally you have a `.env` and production has whatever someone
remembered to paste.

```
Diff the deployed environment against .env.example.
├─ A key is absent ────────────► that is your bug.
└─ A key is present ───────────► is it still `changeme`, `xxx`, `TODO`?
                                  A placeholder deploys perfectly and fails
                                  on the first request that needs it.
```

Assert presence **and** non-placeholder value at boot, so it crashes on start with a clear
message rather than at 3am on a code path nobody tested.

## 3. Never guess at a 5xx

Get the stack trace from the deploy log and the runtime log. Both — they fail differently.

If the trace shows a real code bug rather than a config gap, stop and debug it properly.
Guessing a root cause from a symptom is how one outage becomes three.

## 4. Derive the health check from what actually breaks

```
What would take this app down?
└─ Whatever that is, /health must touch it.
```

`{"ok": true}` returned without querying anything is a health check that reports green
through a database outage. It must query the database and check the dependencies that
matter:

```json
{ "status": "ok", "version": "...", "db": "ok", "deps": { "...": "ok" } }
```

## 5. Derive the domain checks from what expires or drifts

- A/CNAME resolves to the **current** origin — not the one from the last platform.
- TLS valid and **more than 14 days from expiry**. Auto-renewal fails silently.
- Apex and `www` both resolve, one redirecting to the other permanently.
- Canonical points at whichever won.

## 6. Cold start is a resource problem wearing a latency costume

Time first byte after 15+ minutes idle. Over roughly 5 seconds, a visitor concludes the
site is broken — and functionally they are right.

Either keep the instance warm, or move the landing route to static hosting so the first
impression never waits on a boot.

## 7. Leave something behind, or this recurs

```
How will you find out next time?
├─ A user tells you ──────► too late, and most will not tell you at all.
└─ A probe tells you ─────► register an uptime check against /health,
                             alerting somewhere a human actually reads.
```

If the app ships a public demo, schedule a data reset too — otherwise the first stranger
who deletes everything permanently breaks the link you are sharing.

---

## Verify

```bash
ship detect --rules deploy --url https://<app> --domain <custom>
```

Done when it exits 0 **twice, at least 15 minutes apart**. The gap is what proves the
cold-start and sleep-eviction checks actually ran.

**Judgement:**

- [ ] Both origins resolved separately before anything was edited
- [ ] Failure classified before any code changed
- [ ] Env parity checked for presence *and* placeholder values
- [ ] Real stack trace read, not inferred
- [ ] `/health` queries the database
- [ ] TLS more than 14 days out; apex and www both resolve
- [ ] An uptime probe now exists

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| Fixed the code, still 404 | network-layer problem diagnosed as an app problem |
| "It worked five minutes ago" | cold start, not an outage |
| Monitor green during a real outage | `/health` that queries nothing |
| Down again in three weeks | no probe left behind |
| Site vanished after a domain change | DNS pointing at a dead origin, no canonical |
| Works for you, broken for users | TLS expiry, or apex vs www divergence |
| Demo link permanently broken | public demo with no scheduled reset |

## Don't

- Don't load test, autoscale, or optimise cost. Different job.
- Don't migrate hosting providers mid-incident.
- Don't rotate or invent secrets — report what's missing; a human supplies values.
- Don't restart-and-hope. Read the log.
