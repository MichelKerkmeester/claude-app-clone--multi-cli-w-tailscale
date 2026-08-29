---
title: "Child 002 — Verbatim .ts Ports + Shared a11y Primitives (Bits UI)"
description: "Port the framework-agnostic TypeScript (relay.ts, state.ts, cache.ts, auth.ts, effort.ts, pure halves of runtime.ts/commands.ts, workers) verbatim, and build the shared a11y primitives — Button plus thin Bits UI wrappers Sheet/Menu/ToggleGroup/RadioGroup/Switch/Collapsible — that every later component composes. K parallel, disjoint files."
trigger_phrases:
  - "port relay.ts state.ts verbatim svelte"
  - "bits ui primitives button sheet menu pi remote"
  - "ports and primitives spec requirements"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/004-sveltekit-spa-migration/002-ports-and-primitives"
    last_updated_at: "2026-08-23T10:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet documentation completed retrospectively."
    next_safe_action: "None; child shipped and superseded by later layers."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 002 — Verbatim .ts Ports + Shared a11y Primitives (Bits UI)

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Parent Spec** | ../spec.md |
| **Predecessor** | ../001-move-and-scaffold/spec.md |
| **Successor** | ../003-feature-dirs/spec.md |
| **Level** | 2 |
| **Layer** | L1 — K parallel cli-devin, disjoint files |
| **Writer** | cli-devin (GLM-5.2 High) → Claude verifies |
| **Barrier** | `svelte-check` clean + primitive smoke stories render |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

Two independent bodies of work unblock everything downstream: the pure TypeScript that has **zero
React imports** ports verbatim (no rewrite risk), and the shared a11y primitives — the react-aria
replacement — must exist before any component that composes them. They share no files, so they run
in parallel.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope — verbatim `.ts` ports** (copy, adjust imports only, do not rewrite logic):
- `relay.ts` (the WebSocket client; `openSyncSocket(sessionId, cursor, onMessage, signal)`),
  `state.ts` (4 pure reducers), `cache.ts`, `auth.ts`, `effort.ts`, `demo.ts`, and the **pure
  halves** of `runtime.ts` (`runtimeReducer`) and `commands.ts` (`deriveSlashTrigger` et al.).
- The workers `highlight.worker.ts` and `attachment-hash.worker.ts` port verbatim.

**In scope — shared a11y primitives** (under `src/lib/primitives/`, one file each):
- `Button.svelte` — covers ~176 call sites; `onPress`→`onclick`, keeps the `data-*`/`aria-*`
  attribute-selector contract.
- Thin **Bits UI** wrappers: `Sheet`(Dialog) · `Menu`(DropdownMenu) · `ToggleGroup` · `RadioGroup` ·
  `Switch` · `Collapsible`. Each preserves roles, focus order/trapping, and `aria-*` wiring.

**Out of scope:** the composer autocomplete (Melt UI — child 004); any feature/chrome/view
component; any token value; `npm install`; config or shared files.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — Ported `.ts` files are logic-identical to source (import paths only may differ); the pure
  reducers are byte-for-byte where imports allow.
- **REQ-002** — Each primitive exposes the same a11y surface its react-aria counterpart did — asserted by a
  smoke story (role present, focus behaves, `aria-*` correct).
- **REQ-003** — The runes-split pattern for `runtime.ts`/`commands.ts` (pure reducer file + `*.svelte.ts`
  factory) is established here as the reference for later children.
- **REQ-004** — Disjoint files only — the ports dispatch and each primitive touch no shared file.
- **REQ-005** — The interaction-state contract survives the swap. react-aria supplied `[data-hovered]`,
  `[data-pressed]` and `[data-focus-visible]` automatically; Bits UI does not, so shared `use:` actions
  must supply them. Native CSS `:hover` is not an acceptable substitute — it sticks after a tap on
  touch devices, which is the whole target platform.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- `svelte-check` clean across the new `src/lib/` files.
- Each primitive renders a smoke story in the catalog (light + dark) without throw.
- Claude re-verifies independently: diff review confirms no logic drift in the ports; typecheck.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **R1 (a11y parity):** Bits UI attribute names/roles must match react-aria's; mitigation — smoke
  story asserts each attribute the CSS state selectors depend on (`[data-pressed]`,
  `[aria-pressed]`, `[data-focus-visible]`, `[aria-selected]`, `[aria-disabled]`).
- Depends on L0 (scaffold + deps) and the 008-draft skill guidance.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

None blocking. Gate 3 pre-resolved by the phase parent.
<!-- /ANCHOR:questions -->
