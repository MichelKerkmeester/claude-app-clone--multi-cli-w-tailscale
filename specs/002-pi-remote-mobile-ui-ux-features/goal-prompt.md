# Spec 002 — Goal Prompt

> Short-form intent. Long-form: [`goal.md`](goal.md). Full build state + how-to: [`handover.md`](handover.md).

**Product.** Pi Remote — an installable iPhone PWA that remote-controls the `pi` coding agent on a Mac over a private Tailscale tailnet. Monorepo: `packages/pi-rpc-protocol`, `apps/pi-remote-relay`, `apps/pi-remote-web` (React 19 + Vite + Tailwind 4 + React Aria), `extensions/pi-remote-*`. Secure foundation shipped in sibling packet `001`.

**Goal.** Bring the mobile chat — interaction UX and visual styling — to the quality bar of the Claude iOS app and the Kimi Code app, and add the first-class agent controls `pi` exposes on the desktop terminal but the phone lacks. Do this without weakening two frozen contracts.

**Frozen — design.** Ink-on-parchment: bone `#f8f8f6` / carbon `#24221f` / clay `#d97757`; Inter + Source Serif 4; light + dark; WCAG AA. Not changed by this packet.

**Frozen — security.** Read-only by default; one-use ticketed + revision-checked mutations that fail closed; redaction everywhere (allowlist, not blocklist); host/extension-enforced plan mode; content-free push; operator-only `--full-access` the phone can never enable. UI-only unless a feature inherently needs a new lane — then flagged, designed security-first, and hard-gated on an adversarial review.

**Iron constraint.** Claude ORCHESTRATES + VERIFIES; external models IMPLEMENT all app code. Claude never writes code under `apps/`/`packages/`/`extensions/`; it authors spec docs and runs builds/verification/git.

**Structure.** One phase per feature, research-first. Each feature is a phase-parent; `research/research.md` is the build-ready decision; build sub-phases start at `002-`, one per phase in `implementation-phases.md`, each independently shippable and verifiable.

**Features (build order = phase number).**
1. `001-change-model` — host-authoritative model switcher; confirm = one-use revision-bound ticket. ✅
2. `002-change-effort` — effort picker in the canonical model/effort sheet; non-optimistic. ✅
3. `003-slash-commands` — composer `/` autocomplete from the relay's live catalog; mutates nothing until Send. ✅
4. `004-plan-mode-tab` — host-confirmed mode button + structured Plan lifecycle + composer `Shift+Tab`. ✅
5. `005-file-preview` — redacted file card + full-screen read-only viewer over immutable snapshots; the viewer shell others reuse. ✅
6. `006-rich-content-blocks` — bash Command/Output cards + code/text artifact cards (Copy + full-screen), reusing `005`. ✅
7. `007-media-upload` — iOS gallery upload; new binary lane (user→pi), security-first, hard-gated. 🔓 gate cleared, build next
8. `008-inbound-media` — preview media `pi` sends, inline; new inbound lane (pi→phone), security-first, hard-gated, reuses `005`.
9. `009-ask-question` — inline question card for `pi`'s ask-question; answering is a one-use revision-bound ticketed mutation; hard-gated.
10. `010-todos` — read-only inline projection of `pi`'s todo/plan list (phone never mutates it); grouped states, progress, live updates.

**Progress.** 6/10 built + merged to `main` (23/40 build phases; `main` `07bd02f`). 007's hard-gate review is done (approved; two decoder must-fix items in `007-media-upload/adversarial-security-review.md`) — build starts at its Phase 1. 008–010 pending (008/009 hard-gated). Sibling `specs/003-design-system-library/` (designer-editable design system, planning scaffold) also on `main`.

**Build model.** One build phase per external-model dispatch, verified INDEPENDENTLY outside any sandbox (typecheck + `npm test` + `test:web` + `build`) plus an adversarial review of the diff and true-390px light/dark CDP, then committed per-phase and merged per-feature. Routes rotate on quota (see `handover.md` §5). Hard-gated features get a Claude adversarial security/redaction review of the spec BEFORE any build phase.

**Done.** All 10 features built, verified, merged; per-feature light+dark 390px screenshots; no frozen-contract weakened; every hard-gate + new-lane enablement review passed. The mobile chat visibly reaches the Claude/Kimi bar with first-class agent controls.
