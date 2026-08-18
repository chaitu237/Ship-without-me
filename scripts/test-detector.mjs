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
import { execFile, execFileSync } from 'node:child_process'
import { promisify } from 'node:util'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CLI = new URL('../cli/detect.mjs', import.meta.url).pathname

const execFileP = promisify(execFile)

const parseOut = raw => {
  try { return JSON.parse(raw) } catch { return { findings: [] } }
}

const run = (dir, extra = [], timeout = 20_000) => {
  let out
  try {
    out = execFileSync('node', [CLI, '--dir', dir, '--rules', 'all', '--json', ...extra], {
      encoding: 'utf8', timeout,
    })
  } catch (e) {
    if (e.killed) throw e
    out = e.stdout || '{}'
  }
  return parseOut(out)
}

const runAsync = async (dir, extra = [], timeout = 20_000) => {
  try {
    const { stdout } = await execFileP('node', [CLI, '--dir', dir, '--rules', 'all', '--json', ...extra], {
      encoding: 'utf8', timeout,
    })
    return parseOut(stdout)
  } catch (e) {
    if (e.killed) throw e
    return parseOut(e.stdout || '{}')
  }
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

const tmp = () => mkdtempSync(join(tmpdir(), 'ship-fx-'))
const SK = 'const k = "sk-abcdefghijklmnopqrstuvwxyz123456"\n'
const RSA = '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0123456789\n-----END RSA PRIVATE KEY-----\n'
const OPENSSH = '-----BEGIN OPENSSH PRIVATE KEY-----\nabcdefghijklmnopqrstuvwxyz0123456789+/\n-----END OPENSSH PRIVATE KEY-----\n'

const scan = files => {
  const d = tmp()
  write(d, 'package.json', '{"name":"fx"}')
  for (const [rel, body] of Object.entries(files)) write(d, rel, body)
  const result = run(d)
  rmSync(d, { recursive: true, force: true })
  return result
}
const rulesOf = r => (r.findings || []).map(f => f.rule)
const waivedRules = r => (r.waived || []).map(w => w.rule)

console.log('\nwaiver must not fire from a URL or from HTML prose:')
{
  const r = scan({
    'src/secrets.js': SK,
    'src/docs.js': 'const docs = "https://example.com/q=ship-disable secret-in-repo: mentioned in a URL"\n',
  })
  assert(rulesOf(r).includes('secret-in-repo'), 'https:// line does not waive secret-in-repo')
  assert(!waivedRules(r).includes('secret-in-repo'), 'https:// line is not recorded as a waiver')
}
{
  const r = scan({
    'src/secrets.js': SK,
    'index.html': '<!doctype html><p>Do not * ship-disable secret-in-repo: this is prose</p>\n',
  })
  assert(rulesOf(r).includes('secret-in-repo'), 'HTML asterisk prose does not waive secret-in-repo')
}

console.log('\nwaiver is file-local, and a real comment in the same file still works:')
{
  const r = scan({
    'src/fixture.js': '// ship-disable secret-in-repo: synthetic key in this file only\n' + SK,
    'src/prod.js': SK,
  })
  const secrets = (r.findings || []).filter(f => f.rule === 'secret-in-repo')
  assert(secrets.some(f => f.where === 'src/prod.js'), 'secret in prod.js still fires')
  assert(!secrets.some(f => f.where === 'src/fixture.js'), 'same-file comment waives only that file')
}
{
  const r = scan({
    'src/key.js': '/**\n * ship-disable secret-in-repo: synthetic JSDoc waiver\n */\n' + SK,
  })
  assert(!rulesOf(r).includes('secret-in-repo'), 'JSDoc continuation still waives in JS')
  assert(waivedRules(r).includes('secret-in-repo'), 'JSDoc waiver is recorded')
}
{
  const r = scan({
    'app.py': '# ship-disable secret-in-repo: synthetic python waiver\nk = "sk-abcdefghijklmnopqrstuvwxyz123456"\n',
  })
  assert(!rulesOf(r).includes('secret-in-repo'), '# comment still waives in Python')
  assert(waivedRules(r).includes('secret-in-repo'), 'Python hash waiver is recorded')
}

console.log('\nsame-file non-comments must not waive secret-in-repo:')
{
  const r = scan({
    'src/key.js': 'const cdn = "//cdn.example.com/q=ship-disable secret-in-repo: in a URL"\n' + SK,
  })
  assert(rulesOf(r).includes('secret-in-repo'), 'protocol-relative // in a JS string is not a waiver')
  assert(!waivedRules(r).includes('secret-in-repo'), 'protocol-relative // is not recorded as a waiver')
}
{
  const r = scan({
    'src/key.js': 'const note = "# ship-disable secret-in-repo: not a js comment"\n' + SK,
  })
  assert(rulesOf(r).includes('secret-in-repo'), '# in a JS string is not a waiver')
  assert(!waivedRules(r).includes('secret-in-repo'), '# in a JS string is not recorded as a waiver')
}

console.log('\nsecret-in-repo must fire on OpenSSH keys, .pem, PKCS#8 encrypted, and .env.local:')
{
  const r = scan({ 'id_ed25519': OPENSSH })
  assert(rulesOf(r).includes('secret-in-repo'), 'OPENSSH private key in extensionless file')
}
{
  const r = scan({ 'server.pem': RSA })
  assert(rulesOf(r).includes('secret-in-repo'), 'RSA private key in .pem')
}
{
  const r = scan({
    'enc.pem': '-----BEGIN ENCRYPTED PRIVATE KEY-----\nMIIEowIBAAKCAQEA0123456789\n-----END ENCRYPTED PRIVATE KEY-----\n',
  })
  assert(rulesOf(r).includes('secret-in-repo'), 'PKCS#8 ENCRYPTED PRIVATE KEY in .pem')
}
{
  const r = scan({ '.env.local': 'API_KEY=sk-abcdefghijklmnopqrstuvwxyz123456\n' })
  assert(rulesOf(r).includes('secret-in-repo'), 'sk- key in .env.local')
}

console.log('\nwalk() does not scan .agents/work:')
{
  const r = scan({
    '.agents/work/scratch.js': SK,
  })
  assert(!rulesOf(r).includes('secret-in-repo'), 'secret in .agents/work is not a repo finding')
}

console.log('\napi rules must fire on header tenant ids and cors({ origin: \"*\" }):')
{
  const r = scan({
    'src/server.js': `import express from 'express'
const app = express()
app.get('/api/v1/invoices', (req, res) => {
  const tenantId = req.headers['x-tenant-id']
  res.json([])
})
`,
  })
  assert(rulesOf(r).includes('tenant-from-request'), 'tenant id from x-tenant-id header')
}
{
  const r = scan({
    'src/server.js': `const app = { get() {} }
app.get('/api/v1/invoices', async (request, reply) => {
  const tenantId = request.headers['x-tenant-id']
  reply.send([])
})
`,
  })
  assert(rulesOf(r).includes('tenant-from-request'), 'tenant id from request.headers[x-tenant-id]')
}
{
  const r = scan({
    'src/server.js': `import express from 'express'
const app = express()
app.get('/api/v1/invoices', (req, res) => {
  const tenantId = req.headers.tenantId
  res.json([])
})
`,
  })
  assert(rulesOf(r).includes('tenant-from-request'), 'tenant id from req.headers.tenantId')
}
{
  const r = scan({
    'src/server.js': `import express from 'express'
import cors from 'cors'
const app = express()
app.use(cors({ origin: '*', credentials: true }))
app.get('/api/v1/users', (req, res) => res.json([]))
`,
  })
  assert(rulesOf(r).includes('cors-wildcard-credentials'), 'cors({ origin: "*", credentials: true })')
}
{
  const r = scan({
    'src/server.js': `import express from 'express'
import cors from 'cors'
const app = express()
app.use(cors({ origin: 'https://app.example.com', credentials: true }))
app.get('/api/v1/users', (req, res) => {
  const limit = 25
  res.json([])
})
`,
  })
  assert(!rulesOf(r).includes('cors-wildcard-credentials'), 'explicit origin allowlist is quiet')
}

console.log('\nabsence rules are waivable from the file that established the surface:')
{
  const r = scan({
    'src/Form.tsx': `// ship-disable no-validation-schema: validated on the server
// ship-disable submit-not-disabled: native form post
// ship-disable no-error-boundary: host shell provides it
export function F() {
  return (<form>
    <input type="text" name="email" />
    <input type="password" name="password" />
    <input type="text" name="amount" />
    <button type="submit">Save</button>
  </form>)
}
`,
    'src/Login.tsx': `// ship-disable no-password-reset: SSO only
// ship-disable no-account-deletion: SSO only
export function Login() { return <a href="/login">Sign in</a> }
`,
  })
  for (const rule of [
    'no-validation-schema', 'submit-not-disabled', 'no-error-boundary',
    'no-password-reset', 'no-account-deletion',
  ]) {
    assert(!rulesOf(r).includes(rule), `${rule} waived from the surface file`)
    assert(waivedRules(r).includes(rule), `${rule} recorded as waived`)
  }
}

const listen = (handler) => new Promise(resolve => {
  const server = createServer(handler)
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address()
    resolve({ server, origin: `http://127.0.0.1:${port}` })
  })
})

