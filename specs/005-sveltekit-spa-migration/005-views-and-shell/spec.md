---
title: "Child 005 — Views (extract App.tsx) + Shell & Routes"
description: "Extract App.tsx's six view functions into Svelte views — Enrollment/Home/Review/Inbox in parallel, Session alone (it owns the socket + virtualizer, swapping @tanstack/react-virtual→svelte-virtual) — then the +layout shell (both context providers, theme, SW registration) and the 3-URL routing via goto/afterNavigate. This is where the branch first runs end-to-end."
trigger_phrases:
  - "extract app.tsx views svelte session socket virtualizer"
  - "sveltekit layout routes goto pi remote"
importance_tier: "important"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/005-views-and-shell"
    last_updated_at: "2026-08-23T10:00:00Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Packet documentation completed retrospectively."
    next_safe_action: "None; child shipped and superseded by later layers."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Child 005 — Views + Shell & Routes

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|-------|-------|
| **Parent Spec** | ../spec.md |
| **Predecessor** | ../004-chrome-and-composer/spec.md |
| **Successor** | ../006-catalog/spec.md |
| **Level** | 2 |
| **Layer** | L4 (views) + L5 (shell) — mostly serial; Session alone; shell is Claude + 1 dispatch |
| **Writer** | cli-devin (views) + Claude (shell/routes/integration) |
| **Barrier** | end-to-end app runs; the 3-URL routing works |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

`App.tsx` (2,612 lines) buries all five views plus hand-rolled routing and the socket/virtualizer.
Extracting each view into its own `.svelte` file is the core "designer opens one page" payoff. The
Session view is the integration crux — it owns the sync socket and the virtualizer — so it is done
alone. The shell (`+layout`) and routing are shared/integration files, so Claude owns them at the
barrier.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:scope -->
## 3. SCOPE

**In scope — views (extract `App.tsx`'s functions):**
- Parallel: `Enrollment` (auth gate), `Home`, `Review`, `Inbox` (Review/Inbox are overlay state).
- **Alone:** `Session` — owns `openSyncSocket` lifecycle and the virtualizer; swap
  `@tanstack/react-virtual`→`@tanstack/svelte-virtual` keeping the dynamic `measureElement`.

**In scope — shell & routes (Claude + 1 dispatch, barrier-only):**
- `+layout.svelte` — app-shell, **both** context providers, theme, service-worker registration,
  connection/session stores.
- `src/routes/*` — the routing surface is **3 URLs**: `/`, `/session/[id]`, `/attention/[lookupId]`;
  replace `pushState`/`popstate` with `goto`/`afterNavigate`. Enrollment is an auth branch;
  Review/Inbox are overlay booleans.
- The `/catalog` route gets a layout reset (`+layout@.svelte`) so it can never white-screen the app.

**Out of scope:** Storybook stories (child 006); the verification migration (child 007); any token
value; installs.
<!-- /ANCHOR:scope -->

---

<!-- ANCHOR:requirements -->
## 4. REQUIREMENTS

- **REQ-001** — The four non-Session views are disjoint (parallel-safe); Session runs alone.
- **REQ-002** — Socket lifecycle is centralized in the Session `onMount` (abort + close on teardown); async
  open is guarded against early teardown. (Svelte has no StrictMode double-mount.)
- **REQ-003** — The 3-URL routing behaves identically to the React `pushState`/`popstate` app, including the
  `/attention/:lookupId` deep link through the SPA fallback.
- **REQ-004** — Both context providers mount once in `+layout`; theme + SW registration match the React shell.
- **REQ-005** — The virtualizer keeps dynamic row measurement across the library swap.
  `@tanstack/svelte-virtual` returns a **store**, not a rune, so reactive count must go through a
  merging `setOptions` call and rows must measure via `{@attach}` — a naive rune-shaped port silently
  drops the injected observers and breaks variable-height rows.
<!-- /ANCHOR:requirements -->

---

<!-- ANCHOR:success-criteria -->
## 5. SUCCESS CRITERIA

- The app runs end-to-end against the relay (enroll → home → session with live socket → review/inbox).
- All three URLs resolve and deep-link correctly; `svelte-check` clean.
- Claude re-verifies: token-identity on touched surfaces; no socket leak under HMR.
<!-- /ANCHOR:success-criteria -->

---

<!-- ANCHOR:risks -->
## 6. RISKS & DEPENDENCIES

- **Socket lifecycle under runes/HMR** — the top risk; centralize open/teardown, guard async open.
- **Virtualizer swap** — keep dynamic `measureElement`; verify no scroll/measurement regression.
- Depends on L3 (chrome/composer) — Session composes the composer.
<!-- /ANCHOR:risks -->

---

<!-- ANCHOR:questions -->
## 7. OPEN QUESTIONS

None blocking. Gate 3 pre-resolved by the phase parent.
<!-- /ANCHOR:questions -->
