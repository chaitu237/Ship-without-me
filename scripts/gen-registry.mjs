#!/usr/bin/env node
// Generates skills/registry.json — the machine-readable routing table.
//
// Descriptions stay short because they are hot-path content, which leaves nothing for a
// router to match on beyond prose. The registry carries the structured part: which profile
// properties turn a skill on, what it provides, and what it needs.
//
// Generated, never hand-edited, so it cannot disagree with the skills it describes.
// `--check` fails when the committed file is stale, which is what makes that guarantee real.

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'

const root = new URL('../skills/', import.meta.url)
const out = new URL('registry.json', root)
const check = process.argv.includes('--check')

// applies_when is the whole point: a skill is selected because a property of the situation
// is true, never because the product resembles something. A skill with no gate is core —
// it runs for every product, and that is a deliberate claim, not a missing field.
const GATES = {
  // Genuinely universal: what is this, what proves it works, how a phase is run and reviewed.
  // Nothing else survives contact with a CLI, a library, a pipeline, or a report.
  'product-profile':           { core: true },
  'core-interaction-contract': { core: true },
  'phase-execution':           { core: true },

  // These four were core until an end-to-end CLI build refused them by name, correctly:
  // "binding surface is terminal, not pixels". Design tokens, layout archetypes, client
  // state ownership and rendered loading/empty/error states are what the floor MEANS for a
  // rendered surface — they are not universal truths, and running them for a CLI produces a
  // theme nobody sees. The terminal's equivalents live in cli-surface.
  'design-system-commit':     { applies_when: ['consumed_via=pixels'], provides: ['design tokens'] },
  'layout-patterns':          { applies_when: ['consumed_via=pixels'], provides: ['layout archetype'] },
  'frontend-architecture':    { applies_when: ['consumed_via=pixels'], provides: ['client state ownership'] },
  'states-and-feedback':      { applies_when: ['consumed_via=pixels'], provides: ['async states'] },

  'identity-access-decision': { applies_when: ['identity_model!=none'], provides: ['identity boundary'] },
  // Was identity_model>=workspace, which handed tenant-isolation machinery to a single
  // clinic with staff accounts. identity-access-decision defines workspace as "one customer,
  // one space" and routes only MULTI-TENANT here. Found by a real run: the agent skipped
  // tenancy correctly while this gate would have selected it.
  'tenant-auth-demo':         { applies_when: ['identity_model=multi-tenant'], requires: ['identity-access-decision'], provides: ['tenant isolation', 'demo access'] },
  'account-lifecycle':        { applies_when: ['identity_model>=one authenticated user'], requires: ['identity-access-decision'], provides: ['account journey'] },
  'database-schema':          { applies_when: ['persistence_model=server'], provides: ['durable schema'] },
  'backend-api-design':       { applies_when: ['persistence_model=server'], requires: ['database-schema'], provides: ['http surface'] },
  'runtime-engine-state':     { applies_when: ['state_owner=device runtime'], provides: ['runtime ownership'] },
  'continuous-media':         { applies_when: ['time_model=continuous', 'capability=audio playback', 'capability=video playback'], requires: ['runtime-engine-state', 'core-interaction-contract'], provides: ['playback', 'queue'] },
  'list-and-table':           { applies_when: ['capability=collection browsing'], provides: ['list surface'] },
  'forms-and-validation':     { applies_when: ['capability=data entry'], provides: ['input surface'] },
  'app-shell-composition':    { applies_when: ['destinations>1'], provides: ['persistent surface'] },
  'onboarding-first-run':     { applies_when: ['content_source=user-created&&consumed_via=pixels'], provides: ['first run'] },
  // Needs a rendered surface: "what does the user see before there is data" is not a
  // question a scheduled pipeline has. Its input files ARE its content.
  'initial-content-bootstrap':{ applies_when: ['content_source!=user-created&&consumed_via=pixels'], provides: ['day-one content'] },
  'landing-composition':      { applies_when: ['distribution=public&&consumed_via=pixels'], provides: ['acquisition surface'] },
  'ship-ready-audit':         { applies_when: ['distribution=public&&consumed_via=pixels'], provides: ['launch surface'] },
  'legal-and-consent':        { applies_when: ['distribution=public&&consumed_via=pixels', 'collects_personal_data=true'], provides: ['consent record'] },
  'deployment-hardening':     { applies_when: ['deployed=true'], provides: ['hardened deploy'] },
  'deploy-durability':        { applies_when: ['deployed=true'], provides: ['environment parity'] },
  'payments-billing':         { applies_when: ['capability=money movement'], provides: ['billing'] },
  'grounded-ai-feature':      { applies_when: ['capability=model output'], provides: ['grounded output'] },
  'feed-and-social':          { applies_when: ['capability=user to user reach'], provides: ['social graph'] },
  'vertical-business-os':     { applies_when: ['value_location=operational records'], provides: ['ops modules'] },
  'regional-commerce-stack':  { applies_when: ['market=regional'], provides: ['regional norms'] },
  'field-ops-mobile':         { applies_when: ['context=away from desk'], provides: ['field surface'] },
  'rescue-existing-project':  { applies_when: ['repo_state=inherited'], provides: ['ground truth'] },
  'cli-surface':               { applies_when: ['consumed_via=a terminal'], provides: ['cli conventions'] },
  'library-surface':           { applies_when: ['consumed_via=an import'], provides: ['library conventions'] },
  'ship-without-me':          { orchestrator: true },
  'ship-with-me':             { orchestrator: true },
}

