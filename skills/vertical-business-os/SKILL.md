---
name: vertical-business-os
description: >
  Use when building an all-in-one operations platform for one specific trade, or when a request
  names three or more operational modules at once.
license: MIT
metadata:
  routing: conditional
  applies-when: "value_location=operational records"
---

# Vertical business OS

**The question this skill answers:** what does this operator do every day, and what single
record captures it?

Answer that and the schema, the dashboard, the module list and the AI layer all fall out.
Get it wrong and you ship six disconnected CRUD screens that the operator abandons for
the spreadsheet they were already using.

---

## 1. Derive the operator, not the industry

```
Who opens this app, and what are they doing when they open it?
├─ Name a PERSON and a MOMENT ──► "a fuel dealer closing the evening shift"
│                                  "a clinic receptionist checking today's list"
└─ Named a SECTOR instead? ─────► you have not answered. "The energy sector"
                                   does not open an app. Go back.
```

Then ask what they use today. It is almost always a notebook, a spreadsheet, or a group
chat — **that is your competitor**, not another app, and it works offline with no login.

## 2. Derive the ledger from the daily job

```
What single event happens over and over in this business?
   a shift closes · a job is completed · an order ships · a patient is seen
   · stock moves · a payment lands

└─ THAT is your Event table, and it is the spine of everything.
```

Every winning app in this shape has the same five tables hanging off that event:

```
Tenant ──< User ──< Role
   │
   ├──< Party      customer | vendor | staff — ONE table, one type column
   ├──< Item       product | service | SKU
   └──< Event      the daily job, APPEND-ONLY
```

`Event` is load-bearing:

- **Reporting becomes a query, not a seventh module.**
- **The audit trail is free.**
- Corrections are new rows, so history is never destroyed by a bug.

`Party` is one table because the same phone number is frequently a customer, a vendor,
*and* staff. Three tables means triple entry and permanent reconciliation.

## 3. Derive the module set from what happens daily

```
For each candidate module: does the operator touch it EVERY day?
├─ yes ──► v1. Maximum three.
└─ no ───► v2. Write it in the roadmap and move on.
```

| Module | Hangs off | Include when |
|---|---|---|
| Ops ledger | `Event` | always — this is the spine made visible |
| Dashboard | `Event` | always, but as a *view*, never a module |
| CRM / pipeline | `Party` | they chase customers |
| Bookings | `Event` | they sell time |
| Inventory | `Item` + `Event` | they hold goods |
| Invoicing | `Party`+`Item`+`Event` | they send bills |
| Compliance / SOP | `Event` | the trade is regulated |
| HR / attendance | `Party(staff)` + `Event` | they have a team |

A focused three-module v1 gets used daily. A six-module v1 becomes six half-finished
screens, and the operator goes back to the notebook.

## 4. Derive the dashboard from the ledger

Every tile is a query over `Event`. Revenue this week, jobs open, stock below reorder,
attendance today — one table, different filters.

**If a metric needs its own table, the spine is wrong.** Fix the spine, not the metric.

## 5. Derive the AI layer from what the operator has no time to notice

```
What is true in their data that they would never spot themselves?
   a customer who has gone quiet · stock that always runs out on Fridays
   · a shift that is always short · an expense trending up

└─ THAT is the AI feature. It reads their own Event history and tells them.
```

Route it through **`grounded-ai-feature`**. An ungrounded chat box bolted to an ERP gets
clicked once and never again, because the operator cannot check its answers against
anything.

## 6. The escape hatch is not optional

CSV import and export on every list.

The operator has three years of history in a spreadsheet and will not retype it. **No
import path, no adoption** — this is the single most common reason a well-built ops app
dies with zero users.

---

## Verify

```bash
ship detect --rules spine,schema
```

**Automated:** tables without `tenant_id`, float money columns.

**Judgement:**

- [ ] The operator is a person doing something at a moment, not a sector
- [ ] The daily job is named, and it is the `Event` table
- [ ] `Event` is append-only, with no `UPDATE` path in the code
- [ ] `Party` is one table with a type column
- [ ] Exactly three modules in v1, each touched daily
- [ ] Every dashboard tile resolves to a query over `Event`
- [ ] CSV import exists and has been tested with a real messy file

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| Feels like six separate CRUD screens | modules built before the spine |
| Reporting needs its own tables | the daily job was not modelled as `Event` |
| Same person entered three times | `Party` split into customer/vendor/staff |
| "What did this look like last month?" unanswerable | ledger is mutable |
| Built, launched, nobody uses it | no import path — their history is still in the spreadsheet |
| Operator uses two of six modules | v1 scoped by ambition rather than by daily use |
| The AI feature was clicked once | ungrounded, so its answers cannot be checked |

## Don't

- Don't build all eight modules. Three, then watch which two they actually open.
- Don't build a general ERP framework. One trade, one operator, one spine.
- Don't design the UI here — that is `app-shell-composition`.
- Don't add a module because a competitor has it.
