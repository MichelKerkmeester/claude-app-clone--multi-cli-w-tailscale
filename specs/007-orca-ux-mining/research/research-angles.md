# Research angles — mine orca for our chat + session-selection UX

**Target:** `specs/context/orca-main` (orca v1.4.178-rc.2, stablyai — "Next-gen IDE for parallel agentic development"; Electron + Vite, `mobile/` `native/` `src/`).
**Goal:** copy as much as possible of orca's best UI/UX and chat feature *logic* (where relevant) into our SvelteKit mobile client, **prioritising (1) user chat UX and (2) home-screen session-selection UX**.
**Constraint (frames every idea):** our client is host-authoritative and fail-closed — it holds no editable session metadata. So each ported idea must be either (a) a client-side view affordance over existing DTO fields (`status`, `messageCount`, `updatedAt`, `epoch`), (b) a pure interaction/layout pattern, or (c) an explicit new host-provided field we'd request. Reject ideas that need the client to own mutable session truth.

## Our current state (from an app map of `app-mobile/src`)

**Chat (in-session)** — mature already: growable composer with Send/Steer/Stop/Later, slash autocomplete + palette, model/effort bottom sheet (provider-grouped, search ≥8, swipe-dismiss), Build/Plan mode + plan-review sheets, virtualized transcript with live-edge follow + jump-to-latest+unread-count, streaming "Working…" + stall detect, collapsible evidence groups, todo projection panel, per-answer Copy/Share, full-screen artifact viewer (code/diff/md/text/image/pdf), ask-question ticketed card, rich a11y live regions.
**Chat GAPS:** no message-level menu (long-press, reactions, reply/quote, edit-and-resend, regenerate/retry); no in-conversation search / per-turn nav; no in-chat conversation actions (rename/pin/archive/export/share-thread/new-session); composer is text+photo only (no file/doc, voice/dictation, paste-image, @-mentions, command-arg UI, up-arrow prompt-history); no partial-text typing indicator; no haptics / pull-to-refresh; copy-code lives only in the artifact viewer.

**Home / session-selection** — thin: responsive grid of `session--card` showing only a status pill, an opaque compacted id, `messageCount` "blocks", and coarse `relativeTime`; whole card taps to open. Separate Inbox (attention signals) + Review (approvals) surfaces; global Live/Stale freshness banner.
**Home GAPS:** no search / filter / sort / grouping (no Active/Today/Yesterday/Older); no pin/favorite, swipe actions, multi-select, long-press menu; no unread/attention badge ON the card (attention lives only in Inbox) and no global unread counts; cards lack a human title/summary, last-message preview, agent/model identity, project/repo/branch/cwd, per-session progress, cost/token; no "new session" affordance on home; attention not surfaced on home; coarse time (no live-tick / absolute-on-tap); no pull-to-refresh; flat nav (no tab bar / back-swipe); no skeletons; no peek/preview before opening.

## Angles to investigate in orca (ranked)

1. **Parallel-session surfacing (orca's specialty → our home).** orca runs many concurrent agents — how does it list/group/sort/filter/badge them, what does each row/card show (title, summary, progress, status, identity, diffs/changes), how does it convey "needs you" vs "working" vs "done" at a glance, pin/favorite, swipe/context actions, "new session"? This is the richest source for our session-selection gaps.
2. **Session-card content model.** Exactly which fields orca surfaces per session and how it derives human titles/summaries/previews from raw activity — map each to one of our DTO fields, a client-derived view, or a new host field to request.
3. **Message-level chat interactions.** orca's per-message affordances: context menu, copy-code, reply/quote, edit-and-resend, regenerate/retry, message search, per-turn navigation, timestamps — and the underlying logic (optimistic edit/resend, retry identity, reconciliation).
4. **Composer / input.** orca's input surface: attachments (file/doc/image/paste), voice, @-mentions of files/paths, command-argument UI, prompt history, slash system — patterns portable to our composer.
5. **Streaming & progress logic.** How orca renders streaming/partial output, typing/working indicators, per-task progress, todo/plan projection, and stall/interrupt handling — portable reconciliation/UX logic.
6. **Session → chat transition & navigation.** peek/preview before open, resume-where-you-left-off marker, deep links, nav model (tabs, back-swipe, split), and returning to the list with state preserved.

For each finding: name the orca file/pattern, what it does, the concrete UX/logic to copy, how it maps onto our constraint, and a portability verdict (drop-in view affordance / needs host field / not portable). Weight findings toward angles 1–4 (chat UX + home session-selection UX).
