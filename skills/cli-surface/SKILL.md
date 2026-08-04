---
name: cli-surface
description: >
  Use when building a command-line tool, or any deliverable reached through argv/stdin/
  stdout/exit code rather than a browser. Use when a build with a `bin` field is about to
  get a theme, a viewport, or a login screen.
license: MIT
metadata:
  routing: conditional
  applies-when: "consumed_via=a terminal"
---

# CLI surface

**The question this skill answers:** what makes a command-line tool trustworthy to script
against, not just pleasant to run once by hand?

A CLI has two consumers on one surface: a person at a keyboard, and another program at the
other end of a pipe. Most CLI failures are building for only the first and breaking the
second — a progress bar that pollutes stdout, a prompt that hangs forever when stdin isn't
a terminal, an exit code that's always `0` because nobody checked what failure should return.

## Derive it

```
Who is downstream of this invocation?
├─ a person, interactively ────► human-readable output, colour if a TTY, a spinner is fine
├─ another program, piped ─────► stdout carries ONLY the data; logs go to stderr; no colour
│                                 codes unless explicitly requested; no interactive prompt
└─ unknown at build time ──────► detect: is stdout a TTY? Behave accordingly, always.
                                  Never assume interactive.
```

```
What does this invocation's outcome mean to the caller?
├─ succeeded ───────────────────► exit 0
├─ failed for a reason the user can fix ─► exit 1, message on stderr naming the fix
├─ failed for a reason the tool can't explain ─► exit 1, and the message says that plainly
├─ misused (bad flags) ─────────► exit 2, and print usage
└─ a distinct failure a script might branch on ─► a documented, stable nonzero code
```

`0` for success, nonzero for failure — always, no exceptions. A tool that returns `0` on
error is invisible to `&&`, `set -e`, and CI, which is the exact audience a CLI's exit code
exists for.

## Micro-details, each preventing a specific failure

- **`--help` and `-h` are not optional, and neither is `--version`.** They are the CLI's
  landing page — the thing a stranger checks before trusting the tool at all.
- **Never block on a prompt when stdin is not a TTY.** A script piping input into your tool
  and getting silently stuck on a "Continue? [y/N]" is a hung CI job, discovered at 2am.
- **Offer `--json` (or the ecosystem norm) wherever output might be consumed by a program.**
  Human-readable and machine-readable are not the same format with colour stripped; a
  machine format is a stable contract and should be versioned like one.
- **Never print progress, banners, or "done!" to stdout.** stdout is the data channel; a
  single stray `console.log('Starting...')` ahead of real output breaks every consumer
  piping through `jq` or `awk`.
- **Flags are additive and consistent with the ecosystem's convention**, not invented fresh.
  `--verbose`/`-v`, `--quiet`/`-q`, `--dry-run` mean the same thing everywhere; reusing them
  is free trust, redefining them is a footgun for anyone who has used another CLI.
- **A destructive action needs a `--force` or confirmation, not a silent default-yes.**
  The floor from `AGENTS.md` — confirm only the irreversible — applies here exactly as it
  does to a UI; the manifestation is a flag, not a dialog.
- **Config precedence is explicit and documented**: flag beats env var beats config file
  beats default. Undocumented precedence is a support ticket waiting to happen.

## Verify

Automated:
- `--help` and `--version` both exit 0 and print something
- A deliberately-wrong invocation exits nonzero and the message goes to stderr
- Piping the tool's stdout into another process consumes only data, not logs
- Running with `< /dev/null` (no TTY) does not hang

Judgement:
- Would a script author trust this tool's exit code without reading its source?
- Does `--help` alone tell someone everything they need to run the tool correctly?

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| CI hangs on this step with no error | An interactive prompt fired with no TTY present |
| `tool | jq .` fails to parse | Log lines or a progress banner mixed into stdout |
| `tool && echo ok` prints "ok" after a failure | Exit code always 0 regardless of outcome |
| Users paste `--help` output into an issue asking what a flag does | `--help` text is a summary, not real documentation |
| A script that worked yesterday breaks after an update | An undocumented output format change with no `--json` contract |
| The tool got a theme, a viewport breakpoint, or a login screen | The binding surface was never derived — see `product-profile` |

## Don't

- Don't assume the terminal is interactive.
- Don't put logs, banners, or progress text on stdout.
- Don't return `0` for a failure because nobody wrote the error path yet.
- Don't invent flag names the ecosystem already has a convention for.
