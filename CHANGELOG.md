# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Not yet done

- Neither orchestrator has been run end to end against a real project. The detector is
  self-tested against fixtures; the `/ship-with-me` interview and the wave pipeline are not
  yet exercised. Treat `0.1.0` as pre-release until they are.

## [0.1.2]

### Fixed

- README formatting standardized: every code fence carries a language tag, no line over
  96 characters except badge URLs (a shields.io token cannot be wrapped), no trailing
  whitespace, one `h1`, seven tables all using the same separator style, and every local
  link verified to resolve.
- The CI badge linked via a GitHub-relative path, which resolves on github.com but breaks
  anywhere else the README is rendered. Absolute URL now.

## [0.1.1]

### Fixed

- README contradicted `ship-without-me`: it named the build roles "spec reviewer" where the
  skill says **scope review**. A README that disagrees with the skill it documents is worse
  than one that says less.
- "Verify it installed" told you to run the checker from a clone, which is not how most
  people install it. It now exercises the published path.
- The consumer CI snippet pinned Node 20; the package is tested on 22.
- `package.json` normalized so npm stops silently rewriting `bin` paths and
  `repository.url` at publish time — a published manifest should match the committed one.

### Added

- npm, CI and zero-dependency badges, now that the package is published.

## [0.1.0]

First packaged version.

### Added

- **27 skills**, each in derivation form: a generating question, a derivation over
  properties of the situation, the common answers demoted to reference, micro-details paired
  with the failure each prevents, verification split into automated and judgement, and a
  symptom→cause table.
  - Orchestrators: `ship-without-me`, `ship-with-me`
  - Design and frontend: `design-system-commit`, `layout-patterns`,
    `frontend-architecture`, `app-shell-composition`, `landing-composition`
  - Commonly skipped detail: `forms-and-validation`, `states-and-feedback`,
    `list-and-table`, `account-lifecycle`, `onboarding-first-run`, `legal-and-consent`
  - Backend and data: `database-schema`, `backend-api-design`, `tenant-auth-demo`,
    `vertical-business-os`, `grounded-ai-feature`, `payments-billing`, `feed-and-social`
  - Launch and operate: `ship-ready-audit`, `deployment-hardening`, `deploy-durability`
  - Situational: `initial-content-bootstrap`, `rescue-existing-project`,
    `regional-commerce-stack`, `field-ops-mobile`

- **A product-building protocol in both orchestrators**, replacing the previous
  jump from brief straight to defaults:
  - **Depth scaling** — Quick / Standard / Deep, lightest mode that can be correct
  - **Product shape derivation** — work tool · personal · two-sided · analytical ·
    developer tool · internal system · automation · content. The shape decides what
    "value" and "a complete slice" mean, so it is derived before anything else
  - **Failure condition** — what would make the build technically complete and
    practically useless, written in Phase 0 and re-read after all checks pass
  - **Leverage ladder** — 11 rungs, custom development last
  - **Route comparison** — 3-5 routes differing in kind, weighted matrix, primary
    plus fallback plus a named switch condition
  - **Smallest complete vertical slice** — one journey end to end with a failure path
  - **Three roles per build phase** — builder → scope review → quality review, in
    that order, with four builder statuses and per-phase model tiering
  - **Red-team phase** on the result, ranked by likelihood × impact × detectability ×
    reversibility
  - **Completion states** — Explored → … → Production-verified, never blurred
  - **Perfection allocation and complexity budget**
  - **Multi-source domain research** — practitioner vocabulary, statutory layer,
    competitor documentation, and the spreadsheet or form they use today
- **`ship detect`** — 51 deterministic rules across 12 groups. Zero dependencies, no model,
  no API key. Auto-detects the repo and the deployed URL with no arguments. Inline waivers
  with a required reason. Exit `0` clean, `1` failures, `2` nothing to check.
- **`skills/AUTHORING.md`** — the derivation test every skill is held to, enforced in CI.
- **Host adapters** — Claude Code and Codex plugin manifests, Gemini CLI extension, and
  instruction-tier rule files for Cursor, Windsurf, Cline, Kiro and Copilot, all generated
  from `AGENTS.md` so they cannot drift.
- **Slash commands** — `/ship-without-me`, `/ship-with-me`, `/ship-check`, in both Claude
  Code (`.md`) and Gemini CLI (`.toml`) formats.
- **CI** — skill frontmatter validation, description budget enforcement, adapter sync check,
  generated-doc freshness check, and a detector self-test that asserts rules fire on a
  broken fixture *and* go quiet on a fixed one.

### Fixed

- **Descriptions rewritten to triggering-conditions-only.** A description that
  summarises what a skill contains creates a shortcut an agent takes *instead of*
  reading the body. All descriptions now open with "Use when/before" and state only
  symptoms and situations. Hot-path cost fell
  from ~2,543 to ~660 tokens.
- **Resume safety in `ship-without-me`.** A re-opened or resumed phase re-runs from the
  start of that phase, so external side effects repeated. Phases now record intent under
  a stable key before acting, check it on entry, and commit only at phase end.
- **`spacing-off-scale` false negative.** The CSS declaration pattern required a trailing
  semicolon, silently missing the last declaration in every block. Found by the
  self-test's go-quiet direction.
- **Generalized away a domain bias.** The protocol previously assumed an operator running
  a trade, which broke for consumer, developer, analytical and content products. Product
  shape is now derived rather than assumed.

### Design decisions worth recording

- **Descriptions are the only thing on the hot path.** Skill bodies load on demand;
  descriptions are always in context. All 25 are held under 280 characters, keeping the
  always-loaded cost near 1,200 tokens rather than 2,500. Enforced by `check-skills.mjs`.
- **No phantom checks.** Where a rule cannot be expressed mechanically — whether cards are
  equal height, whether a hero shows the real product — the skill states it as a judgement
  checklist rather than referencing a `--rules` group that does not exist.
- **Adapters are generated, never hand-copied.** Instruction-tier hosts need the rule text
  inline, and hand-copying drifts invisibly. `scripts/sync-adapters.mjs` generates them from
  `AGENTS.md` and CI fails if any is stale.
- **Skills contain no images and no third-party product names.** Images cost tokens and go
  stale; naming other people's products as case studies dates badly and invites dispute.
