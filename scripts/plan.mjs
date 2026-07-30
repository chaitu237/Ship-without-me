#!/usr/bin/env node
// Resolves a skill graph from a product profile, and self-tests that resolution against
// deliberately unrelated products.
//
//   node scripts/plan.mjs .ship/PROFILE.json     plan a real profile
//   node scripts/plan.mjs --test                 run the cross-shape regression
//
// The negative assertions are the valuable ones. That a music player selects continuous-media
// is unsurprising; that it selects NO auth, NO schema and NO landing page is the whole claim.

import { readFileSync, existsSync } from 'node:fs'

const registry = JSON.parse(readFileSync(new URL('../skills/registry.json', import.meta.url), 'utf8'))

const IDENTITY_RANK = ['none', 'local profile', 'one authenticated user', 'shared household', 'workspace', 'multi-tenant', 'public anonymous']

// A gate is a claim about the situation. Anything it cannot express is deliberately NOT
// forced through the closest expressible gate — it comes back as a gap instead.
function satisfies(gate, p) {
  const [lhs, rhs] = gate.split(/(?:>=|!=|=)/).map(s => s.trim())
  const op = gate.includes('>=') ? '>=' : gate.includes('!=') ? '!=' : '='
  const caps = (p.core_capabilities ?? []).map(c => c.toLowerCase())

  if (lhs === 'capability') return caps.some(c => c.includes(rhs.toLowerCase()))

  // state_owners is written by hand or by a model, so it arrives as prose: "browser media
  // engine", "the audio element", "device camera". Matching the class name literally would
  // silently fail to route those — a check that fails open, which is worse than one that
  // over-selects. Normalise the concrete nouns onto the class the gates are written in.
  if (lhs === 'state_owner') {
    const RUNTIME = /\b(runtime|device|browser|media engine|audio|video|camera|microphone|mic|geolocation|canvas|webgl|bluetooth|serial|usb|worker|webrtc|sensor)\b/i
    return (p.state_owners ?? []).some(o =>
      o.toLowerCase().includes(rhs.toLowerCase()) ||
      (rhs === 'device runtime' && RUNTIME.test(o)))
  }
  if (lhs === 'destinations>1') return false
  if (lhs === 'deployed') return String(p.deployed ?? false) === rhs
  if (lhs === 'collects_personal_data') return String(p.collects_personal_data ?? false) === rhs
  if (lhs === 'repo_state') return (p.repo_state ?? '') === rhs
  if (lhs === 'context') return (p.context ?? '') === rhs
  if (lhs === 'market') return (p.market ?? '') === rhs

  const val = p[lhs]
  if (val === undefined) return false
  if (lhs === 'identity_model' && op === '>=')
    return IDENTITY_RANK.indexOf(val) >= IDENTITY_RANK.indexOf(rhs) && val !== 'none'
  if (op === '!=') return String(val) !== rhs
  return String(val) === rhs
}

export function plan(profile) {
  const core = [], conditional = []
  for (const [slug, s] of Object.entries(registry.skills)) {
    if (s.orchestrator) continue
    if (s.core) { core.push(slug); continue }
    if ((s.applies_when ?? []).some(g => satisfies(g, profile))) conditional.push(slug)
  }
  // A capability nothing claims to provide is a gap. Reported, never routed to a near miss.
  const provided = new Set([...core, ...conditional].flatMap(s => registry.skills[s].provides ?? []))
  const gaps = (profile.core_capabilities ?? []).filter(cap =>
    ![...core, ...conditional].some(s =>
      (registry.skills[s].applies_when ?? []).some(g => g === `capability=${cap.toLowerCase()}`)) &&
    ![...provided].some(pv => cap.toLowerCase().includes(pv.split(' ')[0])))
  return { core, conditional, gaps }
}

