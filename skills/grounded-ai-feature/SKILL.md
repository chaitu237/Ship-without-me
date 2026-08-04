---
name: grounded-ai-feature
description: >
  Use when an LLM's output will be shown to a user or acted on, when answers vary between runs,
  or when the model asserts things that are not true.
license: MIT
metadata:
  routing: conditional
  applies-when: "capability=model output"
---

# Grounded AI feature

**The question this skill answers:** what will the user *do* with this output, and what
does it cost when it is wrong?

Everything below is sized to that cost. A wrong suggestion in a brainstorming tool costs
a shrug. A wrong stock reorder costs money. Same model, completely different engineering.

---

## 1. Derive whether to build it at all

```
What does the user DO with the output?
├─ Reads it, then decides on their own ──► this is a demo. Say so.
│     Ship it if you like, but do not call it a feature and do not
│     invest in grounding it.
└─ Acts on it — sends, orders, files, pays, diagnoses
   └─ then everything below is mandatory, sized to the consequence:
      ├─ reversible in one click ──► light grounding, visible confidence
      ├─ costs money or time ──────► full grounding, evidence, confirm step
      └─ affects health, money,
         or legal standing ───────► full grounding + human confirmation
                                     ALWAYS. Never auto-execute.
```

**Step 1 is allowed to conclude "don't build this."** That is a real and frequently
correct outcome, and it is cheaper than discovering it after launch.

## 2. Derive the output shape from what the code does next

```
Does the application parse, branch on, or store this output?
├─ yes ──► JSON schema, provider's structured-output mode. Non-negotiable.
│           If you are writing a regex against a model response, stop —
│           you are parsing a language model's prose as an API.
└─ no, a human reads it as prose ──► free text is fine.
```

## 3. Derive the grounding mechanism from where the answer lives

The model may only assert what you gave it. Where the truth lives decides how you give it.

```
Where does the true answer live?
├─ In the app's own records ────► RETRIEVAL. Fetch the rows, put them in context.
├─ In a live external system ───► TOOL CALL. Stock levels, prices, availability.
├─ In arithmetic over knowns ───► COMPUTE IT IN CODE, then let the model explain it.
│                                  Never ask an LLM to sum a ledger.
└─ In the model's training ─────► you are not grounded. Either accept that
                                   explicitly, or change the feature.
```

Prompt instructions — "be accurate", "do not make things up" — are not grounding. They
are a wish, and they fail exactly when it matters.

## 4. Derive what travels with every claim

If the user will act on it, they need to be able to check it.

```json
{
  "value": "Reorder 40 units of SKU-221",
  "evidence": ["event_8823", "event_9014", "item_221"],
  "confidence": 0.82,
  "method": "retrieval+rule"
}
```

The UI renders the evidence, and it must be **clickable through to the source rows**.

**A claim with no evidence renders as `unknown`** — never as a confident sentence. This
single rule is the difference between a tool people trust and one they verify manually,
then stop opening.

## 5. Derive failure states from what can go wrong

```
What can fail here?
├─ Timeout ──────────► "Taking longer than usual" + retry. Never a spinner forever.
├─ Empty retrieval ──► "Not enough data yet" + what would fix it. NEVER a guess.
├─ Refusal ──────────► show it plainly.
└─ Rate limit ───────► say when it lifts.
```

The rule that generates all four: **degrade to "not enough data" always; degrade to an
ungrounded answer never.** An AI feature that quietly falls back to guessing when
retrieval fails is worse than one that is simply down, because the failure is invisible.

## 6. Derive the eval from the cases that would embarrass you

15–25 real inputs with expected outputs, asserted in a test, written **before** the prompt.

Three cases are mandatory regardless of domain:

- **Empty retrieval** — asserts the feature returns `unknown`, not a plausible guess.
- **Prompt injection** — any untrusted text reaching the model (uploads, scraped pages,
  third-party records, user content) is **data, never instructions**. Assert that text
  saying "ignore previous instructions" changes nothing.
- **The expensive wrong answer** — whatever the §1 consequence was, test that specific case.

Without an eval, no prompt change is safe and every model upgrade is a gamble.

### Derive the grader from what "correct" means here

```
Can correctness be checked by code?
├─ yes ──► CODE GRADER. Deterministic, fast, runs in CI, free.
│           Always prefer this. Assert the schema, the field, the number,
│           the presence of a citation.
├─ no, it needs judgement about quality ──► MODEL GRADER. Score against
│           stated criteria, not vibes. Cheaper than a human, noisier than code.
└─ no, and being wrong is dangerous ──► HUMAN GRADER. Security, money, health,
            legal. Never fully automate a grader for these.
```

Deterministic beats probabilistic every time it is available. A model grading a model is
two sources of error stacked.

### Derive the passing bar from what a single failure costs

Two different questions, and conflating them is why AI features feel unreliable:

```
Does it need to work SOMETIMES, or EVERY TIME?
├─ sometimes is fine — the user can retry, and a retry is cheap
│    └─► pass@k : at least one success in k attempts.  Target pass@3 ≥ 90%
└─ it must work every time — money moves, data changes, someone acts on it
     └─► pass^k : ALL k attempts succeed.  Target pass^3 = 100%
```

A feature at 90% pass@1 sounds good and is unusable on a payment path, because one in ten
users hits the failure and cannot retry their way out of a double charge.

**Match the bar to §1's consequence.** Reversible in one click → `pass@k`. Costs money, or
someone acts on it → `pass^k`. That is the same rigor allocation as everywhere else in the
package, applied to non-determinism.

Keep evals fast. A slow eval suite does not get run, and an eval suite that does not get
run is worse than none because it implies coverage that is not there.

---

## Verify

```bash
pytest tests/test_<feature>_eval.py -q
```

**Judgement:**

- [ ] §1 answered — the user acts on this, and the grounding matches the consequence
- [ ] Anything the code parses has a schema; no regex over model output
- [ ] Grounding is retrieval, tools, or computation — not a prompt instruction
- [ ] Every claim carries evidence, and the UI links through to it
- [ ] Empty retrieval returns `unknown`, verified by a test
- [ ] Injection case in the suite and passing
- [ ] Nothing irreversible auto-executes

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| Users check every output manually, then stop using it | no evidence to click through to |
| Confident answers about data that does not exist | empty retrieval falls back to the model |
| Different answer each run | free-text output where a schema belonged |
| Numbers that do not reconcile | arithmetic delegated to the model |
| A prompt tweak broke something unrelated | no eval suite |
| Third-party content changed its behaviour | untrusted text treated as instructions |
| "It suggested something dangerous" | consequence in §1 underestimated; no confirm step |

## Don't

- Don't fine-tune. You almost certainly do not need to.
- Don't add a vector database for a few thousand rows — a `LIKE` query is fine, and a
  vector store is real operational cost.
- Don't write provider calls from memory; model IDs and structured-output syntax change.
- Don't auto-execute anything irreversible, at any confidence.
