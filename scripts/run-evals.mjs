#!/usr/bin/env node
// Evaluation harness. Measures whether a skill moves an agent to the correct branch of its
// own derivation — not whether the prose reads well.
//
//   validate            cases well-formed. offline, free.
//   plan --trials N     what a run would cost, before spending it.
//   run                 execute one condition against a runner.
//   score               apply the release gate.
//
// Design rules, enforced here rather than documented and hoped for:
//   · deterministic graders run first and carry the load
//   · a case whose expectation has no `because` is rejected
//   · a case the baseline already passes is reported as a DELETION CANDIDATE, not a pass
//   · the runner refuses a call it cannot afford
//   · results without a pinned model are refused

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, appendFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const root = new URL('../', import.meta.url)
const SKILLS = new URL('skills/', root)
const cmd = process.argv[2] || 'validate'
const arg = n => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? null : process.argv[i + 1] }
const has = n => process.argv.includes(`--${n}`)

// ── load ─────────────────────────────────────────────────────────────────────
const skillDirs = readdirSync(SKILLS).filter(d => {
  try { return existsSync(new URL(`${d}/SKILL.md`, SKILLS)) } catch { return false }
})

function loadCases (slug) {
  const f = new URL(`${slug}/eval/cases.jsonl`, SKILLS)
  if (!existsSync(f)) return null
  return readFileSync(f, 'utf8').split('\n').filter(l => l.trim() && !l.startsWith('//'))
    .map((l, i) => { try { return JSON.parse(l) } catch { return { __bad: i + 1, __raw: l } } })
}

