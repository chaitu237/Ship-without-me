---
name: onboarding-first-run
description: >
  Use when designing what happens immediately after signup, or when users sign up and do not
  come back.
---

# Onboarding and first run

**The question this skill answers:** what is the one thing a user must do before this app
is worth coming back to — and what is standing between them and it?

Everything in onboarding is judged by whether it shortens that distance. Most onboarding
lengthens it, because collecting information feels like progress.

---

## 1. Name the activation moment

```
What single action makes this app worth returning to?
   sent their first invoice · logged their first job · finished one lesson
   · got one answer they needed

└─ Write it down. Every decision below is judged against it.
```

If you cannot name it in one sentence, onboarding is not your problem — the product's
value proposition is, and no amount of carousel will fix that.

## 2. Derive whether to show anything before the app

```
Will the user understand what to do the moment they see the app?
├─ yes (it resembles something they know) ──► STRAIGHT IN. No carousel.
│                                              A carousel here is a delay
│                                              between them and what they
│                                              signed up for.
└─ no (new interaction model, or the value
   is not visible on screen one) ───────────► a SHORT carousel, and then
                                              you owe them the rules below.
```

If you use one: **three slides maximum**, `Skip` visible top-right from slide one,
pagination dots so the length is knowable, and the final button is the **activation
action** — not "Done". Persist that it was seen and never show it twice.

## 3. Derive the first screen from why it would be empty

The most common first-run failure: signup succeeds and the user lands on a blank
dashboard with no data and no instruction.

```
Why is this screen empty?
├─ Because they haven't done anything yet, and the app is
│  hard to picture empty ──────────────► SEED SAMPLE DATA, badge it
│                                          "Sample", one-click clear.
│                                          They see what a populated app
│                                          looks like before they own one.
├─ Because setup has genuine steps ────► CHECKLIST. 3-4 items, progress
│                                          shown, dismissible, gone at
│                                          completion. Never more than five.
└─ Because this feature is just new
   to them ───────────────────────────► an empty state carrying the action
                                          (see `states-and-feedback`)
```

## 4. Derive what to ask at signup from when the answer is needed

```
Is this field required to deliver the FIRST unit of value?
├─ yes ──► ask now
└─ no ───► ask at the moment its purpose is obvious:
           company address → when they create the first invoice
           logo → at first document preview
           teammates → after they have used it alone once
           payment details → at the paid action
```

Every field moved out of signup and into context raises both completion **and** answer
quality, because the user can see why you are asking.

## 5. Derive the paywall position from what the user has felt

```
Has the user experienced the value yet?
├─ no, and you gate now ────────► maximum clarity, minimum goodwill.
│                                  Legitimate — but the free tier must then
│                                  be genuinely usable, or you have built
│                                  a brochure with a login.
├─ yes, then they hit a gate ───► best conversion, best-founded goodwill.
│                                  Default to this.
└─ at the specific gated feature ► contextual and clear. Also good.
```

**Never gate the activation moment itself.** A user who cannot complete the one thing
they came for will not pay to try.

## 6. Derive the voice from what the product is

```
Is this a tool people use because they must, or because they want to?
├─ must (accounting, compliance, ops) ──► plain, fast, no personality.
│                                          Get out of their way.
└─ want (learning, games, consumer) ────► a narrative can work:
                                           the product introduces itself,
                                           then asks ONE question.
                                           "So — what do I call you?"
```

Conversational onboarding in an accounting tool reads as evasive. Plain onboarding in a
game reads as lifeless. Match the reason they showed up.

## 7. Returning users

Onboarding is not only day one — but **never re-run the welcome carousel**. Nothing says
"we don't know who you are" more clearly. Show what changed if something meaningful did;
bring the checklist back for someone returning after a long gap.

---

## Verify

```bash
ship detect --rules states
```

**Automated:** list views with no empty state.

**Judgement — walk it yourself with a fresh account:**

- [ ] The activation moment is written in one sentence
- [ ] Time from signup to that moment, measured — under two minutes?
- [ ] The app is never blank on first load
- [ ] `Skip` visible on carousel slide one; carousel never reappears
- [ ] Signup asks only what the first unit of value needs
- [ ] The activation moment is not behind a paywall
- [ ] Sample data is labelled and clearable in one click

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| Signups high, day-2 return near zero | they never reached the activation moment |
| Users drop during signup | fields collected before their purpose was visible |
| "I logged in and didn't know what to do" | blank first screen, no sample data or checklist |
| Carousel skipped by everyone | it was longer than three slides, or the app was self-evident |
| Trials never convert | activation moment was behind the paywall |
| Onboarding tone feels off | narrative voice on a compliance tool, or vice versa |
| Returning users see the intro again | seen-state not persisted |

## Don't

- Don't ask for a credit card before the activation moment.
- Don't build a guided tooltip tour — they get clicked through unread. A contextual empty
  state does the same job with no interruption.
- Don't collect a logo, address and tax number at signup.
- Don't show an empty dashboard and hope.
