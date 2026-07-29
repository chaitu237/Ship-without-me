# Contributing

## The one bar a new skill has to clear

**Would this skill produce the right answer for a case its author never saw?**

If the instruction is a list, no — the agent picks the nearest listed item and is wrong in
a new way. If it is a derivation, yes — the agent runs the procedure and arrives somewhere
you never enumerated.

A pull request that adds a catalogue will be asked for its generating question first. Read
[`skills/AUTHORING.md`](skills/AUTHORING.md) before opening one; it is short and it is the
whole review rubric.

## Adding a skill

```
skills/<kebab-case-name>/SKILL.md
```

Required frontmatter:

```yaml
---
name: kebab-case-name          # must match the folder name
description: >
  What it does. Use on "trigger phrase", "another trigger phrase".
---
```

**The description is the only part on the hot path.** Bodies load on demand; every
description sits in context on every request. Keep it **under 250 characters**, two parts
only — what it does, then the literal phrases that should trigger it. Quote the triggers.

Then the seven sections from `AUTHORING.md`, in order: generating question · derivation ·
common answers (as reference) · micro-details paired with failures · verification ·
symptom→cause table · don't.

### Checklist before you open the PR

- [ ] `name` matches the folder, kebab-case
- [ ] Description under 250 chars, with quoted trigger phrases
- [ ] Description **discriminates against its neighbours** — if two skills could both
      plausibly match a request, one is written wrong or they should be one skill
- [ ] Generating question stated as one sentence
- [ ] Derivation branches on **properties of the situation**, not categories of solution
- [ ] Derivation ends with an escape hatch that sends the agent back, not forward
- [ ] Every micro-detail names the failure it prevents
- [ ] Verification separates **automated** from **judgement** — never claim a check the
      tooling cannot run
- [ ] Symptom→cause table present
- [ ] 100–200 lines. Longer usually means two skills, or a catalogue crept in

## Adding a detector rule

Rules live in `cli/detect.mjs`. Constraints, in order of importance:

1. **Zero dependencies.** Node 18+ built-ins only. This is what lets `npx ship-without-me detect`
   run anywhere with no install step.
2. **No false positives.** A noisy rule gets the whole tool disabled. If you cannot
   express it without flagging correct code, it belongs in a skill's judgement checklist
   instead.
3. **`fail` vs `warn`** — `fail` means "this is broken for real users". `warn` means "this
   is probably wrong". When unsure, `warn`.
4. **Add it to a group** in `RULE_GROUPS`, and to `all`.
5. **Waivable** — every rule respects `ship-disable <id>: reason`.

Then regenerate the reference:

```bash
node scripts/gen-rules-doc.mjs
```

`docs/rules.md` is generated. Do not hand-edit it.

### Testing a rule

Build a fixture directory with the defect, confirm the rule fires, then fix the fixture and
confirm it goes quiet. Both directions — a rule that never goes quiet is as useless as one
that never fires.

## Adding a host adapter

Keep adapters thin. Where a host supports skills or hooks, **point it at the existing
`skills/` directory** rather than copying anything. Where a host only supports a single
instruction file, keep its text aligned to `AGENTS.md`.

Add a row to [`docs/portability.md`](docs/portability.md) saying which tier the host gets
and why.

## Style

- British or American spelling, consistently within a file.
- Prose over bullet lists where the reasoning matters; lists for things that genuinely
  enumerate.
- Name the failure, not just the rule. "Do X" is arbitrary; "do X, because otherwise Y"
  can be argued with on the merits, which is what makes it survivable.
- No screenshots or images in skills. They cost tokens and go stale.
- No third-party product names as case studies.

## Running the checks

```bash
npm test                      # syntax + CLI smoke
node scripts/gen-rules-doc.mjs
npx ship-without-me detect --help
```
