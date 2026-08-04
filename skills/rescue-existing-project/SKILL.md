---
name: rescue-existing-project
description: >
  Use when handed a project that is half-finished, broken, undocumented, or inherited from
  someone else, or when nobody can say what currently works.
license: MIT
metadata:
  routing: conditional
  applies-when: "repo_state=inherited"
---

# Rescue an existing project

**The question this skill answers:** what is actually true about this codebase, as opposed
to what it claims?

A rescue fails when you start fixing before you know. The README describes intent, the
tests describe an older version, the comments describe a plan, and the person who knew is
gone. **Establish ground truth first, stabilise second, improve last** — in that order, or
you will spend a week improving something that was never running.

---

## 1. Derive the state before touching anything

The right first move depends entirely on which of these is true, and they are not obvious
from the outside.

```
Does it run at all?
├─ Never has ──────────────► the goal is FIRST BOOT. Nothing else matters yet.
│                             Do not read the architecture. Get it to start.
├─ Runs, does nothing
│  useful ─────────────────► the goal is FIRST VALUE. Find one path that
│                             should work end to end and make that one work.
├─ Runs, does the wrong
│  thing ──────────────────► the goal is GROUND TRUTH. The code and the
│                             intent disagree; find out which is wrong.
├─ Worked, now degrading ──► the goal is REGRESSION. Something changed.
│                             Bisect; do not redesign.
└─ Works, nobody trusts
   it ────────────────────► the goal is EVIDENCE. It may be fine. Add the
                             verification that would prove it either way.
```

**Write down which one it is before your first edit.** Every rescue that goes badly went
badly because someone did a redesign when the answer was "it never booted."

## 2. Establish ground truth cheaply

Claims are not evidence. Rank what you find:

```
strongest  ┌ you ran it and observed the behaviour
           │ a test that passes right now, on this commit
           │ a log or error from a real run
           │ git history — what changed, when, by whom
           │ the schema — the data model is the least-lying artifact in any repo
           │ code you have read
weakest    └ the README, comments, tickets, or what someone remembers
```

**The schema is the most honest thing in the repository.** Code expresses intent badly;
tables record what actually got stored. Read it early.

Run this before forming any opinion:

```
- Does it install?  Does it build?  Does it start?
- Does the test suite run, and what does it actually assert?
- What does the error log say on a normal request?
- What are the last 20 commits, and do they look like progress or thrashing?
- What is in the schema that no code references, and vice versa?
```

## 3. Derive what is load-bearing

Half of a stalled project is scaffolding nobody ever used. Deleting it is the cheapest
progress available, but only once you know which half.

```
For each subsystem, ask: what breaks if I delete it?
├─ the core journey breaks ─────► load-bearing. Understand it fully.
├─ a feature nobody uses breaks ► candidate for deletion. Check analytics if any.
├─ nothing breaks ──────────────► dead. Delete it, and the tests that guard it.
└─ don't know ──────────────────► instrument it, wait, then decide.
                                   Never delete on a guess.
```

Dead code in a rescue is worse than dead code elsewhere: it makes every future reader
think the system is more complex than it is, and it hides the parts that matter.

## 4. Stabilise before improving

There is a strong pull to fix the thing that offends you most. Resist it in this order:

```
1. Make it boot reliably, from a clean checkout, with documented steps
2. Make one real journey work end to end, and add a test that proves it
3. Stop the bleeding — the crash, the data loss, the leak
4. THEN improve architecture, design, performance
```

**Steps 1 and 2 are the whole rescue.** A project that boots and has one verified journey
can be improved incrementally by anyone. One that does not, cannot — every change is
unverifiable, so every change is a gamble.

Do not refactor in step 1–3. A refactor mixed with a fix means when it breaks you cannot
tell which one did it.

## 5. Derive scope from what the owner actually needs

```
What does the person who handed you this need next?
├─ To demo it ─────────────► one journey, working, on a URL. Nothing else.
├─ To hand it to a team ───► boot instructions, a test suite, a written map
├─ To ship it ──────────────► the launch surface, plus whatever §4 step 3 found
└─ To decide whether to
   continue at all ────────► an honest assessment, not a fix. See §7.
```

The last one is real and frequently the right answer. **You are allowed to conclude that
rewriting is cheaper than rescuing** — but you must show the evidence, not the instinct.

## 6. Write the map as you go

The next person — possibly you in three weeks — needs what you learned, not your commits.

```
docs/STATE.md      what works, what doesn't, what's untested, as of a date
docs/DECISIONS.md  what you changed and why, and what you deliberately left
docs/MAP.md        the subsystems, what each does, what is dead
```

Date them. An undated assessment of a moving codebase is worthless within a month.

## 7. When to say rewrite

Not a decision to make on feel. The honest signals:

```
- No test can be made to pass without first rewriting the thing it tests
- The schema cannot represent the actual requirement, and migration is
  larger than the rewrite
- Nobody can explain what a core module does, including after reading it
- Every fix creates two bugs — that is a coupling problem, not a bug count
- The dependency base is unmaintained and the API changed underneath it
```

**Two or more of those, from evidence, is a defensible rewrite recommendation.** One is
not. And say what would be *kept* — the schema, the domain knowledge, the copy, the test
cases. A rewrite that throws away the domain understanding repeats the original failure.

---

## Verify

```bash
ship detect
```

Run it early — it gives you a free, honest inventory of the launch surface before you
have formed any opinion.

**Judgement:**

- [ ] The state from §1 is written down, and it drove the first action
- [ ] It boots from a clean checkout with documented steps
- [ ] One real journey works end to end, with a test that proves it
- [ ] Dead subsystems identified, and deleted or explicitly kept with a reason
- [ ] Nothing refactored while stabilising
- [ ] `STATE.md` exists, is honest, and is dated
- [ ] Any rewrite recommendation cites two or more §7 signals with evidence

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| A week in, still nothing runs | started with architecture instead of first boot |
| Fixed it, broke something else | refactored while stabilising |
| Cannot tell whether a change helped | no passing test on one journey before changing things |
| Rebuilt something that already worked | trusted the README over running it |
| Deleted something load-bearing | deleted on a guess instead of instrumenting |
| Owner expected a demo, got a refactor | §5 never asked what they actually needed next |
| Rewrite argued on feel, rejected | no evidence cited from §7 |
| Next person re-derives everything | no dated `STATE.md` |

## Don't

- Don't read the whole codebase before running it.
- Don't trust the README, the comments, or the tickets over observed behaviour.
- Don't refactor and fix in the same commit.
- Don't recommend a rewrite without naming what would be kept.
