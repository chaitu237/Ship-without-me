---
name: runtime-engine-state
description: >
  Use whenever the browser or device owns state your UI displays — audio, video, camera,
  microphone, geolocation, canvas, workers, bluetooth, WebRTC, native bridges. Use when
  playback, capture, or a permission-gated device is involved, or when UI and hardware disagree.
---

# Runtime-owned state

**The question this skill answers:** when a runtime already holds the truth, what is the UI
allowed to remember — and what must it always ask?

An `<audio>` element knows whether sound is coming out. The camera knows whether it is
streaming. Geolocation knows whether permission was granted. Every one of these is a state
machine you do not control and cannot pause, and the moment you keep a second copy of its
state in a store, the two drift and the user sees the copy.

## Derive it

```
Who can change this value without asking your code?
├─ nobody ─────────────────────────────────────► ordinary app state. This skill is not for it.
└─ the runtime, the OS, the user, or hardware ─► RUNTIME-OWNED
     │
     ├─ Does it change on its own clock? ──────► CONTINUOUS  (playback time, frames)
     │    subscribe, sample at a rate the UI needs — not at the rate it fires
     ├─ Does it require permission? ───────────► GATED  (camera, mic, location, bluetooth)
     │    denied and unavailable are real states, not error toasts
     ├─ Can it vanish mid-session? ────────────► REVOCABLE  (device unplugged, handle lost)
     │    every read can fail; recovery is part of the design
     └─ Does it survive your component? ───────► DETACHED  (audio keeps playing on unmount)
          lifetime belongs to the app, not the tree
```

Then, for each runtime value:

```
Do you need it to render, or only to act on?
├─ render ─► derive a snapshot, at a UI-appropriate frequency
└─ act ────► read it at the moment of acting. Never from a cached copy.
```

## The rule that prevents most of the bugs

**One adapter owns the runtime object. The UI subscribes to snapshots. Nothing else touches
it.**

```
   ┌───────────────┐   events    ┌──────────┐  snapshot   ┌────┐
   │ runtime object│ ──────────► │ adapter  │ ──────────► │ UI │
   │ (audio, media,│ ◄────────── │ (single  │ ◄────────── │    │
   │  camera, geo) │  commands   │  owner)  │  intents    └────┘
   └───────────────┘             └──────────┘
```

The UI sends intents (`play`, `seek(t)`), never state. The adapter is the only thing that
knows the runtime exists. A component that reaches for the element directly is the bug you
will spend an afternoon on.

## Micro-details, each preventing a specific failure

- **Never mirror runtime state into a store and render the mirror.** Pausing from a
  keyboard media key, an OS control, or the phone's lock screen changes the runtime and not
  your boolean — the UI then lies.
- **Sample continuous values; don't re-render on every event.** A media element fires
  progress events several times a second and an animation loop fires 60. Render at 4–10 Hz
  for a progress bar; the user cannot see more.
- **Keep the runtime object outside the component tree.** Mounted inside, it is destroyed
  by a route change and playback stops for no reason the user can understand.
- **Permission has three answers, not two:** granted, denied, and not-yet-asked. Ask only
  in response to a user action; a permission prompt on load gets denied by reflex and
  denied is often permanent.
- **Autoplay policies mean the first play must come from a user gesture.** Attempting it on
  load fails silently and looks like a broken button.
- **Every runtime read can throw.** The device was unplugged, the handle was revoked, the
  tab lost focus. Wrap reads; render the failure as a state.
- **Clean up on teardown, and prove it.** An abandoned stream keeps the camera light on and
  an abandoned audio context keeps the device awake.

## Verify

Automated:
- Exactly one module references the runtime object; no component imports it
- UI state is derived from adapter snapshots, with no independent copy of a runtime field
- Permission denied and device unavailable each render a distinct state
- Teardown releases the runtime object (tracks stopped, context closed, listeners removed)
- Re-render frequency during continuous activity is bounded

Judgement:
- If the user changes state from outside the app — OS control, hardware button, another
  tab — does the UI follow?
- Does the product survive a route change without losing what it was doing?

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| UI says playing, nothing is audible | State mirrored from an intent instead of read from the runtime |
| Pausing from the lock screen leaves the button wrong | Not subscribed to runtime events |
| Navigating between screens stops playback | Runtime object owned by a component, destroyed on unmount |
| The whole app re-renders constantly during playback | Rendering on every engine tick instead of a sampled snapshot |
| First press of play does nothing, second works | Autoplay policy — the first attempt had no user gesture |
| Camera light stays on after leaving the page | Teardown never released the tracks |
| Permission prompt appears on load and is denied forever | Asked without a user action |
| Works on the developer's machine only | Device unavailable treated as an error, not a state |
| Seek jumps back to where it was | Cached position written back over the runtime's own |

## Don't

- Don't store a runtime value and a UI copy of it, then trust the copy.
- Don't create the runtime object inside a component that can unmount.
- Don't request permission before the user has asked for the thing that needs it.
- Don't treat "denied" or "no device" as an exception. They are ordinary states.
