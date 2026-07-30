---
name: product-profile
description: >
  Use before choosing architecture on any build, and whenever deciding which skills, data
  model, or checks a product needs. Use when a product does not fit the usual shapes, or
  when a build is about to add auth, a backend, or a schema by habit.
---

# Product profile

**The question this skill answers:** what is true about *this* product that determines how
it must be built?

Not "what kind of app is this closest to". Labels are categories of solution, and branching
on them is how a product gets built like the nearest thing you have seen instead of like
itself. A music player and a habit tracker are both "personal products" and share almost no
technical requirement. The properties separate them; the label does not.

## Derive it — six properties

```
Where does value happen?
├─ on one screen ──────────────► render, read, act. Often the whole product.
├─ through a sequence ─────────► steps, resumability, partial progress
├─ in a continuous interaction ► an engine owns a timeline; UI observes it
├─ in a background run ────────► trigger, run, retry, observability
├─ between several people ─────► presence, ordering, conflict
├─ in a physical outcome ──────► the external record is the proof
├─ in an answered question ────► provenance, freshness, uncertainty
└─ in consumed content ────────► delivery, rights, session
```

```
Who owns the truth?
├─ a local component ──────► ordinary state
├─ the device runtime ─────► audio, video, camera, geolocation, canvas, bluetooth,
│                            workers, serial. The runtime is authority; UI subscribes.
├─ local persistent storage ► versioned, migratable, survives reload
├─ an app server ──────────► the network is a failure mode, not a detail
├─ an external service ────► it will be down; decide what happens then
├─ a human workflow ───────► the system records what people already do
└─ a shared live session ──► several writers, one ordering problem
```

```
How does time behave?
  static · request/response · transactional · continuous · real-time ·
  scheduled · long-running · event-driven
```

```
Where does the essential content come from?
├─ user-created ───────► empty first-run is the design problem
├─ user-owned import ──► ingestion, validation, rights, revocation
├─ generated demo ─────► must FUNCTION, not just describe (see below)
├─ open dataset ───────► licence, attribution, staleness
├─ licensed provider ──► cost, terms, and what happens at the cap
├─ external API ───────► rate limits and outage behaviour
├─ community ──────────► moderation and provenance
└─ a sensor or device ─► calibration, permission, absence
```

```
What identity boundary exists?
  none · local profile · one authenticated user · shared household · workspace ·
  multi-tenant · public anonymous          → derive it with identity-access-decision
```

```
What observable loop proves it works?
  first action → promised outcome, in steps you could watch someone perform
                                          → write it with core-interaction-contract
```

## Write it down

`.ship/PROFILE.json`, validated against `schemas/profile.schema.json`. **`core_capabilities`
is the load-bearing field** — it is what selects skills and what exposes the capability
nobody covers. Name what the product must *do*, never what it is about: `audio playback`,
not `music`.

## Resolve the capability map, including what you cannot cover

```
required capabilities (from the profile)
  − already provided by existing code
  − provided by a skill you actually have
  = uncovered
```

```
Is the uncovered capability essential to the first-value event?
├─ no ──► defer it. Log it as Not now.
└─ yes ─► CAPABILITY GAP — do not improvise past it
           1. check what the platform and existing libraries already provide
           2. read primary documentation, not blog summaries
           3. write .ship/gaps/<capability>.md with the same discipline a skill gets:
              generating question, state model, failure modes, recovery
           4. define the test that proves it works
           5. only then implement
```

**A gap is a normal, reportable outcome.** Products need capabilities nobody enumerated —
3D, on-device inference, hardware buses, document generation, spatial surfaces, signing,
simulation. Having no skill for one is expected.

**Forcing an uncovered capability through the nearest skill you do have is the failure.**
That is how a product whose value is continuous, device-owned playback becomes a CRUD list
of records that never make a sound: `database-schema` existed, a media path did not, and the
nearest branch won.

If the gap is essential and cannot be closed, the outcome is `blocked: capability` — name
the capability and what was tried.

## Micro-details, each preventing a specific failure

- **Derive the profile before the plan, not after.** Afterwards you will write a profile
  that justifies what you already decided.
- **Two state owners for one value means one of them is a cache.** Say which, and say who
  invalidates it.
- **"Generated demo" content must function.** A seeded track that will not decode, a map
  dataset that will not render, an example that will not run — these are broken products
  wearing full-looking content. Descriptive is enough only when the value is descriptive.
- **Identity `none` is a real answer and usually the right one.** Most single-device tools
  need no accounts at all.
- **Record connectivity and criticality too.** Offline-capable changes the storage story;
  irreversible changes the verification bar from "usually works" to "always works".
- **A capability named after the domain hides the requirement.** "Music" tells you nothing;
  "audio playback, queue persistence, file import" tells you three skills and three checks.

## Verify

Automated:
- `.ship/PROFILE.json` exists and validates against the schema
- Every entry in `core_capabilities` maps to a selected skill, existing code, or a file
  under `.ship/gaps/`
- No skill was selected whose gating property is absent from the profile

Judgement:
- Would someone who knows this domain recognise the value location and the state owners?
- Does any capability read like a category rather than a thing the product must do?

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| A local single-device tool has login and a users table | Identity assumed, never derived |
| A schema and API exist for state the device already owns | State owner not asked; server assumed |
| Product built as records and lists, but its value is an interaction | Value location wrong, or capability routed to the nearest branch |
| A landing page for an internal or personal tool | Distribution not in the profile |
| Demo content lists items that do nothing when used | Content source marked descriptive when it had to function |
| Checks all pass, core capability absent | Capability never named, so nothing selected it or tested it |
| The profile matches the plan suspiciously well | Written after the architecture was chosen |
| An unlisted capability silently became a CRUD screen | Gap protocol skipped in favour of the nearest available skill |

## Don't

- Don't branch on what the product resembles. Branch on what is true about it.
- Don't fill a capability gap by picking the closest skill you happen to have.
- Don't let a label carry an architectural decision.
- Don't treat "no skill covers this" as a reason to stop deriving — it is where the derivation matters most.
