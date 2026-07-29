# Ship-without-me

**Ship apps from limited context.** Skills that derive the right answer instead of listing
options, and a checker that needs no model.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)](package.json)
[![Skills](https://img.shields.io/badge/skills-27-orange.svg)](skills/)

Most AI-built apps work and still are not launchable. Blank link previews. Default page
titles. No privacy page. A demo login that leaks. An "AI feature" that is a text box.
A form that loses twenty minutes of typing on a validation error.

ship closes that gap in two ways: **27 agent skills** that decide correctly instead of
listing options, and **`ship detect`** — a launch-readiness checker with no model, no API
key, and no dependencies.

---

## Install

### Claude Code

```bash
/plugin marketplace add chaitu237/Ship-without-me
/plugin install ship@ship-without-me
```

Then `/ship-without-me`, `/ship-with-me`, and `/ship-check` are available, and the 25
supporting skills load on demand.

### Any agent that reads `AGENTS.md`

Cursor, Windsurf, Cline, Kiro, Zed, Copilot, Amp, Jules and others read a root-level
instruction file. Copy one file into your project and you have the whole ruleset:

```bash
curl -O https://raw.githubusercontent.com/chaitu237/Ship-without-me/main/AGENTS.md
```

Per-host rule files (`.cursor/rules/`, `.clinerules/`, `.kiro/steering/`, `.windsurf/rules/`,
`.github/copilot-instructions.md`) are in the repo if you prefer them. All are generated
from `AGENTS.md`, so they never disagree with it. See
[docs/portability.md](docs/portability.md).

### The checker, with no agent at all

```bash
npx ship-without-me detect --url https://your-app.com
```

Or from a clone, with nothing installed — it has zero dependencies:

```bash
git clone https://github.com/chaitu237/Ship-without-me.git
node Ship-without-me/cli/detect.mjs --url https://your-app.com
```

### Codex and Gemini CLI

`.codex-plugin/plugin.json` and `gemini-extension.json` ship in the repo. Point your host
at the clone; both read `skills/` directly.

---

## Verify it installed

```bash
npx ship-without-me detect --help     # should print the rule groups
```

In an agent, ask it to *"list the ship skills you can see"* — you should get 27.

## The two ways to build

### `/ship-without-me`

You give a prompt and leave.

```
/ship-without-me a job-tracking app for a car repair shop
```

It decides everything — theme, accent, modules, schema, auth, stack — builds, deploys,
verifies, and hands back a log of every decision it made alone. It never asks a question.
It never spends money, sends messages, or publishes anything without you.

The three properties that make an unattended run trustworthy: every decision is
**defaulted rather than invented**, every decision is **written down with its reason**, and
every claim of "done" is **a command that exited zero**.

Before it builds anything it scales its own depth (a one-line change does not get the full
protocol), derives the **product shape** — work tool, personal product, two-sided,
analytical, developer tool, internal system, automation, or content — writes the **failure
condition** that would make the build technically complete and practically useless, walks a
**leverage ladder** to find what already exists, and compares **routes that differ in kind**
before committing to one with a named fallback and switch condition.

Each build phase then runs three roles in fixed order: **builder → spec reviewer → quality
reviewer**. Spec review asks "does this do what was asked, and nothing more"; quality review
only starts once it passes.

### `/ship-with-me`

You have references and want a say.

```
/ship-with-me build something like this   [screenshot.png]   [competitor.com]
```

It reads your references first — theme, accent, layout, nav, copy — then asks only the
questions whose answers would actually change the build, one at a time, each carrying a
recommendation and a reason. Usually three to six. Nothing is built until you say go.

**It never asks what it can look up.** If you hand it a screenshot, it does not ask what
your brand colour is.

---

## `ship detect`

A deterministic checker. 51 rules, zero dependencies, runs in about a second.

```bash
npx ship-without-me detect                       # auto-detects the repo and the URL
npx ship-without-me detect --url https://…       # check a deployed site
npx ship-without-me detect --rules launch,api    # one group
npx ship-without-me detect --json                # for CI
npx ship-without-me detect --strict              # warnings fail too
```

```
ship detect  repo · https://example.com

  ✗ default-title           <title> is the framework default: "React App"
  ✗ no-og-image             no og:image — every shared link renders blank
  ✗ no-h1                   zero <h1> in served HTML
  ✗ float-money             money column declared FLOAT — use integer minor units
  ✗ tenant-from-request     tenant id read from the request, not the session
  ⚠ css-bloat               84 KB CSS — utility-framework purge likely misconfigured
  ⚠ no-empty-state          1 list view renders a collection with no empty state

  5 failed · 2 warnings
```

Waive any rule inline, with a reason:

```html
<!-- ship-disable no-h1: intentional SPA shell, prerender covers the landing route -->
```

Exit codes: `0` clean · `1` failures · `2` nothing to check. Full rule reference in
[docs/rules.md](docs/rules.md).

---

## The skills

Each is a folder under [`skills/`](skills/) containing a single `SKILL.md`.

**Orchestrators**

| Skill | Answers |
|---|---|
| `ship-without-me` | The user cannot correct me — what makes this run trustworthy? |
| `ship-with-me` | What can I determine alone, and what genuinely requires this person? |

**Design and frontend**

| Skill | Answers |
|---|---|
| `design-system-commit` | What must be identical across every screen to read as one product? |
| `layout-patterns` | What is the user *doing* on this screen? |
| `frontend-architecture` | For each piece of state — who owns it, who needs it, what changes? |
| `app-shell-composition` | What stays put between modules, and what may each module decide? |
| `landing-composition` | What claim does this page make, and what proves it? |

**The details most apps skip**

| Skill | Answers |
|---|---|
| `forms-and-validation` | What does it cost the user if this form loses their input? |
| `states-and-feedback` | What is this screen promising, and is the promise true? |
| `list-and-table` | What is the user trying to find, and how many rows are in the way? |
| `account-lifecycle` | How can a user lose access, change identity, or leave? |
| `onboarding-first-run` | What must a user do before this is worth coming back to? |
| `legal-and-consent` | What are you collecting, from whom, and what did they agree to? |

**Backend and data**

| Skill | Answers |
|---|---|
| `database-schema` | This data outlives the code — what must still be true in five years? |
| `backend-api-design` | Who is the *second* consumer, and what will they assume? |
| `tenant-auth-demo` | Who may see this row, and where is that enforced? |
| `vertical-business-os` | What does this operator do daily, and what record captures it? |
| `grounded-ai-feature` | What will the user do with this, and what does a wrong answer cost? |
| `payments-billing` | What happens to this money *after* the first successful charge? |
| `feed-and-social` | Who may reach whom, who decides, and what happens on abuse? |

**Launch and operate**

| Skill | Answers |
|---|---|
| `ship-ready-audit` | What does the world see before JavaScript runs? |
| `deployment-hardening` | What changes when a stranger depends on this? |
| `deploy-durability` | What differs between the machine where it works and the one where it doesn't? |

**Situational**

| Skill | Answers |
|---|---|
| `initial-content-bootstrap` | Where does the first useful content come from, and what makes it trustworthy? |
| `rescue-existing-project` | What is actually true about this codebase, versus what it claims? |
| `regional-commerce-stack` | What is non-negotiable in this market — by law, or by user reality? |
| `field-ops-mobile` | What can this user do, given the device, hands, light, and signal? |

---

## Why "derivation-first"

A skill that catalogues has not generalized. It tells an agent what exists, not how to
decide, and it collapses on the first case its author did not see.

```
✗  "Here are eight hero variants. Pick one."

✓  "The hero visual is the evidence for the headline's claim.
    Ask where the value lives; the visual falls out of the answer."
```

Every skill here is held to one test: **would it produce the right answer for a case its
author never saw?** That requires a derivation over *properties of the situation*, never a
menu of solutions — categories run out, properties do not.

Every skill therefore carries:

1. **The generating question** — one sentence
2. **A derivation** — 2–4 questions whose answers produce the decision
3. **The common answers**, demoted to reference and explicitly overridable
4. **Micro-details**, each paired with the specific failure it prevents
5. **Verification** — what is automated, and what is honestly judgement
6. **A symptom → cause table** — because a rule with no cause cannot be correctly broken

Authoring rules: [`skills/AUTHORING.md`](skills/AUTHORING.md).

---

## Design principles

**Decide, don't dither.** Every choice has a default. An agent that asks you to pick a
shade of blue has failed.

**Verify, don't assert.** Every skill ends in a runnable check. "Done" means a command
exited zero.

**Rules don't need a model.** Anything expressible as a rule lives in `ship detect`,
running in milliseconds for free. The model is reserved for judgement.

**Three modules, not six.** A focused v1 gets used. A sprawling one becomes six
half-finished screens.

**The user wins.** Override any default and it complies — says so once, then drops it.
No re-arguing, no quietly reverting mid-build.

**Descriptions are the only thing on the hot path.** Skill bodies load on demand;
descriptions do not. All 25 are held under ~250 characters, which keeps the always-loaded
cost near 1,200 tokens instead of 2,500.

---

## Repository layout

```
skills/               27 skill folders, one SKILL.md each
  AUTHORING.md        the standard every skill is held to, enforced in CI
  <skill>/eval/       cases.jsonl — what the skill claims, made testable
cli/detect.mjs        the checker: 51 rules, zero dependencies
commands/             slash commands — .md (Claude Code) + .toml (Gemini CLI)
scripts/              generators and validators, all run by `npm test`
docs/
  rules.md            every rule, what it catches, how to waive it (generated)
  portability.md      which hosts get what, and how to add another
  evaluation.md       how a skill's claim is measured
AGENTS.md             the portable ruleset — read automatically by a dozen agents
CONTEXT.md            shared vocabulary, so 27 skills cannot drift apart
.claude-plugin/       Claude Code plugin + marketplace manifests
.codex-plugin/  gemini-extension.json
.cursor/ .clinerules/ .kiro/ .windsurf/ .github/   per-host rule files, generated
```

Nothing in this repo is hand-copied. The per-host rule files are generated from
`AGENTS.md` and `docs/rules.md` from `cli/detect.mjs`, and CI fails if either drifted.

## Documentation

| Read this | When |
|---|---|
| [docs/rules.md](docs/rules.md) | a rule fired and you want to know why |
| [docs/portability.md](docs/portability.md) | your agent is not listed above |
| [docs/evaluation.md](docs/evaluation.md) | you want to measure whether a skill works |
| [skills/AUTHORING.md](skills/AUTHORING.md) | you are writing or editing a skill |
| [CONTEXT.md](CONTEXT.md) | you are unsure which word this project uses |
| [CONTRIBUTING.md](CONTRIBUTING.md) | you are opening a pull request |
| [SECURITY.md](SECURITY.md) | you found a rule that fails open |
| [CHANGELOG.md](CHANGELOG.md) | you want to know what is not done yet |

## Contributing

New skills must pass the derivation test in [`skills/AUTHORING.md`](skills/AUTHORING.md).
A pull request adding a catalogue will be asked for the generating question first. See
[CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT — see [LICENSE](LICENSE).
