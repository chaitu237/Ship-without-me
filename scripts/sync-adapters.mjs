#!/usr/bin/env node
// Generates every instruction-tier host adapter from AGENTS.md, the single source of truth.
//
//   node scripts/sync-adapters.mjs          write the adapters
//   node scripts/sync-adapters.mjs --check  fail if any adapter is stale (used in CI)
//
// Instruction-tier hosts can only read their own rule file, so the text must be copied.
// Copying by hand drifts, and the drift is invisible until two hosts behave differently
// on the same repo. Generating removes that failure mode.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname } from 'node:path'

const root = new URL('../', import.meta.url)
const CHECK = process.argv.includes('--check')
const core = readFileSync(new URL('AGENTS.md', root), 'utf8').trim()

const BANNER = '<!-- Generated from AGENTS.md by scripts/sync-adapters.mjs. Do not edit. -->'

const TARGETS = [
  {
    path: '.cursor/rules/ship.mdc',
    render: () => `---
description: ship — derivation-first rules for shipping launchable apps
alwaysApply: true
---

${BANNER}

${core}
`,
  },
  {
    path: '.windsurf/rules/ship.md',
    render: () => `---
trigger: always_on
---

${BANNER}

${core}
`,
  },
  { path: '.clinerules/ship.md', render: () => `${BANNER}\n\n${core}\n` },
  { path: '.kiro/steering/ship.md', render: () => `---\ninclusion: always\n---\n\n${BANNER}\n\n${core}\n` },
  { path: '.github/copilot-instructions.md', render: () => `${BANNER}\n\n${core}\n` },
  { path: '.agents/rules/ship.md', render: () => `${BANNER}\n\n${core}\n` },
]

let stale = 0
for (const t of TARGETS) {
  const url = new URL(t.path, root)
  const next = t.render()
  const current = existsSync(url) ? readFileSync(url, 'utf8') : null

  if (current === next) continue

  if (CHECK) {
    console.error(`stale: ${t.path}`)
    stale++
    continue
  }
  mkdirSync(dirname(url.pathname), { recursive: true })
  writeFileSync(url, next)
  console.log(`wrote ${t.path}`)
}

if (CHECK) {
  if (stale) {
    console.error(`\n${stale} adapter(s) out of sync with AGENTS.md.`)
    console.error('Run: node scripts/sync-adapters.mjs')
    process.exit(1)
  }
  console.log(`all ${TARGETS.length} adapters in sync with AGENTS.md`)
} else {
  console.log(`\n${TARGETS.length} adapters generated from AGENTS.md`)
}