const landing = (origin, extra = '') => `<!doctype html><html lang="en"><head>
<title>A Real Product Title For Detect</title>
<meta name="description" content="A sufficiently long meta description that should pass the length check for this tool.">
<link rel="canonical" href="${origin}/">
<link rel="icon" href="/favicon.ico">
<meta property="og:image" content="${origin}/og.png">
<meta property="og:title" content="A Real Product Title For Detect">
<meta name="twitter:card" content="summary">
</head><body>
<h1>Hello from the landing page with enough static body text to avoid the shell-html rule firing on this response.</h1>
<p>More words to pad the body text past two hundred characters. Padding padding padding padding padding padding padding padding padding.</p>
${extra}
</body></html>`

console.log('\nfetched HTML cannot waive a local repo rule; same-page URL waivers stay on that URL:')
{
  const d = tmp()
  write(d, 'package.json', '{"name":"fx"}')
  write(d, 'src/secrets.js', SK)
  const stealHits = []
  const steal = await listen((req, res) => {
    stealHits.push(req.url)
    res.writeHead(200, { 'content-type': 'application/javascript' })
    res.end('// steal')
  })
  const { server, origin } = await listen((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end(landing(origin,
      `<!-- ship-disable secret-in-repo: remote html must not do this -->\n<script src="${steal.origin}/steal.js"></script>`))
  })
  try {
    const r = await runAsync(d, ['--url', origin + '/'])
    assert(rulesOf(r).includes('secret-in-repo'), 'remote HTML waiver does not silence local secret-in-repo')
    assert(stealHits.length === 0, 'does not fetch a cross-origin script src from the page')
  } finally {
    server.close()
    steal.server.close()
    rmSync(d, { recursive: true, force: true })
  }
}
{
  const d = tmp()
  write(d, 'package.json', '{"name":"fx"}')
  const { server, origin } = await listen((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end(landing(origin, '<!-- ship-disable no-h1: intentional SPA shell -->')
      .replace(/<h1>[\s\S]*?<\/h1>/, ''))
  })
  try {
    const r = await runAsync(d, ['--url', origin + '/'])
    assert(waivedRules(r).includes('no-h1'), 'HTML comment on the fetched page still waives no-h1')
    assert(!rulesOf(r).includes('no-h1'), 'no-h1 is quiet when the served page waives it')
  } finally {
    server.close()
    rmSync(d, { recursive: true, force: true })
  }
}

