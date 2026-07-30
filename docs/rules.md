# Detector rules

Generated from `cli/detect.mjs` by `scripts/gen-rules-doc.mjs`. Do not edit by hand.

**51 rules across 12 groups.**

```bash
npx ship-without-me detect                          # auto-detect what to check
npx ship-without-me detect --rules <group>[,<group>]
npx ship-without-me detect --json                   # machine-readable, for CI
npx ship-without-me detect --strict                 # warnings fail the build too
```

Groups: `launch` · `deploy` · `schema` · `spine` · `frontend` · `design` · `forms` · `states` · `account` · `legal` · `api` · `list`

## Waivers

Any rule can be waived inline, with a reason:

```html
<!-- ship-disable no-h1: intentional SPA shell, landing route is prerendered -->
```
```js
// ship-disable float-money: legacy column, migration scheduled for Q3
```

The reason is required — a bare rule id is not honoured. Exit codes: `0` clean ·
`1` failures · `2` nothing to check.

## Reference

| Rule | Level | Groups | What it catches |
|---|---|---|---|
| `bad-status` | **fail** | launch | returned HTTP ${res.status} |
| `consent-prechecked` | **fail** | legal | terms/consent checkbox appears pre-checked — that is not consent |
| `cors-wildcard-credentials` | **fail** | api | CORS wildcard origin combined with credentials |
| `css-bloat` | warn | deploy | ${css.toFixed(0)} KB of CSS — utility-framework purge is likely misconfigured |
| `default-title` | **fail** | launch | no <title> tag |
| `demo-creds-prefilled` | warn | forms | demo credentials pre-filled into the field value — use labelled hint text instead |
| `description-length` | warn | launch | meta description is ${desc.length} chars (aim 120-160) |
| `env-example-drift` | **fail** | deploy | read by code but absent from .env.example: ${missing.slice(0, 6).join( |
| `env-example-missing` | warn | deploy | code reads env vars but there is no .env.example |
| `env-example-real-value` | **fail** | deploy | ${m[1]} looks like a real value, not a placeholder |
| `fetch-no-timeout` | warn | frontend, states | ${fetchNoTimeout.length} file(s) call fetch() with no timeout or abort signal |
| `fetch-outside-client` | warn | frontend | ${strays.length} file(s) call fetch() with an absolute URL instead of the API client |
| `float-money` | **fail** | schema, spine | money column declared FLOAT/DOUBLE/REAL — use integer minor units |
| `hashed-asset-not-cached` | warn | deploy | content-hashed asset sent with no-store/no-cache — repeat visits redownload everything |
| `inputs-without-labels` | **fail** | forms | ${inputs.length} inputs and no <label> or aria-label |
| `js-oversize` | **fail** | deploy | ${js.toFixed(0)} KB of JS on first load (budget 400 KB raw) |
| `long-title` | warn | launch | <title> is ${title.length} chars (aim for <=60) |
| `missing-legal` | **fail** | legal | no /privacy route — payment gateways and app stores require it |
| `missing-legal-terms` | **fail** | legal | no /terms route |
| `no-canonical` | **fail** | launch | no canonical URL |
| `no-compression` | **fail** | deploy | response is not compressed (no content-encoding) |
| `no-description` | **fail** | launch | no meta description |
| `no-empty-state` | **fail** | states, list | ${bare.length} list view(s) render a collection with no empty state |
| `no-error-boundary` | warn | frontend, states | no error boundary — one broken component will white-screen the app |
| `no-favicon` | warn | launch | no favicon link |
| `no-frame-protection` | warn | deploy | no X-Frame-Options and no CSP frame-ancestors |
| `no-h1` | **fail** | launch | zero <h1> in served HTML — invisible to crawlers before JS runs |
| `no-lang` | warn | launch | no lang attribute on <html> |
| `no-og-image` | **fail** | launch | no og:image — every shared link renders blank |
| `no-og-title` | **fail** | launch | no og:title |
| `no-robots` | warn | launch | no robots.txt |
| `no-tenant-id` | warn | schema, spine | table  |
| `no-twitter-card` | warn | launch | no twitter:card |
| `no-validation-schema` | warn | forms | forms present but no schema-validation library found |
| `og-image-relative` | **fail** | launch | og:image is a relative URL — crawlers will not resolve it |
| `password-no-autocomplete` | warn | forms | password input without autocomplete (new-password / current-password) |
| `raw-hex-sprawl` | warn | frontend, design | ${hexes.length} raw hex values — move them into the token block |
| `robots-blocks-all` | **fail** | launch | robots.txt contains  |
| `secret-in-repo` | **fail** | deploy | ${label} appears committed |
| `shell-html` | **fail** | launch | only ${bodyText.length} chars of static body text — the page is an empty shell |
| `soft-404` | warn | launch | unknown paths return HTTP 200 — should be a real 404 |
| `spacing-off-scale` | warn | design | ${odd.length} spacing values off the 4px scale (e.g. ${[...new Set(odd)].slice(0, 4).join( |
| `submit-not-disabled` | warn | forms | no submit button disabled while submitting — double submission is likely |
| `tenant-from-request` | **fail** | api | tenant id read from the request — it must come from the session |
| `token-in-query` | **fail** | api | auth token appears in a query string — it lands in logs and referrers |
| `unconstrained-form` | warn | forms | auth form has no max-width or centring — inputs will stretch across the viewport |
| `unpaginated-list` | **fail** | api, list | collection endpoint with no pagination parameter |
| `unreachable` | **fail** | launch | could not fetch: ${e.message} |
| `unversioned-api` | warn | api | routes registered without an /api/vN prefix |
| `validate-on-keystroke` | warn | forms | validation appears to run on change — validate on blur instead |
| `wrong-input-type` | warn | forms | email field declared type= |

## What the detector deliberately does not check

Anything needing a human eye: whether cards in a grid are the same height, whether the
hero image shows the real running product, whether a section is filled with something
true, whether a task can be completed one-handed outdoors.

Skills state those as judgement checklists instead of pretending a rule covers them. **A
phantom check is worse than an honest checklist**, because it reports success for something
that never ran.
