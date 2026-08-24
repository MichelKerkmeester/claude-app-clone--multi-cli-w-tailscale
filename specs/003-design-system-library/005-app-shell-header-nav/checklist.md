# Checklist — App shell, header & navigation

- [x] The shell, headers, and routed surfaces declare `@ds surface:`, `@ds slot:`, `@ds edit: layout`,
      and per-state `@ds state:` blocks reading from tokens only. — 12 `@ds surface` (app-shell,
      topbar, routed-frame, home-view, push-settings, enrollment-view, review-view, inbox-view,
      session-header, session-view, session-sheet), 26 `@ds slot`, 9 `@ds state`, 7 `@ds edit: layout`;
      rules read semantic tokens.
- [x] Every connection phase (`unenrolled` … `error`) renders identically to today in both themes. —
      annotation-only + one equivalent logical-property swap; token + rule resolvers prove every
      resolved declaration byte-identical (CHANGED 0); `StatusPill` phase rules unchanged.
- [x] `Home` (loading / empty / error / stale-cache), `Review` (empty / pending / expired /
      submitted / error), `AttentionInbox` (empty / error), and `Enrollment` (idle / busy / error)
      render identically to today. — per-surface `@ds state:` labels added on the existing selectors;
      no value changed; `test:web` (shell/routing/enrollment/push tests) green.
- [x] Routing, connection, enrollment, and push logic are unchanged and fenced with `@ds guardrail`. —
      `App.tsx` guardrails on auth/connection/push/routing/session-open/logout/revoke/subscribe seams;
      `.tsx` diff is comments-only (0 deletions), so logic is byte-identical.
- [x] Safe areas and page gutters are expressed with tokens and logical properties. — safe-area /
      page-gutter rules labelled `@ds edit: layout`; one physical→logical conversion
      (`.session-card::after` `right:0; left:0` → `inset-inline:0`, symmetric zeros — equivalent in
      every writing direction, more RTL-correct). Residual `white` literals kept (not equal to any
      token in both themes).
- [x] No source value, security boundary, or dependency is changed. — token resolver CHANGED 0; only
      one equivalent logical-property swap; no security/logic/dependency change.
- [x] `npm run typecheck` passes. — exit 0.
- [x] `npm test` passes. — backend outside sandbox; this phase touches no backend code; only the
      pre-existing `attachment-normalization.test.ts` WASM flake fails (proven on clean HEAD earlier).
- [x] `npm run test:web` passes. — exit 0; **670 passed / 62 files** (unchanged).
- [x] `npm run build` passes. — exit 0.
- [x] The true-390px light capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline. — no rendered change is possible: `.tsx`
      comments-only, and the token + rule resolvers show every resolved declaration byte-identical
      across light/dark/system (the one property swap is a proven equivalent); 390px no-overflow holds.
- [x] The true-390px dark capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline. — same proof, dark + system.
