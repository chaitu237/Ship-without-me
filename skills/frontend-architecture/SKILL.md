---
name: frontend-architecture
description: >
  Use when starting a frontend, when state has become tangled or duplicated, when the app
  refetches on every navigation, or when one change re-renders everything.
---

# Frontend architecture

**The question this skill answers:** for each piece of state — who owns it, who needs it,
and what happens when it changes?

Almost every frontend problem that gets called "architecture" is one of those three
answered wrong. Get them right and folder structure stops mattering much.

---

## 1. Derive where state lives from who owns it

The single most consequential decision, and the one most often skipped because "state is
state".

```
Where does the truth for this value live?
├─ ON THE SERVER (records, messages, users — anything fetched)
│    → a query cache. NOT Context, NOT a global store.
│      Server state is a *copy* with a staleness problem — you need caching,
│      deduplication, background refresh and retry, all of which a query
│      library gives you and none of which Context does.
│
├─ IN THE URL (filters, page, search, active tab)
│    → the URL. It costs nothing and makes the view shareable,
│      bookmarkable and back-button-correct.
│      A filtered list a user cannot send to a colleague is a bug.
│
├─ IN THIS COMPONENT (is the dropdown open, this input's draft)
│    → useState, right here. Do not lift it "in case".
│
└─ GENUINELY GLOBAL (current user, theme, tenant)
     → one Context per concern. Usually three or four values total.
       If your "global state" has ten things in it, most are server state.
```

**Putting fetched data in Context is the root cause of the two complaints that follow it:**
the app refetches everything on every mount, and one field changing re-renders the tree.

If you do use Context: split by concern, and memoize the value — an inline
`value={{a, b}}` creates a new object every render and defeats every consumer's
memoization.

## 2. Derive the API boundary from what changes underneath you

```
When the backend changes its error envelope, adds a version prefix, or
introduces token refresh — how many files do you edit?
├─ one ──► correct
└─ ninety ► you have fetch calls in components
```

One module owns transport: base URL from env, auth attached, envelope unwrapped, errors
normalized to one shape, 401 → refresh once → redirect. Then a thin per-feature layer
exposes `listItems`, `createItem`. Components call those, never a raw URL.

**Never hardcode a base URL.** It comes from an env var, and the app fails loudly at boot
if it is missing — not on the first request that needs it.

## 3. Derive folder structure from what gets deleted together

```
If this feature were cancelled tomorrow, how many folders would you touch?
├─ one ──► group by feature. Correct.
└─ five ► you grouped by type, and deleting anything is archaeology
```

```
src/
├── features/<feature>/    components, hooks, api, schema, types — all of it
├── components/ui/         shared primitives only
├── lib/                   apiClient, formatters
└── routes/
```

One enforceable rule: **`components/ui/` may not import from `features/`.** That
direction is what keeps primitives reusable; the reverse is what makes them not.

## 4. Derive guards from when the check must happen

```
When is the earliest this decision can be made?
├─ before the component renders ──► ROUTE-level guard. Correct.
└─ inside the component ──────────► too late. It has already flashed
                                     protected content on screen.
```

Every route: authenticated check, then role check, then the component. Preserve the
intended destination through login — send them where they were going, not to a generic
dashboard.

**Lazy-load by route.** Charts, PDF generation, spreadsheet export and rich text editors
do not belong in the initial bundle; split them behind the route that uses them. This is
the highest-payoff performance work available and it is one line per route.

## 5. Derive optimization from a measurement, not a feeling

In order of payoff:

1. **Code-split by route** — biggest win, least effort
2. **Import icons and utilities individually** — a whole icon set in the initial bundle is
   pure waste
3. **Virtualize lists over ~100 rows** — rendering 5,000 rows freezes the tab
4. **Size and lazy-load images**, with explicit dimensions so nothing shifts
5. **Memoize last**, and only where a profiler showed a problem

`memo` everywhere is noise that makes code harder to read and rarely helps.

## 6. The accessibility floor is architectural, not cosmetic

These are cheap at the start and expensive to retrofit, because they are structural:

- **Semantic elements.** A `<div onClick>` is not a button — not focusable, not
  keyboard-activatable, invisible to screen readers.
- Every input has a `<label>`. Placeholders are not labels.
- Visible focus states. Never `outline: none` without a replacement.
- Modals trap focus, close on `Escape`, restore focus to the trigger.
- Colour is never the only signal.

## 7. Delegated

- Form behaviour → **`forms-and-validation`**
- Loading, empty, error, offline states → **`states-and-feedback`**
- Tables and lists → **`list-and-table`**

Architecturally this skill only insists that those are **shared components the shell
provides**, not per-feature reimplementations.

---

## Verify

```bash
ship detect --rules frontend
```

**Automated:** `fetch` outside the API client, missing error boundary, `fetch` with no
timeout, raw hex outside tokens.

**Judgement:**

- [ ] Every piece of state ran through §1 — no server data in Context
- [ ] Filters, search and page live in the URL
- [ ] One module owns transport; no component calls a raw URL
- [ ] Base URL from env, validated at boot
- [ ] `components/ui` imports nothing from `features`
- [ ] Guards at route level, not inside components
- [ ] Heavy routes lazy-loaded

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| Refetches everything on every navigation | server state in Context instead of a query cache |
| One toggle re-renders the whole app | one fat Context, or an unmemoized value object |
| Filtered views cannot be shared | filter state in component state, not the URL |
| A backend change touches ninety files | fetch calls scattered through components |
| Protected content flashes before redirect | guard inside the component |
| Deleting a feature takes a day | folders grouped by type |
| First load is megabytes | no route-level code splitting |
| Keyboard users cannot operate it | `div` with a click handler instead of `button` |

## Don't

- Don't add a state library before Context is measurably the problem.
- Don't build a design system. Use the primitives and move on.
- Don't abstract until you have three real uses. Two is a coincidence.
- Don't put business logic in components.
