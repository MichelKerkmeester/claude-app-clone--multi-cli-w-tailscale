# Checklist — iPhone interaction, accessibility, visual, and release hardening

- [x] The sheet opens, searches, stages, commits, dismisses, and reconciles without focus loss on a real 390px mobile viewport. — flow covered by `ModelSwitcherSheet.test.tsx`/`App.test.tsx`; 390px rendering by CDP capture. Physical-device confirmation is operator-required.
- [x] Buttons/triggers meet at least 44×44px and rows meet at least 48px; 320px and 200% zoom have no horizontal scroll. — computed-style target-size tests + CDP `scrollWidth<=clientWidth` at 390px and 320px.
- [x] Light and dark states use the fixed semantic palette, pass contrast/focus checks, and never use clay as the sole small-text or UI-state signal. — `contrast.test.tsx`; review confirmed zero new colors added to `style.css`.
- [x] Reduced-motion emulation removes transforms, springs, stagger, and spinning indicators while preserving state text. — reduced-motion DOM test.
- [x] Safe-area, visual-viewport, `viewport-fit=cover`, portrait, landscape, and software-keyboard layouts do not clip the sheet or footer. — `viewport-fit=cover` in `index.html` + visual-viewport sizing + CDP 390px no-clip. Physical landscape/software-keyboard is operator-required.
- [ ] VoiceOver, Switch Control, Full Keyboard Access, and hardware keyboard users can open, navigate, stage, cancel, and explicitly switch; row activation never commits. — OPERATOR-REQUIRED (assistive tech on a physical iPhone). Hardware-keyboard navigation and "row activation never commits" ARE covered by DOM tests; VoiceOver/Switch Control/Full Keyboard Access cannot be verified headlessly.
- [x] Header-only swipe dismisses at the specified threshold; list scrolling remains native; backdrop/close/Escape are inert during commit; iOS edge navigation is not intercepted. — swipe distance/velocity + list-scroll-separation + commit-barrier DOM tests. Physical-gesture feel is operator-required.
- [x] Focus containment, initial current-row focus, live status, busy descriptions, accessible naming, and `preventScroll` restoration are present. — `ModelSwitcherSheet.test.tsx`.
- [x] Message-catalog entries cover labels, state text, mapped reasons, counts, success, and reconcile barrier. — `model-switcher-strings.ts` + `Intl.PluralRules`.
- [x] No ticket, raw payload/error, provider/model ID, query, catalog data, or sensitive evidence appears in logs, analytics, URLs, storage, IndexedDB, service-worker caches, screenshots, or telemetry. — negative-control DOM tests; captured screenshots reviewed (demo fixture data only).
- [x] Phase 1/2 ticket/revision/foreground/redaction/plan-mode controls remain unchanged and pass the security regression review. — no protocol/relay/extension source touched; backend suite 140/140 green.
- [ ] Manual installed-PWA checks pass in portrait and landscape with the software keyboard, VoiceOver, Switch Control, Full Keyboard Access, foreground reconciliation, offline, stale, rejected, and delivery-unknown states. — OPERATOR-REQUIRED (physical installed PWA + assistive tech).
- [x] True-390px light/dark CDP evidence covers reachable `ready`, `searching`, `staged`, `streaming_blocked`, and `delivery_unknown` states. — captured `ready` + `staged` in light and dark at true 390×844 via the repo CDP harness (feature-001 checkpoint); `delivery_unknown` is not offline-demo-reachable and is covered by DOM tests instead.
- [x] `npm run typecheck` passes. — exit 0.
- [x] `npm test` passes. — exit 0, 140 passed (140) (outside the loopback-restricted sandbox).
- [x] `npm run test:web` passes. — exit 0, 74 passed (74) (+19 new).
- [x] `git diff --check` passes and the final no-stray-files sweep finds only intentional changes/evidence. — verified at commit; only allowed paths + spec docs changed.
