---
title: "Child 002 — Verbatim .ts Ports + Shared a11y Primitives (Bits UI)"
description: "Port the framework-agnostic TypeScript (relay.ts, state.ts, cache.ts, auth.ts, effort.ts, pure halves of runtime.ts/commands.ts, workers) verbatim, and build the shared a11y primitives — Button plus thin Bits UI wrappers Sheet/Menu/ToggleGroup/RadioGroup/Switch/Collapsible — that every later component composes. K parallel, disjoint files."
trigger_phrases:
  - "port relay.ts state.ts verbatim svelte"
  - "bits ui primitives button sheet menu pi remote"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "app-mobile-cli/003-pi-remote-design-system/005-sveltekit-spa-migration/002-ports-and-primitives"
    last_updated_at: "2026-08-19T00:00:00Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Spec authored (L1 child)"
    next_safe_action: "Dispatch K parallel cli-devin units after L0 barrier + 008-draft"
    blockers: []
    completion_pct: 0
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 002 — Verbatim .ts Ports + Shared a11y Primitives (Bits UI)

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Level** | 2 |
| **Layer** | L1 — K parallel cli-devin, disjoint files |
| **Writer** | cli-devin (Gemini 3.7 Flash High) → Claude verifies |
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

- R1: Ported `.ts` files are logic-identical to source (import paths only may differ); the pure
  reducers are byte-for-byte where imports allow.
- R2: Each primitive exposes the same a11y surface its react-aria counterpart did — asserted by a
  smoke story (role present, focus behaves, `aria-*` correct).
- R3: The runes-split pattern for `runtime.ts`/`commands.ts` (pure reducer file + `*.svelte.ts`
  factory) is established here as the reference for later children.
- R4: Disjoint files only — the ports dispatch and each primitive touch no shared file.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA (barrier gate)

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
