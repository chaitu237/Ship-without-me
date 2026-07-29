#!/usr/bin/env node
// Generates docs/rules.md from cli/detect.mjs so the reference cannot drift from the code.
import { readFileSync, writeFileSync } from 'node:fs'

const s = readFileSync(new URL('../cli/detect.mjs', import.meta.url), 'utf8')

const groups = {}
const gm = s.match(/const RULE_GROUPS = \{([\s\S]*?)\n\}/)
for (const m of gm[1].matchAll(/(\w+):\s*\[([^\]]*)\]/g))
  groups[m[1]] = m[2].split(',').map(x => x.trim().replace(/^'|'$/g, '')).filter(Boolean)

const rules = new Map()
for (const m of s.matchAll(/add\('([a-z0-9-]+)',\s*(?:[a-z\w.>?:' ]*\?\s*)?'(fail|warn)'[^,]*,\s*[`'"]([^`'"]{0,120})/g))
  if (!rules.has(m[1])) rules.set(m[1], { level: m[2], msg: m[3] })
// catch ternary-level rules the regex above may miss
for (const m of s.matchAll(/add\('([a-z0-9-]+)',\s*[^,]+,\s*[`'"]([^`'"]{0,120})/g))
  if (!rules.has(m[1])) rules.set(m[1], { level: 'warn', msg: m[2] })

const groupNames = Object.keys(groups).filter(g => g !== 'all')
const of = r => groupNames.filter(g => groups[g].includes(r))

// assembled at runtime so this file never contains a parseable directive
const D = ['ship', 'disable'].join('-')

const out = []
out.push(`# Detector rules

Generated from \`cli/detect.mjs\` by \`scripts/gen-rules-doc.mjs\`. Do not edit by hand.

**${rules.size} rules across ${groupNames.length} groups.**

\`\`\`bash
npx ship-without-me detect                          # auto-detect what to check
npx ship-without-me detect --rules <group>[,<group>]
npx ship-without-me detect --json                   # machine-readable, for CI
npx ship-without-me detect --strict                 # warnings fail the build too
\`\`\`

Groups: ${groupNames.map(g => '`' + g + '`').join(' · ')}

## Waivers

Any rule can be waived inline, with a reason:

\`\`\`html
<!-- ${D} no-h1: intentional SPA shell, landing route is prerendered -->
\`\`\`
\`\`\`js
// ${D} float-money: legacy column, migration scheduled for Q3
\`\`\`

The reason is required — a bare rule id is not honoured. Exit codes: \`0\` clean ·
\`1\` failures · \`2\` nothing to check.

## Reference

| Rule | Level | Groups | What it catches |
|---|---|---|---|`)

for (const [r, { level, msg }] of [...rules].sort((a, b) => a[0].localeCompare(b[0])))
  out.push(`| \`${r}\` | ${level === 'fail' ? '**fail**' : 'warn'} | ${of(r).join(', ') || '—'} | ${msg.replace(/\|/g, '\\|')} |`)

out.push(`
## What the detector deliberately does not check

Anything needing a human eye: whether cards in a grid are the same height, whether the
hero image shows the real running product, whether a section is filled with something
true, whether a task can be completed one-handed outdoors.

Skills state those as judgement checklists instead of pretending a rule covers them. **A
phantom check is worse than an honest checklist**, because it reports success for something
that never ran.`)

writeFileSync(new URL('../docs/rules.md', import.meta.url), out.join('\n') + '\n')
console.log(`docs/rules.md — ${rules.size} rules, ${groupNames.length} groups`)
