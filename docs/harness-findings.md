# Harness run — three briefs, three shapes, independent evaluation

Method: install from the **published npm package** (not local symlinks), wire per
`docs/portability.md` verbatim, write predictions **before** inspecting output, build
unattended, then evaluate with contexts that were not told what the controller expected.

| Case | Brief detail | Derived surface | Scope invented? |
|---|---|---|---|
| habit tracker | one sentence | pixels · identity none · local · private | none |
| CSV rollup | a few constraints | **a schedule, nobody watching** | none |
| clinic booking | full written spec | pixels · **workspace** · server · **internal** | none |

**Instruction detail changed what was asked, not how much was built.** The one-sentence
brief did not acquire a backend or accounts; the detailed brief did not acquire multi-tenancy
or a marketing page. That was the controller's written prediction for the failure mode in
each case, and it did not occur in any of the three.

## What the routing got right

The two hardest calls both landed. A single clinic with staff accounts created by a manager
resolved to `workspace`, **not** multi-tenant — so no tenant-isolation machinery. Its
distribution resolved to `internal`, so no landing page and no launch audit. A scheduled job
resolved to a non-pixel surface and took **zero** conditional skills.

## What it got wrong, and how it was found

Two routing gates were a rung too loose. Both were found by **diffing what the agent
selected against what `scripts/plan.mjs` resolves from the same profile** — and in both
cases the live agent was right and the table was wrong:

- `tenant-auth-demo` gated on `identity_model>=workspace` handed tenancy to one clinic.
- `initial-content-bootstrap` fired for a cron job, which has no first-run screen.

That is the third time a live run has corrected the registry. **The agent-versus-resolver
diff is now a permanent part of the method**, not a one-off.

## The finding that mattered most

The CSV job's brief said *"must not double-count if it runs twice."* Its own report said:

> **Is it true?** No. — Second run produces identical SHA-256 of the weekly file.

Both halves of its failure condition were true. An independent adversarial review made it
double-count two ways and found it exits 0 on malformed input. The controller's own check
had been the happy path, and passed.

**The protocol step was not missing.** It ran, it was legible, and it returned the wrong
answer — because the context that spent the whole run gathering nominal evidence also graded
itself against a condition that only appears off the nominal path. Hence: the
failure-condition verdict is dispatched to a fresh context that gets the condition and the
artefact and nothing else, and evidence for a named-critical requirement must be adversarial.

## The fix that failed, and the one that worked

The first attempt told the run to dispatch its failure-condition verdict to an independent
context and report that it had. The next run reported *"Independent review (fresh context,
adversarial inputs) confirmed"* — no such review existed in any artefact, malformed input
exited 0 where it claimed 1, and the double-count was live. **The instruction produced the
sentence, not the review.**

Two other rules from the same change did hold: `--help` printed once, `--json` parsed. The
difference is not effort or importance — those are checkable from outside the run at the
moment they are written, and "I dispatched a fresh context" is not.

Replaced with `.ship/CLAIMS.md` — the command and its actual output, per claim. On the next
run every row was re-executed by the controller and every one was true, including the mtime
double-count that had survived twice, and malformed input exiting non-zero, which had been
claimed falsely. Its own suite gained regression tests for defects nobody had told it about
(`stale weekly file removed when sources no longer include that week`), and the verdict
language changed from "No" to **"No evidence that it is."**

**Caveat: n=1, and the attribution is not clean.** That run carried the transcript rule, the
adversarial-evidence rule, and the hardened CLI checks together. What can be said is that
the specific failure the transcript rule targets — a fabricated verification claim — did not
recur, and the claims became checkable in a way the previous form never was.

## What is still unproven

- **One host.** Everything here ran on one agent CLI. Portability is structurally checked,
  behaviourally untested elsewhere.
- **Concurrency.** The clinic tool's booking constraint is check-then-insert inside a
  deferred transaction with no database-level exclusion. It is safe because the driver is
  synchronous and there is one process — an accident of the driver, not a design guarantee,
  and its own tests never mention concurrency.
- **30 of 35 skills ship no eval cases**, so most claims here rest on run evidence rather
  than a measured baseline-versus-candidate comparison.
