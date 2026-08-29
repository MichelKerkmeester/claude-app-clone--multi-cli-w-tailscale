---
title: "Phase F implementation summary — root folder docs"
description: "Four missing folder READMEs written: the inbound-media and plan Pi extensions, and the packages and extensions container maps. Each drawn from the real folder, following the repo's pi-remote-approval README pattern. No code touched."
trigger_phrases:
  - "root folder docs implementation summary"
  - "root folder docs packet"
  - "implementation summary"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-relay-source-structure/006-root-folder-docs"
    last_updated_at: "2026-08-25T03:30:44.019Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Four READMEs written from the real folders; only added files."
    next_safe_action: "Proceed to 007-comment-brevity."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: implementation-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase F implementation summary

---

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|---|---|
| Parent | `005-relay-source-structure` |
| Level | 2 |
| Status | Complete |
| Requirements shipped | REQ-001 … REQ-005 |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

Four README files that close the folder-doc gaps at the repo root:

- `extensions/pi-remote-inbound-media/README.md` — the host-side image boundary that publishes only
  allowlisted, capability-gated inbound media to the relay.
- `extensions/pi-remote-plan/README.md` — the read-only plan-mode extension that gates mutation-capable
  tools until execution begins under a lease.
- `extensions/README.md` — a map of the three Pi extensions and their boundaries.
- `packages/README.md` — a map of the shared workspace packages, today `pi-rpc-protocol`.

Every root code folder is now reachable from a README.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

The two extensions' `src` and `package.json` were read and their behaviour traced: inbound-media
allowlists three sources and produces a capability only when interception is available and the runtime
media capability is enabled; plan classifies tools as read-only, mutation-capable or host-authoritative
and blocks mutations in plan mode until a one-hour execution lease. Both READMEs follow the existing
`pi-remote-approval` pattern — frontmatter plus the eight-section structure. The two container maps are
lighter, a one-line-per-child table linking each leaf README.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

**Follow the existing pattern, don't invent one.** `pi-remote-approval` already had a strong extension
README; the two new ones mirror its structure so the three read alike.

**Containers map, leaves describe.** The `packages` and `extensions` READMEs are thin maps that link to
the leaf READMEs rather than repeating them, so a reader lands on the right file without duplication.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

| Check | Result |
|---|---|
| Extension READMEs name the real package + entry point | Yes — checked against each `package.json` and `src/index.ts` |
| Behaviour matches source | Yes — allowlist/gate and read-only/lease drawn from source |
| Container maps link every child | Yes — 3 extensions, 1 package, links resolve on disk |
| Scope: only four added files | Yes — no code or comment changed |
| `validate.sh --strict` | exit 0 recursively through its realpath |
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

The existing, accurate READMEs (`scripts`, `release`, `tests`, `pi-rpc-protocol`, `pi-remote-approval`)
were left as-is; this phase filled gaps rather than auditing every root README for staleness.
<!-- /ANCHOR:limitations -->
