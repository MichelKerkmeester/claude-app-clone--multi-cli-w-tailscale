---
title: "Rule: Host authority and story seams"
description: "This client owns no editable session truth. It is host-authoritative and fail-closed, so a surface needing data the relay does not send is built inert rather than invented."
trigger_phrases:
  - "host field"
  - "the relay does not send"
  - "invent a field"
  - "capability check"
  - "fail closed"
  - "host-authoritative"
  - "host request"
  - "add a prop for the story"
  - "story only export"
  - "make the story render"
  - "do not edit"
  - "session-composer"
  - "mutation path"
  - "steer stop snapshot"
  - "presentation change"
importance_tier: important
contextType: reference
version: 1.0.0.0
---

# Rule: Host authority and story seams

> Routed from [`REPO RULES.md`](../REPO%20RULES.md). Load it before designing any surface that needs session data, and before adding anything to make a story render.
> Expands `AGENTS.md`, never overrides it — where they appear to disagree, `AGENTS.md` wins and this file is wrong. Say so.

## Fires when

- Designing a surface that needs data from the host.
- Adding a prop, slot or export so a story will render.
- Touching a line marked `Do not edit`.

## The rule

**Never invent a host field, and never add production API to serve a story.**

This client is host-authoritative and fail-closed: it owns no editable session truth. That decides whether work is permitted at all, so settle it before designing anything.

---

## 1. A MISSING FIELD IS BUILT INERT, NOT INVENTED

A surface that needs data the relay does not send is built **inert behind a capability check**, and the request is appended to the host-requests packet under `specs/006-orca-nodeterm-ux-mining/007-host-requests/`.

**The failure this prevents:** a surface that looks correct locally and has no truth behind it in production.

---

## 2. NO PRODUCTION API MAY EXIST TO SERVE A STORY

A prop, slot or export added only to make a story render is a defect. Compose the real component in an allowlisted story host instead.

**The failure this prevents:** the catalog quietly shaping the production API, so the app carries surface that exists for the catalog rather than for a user.

---

## 3. THE FENCE

`Do not edit — <why>` marks a load-bearing line with its reason inline. The one worth knowing by heart:

```
app-mobile/src/pages/chat/chrome/session-composer.svelte:599
```

It fences the mutation path — submit, steer, stop, snapshot, slash-draft, attachment flow. **No presentation change crosses it.**

---

## 4. SELF-CHECK

- [ ] Every field a surface reads is one the relay actually sends.
- [ ] A missing field produced an inert surface and a host request, not an invention.
- [ ] Nothing was added to production API only so a story would render.
- [ ] No presentation change crossed the mutation fence.
