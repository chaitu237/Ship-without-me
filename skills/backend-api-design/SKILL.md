---
name: backend-api-design
description: >
  Use when creating server routes, when a second client is about to consume an endpoint, or when
  the frontend and backend disagree about a contract.
---

# Backend API design

**The question this skill answers:** who is the *second* consumer of this endpoint, and
what will they assume?

The first consumer is the screen you are building right now, and designing for it alone
is why APIs rot. The second consumer — a mobile build, a partner, a script, next year's
rewrite — cannot ask you what you meant. The contract has to say it.

---

## 1. Derive the shape from what the thing *is*

```
Is this a THING the client can hold?
├─ yes ──► a resource. Plural noun, standard verbs, depth ≤ 3.
│          GET/POST /api/v1/invoices · GET/PATCH/DELETE /api/v1/invoices/:id
│
└─ no, it's an ACTION that happens to a thing
   ├─ Does it change the thing's state? ──► sub-resource, POST
   │     POST /api/v1/invoices/:id/send · /shifts/:id/close
   │     Honest and readable. Do not contort it into PATCH {action:"send"}.
   └─ Is it a query too complex for params? ─► POST /api/v1/<thing>/search
         Rare. Exhaust query params first.
```

Nesting stops at one level. `/customers/:cid/invoices` is fine;
`/customers/:cid/invoices/:iid/lines/:lid/tax` is a URL nobody can maintain — the deeper
resource has its own id, so address it directly.

Verbs in paths (`/getInvoices`, `/createNewInvoice`) are RPC wearing REST's clothes. Pick
one style deliberately; do not drift between them.

## 2. Derive versioning from what you cannot take back

```
Will anything you do not control ever call this?
├─ no (one frontend, deployed together) ──► version anyway. It costs one path segment.
└─ yes ──────────────────────────────────► /api/v1/ in the PATH, from day one.
```

Path, not header — it appears in logs, dev tools, and the support ticket someone pastes
you. Adding `v1` on day one is free. Adding it on day 400, with three pinned mobile
builds, is a migration.

**Never break v1.** Additive only: new optional fields, new endpoints. A breaking change
means `v2` living beside `v1` until the old callers are gone.

## 3. Derive the envelope from what the client must branch on

One shape, everywhere. Mixed envelopes mean the frontend writes a different unwrapper per
endpoint, and one of them will be wrong.

```json
{ "data": {...}, "meta": {...} }
{ "data": [...], "meta": { "page": 1, "per_page": 50, "total": 412 } }
{ "error": { "code": "validation_failed", "message": "...", "fields": {...} } }
```

**Errors need a machine-readable `code`.** The client branches on `code`; the human reads
`message`. Without one, the frontend ends up doing `if (msg.includes("not found"))`,
which breaks the day someone fixes a typo in the message.

Use real status codes — `400` malformed · `401` unauthenticated · `403` authenticated but
not allowed · `404` absent · `409` conflict · `422` semantically invalid · `429` throttled.
**Never `200` with `{"success": false}`**: it defeats every HTTP-aware layer between you
and the client, including caches, retries and monitoring.

## 4. Derive pagination from whether the collection can grow

```
Can this collection grow without bound?
└─ yes → paginate from the FIRST commit.
         The 40-row table in dev is 400,000 rows in month eight, and by then
         the endpoint has six callers who assume it returns everything.
```

Default 25–50. **Hard-cap it server side** — `per_page=100000` is a denial of service
someone finds by accident. Return `total` so the UI can show a count. Use cursor
pagination for infinite scroll or exports; offset pagination skips rows when data shifts
mid-scroll.

## 5. Derive authorization from what an attacker would try

Authentication proves *who*. It does not prove *may*. Check ownership on every single
resource fetch, server side.

```
GET /api/v1/invoices/:id  where the invoice belongs to another tenant
└─ return 404, NOT 403.  403 confirms the record exists.
```

**The tenant comes from the session, never from the request.** A `tenant_id` in a query
param or body is a full data breach with a friendly interface:

```js
✗ GET /api/v1/invoices?tenant_id=<anything the client likes>
✓ const tenantId = session.tenantId
```

Enforce it in a repository layer or middleware so a handler *cannot* forget. Tokens go in
the `Authorization` header — never a query string, which lands in access logs, browser
history and referrer headers.

## 6. Derive idempotency from what a retry would cost

```
If this request ran twice, what breaks?
├─ nothing (GET, PUT of a full object) ─► no key needed
├─ a duplicate row ─────────────────────► client-generated id in the body
└─ money moves, or something is SENT ───► Idempotency-Key header, mandatory
```

Networks retry. Users double-tap. Both *will* happen on the payment endpoint. Store the
key with its result; a repeat key returns the **original** response instead of charging
again.

## 7. Derive the response mode from duration

```
How long does this take?
├─ < 2s ────► respond directly
└─ > 2s ────► 202 + a job id. Poll or webhook.
              POST /api/v1/reports → { job_id, status: "queued" }
              GET  /api/v1/jobs/:id → { status, result_url }
```

Holding an HTTP connection open for 90 seconds fails at the proxy, then the CDN, then the
mobile network — in that order, and only in production.

## 8. Details that each prevent a specific failure

| Rule | What it prevents |
|---|---|
| Whitelist filter and sort params | an injection, and an accidental full-table scan |
| `/health` that really queries the DB | an outage your monitor reports as healthy |
| Rate-limit auth endpoints hardest | credential stuffing |
| Structured logs with a request id | a bug report you cannot trace |
| CORS: explicit origin allowlist | `*` plus credentials is a vulnerability, not a convenience |
| Validate uploads server-side, rename files | a client-supplied filename traversing your filesystem |
| Redact secrets at the logger, not the call site | the one call site that forgot |

---

## Verify

```bash
ship detect --rules api
```

**Automated:** unversioned routes, unpaginated collections, `tenant_id` read from the
request, tokens in query strings, CORS wildcard with credentials.

**Judgement:**

- [ ] Every endpoint is a resource or an honest sub-resource action
- [ ] One envelope shape, with machine-readable error codes
- [ ] Every growable collection paginated, with a server-side cap
- [ ] Ownership checked per resource; cross-tenant returns 404, not 403
- [ ] Idempotency keys wherever money moves or something is sent
- [ ] Anything over ~2s returns a job, not a held connection

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| Frontend has a different unwrapper per endpoint | no single envelope |
| Client branches on error message text | errors carry no `code` |
| Retries corrupt data | no idempotency on a side-effecting endpoint |
| A customer sees another's record | tenant taken from the request, or scoping in handlers |
| Slow endpoints time out only in production | long work held on the connection |
| Cannot ship a change without breaking mobile | no versioning, or v1 broken |
| Monitor green during an outage | `/health` that never touches the database |
| List endpoint melts in month eight | pagination deferred |

## Don't

- Don't build GraphQL for a single client. REST with good filters is less to maintain.
- Don't add a queue before you have work that needs one.
- Don't design for microservices at v1. One service, clean modules, split later if ever.
- Don't invent your own token format.
