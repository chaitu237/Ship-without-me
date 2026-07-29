#!/usr/bin/env node
// Detector self-test. Builds a fixture with known defects, asserts the expected rules fire,
// then fixes the fixture and asserts they go quiet.
//
// A rule that never goes quiet is as useless as one that never fires, so both directions
// are checked.
//
// ship-disable secret-in-repo: the sk- string below is a synthetic fixture, never a real
// credential. It exists so the secret-in-repo rule has something to fire on.

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CLI = new URL('../cli/detect.mjs', import.meta.url).pathname

const run = dir => {
  let out
  try {
    out = execFileSync('node', [CLI, '--dir', dir, '--rules', 'all', '--json'], { encoding: 'utf8' })
  } catch (e) {
    out = e.stdout || '{}' // exit 1 on findings is expected
  }
  try { return JSON.parse(out) } catch { return { findings: [] } }
}

const write = (dir, rel, body) => {
  const p = join(dir, rel)
  mkdirSync(join(p, '..'), { recursive: true })
  writeFileSync(p, body)
}

const dir = mkdtempSync(join(tmpdir(), 'ship-fixture-'))
let failed = 0
const assert = (cond, msg) => { if (!cond) { console.error(`  ✗ ${msg}`); failed++ } else console.log(`  ✓ ${msg}`) }

// ── broken fixture ────────────────────────────────────────────────────────────
write(dir, 'package.json', '{"name":"fixture"}')
write(dir, '.env.example', 'DATABASE_URL=changeme\nAPI_KEY=sk-abcdefghijklmnopqrstuvwx1234\n')
write(dir, 'db/schema.sql', 'CREATE TABLE invoices (\n  id UUID PRIMARY KEY,\n  amount DOUBLE,\n  note TEXT\n);\n')
write(dir, 'src/routes.ts', `import express from 'express'
const router = express.Router()
router.get('/invoices', async (req, res) => {
  const tenantId = req.query.tenantId
  res.json(await db.invoices.findMany({ where: { tenantId } }))
})
export default router
`)
write(dir, 'src/Form.tsx', `export function F() {
  return (<form>
    <input type="text" name="email" />
    <input type="password" name="password" />
    <input type="text" name="amount" />
    <input type="checkbox" name="terms" checked /> I agree to the Terms and Privacy Policy
    <button type="submit">Save</button>
  </form>)
}
`)
write(dir, 'src/List.tsx', 'export function L({rows}) { return <div>{rows.map(r => <div key={r.id}>{r.t}</div>)}</div> }\n')
// an auth surface must exist, or the account-lifecycle rules correctly do not apply
write(dir, 'src/Login.tsx', 'export function Login() { return <a href="/login">Sign in</a> }\n')
write(dir, 'src/theme.css', ':root { --accent: #2563eb; }\n.a{padding:13px;margin:7px;gap:9px}\n.b{padding:15px;margin:21px;gap:11px}\n.c{padding:17px}\n')

console.log('broken fixture — these rules must fire:')
const broke = new Set(run(dir).findings.map(f => f.rule))
for (const r of [
  'env-example-real-value', 'float-money', 'no-tenant-id', 'inputs-without-labels',
  'password-no-autocomplete', 'wrong-input-type', 'consent-prechecked',
  'tenant-from-request', 'unpaginated-list', 'unversioned-api',
  'no-empty-state', 'spacing-off-scale', 'no-validation-schema', 'submit-not-disabled',
  'no-password-reset', 'no-account-deletion',
]) assert(broke.has(r), r)

// ── fixed fixture ─────────────────────────────────────────────────────────────
write(dir, '.env.example', 'DATABASE_URL=changeme\nAPI_KEY=your-key-here\n')
write(dir, 'db/schema.sql', 'CREATE TABLE invoices (\n  id UUID PRIMARY KEY,\n  tenant_id UUID NOT NULL,\n  amount_minor BIGINT,\n  note TEXT\n);\n')
write(dir, 'src/routes.ts', `import express from 'express'
const router = express.Router()
router.get('/api/v1/invoices', async (req, res) => {
  const tenantId = req.session.tenantId
  const limit = Math.min(Number(req.query.limit) || 25, 100)
  res.json(await db.invoices.findMany({ where: { tenantId }, take: limit }))
})
export default router
`)
write(dir, 'src/Form.tsx', `import { z } from 'zod'
export const schema = z.object({ email: z.string().email() })
export function F({ isSubmitting }) {
  return (<form className="max-w-md mx-auto">
    <label htmlFor="e">Email</label>
    <input id="e" type="email" name="email" autoComplete="email" />
    <label htmlFor="p">Password</label>
    <input id="p" type="password" name="password" autoComplete="new-password" />
    <label htmlFor="a">Amount</label>
    <input id="a" type="text" name="amount" />
    <label><input type="checkbox" name="terms" /> I agree to the Terms and Privacy Policy</label>
    <button type="submit" disabled={isSubmitting}>Save</button>
  </form>)
}
`)
write(dir, 'src/List.tsx', `export function L({rows}) {
  if (rows.length === 0) return <div><p>No invoices yet.</p><button>New invoice</button></div>
  return <div>{rows.map(r => <div key={r.id}>{r.t}</div>)}</div>
}
`)
write(dir, 'src/theme.css', ':root { --accent: #2563eb; }\n.a{padding:12px;margin:8px;gap:8px}\n.b{padding:16px;margin:24px;gap:12px}\n')
write(dir, 'src/auth.ts', `export const routes = ['/forgot-password','/reset-password','/change-password',
  '/verify-email','/delete-account','/export-data']
`)

console.log('\nfixed fixture — these rules must go quiet:')
const fixedRun = run(dir)
const fixed = new Set(fixedRun.findings.map(f => f.rule))
const detail = new Map(fixedRun.findings.map(f => [f.rule, `${f.msg} [${f.where || '-'}]`]))
for (const r of [
  'env-example-real-value', 'float-money', 'no-tenant-id', 'inputs-without-labels',
  'password-no-autocomplete', 'wrong-input-type', 'consent-prechecked',
  'tenant-from-request', 'unpaginated-list', 'unversioned-api',
  'no-empty-state', 'spacing-off-scale', 'no-validation-schema', 'submit-not-disabled',
  'no-password-reset', 'no-account-deletion', 'unconstrained-form',
]) assert(!fixed.has(r), fixed.has(r) ? `${r} — STILL FIRING: ${detail.get(r)}` : r)

if (failed) console.error(`\nfixture kept for inspection: ${dir}`)
else rmSync(dir, { recursive: true, force: true })
console.log(failed ? `\n${failed} assertion(s) failed` : '\ndetector self-test passed')
process.exit(failed ? 1 : 0)
