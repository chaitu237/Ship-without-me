---
name: core-interaction-contract
description: >
  Use before choosing architecture on any build, and whenever success cannot be judged from
  a static page — playback, editing, capture, live sessions, background runs. Use when a
  build "passed" but the thing it exists to do was never observed working.
license: MIT
metadata:
  routing: core
---

# Core interaction contract

**The question this skill answers:** what observable sequence, from first action to promised
outcome, proves this product works — and what proves each step of it?

A page can render perfectly and the product can be worthless. A track list that never makes
a sound, an editor that loses the document, a scheduler whose runs never fire. These pass
every static check, because static checks ask whether the page is well-formed, not whether
the promise is kept.

Write the contract **before** architecture. It is what tells you which capabilities must
have an owner, and it is the only thing that makes "done" falsifiable.

## Derive it

```
Can success be seen in a single rendered frame?
├─ yes ──────────────────────────────────► the contract is short: render, read, act
│                                           evidence: browser assertion on visible content
└─ no ───► what continues after the frame?
     ├─ time advances on its own ────────► CONTINUOUS
     │    play/seek/end, animation, timers. Truth lives in an engine, not in props.
     │    evidence: runtime event trace — the engine reports it, not the component
     ├─ state persists past the session ─► PERSISTENT
     │    drafts, queues, imported libraries, preferences
     │    evidence: persisted reload — close it, reopen it, is it still true?
     ├─ another party acts ──────────────► SHARED
     │    presence, concurrent edits, messages
     │    evidence: two clients, one assertion each
     ├─ work happens unattended ─────────► DEFERRED
     │    jobs, schedules, retries, webhooks
     │    evidence: trigger once → exactly one run, observable, resumable
     └─ the world changes ───────────────► PHYSICAL
          print, send, pay, actuate, notify
          evidence: the external record, not the request you made
```

Then, for each step in the successful path:

```
Which system is authoritative here?
├─ a component ─────────► local state is fine
├─ the device runtime ──► the runtime is the truth; the UI subscribes to it
├─ local storage ───────► versioned, migratable, survives reload
├─ an app server ───────► the network is a failure mode, not a detail
└─ an external service ─► it will be down; the contract must say what then
```

## What the contract contains

```markdown
## First-value event      the single moment this becomes worth having
## Starting state         what exists before the journey begins
## Successful path        observable steps, in order
## Essential state owners which system is authoritative at each step
## Failure path           the most likely failure that prevents value
## Recovery path          how the user recovers without starting over
## Evidence               what proves each claim, and how
## Non-goals              what this slice deliberately excludes
```

Steps are things you could watch someone do:

```text
import a file → metadata appears → select it → audio is audible → progress advances →
seek moves position → navigate away, playback continues → track ends → next begins
```

Not `[x] audio playback implemented`. That is a checkbox, and a checkbox cannot fail.

## The failure path is half the contract

Most products break at the same place: the thing that goes wrong is not a state anyone
designed. Name the likeliest failure and its recovery *before* building the happy path.

```text
unsupported or corrupt source → does NOT sit in "loading" forever → the item and the exact
reason are shown → the user can remove it or choose another
```

If the failure path is "show an error toast", the contract is not finished. Which error,
attached to which item, leaving the user able to do what?

## Evidence — pick the cheapest that actually proves the claim

| Type | Proves | Costs |
|---|---|---|
| `command_exit` | it builds, it lints, the suite ran | nothing |
| `unit_assertion` | a pure function is correct | nothing |
| `browser_assertion` | the user-visible thing is true | seconds |
| `runtime_event_trace` | the *engine* did it, not the UI | seconds |
| `network_trace` | the request left, with what payload | seconds |
| `database_record` | the write actually landed | seconds |
| `persisted_reload` | it survives a restart | seconds |
| `visual_snapshot` | layout did not regress | storage |
| `accessibility_tree` | it is operable, not just visible | seconds |
| `manual_judgement` | taste, tone, "does this feel right" | a human |

**A passing test suite that never exercised the loop is not evidence the loop works.** The
most common false green is a unit test on a formatter next to a play button that was never
pressed.

## Micro-details, each preventing a specific failure

- **Bind evidence to the step, not the build.** "Tests pass" cannot tell you which step
  broke; the report ends up saying done while the product does nothing.
- **Assert on the authority, not the mirror.** Checking that a React state says `playing`
  proves the component set a boolean. Ask the engine.
- **A step that cannot be observed is not a step.** Rewrite it until it can be, or move it
  to Non-goals — otherwise it silently becomes untested.
- **Non-goals stop scope creep and stop false failure.** Without them, a reviewer marks the
  slice incomplete for lacking something deliberately excluded.
- **Write the contract before the profile hardens into a plan.** Afterwards you will write
  a contract that describes what you already decided to build.

## Verify

Automated:
- Every step in the successful path has an evidence entry
- Every essential state owner is named
- The failure path has a recovery path
- The evidence commands run, and fail when the step is broken

Judgement:
- Would someone who wanted this product agree the first-value event is the right moment?
- Does the failure path name the failure that will actually happen most often?

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| Everything passes; the product does not do its one job | Evidence bound to the build, not to the loop |
| "Done" reported, core feature silently broken | No step-level evidence — a green suite stood in for the loop |
| The demo works and the second attempt does not | No persisted-reload evidence; first-run state was mistaken for real state |
| A whole class of input hangs forever | Failure path never written, so loading has no exit |
| Reviewers argue about whether the slice is finished | Non-goals missing |
| Test asserts `isPlaying === true` while nothing is audible | Asserted on the UI mirror instead of the runtime authority |
| The contract reads like the plan you already had | Written after architecture instead of before |

## Don't

- Don't accept "the tests pass" as proof the first-value event happened.
- Don't write steps as features. A feature cannot be observed failing.
- Don't leave the failure path as "show an error".
- Don't choose architecture before this exists. That is the whole point of it.