console.log('\nnon-HTML-comment prose in fetched HTML cannot waive fail-level URL rules:')
{
  const d = tmp()
  write(d, 'package.json', '{"name":"fx"}')
  const { server, origin } = await listen((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end(landing(origin, [
      '# ship-disable hsts: hash is not an HTML comment',
      '\n * ship-disable no-compression: JSDoc star is not an HTML comment',
      '/* ship-disable no-nosniff: block comment is not an HTML comment */',
      '<script src="//cdn.example.com/x.js?q=ship-disable hsts: protocol-relative"></script>',
    ].join('\n')))
  })
  try {
    const r = await runAsync(d, ['--url', origin + '/'])
    assert(rulesOf(r).includes('hsts'), '# in fetched HTML does not waive hsts')
    assert(rulesOf(r).includes('no-compression'), 'start-of-line * in fetched HTML does not waive no-compression')
    assert(rulesOf(r).includes('no-nosniff'), '/* in fetched HTML does not waive no-nosniff')
    assert(!waivedRules(r).includes('hsts'), 'fetched HTML hash/protocol-relative is not recorded as an hsts waiver')
    assert(!waivedRules(r).includes('no-compression'), 'fetched HTML JSDoc star is not recorded as a waiver')
    assert(!waivedRules(r).includes('no-nosniff'), 'fetched HTML block comment is not recorded as a waiver')
  } finally {
    server.close()
    rmSync(d, { recursive: true, force: true })
  }
}
{
  const d = tmp()
  write(d, 'package.json', '{"name":"fx"}')
  const { server, origin } = await listen((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end(landing(origin, '<!-- ship-disable hsts: local preview over http -->'))
  })
  try {
    const r = await runAsync(d, ['--url', origin + '/'])
    assert(waivedRules(r).includes('hsts'), 'HTML comment on the fetched page still waives hsts')
    assert(!rulesOf(r).includes('hsts'), 'hsts is quiet when the served page waives it')
  } finally {
    server.close()
    rmSync(d, { recursive: true, force: true })
  }
}
{
  const d = tmp()
  write(d, 'package.json', '{"name":"fx"}')
  const { server, origin } = await listen((req, res) => {
    if (req.url === '/privacy' || req.url === '/terms' || req.url === '/robots.txt') {
      res.writeHead(404)
      res.end()
      return
    }
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end(landing(origin, [
      '<!-- ship-disable missing-legal: legal lives on the marketing site -->',
      '<!-- ship-disable missing-legal-terms: legal lives on the marketing site -->',
      '<!-- ship-disable soft-404: this is an SPA -->',
    ].join('\n')))
  })
  try {
    const r = await runAsync(d, ['--url', origin + '/'])
    assert(waivedRules(r).includes('missing-legal'), 'HTML comment waives missing-legal when the URL has a trailing slash')
    assert(!rulesOf(r).includes('missing-legal'), 'missing-legal is quiet when the served page waives it')
    assert(!rulesOf(r).includes('missing-legal-terms'), 'missing-legal-terms is quiet when the served page waives it')
    assert(!rulesOf(r).includes('soft-404'), 'soft-404 is quiet when the served page waives it')
  } finally {
    server.close()
    rmSync(d, { recursive: true, force: true })
  }
}