// symptoms a skill promises to prevent double as the eval's oracle
function symptomsOf (slug) {
  const t = readFileSync(new URL(`${slug}/SKILL.md`, SKILLS), 'utf8')
  const sec = t.split(/^##+ .*got it wrong.*$/mi)[1]
  if (!sec) return []
  return [...sec.matchAll(/^\|\s*([^|]+?)\s*\|/gm)]
    .map(m => m[1].trim())
    .filter(s => s && !/^-+$/.test(s) && s.toLowerCase() !== 'symptom')
}

// ── validate ─────────────────────────────────────────────────────────────────
function validate () {
  let errors = 0, withCases = 0, totalCases = 0
  const missing = []

  for (const slug of skillDirs.sort()) {
    const cases = loadCases(slug)
    if (!cases) { missing.push(slug); continue }
    withCases++
    const seen = new Set()
    const symptoms = symptomsOf(slug)

    for (const c of cases) {
      totalCases++
      const at = `${slug}#${c.id || '?'}`
      if (c.__bad) { console.error(`  ✗ ${slug}: line ${c.__bad} is not valid JSON`); errors++; continue }
      if (!c.id) { console.error(`  ✗ ${at}: no id`); errors++ }
      if (seen.has(c.id)) { console.error(`  ✗ ${at}: duplicate id`); errors++ }
      seen.add(c.id)
      if (!c.situation) { console.error(`  ✗ ${at}: no situation`); errors++ }
      if (/\?$/.test(c.situation || '')) console.warn(`  ⚠ ${at}: situation reads as a prompt, not a situation`)
      if (!c.expect?.branch) { console.error(`  ✗ ${at}: expect.branch missing`); errors++ }
      // the rule that keeps cases honest
      if (!c.expect?.because) {
        console.error(`  ✗ ${at}: expect.because missing — a case you cannot justify tests your preference, not the derivation`)
        errors++
      }
      for (const s of c.forbid_symptoms || []) {
        if (symptoms.length && !symptoms.some(x => x.toLowerCase().includes(s.toLowerCase().slice(0, 18))))
          console.warn(`  ⚠ ${at}: forbidden symptom "${s}" is not in the skill's own symptom table`)
      }
    }
  }

  console.log(`\n${withCases}/${skillDirs.length} skills have eval cases · ${totalCases} cases total`)
  if (missing.length) {
    console.log(`\nno cases yet (${missing.length}):`)
    for (const m of missing) console.log(`  · ${m}`)
  }

  // "all cases valid" while most skills ship none is the exact false green this repo warns
  // about elsewhere: a check that reports success for work it never looked at. Say what was
  // actually checked, and let --release make the omission fail rather than merely print.
  const release = process.argv.includes('--release')
  if (release && missing.length) {
    console.error(`\n✗ ${missing.length} skill(s) ship no eval cases — a skill claims something`)
    console.error('  testable, so an untested claim blocks release. Add cases, or drop the skill.')
    errors += missing.length
  }
  if (errors) console.log(`\n${errors} error(s)`)
  else console.log(missing.length
    ? `\nthe ${totalCases} cases present are valid — ${missing.length} skill(s) still untested`
    : '\nall cases valid')
  return errors
}

// ── plan ─────────────────────────────────────────────────────────────────────
function plan () {
  const trials = Number(arg('trials') || 3)
  let n = 0
  for (const slug of skillDirs) n += (loadCases(slug) || []).length
  const calls = n * trials * 2 // baseline + candidate
  console.log(`
cases              ${n}
trials             ${trials}
conditions         2  (baseline, candidate)
model calls        ${calls}
judged calls       ≤ ${calls}  (only what the deterministic ladder cannot settle)

Deterministic graders run first and are free. Set --max-usd per condition before running;
the runner refuses a call it cannot afford.`)
  return 0
}

// ── run ──────────────────────────────────────────────────────────────────────
function run () {
  const skill = arg('skill'), condition = arg('condition')
  const model = arg('model'), runner = arg('runner') || 'claude'
  const trials = Number(arg('trials') || 3)
  const maxUsd = Number(arg('max-usd') || 0)
  const out = arg('out') || 'evals/results/responses.jsonl'

  const fail = m => { console.error(`run: ${m}`); process.exit(2) }
  if (!skill) fail('--skill required')
  if (!['baseline', 'candidate'].includes(condition)) fail('--condition must be baseline or candidate')
  if (!model) fail('--model required — an unpinned eval varies by machine and by week, and its numbers mean nothing')
  if (!maxUsd) fail('--max-usd required — cap the spend in the harness, not by watching it')

  const cases = loadCases(skill)
  if (!cases) fail(`no eval/cases.jsonl for ${skill}`)

  // Refuse to run from this repo's root: AGENTS.md here would inject the whole ruleset
  // into the baseline, and the baseline would silently become a candidate.
  if (existsSync(new URL('AGENTS.md', root)) && process.cwd() === new URL(root).pathname.replace(/\/$/, '')) {
    fail('refusing to run from the package root — AGENTS.md here would contaminate the baseline. cd to a scratch directory first')
  }

  mkdirSync(new URL(out.replace(/\/[^/]+$/, '/'), root), { recursive: true })
  console.log(`runner ${runner} · model ${model} · ${skill} · ${condition} · ${trials} trial(s) · cap $${maxUsd}`)
  console.log(`\nThis harness does not ship a provider adapter. Wire one runner:`)
  console.log(`
  · isolate from user config      (ignore user plugins, hooks, memory, output styles)
  · pin the model to ${model}
  · inject the skill body ONLY when condition = candidate
  · report per-call cost, and stop before exceeding $${maxUsd}
  · append one JSON line per (case, trial, condition) to ${out}
  · skip rows already present, so a failed run resumes\n`)
  return 0
}

// ── score ────────────────────────────────────────────────────────────────────
function score () {
  const f = new URL(arg('in') || 'evals/results/scores.jsonl', root)
  if (!existsSync(f)) { console.error(`score: no ${arg('in') || 'evals/results/scores.jsonl'}`); return 2 }
  const rows = readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))

  if (rows.some(r => !r.model)) { console.error('score: rows without a pinned model — refusing to gate'); return 2 }
  if (rows.some(r => r.condition === undefined)) { console.error('score: rows missing condition'); return 2 }

  const key = r => `${r.skill}#${r.case_id}`
  const byCase = new Map()
  for (const r of rows) {
    const k = key(r)
    if (!byCase.has(k)) byCase.set(k, { baseline: [], candidate: [] })
    byCase.get(k)[r.condition]?.push(r)
  }

  const ok = a => a.length && a.every(r => r.branch_correct && !r.symptoms_found?.length)
  const any = a => a.some(r => r.branch_correct)

  const works = [], deletion = [], wrongDerivation = [], notAddressed = []
  for (const [k, { baseline, candidate }] of byCase) {
    const b = any(baseline), c = ok(candidate)
    if (!b && c) works.push(k)
    else if (b && c) deletion.push(k)            // the result nobody looks for
    else if (!b && !c) notAddressed.push(k)
    else wrongDerivation.push(k)
  }

  console.log(`\nworks — skill moved the decision      ${works.length}`)
  console.log(`DELETION CANDIDATE — no difference    ${deletion.length}`)
  console.log(`derivation wrong — fix the skill      ${wrongDerivation.length}`)
  console.log(`case not addressed by the skill       ${notAddressed.length}`)
  for (const k of deletion) console.log(`  · ${k}  baseline already reached the right branch`)
  for (const k of wrongDerivation) console.log(`  ✗ ${k}  candidate worse than baseline`)

  const gated = wrongDerivation.length === 0
  console.log(gated ? '\ngate: PASS' : '\ngate: FAIL — a candidate is worse than its baseline')
  return gated ? 0 : 1
}

const exit = { validate, plan, run, score }[cmd]
if (!exit) { console.error(`unknown command: ${cmd}\n  validate | plan | run | score`); process.exit(2) }
process.exit(exit() ? 1 : 0)
