# Tasks — App shell, header & navigation

- [x] Map the shell in `App.tsx` (`App`, `Session` composition root, `Header`, `Home`, `Review`,
      `AttentionInbox`, `PushSettings`, `Enrollment`, `StatusPill`) and their current layout/state
      styling in `style.css`. — mapped; rules already token-backed from 001/002.
- [x] Migrate the app shell and `Session` layout onto tokens and `@ds edit: layout` seams; express
      safe areas and page gutters with tokens and logical properties. — `@ds edit: layout` on shell/
      routed-frame/safe-area rules; one equivalent physical→logical conversion (`.session-card::after`
      → `inset-inline: 0`).
- [x] Migrate `Header` and `SessionHeader`, labelling their slots (wordmark, nav, theme toggle,
      status) with `@ds slot:`. — topbar + session-header surfaces with wordmark/nav/theme-toggle/
      status/model/plan-badge/back/overflow slots.
- [x] Migrate each routed surface onto tokens with per-state `@ds state:` blocks for its loading /
      empty / error / stale states and the connection phases. — home/review/inbox/push-settings/
      enrollment surfaces with per-state `@ds state:` labels; values unchanged.
- [x] Fence routing, connection, enrollment, and push logic with `@ds guardrail` (presentation only).
      — `@ds guardrail` annotations on every routing/connection/enrollment/push seam; `.tsx`
      comments-only.
- [x] Capture true-390px light/dark of home / review / inbox / enrollment and prove pixel-identity
      against the pre-migration baseline; record evidence in `checklist.md`. — token + rule resolvers
      CHANGED 0 (the one property swap a proven equivalent); 390px no-overflow.
