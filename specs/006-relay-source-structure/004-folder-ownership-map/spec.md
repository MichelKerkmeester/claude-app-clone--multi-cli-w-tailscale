---
title: "Phase D — Folder ownership map: what each of the 16 source folders owns"
description: "Write a reason-to-change map for the 16 top-level app-relay/src folders — for each folder, what it owns and the kind of change that belongs there — so a maintainer knows where a change goes. One map, not sixteen READMEs. Documentation only — no code change."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-relay-source-structure/004-folder-ownership-map"
    last_updated_at: "2026-08-24T21:41:27.664Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Reason-to-change map written for the 16 src folders; no code touched."
    next_safe_action: "Proceed to 005-root-source-banners."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase D — Folder ownership map

> **Phase links** — Parent: [`../spec.md`](../spec.md) · Predecessor: `003-attachments-readme` · Successor: `005-root-source-banners`

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| Parent | `006-relay-source-structure` |
| Level | 2 |
| Writer | Claude (reads the folders, writes the map) |
| Barrier | map names all 16 folders with an accurate reason to change; no code touched |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

The relay source has sixteen top-level folders under `src/` — approval, ask-question, attachments,
auth, commands, http, policy, prompt, push, release, replay, rpc, runtime, sessions, store, and the
fixtures used by tests. `src/README.md` already carries a zone map and dependency-direction diagram, but
it is stale: it names "twelve folders" and omits four that now exist — `ask-question`, `attachments`,
`commands` and `runtime` — and it maps responsibility without saying which change belongs where. This
phase completes that map: it adds the four missing folders to the topology and dependency direction, and
adds one reason-to-change table over all sixteen folders — for each, what it owns and the kind of change
that lands there. It is deliberately one map rather than sixteen READMEs, and it changes no code.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:** completing `app-relay/src/README.md` — add the four missing folders (`ask-question`,
`attachments`, `commands`, `runtime`) to its topology, directory tree and dependency direction, and add
one reason-to-change table listing all 16 `src/` folders with, for each, what it owns and the change that
belongs there. The map links `attachments` to its own README from phase C. The existing zone map and
dependency-direction content is preserved, not rewritten.

**Out of scope:** per-folder READMEs beyond the attachments one; any code, comment or behaviour change;
the header/banner passes (phases A, B).
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — The map lists all 16 `src/` folders, each with what it owns and the reason-to-change
  that lands there, drawn from the actual folder contents.
- **REQ-002** — The map is one document (`src/README.md`), not sixteen; `attachments` links to its
  phase-C README rather than repeating it.
- **REQ-003** — Each folder's entry is specific enough to route a real change (which folder a new auth
  rule, a new RPC frame, or a store migration belongs in).
- **REQ-004** — No file under `app-relay/src` other than the new README changes; the relay behaves
  identically.
- **REQ-005** — The four folders the old map omitted (`ask-question`, `attachments`, `commands`,
  `runtime`) are added to the topology and dependency direction, with edges matching their real imports.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. `app-relay/src/README.md` exists and maps all 16 folders with an accurate reason to change.
2. A reader can route a common change to the right folder from the map alone.
3. No code or comment changed; the app-relay suite is untouched and green.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **A folder's stated reason-to-change is wrong and misroutes a change** — mitigated by drawing each
  entry from the folder's real contents and keeping entries to what the folder demonstrably owns.
- **Depends on phase C** — the map links to the attachments README, so phase C lands first.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

None. The one-map-over-many-READMEs choice matches the web client's "a code map only where the folder
earns one" philosophy.
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:cross-refs -->
## 8. CROSS-REFERENCES

- `../spec.md` — the phase parent.
- `../003-attachments-readme/` — phase C, the one folder that earns its own README.
- `app-relay/src/` — the sixteen folders the map covers.
<!-- /ANCHOR:cross-refs -->
