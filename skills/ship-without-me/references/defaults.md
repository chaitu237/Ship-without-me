# Defaults you resolve from

Lookup table, consulted when a decision has no signal either way. Every entry here is a
`defaulted` confidence in `DECISIONS.md` — correct and unremarkable. Entries marked
*conditional* apply only where the profile says that thing exists.

Use these unless the brief overrides them. Log any override.

**Theme** — commit to light or dark and push it to the edge. Light: page luminance
above 0.75. Dark: below 0.28. **Never land in the middle** — mid-grey reads as an
unstyled default, because it usually is one.

**Accent hue** — exactly one, by vertical:

| Vertical | Hue |
|---|---|
| Finance, clinical, security, B2B SaaS, legal | Blue, 210–220° |
| Field ops, logistics, trades, fuel, construction | Orange/amber, 25–45° |
| Agriculture, sustainability, supply chain | Green, 120–160° |
| Anything else | Blue |

One accent, roughly 5–10% of the pixels, everything else neutral. No second accent.
No gradient unless the brief asks for one.

**Stack** — match the repo if one exists. Greenfield default: Vite + React + Tailwind +
shadcn/ui + lucide icons. Do not negotiate frameworks with yourself.

**Scope** — **one complete first-value loop** before any second destination. Everything
else goes in `.ship/ROADMAP.md` as v2. *Only where the profile says modules exist* — a work
tool with several daily jobs — does this become three modules for v1, never six.

**Identity** — **none until something requires it**: privacy, sharing, sync across devices,
ownership, payment, or permissions. Then the smallest boundary that satisfies the reason —
a local profile before a single account, a single account before a workspace, a workspace
before tenancy. *Only at workspace or above:* email+password (phone+OTP in emerging
markets) and a seeded demo tenant.

**Persistence** — the profile's state owner decides. Device runtime or local storage → no
server, and the product is finished without one. A backend is earned by remote storage,
sync, shared state, server-held secrets, external integrations, or central processing.

**Layout** — derived from what the user is doing, per `layout-patterns`. *Conditional:*
centered hero only where there is a public landing, split-screen only where there is auth,
sidebar shell only where there are modules to move between. A product with one continuous
surface gets none of the three.
