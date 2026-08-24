---
title: "Phase C — Attachments README: a folder guide for the inbound-media subsystem"
description: "Write a README for app-relay/src/attachments, the eight-file subsystem that decodes, bounds, normalises, projects and reaps inbound media, so a first reader learns the flow and which file owns each step. Documentation only — no code change."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-relay-source-structure/003-attachments-readme"
    last_updated_at: "2026-08-24T21:00:00Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "README written for src/attachments, describing the decode-to-reap flow and per-file ownership."
    next_safe_action: "Proceed to 004-folder-ownership-map."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase C — Attachments README

> **Phase links** — Parent: [`../spec.md`](../spec.md) · Predecessor: `002-bare-file-headers` · Successor: `004-folder-ownership-map`

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| Parent | `006-relay-source-structure` |
| Level | 2 |
| Writer | Claude (reads the subsystem, writes the README) |
| Barrier | README describes the real files and flow; no code touched |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

`src/attachments` is the largest folder in the relay source — eight files that take inbound media from a
host, decode it, enforce size and type limits, normalise it, project it into the transcript, and reap it
on retention bounds. It is also the least self-explanatory: the files interlock, and a first reader has
no map of which one owns which step. This phase writes a README that names the flow and points each step
at its file, so the subsystem can be changed safely. It follows the web client's folder-README form and
changes no code.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope:** a single `app-relay/src/attachments/README.md` describing the subsystem — its purpose, the
decode → bound → normalise → project → reap flow, a per-file ownership table, and where to start for a
common change. Content is drawn from the real files.

**Out of scope:** any code, comment or behaviour change; READMEs for other folders (the folder map is
phase D); the header/banner passes (phases A, B).
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — The README names all eight files and states what each owns, drawn from the actual code.
- **REQ-002** — The README describes the inbound-media flow as a sequence a reader can follow from entry
  to retention, not a flat file list.
- **REQ-003** — The README points a reader at the right starting file for a common change (a new limit,
  a new media type, a retention change).
- **REQ-004** — No file under `app-relay/src` other than the new README changes; the relay behaves
  identically.
- **REQ-005** — The README states why decode and normalize are separate steps, so a reader changing
  either understands that decode proves what the bytes are and normalize proves what leaves the relay.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

1. `app-relay/src/attachments/README.md` exists and names all eight files accurately.
2. The flow it describes matches how the files actually call each other.
3. No code or comment changed; the app-relay suite is untouched and green.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **The README drifts from the code and misleads a reader** — mitigated by drawing every claim from the
  actual files and naming the owning file for each step, so a future reader can check it against source.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

None. The folder-README form follows the established web-client convention.
<!-- /ANCHOR:questions -->

---

<!-- ANCHOR:cross-refs -->
## 8. CROSS-REFERENCES

- `../spec.md` — the phase parent.
- `../../005-sveltekit-spa-migration/014-folder-documentation/` — the folder-README convention.
- `app-relay/src/attachments/` — the eight-file subsystem the README documents.
<!-- /ANCHOR:cross-refs -->
