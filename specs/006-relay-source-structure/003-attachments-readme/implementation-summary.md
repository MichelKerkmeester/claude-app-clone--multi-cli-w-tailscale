---
title: "Phase C implementation summary — attachments README"
description: "A README for app-relay/src/attachments written from the eight-file subsystem: the decode→bound→normalize→bridge→project→reap flow, a per-file ownership table, the decode-vs-normalize security boundary, and change starting points. No code touched."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-relay-source-structure/003-attachments-readme"
    last_updated_at: "2026-08-24T19:46:24.715Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "README written and checked against the real subsystem; only added file under src."
    next_safe_action: "Proceed to 004-folder-ownership-map."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase C implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `006-relay-source-structure` |
| Level | 2 |
| Status | Complete |
| Requirements shipped | REQ-001 … REQ-004 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

`app-relay/src/attachments/README.md` — a folder guide for the relay's inbound-media subsystem. It
frames the subsystem as a single flow: an attachment enters as untrusted bytes, gets a reserved ticket,
is sniffed and decoded in isolation, re-encoded inside bounds, delivered to Pi, projected as a redacted
transcript block, and reaped on retention. A per-file table names what each of the eight files owns, a
section explains why decode and normalize are separate security steps, and a table points a reader at
the right file for a common change.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

The eight files were read and their exports and call order traced: `AttachmentService` is the
orchestrator; `attachment-types` and `attachment-limits` are the shared foundation; `attachment-decoder`
and `attachment-normalizer` are the security-critical transforms; `pi-image-bridge` delivers;
`attachment-transcript-projector` redacts for the transcript; `attachment-reaper` cleans up on
retention. Every README claim maps to a named file, so a future reader can check it against source.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**Frame it as a flow, not a file list.** The subsystem's files only make sense in the order the service
runs them, so the README leads with the decode→reap sequence and hangs the per-file ownership off it.

**Name the decode-vs-normalize boundary explicitly.** The declared MIME is host input; decode proves
what the bytes are, normalize proves what leaves the relay. A reader changing either must understand the
split, so it gets its own section rather than a buried line.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| All eight files named with accurate roles | Yes — checked against each file's MODULE header and exports |
| Flow matches the service call order | Yes — `AttachmentService` runs reserve → decode → normalize → bridge → project → reap |
| Scope: only added file under `src/` | Yes — `src/attachments/README.md`, no code or comment change |
| `validate.sh --strict` | exit 0 recursively through its realpath |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

The README describes behaviour at the folder level; the exact limit values live in the shared media
policy that `attachment-limits.ts` re-exports, and the README points there rather than duplicating the
numbers, which would drift.
<!-- /ANCHOR:limitations -->
