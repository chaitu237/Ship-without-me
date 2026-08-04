---
name: initial-content-bootstrap
description: >
  Use when an app is empty on day one and needs records, listings, documents, or examples
  before it is useful to anyone, or when asked to acquire or import data to fill it.
license: MIT
metadata:
  routing: conditional
  applies-when: "content_source!=user-created&&consumed_via=pixels"
---

# Initial content bootstrap

**The question this skill answers:** where does the first useful content come from, and
what makes it trustworthy enough to show a stranger?

Every app that depends on content is useless until it has some, and the request always
arrives as a quantity — *"fill it with records"*, *"import everything"*, *"scrape it"*.
Quantity is the wrong target. **The target is enough relevant, trustworthy content that
one real person succeeds once**, plus a way for it to stay true afterwards.

Applies to listings, profiles, records, documents, catalogues, examples, locations, jobs,
events, courses, datasets — anything where an empty app is a useless app.

---

## 1. Derive the source from who has a right to provide it

Walk down. **Stop at the first rung that can produce enough for one successful journey** —
not the first that can produce the most rows.

```
Who legitimately has this content?
├─ The user themselves ──────────► their spreadsheet, export, or files.
│                                   FASTEST and safest. It is also the real
│                                   data model — build against it rather than
│                                   inventing a schema and forcing a mapping.
├─ The people it describes ──────► they enter it. Slowest to fill, highest
│                                   trust, zero rights risk. Often the endgame
│                                   even when it is not the start.
├─ An official API or dataset ───► check the licence and the permitted use,
│                                   not just whether it responds.
├─ A partner or association ─────► one conversation can beat months of scraping,
│                                   and it comes with permission attached.
├─ You, by hand, for the first
│  N records ────────────────────► entirely legitimate. Manual seeding for a
│                                   pilot is a strategy, not a failure.
├─ Generated or synthetic ───────► only for DEMO data, clearly labelled.
│                                   Never as real content.
└─ Taken from a third party
   without permission ───────────► not a rung. Do not.
```

**Do not confuse "technically retrievable" with "permitted to use".** Robots files, terms
of service, database rights and personal-data law all apply, and they apply to the person
shipping the app. If the rights are unclear, the answer is a different rung.

## 2. Derive the pilot from one successful journey

Not "how many records" — **how narrow can the first slice be and still let one person
succeed?**

```
Pick the smallest scope where success is possible:
   one geography OR one category OR one team OR one time period
   × enough records that a realistic query returns something useful
   × one complete journey: find → evaluate → act
```

A small, dense, correct set beats a large, thin, stale one every time — because a user who
searches once and finds nothing does not search twice. Density inside a narrow scope is
what produces the first success.

**Expand only after the pilot shows two things:** that people succeed, and that you can
afford the upkeep. The second is what kills these projects.

## 3. Derive the quality gate from what a wrong record costs

```
If a published record is wrong, what happens?
├─ Mild embarrassment ─────────► publish, let users report errors
├─ A wasted trip or a failed
│  contact ────────────────────► validate the actionable fields before publishing
├─ Money lost ─────────────────► verify, and show the verification state
└─ Someone harmed, or a legal
   exposure ──────────────────► human review before anything is visible
```

Whatever the gate, the pipeline is the same shape:

```
acquire → record PROVENANCE → normalise → deduplicate → validate
        → score confidence → gate → publish → correct → refresh
```

Two steps in that chain are the ones always skipped, and both are unrecoverable later:

**Provenance.** Store where every record came from and when, per record. Without it you can
never answer "why does it say this", never honour a takedown, and never tell good sources
from bad ones.

**Confidence.** Store how sure you are, and **show it**. A record displayed as fact when it
was inferred is the fastest way to lose a user's trust permanently.

## 4. Never present inferred content as verified

```
Is this field something you were told, or something you worked out?
├─ told, by someone with authority ──► show it plainly
├─ derived, high confidence ─────────► show it, marked as unconfirmed
├─ derived, low confidence ──────────► do not show it. Store it, use it to
│                                       prioritise verification, keep it internal
└─ absent ───────────────────────────► show it as absent. NEVER fill a gap
                                        with a plausible guess.
```

**Filling an empty field with something likely is the single most damaging thing you can do
here.** It is undetectable to the user, unfalsifiable later, and it poisons every metric
built on top of it.

## 5. Derive the correction path from who notices errors first

Content decays. Something must pull it back toward true, and the cheapest force is the
people it affects.

```
Who will notice this record is wrong?
├─ The subject of the record ───► let them claim and correct it. This is the
│                                 strongest mechanism there is — it converts
│                                 seed content into maintained content, and it
│                                 gives you consent you did not previously have
├─ The user who acted on it ────► one-tap report, and a queue someone reads
└─ Nobody, until it matters ────► you own scheduled revalidation. Budget for it.
```

**A report button with no queue behind it is worse than none** — it promises review that
will not happen. Same for a claim flow nobody processes.

## 6. Track whether the content is actually working

Row count is not a metric. These are:

```
- Searches that returned something useful   ← the only one that matters on day one
- Duplicate rate
- Actionable-field validity (does the contact method actually work?)
- Freshness distribution — how old is the median record?
- User-reported error rate
- Claim / correction rate
- Cost per maintained record per month      ← the number that decides sustainability
```

The last one is what tells you whether this scales or quietly bankrupts the project in
attention.

---

## Verify

```bash
ship detect --rules schema,api
```

**Automated:** tenant scoping, pagination on the endpoints that serve this content.

**Judgement:**

- [ ] The source rung is named, and the right to use it is established in writing
- [ ] Pilot scope is narrow enough that a realistic query returns something useful
- [ ] Provenance stored per record: source and date
- [ ] Confidence stored, and surfaced in the UI where it matters
- [ ] No inferred value is displayed as verified; no gap is filled with a guess
- [ ] A correction path exists **and** someone owns the queue
- [ ] Cost per maintained record per month has been estimated
- [ ] One real person completed the journey against the pilot set

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| Thousands of records, nobody finds anything | optimised for count instead of density in a narrow scope |
| Users searched once and never returned | pilot scope too broad, so results were thin |
| A takedown request you cannot action | no provenance stored per record |
| Users stopped trusting the whole app | inferred data shown as verified |
| Content correct at launch, wrong within months | no correction path, no revalidation owner |
| Legal problem after launch | rights assumed from technical accessibility |
| Maintenance quietly consumed the team | cost per record per month never estimated |
| Reports pile up unread | report button shipped without a queue |

## Don't

- Don't optimise for row count.
- Don't fabricate a field, ever — not even a plausible one.
- Don't treat retrievability as permission.
- Don't scale past the pilot before the upkeep cost is known.
- Don't ship a claim or report flow with no owner.
