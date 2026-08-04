---
name: phase-execution
description: >
  Use when running a build phase that will be reviewed, dispatching builders or reviewers,
  or deciding whether a phase is done. Use when a review needs to count as independent
  evidence, or when a phase may be re-run.
---

# Phase execution

**The question this skill answers:** what makes a phase of unattended build work
trustworthy enough to build the next phase on top of?

Three things, and each fails silently without the others: the work is reviewed by someone
who did not do it, the review's verdict names what must change, and re-running the phase
does not double its side effects.

## Every phase runs three roles, in this order

One agent building unsupervised produces code that looks right. Three roles catch what
one cannot see about itself.

```
┌─ BUILDER ─────────────────────────────────────────────────────┐
│  Fresh context. Gets the phase spec IN FULL — never a pointer  │
│  to a file it must go read. Loads the named skill, implements, │
│  writes its own check, runs it, self-reviews, commits.         │
│  Returns a phase outcome (below).                             │
└───────────────────────────┬───────────────────────────────────┘
                            ▼
┌─ SCOPE REVIEW ────────────────────────────────────────────────┐
│  "Is this what the phase asked for — and nothing else?"        │
│  Fails in BOTH directions: a missing requirement, and a        │
│  feature nobody asked for. Extra scope is a defect, not a      │
│  bonus — it costs maintenance forever and was never budgeted.  │
└───────────────────────────┬───────────────────────────────────┘
                            ▼ only once scope review passes
┌─ QUALITY REVIEW ──────────────────────────────────────────────┐
│  "Is it well built?" Runs `ship detect` for the phase's rule   │
│  group, then judges what no rule can see.                      │
└───────────────────────────┬───────────────────────────────────┘
                            ▼
                   phase complete → commit
```

**The order is not negotiable.** Judging how well something is built, before knowing
whether it is the right thing, means polishing an implementation you are about to throw
away. If scope review fails, the **same builder** fixes it and scope review runs **again** —
not once, but until it passes.

## A review is only a review if it ran somewhere else

**Each role runs in its own dispatched context.** This is not about parallelism or speed —
it is the entire reason the roles catch anything. An agent asked to review work it just
produced, in the context where it produced it, is not a second opinion; it is the same
opinion with a different heading, and it will agree with itself. Reading back your own
reasoning is not the same act as encountering the result cold.

```
Were scope review and quality review dispatched into their own contexts?
├─ yes ─► they are independent findings. Agreement between them is evidence.
└─ no ──► they are one context wearing three labels.
           The findings may still be useful — but they are NOT corroboration,
           and the report must say the review ran inline and what coverage
           that lost. Never promote a finding's confidence on agreement that
           came from a single context.
```

**Where the host cannot dispatch subagents at all**, run the roles sequentially in-context
and **say so in the report**. That is a legitimate degrade. What is not legitimate is
running them inline and reporting them as though three roles ran — that manufactures
confidence out of nothing, and it is worse than no review, because a reader stops looking.

The same rule governs Phase 2's critic and Phase 5's red-team: **two lenses inside one
context are two perspectives, not two witnesses.**

**Never run two builders in parallel.** They will collide on the same files. Reviews may
overlap with the *next* phase's builder; builders may not overlap with each other.

## Phase outcomes — every one names what the controller must change

A builder that returns "it didn't work" tells you nothing actionable. Every outcome below
is defined by **what has to change before anything is re-dispatched**, which is the only
question the controller actually has.

| Outcome | Meaning | What must change |
|---|---|---|
| `done` | finished, self-checked, committed | nothing — proceed to scope review |
| `done, gaps logged` | finished, with something knowingly incomplete | read the gaps. Correctness or scope → resolve now. An observation → log to `DECISIONS.md` and proceed |
| `blocked: policy` | hit a `policy.json` hard stop | **nothing.** This is correct behaviour. Log it, wire the path, leave it off, report it |
| `blocked: context` | information the controller never supplied | supply it, re-dispatch on the same model |
| `blocked: capability` | the task exceeds what this model can do | escalate the model tier, **or** split the phase — not both at once, or you learn nothing |
| `blocked: plan` | the phase spec itself is wrong or contradictory | fix `DECISIONS.md`. Do not ask the builder to work around a bad plan |

