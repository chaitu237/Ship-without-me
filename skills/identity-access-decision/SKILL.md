---
name: identity-access-decision
description: >
  Use before adding login, accounts, roles, or tenancy to anything, and whenever a build is
  about to include auth by default. Use when deciding whether a product needs identity at
  all, and which boundary is the smallest one that satisfies the reason.
license: MIT
metadata:
  routing: conditional
  applies-when: "identity_model!=none"
---

# Identity and access decision

**The question this skill answers:** does this product need to know who the user is — and
if so, what is the smallest boundary that satisfies the reason it needs to know?

Auth is the most commonly added thing nobody asked for. It arrives by habit, brings a
signup screen, a password reset, a sessions table and a deploy target, and for a large
class of products it protects nothing, because there is no second person and nothing
leaves the device.

## Derive it

Identity is required by a **reason**, never by convention. Find the reason first:

```
Does anything here need to know WHO?
├─ nothing is private, shared, synced, owned, paid for, or permissioned
│   └──────────────────────────────────────────► NONE
│        no login, no accounts, no users table. The device is the boundary.
│        a local music player, a calculator, an offline notes app
│
├─ several people use one device and want their own view, but trust each other
│   └──────────────────────────────────────────► LOCAL PROFILE
│        a name and preferences in local storage. No credential, no server.
│        a family recipe app, a shared kiosk, a practice tracker
│
├─ one person's data must follow them across devices
│   └──────────────────────────────────────────► ONE AUTHENTICATED USER
│        one credential, one account, sync. No roles, no tenancy, no invites.
│        a personal budget, a journal with backup
│
├─ people who know each other share one body of data
│   └──────────────────────────────────────────► SHARED ACCOUNT / HOUSEHOLD
│        one space, several members, no isolation between them
│        a household chore board, a two-person shop
│
├─ a group collaborates and membership must be managed
│   └──────────────────────────────────────────► WORKSPACE
│        invites, roles, removal. One customer, one space.
│
├─ several customers who must never see each other share infrastructure
│   └──────────────────────────────────────────► MULTI-TENANT
│        tenant_id everywhere, enforced at the data layer. → tenant-auth-demo
│
└─ strangers participate without accounts, and abuse is possible
    └─────────────────────────────────────────► PUBLIC ANONYMOUS
         rate limits, moderation, provenance. Identity is a token, not a person.
```

**Take the first branch that satisfies the reason, not the one that anticipates growth.**
Each rung down costs screens the user did not ask for and a surface that can leak.

## The reasons, so you can check your own answer

Identity is genuinely required by exactly these:

| Reason | Smallest boundary that satisfies it |
|---|---|
| Privacy — someone must not see it | whoever the "someone" is defines the boundary |
| Sharing — another person must see it | shared account, or workspace |
| Sync — the same data on two devices | one authenticated user |
| Ownership — "mine" must be meaningful to a server | one authenticated user |
| Payment — money attaches to an account | one authenticated user |
| Permissions — some may act, others may not | workspace |

If you cannot name which row applies, the answer is **NONE**.

## Micro-details, each preventing a specific failure

- **"We'll need accounts eventually" is not a reason.** Building for it now costs the
  screens now and still gets redesigned when the real requirement arrives.
- **Local profile is not auth.** No password, no reset, no verification. Adding a
  credential to a local profile creates a recovery problem where none existed.
- **Sync is the usual real reason, and it is often sync alone.** One authenticated user
  answers it. Roles and tenancy do not follow automatically.
- **A demo tenant only exists where tenancy does.** Seeding a demo account into a product
  with no accounts is a login screen protecting nothing.
- **Escalating the boundary later is normal and cheap; de-escalating is not.** Users have
  accounts by then, and removing auth means migrating data out of them.
- **Anonymous participation still needs abuse controls.** No identity does not mean no
  limits — rate limiting and moderation replace the account, they are not skipped with it.

## Verify

Automated:
- If the boundary is NONE: no auth routes, no users table, no session handling exists
- If LOCAL PROFILE: no credential is stored anywhere, no network call carries a user id
- If ONE USER and above: the full account journey exists (`account-lifecycle`)
- If MULTI-TENANT: cross-tenant reads are proven impossible at the data layer

Judgement:
- Which reason from the table applies? If none can be named, the boundary is too high.
- Would a user be surprised to be asked to sign in for this?

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| A local, single-device tool has a signup screen | Boundary chosen by convention, not by a reason |
| Login exists but nothing behind it differs per user | No real reason applied; NONE was correct |
| Password reset was built for a product with no server | Local profile mistaken for authentication |
| A users table with one row, forever | Sync or ownership assumed, neither required |
| Roles exist that everyone has | Workspace chosen where shared account was enough |
| `tenant_id` on tables of a single-customer product | Multi-tenant chosen for a workspace problem |
| Users cannot be removed from a shared space | Shared account chosen where workspace was needed |
| Anonymous product overrun with junk | Public anonymous chosen without the abuse controls it requires |

## Don't

- Don't add auth because the stack template had it.
- Don't reach for tenancy before there are two customers who must not see each other.
- Don't build a demo tenant where there are no tenants.
- Don't treat "eventually multi-user" as a reason to start multi-user.