console.log('\nsame-origin asset redirect to another origin is not followed:')
{
  const d = tmp()
  write(d, 'package.json', '{"name":"fx"}')
  const stealHits = []
  const steal = await listen((req, res) => {
    stealHits.push(req.url)
    res.writeHead(200, { 'content-type': 'application/javascript' })
    res.end('// steal')
  })
  const { server, origin } = await listen((req, res) => {
    if (req.url === '/app-abcdef12.js') {
      res.writeHead(302, { location: `${steal.origin}/stolen.js` })
      res.end()
      return
    }
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end(landing(origin, '<script src="/app-abcdef12.js"></script>'))
  })
  try {
    await runAsync(d, ['--url', origin + '/'])
    assert(stealHits.length === 0, 'does not follow a same-origin 302 to a cross-origin script')
  } finally {
    server.close()
    steal.server.close()
    rmSync(d, { recursive: true, force: true })
  }
}

console.log('\n--url fetch times out and rejects oversized bodies:')
{
  const d = tmp()
  write(d, 'package.json', '{"name":"fx"}')
  const { server, origin } = await listen(() => { /* hang */ })
  try {
    const r = await runAsync(d, ['--url', origin + '/'], 20_000)
    const unreach = (r.findings || []).find(f => f.rule === 'unreachable')
    assert(!!unreach, 'hanging --url is unreachable, not a hang of the CLI')
  } finally {
    server.close()
    rmSync(d, { recursive: true, force: true })
  }
}
{
  const d = tmp()
  write(d, 'package.json', '{"name":"fx"}')
  const { server, origin } = await listen((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html', 'content-length': '3000000' })
    res.end(landing(origin))
  })
  try {
    const r = await runAsync(d, ['--url', origin + '/'])
    const unreach = (r.findings || []).find(f => f.rule === 'unreachable')
    assert(!!unreach, 'lying Content-Length above the cap is unreachable')
    assert(/too large/i.test(unreach?.msg || ''), 'lying Content-Length names the size cap')
  } finally {
    server.close()
    rmSync(d, { recursive: true, force: true })
  }
}
{
  const d = tmp()
  write(d, 'package.json', '{"name":"fx"}')
  const { server, origin } = await listen((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end('x'.repeat(2_000_001))
  })
  try {
    const r = await runAsync(d, ['--url', origin + '/'])
    const unreach = (r.findings || []).find(f => f.rule === 'unreachable')
    assert(!!unreach, 'streamed body above the cap is unreachable')
    assert(/too large/i.test(unreach?.msg || ''), 'streamed oversized body names the size cap')
  } finally {
    server.close()
    rmSync(d, { recursive: true, force: true })
  }
}

console.log(failed ? `\n${failed} assertion(s) failed` : '\ndetector self-test passed')
process.exit(failed ? 1 : 0)
