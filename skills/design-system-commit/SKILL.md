---
name: design-system-commit
description: >
  Use before the first UI component exists, or when an interface looks generic, unstyled, or
  like every other AI-generated app.
license: MIT
metadata:
  routing: conditional
  applies-when: "consumed_via=pixels"
---

# Design system: commit

**The question this skill answers:** what must be identical across every screen for this
to read as one product rather than several?

Generated apps look alike because nobody changes the component library's defaults.
Changing them costs one token block, once, before any component exists. Doing it after
means editing every component.

---

## 1. Derive the theme from where it will be looked at

```
Where does this get used?
├─ Outdoors, on a phone, in sunlight ──► LIGHT. Not negotiable — dark UI
│                                          is unreadable in direct sun.
├─ Long sessions at a desk, indoors ───► either. Dark is a genuine preference.
├─ Projected, screenshared, printed ───► LIGHT. Dark loses everything on a projector.
└─ Unknown ────────────────────────────► LIGHT. It fails more gracefully.
```

Then **commit to the edge of the range**. Light: background luminance above 0.75. Dark:
below 0.28.

**Never land in the middle.** Mid-grey reads as unstyled, because unstyled is usually
what it is. If you cannot decide, that indecision is what the middle looks like.

Ship both directions properly regardless: `prefers-color-scheme` as the signal, plus a
`data-theme` override that wins in both directions.

## 2. Derive the accent from what the product asks the user to feel

One hue. The vertical is a proxy for the feeling, not the rule itself.

```
What must the user believe to act?
├─ "My money/data/health is safe here" ──► blue 210–220°
├─ "This is built for real work" ────────► orange/amber 25–45°
├─ "This is grounded, natural, local" ───► green 120–160°
├─ "This is expressive, mine" ───────────► violet 265–285°
└─ Unsure ───────────────────────────────► blue. It is the safe default
                                             for a reason and nobody is
                                             put off by it.
```

Set it once and derive everything from it:

```css
:root { --accent-h: 215; --accent-s: 89%; --accent-l: 52%; }
```

Hover, active, focus, disabled and tint all come from moving **lightness**. The moment
you hand-pick a second hex value, you have two accents and no system.

## 3. Derive restraint from what the accent is for

The accent means *"this is the thing to interact with."* Its power is scarcity.

Target **5–10% of pixels**. If the page looks like a paint sample, you have three accents
and need one. If nothing stands out, the accent is on decoration instead of actions.

No gradient unless the brief asks. If you use one, keep it to a single hero surface and
inside one hue family plus its neighbour.

## 4. Derive the neutrals from the accent

Nine steps, tinted toward the accent hue by 3–6% saturation.

**Never pure `#000` or `#fff`** — both read as harsh on real displays, and pure grey
beside a tinted accent looks accidental. A neutral ramp that shares the accent's hue is
what makes a palette feel designed rather than assembled.

## 5. Type and space: pick a scale, then never improvise

- Scale with `clamp()` so it is fluid without breakpoints.
- Body 16px minimum. 15px is a readability bug, not a density win.
- Two weights is enough — one body, one heading. A third only for captions.
- Line length 60–75 characters, set in `ch`.
- **4px grid.** Every margin, padding and gap a multiple. An arbitrary 37px is how a
  design stops being a system.
- One border radius token. One shadow token, or none. Mixed radii read as unfinished, and
  stacked shadows on nested cards is the single most common generated-app tell.

## 6. One place, or it is not a system

All of the above lands in **one** `:root` block or theme extension. If a component
hardcodes a colour, that is a bug in the component, not a special case.

Record the choices in `DESIGN.md` at the project root so later work does not re-decide
the brand.

---

## Verify

```bash
ship detect --rules design
```

**Automated:** spacing off the 4px scale, raw hex outside the token block.

**Judgement:**

- [ ] Theme chosen from where it is used, and pushed to the edge of the range
- [ ] Exactly one accent hue; every state derived by lightness
- [ ] Accent covers roughly 5–10% of a typical screen
- [ ] Neutrals tinted toward the accent; no pure black or white
- [ ] One radius token, one shadow token, one type scale
- [ ] Both light and dark render correctly, including the manual override
- [ ] AA contrast on every text/background pair

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| "It looks like every other AI app" | component library defaults never changed |
| Unreadable outdoors | dark theme chosen without asking where it is used |
| Reads as unstyled | landed in the mid-grey zone instead of committing |
| Nothing draws the eye | accent spent on decoration rather than actions |
| Looks like a paint sample | more than one accent hue |
| Palette feels cheap | pure grey neutrals beside a saturated accent |
| Screens feel assembled, not designed | improvised spacing, mixed radii, stacked shadows |
| A redesign means touching every file | colours hardcoded in components |

## Don't

- Don't build a component library. Tokens only.
- Don't design a logo or brand identity here.
- Don't invent chart colours — the charting layer derives them from `--accent`.
- Don't add a third font.
