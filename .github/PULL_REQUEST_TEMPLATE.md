## What this changes

## If you added or edited a skill

- [ ] States the question it answers, in one sentence
- [ ] Derivation branches on **properties of the situation**, not categories of solution
- [ ] Every micro-detail names the failure it prevents
- [ ] Verification separates automated from judgement — no check the tooling cannot run
- [ ] Symptom→cause table present
- [ ] `eval/cases.jsonl` covers the behaviour, every `expect` has a `because`
- [ ] Description opens with "Use when/before", under 280 chars, triggers only
- [ ] Vocabulary matches `CONTEXT.md`

## If you added a detector rule

- [ ] Zero dependencies
- [ ] Fires on a broken fixture **and goes quiet on a fixed one** — both directions
- [ ] Added to a group in `RULE_GROUPS`
- [ ] `node scripts/gen-rules-doc.mjs` re-run

## Checks

```
npm test
```

- [ ] Green
