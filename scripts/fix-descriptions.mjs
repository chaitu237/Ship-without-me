#!/usr/bin/env node
// Rewrites every skill description to triggering-conditions-only form.
//
// WHY: a description that summarises what the skill does creates a shortcut the agent
// takes instead of reading the body. Observed directly: a description mentioning "review
// between phases" produced one review where the body specified two. Removing the workflow
// summary fixed it.
//
// So: descriptions state ONLY when to reach for the skill — symptoms, situations, the
// words a user would actually say. Never what it contains.

import { readFileSync, writeFileSync } from 'node:fs'

const root = new URL('../skills/', import.meta.url)

const D = {
'ship-without-me':
  'Use when the user wants a complete app built and deployed from a single prompt with no ' +
  'further input from them, or says to just build it and not ask questions.',

'ship-with-me':
  'Use when the user wants to build an app and has references to work from — a screenshot, ' +
  'a competitor URL, a brand guide, an existing repo, or a written spec.',

'design-system-commit':
  'Use before the first UI component exists, or when an interface looks generic, unstyled, ' +
  'or like every other AI-generated app.',

'layout-patterns':
  'Use before styling any screen, when a page feels empty or cramped, or when a screen is ' +
  'fully styled and still reads wrong.',

'frontend-architecture':
  'Use when starting a frontend, when state has become tangled or duplicated, when the app ' +
  'refetches on every navigation, or when one change re-renders everything.',

'app-shell-composition':
  'Use when building the logged-in surface of an app with more than one module, or when the ' +
  'app feels like several different apps stitched together.',

'landing-composition':
  'Use when building or fixing a public landing page, when visitors arrive and do not sign ' +
  'up, or when the page reads as generic.',

'forms-and-validation':
  'Use when building or fixing any form, when users abandon one partway through, when input ' +
  'is lost on an error, or when duplicate records appear.',

'states-and-feedback':
  'Use when a screen fetches or changes data, when an app feels broken with no obvious ' +
  'error, when a new user sees a blank screen, or before adding a confirmation dialog.',

'list-and-table':
  'Use when a screen shows many records, when users ask to export data instead of working ' +
  'in the app, or when a list becomes slow or unusable on a phone.',

'account-lifecycle':
  'Use when an app has user accounts, or when a user cannot get back in — a forgotten ' +
  'password, an unverified email, an expired session, a lost 2FA device, or a request to ' +
  'delete an account or export its data.',

'onboarding-first-run':
  'Use when designing what happens immediately after signup, or when users sign up and do ' +
  'not come back.',

'legal-and-consent':
  'Use before a public launch, before connecting a payment provider, before app-store ' +
  'submission, or when data-protection obligations come up.',

'database-schema':
  'Use before writing or changing a schema, when deciding whether something is one table or ' +
  'two, when a query is slow, or when a column has to change in production.',

'backend-api-design':
  'Use when creating server routes, when a second client is about to consume an endpoint, ' +
  'or when the frontend and backend disagree about a contract.',

'tenant-auth-demo':
  'Use when more than one customer\'s data will live in the same database, when adding login ' +
  'or roles, or when strangers should be able to try the app without signing up.',

'vertical-business-os':
  'Use when building an all-in-one operations platform for one specific trade, or when a ' +
  'request names three or more operational modules at once.',

'grounded-ai-feature':
  'Use when an LLM\'s output will be shown to a user or acted on, when answers vary between ' +
  'runs, or when the model asserts things that are not true.',

'payments-billing':
  'Use before charging anyone real money, when a subscription has to renew, change, or fail, ' +
  'or when refunds, invoices, tax, or payouts are involved.',

'feed-and-social':
  'Use when one user\'s content will appear on another user\'s screen — a feed, a timeline, ' +
  'a community, a forum, comments, or any user-generated content.',

'ship-ready-audit':
  'Use before sharing or launching anything publicly, when a shared link renders as a blank ' +
  'card, or when a site is invisible to search engines.',

'deployment-hardening':
  'Use before real users depend on a deploy, or when asking whether something is production ' +
  'ready.',

'deploy-durability':
  'Use when a deployed app is unreachable, intermittently down, or behaves differently in ' +
  'production than it does locally.',

'regional-commerce-stack':
  'Use when building for one named country rather than a generic global market — local tax ' +
  'identifiers, national payment rails, messaging apps, non-Latin scripts, or phone-based ' +
  'identity.',

'field-ops-mobile':
  'Use when the people using this work away from a desk — on a road, a farm, a site, or a ' +
  'shop floor — or when connectivity, sunlight, gloves, or shared devices are part of the ' +
  'situation.',
}

const wrap = (t, w = 96) => {
  const out = []
  let line = ' '
  for (const word of t.split(/\s+/)) {
    if (line.length + word.length + 1 > w) { out.push(line); line = '  ' + word }
    else line = line.trim() ? line + ' ' + word : '  ' + word
  }
  out.push(line)
  return out.join('\n')
}

let total = 0, n = 0
for (const [slug, desc] of Object.entries(D)) {
  const file = new URL(`${slug}/SKILL.md`, root)
  const src = readFileSync(file, 'utf8')
  const fm = src.match(/^---\n[\s\S]*?\n---\n/)
  if (!fm) { console.error(`no frontmatter: ${slug}`); process.exitCode = 1; continue }
  writeFileSync(file, `---\nname: ${slug}\ndescription: >\n${wrap(desc)}\n---\n` + src.slice(fm[0].length))
  total += desc.length; n++
  if (desc.length > 280) console.warn(`  over budget (${desc.length}): ${slug}`)
}

console.log(`${n} descriptions rewritten to triggering-conditions-only form`)
console.log(`hot path: ${total.toLocaleString()} chars (~${Math.round(total / 4).toLocaleString()} tokens)`)
