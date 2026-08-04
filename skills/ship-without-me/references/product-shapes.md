# Product shapes — framing reference

Consulted, not walked. The shape frames what *value*, *first use* and *a complete slice*
mean for this product. **It does not choose the architecture** — `product-profile` does
that, from properties. Eight labels cannot carry an architecture: a music player and a
habit tracker are both PERSONAL PRODUCT and share almost no technical requirement.

Do not assume the thing being built is a business tool. The shape determines what "value",
"first use", and "a complete slice" even mean, and getting it wrong makes every later
decision subtly wrong.

```
Who benefits, and from what?
├─ Someone doing paid work, repeatedly ──────► WORK TOOL
│    value = time or error saved · first use = one real task completed
│    competitor = their spreadsheet, notebook, or group chat
├─ Someone acting for themselves ────────────► PERSONAL PRODUCT
│    value = a habit formed or a moment served · first use = one satisfying loop
│    competitor = doing nothing, or an app they already have
├─ Two sides who need each other ────────────► TWO-SIDED
│    value = a successful match · first use = one side finds the other
│    competitor = however they find each other today, usually informally
├─ Someone with a question and data ─────────► ANALYTICAL PRODUCT
│    value = a decision made with confidence · first use = one answered question
│    competitor = a spreadsheet and an opinion
├─ Someone building something ────────────────► DEVELOPER TOOL
│    value = friction removed from a workflow · first use = one task done faster
│    competitor = a shell script they already wrote
├─ A process crossing several roles ─────────► INTERNAL SYSTEM
│    value = a handoff that stops failing · first use = one case end to end
│    competitor = email, and someone remembering
├─ Something that should run unattended ─────► AUTOMATION / AGENT
│    value = attention returned · first use = one correct run, observed
│    competitor = a person doing it manually, reliably
└─ Someone seeking to feel or learn something ► CONTENT / EXPERIENCE
     value = attention willingly given · first use = one session that lands
     competitor = everything else competing for that attention
```

If two shapes apply **and only one is being built right now**, the product is two products
— pick the one that carries the first value event and log the other as Not now. That is a
phasing call. It is the wrong call if both are being built *in this run*: a library shipped
with its own CLI and docs site is not phased, it is composed, and flattening it to one shape
is how the CLI silently inherits a database schema meant for the docs site. See 0b-ii.

**The shape frames the product. It does not choose the architecture.** A music player and
a habit tracker are both PERSONAL PRODUCT and share almost no technical requirement. Eight
labels cannot carry that, and a label is exactly the kind of category this skill is not
allowed to branch on. Derive the properties.
