# Evaluation

A skill in this repository claims something specific and testable: **that it moves an agent
to the correct branch of a derivation it would otherwise have missed.**

That is a narrower claim than "produces better output", and it needs a narrower test. Prose
quality is not what these skills sell. Decisions are.

---

## The question every eval answers

```
Given the same situation, with and without the skill:
  does the agent reach the same decision?

├─ different, and the skill's branch is correct ──► the skill works. Keep it.
├─ same, both correct ───────────────────────────► the skill changed NOTHING.
│                                                   The guidance is redundant. DELETE IT.
├─ different, and the skill's branch is wrong ────► the derivation is wrong. Fix the skill.
└─ same, both wrong ─────────────────────────────► the skill does not address this case.
                                                    Either extend it, or drop the case.
```

**The second branch is the one nobody looks for, and it is the most valuable.** A skill
section that makes no difference to the decision is weight on the hot path and reading time
for every future agent. An eval suite that only reports pass/fail cannot find it. Ours
reports it as a first-class result: **no-difference cases are deletion candidates.**

## Decision fidelity, not output quality

Score what the skill claims to control:

| Dimension | Question | How it is graded |
|---|---|---|
| **Branch** | Did it reach the derivation branch this situation implies? | assertion — deterministic |
| **Artifact** | Does what it produced pass the relevant detector rules? | `ship detect` — deterministic |
| **Anti-symptom** | Did the output exhibit any symptom from the skill's own symptom→cause table? | pattern match — near-deterministic |
| **Honesty** | Did it label its completion state and assumptions accurately? | assertion + judgement |
| **Restraint** | Did it stay inside scope, or add what nobody asked for? | judgement |

The first three need no model. **That is deliberate: every skill in this repo already ships
a symptom→cause table, which doubles as a free oracle.** The symptoms a skill promises to
prevent are exactly the failures an eval should look for.

## The grading ladder — cheapest first, always

```
1. ship detect on the produced artifact        free · deterministic · run always
2. Branch assertion against the case's expect  free · deterministic
3. Anti-symptom pattern scan                   free · near-deterministic
4. Model judgement on restraint and honesty    costs money · run last, on what remains
5. Human review                                security · money · legal. Never automated
```

Never reach for a model grader where an assertion would do. A model grading a model stacks
two error sources and charges you for the privilege.

## Case format

One `cases.jsonl` per skill, beside it:

```
skills/<skill>/eval/cases.jsonl
```

Each case describes a **situation**, never a prompt to be answered:

```jsonc
{
  "id": "multi-actor-marketplace",
  "situation": "A brief for a platform connecting five kinds of participant. No single screen shows the value.",
  "expect": {
    "branch": "process stepper",
    "not": ["product screenshot", "illustration"],
    "because": "no single screen can show a five-sided flow, so a screenshot would be fabricated"
  },
  "forbid_symptoms": ["hero feels like stock decoration"],
  "artifact_rules": ["launch"]
}
```

`because` is required. A case whose expectation you cannot justify in one line is a case
testing your preference rather than the skill's derivation.

## Running it

```bash
node scripts/run-evals.mjs validate                 # cases well-formed, offline, free
node scripts/run-evals.mjs plan --trials 3          # what it would cost, before spending it
node scripts/run-evals.mjs run --skill <name> \
     --condition baseline --trials 3 --max-usd 5
node scripts/run-evals.mjs run --skill <name> \
     --condition candidate --trials 3 --max-usd 5
node scripts/run-evals.mjs score                    # gate
```

## Five conditions that make a result mean anything

Get any of these wrong and the numbers are decoration.

**1. Isolate the run from local configuration.** Every agent CLI loads user-level plugins,
hooks, memory files and output styles. Those leak into both conditions and shape what you
are measuring. Pass whatever flag your runner offers to ignore user config and run
ephemerally.

The sharpest version of this trap: **this repo's own `AGENTS.md` will be picked up from the
working directory** and inject the entire ruleset into the *baseline* — so the baseline
silently becomes a candidate and you measure the skill against itself. Run evals from a
scratch directory, never from this repo's root.

**2. Pin the model explicitly.** Unpinned, the eval runs whatever the operator or the CLI
currently defaults to. Results then vary by machine and by week, and cost varies with them.
The pinned version is part of the result — publish it or publish nothing.

**3. Run more than one trial.** These systems are non-deterministic. One trial measures
luck. Three is the working minimum.

**4. Blind the judge.** Strip the condition label before any model or human scores a
response. A judge that knows which one had the skill will find the skill helpful.

**5. Cap the spend inside the harness.** Not by watching it. `--max-usd` per condition, and
the runner refuses to start a call it cannot afford.

## Reliability bar — match it to consequence

Two different questions, and conflating them is why agent features feel unreliable:

```
Can the user simply retry?
├─ yes ──► "at least one success in N trials".  Bar: ≥ 90% at N=3
└─ no — money moves, data changes, someone acts on the output
     └─► "every trial succeeds".  Bar: 100% at N=3
```

A skill at 90% on the first measure looks fine and is unusable on a payment path, because
one user in ten hits the failure and cannot retry their way out of a double charge.

**Which bar applies is decided by the skill's own rigor allocation**, not by the eval
author. Security, money, permissions, data integrity and anything irreversible get the
second bar. Everything else gets the first.

## The release gate

A skill may be published when:

- [ ] Every case validates, and every `expect` carries a `because`
- [ ] Baseline **fails** the cases the skill claims to fix — if baseline passes, the skill
      is not needed for that case
- [ ] Candidate meets the bar its consequence class demands
- [ ] Zero forbidden symptoms in candidate output
- [ ] Deterministic graders carry the load; model judgement scores only restraint and honesty
- [ ] Model and CLI versions recorded with the result
- [ ] No-difference cases triaged: **guidance deleted, or case strengthened**

## Keep it fast, or it will not be run

A slow suite does not get run, and a suite that does not get run is worse than none —
it implies coverage that is not there. Push work down the ladder: if a case can be decided
by an assertion, it must not cost a model call.
