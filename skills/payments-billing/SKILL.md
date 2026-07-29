---
name: payments-billing
description: >
  Use before charging anyone real money, when a subscription has to renew, change, or fail, or
  when refunds, invoices, tax, or payouts are involved.
---

# Payments and billing

**The question this skill answers:** what happens to this money *after* the first
successful charge?

Taking money once is a solved problem — the provider's SDK does it in an afternoon.
Everything expensive happens afterwards: renewals, failures, plan changes mid-cycle,
refunds, disputes, tax, and payouts. That is where the bugs cost real money and real
trust, and it is the part almost nobody builds.

**Money code is the one place in the app where "we'll handle that later" is not
acceptable.** Later means a customer charged twice, or a customer who cannot cancel.

---

## 1. Derive the billing model from what is being sold

```
What is the customer buying?
├─ A THING, once ────────────► one-time charge. No billing system. Stop here.
├─ ACCESS, over time ────────► subscription. You now own a renewal state machine.
├─ CONSUMPTION ──────────────► metered. You now own metering accuracy, and
│                               metering disputes. Hardest model — avoid unless required.
├─ SOMEONE ELSE'S THING ─────► marketplace. You are moving money between third
│                               parties. Regulatory surface, not just technical.
└─ ACCESS + OVERAGE ─────────► both machines. Only if the data says you need it.
```

Choose the simplest that fits. **A one-time charge needs no billing system at all** — do
not build subscriptions because SaaS is the default assumption.

If it's a marketplace, stop and get advice: holding and forwarding other people's money
is regulated in most jurisdictions, and "we just pass it through" is not the exemption
people assume it is.

## 2. Derive the state machine — this is the actual work

A subscription is not a boolean. Enumerate every state and what the user can do in each.

```
trialing ──► active ──► past_due ──► cancelled
    │          │  ▲         │            │
    │          │  └─────────┘            │
    │          ▼    (payment recovered)  ▼
    └──────► paused ──────────────────► expired
```

For **every** state, answer three questions:

1. **What can the user do?** Full access, read-only, or locked out?
2. **What do they see?** Silent degradation is how you get chargebacks.
3. **What happens automatically, and when?**

The two states that get skipped, and cost the most:

- **`past_due`** — the card failed and the user does not know. If you cut access
  immediately you lose a customer who would have paid; if you never cut it you fund them
  forever. Retry on a schedule, tell them each time, degrade after a stated grace period.
- **`paused`** — people want to stop temporarily. Without it, "cancel" is the only exit
  and they never come back.

## 3. Derive failure handling from why the payment failed

Failed payments are **normal traffic**, not an edge case. Cards expire constantly.

```
Why did it fail?
├─ Insufficient funds ─► retry on a schedule (day 1, 3, 5, 7). Often succeeds.
├─ Card expired ───────► do NOT retry. Email asking them to update. Retrying is noise.
├─ Card declined ──────► retry once, then ask. Could be a bank block.
└─ Fraud flag ─────────► never retry. Contact them. Repeated attempts make it worse.
```

Every attempt gets an email with a **direct link to update the card that does not require
remembering a password**. A recovery flow gated behind a forgotten password recovers nobody.

## 4. Derive changes mid-cycle

The question everyone defers: someone upgrades on day 12 of 30. What do you charge?

```
Upgrade   → charge the difference now, prorated. Access changes immediately.
Downgrade → apply at period end. Do not refund the difference by default,
            and say so at the point of the change.
Cancel    → access until period end, not instantly. They paid for it.
            An instant cutoff on cancel is theft and it produces chargebacks.
```

Write your proration rule down and put it on the change screen **before** they confirm.
Proration surprises are one of the top sources of billing support tickets, and the
support cost exceeds the revenue difference every time.

## 5. Invoices are legal documents

Not receipts. Not emails. Documents you may have to produce years later.

