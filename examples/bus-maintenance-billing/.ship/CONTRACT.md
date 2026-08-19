# Core interaction contract

## First-value event

A maintenance billing executive saves one vendor invoice against a known bus and vendor, sees a reconciled net payable amount, and the bill enters **Pending verification**.

## Starting state

A functioning demo contains realistic buses, vendors, bills and workflow events. A new installation can also start from these seed records and can add master data without external services.

## Successful path

1. Open **Bills** and choose **New bill**.
2. Select vendor and bus; enter invoice/job-card identifiers and dates.
3. Add one or more part/service lines with quantity, rate and GST rate.
4. See taxable value, GST, adjustments and net payable update from the entered values.
5. Save once; duplicate vendor invoice numbers are rejected.
6. Open the saved bill and append **Verified**.
7. Append **Approved for payment**.
8. Record payment reference/date; append **Paid**.
9. Reload the app; the bill and full activity history still exist.
10. Filter/search the bills list and export the current result to CSV.

## Essential state owners

- **Human workflow:** what verification, approval and payment actually mean operationally.
- **Local persistent storage:** authoritative app state for this MVP.
- **Pure domain functions:** authoritative bill arithmetic and validation rules.

## Failure path

A duplicate invoice, incomplete master-data reference, invalid amount, or missing line item prevents save. The user's entered form remains intact and errors appear beside the relevant field. CSV rows with unknown vendor/bus or duplicate invoices are skipped rather than overwriting records.

## Recovery path

Correct the marked field and submit again; use the autosaved draft after reload; add missing vendor/bus master data; or correct and re-import skipped CSV rows.

## Evidence

- Steps 2–5 arithmetic/validation: `npm test` unit assertions.
- Application parses: `node --check app.js` and `node --check server.mjs`.
- Application is served: start server and request `/`, `/app.js`, and `/api/health` with successful HTTP responses.
- Persistence path: implemented through versioned localStorage state and draft keys; final browser automation is deferred because this repository has no browser-test dependency.

## Non-goals

- Bank payment initiation.
- GST/TDS return filing or statutory determination.
- General accounting, ticketing, reservations, fuel management, HR or inventory ERP.
- Production multi-user authentication/server sync in this slice.
