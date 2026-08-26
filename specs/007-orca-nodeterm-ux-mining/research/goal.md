# GOAL — Mine orca for our chat + session-selection UX

**Objective.** Copy as much as possible of orca's best UI/UX and chat feature *logic* (where relevant) into our SvelteKit mobile client, **prioritising (1) user chat UX and (2) home-screen session-selection UX**.

**Target.** `specs/context/orca-main` (orca v1.4.178-rc.2, stablyai — "Next-gen IDE for parallel agentic development"). Investigate its `mobile/` React-Native app, its `src/renderer/` Electron UI, and the `src/shared/` filter/display logic it deliberately lifts out for cross-surface reuse.

**Constraint (frames every idea).** Our client is host-authoritative and fail-closed — it owns no editable session metadata. Each ported idea must be either (a) a client-side view affordance over existing DTO fields (`status`, `messageCount`, `updatedAt`, `epoch`), (b) a pure interaction/layout pattern, or (c) an explicit new host-provided field to request. Reject anything that needs the client to own mutable session truth.

**Executors (fan-out — each runs its own full 20-iteration lineage).**
- **Grok 4.6 xhigh, normal speed** → `cursor-grok-4.6-xhigh` via cli-cursor.
- **Luna 5.6 xhigh, fast** → `gpt-5.6-luna`, `model_reasoning_effort=xhigh`, `service_tier=fast`, via cli-codex (OpenAI-backed, authed).

**Loop.** `opencode run --command deep/research` `:auto` `--spec-folder=specs/007-orca-nodeterm-ux-mining` `--max-iterations=20`, **no early convergence** (`--convergence-mode=off --stop-policy=max-iterations`), `NODE_PRESERVE_SYMLINKS=1` (symlink-containment fix). Findings → `specs/007-orca-nodeterm-ux-mining/research/`; full angles in `specs/007-orca-nodeterm-ux-mining/research-angles.md`.

**Angles (ranked; weight to 1–4).**
1. Parallel-session surfacing — orca's many-concurrent-agents list → our thin home/session cards (no search/filter/sort/grouping/badges/preview today).
2. Session-card content model — what orca shows per session (title/summary/preview/progress/identity) → our DTO fields vs. new host fields.
3. Message-level chat interactions — context menu, copy-code, reply/quote, edit-and-resend, regenerate, in-conversation search.
4. Composer/input — attachments, voice, @-mentions, command-argument UI, prompt history.
5. Streaming & progress logic — reconciliation, typing/working indicators, todo/plan projection.
6. Session→chat transition & navigation — peek/preview, resume marker, nav model.

**Per-finding output.** orca file/pattern · the concrete UX or logic to copy · how it maps onto our constraint · a portability verdict (drop-in view affordance / needs a new host field / not portable).

**Autonomy.** Run all 20 iterations per lineage; no early stop. Synthesize `research.md` + a resource map at the end.
