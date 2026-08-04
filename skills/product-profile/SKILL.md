---
name: product-profile
description: >
  Use before choosing architecture on any build, and whenever deciding which skills, data
  model, or checks a product needs. Use when a product does not fit the usual shapes, or
  when a build is about to add auth, a backend, or a schema by habit.
license: MIT
metadata:
  routing: core
---

# Product profile

**The question this skill answers:** what is true about *this* product that determines how
it must be built?

Not "what kind of app is this closest to". Labels are categories of solution, and branching
on them is how a product gets built like the nearest thing you have seen instead of like
itself. A music player and a habit tracker are both "personal products" and share almost no
technical requirement. The properties separate them; the label does not.

## Derive it — seven properties

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

```
How is it reached — its binding surface?
├─ pixels, through rendered UI ────► a person, mediated by rendering. Theme, layout,
│                                    accessibility tree, viewport all apply here —
│                                    and ONLY here.
├─ a terminal, through argv/exit ──► a person or another program, mediated by a process
│                                    boundary. Floor: exit codes, --help, --json for the
│                                    program case, no blocking prompt on a non-TTY pipe.
├─ an import, through a module ────► another program, mediated by types and exports.
│                                    Floor: standalone type-check, semver, a doc example
│                                    that actually executes, no test files in the tarball.
├─ a network call, through a wire ─► another program, via a versioned contract. Floor:
│                                    schema stability, meaningful error codes, not a screenshot.
├─ a schedule, nobody watching ────► mediated by logs and alerts, never a request-response.
│                                    Floor: idempotent replay, checksum parity across two
│                                    runs of the same input, drift alerting.
├─ a physical system ──────────────► actuation or a sensor signal. Floor: calibration,
│                                    a real-world measurement, defined failure behaviour
│                                    when the physical world disagrees with the model.
└─ a reader, through a document ───► a person, mediated by claims and citations, no
                                     runtime at all. Floor: every load-bearing claim
                                     traces to a source; at least one number is
                                     independently recomputed, not merely restated.
```

**This stops a rendered-UI floor from being applied to a CLI, a library, or a report.**
"Theme," "375px wide," "focus ring" are not universal rules demoted to a checklist — they
are what the floor *means* when the surface is pixels, and a category error anywhere else.
The floor itself — boots, fails intelligibly, is discoverable, honestly reported — is
universal; its manifestation is derived here and in `core-interaction-contract`.

One surface can serve two consumers at once, and that is the requirement, not a conflict to
resolve — a CLI piped into `jq` is read by a program, run interactively it's read by a
person, which is why it needs both plain and `--json` output. A build can also genuinely
*have* more than one binding surface — see **Composed deliverables** below, which exists so
that case doesn't collapse to whichever surface got derived first.

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

## Composed deliverables — when one build genuinely has several binding surfaces

Do not force a library-plus-CLI-plus-docs-site brief into one profile. That is not one
product wearing three hats; it is three deliverables shipped together, and each needs its
own first-value contract, its own floor, and its own evidence:

```
one brief, several binding surfaces
  ├─ library  (import)    → its own PROFILE, its own floor: types, semver, doc example runs
  ├─ CLI      (terminal)  → its own PROFILE, its own floor: exit codes, --help, --json
  └─ docs site (pixels)   → its own PROFILE, its own floor: the web floor below, in full
```

Write `.ship/PROFILE.json` as a **list** when this is genuinely the case, one entry per
binding surface, each with its own `core_capabilities`. Verify each independently — a
passing docs-site build says nothing about whether the library it documents type-checks.

Not the same move as logging a shape as "Not now" — that is phasing, for a shape deferred
to a later brief. This is for parts shipping *in the same run*; collapsing them is how a CLI
silently inherits a database schema, or a library a landing page.

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
- **`criticality: irreversible` is not decoration — it overrides defaulting.** It is what
  distinguishes an unresolved *preference* (default it, log it, keep moving) from an
  unresolved *fork whose effect leaves the repo's control* (infrastructure state, a live
  payment, a physical actuation, data sent somewhere the run cannot undo). The second kind
  gets a stop receipt or an explicit policy gate every time, regardless of how small the
  change looks — "one resource," "one row," "one message" is not the same question as
  "reversible in minutes" once the effect is outside version control. See the orchestrator's
  contract for where this is actually enforced.
- **A worked convention is not the same thing as a derived one, and both are needed.** This
  property tells you a CLI needs `--help` and exit codes; it does not tell you what the
  conventional flag names or help-text format are. Domain convention — the accent-hue
  table, the landing-page skeleton, a CLI's own conventions — still has to be looked up or
  known, the same way it always did. The property picks which conventions apply; it does
  not replace them.
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
| A CLI or library was scaffolded with Vite, Tailwind, and a theme | Binding surface never derived; the web floor applied by default |
| `ship detect` passed on a library with no types, no tests, no README | Rules fired only for pixel-bound surfaces; nothing checked the actual deliverable |
| An infrastructure change was defaulted-and-logged like a CSS token | `criticality` recorded but never checked before defaulting |
| A library-plus-CLI-plus-docs brief shipped only the docs site | Composed deliverables flattened into one profile; the others logged as "Not now" |
| A report's central number was never independently recomputed | Evidence collapsed to `manual_judgement` for a written-artifact deliverable |

## Don't

- Don't branch on what the product resembles. Branch on what is true about it.
- Don't fill a capability gap by picking the closest skill you happen to have.
- Don't let a label carry an architectural decision.
- Don't treat "no skill covers this" as a reason to stop deriving — it is where the derivation matters most.
