---
name: tenant-auth-demo
description: >
  Use when more than one customer's data will live in the same database, when adding login or
  roles, or when strangers should be able to try the app without signing up.
license: MIT
metadata:
  routing: conditional
  applies-when: "identity_model=multi-tenant"
---

# Tenant, auth, demo

**The question this skill answers:** who is allowed to see this row, and where is that
enforced?

If the answer is "the handler remembers to filter", you have a breach with a friendly
interface. Everything below moves that decision somewhere a handler cannot forget it.

Second job, same skill: let a stranger try the app in ten seconds without signing up, and
without that demo becoming the leak.

## 1. Decide the tenancy unit first

- Personal app → the **user** is the tenant.
- B2B → the **organization** is the tenant, and users can belong to several.

Decide before you write a schema. Retrofitting this means rewriting every query in the app.

## 2. `tenant_id` everywhere

On every business table. `NOT NULL`, foreign key, indexed.

No exceptions for small or "obviously internal" tables. Those are the ones that leak.

## 3. Scope at the data layer, never in the handler

Wrong:

```js
// every handler must remember. one forgets. that's the incident.
db.query('SELECT * FROM jobs WHERE tenant_id = ?', [session.tenantId])
```

Right:

```js
// the wrapper injects tenant_id from the session. handlers cannot forget.
const db = scopedDb(session.tenantId)
db.jobs.findMany()
```

If your database supports row-level security, turn it on as a second wall. Belt and
braces is correct here — this is the failure mode that ends companies.

**Every raw unscoped query is a future incident.** Grep for them before you ship.

## 4. Three roles is enough

`owner` · `staff` · `viewer`

Add more only when a real requirement appears. Check permissions **server-side** —
hiding a nav item is presentation, not authorization.

## 5. Auth mechanism

- **Global / B2B** → email + password, or a managed provider.
- **Emerging markets** → phone + OTP. Email is not the identity people have.

Sessions in `httpOnly` cookies. If you use JWTs: short expiry, refresh rotation. Putting
"JWT-secured" in your marketing copy is not a security design.

Use the framework's auth library. **Never hand-roll password hashing or crypto.**

**→ Login is one screen out of roughly twelve.** Signup, email verification, forgot
password, reset, change password, change email, 2FA, session expiry, account deletion,
and data export all still need building — use the `account-lifecycle` skill. This skill
covers isolation and roles; that one covers the journey.

## 6. Demo mode — the four rules

A public demo login removes the signup wall and is worth building. It is also where
people accidentally expose real data. Four rules, no exceptions:

1. **Dedicated demo tenant.** Never a real customer's, never "tenant 1".
2. **Seeded by a committed script.** `seeds/demo.sql`. Never hardcoded next to
   production credentials. Never in `.env.example`.
3. **Resets on a schedule**, and the UI says so. A small banner —
   *"Demo mode. Safe to explore, data resets daily."* — turns a liability into a trust
   signal.
4. **Demo role is write-scoped to its own tenant and blocked from destructive admin
   actions:** user invites, billing, export-all, tenant deletion.

## 7. Seed a real working day

A demo tenant with empty tables demonstrates nothing. Seed enough `Event` rows that
every screen has content and every chart has a shape.

One persona per role, each landing somewhere useful.

## 8. The auth screen — derive it, don't pick it

An auth screen is a negotiation: you ask a stranger for a credential. Three questions
decide its shape, and they keep deciding it for cases not listed here.

### Q1 — How did this person get here, and do they know what this is?

```
Arrived from a marketing page, already convinced ─► form only. Don't re-pitch.
Arrived cold, deep link or shared URL ───────────► form + a brief reason to continue
Was handed credentials by an admin ──────────────► form only, and say so out loud
```

The brand panel in a split-screen exists **only** to answer "what is this and why should
I continue" for someone who arrived cold. If your users always arrive already convinced,
that panel is decoration and a centred card is the better build.

### Q2 — What credential can this person actually produce, on this device, right now?

This is the question that gets skipped, and it is the one that excludes people.

```
Own device, has email, comfortable typing ───► email + password
Own phone, email unreliable or unused ───────► phone + OTP
Shared device, or a script the keyboard
  handles badly, or low literacy ────────────► numeric PIN
Provisioned by an admin, no self-signup ─────► username + password
Enterprise with an identity provider ────────► SSO, and nothing else
```

A password field assumes a keyboard, a private device, and Latin-script literacy. When any
of those does not hold — a parent paying school fees on a shared phone in their own script
— a four-dot PIN pad is not a downgrade, it is the correct control.

**Never make the user's device or literacy the reason they cannot log in.**

### Q3 — Can anyone sign up?

```
Public signup ────────► signin and signup equally likely → segmented toggle, shared fields
Invite only ──────────► signin only, plus "Have an invite? Enter your code"
Admin provisioned ────► signin only, and state it: "Admin access only · no public sign-up"
```

Stating the closed door matters. A visitor who cannot find a signup link assumes the page
is broken, not that the product is invite-only.

### The layouts these questions produce

Reference only — if your answers point elsewhere, follow the answers.

| Q1 · Q2 · Q3 | Layout |
|---|---|
| cold · typing · public | split screen, brand + 3 capability chips |
| cold · typing · public | reversed split — form left. Equally valid, pick one and hold it |
| convinced · typing · any | centred card, capped ~360–420px |
| any · typing · public signup | segmented `Sign In ｜ Sign Up` above shared fields |
| any · PIN · any | numeric keypad, four dots, backspace, "PIN forgot" |

### Micro-details — each exists because of a specific failure

| Detail | The failure it prevents |
|---|---|
| `Forgot password?` **beside the password label** | placed below the button, it is invisible at the moment of failure |
| Password reveal toggle | typos in a masked field on a phone keyboard |
| `Remember me on this device` | naming the device makes the scope honest and the choice informed |
| Inline consent under the button, with links | consent that is nowhere is not consent |
| **Language toggle inside the card** | a toggle in the nav is unreachable — the user is on the auth screen |
| "Admin access only · no public sign-up" | hunting for a signup link that does not exist |
| Container capped ~360–420px | an uncontained form stretches inputs across the viewport and reads as broken |
| Demo creds as **labelled hint text**, never a pre-filled `value` | pre-filling looks like a session leak and breaks password managers |

## Verify

This one must be automated. It is the highest-consequence test in the app.

```bash
pytest tests/test_tenant_isolation.py -q
```

For **every** business table, assert a row created under tenant A is invisible to a
tenant-B session on: read, update, delete, list, search, and export.

**Enumerate tables from the live schema at test time.** A hand-written table list
silently stops covering tables added later — which is exactly how the leak arrives.

Also assert: the demo role cannot mutate anything outside the demo tenant, and no
credential string from the seed file appears anywhere in production config.

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| One customer saw another's data | scoping in handlers instead of the data layer |
| The leak was in a table nobody thought about | a hand-written table list in the isolation test |
| Cannot add a second workspace later | tenancy unit decided after the schema |
| Demo data ends up in a real account | demo seeded into an existing tenant |
| A stranger permanently broke the demo | no scheduled reset |
| Credentials found in production config | demo creds hardcoded rather than seeded |
| Viewers can hit admin endpoints directly | permission checked in the UI, not server-side |
| Users abandon at login | credential type wrong for the device or market |

## Don't

- Don't build SSO or SAML unless asked.
- Don't build billing here.
- Don't ship a demo without the reset.
