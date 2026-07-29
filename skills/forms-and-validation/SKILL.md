---
name: forms-and-validation
description: >
  Use when building or fixing any form, when users abandon one partway through, when input is
  lost on an error, or when duplicate records appear.
---

# Forms and validation

**The question this skill answers:** what does it cost the user if this form loses their
input — and does the design reflect that cost?

A form is the moment a user hands you something. Every rule below exists because some
form somewhere dropped it.

---

## 1. Derive the input from what is being entered

Not from what looks tidy. From what the value *is* — because the value determines the
keyboard, the autofill, and the validation.

```
What is this value?
├─ An email ──────────► type="email"  autocomplete="email"  inputmode="email"
├─ A phone number ────► type="tel"    autocomplete="tel"    inputmode="numeric"
├─ A password ────────► autocomplete="new-password" on signup,
│                       "current-password" on login — they behave differently
│                       in every password manager
├─ A one-time code ───► autocomplete="one-time-code"  inputmode="numeric"
│                       lets phones auto-fill from SMS
├─ Money ─────────────► inputmode="decimal", right-aligned, currency shown
├─ A date ────────────► type="date" unless you need a range
└─ Free text ─────────► type="text", and ask whether you need it at all
```

Each is one attribute. Together they decide whether a phone shows a number pad or a full
keyboard, and whether a password manager helps or fights the user.

**Labels, not placeholders.** A placeholder vanishes on focus, so the user can no longer
see what the field was — and it is invisible to screen readers. Use the placeholder for a
format hint only: `+91 98765 43210`, `DD/MM/YYYY`.

## 2. Derive validation timing from what the user is doing

```
Is the user still composing this value?
├─ yes (mid-typing) ──► say NOTHING. Telling someone their email is invalid
│                        before they finish typing it is the most common and
│                        most irritating validation bug there is.
│                        Exceptions: character counter, password strength,
│                        debounced availability check.
├─ finished (on blur) ► validate THAT field. Format only.
└─ submitting ────────► validate everything, client and server.
```

Server-side validation is not optional and is not a duplicate — the client check is a
courtesy, only the server one is a control. Share one schema between them so they cannot
drift.

## 3. Derive error placement from where the user is looking

They are looking at the field they just left. Put the error there.

```
✗ "Invalid input"                    — what is invalid, and what should I do?
✗ a toast at the top of the page     — they are looking at the field
✓ "Enter a date after the issue date (14 Mar 2026)."
✓ "Passwords must be at least 12 characters. Yours is 8."
```

On submit failure: **focus the first invalid field and scroll it into view.** A user
should never hunt for what went wrong. Announce the count in an `aria-live` region.

Colour is never the only signal — pair red with an icon and text.

## 4. Derive persistence from what the input cost to produce

```
How long did this take the user to produce?
├─ seconds (login, search) ──────► no persistence needed
├─ a minute or two ──────────────► preserve on validation failure. Never clear the form.
└─ longer, or > ~8 fields ───────► AUTOSAVE to local storage every few seconds,
                                    restore on return, offer "discard draft"
                                    AND guard navigation away when dirty
```

A session timeout, a stray back-swipe, or a mistyped field should not destroy twenty
minutes of typing. This is the single most commonly skipped protection in the whole
package, and the most damaging when it bites.

## 5. Derive submission safety from what a second click would do

```
If the user clicks submit twice, what happens?
├─ nothing bad ─────────► still disable it, still show "Saving…"
└─ a duplicate record ──► disable + in-flight state + a client-generated
                           idempotency key. Double-tap on a slow connection
                           is the top cause of duplicate records.
```

Re-enable on failure so they can retry. **Show the result** — a form that silently
succeeds leaves people clicking submit again.

## 6. Derive limits from where they actually come from

If a field has a maximum, show a counter **from the first keystroke**, not on hitting the
limit. Amber near, red past.

```
Description                                    142 / 500
```

**Never silently truncate on submit** — that is data loss the user discovers later. And
the counter's limit must match the database column's limit; they drift, so check.

**Passwords:** minimum 12, no maximum below 64, **allow paste**. No composition rules —
"must contain a symbol" produces `Password1!`. Length plus a breached-password check beats
complexity every time. Blocking paste breaks password managers, which are the thing
actually improving security.

## 7. Derive upload handling from what fails

```
What can go wrong with this file?
├─ Too big ─────► state the limit BEFORE the picker opens, and name the file
│                  in the error: "invoice.pdf is 14 MB — the limit is 10 MB"
├─ Wrong type ──► state accepted types up front; validate server-side too
├─ Slow ────────► real progress bar with cancel. No progress feels frozen
└─ Wrong file ──► thumbnail preview and a remove control per file
```

Support drag-and-drop **and** a click target — drag-only excludes mobile and keyboard
users. Compress images client-side when they are photos. Strip EXIF — it carries GPS.

## 8. Derive multi-step from whether the user can finish in one sitting

```
Can they complete it in one sitting with what they have to hand?
├─ yes ──► one page. A wizard is friction you added.
└─ no ───► steps, and then you owe them:
           · "Step 2 of 4" with names where they fit
           · per-step validation, not everything at the end
           · back navigation that does not lose forward data
           · persistence between steps — a refresh must not be fatal
           · easy steps first; payment details last
           · a review screen before the irreversible action
```

## 9. Field formats that are wrong by default

- **Phone** — E.164 stored, local displayed, validated against real prefix ranges.
- **Email** — one permissive regex plus an actual send. Over-strict validation rejects
  valid addresses; delivery is the only real test.
- **Address** — **country first**, because it determines every field below it. Do not
  require states or postal codes for countries that have neither.
- **Dates** — never three dropdowns. State the format in the hint.

---

## Verify

```bash
ship detect --rules forms
```

**Automated:** inputs without labels, password fields without `autocomplete`, email typed
as text, validation on keystroke, submit with no disabled state, forms with no schema,
uncontained auth forms, pre-filled demo credentials.

**Judgement:**

- [ ] Every input's type and `autocomplete` derived from what the value *is*
- [ ] Nothing validates mid-typing except counters and strength meters
- [ ] Errors sit on the field and say what to do
- [ ] Input preserved on failure; autosave past ~8 fields or two minutes
- [ ] Submit disabled in flight; idempotency where a duplicate would matter
- [ ] Limits shown as counters from the first keystroke, and match the DB
- [ ] Upload limits stated before the picker opens

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| High abandonment mid-form | validating while typing, or asking too much too early |
| "It lost everything I typed" | form cleared on validation failure, or no autosave |
| Duplicate records | submit not disabled in flight |
| Mobile users abandon at the phone field | wrong `type`/`inputmode` — full keyboard for digits |
| Password managers don't fill | missing `autocomplete`, or paste blocked |
| Text silently cut off | `maxlength` with no counter, truncating on submit |
| Users retry uploads endlessly | no progress indicator |
| Support asked "what did you type?" | errors as toasts, gone before they were read |

## Don't

- Don't build a custom date picker before trying the native one.
- Don't put a form over six fields in a modal — use a page.
- Don't ask users to confirm their email address. Send a verification link.
- Don't reset scroll position on a validation error.
