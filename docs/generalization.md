# Generalization

A skill distribution generalizes when it produces the right architecture for a product its
author never considered. The failure mode is not obvious in the output — the product looks
finished. It shows up as **things that are there and should not be**: a login screen on a
single-device tool, a database for state the device already owns, a marketing page for
something nobody will visit.

## Why labels cannot carry this

Eight product shapes are useful for framing value and first use. They cannot select an
architecture, because two products under one label share almost nothing technical:

| Both are "personal products" | Music player | Habit tracker |
|---|---|---|
| Who owns the truth | the device runtime | local storage |
| How time behaves | continuous | static |
| Content source | user-owned import | user-created |
| Identity boundary | none | none, until sync |
| Core capabilities | playback, queue, import | streaks, reminders |

Branching on the label gives both the same build. Branching on the properties gives each
its own — which is the whole difference between a derivation and a catalogue.

## What selects the build

Seven properties, derived with `product-profile`, written to `.ship/PROFILE.json`:

```text
how it's reached · where value happens · who owns the truth · how time behaves ·
where content comes from · what identity boundary exists · what loop proves it works
```

**"How it's reached" — the binding surface — is the one that stops a rendered-UI floor being
handed to a CLI, a library, or a report.** A viewport width and a focus ring are what
discoverability *means* for pixels, not universal truths.

`core_capabilities` is the load-bearing field. It names what the product must **do**, never
what it is about — `audio playback`, not `music` — because a capability maps to a skill and
a check, while a subject maps to nothing.

## The core is small on purpose

Of 35 skills, **3 run for every product**. The rest are gated:

```bash
npm run plan .ship/PROFILE.json
```

```text
core         product-profile · core-interaction-contract · phase-execution
conditional  runtime-engine-state · continuous-media · list-and-table
             design-system-commit · layout-patterns · frontend-architecture
gaps         (none)
```

Design tokens, layout archetypes and rendered async states are **not** core. They were,
until an end-to-end CLI build refused them by name — *"binding surface is terminal, not
pixels"* — which was correct and the registry was not. They are what the floor *means* for a
rendered surface, so they are gated on one.

A property the profile says is absent earns nothing. That is the entire mechanism.

## The negative assertions are the valuable ones

`npm run test:routing` checks six unrelated shapes. That a music player selects
`continuous-media` is unsurprising. That it selects **no** auth, **no** schema, **no**
backend and **no** landing page is the claim worth testing:

| Shape | Selects | Correctly avoids |
|---|---|---|
| local CLI tool | 5 | 12 |
| published library | 4 | 13 |
| offline notes, single device | 9 | 7 |
| local music player | 10 | 8 |
| restaurant menu catalogue | 14 | 6 |
| multi-tenant repair shop ops | 21 | 2 |

It runs in milliseconds with no model and no API key, so it is a real gate rather than an
aspiration.

## A capability nobody covers is normal

Products need things nobody enumerated — 3D, on-device inference, hardware buses, document
generation, spatial surfaces, signing, simulation. The conditional list is **worked examples
of a rule, not the set of possibilities**.

```text
required capabilities − provided by existing code − provided by an available skill = uncovered

essential to first value?
├─ no ──► defer, log as Not now
└─ yes ─► write .ship/gaps/<capability>.md with the same discipline a skill gets,
          define the test, then implement
```

**Routing an uncovered capability to the nearest skill that happens to exist is the
failure.** It is how a product whose value is continuous, device-owned playback becomes a
CRUD list of records that never make a sound: `database-schema` existed, a media path did
not, and the nearest branch won.

A gap that survives several unrelated products has earned promotion into `skills/`. One that
appears once stays project-local. That is the route from an unseen use case to a reusable
capability without the package growing a template per industry.

## Measuring it on a real host

Baseline and candidate, same prompt, same host, different skill versions. The artefacts are
the measurement — `.ship/PROFILE.json` records what was selected **and what was skipped,
with a reason for each**, so a mis-route is visible without reading the code.

Verify the loop, not the page. A music player that renders a track list and produces silence
passes every static check there is; only `core-interaction-contract`'s evidence — the runtime
reporting that it played — can fail it.
