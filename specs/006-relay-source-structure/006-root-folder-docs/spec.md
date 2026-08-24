---
title: "Phase F — Root folder docs: the missing folder READMEs"
description: "Fill the missing folder READMEs at the repo root: the two undocumented Pi extensions (inbound-media, plan) and the packages and extensions container maps. Documentation only — no code change; each README is drawn from the real folder."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-relay-source-structure/006-root-folder-docs"
    last_updated_at: "2026-08-24T21:41:28.315Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Four missing folder READMEs written from the real folders; no code touched."
    next_safe_action: "None — the backend and shared source-structure group is complete."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase F — Root folder docs

> **Phase links** — Parent: [`../spec.md`](../spec.md) · Predecessor: `005-root-source-banners`

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| Parent | `006-relay-source-structure` |
| Level | 2 |
| Writer | Claude (reads the folders, writes the READMEs) |
| Barrier | each README describes the real folder; no code touched |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

Most repo-root code folders already have a README, but four gaps remain. Two of the three Pi extensions —
`pi-remote-inbound-media` and `pi-remote-plan` — have none, while the third (`pi-remote-approval`) has a
full README that sets the pattern. And the two container folders, `packages` and `extensions`, have no
top-level map that says what they hold. This phase fills those four, so every root code folder is
navigable from a README. It follows the extension-README pattern already in the repo and changes no code.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:** four new README files — `extensions/pi-remote-inbound-media/README.md`,
`extensions/pi-remote-plan/README.md`, `extensions/README.md` (a map of the three extensions), and
`packages/README.md` (a map pointing to `pi-rpc-protocol`). Content is drawn from the real folders and
follows the `pi-remote-approval` README pattern.

**Out of scope:** any code, comment or behaviour change; rewriting the existing, accurate READMEs; the
banner/header pass (phase E).
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — `extensions/pi-remote-inbound-media/README.md` describes the inbound-media extension —
  its package name, what it does, and its entry point — drawn from the real source.
- **REQ-002** — `extensions/pi-remote-plan/README.md` describes the plan extension the same way.
- **REQ-003** — `extensions/README.md` maps the three extensions with one line each and links to their
  READMEs.
- **REQ-004** — `packages/README.md` maps the workspace's shared packages and links to
  `pi-rpc-protocol`.
- **REQ-005** — No file outside these four new READMEs changes; the repo behaves identically.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. The four READMEs exist and describe their real folders accurately.
2. Every root code folder is reachable from a README (container maps link to the leaf READMEs).
3. No code or comment changed; the affected suites are untouched and green.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **A README drifts from the extension it documents** — mitigated by drawing each claim from the
  extension's real `src` and package.json, and following the verified `pi-remote-approval` pattern.
- **Depends on phase E** — the extension source is bannered first, so the READMEs reference the final
  file shape.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

None. The extension-README pattern is set by `pi-remote-approval`; the container maps follow the
one-line-per-child form.
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:cross-refs -->
## 8. CROSS-REFERENCES

- `../spec.md` — the phase parent.
- `extensions/pi-remote-approval/README.md` — the extension-README pattern this mirrors.
- `../004-folder-ownership-map/` — the relay folder-map phase this parallels at the root.
<!-- /ANCHOR:cross-refs -->
