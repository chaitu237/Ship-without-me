# Verification evidence

Executed on 2026-08-20 against this branch content before commit.

## Domain tests

Command:

```bash
cd examples/bus-maintenance-billing && npm test
```

Result: exit code **0** — 6 tests passed, 0 failed.

Covered claims:

- decimal input is converted to integer paise without float drift;
- mixed line-level GST and deductions reconcile;
- bill status derives from append-only events;
- duplicate vendor invoice numbers are rejected;
- quoted CSV cells with commas parse correctly;
- CSV export quotes values correctly.

## Syntax

Commands:

```bash
node --check app.js
node --check server.mjs
```

Result: both exit code **0**.

## Served-app smoke test

Commands run against `node server.mjs`:

```text
GET /           → 200
GET /app.js     → 200
GET /api/health → 200 {"ok":true,"app":"bus-maintenance-billing"}
```

Content assertions also confirmed that the served HTML contains `FleetLedger` and the served JS contains the dashboard renderer.

## Not claimed

No browser automation package exists in this zero-dependency app, so the full click-through/reload interaction was not falsely claimed as automated evidence. The browser-local persistence path is implemented and is the next verification to add when a browser runner is introduced.
