---
description: Run the deterministic launch-readiness checker on this repo or a URL
argument-hint: [--url https://…] [--rules group] [--strict]
---

Run the checker, then act on what it finds.

```bash
npx @chaitu237/ship-without-me detect $ARGUMENTS
```

For each failure, load the skill that owns it — the rule group maps to a skill:

| Group | Skill |
|---|---|
| `launch` | `ship-ready-audit` |
| `deploy` | `deployment-hardening` · `deploy-durability` |
| `schema` `spine` | `database-schema` · `vertical-business-os` |
| `api` | `backend-api-design` |
| `forms` | `forms-and-validation` |
| `states` `list` | `states-and-feedback` · `list-and-table` |
| `account` | `account-lifecycle` |
| `legal` | `legal-and-consent` |
| `design` | `design-system-commit` · `layout-patterns` |
| `frontend` | `frontend-architecture` |

Fix the failures. Report the warnings with a recommendation each — do not silently waive
anything. A waiver needs a stated reason and the user's agreement.
