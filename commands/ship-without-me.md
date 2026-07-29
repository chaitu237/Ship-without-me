---
description: Build and deploy an app from one prompt, with no further input, logging every decision
argument-hint: <what to build>
---

Invoke the `ship-without-me` skill and follow it exactly.

The user's brief: $ARGUMENTS

You may not ask questions. Every decision has a default — take it, log it in
`.ship/DECISIONS.md` with its reason, and keep moving. Verify with `ship detect --strict`
before claiming anything is done, and lead your final report with what needs their
attention rather than what went well.