const CASES = [
  {
    name: 'local music player',
    profile: {
      first_value_event: 'A user selects a track and hears it play',
      value_location: 'continuous interaction',
      state_owners: ['browser media engine', 'local persistent storage'],
      time_model: 'continuous', content_source: 'user-owned import',
      identity_model: 'none', persistence_model: 'local', distribution: 'private',
      core_capabilities: ['file import', 'audio playback', 'queue management'],
    },
    must: ['continuous-media', 'runtime-engine-state'],
    must_not: ['tenant-auth-demo', 'account-lifecycle', 'database-schema', 'backend-api-design',
               'landing-composition', 'ship-ready-audit', 'vertical-business-os', 'identity-access-decision'],
  },
  {
    name: 'restaurant menu catalogue',
    profile: {
      first_value_event: 'A diner opens a dish and sees its recipe',
      value_location: 'consumed content', state_owners: ['app server'],
      time_model: 'request/response', content_source: 'open dataset',
      identity_model: 'none', persistence_model: 'server', distribution: 'public',
      core_capabilities: ['collection browsing', 'content display'],
    },
    must: ['database-schema', 'landing-composition', 'list-and-table', 'initial-content-bootstrap'],
    must_not: ['payments-billing', 'tenant-auth-demo', 'continuous-media', 'vertical-business-os',
               'account-lifecycle', 'runtime-engine-state'],
  },
  {
    name: 'multi-tenant repair shop ops',
    profile: {
      first_value_event: 'An advisor moves a job to Ready and the board updates',
      value_location: 'operational records', state_owners: ['app server'],
      time_model: 'transactional', content_source: 'user-created',
      identity_model: 'multi-tenant', persistence_model: 'server', distribution: 'public',
      deployed: true, collects_personal_data: true,
      core_capabilities: ['data entry', 'collection browsing'],
    },
    must: ['database-schema', 'tenant-auth-demo', 'account-lifecycle', 'vertical-business-os',
           'legal-and-consent', 'deployment-hardening'],
    must_not: ['continuous-media', 'runtime-engine-state'],
  },
  {
    name: 'offline notes, single device',
    profile: {
      first_value_event: 'A note survives closing and reopening the app',
      value_location: 'one screen', state_owners: ['local persistent storage'],
      time_model: 'static', content_source: 'user-created',
      identity_model: 'none', persistence_model: 'local', distribution: 'private',
      core_capabilities: ['data entry'],
    },
    must: ['forms-and-validation', 'onboarding-first-run'],
    must_not: ['database-schema', 'backend-api-design', 'tenant-auth-demo', 'landing-composition',
               'account-lifecycle', 'identity-access-decision', 'vertical-business-os'],
  },
]

if (process.argv.includes('--test')) {
  let fail = 0
  for (const c of CASES) {
    const got = plan(c.profile)
    const all = [...got.core, ...got.conditional]
    const missing = c.must.filter(s => !all.includes(s))
    const wrong = c.must_not.filter(s => all.includes(s))
    if (missing.length || wrong.length) {
      fail++
      console.error(`  ✗ ${c.name}`)
      if (missing.length) console.error(`      not selected: ${missing.join(', ')}`)
      if (wrong.length) console.error(`      wrongly selected: ${wrong.join(', ')}`)
    } else {
      console.log(`  ✓ ${c.name.padEnd(32)} ${all.length} skills, ${c.must_not.length} correctly avoided`)
    }
  }
  if (fail) { console.error(`\n  ${fail} of ${CASES.length} shapes mis-routed`); process.exit(1) }
  console.log(`\n  all ${CASES.length} shapes routed correctly`)
} else {
  const file = process.argv[2]
  if (!file || !existsSync(file)) {
    console.error('usage: node scripts/plan.mjs <PROFILE.json> | --test')
    process.exit(2)
  }
  const got = plan(JSON.parse(readFileSync(file, 'utf8')))
  console.log(`\ncore         ${got.core.join(' · ')}`)
  console.log(`conditional  ${got.conditional.join(' · ') || '(none)'}`)
  if (got.gaps.length) console.log(`gaps         ${got.gaps.join(' · ')}  ← write .ship/gaps/<name>.md`)
}
