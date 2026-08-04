---
name: field-ops-mobile
description: >
  Use when the people using this work away from a desk — on a road, a farm, a site, or a shop
  floor — or when connectivity, sunlight, gloves, or shared devices are part of the situation.
license: MIT
metadata:
  routing: conditional
  applies-when: "context=away from desk"
---

# Field ops mobile

**The question this skill answers:** what can this user actually do — given the device in
their hand, the state of their hands, the light, and the signal?

Every answer narrows what you are allowed to build. Your competitor is not another app.
It is a paper register and a group chat, and both work with no signal, in the rain,
one-handed.

---

## 1. Derive the capture method from what the data already is

Typing is the last resort, not the default. Ask what form the information is in *before*
the user touches the phone.

```
Where does this data exist right now?
├─ Printed on something ──────► CAMERA + OCR. A receipt, a meter, a label,
│                                a plate. Photographing a printed slip beats
│                                typing six digits, every single time.
├─ In the user's head, as
│  a description ─────────────► VOICE. Symptoms, job notes, findings.
├─ The identity of a thing ───► SCAN. Barcode, QR, RFID.
├─ A choice among few ────────► BIG BUTTONS. Not a dropdown.
└─ Genuinely novel text ──────► typing, and only then.
```

Route OCR and voice output through **`grounded-ai-feature`** — a voice note that becomes
an unvalidated blob helps nobody. **Always confirm before commit:** show what was
extracted, let them fix it, then save.

## 2. Derive the sync model from what happens when the write fails

Offline-first is a data-model decision, not a cache setting.

```
The user finishes the job and taps save. There is no signal.
├─ The write is LOST ──────────► you have built a paper-register competitor
│                                 that is worse than paper.
└─ The write is QUEUED ────────► correct, and now you owe four things:
   ├─ the local DB is the source of truth; the server is a replica
   ├─ each record carries a CLIENT-GENERATED UUID — the retry will happen,
   │   and duplicate job cards are the classic bug in every field app
   ├─ a conflict policy declared PER TABLE, up front. Last-write-wins is
   │   fine for a status field and wrong for a stock count
   └─ sync state visible on every screen: pending count, last synced,
      manual "sync now". A silent queue destroys trust permanently the
      first time something is lost.
```

## 3. Derive the payload budget from the connection they actually have

Assume 2G, metered, on a phone they paid for themselves.

Target **under 100 KB** to first meaningful paint. When you miss it, the cause is usually
an unpurged utility-CSS config shipping tens of thousands of unused classes — that alone
blows the budget before any of your code loads.

**Compress photos client-side before queueing.** A full-resolution phone photo will not
upload on a rural connection, and it will stall every queued write behind it.

## 4. Derive the controls from the physical conditions

```
What is true about the moment of use?
├─ Direct sunlight ──────► high contrast, dark text on light.
│                           Test outdoors, not on your monitor.
├─ Gloves, wet hands ────► 48px minimum targets, bigger for standing use.
├─ One hand, standing ───► primary actions in the bottom third.
├─ Moving, distracted ───► no precision gestures. No drag-and-drop.
└─ Touch only ───────────► no hover states. They do not exist.
```

## 5. Derive language from who is holding the phone

One fully translated language beats six partial ones. Use a real i18n library, not a
toggle that swaps two strings.

Check the font actually renders the script — many system fonts fail on complex conjuncts
in Indic and Southeast Asian scripts. Test with real words. See `regional-commerce-stack`.

## 6. Ship the escape hatch

```
The app genuinely cannot reach anything, and the queue is not enough.
└─ A messaging deep link. Their phone always has the messaging app.
   Meet them there and capture the record properly later,
   rather than losing it entirely.
```

---

## Verify

```bash
pytest tests/test_sync_queue.py -q
ship detect --rules deploy --url <url>
```

**Automated:** first-load JS and CSS budget, compression.

**The sync test asserts:** a write made offline survives an app restart; replaying the
same queued write twice produces **one** row, not two; a conflicting edit resolves per the
table's declared policy rather than by insertion order.

**On a real device, outdoors — this cannot be automated:**

- [ ] The primary task completes in under ~20 seconds, one-handed
- [ ] Readable in direct sunlight
- [ ] Operable with gloves or wet hands
- [ ] The app renders something useful with the network disabled
- [ ] Sync state visible without hunting for it

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| Staff still use the paper register | the task takes longer than paper did |
| Duplicate job cards | queued writes without client-generated UUIDs |
| "It said saved but the record is gone" | silent queue, or a failed sync with no surface |
| Users stop trusting sync entirely | one lost record, once — trust does not come back |
| Nobody uses it after 11am | unreadable in daylight |
| Data-entry errors climb | typing where camera or scan belonged |
| App never loads on site | payload budgeted for office wifi |
| Stock counts wrong after sync | last-write-wins applied to a quantity |

## Don't

- Don't argue for a native rewrite. Cross-platform and PWA are fine here.
- Don't build route optimisation unless it was asked for.
- Don't embed an on-device model — capture raw, process on sync.
- Don't add a feature that only works online to an app whose users are offline.
