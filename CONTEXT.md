# Terminology

27 skills cross-reference each other. When two of them use different words for the same
thing, an agent reading both cannot tell whether it is one concept or two — so it invents a
distinction that does not exist.

This file pins the vocabulary. If you add a skill, use these words. If you need a new one,
add it here first.

## Defined terms

**Skill** — one folder under `skills/` containing exactly one `SKILL.md`. Never called a
command, a prompt, a module, or a playbook.
*Avoid:* prompt, playbook, module, rule-set

**Orchestrator** — `ship-with-me` or `ship-without-me`. The two skills that run a whole
build by invoking others. Every other skill is a **domain skill**.
*Avoid:* master skill, meta-skill, controller (except when naming the agent role — see below)

**Controller** — the agent running an orchestrator. It dispatches builders and reviewers,
holds the plan, and synthesises. It does not write product code itself.
*Avoid:* main agent, parent, coordinator

**Builder** — a subagent that implements one phase. **Spec reviewer** checks it did what was
asked and nothing more; **quality reviewer** checks it is well built. Those three names are
fixed, and the order is fixed.
*Avoid:* implementer, coder, developer agent, critic (the critic is a distinct role — below)

**Critic** — the Phase 2 agent that argues the *plan* is wrong, before code exists. The
Phase 5 **red-team** argues the *result* is wrong, after. Different roles, different phases.
*Avoid:* using critic and red-team interchangeably

**Phase** — one numbered stage of an orchestrator run (Phase 0, Phase 1, …). A phase
contains **steps**. Never use step for a phase or vice versa.
*Avoid:* stage, wave, round

**Derivation** — the decision tree in a skill that produces an answer from properties of
the situation. The thing that makes a skill a skill rather than notes.
*Avoid:* framework, flowchart, algorithm

**Generating question** — the one-sentence question a skill answers, stated at its top.
*Avoid:* purpose, objective, mission

**Failure condition** — what would make a build technically complete and practically
useless. Written in Phase 0, re-read in Phase 4. Singular, per build.
*Avoid:* risk, failure mode (those are Phase 5 red-team findings, which are plural)

**Completion state** — one of the nine labels from `Explored` to `Production-verified`.
Never "done", "finished", or "complete" as a bare claim.
*Avoid:* done, shipped, complete

**Vertical slice** — one journey working end to end, with a failure path. Not a layer, not
a module, not a milestone.
*Avoid:* MVP, phase one, milestone

**Operator** — the person who uses a work-tool product repeatedly to do their job. Only
meaningful for the **work tool** product shape; other shapes have a **primary user**.
*Avoid:* using operator generically — a consumer app has no operator

**Primary user** — whoever receives value first, in any product shape. The general term.
*Avoid:* end user, customer (customer means the person who pays, which may be someone else)

**Product shape** — one of the eight categories derived in Phase 0b: work tool, personal
product, two-sided, analytical, developer tool, internal system, automation, content.
*Avoid:* vertical, category, type

**Detector** — `ship detect`, the deterministic rules engine. Its outputs are **findings**,
each carrying a **rule** id at level `fail` or `warn`.
*Avoid:* linter, scanner, checker (in prose "checker" is acceptable; in skills use detector)

**Judgement check** — a verification item a human or agent must assess because no rule can
express it. Always separated from **automated** checks in a skill's Verify section.
*Avoid:* manual test, soft check

**Evidence pack** — the sourced findings a research agent writes to `.ship/research/`.
**Provenance** is the per-record source of content in a shipped product. Different things.
*Avoid:* mixing evidence and provenance

## Relationships

- An **orchestrator** invokes many **domain skills**; a domain skill never invokes an orchestrator
- A **controller** dispatches one **builder** then two reviewers, per **phase**
- A **skill** contains exactly one **derivation** and one **generating question**
- A **build** has one **failure condition** and many red-team **findings**
- A **product shape** determines what **first value event** and **vertical slice** mean

## Resolved ambiguities

- "wave" and "phase" were both used for orchestrator stages — resolved: **phase**. Wave is
  no longer used.
- "operator" was used generically for any user, which broke for consumer and developer
  products — resolved: **operator** is work-tool-specific; **primary user** is general.
- "critic" was used for both the plan critic and the result red-team — resolved: **critic**
  is Phase 2 (plan), **red-team** is Phase 5 (result).
- "done" was used as a completion claim — resolved: always a **completion state** from the
  nine-label ladder.
- "MVP" appeared alongside "vertical slice" — resolved: **vertical slice**. MVP carries
  scope-negotiation baggage that the slice definition does not.
