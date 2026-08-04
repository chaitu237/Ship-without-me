---
name: app-shell-composition
description: >
  Use when building the logged-in surface of an app with more than one module, or when the app
  feels like several different apps stitched together.
license: MIT
metadata:
  routing: conditional
  applies-when: "destinations>1"
---

# App shell composition

**The question this skill answers:** what stays put as the user moves between modules —
and what is each module allowed to decide for itself?

Get that boundary wrong and N modules become N apps. That is the only failure this skill
exists to prevent, and every rule below serves it.

---

## 1. Derive the shell from what must not move

```
As the user moves between modules, what must stay in exactly the same place?
├─ How they get anywhere else ──────► navigation. Never moves, never reorders.
├─ Who they are, which tenant ──────► top bar identity. Always visible.
├─ Whether the system is healthy ───► one status indicator, in the shell.
│                                      NOT repeated per page.
└─ Where they are right now ────────► active nav state + page title.
```

Everything in that list belongs to the shell. **Everything else belongs to the module.**

The content area scrolls; the shell does not. A sidebar that scrolls away is a navigation
the user has to hunt for.

## 2. Derive what modules may decide

```
Is this decision visible on more than one module's screen?
├─ yes ──► the SHELL owns it. Table density, form layout, empty-state style,
│           spacing, loading treatment, button hierarchy.
└─ no ───► the module owns it. Its specific fields, its specific actions,
            its specific charts.
```

**One table component. One form component. One set of state components.** If a module
defines its own, that is a bug — fix the shared one rather than forking it.

This rule is the whole skill. A module that hand-rolls its own table will get the density
subtly wrong, and the app will read as assembled rather than designed.

## 3. Derive the navigation shape from how many destinations there are

```
How many top-level destinations?
├─ ≤5 ──────► flat list. No grouping, no icons-only mode needed.
├─ 6-12 ────► grouped sidebar with section labels.
└─ >12 ─────► you have too many. Either the app is several apps,
              or some of those are filters on one list, not destinations.
```

Role-gate it: a viewer should not see admin entries greyed out, they should not see them.

## 4. Derive the dashboard tiles from what the primary user checks first

```
What does the primary user look at before doing anything else?
└─ THAT is your tile row. Three or four. Never eight —
   eight tiles means nothing is important.
```

Each tile: the number, its label, and a delta against the previous period. A number with
no comparison is trivia; the delta is what makes it a decision.

Every tile is a query over the event ledger (see `vertical-business-os`). If a tile needs
its own table, the data model is wrong.

## 5. Derive the greeting from whether the app is used daily

Someone opening this every morning benefits from "Good morning, Priya · Tuesday
14 March". It costs nothing and it makes the app feel addressed to a person rather than
to a seat.

An app used monthly does not need it.

## 6. Responsive: the shell is what breaks first

```
Below 768px, navigation cannot be persistent. Choose:
├─ ≤5 destinations ──► bottom bar. Thumb-reachable, always visible.
└─ >5 ───────────────► drawer behind a menu button.
```

Primary action moves to the thumb zone. Tables become cards (`list-and-table`). Stat
tiles stack two-up, not four-across.

## 7. Delegated

- Tables and lists → **`list-and-table`**
- Forms → **`forms-and-validation`**
- Loading, empty, error → **`states-and-feedback`**
- Tokens → **`design-system-commit`**

This skill only insists those live in the shell as **shared components**, not per module.

---

## Verify

```bash
ship detect --rules states,forms
```

**Automated:** list views with no empty state, inputs without labels, missing error
boundary.

**Judgement:**

- [ ] Every module route renders inside the same shell component
- [ ] Nothing in the shell moves or reorders between modules
- [ ] No module defines its own table, form, or empty state — grep for duplicates
- [ ] 3–4 stat tiles, each with a delta
- [ ] One status indicator, in the shell
- [ ] Navigation role-gated by hiding, not disabling
- [ ] At 375px: nav reached the thumb zone, tables became cards

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| "It looks like five different apps" | modules deciding things the shell should own |
| Users hunt for navigation | shell scrolls with content |
| Density feels inconsistent | forked table or form components |
| Dashboard tells nobody anything | tiles without deltas, or eight of them |
| Nav has 15 items | destinations that are really filters on one list |
| Viewers see options they cannot use | role-gating by disabling instead of hiding |
| Unusable on a phone | shell not redesigned below 768px, only shrunk |

## Don't

- Don't build a publishable component library. Build what these modules need.
- Don't design charts here — delegate, and derive the palette from `--accent`.
- Don't add a settings page nobody asked for.
- Don't put a second primary button on a screen.
