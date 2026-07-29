---
name: ship-ready-audit
description: >
  Use before sharing or launching anything publicly, when a shared link renders as a blank card,
  or when a site is invisible to search engines.
---

# Ship-ready audit

**The question this skill answers:** what does the world see before JavaScript runs?

Google, WhatsApp, Slack, LinkedIn, X and every link-preview bot see the raw HTML and
nothing else. For most single-page apps that is one empty `<div>` and a script tag — which
is why a working app can still produce a blank grey rectangle when someone shares it.

The gap between "the app works" and "the app is launchable" is usually one file.

---

## 1. Fetch what they actually see

Not the rendered DOM. The raw response.

```bash
curl -s https://<url> | head -c 4000
```

Everything below is judged against that output. If you audit the browser's DOM you will
pass checks the crawler fails.

## 2. Derive each tag from who consumes it

```
Who needs this, and what do they do without it?
├─ <title> ─────────► every tab, every search result, every bookmark.
│                      Missing → your product is called "React App".
├─ meta description ► the search snippet. Missing → the engine invents one
│                      from body text, which for an SPA shell is nothing.
├─ canonical ───────► search engines picking between your custom domain and
│                      your platform subdomain. Missing → they pick, and split
│                      whatever ranking you have.
├─ og:image ────────► every share, in every chat app. Missing → blank card.
│                      MUST be absolute — relative paths silently fail.
├─ favicon ─────────► the tab, and every bookmark bar.
└─ <html lang> ─────► screen readers, and translation prompts.
```

Each is one line. Each is invisible to you and highly visible to everyone else — which is
exactly why they get skipped.

## 3. Derive the crawlability fix from what the framework already does

```
Does the raw HTML contain your headline?
├─ yes ──► done. Skip to §4.
└─ no ───► take the CHEAPEST fix that works:
   ├─ framework supports SSR/SSG ──► enable it for the LANDING ROUTE ONLY
   ├─ has a prerender step ────────► prerender the landing route at build
   └─ neither ─────────────────────► inject the hero copy as static HTML
                                      inside the mount point; hydration replaces it
```

**Do not migrate the whole app to server rendering.** One route is the deliverable. The
logged-in app does not need to be crawlable and never did.

## 4. The remaining checks, and what each prevents

| Check | What it prevents |
|---|---|
| `robots.txt` present, no `Disallow: /` | a staging default that delists the entire site |
| `sitemap.xml` listing real routes | pages that exist but are never discovered |
| Branded 404 | a framework stack trace shown to a stranger |
| Zero console errors on first paint | a broken analytics or font request that also broke something else |
| Attribution badge: keep or remove | a generator badge left in the corner by accident |

The attribution one is a **decision**, not a rule. Either is fine. Not having decided is
what looks unfinished.

## 5. If there is no image to share

Do not skip `og:image`. Generate one from the product name and tagline on the accent
colour, 1200×630, under 1 MB.

A blank share card is the most-seen bug in any launched product, because every link
anyone posts carries it.

---

## Verify

```bash
ship detect --rules launch --url https://<url> --strict
```

Run before the fix and after. Done when it exits 0.

**Judgement:**

- [ ] Audited the raw response, not the rendered DOM
- [ ] Title is the product name, not a framework default
- [ ] `og:image` is an absolute URL and actually loads
- [ ] The headline appears in HTML before JS runs
- [ ] `robots.txt` does not disallow everything
- [ ] Attribution decided, either way

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| Shared links show a blank grey card | no `og:image`, or a relative one |
| Product appears as "React App" in tabs | default title never changed |
| Invisible to search entirely | shell HTML, or `Disallow: /` shipped from staging |
| Two versions of the site in results | no canonical between domain and subdomain |
| Search snippet is gibberish | no meta description, engine improvised from an empty shell |
| Looks unfinished on a stranger's screen | generator badge, or a framework 404 |

## Don't

- Don't chase performance scores. Different job — see `deployment-hardening`.
- Don't rewrite the positioning. If there is no pitch, ask for one line.
- Don't migrate a client-rendered app to full SSR for this.
- Don't invent a product description.
