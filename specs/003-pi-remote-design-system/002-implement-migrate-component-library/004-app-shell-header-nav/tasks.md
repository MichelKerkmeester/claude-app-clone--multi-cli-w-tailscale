# Tasks — App shell, header & navigation

- [ ] Map the shell in `App.tsx` (`App`, `Session` composition root, `Header`, `Home`, `Review`,
      `AttentionInbox`, `PushSettings`, `Enrollment`, `StatusPill`) and their current layout/state
      styling in `style.css`.
- [ ] Migrate the app shell and `Session` layout onto tokens and `@ds edit: layout` seams; express
      safe areas and page gutters with tokens and logical properties.
- [ ] Migrate `Header` and `SessionHeader`, labelling their slots (wordmark, nav, theme toggle,
      status) with `@ds slot:`.
- [ ] Migrate each routed surface onto tokens with per-state `@ds state:` blocks for its loading /
      empty / error / stale states and the connection phases.
- [ ] Fence routing, connection, enrollment, and push logic with `@ds guardrail` (presentation only).
- [ ] Capture true-390px light/dark of home / review / inbox / enrollment and prove pixel-identity
      against the pre-migration baseline; record evidence in `checklist.md`.
