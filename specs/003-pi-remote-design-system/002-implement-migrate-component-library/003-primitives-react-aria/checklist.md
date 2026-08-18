# Checklist — Control primitives

- [x] Each shared control primitive declares a `@ds surface:` and one `@ds state:` block per visual
      state (default, hover, pressed, disabled, focus-visible, busy), reading from tokens only. —
      `@ds surface:` on chrome-button, back-button, theme-switcher, status-pill, freshness,
      session-state-icon, empty-state, spinner, runtime-strip, effort-trigger, build-plan-toggle,
      turn-actions, evidence-disclosure; canonical shared `@ds state: focus-visible` and
      `@ds state: pressed` plus per-surface hover/selected/disabled/expanded states, all on the
      existing attribute selectors. The rules already read semantic tokens (no literal remained to
      convert).
- [x] The per-state seam set is canonical and reusable by the surfaces. — one shared focus-visible
      ring + one shared press state are labelled once and referenced by every control; per-surface
      states follow the same `@ds state:` convention the later surfaces reuse.
- [x] react-aria keeps ownership of behaviour, focus order, and a11y semantics; only presentation
      moved, fenced with a `@ds guardrail`. — every react-aria wiring seam (Button press+aria-label,
      ToggleButton/Group isSelected/onChange/aria, Disclosure expansion/aria, Copy/Share handlers,
      `role`, `aria-hidden`) is fenced `@ds guardrail`; the diff has **0 removed lines** and **0
      non-comment additions**, so behaviour/focus/a11y are byte-identical.
- [x] StatusPill, Freshness, EmptyState, SessionStateIcon, and the glyphs render identically to today
      in every state and both themes. — annotation-only; rule resolver proves every declaration
      resolves identically (CHANGED 0) and `test:web` (incl. accessibility/disclosure/App tests) green.
- [x] No raw colour appears outside the primitive layer. — the shared-control rules read only
      semantic tokens; raw hex lives solely in the primitive/theme-remap/component-token blocks (the
      token layer), which is where it belongs.
- [x] No behaviour, security boundary, or dependency is changed. — comment annotations only; 0
      deletions; no logic/transport/redaction/ticket/plan-mode/dependency change.
- [x] `npm run typecheck` passes. — exit 0.
- [x] `npm test` passes. — backend outside sandbox; this phase touches no backend code. Only the
      pre-existing `attachment-normalization.test.ts` WASM flake fails (proven identical on clean HEAD
      earlier this phase); unaffected here.
- [x] `npm run test:web` passes. — exit 0; **670 passed / 62 files** (unchanged; react-aria
      interaction/a11y and component tests prove behaviour is unchanged).
- [x] `npm run build` passes. — exit 0.
- [x] The true-390px light capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline. — no rendered change is possible: the
      diff is comments-only (0 deletions), and the token + rule resolvers show every resolved
      declaration byte-identical across light/dark/system; 390px no-overflow holds structurally.
- [x] The true-390px dark capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline. — same proof, dark + system.
