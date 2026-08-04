---
name: legal-and-consent
description: >
  Use before a public launch, before connecting a payment provider, before app-store submission,
  or when data-protection obligations come up.
license: MIT
metadata:
  routing: conditional
  applies-when: "distribution=public&&consumed_via=pixels | collects_personal_data=true"
---

# Legal and consent

**The question this skill answers:** what are you collecting, from whom, and what did they
actually agree to?

Not legal advice — this is the engineering surface. It blocks payment onboarding, app
store review and enterprise deals, and it is always discovered under deadline. It is two
static routes and a consent record. Build it in the first pass.

---

## 1. Derive the pages from what you do, not from a checklist

```
Do you…
├─ collect ANY personal data (an email counts) ──► PRIVACY POLICY. Required.
├─ let people create accounts ───────────────────► TERMS. Required.
├─ take money ───────────────────────────────────► REFUND / CANCELLATION.
│                                                   Payment providers block without it.
├─ ship physical goods ──────────────────────────► SHIPPING / DELIVERY.
└─ operate as a business at all ─────────────────► CONTACT with a real channel.
```

Every page carries a **"last updated" date**. A policy with no date reads as abandoned,
and reviewers check.

Linked in the **footer of every page** *and* on the signup screen. A privacy policy that
exists but is unreachable from the signup flow fails review.

## 2. Derive the consent mechanism from what you are asking permission for

```
What are you asking for?
├─ Agreement to your terms ──────► unchecked checkbox with real links,
│                                   OR clear inline text at the point of action.
│                                   NEVER pre-checked — that is not consent
│                                   in several jurisdictions.
├─ Permission to track ──────────► cookie banner, and ONLY if you actually
│                                   set non-essential cookies (see §3).
└─ Permission to market ─────────► a SEPARATE, unticked opt-in.
                                    Never bundled into terms acceptance.
```

**Record every consent**: user id, timestamp, policy version, and what exactly was agreed
to. An acceptance you did not record is one you cannot demonstrate, which is the same as
not having it.

Version your policies. When terms change materially, re-prompt existing users rather than
silently swapping the file.

## 3. Derive the cookie banner from whether you need one at all

```
What cookies do you set?
├─ Only strictly necessary (session, CSRF, load balancing)
│    └─► NO BANNER. Shipping one you do not need degrades the
│        experience for nothing.
└─ Anything else — analytics, ads, any third-party tracker
     └─► banner required, and then:
         · DO NOT LOAD THE TRACKER UNTIL CONSENT IS GIVEN.
           A banner that appears after analytics already fired is
           decoration, not compliance. This is the most common
           implementation error by a wide margin.
         · Reject must be as easy as accept — two buttons, equal weight
         · Non-essential categories default to OFF
         · Store the choice with a timestamp and version; re-ask ~yearly
         · A footer link to change it later
```

## 4. Derive the data-rights endpoints from what you hold

Two capabilities, legally required in several jurisdictions and almost universally absent.

```
EXPORT — everything tied to the user, not just the profile row.
  Machine-readable (JSON or CSV, never PDF), generated async,
  delivered as a signed link that expires.

DELETION — reachable in under three clicks. Not "email us".
  · password re-entry, then type-to-confirm
  · state what is deleted, what is RETAINED and why
    (tax law usually requires keeping invoices — say so explicitly
     rather than implying total erasure)
  · soft-delete, 30-day grace, cancel link, then hard delete
  · propagate to PROCESSORS — your analytics, email, support and AI
    vendors hold that data too. Deleting only your own database
    is an incomplete deletion.
```

## 5. Derive third-party disclosure from where the data goes

List every category of processor in the privacy policy: hosting, analytics, email,
payments, error tracking, **and AI providers**.

**The AI one is what gets missed.** If user content is sent to a model provider, that
belongs in the policy. Enterprise buyers ask, and app store reviewers increasingly do too.

## 6. Age

If your terms set a minimum age, collect it at signup. Products aimed at or likely to
attract children carry substantially heavier obligations — if that is you, get actual
legal advice rather than a skill.

## 7. Keep the source in the repo

```
/privacy · /terms · /refund · /cookie-policy
```

Markdown in version control, so changes are diffable and reviewable. A policy edited in a
CMS with no history is impossible to audit later, and "when did we change that clause" is
a question that eventually gets asked.

---

## Verify

```bash
ship detect --rules legal
```

**Automated:** missing `/privacy` and `/terms`, pre-checked consent boxes, missing
deletion and export paths.

**Judgement:**

- [ ] Every page in §1 that applies to you exists, is dated, and is linked at signup
- [ ] Consent boxes unchecked; acceptance recorded with a policy version
- [ ] No cookie banner unless you actually set non-essential cookies
- [ ] If there is one: nothing loads before consent, and reject is as easy as accept
- [ ] Export and deletion both work from the UI
- [ ] Deletion propagates to processors, not just your database
- [ ] AI providers named in the privacy policy
- [ ] Marketing consent separate from terms

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| Payment provider rejects onboarding | missing refund or privacy page |
| App store review bounced | policy unreachable from signup, or undated |
| Cookie banner present, tracker fired anyway | consent gate not wired to script loading |
| Cannot prove someone agreed | consent never recorded with a version |
| Legal request you cannot fulfil | no export, or deletion that misses processors |
| Enterprise deal stalls on security review | AI providers undisclosed |
| Users report "unsubscribe doesn't work" | marketing consent bundled with terms |

## Don't

- Don't copy a competitor's privacy policy — it describes their data flows, not yours.
- Don't ship a cookie banner you do not need.
- Don't claim certifications you do not hold. SOC 2 and ISO badges are checkable.
- Don't treat this as launch-week work.