- **Sequential, gap-free numbering per financial year.** A gap in an invoice sequence is
  an audit finding. Generate the number at issue time, from a counter that cannot skip.
- **Immutable once issued.** A correction is a **credit note**, never an edit. Editing an
  issued invoice destroys the audit trail.
- Store what was true at issue time — customer name, address, tax rate, line descriptions
  — **denormalised**. If the customer renames their company next year, last year's invoice
  must not change.
- Money as **integer minor units**, currency alongside. Never a float.

## 6. Derive tax from where both parties are

```
Both in one jurisdiction ─────► one rate. Simple.
Selling across borders ───────► the rate depends on the buyer's location, and
                                 for digital goods, often on proving it.
Business buyer abroad ────────► frequently reverse-charge. Their tax, not yours.
```

**Do not hand-code tax rates.** They change, and the change is retroactive to a date.
Use the provider's tax product or a tax service. Store the rate applied *on the invoice*,
because the invoice must remain true even after the rate changes.

## 7. If money leaves to a third party

Marketplaces and platforms only.

- **Payout schedule stated up front** — "every Tuesday, 7-day hold". Ambiguity here
  produces more support load than any other feature.
- **A held balance is not your money.** Track it separately from revenue. Reconcile.
- Every movement is a row in an **append-only ledger** with a reference to what caused
  it. Corrections are new rows. You will need this for a dispute, and you will need it
  to be complete.
- Failed payouts need a state and a notification, exactly like failed charges.

## 8. Non-negotiables

These are not style preferences. Each one has a specific, expensive failure behind it.

| Rule | What it prevents |
|---|---|
| **Idempotency key on every charge** | the retry that charges twice |
| **Webhooks are the source of truth, not the redirect** | the customer who closed the tab and was never provisioned |
| **Verify webhook signatures** | anyone granting themselves a subscription |
| **Webhook handlers idempotent** | providers deliver the same event more than once, by design |
| **Never store card numbers** | PCI scope you cannot afford. Tokens only |
| **Log every state transition, immutably** | the dispute you cannot answer |
| **Test the failure paths, not just success** | discovering dunning is broken via a churned customer |
| **Cancellation self-serve in the UI** | chargebacks, and in some jurisdictions, illegality |

**The webhook one catches nearly everyone.** The redirect after checkout is a UI
convenience — the user may close the tab, lose signal, or never return. The webhook is
what actually happened.

---

## Verify

```bash
ship detect --rules api,schema
```

**Automated:** money columns typed FLOAT/DOUBLE, charge endpoints with no idempotency
key, tokens in query strings.

**Judgement — walk each one:**

- [ ] Every subscription state enumerated, with access and messaging defined per state
- [ ] `past_due` degrades on a stated schedule, and the user is told each time
- [ ] Card-update link works without logging in
- [ ] Proration rule written and shown before the user confirms a change
- [ ] Cancel keeps access to period end
- [ ] Invoice numbers sequential and gap-free; corrections are credit notes
- [ ] Webhook signatures verified, handlers idempotent
- [ ] A failed payment tested end to end, not just a successful one
- [ ] Cancellation is self-serve

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| Customer charged twice | no idempotency key on the charge |
| Paid but not provisioned | provisioning on redirect instead of webhook |
| Silent revenue leak | `past_due` never degrades — you are funding non-payers |
| Angry cancellations | access cut instantly instead of at period end |
| Chargebacks | no self-serve cancel, or a surprise proration charge |
| Auditor finds a gap | invoice numbers generated non-atomically |
| Last year's invoice changed | customer data referenced live instead of denormalised |
| Cannot answer a dispute | state transitions not logged immutably |

## Don't

- Don't build subscriptions for a one-time purchase.
- Don't build metered billing unless usage genuinely varies — the disputes are brutal.
- Don't store card numbers. Ever.
- Don't hand-code tax rates.
- Don't hide the cancel button. It is a chargeback generator and sometimes unlawful.