const dirs = readdirSync(root).filter(d => {
  try { return statSync(new URL(d, root)).isDirectory() } catch { return false }
}).sort()

const registry = {
  $comment: 'Generated by scripts/gen-registry.mjs. Do not edit. A capability with no entry here routes to the gap protocol in product-profile — never to the nearest skill that happens to exist.',
  skills: {},
}

let missing = []
let drift = []
for (const slug of dirs) {
  const f = new URL(`${slug}/SKILL.md`, root)
  if (!existsSync(f)) continue
  const src = readFileSync(f, 'utf8')
  const desc = src.match(/description:\s*>\s*\n((?:[ \t]+.*\n)+)/)?.[1].replace(/\s+/g, ' ').trim() ?? ''
  const gate = GATES[slug]
  if (!gate) { missing.push(slug); continue }

  // The gate is authoritative here, but it is ALSO written into the skill's own frontmatter
  // so a reader of the skill can see why it would ever be selected. Two copies can disagree,
  // so check rather than trust: a skill whose declared routing contradicts its gate is a
  // silent mis-route waiting to happen.
  const declaredRouting = src.match(/^\s+routing:\s*(\S+)/m)?.[1]
  const actualRouting = gate.core ? 'core' : gate.orchestrator ? 'orchestrator' : 'conditional'
  if (declaredRouting && declaredRouting !== actualRouting)
    drift.push(`${slug}: frontmatter says routing "${declaredRouting}", gate says "${actualRouting}"`)

  const declaredWhen = src.match(/^\s+applies-when:\s*"([^"]*)"/m)?.[1]
  const actualWhen = (gate.applies_when || []).join(' | ')
  if ((declaredWhen || actualWhen) && declaredWhen !== (actualWhen || undefined))
    drift.push(`${slug}: frontmatter applies-when "${declaredWhen ?? '(none)'}" != gate "${actualWhen || '(none)'}"`)
  registry.skills[slug] = {
    description: desc,
    ...(gate.core ? { core: true } : {}),
    ...(gate.orchestrator ? { orchestrator: true } : {}),
    ...(gate.applies_when ? { applies_when: gate.applies_when } : {}),
    ...(gate.requires ? { requires: gate.requires } : {}),
    ...(gate.provides ? { provides: gate.provides } : {}),
    has_eval: existsSync(new URL(`${slug}/eval/cases.jsonl`, root)),
  }
}

// A skill with no gate cannot be routed to, so it is invisible to the orchestrator. That is
// a silent failure — the skill exists, passes every check, and never runs.
if (drift.length) {
  console.error('  ✗ skill frontmatter disagrees with its routing gate:')
  for (const d of drift) console.error(`    ${d}`)
  console.error('    A reader trusts the frontmatter; the router uses the gate. Make them agree.')
  process.exit(1)
}

if (missing.length) {
  console.error(`  ✗ no routing gate for: ${missing.join(', ')}`)
  console.error('    add one to GATES in scripts/gen-registry.mjs — an ungated skill is unroutable')
  process.exit(1)
}

const json = JSON.stringify(registry, null, 2) + '\n'
if (check) {
  const current = existsSync(out) ? readFileSync(out, 'utf8') : ''
  if (current !== json) {
    console.error('  ✗ skills/registry.json is stale — run node scripts/gen-registry.mjs')
    process.exit(1)
  }
  console.log(`  registry in sync (${Object.keys(registry.skills).length} skills)`)
} else {
  writeFileSync(out, json)
  const gated = Object.values(registry.skills).filter(s => s.applies_when).length
  const core = Object.values(registry.skills).filter(s => s.core).length
  console.log(`  registry.json — ${Object.keys(registry.skills).length} skills · ${core} core · ${gated} conditional`)
}
