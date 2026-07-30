# Portability

ship is a skill distribution, not a framework. The skills in `skills/` hold the
behaviour; everything host-specific is a thin adapter pointing back at them.

## Four tiers

| Tier | What the host gets | How |
|---|---|---|
| **Plugin** | Skills, slash commands, hooks | native plugin manifest |
| **Instruction** | The ruleset and checklists, no slash commands | `AGENTS.md` at the repo root |
| **CLI** | The 51 deterministic rules | `npx @chaitu237/ship-without-me detect` — no agent at all |
| **Manual** | Everything | read `skills/*/SKILL.md` directly |

## Hosts

| Host | Tier | Files |
|---|---|---|
| Claude Code | Plugin | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `commands/*.md`, `skills/` |
| Codex | Plugin | `.codex-plugin/plugin.json`, `skills/` |
| Gemini CLI | Plugin | `gemini-extension.json` (points `contextFileName` at `AGENTS.md`), `commands/*.toml`, `skills/` |
| GitHub Copilot | Instruction | `.github/copilot-instructions.md` |
| Cursor | Instruction | `.cursor/rules/ship.mdc` |
| Windsurf | Instruction | `.windsurf/rules/ship.md` |
| Cline | Instruction | `.clinerules/ship.md` |
| Kiro | Instruction | `.kiro/steering/ship.md` |
| Zed · Amp · Jules · Junie · Antigravity | Instruction | `AGENTS.md` from the repo root |
| Any CI, any repo | CLI | `npx @chaitu237/ship-without-me detect` |

## `AGENTS.md` is the highest-leverage file here

A dozen agents read `AGENTS.md` from the repository root with **zero configuration**. It is
the single file to keep correct, and every instruction-tier adapter is kept aligned to it
rather than diverging.

If you are adding ship to a project by hand, copying `AGENTS.md` into the root is 90% of
the value and takes one command.

## The adapter rule

**Keep adapters thin.**

- Host supports skills → point it at `skills/`. Do not copy skill content.
- Host supports hooks → point it at `hooks/`.
- Host supports only one instruction file → keep that file's text aligned to `AGENTS.md`.

An adapter that contains its own copy of the rules will drift, and the drift is invisible
until two hosts behave differently on the same repo.

## Why the CLI tier matters

Skills do not port. **Binaries do.**

An agent that cannot load a `SKILL.md` — or a CI pipeline with no agent at all — can still
shell out to `ship detect` and get the same 51 checks. That is why the detector has zero
dependencies and reads nothing but the filesystem and one URL: it is the part that works
everywhere, forever, with no integration.

## Adding a host

1. Find out which tier it supports.
2. Add the thinnest adapter that reaches that tier.
3. Add a row to the table above, with the tier and the files.
4. If it is instruction-tier, verify the text matches `AGENTS.md`.
