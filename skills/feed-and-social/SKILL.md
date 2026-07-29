---
name: feed-and-social
description: >
  Use when one user's content will appear on another user's screen — a feed, a timeline, a
  community, a forum, comments, or any user-generated content.
---

# Feeds and social surfaces

**The question this skill answers:** who is allowed to reach whom, who decides, and what
happens when someone abuses it?

A feed is a **distribution system**. The posting UI is the easy half. The half that
decides whether the product survives contact with real users is governance — and it is
the half that gets skipped, every time, until the first abuse incident forces it.

Build the governance layer in the same pass as the post button. Retrofitting it means
moderating with SQL at 2am.

---

## 1. Derive the distribution rule

Everything else follows from this. Answer it before writing a schema.

```
When a user publishes, who sees it?
├─ EVERYONE ──────────────► public feed. You now need ranking, and you now
│                            need moderation before launch, not after.
├─ THEIR FOLLOWERS ───────► graph feed. Fan-out becomes your hardest
│                            engineering problem. Decide read-time vs write-time now.
├─ A GROUP THEY JOINED ───► scoped feed. Easiest to moderate — the group has
│                            an owner, so authority already exists. Prefer this.
└─ ONE PERSON ────────────► messaging, not a feed. Different product.
                             Do not build a feed and call it messaging.
```

**Scoped-to-group is the safest default** and the one most products should pick. It gives
you a moderator with natural authority, bounds the blast radius of abuse, and removes the
ranking problem entirely.

Public feeds are the most expensive thing on this list. Choose one deliberately or not
at all.

## 2. Derive the ordering

```
Is there more content than a person can read?
├─ no ──► reverse chronological. Ship it. Do not build ranking.
└─ yes ─► rank it — and now you owe the user two things:
          · a way to see the raw chronological feed
          · an honest label of why something is shown
```

Most products do not have a volume problem and build a ranking algorithm anyway. Reverse
chronological is correct, debuggable, and nobody complains that it is unfair.

If you do rank: rank on **signals the user can see** (recency, follows, engagement they
performed). A ranking the user cannot reason about produces "why am I seeing this" and
you will have no answer.

## 3. Derive the governance layer from what abuse is possible

For every distribution rule you allowed, ask what the worst-behaved user does with it.
Each answer is a control you must build **before** launch.

```
Can a stranger reach a user unsolicited?
  yes → BLOCK, and MUTE (block is mutual, mute is one-way and private)

Can content be seen by people who did not seek it out?
  yes → REPORT, with a real queue behind it, and a defined response time

Can a user be impersonated?
  yes → stable @handle, immutable ID under it, and a name-change history

Can content be permanent and harmful?
  yes → author DELETE, and moderator REMOVE — different actions, both audited

Can volume be weaponised?
  yes → rate limits on posting, following, and reporting.
         Rate-limit reporting too: mass-reporting is itself an attack.
```

**A report button with no queue behind it is worse than no report button.** It promises
review that will not happen, and it teaches users the product is indifferent.

Minimum viable governance, from day one:

- Block · mute · report · author-delete · moderator-remove
- A moderation queue a human actually opens
- An audit log of every moderation action, immutable
- Rate limits on the four verbs above

## 4. Derive identity from the trust the product needs

```
What does a reader need to know about an author to act safely?
├─ nothing (internal team) ────► real names from the directory. No profiles needed.
├─ that they're a real person ─► verified handle, join date, activity history
├─ that they're qualified ─────► credential badges, granted by you, never self-claimed
└─ nothing at all (anonymous) ─► then you need MUCH stronger rate limits and
                                  moderation, because reputation cannot restrain anyone
```

**Anonymity is not a feature, it is a tradeoff** — it removes the cheapest restraint you
have. If you choose it, pay for it in moderation.

A "verified" badge means whatever you decide it means. Define it in one sentence, put
that sentence where users can read it, and never sell it.

## 5. The composer

The post box is where product quality is most visible.

- **Draft persistence.** Losing a half-written post is the fastest way to lose a poster.
- **Character counter from the first keystroke**, not on hitting the limit.
- **Optimistic post with a visible pending state** — and a visible failure if it fails.
  A silent failed post looks like censorship.
- **Edit window or edit history.** Silent edits after others have replied break the thread's
  meaning. Pick one: short edit window, or edits shown as edited.
- Uploads: compress client-side, show progress, strip EXIF — location data in a public
  photo is a safety problem, not a metadata problem.

## 6. Notifications are part of the feed, not separate

Every notification is a decision about interrupting someone.

```
Did this happen BECAUSE of the user? (reply, mention, follow)
├─ yes ─► notify. They will expect it.
└─ no ──► do NOT notify by default. This is the "engagement" trap:
           it works for a month and then people disable notifications
           permanently, and you lose the channel for the ones that mattered.
```

Batch anything high-volume. Give per-type controls. Make unsubscribe one click and honour
it immediately.

---

## What these derivations usually produce

Reference only.

| Distribution | Typical build |
|---|---|
| Group-scoped | group membership, roles, per-group moderator, chronological |
| Follower graph | follow table, fan-out on read for <10k followers, ranked feed |
| Public | ranking, trending, full moderation stack, appeals |

Common features and whether they earn their place: **likes** (cheap, useful signal),
**comments** (doubles your moderation surface — budget for it), **stories** (adds an
expiry job and a separate viewer), **DMs** (a different product with different abuse
vectors — do not add casually).

## Verify

```bash
ship detect --rules list,states
```

**Automated:** feed views with no empty state, unpaginated list endpoints.

**Judgement:**

- [ ] The distribution rule is written in one sentence and enforced at the data layer
- [ ] Block, mute, report, delete and remove all exist and work
- [ ] The report queue has a human owner and a stated response time
- [ ] Moderation actions are audited and immutable
- [ ] Rate limits on post, follow, and **report**
- [ ] The composer persists drafts and fails visibly
- [ ] Notifications default to caused-by-the-user only
- [ ] EXIF stripped from uploaded images

## How you'll know you got it wrong

| Symptom | Cause |
|---|---|
| First abuse incident is handled by hand in the database | governance deferred past launch |
| "Why am I seeing this?" | ranking on signals the user cannot see |
| Users disable notifications entirely | notifying on things they did not cause |
| Reports pile up unread | report button shipped without a queue behind it |
| Posting feels risky, engagement drops | failed posts fail silently and read as censorship |
| Feed is empty for new users | no seeded content and no follow suggestions on day one |
| Fan-out falls over | read-vs-write-time decision deferred until it was load-bearing |

## Don't

- Don't build ranking before you have a volume problem.
- Don't add DMs because a competitor has them — they are a separate abuse surface.
- Don't ship a report button without a queue.
- Don't let "verified" mean nothing.
