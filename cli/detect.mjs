#!/usr/bin/env node
// ship detect — deterministic launch-readiness rules. No LLM, no API key, no dependencies.
// Works out of the box: `npx @chaitu237/ship-without-me detect` figures out what to check on its own.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, extname, relative } from 'node:path'

const argv = process.argv.slice(2)
const flag = (n, d = null) => {
  const i = argv.indexOf(`--${n}`)
  if (i === -1) return d
  const v = argv[i + 1]
  return !v || v.startsWith('--') ? true : v
}
const JSON_OUT = !!flag('json')
const STRICT = !!flag('strict')
const ONLY = flag('rules')
const ROOT = String(flag('dir', process.cwd()))

const findings = []
const add = (rule, level, msg, where = '') =>
  findings.push({ rule, level, msg, where })

// ── waivers ────────────────────────────────────────────────────────────────
// Syntax, written broken so this file does not waive its own checks:
//   <!-- ship + "-disable" + " <rule-id>: reason" -->     in HTML
//   //   ship + "-disable" + " <rule-id>: reason"         in code
// A waiver is an ANNOTATION, so it must sit in a comment. Requiring the comment marker is
// what stops a rule id merely *mentioned* in a string, a doc template, or help text from
// silently disabling the rule it describes — which is a check that fails open, the worst
// kind. The id is additionally validated against the real rule set before it is honoured.
const WAIVER = /(?:\/\/|\/\*|\*|#|<!--)[^\n]*?ship-disable\s+([a-z][a-z0-9-]*)\s*:\s*([^\n>*]+)/gi
const waivedRaw = new Map()
const collectWaivers = (text, where) => {
  for (const m of text.matchAll(WAIVER)) {
    if (!waivedRaw.has(m[1])) waivedRaw.set(m[1], { reason: m[2].trim(), where })
  }
}

// ── repo discovery ─────────────────────────────────────────────────────────
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.venv', '__pycache__', '.ship'])
const walk = (dir, out = [], depth = 0) => {
  if (depth > 6) return out
  let entries
  try { entries = readdirSync(dir) } catch { return out }
  for (const e of entries) {
    if (SKIP.has(e) || e.startsWith('.DS')) continue
    const p = join(dir, e)
    let st
    try { st = statSync(p) } catch { continue }
    if (st.isDirectory()) walk(p, out, depth + 1)
    else if (st.size < 2_000_000) out.push(p)
  }
  return out
}

const read = p => { try { return readFileSync(p, 'utf8') } catch { return '' } }
const has = p => existsSync(join(ROOT, p))

// ═══════════════════════════════════════════════════════════════════════════
// REPO RULES
// ═══════════════════════════════════════════════════════════════════════════
const CODE_EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.vue', '.svelte', '.py', '.go', '.rb'])
const SECRET_PATTERNS = [
  [/\bsk-[A-Za-z0-9]{20,}/, 'API secret key'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key id'],
  [/\bghp_[A-Za-z0-9]{30,}/, 'GitHub token'],
  [/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/, 'private key'],
  [/\b(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'][A-Za-z0-9_\-]{16,}["']/i, 'hardcoded credential'],
]
const PLACEHOLDER = /^(changeme|xxx+|your[-_]?\w+[-_]?here|todo|replace[-_]?me|<.*>)$/i

function repoRules() {
  if (!existsSync(ROOT)) return
  const files = walk(ROOT)
  if (!files.length) return
  const rel = p => relative(ROOT, p)

  for (const f of files) {
    const ext = extname(f)
    // Markdown is excluded by design. Docs legitimately show the directive inside code
    // fences, and a fenced example is indistinguishable from a real annotation — so a
    // project that documents this feature would silently disable the rules it documents.
    // Waivers belong in the code or markup they apply to.
    if (ext === '.html' || CODE_EXT.has(ext)) collectWaivers(read(f), rel(f))
  }

  // secrets committed
  for (const f of files) {
    const ext = extname(f)
    if (!CODE_EXT.has(ext) && !['.env', '.json', '.yml', '.yaml', ''].includes(ext)) continue
    if (rel(f).includes('.env.example') || rel(f).includes('.env.sample')) continue
    const t = read(f)
    if (!t) continue
    for (const [re, label] of SECRET_PATTERNS) {
      if (re.test(t)) { add('secret-in-repo', 'fail', `${label} appears committed`, rel(f)); break }
    }
  }

  // .env.example drift — every process.env key the code reads should be documented
  const envExample = has('.env.example') ? read(join(ROOT, '.env.example')) : null
  if (envExample !== null) {
    const documented = new Set([...envExample.matchAll(/^([A-Z][A-Z0-9_]+)\s*=(.*)$/gm)].map(m => m[1]))
    for (const m of envExample.matchAll(/^([A-Z][A-Z0-9_]+)\s*=\s*(.+)$/gm)) {
      const v = m[2].trim().replace(/^["']|["']$/g, '')
      if (v && !PLACEHOLDER.test(v) && v.length > 12 && /[A-Za-z0-9]{12,}/.test(v))
        add('env-example-real-value', 'fail', `${m[1]} looks like a real value, not a placeholder`, '.env.example')
    }
    const used = new Set()
    for (const f of files) {
      if (!CODE_EXT.has(extname(f))) continue
      for (const m of read(f).matchAll(/process\.env\.([A-Z][A-Z0-9_]+)|import\.meta\.env\.([A-Z][A-Z0-9_]+)/g))
        used.add(m[1] || m[2])
    }
    const missing = [...used].filter(k => !documented.has(k) && !k.startsWith('NODE_'))
    if (missing.length)
      add('env-example-drift', 'fail', `read by code but absent from .env.example: ${missing.slice(0, 6).join(', ')}`, '.env.example')
  } else if (files.some(f => read(f).includes('process.env.'))) {
    add('env-example-missing', 'warn', 'code reads env vars but there is no .env.example')
  }

  // fetch() outside the api client
  const apiClient = files.find(f => /api-?client|apiClient|lib\/api/i.test(rel(f)))
  if (apiClient) {
    const strays = files.filter(f =>
      CODE_EXT.has(extname(f)) && f !== apiClient &&
      /\bfetch\(\s*[`'"]https?:\/\//.test(read(f)))
    if (strays.length)
      add('fetch-outside-client', 'warn',
        `${strays.length} file(s) call fetch() with an absolute URL instead of the API client`,
        rel(strays[0]))
  }

  // float money columns in SQL
  for (const f of files.filter(f => ['.sql'].includes(extname(f)))) {
    const t = read(f)
    if (/\b(?:amount|price|total|balance|cost|fee|salary)\w*\s+(?:FLOAT|DOUBLE|REAL)\b/i.test(t))
      add('float-money', 'fail', 'money column declared FLOAT/DOUBLE/REAL — use integer minor units', rel(f))
    const tables = [...t.matchAll(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?["`]?(\w+)["`]?\s*\(([\s\S]*?)\n\s*\)\s*;/gi)]
    for (const [, name, body] of tables) {
      if (/^(migrations|schema_|tenants?|users?)$/i.test(name)) continue
      if (!/tenant_id/i.test(body))
        add('no-tenant-id', 'warn', `table "${name}" has no tenant_id column`, rel(f))
    }
  }

  // raw hex outside a token block
  const cssFiles = files.filter(f => ['.css', '.scss'].includes(extname(f)))
  for (const f of cssFiles) {
    const t = read(f)
    const inTokens = /:root\s*\{[^}]*--/.test(t)
    const hexes = [...t.matchAll(/#[0-9a-fA-F]{3,8}\b/g)]
    if (inTokens && hexes.length > 24)
      add('raw-hex-sprawl', 'warn', `${hexes.length} raw hex values — move them into the token block`, rel(f))
    // spacing off the 4px scale
    const odd = [...t.matchAll(/(?:padding|margin|gap)[^:]*:\s*([^;}]+)[;}]/g)]
      .flatMap(m => [...m[1].matchAll(/(\d+)px/g)].map(x => +x[1]))
      .filter(n => n > 0 && n % 4 !== 0)
    if (odd.length > 6)
      add('spacing-off-scale', 'warn', `${odd.length} spacing values off the 4px scale (e.g. ${[...new Set(odd)].slice(0, 4).join('px, ')}px)`, rel(f))
  }

  const ui = files.filter(f => CODE_EXT.has(extname(f)))
  const src = ui.map(f => ({ f: rel(f), t: read(f) }))
  const anyMatch = re => src.filter(s => re.test(s.t))
  const routeish = re => src.some(s => re.test(s.t))

  // ── forms ────────────────────────────────────────────────────────────────
  for (const { f, t } of src) {
    // password input with no autocomplete hint
    for (const m of t.matchAll(/<input\b[^>]*type=["']password["'][^>]*>/gi))
      if (!/autocomplete=/i.test(m[0]))
        { add('password-no-autocomplete', 'warn', 'password input without autocomplete (new-password / current-password)', f); break }
    // email/tel typed as text
    for (const m of t.matchAll(/<input\b[^>]*>/gi)) {
      const tag = m[0]
      if (/type=["']text["']/i.test(tag) && /(?:name|id)=["'][^"']*(?:email|e-mail)["']/i.test(tag))
        { add('wrong-input-type', 'warn', 'email field declared type="text" — use type="email"', f); break }
    }
    // inputs with neither label nor aria-label
    const inputs = [...t.matchAll(/<input\b[^>]*>/gi)].filter(m => !/type=["'](?:hidden|submit|button|checkbox|radio)["']/i.test(m[0]))
    const labels = (t.match(/<label\b/gi) || []).length + (t.match(/aria-label=/gi) || []).length
    if (inputs.length >= 3 && labels === 0)
      add('inputs-without-labels', 'fail', `${inputs.length} inputs and no <label> or aria-label`, f)
    // validation on every keystroke
    if (/onChange=\{[^}]{0,80}(?:validate|setError|checkValid)/i.test(t))
      add('validate-on-keystroke', 'warn', 'validation appears to run on change — validate on blur instead', f)
  }
  if (src.some(s => /<form\b/i.test(s.t)) &&
      !src.some(s => /\b(?:zod|yup|valibot|joi|superstruct)\b/i.test(s.t)))
    add('no-validation-schema', 'warn', 'forms present but no schema-validation library found')
  if (src.some(s => /<form\b/i.test(s.t)) &&
      !src.some(s => /disabled=\{[^}]*(?:isSubmitting|submitting|loading|pending)/i.test(s.t)))
    add('submit-not-disabled', 'warn', 'no submit button disabled while submitting — double submission is likely')

  // ── states ───────────────────────────────────────────────────────────────
  const fetchNoTimeout = anyMatch(/\bfetch\((?![^)]*(?:signal|AbortSignal|timeout))/)
  if (fetchNoTimeout.length)
    add('fetch-no-timeout', 'warn', `${fetchNoTimeout.length} file(s) call fetch() with no timeout or abort signal`, fetchNoTimeout[0].f)
  // a component that maps a collection into elements is a list view
  const listViews = src.filter(s =>
    /\.map\(\s*\(?\w+\)?\s*=>[\s\S]{0,120}<[A-Za-z]/.test(s.t) ||
    (/\.map\(/.test(s.t) && /(?:useQuery|useEffect|fetch\()/.test(s.t)))
  const hasEmptyCopy = /(?:length\s*===?\s*0|isEmpty|\.length\s*\?)|(?:no[-_ ]?(?:results|data|items|records|rows)|nothing (?:here|yet)|empty[-_ ]?state)/i
  const bare = listViews.filter(s => !hasEmptyCopy.test(s.t))
  if (bare.length)
    add('no-empty-state', 'fail',
      `${bare.length} list view(s) render a collection with no empty state`, bare[0].f)
  if (!src.some(s => /ErrorBoundary|componentDidCatch|errorElement/i.test(s.t)))
    add('no-error-boundary', 'warn', 'no error boundary — one broken component will white-screen the app')

  // ── account lifecycle ────────────────────────────────────────────────────
  const hasAuth = routeish(/(?:sign[- ]?in|log[- ]?in|\/login|useAuth|authProvider)/i)
  if (hasAuth) {
    const need = [
      [/forgot[- ]?password|reset[- ]?password|password[- ]?reset/i, 'no-password-reset', 'fail', 'no forgot/reset-password path'],
      [/change[- ]?password|current[Pp]assword/i, 'no-change-password', 'warn', 'no change-password path'],
      [/verify[- ]?email|email[- ]?verification|confirm[- ]?email/i, 'no-email-verification', 'warn', 'no email-verification path'],
      [/delete[- ]?account|close[- ]?account|account[- ]?deletion/i, 'no-account-deletion', 'fail', 'no account-deletion path (legally required in several jurisdictions)'],
      [/export[- ]?(?:my[- ]?)?data|data[- ]?export|download[- ]?(?:my[- ]?)?data/i, 'no-data-export', 'warn', 'no data-export path'],
    ]
    for (const [re, rule, lvl, msg] of need)
      if (!routeish(re)) add(rule, lvl, msg)
  }

  // ── auth screen defects ──────────────────────────────────────────────────
  for (const { f, t } of src) {
    if (!/type=["']password["']/i.test(t)) continue
    const constrained = /max-w-|maxWidth|max-width|w-\[?\d|container|mx-auto/i.test(t)
    if (!constrained)
      add('unconstrained-form', 'warn',
        'auth form has no max-width or centring — inputs will stretch across the viewport', f)
    if (/<input[^>]+(?:value|defaultValue)=["'][^"']*(?:demo|test)@/i.test(t))
      add('demo-creds-prefilled', 'warn',
        'demo credentials pre-filled into the field value — use labelled hint text instead', f)
  }

  // ── legal ────────────────────────────────────────────────────────────────
  for (const { f, t } of src) {
    for (const m of t.matchAll(/<input\b[^>]*type=["']checkbox["'][^>]*>/gi))
      if (/\b(?:checked|defaultChecked)\b(?!=\{?false)/.test(m[0]) &&
          /(?:terms|privacy|consent|agree)/i.test(t.slice(Math.max(0, m.index - 200), m.index + 300)))
        { add('consent-prechecked', 'fail', 'terms/consent checkbox appears pre-checked — that is not consent', f); break }
  }

  // ── api ──────────────────────────────────────────────────────────────────
  const server = src.filter(s => /\b(?:router|app)\.(?:get|post|put|patch|delete)\(|@(?:Get|Post|Put|Patch|Delete)\(|def\s+\w+\(.*request/i.test(s.t))
  for (const { f, t } of server) {
    if (/\b(?:router|app)\.(?:get|post|put|patch|delete)\(\s*["'`]\/(?!api\/v\d)/.test(t))
      add('unversioned-api', 'warn', 'routes registered without an /api/vN prefix', f)
    if (/req\.(?:body|query|params)\.tenant_?[Ii]d|request\.(?:json|args)\[?["']tenant_id/.test(t))
      add('tenant-from-request', 'fail', 'tenant id read from the request — it must come from the session', f)
    if (/access_?token=|[?&]token=\$\{|[?&]api_?key=/.test(t))
      add('token-in-query', 'fail', 'auth token appears in a query string — it lands in logs and referrers', f)
    if (/Access-Control-Allow-Origin["']?\s*[,:]\s*["']\*/.test(t) && /credentials/i.test(t))
      add('cors-wildcard-credentials', 'fail', 'CORS wildcard origin combined with credentials', f)
    if (/\b(?:router|app)\.get\(\s*["'`][^"'`]*\/(?:users|orders|items|invoices|products|customers|jobs)["'`]/.test(t) &&
        !/\b(?:limit|per_?page|take|pageSize)\b/.test(t))
      add('unpaginated-list', 'fail', 'collection endpoint with no pagination parameter', f)
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// URL RULES
// ═══════════════════════════════════════════════════════════════════════════
const FRAMEWORK_TITLES = [
  'react app', 'vite app', 'vite + react', 'vite + react + ts', 'create react app',
  'next.js', 'nuxt', 'svelte app', 'vue app', 'app', 'frontend', 'my app',
  'welcome to nginx!', 'document', 'untitled', 'loading...', 'home',
]
const tag = (h, re) => { const m = h.match(re); return m ? m[1].trim() : '' }

async function urlRules(url) {
  let res, html
  try {
    res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'ship-detect/1.0' } })
    html = await res.text()
  } catch (e) {
    add('unreachable', 'fail', `could not fetch: ${e.message}`, url)
    return
  }
  if (!res.ok) add('bad-status', 'fail', `returned HTTP ${res.status}`, url)
  collectWaivers(html, url)
  const H = Object.fromEntries([...res.headers].map(([k, v]) => [k.toLowerCase(), v]))

  // — identity —
  const title = tag(html, /<title[^>]*>([^<]*)<\/title>/i)
  if (!title) add('default-title', 'fail', 'no <title> tag', url)
  else if (FRAMEWORK_TITLES.includes(title.toLowerCase()))
    add('default-title', 'fail', `<title> is the framework default: "${title}"`, url)
  else if (title.length > 60)
    add('long-title', 'warn', `<title> is ${title.length} chars (aim for <=60)`, url)

  const desc = tag(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
  if (!desc) add('no-description', 'fail', 'no meta description', url)
  else if (desc.length < 60 || desc.length > 170)
    add('description-length', 'warn', `meta description is ${desc.length} chars (aim 120-160)`, url)

  if (!/<link[^>]+rel=["']canonical["']/i.test(html))
    add('no-canonical', 'fail', 'no canonical URL', url)
  if (!/<link[^>]+rel=["'][^"']*icon/i.test(html))
    add('no-favicon', 'warn', 'no favicon link', url)
  if (!/<html[^>]+lang=/i.test(html))
    add('no-lang', 'warn', 'no lang attribute on <html>', url)

  // — share card —
  const ogImage = tag(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i)
  if (!ogImage) add('no-og-image', 'fail', 'no og:image — every shared link renders blank', url)
  else if (!/^https?:\/\//i.test(ogImage))
    add('og-image-relative', 'fail', 'og:image is a relative URL — crawlers will not resolve it', url)
  if (!/property=["']og:title["']/i.test(html)) add('no-og-title', 'fail', 'no og:title', url)
  if (!/name=["']twitter:card["']/i.test(html)) add('no-twitter-card', 'warn', 'no twitter:card', url)

  // — crawlability —
  if (!/<h1[\s>]/i.test(html))
    add('no-h1', 'fail', 'zero <h1> in served HTML — invisible to crawlers before JS runs', url)
  const bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  if (bodyText.length < 200)
    add('shell-html', 'fail', `only ${bodyText.length} chars of static body text — the page is an empty shell`, url)

  // — security headers —
  const SEC = [
    ['strict-transport-security', 'hsts', 'fail'],
    ['x-content-type-options', 'no-nosniff', 'fail'],
    ['content-security-policy', 'no-csp', 'warn'],
    ['referrer-policy', 'no-referrer-policy', 'warn'],
  ]
  for (const [h, rule, lvl] of SEC)
    if (!H[h]) add(rule, lvl, `missing ${h} header`, url)
  if (!H['x-frame-options'] && !/frame-ancestors/i.test(H['content-security-policy'] || ''))
    add('no-frame-protection', 'warn', 'no X-Frame-Options and no CSP frame-ancestors', url)

  // — transport —
  if (!H['content-encoding'])
    add('no-compression', 'fail', 'response is not compressed (no content-encoding)', url)

  // — sibling routes —
  const origin = new URL(url).origin
  const probe = async path => {
    try { const r = await fetch(origin + path, { redirect: 'follow', headers: { 'User-Agent': 'ship-detect/1.0' } }); return r }
    catch { return null }
  }
  const [robots, priv, terms, notfound] = await Promise.all(
    ['/robots.txt', '/privacy', '/terms', '/__ship_detect_404_probe'].map(probe))

  if (!robots || !robots.ok) add('no-robots', 'warn', 'no robots.txt', origin)
  else {
    const t = await robots.text()
    if (/^\s*Disallow:\s*\/\s*$/mi.test(t) && !/^\s*Allow:/mi.test(t))
      add('robots-blocks-all', 'fail', 'robots.txt contains "Disallow: /" — the whole site is delisted', origin)
  }
  if (!priv?.ok) add('missing-legal', 'fail', 'no /privacy route — payment gateways and app stores require it', origin)
  if (!terms?.ok) add('missing-legal-terms', 'fail', 'no /terms route', origin)
  if (notfound && notfound.status === 200)
    add('soft-404', 'warn', 'unknown paths return HTTP 200 — should be a real 404', origin)

  // — bundle budget —
  const assets = [...html.matchAll(/<(?:script[^>]+src|link[^>]+href)=["']([^"']+\.(?:js|css)[^"']*)["']/gi)]
    .map(m => m[1]).slice(0, 6)
  let js = 0, css = 0
  await Promise.all(assets.map(async a => {
    try {
      const r = await fetch(new URL(a, url).href, { headers: { 'User-Agent': 'ship-detect/1.0' } })
      const buf = await r.arrayBuffer()
      const kb = buf.byteLength / 1024
      if (/\.css/.test(a)) css += kb; else js += kb
      if (/-[A-Za-z0-9_]{8,}\.(js|css)/.test(a)) {
        const cc = (r.headers.get('cache-control') || '').toLowerCase()
        if (/no-store|no-cache/.test(cc))
          add('hashed-asset-not-cached', 'warn',
            'content-hashed asset sent with no-store/no-cache — repeat visits redownload everything', a)
      }
    } catch { /* ignore */ }
  }))
  if (js > 400) add('js-oversize', js > 1024 ? 'fail' : 'warn', `${js.toFixed(0)} KB of JS on first load (budget 400 KB raw)`, url)
  if (css > 100) add('css-bloat', 'warn', `${css.toFixed(0)} KB of CSS — utility-framework purge is likely misconfigured`, url)
}

// ═══════════════════════════════════════════════════════════════════════════
// autodetect + run
// ═══════════════════════════════════════════════════════════════════════════
const RULE_GROUPS = {
  launch: ['default-title', 'long-title', 'no-description', 'description-length', 'no-canonical', 'no-favicon',
    'no-lang', 'no-og-image', 'og-image-relative', 'no-og-title', 'no-twitter-card', 'no-h1', 'shell-html',
    'no-robots', 'robots-blocks-all', 'soft-404', 'bad-status', 'unreachable'],
  deploy: ['hsts', 'no-nosniff', 'no-csp', 'no-referrer-policy', 'no-frame-protection', 'no-compression',
    'hashed-asset-not-cached', 'js-oversize', 'css-bloat', 'secret-in-repo', 'env-example-drift',
    'env-example-missing', 'env-example-real-value'],
  schema: ['float-money', 'no-tenant-id'],
  spine: ['no-tenant-id', 'float-money'],
  frontend: ['fetch-outside-client', 'raw-hex-sprawl', 'no-error-boundary', 'fetch-no-timeout'],
  design: ['raw-hex-sprawl', 'spacing-off-scale'],
  forms: ['inputs-without-labels', 'password-no-autocomplete', 'wrong-input-type', 'validate-on-keystroke',
    'no-validation-schema', 'submit-not-disabled', 'unconstrained-form', 'demo-creds-prefilled'],
  states: ['no-empty-state', 'no-error-boundary', 'fetch-no-timeout'],
  account: ['no-password-reset', 'no-change-password', 'no-email-verification', 'no-account-deletion',
    'no-data-export'],
  legal: ['missing-legal', 'missing-legal-terms', 'consent-prechecked', 'no-account-deletion', 'no-data-export'],
  api: ['unversioned-api', 'tenant-from-request', 'token-in-query', 'cors-wildcard-credentials',
    'unpaginated-list'],
  list: ['unpaginated-list', 'no-empty-state'],
}
RULE_GROUPS.all = [...new Set(Object.values(RULE_GROUPS).flat())]

function autoUrl() {
  const explicit = flag('url')
  if (typeof explicit === 'string') return explicit
  const cfg = join(ROOT, '.ship', 'config.json')
  if (existsSync(cfg)) {
    try { const c = JSON.parse(read(cfg)); if (c.url) return c.url } catch {}
  }
  const pkgPath = join(ROOT, 'package.json')
  if (existsSync(pkgPath)) {
    try {
      const p = JSON.parse(read(pkgPath))
      for (const k of ['homepage', 'url']) if (typeof p[k] === 'string' && /^https?:/.test(p[k])) return p[k]
    } catch {}
  }
  return null
}

const C = process.stdout.isTTY && !JSON_OUT
  ? { r: '\x1b[31m', y: '\x1b[33m', g: '\x1b[32m', d: '\x1b[2m', b: '\x1b[1m', x: '\x1b[0m' }
  : { r: '', y: '', g: '', d: '', b: '', x: '' }

const run = async () => {
  const url = autoUrl()
  const scanned = []

  if (existsSync(join(ROOT, 'package.json')) || existsSync(join(ROOT, 'src')) || existsSync(join(ROOT, '.env.example'))) {
    repoRules(); scanned.push('repo')
  }
  if (url) { await urlRules(url); scanned.push(url) }

  if (!scanned.length) {
    console.error(`${C.y}ship detect${C.x}: nothing to check here.\n` +
      `  Run inside a project, or pass ${C.b}--url https://your-app.com${C.x}`)
    process.exit(2)
  }

  // apply waivers + rule-group filter
  const allow = ONLY && typeof ONLY === 'string'
    ? new Set(ONLY.split(',').flatMap(g => RULE_GROUPS[g.trim()] || []))
    : null
  // Only honour a waiver whose id is an actual rule. A placeholder like <rule-id> or a
  // stray word must never disable anything.
  const real = new Set(RULE_GROUPS.all)
  const waived = new Map([...waivedRaw].filter(([r]) => real.has(r)))
  const bogus = [...waivedRaw.keys()].filter(r => !real.has(r))

  const kept = findings.filter(f => {
    if (allow && !allow.has(f.rule)) return false
    if (waived.has(f.rule)) return false
    return true
  })

  const fails = kept.filter(f => f.level === 'fail')
  const warns = kept.filter(f => f.level === 'warn')

  if (JSON_OUT) {
    console.log(JSON.stringify({
      scanned, pass: fails.length === 0,
      failed: fails.length, warnings: warns.length,
      waived: [...waived.entries()].map(([rule, w]) => ({ rule, ...w })),
      findings: kept,
    }, null, 2))
  } else {
    console.log(`\n${C.b}ship detect${C.x} ${C.d}${scanned.join(' · ')}${C.x}\n`)
    for (const f of [...fails, ...warns]) {
      const mark = f.level === 'fail' ? `${C.r}✗${C.x}` : `${C.y}⚠${C.x}`
      console.log(`  ${mark} ${C.b}${f.rule.padEnd(26)}${C.x} ${f.msg}`)
      if (f.where) console.log(`    ${C.d}${f.where}${C.x}`)
    }
    if (waived.size) {
      console.log(`\n  ${C.d}waived: ${[...waived.keys()].join(', ')}${C.x}`)
    }
    if (bogus.length) {
      console.log(`  ${C.y}ignored waivers (not real rules): ${bogus.join(', ')}${C.x}`)
    }
    const parts = []
    if (fails.length) parts.push(`${C.r}${fails.length} failed${C.x}`)
    if (warns.length) parts.push(`${C.y}${warns.length} warning${warns.length > 1 ? 's' : ''}${C.x}`)
    if (!parts.length) parts.push(`${C.g}all checks passed${C.x}`)
    console.log(`\n  ${parts.join(' · ')}\n`)
  }

  process.exit(fails.length || (STRICT && warns.length) ? 1 : 0)
}

if (argv.includes('--help') || argv.includes('-h')) {
  // assembled at runtime: printing a live directive would waive our own checks
  const DIR = ['ship', 'disable'].join('-')
  console.log(`
ship detect — deterministic launch-readiness checks. No LLM, no key, no deps.

  npx @chaitu237/ship-without-me detect                      auto-detect what to check
  npx @chaitu237/ship-without-me detect --url https://...    check a deployed URL
  npx @chaitu237/ship-without-me detect --rules launch       one of 12 groups (see docs/rules.md)
  npx @chaitu237/ship-without-me detect --json               machine-readable, for CI
  npx @chaitu237/ship-without-me detect --strict             warnings fail the build too

Waive a rule inline, with a reason:
  <!-- ${DIR} no-h1: intentional SPA shell -->
  //   ${DIR} float-money: legacy column, migration scheduled

Exit 0 clean · 1 failures · 2 nothing to check
`)
  process.exit(0)
}

run()
