---
name: Rule missed a real defect
about: ship detect passed when something was genuinely wrong
labels: false-negative, priority
---

**What the defect was**

**Why the rule should have caught it**

**Smallest example that passes but should fail**

A check that fails open produces false confidence, which is worse than no check. This is
the most serious class of bug in this project.
