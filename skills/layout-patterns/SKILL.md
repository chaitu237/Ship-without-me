---
name: layout-patterns
description: >
  Use before styling any screen, when a page feels empty or cramped, or when a screen is fully
  styled and still reads wrong.
---

# Layout patterns

Layout is decided before styling. A well-tokenized page with the wrong structure still
reads as amateur; a plain page with the right structure reads as finished.

**The question this skill answers:** what is the user's relationship to the content on
this screen — and therefore how should it be arranged?

---

## 1. Derive the archetype

Not "is this a marketplace or a dashboard". Ask what the user is **doing**:

```
The user is…
├─ COMPARING many equivalent things ──────► uniform grid, equal-weight cells
│     they scan, they don't read. Anything that varies between cells is noise.
│
├─ BEING PERSUADED about one thing ───────► single centred column, vertical rhythm
│     they read top to bottom, once. Sequence carries the argument.
│
├─ OPERATING a system they return to ─────► persistent shell, changing content area
│     navigation must stay put. Moving furniture costs them every visit.
│
├─ COMPLETING one focused task ───────────► single column, everything else removed
│     any second thing on screen is a way to fail at the first.
│
└─ MONITORING something that changes ─────► dense fixed regions, no scroll
      they glance. If it needs scrolling, it isn't a monitor.
```

If two apply, the screen is doing two jobs. **Split it** — that is almost always the
right answer and almost never the tempting one.

If none apply, you have not described the user's task concretely enough. Go back.

## 2. Derive density from the reading mode

Whitespace is not a style choice, it is a **reading-speed** choice.

```
Scanning (grid, list, dashboard) ──► tighter. More items visible = fewer round trips.
Reading  (marketing, docs, detail) ─► looser. Line length and rhythm carry comprehension.
Deciding (form, checkout, confirm) ─► loosest. Isolation prevents mis-clicks.
```

Both extremes fail, and the airy extreme is the more common failure in generated design
— three words per viewport reads as *empty*, not as *elegant*.

Working target: content occupies roughly half the vertical space in any band. Section
padding 64–96px desktop, 40–48px mobile. **If a section holds one sentence and one
button, it is not a section — merge it.**

## 3. Rhythm: spacing is grammar

Proximity communicates grouping more strongly than any border, and costs nothing.

```
label → input        8px     bound together, one thing
field → field       24px     siblings
group → group       48px     distinct
section → section   96px     different topic
```

**If everything is 16px apart, nothing is grouped** and the user must read to find
structure. That is the low-level reason a page "feels sloppy" when nothing is obviously
wrong.

Same principle horizontally: establish a left edge and hold it down the page.

## 4. The grid, and one container

12 columns, 24px gutters, 4px spacing scale. Every value a multiple of 4.

**One container-width token, used by every page.** This single decision is what makes
unrelated screens feel like one product. Modules that each choose their own padding are
why an app looks like five apps stitched together.

Prose caps at 60–75 characters. Set it in `ch`, not `px`.

## 5. Responsive: derive from what the user does with their thumbs

Do not shrink the desktop layout. Ask what the task becomes on a phone.

```
Comparing → they can't compare side by side any more.
            One column. Sort and filter get MORE prominent, not less.
Operating → navigation can't be persistent. Bottom bar for ≤5 destinations,
            drawer above that. Primary action in the thumb zone.
Reading   → nearly unchanged. Just tighten padding.
Deciding  → one field per screen if the form is long. Progress indicator.
```

**Tables are the hard case and the one that gets skipped.** A horizontally scrolling
table on a phone is unusable. Convert to cards: pick the two or three fields that carry
the decision, put the rest behind a tap.

Test at 375px. That is a common phone, not an edge case.

## 6. Z-axis

Three levels, maximum: base, raised, overlay. More than three and elevation stops meaning
anything.

**One modal at a time.** A modal opening a modal means the flow is wrong — fix the flow,
do not stack.

Sticky elements must earn their space. A sticky header plus sticky filters plus a sticky
CTA leaves a phone a third of its screen for content.

---

## What these derivations usually produce

Reference only. If your answers point elsewhere, follow the answers.

| User is | Archetype | Notes |
|---|---|---|
| Comparing | card grid, 3–4 cols desktop / 1 mobile | **equal card heights** — ragged bottoms are the commonest tell |
| Being persuaded | centred column, 1100–1280px cap | hero ~25–30% of first viewport, not the whole fold |
| Operating | sidebar 240–280px + top bar, content scrolls | sidebar and top bar never move |
| Completing a task | single column, chrome removed | split-screen only if a brand story is genuinely needed |
| Monitoring | fixed regions, no page scroll | if it scrolls, it's a report, not a monitor |

## Verify

```bash
ship detect --rules design
```

**Automated:** spacing off the 4px scale, raw hex outside the token block.

**Judgement — state these as judgement, not as tooling:**

- [ ] One sentence naming what the user is doing on this screen
- [ ] The archetype follows from that sentence
- [ ] No screen doing two jobs
- [ ] Spacing groups things — related closer than unrelated, visibly
- [ ] One container width across every page
- [ ] Cards in a grid are equal height
- [ ] Opened at 375px: tables became cards, nav reached the thumb zone

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| "Feels empty" despite content | density set for reading when the user is scanning |
| "Feels cramped" | density set for scanning when the user is deciding |
| Page looks sloppy, nothing specific wrong | uniform spacing — no grouping, or a drifting left edge |
| App feels like several apps | more than one container width, or per-module padding |
| Users miss the primary action on mobile | action outside the thumb zone; desktop layout shrunk, not redesigned |
| Grid looks broken | unequal card heights from unclamped text |
| Nobody scrolls past the hero | hero fills the fold, so nothing signals more below |

## Don't

- Don't design a bespoke layout per page.
- Don't use a carousel for primary content — most people see slide one only.
- Don't centre long-form text.
- Don't add a section you cannot fill with something true.
