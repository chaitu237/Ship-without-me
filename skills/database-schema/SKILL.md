---
name: database-schema
description: >
  Use before writing or changing a schema, when deciding whether something is one table or two,
  when a query is slow, or when a column has to change in production.
---

# Database schema

**The question this skill answers:** this data will outlive the code that writes it —
what must still be true in five years?

Application code gets rewritten every couple of years. The data does not. Every schema
shortcut becomes a migration with downtime attached, and some become unrecoverable —
a float that lost precision cannot be un-lost.

---

## 1. Derive every column from four questions

Ask these of each column before you type its type.

```
Does it IDENTIFY something a client will see?
  yes → UUID (v7/ULID so it sorts by time). Never a sequential integer:
        /invoices/1847 tells a competitor your volume and invites enumeration.
        If it can be created offline, the CLIENT generates it — that is what
        makes the sync retry idempotent instead of duplicating rows.

Does it represent MONEY?
  yes → integer minor units + a currency column. Never float, never double.
        0.10 has no exact float representation; your first reconciliation
        will be off by fractions of a cent and cost a week to find.
        Store currency even in a single-currency app — that assumption expires.

Does it represent TIME?
  yes → is it a moment, or a date a human named?
        · moment ("when did this happen")     → TIMESTAMPTZ, stored UTC
        · human date ("invoice date")         → DATE, no time, no zone
        Getting this backwards produces off-by-one-day bugs across timezones,
        and accountants notice before you do.

Will it be QUERIED, FILTERED, or SORTED on?
  yes → it is a column with an index, not a key inside a JSON blob.
        JSON is for genuinely unstructured payloads, not for dodging a migration.
```

If a column answers "no" to all four, ask whether you need it at all.

## 2. Derive nullability from meaning

`NULL` must mean **"genuinely unknown"** — never "empty", never "zero".

```
Is there a real difference between "we don't know" and "it's empty/zero"?
├─ yes ──► nullable, and document what NULL means for this column
└─ no ───► NOT NULL with a default. Zero invoices is 0, not NULL.
```

The failure this prevents: a column where both `NULL` and `''` occur means every query
downstream needs `WHERE (x IS NULL OR x = '')`, forever, and the one that forgets is a bug.

## 3. Derive one-table-or-two from lifecycle, not from naming

The most common early mistake is splitting `customers`, `vendors` and `staff` because
they have different names.

```
Do these rows share most fields AND the same lifecycle?
├─ yes ──► ONE table with a type column.
│          The same phone number is frequently a customer, a vendor AND staff.
│          Three tables means triple entry and a reconciliation problem you
│          will be solving forever.
└─ no ───► two tables.
           Signal you chose wrong: more than a third of columns are NULL
           for one of the types.
```

## 4. Derive mutability from whether history matters

```
If this row's old value were lost, would anyone need it back?
├─ no ──────► normal table. UPDATE freely.
└─ yes ─────► APPEND-ONLY. Corrections are new rows, never UPDATE.
```

Everything financial or operational is append-only: payments, stock movements, shifts,
audit events. This is what makes the audit trail free, lets you answer "what did this
look like last Tuesday", and stops a bug from silently destroying history.

```sql
-- wrong: the original amount is gone forever
UPDATE payments SET amount_minor = 5000 WHERE id = ...;
-- right: history intact, current value derivable
INSERT INTO payments (..., amount_minor, reverses_id) VALUES (..., -3000, '<original>');
```

## 5. Derive tenant scoping — non-negotiable in multi-tenant

`tenant_id` on every business table: `NOT NULL`, FK, and **the first column of every
composite index**.

```sql
CREATE INDEX idx_invoices_tenant_status ON invoices (tenant_id, status, created_at DESC);
```

Tenant first, always. An index starting with `status` cannot serve a tenant-scoped query
efficiently — and every one of your queries is tenant-scoped. Enable row-level security
too if the database has it; this is the failure that ends companies, so pay twice.

## 6. Derive constraints from what the app is *not* the only writer of

The app is one writer. The migration script, an admin console, a support engineer with a
SQL client, and next year's rewrite are the others.

```
Could a second writer break this rule?
└─ yes → the rule belongs in the DATABASE, not only in application code.
```

```sql
UNIQUE (tenant_id, invoice_number)
CHECK  (amount_minor >= 0)
CHECK  (due_date >= issue_date)
FOREIGN KEY (customer_id) REFERENCES parties(id) ON DELETE RESTRICT
```

Prefer `RESTRICT` over `CASCADE`. Cascade is how one wrong `DELETE` removes four tables
of history with no undo.

## 7. Derive indexes from queries you have actually run

Index every foreign key, every `WHERE` column, every `ORDER BY` on a large table, and the
tenant-first composites your real queries use.

Do **not** index everything — each index slows every write.

Find the real ones by running `EXPLAIN` on your five most frequent queries **against
production-shaped row counts**. A sequential scan over 200 seeded rows looks fine and
will not survive month eight.

## 8. Derive the migration from whether traffic is live

```
Is anything running against this schema right now?
├─ no ──► single migration. Change it.
└─ yes ─► additive → backfill → switch → remove, in SEPARATE deploys:
          1. add the new nullable column
          2. write to both, backfill old rows
          3. read from the new one
          4. drop the old column, a deploy later
```

A rename in one migration takes the app down for the length of the deploy — and makes
rollback impossible, because the old code cannot run against the new schema.

Every migration is a file, in version control, applied in order, reversible or explicitly
documented as one-way. **Never a manual `ALTER TABLE` on production.** Test against a copy
of production-shaped data, not an empty dev database.

## 9. Seeds

A seed script producing a **realistic working day**: enough rows that every list
paginates, every chart has a shape, and every empty state gets exercised. Demo data lives
in its own tenant, is committed, and resets on a schedule.

---

## Verify

```bash
ship detect --rules schema
```

**Automated:** float money columns, business tables without `tenant_id`.

**Judgement:**

- [ ] Every column ran through the four questions in §1
- [ ] Money is integer minor units with a currency column
- [ ] Moments are `TIMESTAMPTZ` UTC; human dates are `DATE`
- [ ] Every nullable column's `NULL` has a documented meaning
- [ ] Ledger tables are append-only, with no `UPDATE` path in the code
- [ ] Every composite index leads with `tenant_id`
- [ ] `EXPLAIN` run on the top five queries at realistic row counts
- [ ] Live-traffic changes are additive-then-backfill, in separate deploys

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| Reconciliation off by cents | money stored as float or double |
| Invoice dated one day early for some users | a moment stored where a human date belonged |
| Every query has `IS NULL OR = ''` | nullability without a decided meaning |
| Same person entered three times | separate tables for customer / vendor / staff |
| "What did this look like last month?" is unanswerable | mutable table where history mattered |
| Fast in dev, unusable in production | indexes chosen without `EXPLAIN` at real row counts |
| Deploy required downtime | a rename done in a single migration |
| Rollback impossible | destructive migration shipped with the code that needs it |
| One customer saw another's data | an index or query that did not lead with `tenant_id` |

## Don't

- Don't choose NoSQL because "the schema might change". Schemas change everywhere;
  migrations are how you handle it.
- Don't cache before a slow query has been measured and `EXPLAIN`ed.
- Don't shard, replicate or partition at v1.
- Don't put `deleted_at` on every table. Soft-delete only where recovery is real —
  otherwise every query carries a filter that someone will forget.
