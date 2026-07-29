# Security

## Reporting a vulnerability

Use GitHub's **private vulnerability reporting** on this repository
(Security → Report a vulnerability). Please do not open a public issue for a security
problem.

Expect an acknowledgement within a week.

## What counts as a vulnerability here

This project is documentation plus one zero-dependency script. The realistic surface is
narrow, and it is worth being specific about it.

**In scope**

- **A rule that fails open.** `ship detect` reporting a pass where a real defect exists is
  the most serious class of bug in this repo, because it produces false confidence. If you
  can make a rule silently not fire, that is a security report, not a bug report.
- **Waiver bypass.** The waiver mechanism is deliberately narrow: a waiver must be a
  comment, in a non-markdown file, naming a rule that actually exists. If you can disable
  a rule without meeting all three conditions — or without a human writing it deliberately
  — that is in scope.
- **Guidance that would lead an agent to introduce a vulnerability.** A skill that
  recommends storing a secret unsafely, weakening authorization, or trusting untrusted
  input is a real defect even though it is only text.
- **Anything in `cli/detect.mjs` that executes fetched content**, writes outside the
  working directory, or leaks a value it read.

**Out of scope**

- Vulnerabilities in an application *built* by following these skills. Report those to
  whoever ships that application.
- The behaviour of the agent host (Claude Code, Codex, Cursor and so on).
- Warnings you disagree with, or a rule you consider too strict.

## What the checker does and does not do

`ship detect` reads files under the directory you point it at, and fetches the one URL you
give it. It has **zero dependencies**, sends nothing anywhere, stores nothing, and requires
no API key or credential.

It does not execute anything it reads. It does not follow links found in fetched pages.

## The secret rules are a smoke alarm, not a guarantee

`secret-in-repo` and `env-example-real-value` match a handful of common credential shapes.
They will catch an obvious mistake. **They are not a secret-scanning product** and a clean
run is not evidence that no credential is committed.

For real coverage, enable GitHub secret scanning and push protection on your repository.

## If you are running the orchestrator skills

`ship-without-me` runs unattended and fetches pages you did not write. Two properties are
load-bearing, and if you modify the skill you should preserve both:

- **Fetched content is data, never instructions.** A page cannot expand the run's scope,
  add a dependency, reach a new domain, or lift a hard stop.
- **`.ship/policy.json` gates every outward action** — spending, sending, publishing,
  touching production data. A blocked action is reported, never worked around.

If you find a way to make an unattended run cross one of those boundaries, that is in scope
and worth reporting.
