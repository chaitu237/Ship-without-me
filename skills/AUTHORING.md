# How a skill in this package is written

Not a skill. The rule every skill here is held to.

## The failure mode this exists to prevent

A skill that catalogues is a skill that has not generalized.

```
✗  "Here are eight hero variants. Pick one."
✓  "The hero visual is the evidence for the headline's claim.
    Ask where the value lives; the visual falls out of the answer."
```

The catalogue is what you get from observing. It is useful reference and it is **not the
skill**. It tells an agent what exists; it does not tell an agent how to decide, and it
collapses the moment it meets a case that was not observed.

If a skill's content could be replaced by a table with no loss, it is notes, not
instruction.

## The test

**Would this skill produce the right answer for a case its author never saw?**

If the instruction is a list, no — the agent picks the nearest listed item and is wrong in
a new way. If the instruction is a derivation, yes — the agent runs the procedure and
arrives somewhere the author never enumerated.

A second test: **does it say why?** A rule with no cause cannot be reasoned about, so it
cannot be correctly broken. Every rule here names the failure it prevents, which is what
lets an agent override it deliberately when the failure does not apply.

## Required structure

```
1. The generating principle    one sentence: what question does this skill answer?
2. The derivation              2-4 questions whose answers produce the decision
3. What the answers usually    the catalogue — demoted to reference, explicitly
   turn out to be              marked "if your answer points elsewhere, follow it"
4. Micro-details               each paired with the specific failure it prevents
5. Verify                      automated checks, then judgement checks stated as judgement
6. How you'll know you         symptom → cause. The debugging table.
   got it wrong
7. Don't                       bounded scope
```

Sections 1, 2 and 6 are the skill. Section 3 is reference. A skill that is mostly
section 3 has not been written yet.

## Writing the derivation

Derivations are decision trees over **properties of the situation**, never over
categories of solution.

```
✗  "Is this a marketplace, a SaaS, or a directory?"     ← categories. Brittle.
✓  "Where does this product's value live — one screen,
    a flow between actors, live data, or coverage?"     ← property. Generalizes.
```

Categories run out. Properties do not, because a new product still has a location for its
value even if it fits no category you know.

End every derivation with an escape hatch that sends the agent back rather than forward:

> "If none of the branches fit, you have not answered Q1. Go back and answer it."

## Micro-details earn their place by naming a failure

```
✗  "Put Forgot password beside the label."
✓  "Forgot password beside the password label — placed below the button,
    it is invisible at the moment of failure."
```

The second survives contact with a designer who wants to move it, because it can be
argued with on the merits. The first is arbitrary and gets discarded.

## Verification must distinguish what a machine can check

Never claim a check the tooling cannot perform. Split it and say which is which:

```
**Automated:** spacing off the 4px scale, raw hex outside tokens.
**Check by eye — no tool substitutes for looking:**
- [ ] Card grid: every card the same height
```

A phantom `--rules` group is worse than an honest checklist, because it reports success
for checks that never ran.

## A skill is not finished until it can be measured

A skill claims that it moves an agent to a decision it would otherwise miss. That claim is
testable, so it must be tested — otherwise the skill is an opinion with good formatting.

Every skill ships `eval/cases.jsonl` beside its `SKILL.md`. Each case states a **situation**
and the **branch** the derivation should reach, plus a one-line `because`. A case whose
expectation you cannot justify in one line is testing your taste, not the skill.

Two rules that make the suite worth running:

- **The symptom→cause table is the oracle.** The symptoms a skill promises to prevent are
  exactly what an eval should look for in the output. That is why the table is mandatory —
  it is not documentation, it is the test spec.
- **A case the baseline already passes is a deletion candidate, not a pass.** If an agent
  reaches the right branch without the skill, that guidance is redundant weight on the hot
  path. Delete it, or strengthen the case.

Full methodology: [`docs/evaluation.md`](../docs/evaluation.md).

## Length

Long enough to derive, short enough to hold. Roughly 100–200 lines. If it is longer, it is
probably two skills, or it has grown a catalogue.

## The description is the only part on the hot path

Skill **bodies load on demand**. The `description:` line does not — every description in
the package sits in context on every single request, whether or not the skill is used.

That makes it the one place where brevity is worth real effort — and the one place where
the wrong shape actively causes harm.

**A description must state only when to reach for the skill. Never what it contains.**

A description that summarises the skill's content creates a shortcut the agent takes
*instead of* reading the body. Observed directly: a description mentioning "review between
phases" produced one review where the body specified two. The agent read the description,
believed it knew the skill, and skipped the derivation.

So:

- **Open with "Use when" / "Use before".** Triggering conditions, third person.
- **State symptoms and situations** — the words a user would actually say, the problem they
  are staring at. Not a feature list.
- **200–250 characters.** Across 27 skills the difference is over 1,300 tokens on every
  single request, permanently.
- **Discriminate against the neighbours.** With this many skills the router's failure mode
  is hesitation between two, not missing one. If two descriptions could both plausibly
  match a request, one is written wrong — or they should be one skill.

```
✗  Schema-constrained output, real grounding, evidence and confidence, failure
   states, an eval suite. Use on "add AI", "AI assistant"…
   ← leads with contents. The agent reads this and skips the body.

✓  Use when an LLM's output will be shown to a user or acted on, when answers
   vary between runs, or when the model asserts things that are not true.
   ← only triggers. To know what the skill says, the agent must open it.
```

Everything the first version put in the description still exists — in the body, where it
costs nothing until the skill is actually selected, and where it cannot be mistaken for a
summary that makes reading unnecessary.
