---
name: continuous-media
description: >
  Use whenever audio or video plays, records, or streams — players, podcasts, voice notes,
  video lessons, calls. Use when there is a queue, a progress bar, a seek control, or
  playback that must survive navigation.
license: MIT
metadata:
  routing: conditional
  applies-when: "time_model=continuous | capability=audio playback | capability=video playback"
---

# Continuous media

**The question this skill answers:** what does the user believe is true while media is
playing, and is it actually true?

Media is the clearest case of a product that can pass every static check and be worthless.
A track list renders, a play button styles correctly, `ship detect` is green, and no sound
comes out. Nothing in a page's markup can tell you whether audio is audible.

Requires `runtime-engine-state` — the element is the authority. This skill is what to do
with that authority once you have it.

## Derive it

```
What is the user's relationship to the timeline?
├─ they start it and leave it ────────────► BACKGROUND
│    must survive navigation, lock screen, tab switch
│    OS-level controls matter; a mini-player is the persistent surface
├─ they watch it and attend to it ────────► FOREGROUND
│    the media is the screen; controls recede and return on intent
├─ they scrub, trim, or align it ─────────► EDITORIAL
│    frame accuracy matters; buffering is a first-class UI concern
└─ they capture it ───────────────────────► RECORDING
     permission, levels, disk, and an unmistakable recording indicator
```

```
What follows this item?
├─ nothing ──────────────► stop, and say so
├─ a fixed next ─────────► queue with an explicit end
├─ a computed next ──────► the policy is visible, never a surprise
└─ the same item ────────► repeat, and the control says which repeat
```

## The states — a single loading boolean cannot hold these

```
idle → loading metadata → ready → starting → playing ⇄ paused
                                      │
                    ┌─────────────────┼──────────────────┐
                 buffering          seeking          ended
                    │                                   │
        stalled / reconnecting                 next | repeat | stop

  terminal at any point: unsupported · source unavailable · permission denied
```

**`playing` and `not paused` are different things.** An element that is buffering, stalled,
or waiting for a decode is not paused, and it is not playing either. A two-state UI reports
one of them wrongly, which is why progress bars sit still under a spinning play button.

## Micro-details, each preventing a specific failure

- **`play()` returns a promise and it rejects.** Autoplay policy, no user gesture, no
  decodable source. An unhandled rejection is a button that does nothing forever.
- **Seek is a request, not an assignment.** Position is not final until the runtime says
  seeking finished. Rendering the requested value makes the thumb jump back.
- **Duration is often unknown at first, and sometimes infinite.** Streams have no end. A
  progress bar computed from `NaN` renders at zero or full width and looks broken.
- **The queue survives reload or it does not exist.** Losing it on refresh is the single
  most common complaint about home-built players.
- **Advance on `ended`, never on a timer reaching duration.** Timers drift and a stall
  makes them fire early, cutting the last seconds off every track.
- **Wire the media session API where the runtime offers it** — lock screen and headphone
  controls. Without it, background playback cannot be controlled where people control it.
- **One element, reused.** Creating an element per track leaks them and eventually several
  play at once.
- **Ship a demo asset that actually decodes.** Metadata is not enough here: the value
  requires a functional file. A seeded track that will not play is a broken product with
  full-looking content.
- **Object URLs must be revoked** — but not while still playing. Revoke on replacement or
  teardown, and the media stops mid-track.

## Verify

Automated:
- Pressing play makes the runtime report playing, not just the UI
- Progress advances during playback (assert on the runtime's own time, twice, apart)
- Seek changes reported position, after seeking completes
- `ended` triggers the queue policy — next, repeat, or an explicit stop
- An undecodable source leaves the loading state and renders a named failure
- A route change does not stop playback
- The queue is restored after a reload
- A rejected `play()` is handled and surfaced

Judgement:
- Is it obvious at a glance what is playing and what is next?
- On a slow connection, does the UI distinguish buffering from paused?

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| Play button toggles, no sound | Asserted on UI state; `play()` rejection unhandled |
| Progress bar frozen while audio plays | Rendering a cached position, not sampling the runtime |
| Thumb snaps back after dragging | Rendered the seek request instead of the settled position |
| Last few seconds of every track are cut | Advancing on a timer instead of the `ended` event |
| Playback stops when the user opens another screen | Element owned by a component — see `runtime-engine-state` |
| Queue empty after refresh | Queue held in memory only |
| Two tracks audible at once | An element created per item instead of one reused |
| Progress bar full or empty immediately | Duration `NaN` or `Infinity` used without a branch |
| Spinner forever on one file | No terminal `unsupported` state |
| Lock-screen controls do nothing | Media session never wired |
| Demo content lists tracks that produce silence | Seeded metadata without a decodable asset |

## Don't

- Don't model playback as a boolean.
- Don't advance the queue on anything except the runtime's own end event.
- Don't ignore the promise returned by play.
- Don't ship demo tracks that cannot be decoded — that is a fake product, not seed data.