`blocked: policy` is the outcome that only exists because this skill runs unattended. It is
a **success**, not a failure — the hard stop did its job. Treating it as an error is how an
autonomous run talks itself into spending money.

**Never re-dispatch an identical prompt to an identical model.** If it was stuck once it
will be stuck again, and you have spent a phase's budget to learn nothing. Every
re-dispatch changes exactly one variable — the context, the model, or the scope — so that
when it succeeds you know which change did it.

## Match the model to the phase

Cost and latency are budgets like any other. Spend capability where judgement is required
and nowhere else.

| Phase shape | Model tier |
|---|---|
| Mechanical, one or two files, complete spec (tokens, metadata, legal routes) | cheapest that can do it |
| Integration across files, pattern-matching to existing code | standard |
| Schema design, API contract, architecture, **and every reviewer role** | most capable available |

Reviewers get the best model available. A cheap reviewer approves things a cheap builder
wrote, which is worse than no review because it produces a signed-off failure.

## Give builders text, not file paths

The controller extracted the phase spec already. **Pass it in full.** A builder that has
to open and read `ROADMAP.md` spends its context on discovery instead of work, and may
read the wrong section.

Include the scene: where this phase sits, what came before, what depends on it. A builder
that does not know why it is doing something builds the letter and misses the point.

Activate `regional-commerce-stack` when the brief names a specific country or market.
Activate `field-ops-mobile` when the primary user works away from a desk.

**Commit after each.**

## Re-running a phase must be safe

A re-opened or resumed phase **re-runs from the start of that phase**, not from where it
stopped. Every external side effect therefore happens twice unless it is idempotent.
This is what turns one retry into two deploys, two domain purchases, or two migrations.

```
Before any side effect, ask: has this exact effect already happened in this run?
├─ record the intent in STATE.md BEFORE performing it, under a stable key
├─ on phase entry, check the key — if present, skip it and move on
└─ derive the key from the phase name and its inputs, never from a timestamp
   or a random value, so a retry produces the SAME key
```

Per phase:

- **Migrations** — additive and named. Re-running the same name is a no-op, never a
  second `ALTER`.
- **Deploys** — check for an existing deployment of the current commit before creating one.
- **Generated files** — write to a temp path, then move into place, so a half-written
  file from a killed phase is never mistaken for a finished one.
- **Anything behind `policy.json`** — already blocked, therefore already safe.

**Commit at the end of a phase, never during it.** A mid-phase commit makes the phase
look complete to a resume, which then skips the work that had not happened yet.

## Verify

Automated:
- Every dispatched role ran in its own context, or the report says it did not
- Every phase outcome is one of the defined words, never free prose
- Re-running the phase twice produces the same end state

Judgement:
- Would the reviewer have caught this defect if they had not written the code?
- Does the outcome tell the controller what to change, without reading the diff?

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| Reviews always pass | Review ran in the builder's own context — one opinion, three headings |
| Report claims three roles; the host cannot dispatch | Inline degrade not disclosed; corroboration manufactured |
| A finding was promoted because two reviewers agreed | Both reviewers shared a context — two perspectives, not two witnesses |
| Controller re-dispatches and cannot tell what changed | Outcome was prose, not one of the defined words |
| Second run doubles the seed data | Phase not idempotent, re-dispatched automatically |
| Quality was polished, then the whole phase was thrown away | Quality review ran before scope review |
| Two builders edited the same file | Builders overlapped; only reviews may overlap the next phase |

## Don't

- Don't let a role review work it produced itself.
- Don't report corroboration from a single context.
- Don't return a free-text outcome.
- Don't re-dispatch a phase with un-keyed side effects.
