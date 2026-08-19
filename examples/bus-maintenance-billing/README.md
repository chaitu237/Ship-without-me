# FleetLedger — Bus Maintenance Billing

A focused internal web app for the maintenance billing desk of a bus travel agency. It turns the repeated maintenance-invoice workflow into one auditable ledger:

**enter vendor invoice → verify → approve for payment → record payment**

## Run

Requires Node 18+ and no external dependencies.

```bash
cd examples/bus-maintenance-billing
npm test
npm start
```

Open `http://localhost:4173`.

## V1 modules

- **Bills** — maintenance invoices, mixed-rate GST line items, deductions, workflow status, payment reference, search/filter, CSV import/export.
- **Fleet** — bus master tied to maintenance spend.
- **Vendors** — vendor master, GSTIN, contact and payment terms.
- **Dashboard** — a view over bill records/events, not a separate data module.

## Data model

The MVP is browser-local by design: `localStorage` is the state owner, so the branch can run immediately without provisioning infrastructure. Financial amounts are stored as integer paise. Bills are treated as immutable financial source records; lifecycle changes are append-only events (`bill.created`, `bill.verified`, `bill.approved`, `bill.paid`, `bill.voided`).

The browser-local boundary is intentionally explicit in the UI. A production rollout should move the same record model to an authenticated workspace/server with backups and role-based permissions.

## CSV bill import

Supported headers:

```text
Invoice Number,Invoice Date,Vendor,Bus Registration,Job Card,Description,Qty,Rate INR,GST Rate
```

Vendor and bus values must already exist in their master lists. Invalid/duplicate rows are skipped and reported instead of partially overwriting existing bills.

## Verification

```bash
npm test
node --check app.js
node --check server.mjs
```

The core domain tests cover paise conversion, mixed GST calculation, append-only status derivation, duplicate invoice rejection, and CSV quoting/parsing.

## Boundaries

This build records operational billing data. It does **not** initiate payments, file returns, determine statutory GST/TDS applicability, or claim to be an accounting ledger/ERP replacement.
