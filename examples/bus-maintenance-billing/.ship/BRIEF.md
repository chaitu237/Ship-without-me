# Provisional brief

**Shape:** Internal work tool / vertical operations system.

**Working statement:** A maintenance billing desk records workshop/vendor invoices against buses, moves each bill through verification and approval, and hands accounts a clear payable record without losing audit history.

**Primary user:** The maintenance billing executive entering a repair invoice after the workshop/vendor submits it.

**Core job:** Turn a repair bill plus job-card evidence into a verified, approved, traceable payable record tied to the correct bus and vendor.

**Current alternative:** Spreadsheet rows, physical bills, workshop job cards, and follow-up through calls/messages.

**Primary pain:** Duplicate invoices, inconsistent bus/vendor names, unclear approval state, manual tax arithmetic, and no single activity trail from entry to payment.

**First value event:** A complete maintenance invoice is saved once, its payable amount reconciles, and it appears in the supervisor verification queue.

**Success signal:** A user can enter a real-format invoice, advance it through the workflow, reload the app, find the same bill, and export the filtered ledger.

**Context:** Internal bus-travel maintenance department; INR; Indian-style GST fields; desktop-first but usable on phones in workshop/office conditions.

## Reframe

**Stated request:** Create a billing app for the maintenance department of a bus travel agency.

**Real outcome:** One maintenance invoice can move from workshop evidence to an auditable payable record without duplicate entry or status ambiguity.

**Bottleneck:** The current record is fragmented across vendor bill, job card, spreadsheet and verbal approval.

**Failure condition:** The UI looks complete but a bill cannot be reliably tied to a bus/vendor, reconciled, found later, or proven to have been verified/approved/paid.

**Success criteria:**

1. Bill totals are calculated from integer paise and line-level GST.
2. Duplicate vendor invoice numbers are rejected.
3. Workflow transitions append events instead of overwriting history.
4. Draft survives navigation/reload.
5. Search/filter finds bills by invoice, vendor, bus or job card.
6. Data can leave the app as CSV and a simple bill CSV can be imported.
7. Core domain tests exit zero.

## Reversible assumptions

- V1 is a single trusted-workstation MVP rather than a production shared workspace.
- Payment is recorded by reference/UTR; no payment is initiated.
- GST rates are entered per line; the app does not decide legal tax applicability.
- Three daily modules are Bills, Fleet and Vendors. Dashboard is a view over the bill ledger.
