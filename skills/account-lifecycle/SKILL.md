---
name: account-lifecycle
description: >
  Use when an app has user accounts, or when a user cannot get back in — a forgotten password,
  an unverified email, an expired session, a lost 2FA device, or a request to delete an account
  or export its data.
license: MIT
metadata:
  routing: conditional
  applies-when: "identity_model>=one authenticated user"
---

# Account lifecycle

**The question this skill answers:** what are all the ways a user can lose access to this
account, change who they are, or leave — and does a path exist for each?

Login is one screen. It is the screen everyone builds and roughly a tenth of the surface.
The rest is recovery, change, and exit — and those are what users actually hit.

---

## 1. Derive the flows from how access breaks

Walk the ways a real person loses access. Each one needs a path, or it becomes a support
ticket you cannot resolve.

```
How can this user end up locked out?
├─ Forgot the password ────────► reset by email. Non-negotiable.
├─ Lost access to the email ───► a second factor or contact, or the account is gone
├─ Lost the 2FA device ────────► recovery codes, generated at setup, shown once
├─ Session expired mid-task ───► silent refresh, or return them exactly where they were
├─ Never verified the email ───► resend, and an expired-link page that resends
└─ Admin removed them ─────────► say so plainly, don't show a generic failure
```

**The lost-2FA branch is the one that ends accounts permanently.** If you ship 2FA
without recovery codes, a dropped phone is an unrecoverable account and there is nothing
support can do.

## 2. Derive identity-change flows from what an attacker would change first

An account takeover starts by changing the recovery channel. Design against that.

```
Changing the PASSWORD
└─ require the current password. Without it, a borrowed unlocked laptop
   is permanent ownership.
   Then: invalidate other sessions, and email a notification —
   that email is how a victim finds out.

Changing the EMAIL
└─ confirm at the NEW address before switching,
   and notify the OLD address with a "this wasn't me" link.
   Until confirmed, the old email is still the login.

Changing anything sensitive with 2FA on
└─ re-prompt for the second factor.
```

## 3. Derive the reset flow from what it must not leak

```
Does the response reveal whether an account exists?
└─ It must not. Always the same message:
   "If an account exists for that address, we've sent a link."
   Differentiating turns your reset form into an account enumeration API.
```

Token: single-use, 30–60 minutes, invalidated on use. **Invalidate all other sessions on
reset** — that is the entire point when the account was compromised. Rate-limit per email
and per IP. Log the user in on success; do not send them back to a login screen.

## 4. Derive signup from what you need *now* versus later

```
Is this field needed to deliver the first unit of value?
├─ yes ──► ask at signup
└─ no ───► collect it later, at the moment its purpose is obvious
           (company address when they make the first invoice; logo at first preview)
```

Every extra signup field costs completions. Check email availability **on blur**, not
after a full submission. Offer the login link — a meaningful share of signup attempts are
returning users who forgot they had an account.

**Terms acceptance:** an unchecked checkbox with real links, and **record it** — user id,
timestamp, policy version. A pre-ticked box is not consent in several jurisdictions, and
an acceptance you did not record is one you cannot demonstrate.

## 5. Derive session handling from what the user is doing when it expires

```
What is the user doing when the token dies?
├─ Reading ──────────► refresh silently. They should never notice.
├─ Mid-form ─────────► refresh silently. If you cannot: PRESERVE what they typed,
│                       then return them to that exact form afterwards.
└─ Idle for weeks ───► clean re-login is fine and expected.
```

Short access token, longer refresh, rotate refresh on use. "Remember me" extends the
refresh window, not the access token. Show active sessions with device and last-seen, and
allow revoking one. **Detect a session invalidated in another tab** — two tabs in
different auth states produce bug reports nobody can reproduce.

## 6. Derive exit from what the law and the user both require

Both of these are legally required in several jurisdictions and both are usually absent.

```
DELETION — reachable in under three clicks, not "email us"
  · password re-entry, then type-to-confirm
  · state what is deleted, what is RETAINED and why
    (invoices usually must be kept for tax — say so, don't imply total erasure)
  · soft-delete, 30-day grace, confirmation email with a cancel link, then hard delete
  · decide now: what happens to a workspace whose only owner deletes their account?

EXPORT — one button, machine-readable (JSON/CSV, never PDF)
  · generated async, signed link, expires
  · everything tied to the user, not just the profile row
```

## 7. The emails carry the whole flow

Every transactional email here needs a plain-text alternative, a real reply-to, and
correct SPF, DKIM and DMARC.

**A password reset in the spam folder is indistinguishable from an outage** — and the
user will not tell you, they will just leave.

---

## Verify

```bash
ship detect --rules account
```

**Automated:** missing reset, change-password, verification, deletion and export paths.

**Judgement:**

- [ ] Every lockout branch in §1 has a working path
- [ ] Reset response identical whether or not the account exists
- [ ] Reset invalidates other sessions; change-password requires the current one
- [ ] Email change confirmed at the new address, notified at the old
- [ ] 2FA ships with recovery codes, or does not ship
- [ ] Session refresh never dumps a user out of a half-filled form
- [ ] Deletion and export both reachable in the UI, and both work
- [ ] Reset email tested end to end into a real inbox, not just logged

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| Support asked to reset passwords by hand | no self-serve reset, or it lands in spam |
| Accounts permanently lost after a phone upgrade | 2FA without recovery codes |
| Account takeovers | email change with no confirmation at the new address |
| "It logged me out and I lost the form" | no silent refresh, no input preservation |
| Attackers enumerate your users | reset response differs for known vs unknown emails |
| Cannot prove consent | terms acceptance never recorded with a version |
| Legal request you cannot fulfil | no export, or deletion that misses processors |
| Users churn silently | no deletion path, so they just stop and resent you |

## Don't

- Don't force scheduled password rotation. It produces `Password1!`, `Password2!`.
- Don't cap password length below 64, and don't block paste.
- Don't use security questions — a weaker password the user published on social media.
- Don't build 2FA before reset works.
