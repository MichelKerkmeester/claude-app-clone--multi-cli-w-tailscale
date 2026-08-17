# Implementation Summary — Phase 3 — Persistent composer control and keyboard affordance

## Final state

Complete and verified. The persistent host-confirmed Build/Plan control ships beside the composer with a safe two-option menu, composer-scoped `Shift+Tab` / `⌘⇧M`, a Leave-Plan confirmation, announcements, and no optimistic mode state. Web-only; no Execute path. Implemented by DeepSeek v4 Flash Max (via Devin, ~99%) and finished by GPT-5.6 Luna Max (via opencode-go, the not-settled-ready guard); orchestrated and verified by Claude.

## What shipped (web-only)

- **New components:** `PlanModeButton.tsx` (one tab stop after `+`, host-confirmed Build / `Plan · read-only` / `Mode unavailable` / `Checking mode…`, never flashes unconfirmed Build), `PlanModeMenu.tsx` (exactly two rows; opening moves focus only, activation mutates), `LeavePlanSheet.tsx` (Build-exit-from-Plan confirmation; no mutation before `Switch to Build`), `RuntimeModeAnnouncer.tsx` (one polite region + alert; announces once, no focus move), `usePlanModeShortcut.ts` (composer-focus + preference + overlay + composition/repeat/modifier + connected/ready/idle/settled guards; bare `Tab` untouched; `⌘⇧M`; Escape restores focus).
- **Runtime/authority** (`runtime.ts`): a `modeAuthority` projection deriving independent fields (confirmed mode, transition intent, delivery, plan phase, revision, turn state) straight from the committed host snapshot — no optimistic value can leak in. `BLOCKED_MUTATION_PHASES` fails `setMode` closed while checking/pending/stale/offline/forbidden/unsupported/unhealthy/delivery-unknown/running; single-flight `setMode` via a synchronous in-flight ref; fresh one-use ticket on the dedicated plan-control lane; mode never rides `submitPrompt`; uncertain mutations never retry.
- **Wiring/cache/style** (`SessionComposer.tsx`, `App.tsx`, `state.ts`, `relay.ts`, `cache.ts`, `style.css`): control placement after `+`, foreground/resume hydration mandatory, cached history cannot enable controls, Send/Steer/Stop unchanged, responsive/44px/reduced-motion/theme styling on frozen tokens (zero new colors).

## Verification (Claude, in the worktree)

- `npm run typecheck` → exit 0.
- `npm test` → exit 0, 218 passed (218) — backend unchanged.
- `npm run test:web` → exit 0, **431 passed (431)** (+72 new: button/menu/shortcut/announcer/leave-sheet, single-flight, no-optimistic, guards).
- Review (Claude): the not-settled-ready guard is genuinely enforced (`BLOCKED_MUTATION_PHASES`) and tested (plan-mode mutation lane: dedicated-lane `setMode` called once; rapid calls → one in-flight). Zero new colors; no relay/protocol/extension src touched.

## Cross-model note

Devin (DeepSeek) implemented ~99% before its daily quota exhausted mid-debug (430/431). opencode-go's weekly cap had reset, so Luna Max finished the single failing guard — fixing `runtime.ts` (not just the test) so the "zero mode requests while not settled ready" property is genuinely held.

## Frozen contracts

- Design unchanged (frozen tokens; zero new colors).
- Security: `confirmedMode` is host authority; mutations single-flight, one-use-ticketed, disabled outside settled-ready, never via `submitPrompt`, never retried; cached history cannot enable controls; no optimistic toggle; Execute not exposed.

## Deferred

- True-390px CDP captures ride the feature-004 batched visual pass (needs a `demo.ts` mode/plan-status fixture sync). Real-device/VoiceOver is operator-required.
