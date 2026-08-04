---
name: regional-commerce-stack
description: >
  Use when building for one named country rather than a generic global market — local tax
  identifiers, national payment rails, messaging apps, non-Latin scripts, or phone-based
  identity.
license: MIT
metadata:
  routing: conditional
  applies-when: "market=regional"
---

# Regional commerce stack

**The question this skill answers:** what in this market is non-negotiable — because the
law says so, or because the user has no alternative?

Those two categories are the whole skill. Everything else is a preference you can defer.
India ships as the reference pack; the structure ports to any market by swapping the pack.

---

## 1. Derive identity from what the user actually has

```
What can this customer reliably produce?
├─ An email they check ──────────► email works. Most of the global north.
├─ A phone, no reliable email ───► PHONE + OTP. Most emerging markets.
│                                   Email is not the identity people have.
└─ A shared phone, or low
   literacy in Latin script ─────► phone + numeric PIN. See `tenant-auth-demo`.
```

Store E.164, display local format, and validate against the country's **real mobile prefix
range** — not a bare digit count. India: 10 digits starting 6–9.

## 2. Derive number formatting from the locale, not from habit

```
Does this locale group digits in thousands past four digits?
├─ yes (en-US, en-GB, most of Europe) ──► 1,234,567
└─ no  (en-IN and others) ──────────────► 12,34,567
```

Use `Intl.NumberFormat` with the correct locale. **Never hand-roll comma placement** — it
is the detail that most immediately signals a foreign product built by someone who did not
check.

Store minor units as integers. A float is a rounding bug waiting for your first
reconciliation.

## 3. Derive validation strictness from what the ID is used for

```
Does this identifier go on a legal document?
├─ no ───► shape check is fine.
└─ yes ──► CHECKSUM. A regex accepts the large majority of real typos,
           and they flow straight onto invoices where an accountant
           finds them months later.
```

**India — GSTIN**, 15 characters:

```
 27  AAPFU0939F  1  Z  V
 │   │           │  │  └─ mod-36 checksum
 │   │           │  └──── literal Z
 │   │           └─────── entity number
 │   └─────────────────── 10-char PAN
 └─────────────────────── 2-digit state code
```

Derive and display the state from the first two digits as confirmation feedback — it
catches transpositions the checksum alone would pass.

## 4. Derive the invoice from where both parties are

The field that breaks most often, in every market with a split tax regime:

```
Is the place of supply in the same region as the supplier?
├─ yes ──► split local tax   (India: CGST + SGST)
└─ no ───► unified interstate tax (India: IGST)
```

Getting this backwards is the most common correctness bug in the category, and it is
invisible until an accountant finds it. Plus: sequential gap-free numbering per financial
year (April–March in India), per-line classification codes, and both parties' IDs.

## 5. Derive the payment rail from what it must do beyond collecting

```
What do you need beyond "money arrives"?
├─ nothing — just collect ─────────► the NATIONAL RAIL. No merchant
│                                     onboarding, no fees, works today.
│                                     India: upi://pay?pa=&pn=&am=&tn=&cu=INR
│                                     plus its QR code.
└─ reconciliation, refunds,
   subscriptions, disputes ────────► a full gateway. Onboarding, fees, KYC.
```

Do not onboard a merchant account to collect a single payment. Most small-business use is
entirely served by the deep link and a QR.

## 6. Derive the messaging tier from who initiates

```
Who starts the conversation?
├─ The USER taps to contact you ──► DEEP LINK. Zero cost, zero approval,
│                                    works today. This is what actually ships,
│                                    and it converts better than a booking form.
│                                    https://wa.me/91XXXXXXXXXX?text=<encoded>
└─ YOU send them something they
   did not ask for ──────────────► Business Cloud API. Costs money, needs
                                    platform review and pre-approved templates.
```

**Do not build tier two when tier one satisfies the requirement.**

## 7. Derive language support from whether you will finish it

```
Can you translate and MAINTAIN every string in this language?
├─ yes ──► ship it, with a real i18n library and message catalogs
└─ no ───► do not claim it. A toggle that swaps two strings is worse
           than English only, because it promises something absent.
```

Check font coverage — many system fonts fail on complex conjuncts. Test with real words.
**Numerals stay Latin in financial contexts**, matching the operator's existing paperwork.
**Never machine-translate statutory field labels** — tax terms have official translations,
and an invented one makes the document look fake.

## 8. Derive KYC storage from whether the law requires holding it

```
Is there a statutory requirement to RETAIN this identity number?
├─ yes ──► store it, encrypted, masked in every display
└─ no ───► verify it and DISCARD it. Keep a boolean and a timestamp.
```

Holding a national ID you do not need is pure liability.

---

## Verify

The generic detector cannot validate a checksum it does not know. One assert-based file,
no framework:

```bash
node lib/<market>/validate.test.mjs
```

- [ ] 8 valid and 8 invalid business IDs, **by checksum, not regex**
- [ ] Currency grouping at 5, 6, 7 and 8 digits against the locale's real convention
- [ ] The intra- vs inter-region tax split at a boundary case
- [ ] Phone normalization across the country's full prefix range
- [ ] Every language claimed in the UI has a real message catalog behind it

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| Users cannot sign up at all | email identity in a phone-first market |
| Reads as a foreign product | wrong digit grouping for the locale |
| Invalid tax IDs reach invoices | shape validated, checksum not |
| Accountant finds it months later | intra- vs inter-region tax split inverted |
| Merchant onboarding stalls the launch | a gateway used where a deep link would do |
| Messaging never got approved | built tier two before checking tier one was enough |
| Regional UI looks broken | font without coverage for the script |
| Compliance liability with no benefit | national ID stored without a requirement to |

## Don't

- **Don't file anything.** Produce compliant documents; submitting returns to a government
  portal is the business's decision, with the business's credentials.
- Don't give tax or legal advice. Implement the format; do not advise on liability.
- Don't store national ID numbers by default — and say so if asked to.
- Don't claim a language you have not finished.
