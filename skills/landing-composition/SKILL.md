---
name: landing-composition
description: >
  Use when building or fixing a public landing page, when visitors arrive and do not sign up, or
  when the page reads as generic.
---

# Landing composition

**The question this skill answers:** what claim does this page make, and what is the
strongest available evidence that it is true?

A landing page makes one claim and then proves it. Everything below derives from that.

Do not start from a template. Start from the two questions in §1 — they determine the
hero, the CTA, and the proof, and they keep determining them for products nobody has
built yet.

---

## 1. Derive the page from two questions

### Q1 — Where does this product's value actually live?

The hero visual is **not decoration. It is the evidence for the headline's claim.**
So ask what a skeptic would need to see, in three seconds, to believe you.

Follow the value:

```
Is the value visible on ONE screen?
├─ yes ─────────────────────────────────► show that screen, with real data
└─ no → where does it live instead?
   ├─ in the FLOW between several actors ► show the flow (numbered steps)
   ├─ in LIVE DATA the product watches ──► show the data, with units and a live marker
   ├─ in the INTERACTION itself ─────────► show the interaction, or let them try it
   ├─ in COVERAGE / INVENTORY ───────────► show the count, and cite where it came from
   ├─ in the SCALE OF THE PROBLEM ───────► show the world's numbers, not yours
   └─ nowhere yet, it isn't built ───────► say so. Use a placeholder and move on.
```

**The last branch is the important one.** If you cannot show the value, you have one of
two problems, and neither is solved by a nicer illustration: either the claim is too
abstract to be evidenced (fix the claim), or the product does not do it yet (fix the
product). An AI-generated image in the hero is an admission, not a solution — treat it as
a placeholder with a deadline.

If none of the branches fit, you have not answered Q1. Go back and answer it; the visual
falls out of the answer every time.

### Q2 — What is the first physical step of the job?

The primary CTA is **that step, phrased the way the user would say it.** Not a generic
"Get started".

```
The job begins by…
├─ finding something ──────► the CTA is a SEARCH INPUT, not a button
├─ saying something ───────► the CTA is a MIC, with tappable examples
├─ uploading something ────► the CTA is a DROP ZONE
├─ picking from options ───► the CTA is the CHOICE ITSELF
└─ nothing until signup ───► the CTA is a button. Use a known verb.
```

**A search box, a mic, or a drop zone in the hero outperforms a button** because it
removes a step: the visitor is already doing the job instead of agreeing to start it.
Most landing pages default to a button because the template had one.

If the CTA is an input, three things must travel with it or it will not get used:

1. **A privacy or cost line at the input** — "audio is only used to build your list",
   "no signup", "free". Right there, not in the footer.
2. **Sample inputs.** A visitor facing an empty field freezes because they do not know
   what shape of input you want. Tappable examples remove that freeze and are the single
   highest-leverage detail on an interactive hero.
3. **A real result.** If the demo returns a canned response, do not build it.

---

## 2. What those answers usually look like

Reference only. If your Q1/Q2 answers point somewhere not on this list, trust the
derivation, not the list.

| Q1 answer | Hero right side | Common in |
|---|---|---|
| One screen | the running app, real data | SaaS, tools |
| A flow between actors | numbered 1–N stepper | marketplaces, supply chains |
| Live data | metric card, units, `● LIVE` | infra, monitoring, ops |
| The interaction | conversation transcript or live input | voice, chat, AI |
| Coverage | stats grid + cited sources | directories, aggregators |
| Problem scale | world metrics, not product metrics | climate, health, civic |
| A physical outcome | photo with an overlapping proof card | services, trades |

## 3. The claim itself

Two short declaratives. Hard stops. Accent on the second clause. Under 12 words.

```
Track every job. Bill every hour.
Know your numbers. Before month-end.
```

The test: **could a competitor put their name on this sentence?** If yes, it says
nothing. "The AI-powered platform that empowers businesses to streamline operations"
passes for any of ten thousand products, which is why it persuades nobody.

Name the user or the outcome. Specificity is the whole mechanism.

## 4. Proof, ordered by strength

Use the strongest kind you can honestly supply. Do not skip to a weaker one because it
is easier to write.

```
strongest  ┌ the visitor experiences it themselves (interactive demo)
           │ a number that could be checked (₹0 commission · 2,341 bookings today)
           │ named sources (28 state portals · MCA · GeM)
           │ named customers, with permission
           │ a specific capability claim (KYC-verified · 60-second booking)
weakest    └ an adjective ("powerful", "seamless", "trusted")
```

**Never manufacture proof.** Invented testimonials, unearned certification badges, and
fabricated user counts are checkable, and being caught costs more than the section was
worth. If you have none of the top five, ship without a proof section and go get some.

## 5. Friction removers

One line each, near the action they unblock:

```
No credit card · Cancel anytime · Free forever · 2-minute setup · Works offline
```

Pick the one that removes **your** product's specific hesitation. For a paid tool that is
usually cost; for a data tool, privacy; for a field tool, connectivity. Generic reassurance
removes nothing.

## 6. Section count

Enough sections to answer the questions a buyer will ask before they ask them — typically
8–14 on a landing page. A four-section page reads as unfinished because it leaves the
obvious questions unanswered.

But **drop any section you cannot fill honestly.** An empty testimonial block is worse
than no testimonial block. The count is a symptom of completeness, not a target to hit.

## 7. Legal

`/privacy` and `/terms`, in this pass, linked in the footer and at signup. Payment
providers and app stores both block on them.

**→ Full consent surface: `legal-and-consent`.**

---

## Verify

```bash
ship detect --rules launch,legal
```

**Automated:** legal routes reachable, `<h1>` present pre-JS, static body text above the
shell threshold, share-card tags.

**The checks that matter are judgement, so make them explicitly:**

- [ ] Q1 answered in one sentence, and the hero visual *is* that answer
- [ ] Q2 answered — the primary CTA is the first step of the job, not "Get started"
- [ ] If the CTA is an input: privacy line, sample inputs, and a real result all present
- [ ] The headline fails the competitor-name test — it could not be theirs
- [ ] Every proof element is from the top five tiers and is true
- [ ] The friction remover addresses *this* product's hesitation
- [ ] No section exists that you could not fill honestly

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| Hero feels like stock decoration | Q1 unanswered — you picked a visual, not evidence |
| Traffic arrives, nobody clicks | Q2 unanswered — the CTA asks for commitment before value |
| It reads like every other AI product | the headline passes the competitor-name test |
| The page looks thin | sections were dropped for being hard, not for being untrue |
| The demo gets ignored | no sample inputs — visitors froze at the empty field |

## Don't

- Don't write the positioning. If the product has no pitch, ask for one.
- Don't A/B test before the derivation is right. You'll be optimising the wrong page.
- Don't invent proof.
- Don't use a carousel for primary content.
