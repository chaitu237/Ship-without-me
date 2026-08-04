---
name: library-surface
description: >
  Use when building a library, SDK, or package published for other code to import — no
  application, no UI, no deployment. Use when a build with no `bin` field and no server is
  about to get a theme, a landing page, or a database.
license: MIT
metadata:
  routing: conditional
  applies-when: "consumed_via=an import"
---

# Library surface

**The question this skill answers:** what makes an importable package trustworthy to
depend on, not just correct on the machine that wrote it?

A library's consumer is always another program, reached through a language's module and
type system — never a person looking at pixels. Its floor is compile-time and contract
guarantees, not rendered states. The most common failure is building the implementation
correctly and shipping the *package* wrong: a broken entry point, an untyped surface, a
tarball full of test files, a breaking change with a patch-level version.

## Derive it

```
What does "correct" mean for a consumer who never runs your code directly?
├─ it resolves ─────────► the declared entry points (main/module/exports) actually exist
│                          in the published output, not just in source
├─ it type-checks ──────► consuming code gets real types, not `any`, against the BUILT
│                          .d.ts — not the source, which the consumer never sees
├─ it behaves as documented ► at least one usage example in the README actually executes
│                          against the published package, not an aspirational snippet
└─ it doesn't break silently ► a breaking change bumps major; a consumer pinned to ^1.0.0
                           must never receive one
```

## Micro-details, each preventing a specific failure

- **Test the *published* artifact, not the source tree.** `npm pack --dry-run` (or the
  ecosystem equivalent), then install the resulting tarball into a scratch project and run
  the README's own example against it. Source-tree tests passing proves nothing about what
  ships.
- **The tarball should contain runtime code and nothing else.** Test files, source maps
  that leak internal paths, config files, and `.env` fragments have no reason to ship, and
  each is either bloat or a small information leak.
- **Types are part of the API, not an afterthought.** A `.d.ts` that doesn't match runtime
  behaviour is worse than no types — it makes the compiler lie to the consumer with
  authority.
- **Peer dependencies are declared, never bundled.** Bundling React into a React component
  library gives every consumer two React instances and a bug that only appears in
  production, at the exact call site nobody would think to check.
- **A public export removed or changed is a major version, full stop** — even one used by
  "probably nobody." The consumer who *is* depending on it finds out from a broken build,
  not from a changelog they had no reason to read yet.
- **The first thing a consumer reads is the README's first code block.** If it doesn't
  run verbatim after `npm install`, the library's real documentation is "read the source,"
  and that is a tax on every future user.
- **Errors thrown across the package boundary should be typed or documented**, not a raw
  string a consumer has to pattern-match to handle.

## Verify

Automated:
- `npm pack --dry-run` output reviewed: no test files, no source maps with local paths
- Installing the packed tarball into a scratch project and importing it succeeds
- `tsc --noEmit` (or equivalent) against a consumer file using the published `.d.ts` passes
- The README's first usage example executes against the packed install, unmodified
- `package.json` declares peer dependencies it does not also list as direct dependencies

Judgement:
- Would a maintainer of a large, unrelated codebase trust this in their dependency tree?
- Is the version number honest about what actually changed?

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| `import` fails only after publishing, never locally | Entry point tested against source, not the built/packed output |
| Consumers get `any` for everything | `.d.ts` missing, stale, or not included in `files` |
| "Works on my machine" bug reports from consumers | React/Vue/etc. bundled instead of declared as a peer |
| A patch release breaks consumers | A public export changed without a major bump |
| The README example throws on first try | Never executed against the actual published package |
| Bundle includes `__tests__/`, `.env.example`, or `*.map` with local paths | `files`/`.npmignore` never audited against `npm pack --dry-run` |
| The library got a theme, a landing page, or a database schema | The binding surface was never derived — see `product-profile` |

## Don't

- Don't test against source when consumers only ever see the build.
- Don't bundle a peer dependency to "make it easier."
- Don't ship a breaking change at a patch or minor version.
- Don't let the README's example go unexecuted.
