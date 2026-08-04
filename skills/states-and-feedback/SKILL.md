---
name: states-and-feedback
description: >
  Use when a screen fetches or changes data, when an app feels broken with no obvious error,
  when a new user sees a blank screen, or before adding a confirmation dialog.
license: MIT
metadata:
  routing: conditional
  applies-when: "consumed_via=pixels"
---

# States and feedback

**The question this skill answers:** what is this screen promising the user right now,
and is that promise true?

Every state is a promise. A spinner promises "something is coming". An empty list
promises "there is nothing here". Both are lies if the request already failed — and that
is what "the app feels broken" actually means.

---

## 1. Derive the states from the surface

For any screen that fetches or mutates, ask four questions. Each `yes` is a state you
must design; skipping one means the user meets an undesigned screen.

```
Can it legitimately have nothing to show?
  yes → EMPTY, and split it in two:
        · nothing yet     → onboarding tone, the action that creates the first thing
        · nothing matched → filter tone, a way to widen. Never reuse the onboarding copy.

Can it fail?
  yes → ERROR, split by whether retrying could possibly help:
        · retryable (network, timeout, 5xx) → retry button
        · terminal  (404, 403, validation)  → the way out, no retry
        A retry button on a 403 is a lie.

Can it be slow?
  yes → LOADING, shaped by duration:
        · <300ms  → nothing. A flash of skeleton is worse than a pause.
        · <3s     → skeleton in the shape of the content
        · >3s     → skeleton + progress, and name the step if you can

Can the user be here but not allowed?
  yes → DENIED. Name what is missing and who can grant it.
        Better: don't render the entry point. But deep links land here anyway.
```

Two more, when the context warrants:

- **Offline** — if the user may lose connection mid-task (always, on mobile).
- **Rate limited** — if you throttle. Say the limit and when it lifts, or they retry
  immediately and extend the block.

**The state that always gets skipped is `empty`** — and it is the first state a new user
sees, on every feature.

## 2. What each state owes the user

One rule generates all the specifics: **a state must say what is true and what to do next.**

```
✗ "No data"                        true, useless — no next action
✗ "Something went wrong"           neither specific nor actionable
✗ a spinner with no end            promises "soon" without evidence
✓ "Nothing saved yet. Create your first one, or import what you already have."
✓ "Couldn't load this. Check your connection.  [Retry]"
✓ "You need admin access to edit billing. Ask your workspace owner."
```

Loading states get a **skeleton shaped like the content**, not a centred spinner — the
skeleton tells the user what is coming and stops the layout jumping when it arrives.
Reserve the final dimensions.

For an action rather than a page, the state lives **in the button**: "Saving…", disabled,
spinner inside.

## 3. Derive confirm-vs-undo from reversibility

Every confirmation you add is one the user learns to click through. Spend them only where
the action cannot be taken back.

```
Is it reversible?
├─ yes ─────────────────► just do it. Offer UNDO for 10s.
├─ recoverable (soft) ──► just do it. Undo toast. No dialog.
└─ no ──────────────────► dialog. Name the object. Name what else goes with it.
   └─ catastrophic ─────► type-to-confirm the object's name
```

**Undo beats confirm wherever you can build it** — no interruption on the common path,
full recovery on the mistake. But undo that only dismisses a toast is worse than nothing;
it must genuinely reverse.

Dialog wording follows from the same rule — say what is true, say what happens:

```
Delete "Q3 planning"?
This permanently removes it and the 3 items inside it. This cannot be undone.
[ Cancel ]  [ Delete ]
```

Label the button with the **verb**. "OK" and "Yes" are meaningless read out of context by
a screen reader, and meaningless to a user skimming.

## 4. Optimistic updates: derive from cost of being wrong

Show the change immediately, reconcile after — but only where a wrong guess is cheap.

```
Cost of being wrong is…
├─ trivial (toggle, reorder, mark read) ──► optimistic. Revert visibly on failure.
├─ confusing (status change others see) ──► optimistic, but lock the control until confirmed
└─ real (money, sending, deleting) ───────► never. Wait for the server.
```

A **silent** revert is the worst outcome — the user believes they did something and did
not. Revert visibly and say why.

## 5. Toasts

A toast is for **confirmation of something the user just did**. It is not an error
handler and not a place for information they will need again.

- Success auto-dismisses (~4s). **Errors do not** — they need a close button.
- Bottom-right desktop, top on mobile where thumbs won't cover it.
- One at a time; stack, never overlap.
- Anything that matters also appears where it happened — a failed save shows on the form.
- Route it through an `aria-live` region, or screen-reader users never learn it happened.

---

## Verify

```bash
ship detect --rules states
```

**Automated:** list views rendering a collection with no empty state, missing error
boundary, `fetch` without a timeout.

**Judgement:**

- [ ] Every async surface: the four questions answered, each `yes` designed
- [ ] `nothing yet` and `nothing matched` have different copy
- [ ] Every empty state carries the action that fills it
- [ ] Retry appears only where retrying could help
- [ ] Confirmations only on the irreversible; undo everywhere else
- [ ] Every optimistic update has a *visible* revert
- [ ] Errors are never toast-only

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| "The app feels broken" | a state promising something untrue — usually a spinner after a failed request |
| New users churn on day one | empty states undesigned, so the first screen of every feature is blank |
| Users click delete twice | no feedback on the first click; the action had no in-flight state |
| Duplicate records | submit not disabled while in flight |
| "It didn't save" but it did | success shown only as a toast the user missed |
| Users stop trusting the app | silent optimistic reverts, or an undo that didn't undo |
| Support tickets with no detail | errors without a request ID to quote |

## Don't

- Don't spinner something that resolves in 50ms.
- Don't confirm what you could undo.
- Don't show a determinate progress bar you cannot actually measure.
- Don't put an empty state behind a tab the user must find first.
