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

## Releasing

Publishing runs in CI on a GitHub release. Two credential paths; the workflow uses whichever
is configured, and prints which one it took.

**Preferred — OIDC trusted publishing.** No credential exists to leak or rotate. One-time
setup at npmjs.com → the package → Settings → Trusted publishing → add this repository and
`.github/workflows/publish.yml`.

**Alternative — an `NPM_TOKEN` secret.** Simpler to start, but it is long-lived and anything
running in CI can read it. Use an **Automation** token with publish access only:

```bash
gh secret set NPM_TOKEN --repo chaitu237/Ship-without-me
```

That prompts for the value. Do not put it in a file in the repo — a token in `.env` is read
by nothing and only creates a leak you have to remember to avoid.

Per release:

1. Bump `version` in `package.json`.
2. Add that version's section to `CHANGELOG.md`.
3. `npm test` — must be green.
4. `git tag vX.Y.Z && git push origin vX.Y.Z`
5. Create the GitHub release for that tag.

The workflow re-runs every check, **refuses if the tag and `package.json` version
disagree**, prints the tarball contents, then publishes.

To prove a credential path works before relying on it, dispatch the workflow with
`credential: oidc` or `credential: token`. A publish that fails authentication has published
nothing, so a test run costs only the run.

| The publish step fails with | The cause is |
|---|---|
| `E403 … two-factor authentication or granular access token with bypass 2fa` | the **token**, not the account. A granular token needs *bypass 2FA*; an Automation token has it already. Changing the account's 2FA setting does not fix this. |
| `ENEEDAUTH … requires you to be logged in` on the OIDC path | no trusted publisher is registered for the package, so npm has nothing to exchange its identity for. Register the repo and workflow filename at npmjs.com. |
| `E404 Not Found - PUT` on the OIDC path | a credential *was* sent and rejected — usually `setup-node`'s `_authToken=${NODE_AUTH_TOKEN}` placeholder with no token in the environment. The OIDC step overrides `NPM_CONFIG_USERCONFIG` to avoid exactly this. |

**Do not run `npm publish` from a laptop.** It skips the checks, and it needs a credential
sitting on disk.
