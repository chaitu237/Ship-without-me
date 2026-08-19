# Gap: authenticated shared workspace and server persistence

This is **not required for the first-value event of the single-workstation MVP**, but it is required before production use by several employees/devices.

## Generating question

How can maintenance billing, supervisors, managers and accounts share one authoritative ledger without one role seeing or changing data it should not?

## Required state model

- Workspace/tenant owns buses, vendors, bills and events.
- Authenticated users belong to the workspace with role-specific permissions.
- Bill source records remain immutable after creation.
- Lifecycle events remain append-only and include authenticated actor identity.
- Every business record is tenant-scoped; money remains integer minor units.

## Failure modes

- Cross-tenant data exposure.
- Concurrent duplicate invoice creation.
- Offline retry creates a second bill/event.
- A privileged workflow action is accepted from a role that should not perform it.
- Server outage causes silent local/server divergence.

## Recovery

- Database uniqueness on workspace + vendor + invoice number.
- Idempotency keys on bill/event creation.
- Role checks on the server, not only hidden buttons.
- Backups plus tested restore path.
- Explicit offline/read-only state when server truth cannot be reached.

## Proof required before production

Two separate authenticated clients must create/read the same workspace data while a third unauthorized client cannot. Duplicate submissions must result in one bill. Reload on a second device must show the complete event history.
