#!/usr/bin/env node
// Validates every skill against the rules in skills/AUTHORING.md.
// Run in CI so a catalogue cannot land silently.

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'

const root = new URL('../skills/', import.meta.url)
const DESC_MAX = 280 // hot-path budget; AUTHORING.md targets 200-250

const dirs = readdirSync(root).filter(d => {
  try { return statSync(new URL(d, root)).isDirectory() } catch { return false }
})

let errors = 0, warnings = 0
const err = (s, m) => { console.error(`  ✗ ${s.padEnd(24)} ${m}`); errors++ }
const warn = (s, m) => { console.warn(`  ⚠ ${s.padEnd(24)} ${m}`); warnings++ }

console.log(`checking ${dirs.length} skills\n`)

const descriptions = new Map()

for (const slug of dirs.sort()) {
  const file = new URL(`${slug}/SKILL.md`, root)
  if (!existsSync(file)) { err(slug, 'no SKILL.md'); continue }
  const src = readFileSync(file, 'utf8')

  // ── frontmatter ──
  const fm = src.match(/^---\n([\s\S]*?)\n---\n/)
  if (!fm) { err(slug, 'missing YAML frontmatter'); continue }

  const name = fm[1].match(/^name:\s*(\S+)/m)?.[1]
  if (!name) err(slug, 'frontmatter has no name')
  else if (name !== slug) err(slug, `name "${name}" does not match folder`)
  else if (!/^[a-z][a-z0-9-]*$/.test(name)) err(slug, 'name must be kebab-case')

  const dm = fm[1].match(/description:\s*>\s*\n((?:[ \t]+.*\n)+)/)
  if (!dm) err(slug, 'frontmatter has no block description')
  else {
    const desc = dm[1].replace(/\s+/g, ' ').trim()
    if (desc.length > DESC_MAX) err(slug, `description ${desc.length} chars — hot path, max ${DESC_MAX}`)
    if (!/^Use (when|before|whenever|on|after)\b/i.test(desc))
      warn(slug, 'description must open with Use when/before/whenever — triggering conditions only')
    if (/^(?!Use when)[A-Z][a-z]+(,| and )/.test(desc))
      err(slug, 'description summarises content instead of triggers — agents follow the summary and skip the body')
    descriptions.set(slug, desc)
  }

  // ── authoring structure ──
  const body = src.slice(fm[0].length)
  if (!/question this skill answers/i.test(body))
    err(slug, 'no "The question this skill answers" line')

  const branches = (body.match(/├─/g) || []).length + (body.match(/─►/g) || []).length
  if (branches < 3) err(slug, `only ${branches} derivation branches — this reads as a catalogue`)

  if (!/how you.ll know you got it wrong/i.test(body))
    err(slug, 'no symptom→cause table')

  if (!/^##+ .*Verif/mi.test(body)) err(slug, 'no Verify section')
  if (!/^##+ (Don.t|Prohibited|Never)/mi.test(body))
    warn(slug, 'no Don\'t / Prohibited section')

  // ── a skill claims something testable, so it must ship cases ──
  if (!existsSync(new URL(`${slug}/eval/cases.jsonl`, root)))
    warn(slug, 'no eval/cases.jsonl — the skill\'s claim is untested')

  // ── things that must never appear ──
  if (/!\[[^\]]*\]\(/.test(body)) err(slug, 'contains an image — skills are text only')
  // Orchestrators implement a full protocol and legitimately run longer than a domain skill.
  const cap = /^ship-with(out)?-me$/.test(slug) ? 750 : 230
  const lines = body.split('\n').length
  if (lines > cap) warn(slug, `${lines} lines (cap ${cap}) — likely two skills, or a catalogue crept in`)
}

// ── vocabulary: banned terms resolved in CONTEXT.md ──
const BANNED = [
  [/\bwaves?\b/i, 'wave', 'phase'],
  [/\bMVP\b/, 'MVP', 'vertical slice'],
  [/\bimplementer\b/i, 'implementer', 'builder'],
  [/\bmeta-skill\b|\bmaster skill\b/i, 'meta/master skill', 'orchestrator'],
]
for (const slug of dirs) {
  const f = new URL(`${slug}/SKILL.md`, root)
  if (!existsSync(f)) continue
  const t = readFileSync(f, 'utf8')
  for (const [re, bad, good] of BANNED)
    if (re.test(t)) warn(slug, `uses "${bad}" — CONTEXT.md resolves this to "${good}"`)
}

// ── descriptions must discriminate from each other ──
const words = d => new Set(d.toLowerCase().match(/[a-z]{5,}/g) || [])
const slugs = [...descriptions.keys()]
for (let i = 0; i < slugs.length; i++) {
  for (let j = i + 1; j < slugs.length; j++) {
    const a = words(descriptions.get(slugs[i])), b = words(descriptions.get(slugs[j]))
    const shared = [...a].filter(w => b.has(w)).length
    const overlap = shared / Math.min(a.size, b.size)
    if (overlap > 0.55)
      warn(`${slugs[i]}/${slugs[j]}`, `descriptions ${Math.round(overlap * 100)}% overlapping — router will hesitate`)
  }
}

const total = descriptions.size ? [...descriptions.values()].reduce((n, d) => n + d.length, 0) : 0
console.log(`\nhot-path descriptions: ${total.toLocaleString()} chars (~${Math.round(total / 4).toLocaleString()} tokens)`)
console.log(errors ? `\n${errors} error(s), ${warnings} warning(s)` : `\n${dirs.length} skills valid · ${warnings} warning(s)`)
process.exit(errors ? 1 : 0)
