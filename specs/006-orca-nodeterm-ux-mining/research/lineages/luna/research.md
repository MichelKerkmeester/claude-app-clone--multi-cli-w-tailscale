---
title: Portable Orca UI/UX and chat logic for the SvelteKit mobile client
description: Final synthesis of the detached Luna deep-research lineage.
contextType: research
importance_tier: "normal"
trigger_phrases:
  - "luna research"
  - "luna packet"
  - "research"
version: 1.0.0
---

# Portable Orca UI/UX and Chat Logic

## Executive summary

This 20-iteration lineage mined the read-only Orca `mobile/` React Native and `src/renderer/` Electron surfaces for improvements to the SvelteKit mobile client. The highest-leverage result is a two-surface model:

1. Home becomes an attention-first, searchable, previewable session chooser.
2. Chat becomes a more legible, action-oriented transcript and composer while retaining the client's existing host-authoritative gates.

The portable core is presentation and interaction state: stable card selection, local filtering over supplied fields, bounded peek, pull refresh, message copy, scroll-to-turn, tool folding, attachment/draft chips, autocomplete, prompt history, streaming reconciliation, and explicit accepted/rejected/unconfirmed outcomes. Rich titles, previews, attention/unread reasons, agent/project identity, host follow intent, and authorized artifact references require host-provided fields. Client-owned session metadata, raw-path opening, hostless permission, and unverified message mutation semantics are not portable.

No application, Orca, authored-spec, memory, or git files were modified. All lineage artifacts were written under this directory.

## Scope and method

The research charter required reading `specs/006-orca-nodeterm-ux-mining/research-angles.md` first, weighting chat and home session selection, and classifying every finding as `drop-in view affordance`, `needs a new host field`, or `not portable`. The charter also required all 20 iterations because `stopPolicy=max-iterations`; convergence was telemetry only.

The evidence set covered:

- Orca mobile history, worktree/session selection, route, tab, composer, attachments, drafts, streaming, prompts, and control hooks.
- Orca Electron dashboard, sidebar, AI-vault session rows/filters, native-chat message rows, grouping, copy, file-link routing, and executable tests.
- Current client home/chat/read-only cache/host-command contracts.
- The 20 iteration narratives and JSONL deltas in this lineage.

## Current-state baseline

The research angles characterize the current client accurately: chat already has a growable composer, Send/Steer/Stop/Later, slash palette, model/effort and plan/review sheets, virtualized transcript/live-edge follow, unread/jump-to-latest, stall detection, evidence/todo surfaces, artifact viewing, ask-question cards, and accessibility live regions. The chat gaps are message menus/search/retry/quote, conversation actions, richer composer input, and a few interaction details. Home currently renders status, opaque compact id, message count, coarse relative time, and a freshness indicator; the selection gaps are search/filter/grouping, attention, title/preview/identity, peek, refresh, and navigation polish. [SOURCE: specs/006-orca-nodeterm-ux-mining/research-angles.md:7-13]

The current Home contract deliberately says “Opaque identifiers only. No prompts, paths, or host context” and derives staleness from cache source or a non-live connection. [SOURCE: app-mobile/src/pages/home/screen-home.svelte:56-58,82-110] The cache is bounded and read-only, while host command snapshots reject session/epoch mismatches and mark mismatched data stale. [SOURCE: app-mobile/src/shared/transport/cache.ts:28-62,113-185,191-226] [SOURCE: app-mobile/src/shared/commands/host-command-catalog.svelte.ts:46-70,96-151]

That boundary is a strength. The recommended ports add useful affordances around authoritative snapshots; they do not make the mobile client a second session database.

## Priority 1: Home session selection

### Make the card a scoped projection

Orca's mobile history card and Electron AI-vault row show the value of a structured, host-scanned projection: stable id, status, title/preview, agent or source context, message count, updated time, and optional attention metadata. [SOURCE: specs/context/orca-main/mobile/src/agent-history/agent-history-session-card.ts:7-16,23-67] [SOURCE: specs/context/orca-main/src/shared/ai-vault-types.ts:65-120,151-183] [SOURCE: specs/context/orca-main/src/renderer/src/components/right-sidebar/AiVaultSessionRow.tsx:80-143,185-221,224-246]

Recommended card order:

- Status/attention indicator, with a distinct “needs you” treatment only when the host says so.
- Host-authored title and bounded preview, when supplied.
- Redacted agent/project label, when supplied.
- Existing relative time and message count.
- Explicit Open/Resume affordance and a bounded expanded peek.

The card must carry exact session identity, host epoch, and a monotonic roster/session revision. Missing optional fields produce a simpler card; they are not filled from prompt text, paths, opaque ids, or an unrelated cached transcript.

### Add deterministic selection affordances

Orca's history/worktree surfaces provide the interaction model: section headers, counts, recency ordering, attention-first ordering, stable keys, query filtering, and bounded expanded rows. [SOURCE: specs/context/orca-main/mobile/src/agent-history/agent-history-sections.ts:12-58] [SOURCE: specs/context/orca-main/mobile/src/worktree/workspace-list-sections.ts:40-88,90-116,119-145,146-237] [SOURCE: specs/context/orca-main/mobile/src/worktree/workspace-list-ordering.ts:25-43,45-76,78-123]

Portable behavior:

- Search, filter, sort, and group only over fields present in the current host snapshot.
- Use Active/Needs attention/Today/Yesterday/Older or equivalent sections only when their input fields are known.
- Keep the prior list visible while a refresh or filter input is pending.
- Keep one expanded card at a time; prevent expansion from accidentally navigating.
- Use a single-flight Resume/Open action with row-local pending state.
- Preserve focus and selected-card state by exact session id, not array position.
- Treat pin/favorite as an ephemeral local view preference until the host provides persistence semantics.

The initial host-field request should be deliberately small: `title`, `preview`, `attention` or unread reason, and optional redacted `agent`/project label. Model, branch, cwd, cost, token, pin persistence, and grouping metadata can follow only when their disclosure and revision semantics are explicit.

### Make refresh and stale state confidence-visible

Orca's `RefreshControl` and history list separate loading, empty, error, and row rendering, while the current client already has a stronger stale-cache contract. [SOURCE: specs/context/orca-main/mobile/src/agent-history/MobileAgentSessionHistoryList.tsx:36-40,64-86,107-175] [SOURCE: app-mobile/src/pages/home/screen-home.svelte:82-110]

Copy pull-to-refresh or an explicit refresh control, stable skeleton rows before the first snapshot, and explicit no-match/error states. A refresh is a bounded host roster read. On failure, keep the last valid snapshot marked stale. Cached cards can remain readable, but selecting one must revalidate exact id and epoch before transcript load or any host action.

## Priority 2: User chat UX

### Improve message-row legibility

Orca's mobile message row separates user, agent, and reasoning presentation, offers Copy and scroll-to-turn controls, and folds tool activity beneath agent prose. Its Electron grouping helper supplies deterministic adjacent-block grouping. [SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatMessage.tsx:244-275,277-337] [SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/native-chat-message-grouping.ts:21-46,48-117]

Copy directly into the Svelte transcript:

- Role-aware visual hierarchy for user, agent, and reasoning blocks.
- Message-level Copy with a short confirmation and accessible label.
- “Jump to this turn” where the virtual list can honor it.
- Bounded, expandable tool runs below the prose they support.
- Deterministic block grouping keyed by host message/block identity.

These are settled-transcript view transforms. Local expanded/copy/scroll state may be discarded on session or epoch change. An incomplete or mismatched rich block is unavailable/neutral, never synthesized as successful output.

No supporting Orca implementation was found for regenerate, edit-and-resend, reply/quote, or reactions in the inspected native-chat surfaces. Those should remain explicit backlog questions, not inferred ports.

### Treat rich content and file links as host routes

Orca's file-link resolver requires a known terminal-tab worktree, a known worktree path, and an explicit parsed target; unresolved context returns no route. The mobile message component receives an `onOpenFile` callback rather than opening a path itself. [SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/native-chat-file-link.ts:60-117] [SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatMessage.tsx:277-337]

The client can add explicit image/file/artifact cards with loading, unavailable, denied, and expired states. Taps must use the existing host-authorized artifact viewer or a future session-scoped artifact reference. Raw markdown paths, local URIs, and arbitrary URLs are not permission and must remain inert when no authorized route exists. The current chat already documents bounded viewer verification and unavailable preview states. [SOURCE: app-mobile/src/pages/chat/README.md:75-95]

### Expand the composer without changing authority

The earlier iterations found concrete Orca patterns for pending image chips and image-only sends, image-vs-text paste classification, per-session drafts, toggle/hold dictation state, bounded `@file`/`/command` suggestions, prompt-history recall, and serialized session-option dispatch. The relevant sources are `src/renderer/src/components/native-chat/use-native-chat-composer-attachments.ts`, `use-native-chat-composer-paste.ts`, `use-native-chat-draft.ts`, `use-native-chat-composer-keydown.ts`, and the mobile `use-mobile-native-chat-image-attachments.ts`, `mobile-native-chat-autocomplete.ts`, `use-mobile-native-chat-file-search.ts`, `use-mobile-native-chat-drafts.ts`, and `use-mobile-native-chat-session-options.ts`.

Portable sequence:

1. Keep draft text and pending local attachment chips in ephemeral UI state.
2. Classify paste/selection locally and show accepted, unsupported, or failed visibly.
3. Request host capability/file search or an upload reservation before sending.
4. Carry session id, host epoch, model/capability revision, and draft/prompt revision through submission.
5. Disable or retain the draft on stale, denied, or unknown outcome; never silently drop it.

Dictation and local file paths are not host authorization. Unknown speech RPC, file search, model capability, or command catalog means disabled/refresh, not fallback to a guessed client target. The current client already requires a live connection and current command binding for prompt submission and a current snapshot/capable model for photos. [SOURCE: app-mobile/src/pages/chat/README.md:41-48]

## Streaming, reconciliation, and controls

Orca's incremental assembler uses a fast append path but compares behavior against a full rebuild in tests, including re-emitted ids, source precedence, out-of-order/null timestamps, duplicates, and empty batches. [SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/native-chat-incremental-assembler.ts:1-13,18-41,44-100] [SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/native-chat-incremental-assembler.test.ts:22-43,46-123]

The client can reuse this architecture for transcript assembly and optimistic echoes:

- Keep a canonical rebuild path as the correctness oracle.
- Use incremental appends only for a verified same-session tail.
- Rebuild on out-of-order, duplicate, source-priority, or scope changes.
- Retain unsettled sends as visibly unconfirmed until the host transcript or a definitive response resolves them.
- Fence late results by session id, host epoch, generation, and request identity.

Orca's pending/send tests and the client's existing streaming gate support this same trust model. [SOURCE: specs/context/orca-main/mobile/src/session/mobile-native-chat-draft-reconcile.test.ts:25-48,50-120] [SOURCE: app-mobile/src/pages/chat/README.md:87-95]

For ask/permission cards, require blocked/waiting evidence and a stable ask key; status alone is insufficient. For Stop, expose it only while the host says the session is working, pace an idempotent control request where supported, and represent accepted/rejected/unconfirmed outcomes without duplicate retries. [SOURCE: specs/context/orca-main/mobile/src/session/use-mobile-native-chat-prompts.ts:15-66] [SOURCE: specs/context/orca-main/mobile/src/session/use-mobile-native-chat-stop.ts:43-76,78-144]

## Navigation and session transition

Orca's route helper deliberately passes raw identities to the navigator and separates selected tab, pending tab, snapshot active tab, and explicit follow intent. [SOURCE: specs/context/orca-main/mobile/src/session/mobile-session-route.ts:3-19] [SOURCE: specs/context/orca-main/mobile/src/session/active-session-tab.ts:6-17,19-67]

Use the same seam in SvelteKit:

- Pass opaque ids raw through one route helper and encode once at the router boundary.
- Revalidate the exact id and host epoch on entry.
- Preserve Home's view state while Chat loads, but do not preserve a write-capable command binding across a scope change.
- If a future host follow/deep-link event exists, let its exact intent supersede local selection only after scope validation.
- Retry only idempotent host tab activation after a logical client cutover; never generalize that retry to Send, attachment commit, Answer, or Stop.

The current route callback remains a navigation hint, not session existence proof.

## Portability matrix

| Finding family | Orca evidence | Verdict | Safe boundary |
|---|---|---|---|
| Stable status/count/time card | Mobile history card; current DTO fields | drop-in view affordance | Existing snapshot only |
| Search/filter/sort/group chrome | History/worktree sections and filters | drop-in view affordance | Filter only supplied fields |
| Title/preview/agent/project card content | AI-vault session model and row | needs a new host field | Host-authored/redacted envelope |
| Attention/unread reason on Home | Activity and workspace ordering | needs a new host field | Host-supplied state/reason/revision |
| Expanded peek | Mobile history list | drop-in view affordance | Bounded host preview only |
| Resume/Open single-flight UI | Mobile history card/list | drop-in view affordance | Host validates exact open |
| Pin/favorite persistence | Sidebar/card affordance | needs a new host field | Do not persist locally as truth |
| Pull refresh/loading/empty/error | Mobile history list | drop-in view affordance | Refresh reads host snapshot |
| Message Copy and scroll-to-turn | Mobile native message | drop-in view affordance | Settled transcript only |
| Tool folding and role styling | Native message grouping | drop-in view affordance | Local view state |
| Rich artifact/file card | Native file-link resolver; current viewer | needs a new host field | Authorized artifact reference |
| Arbitrary local file/URL opening | File-link implementation boundary | not portable | No client permission |
| Image chips/paste/image-only send | Native composer/mobile image hooks | drop-in view affordance | Host capability/upload reservation |
| Voice/dictation UI | Mobile composer patterns | drop-in view affordance | Speech backend remains host capability |
| File search and command suggestions | Mobile autocomplete/file search | drop-in view affordance | Host-scoped catalog/search |
| Prompt history recall | Composer keydown/draft hooks | drop-in view affordance | Local draft history, no session truth |
| Incremental transcript assembly | Electron assembler/tests | drop-in view affordance | Full rebuild fallback and scope fence |
| Optimistic echo reconciliation | Mobile draft-reconcile tests | drop-in view affordance | Unknown remains unconfirmed |
| Ask/permission cards | Mobile prompts/dismissal | needs a new host field | Blocked evidence + stable ask key |
| Stop/activation outcomes | Mobile Stop/tab activation | drop-in view affordance | Host action + ambiguous outcome |
| Regenerate/edit/reply/reactions | No inspected native-chat evidence | not portable | Do not infer a contract |

## Minimal host contract proposal

The smallest useful host extension is a session-card envelope, not a client-side metadata cache:

| Field | Purpose | Required semantics |
|---|---|---|
| `sessionId` | Exact target identity | Stable and scoped to host/device |
| `hostEpoch` | Reject data from a replaced host/runtime | Monotonic or opaque equality fence |
| `sessionRevision` | Reconcile card/content changes | Monotonic within the session |
| `status` | Existing coarse runtime state | Host-owned; unknown is not active |
| `updatedAt` / `messageCount` | Existing recency/count display | Informational only |
| `title?` | Human-readable card title | Host-authored or redacted; never inferred client-side |
| `preview?` | Bounded last-message summary | Host-authored/redacted and revision-bound |
| `attention?` | Needs-you/unread/blocked/waiting reason | Explicit enum/reason, not overloaded status |
| `agentLabel?` / `projectLabel?` | Selection identity without raw paths | Host-approved disclosure |
| `capabilities?` | Enable attachment/file/answer/tab affordances | Snapshot-bound; unknown disables |
| `artifactRefs?` | Safe rich-content viewer targets | Session/epoch/revision-bound and expiring as needed |

The roster should also expose whether each optional field is available. The client should not mix a new field from one revision with a prior card snapshot. A host command response should carry the same scope tuple used by the existing command catalog.

## Fail-closed invariants

1. Navigation intent is not authorization.
2. A cached snapshot is readable but never live authority.
3. Client sort, grouping, selection, expansion, draft, and unread position are ephemeral presentation state.
4. Titles, previews, attention, permissions, capabilities, artifacts, action outcomes, and session truth are host-owned.
5. Missing or stale scope disables the dependent affordance and preserves the user's draft/view where safe.
6. Unknown delivery is shown as unconfirmed; it is not silently retried or reported as success.
7. File paths, prompt text, status labels, and opaque ids never become permission by inference.
8. Late async results cannot paint a new session, host epoch, or route.

## Implementation sequence

### P0: Home chooser

- Add pure card projection and deterministic local search/filter/sort/group helpers over existing fields.
- Add stable loading/error/no-match/refresh states, bounded peek, and single-flight Open/Resume chrome.
- Request the minimal host card envelope: title, preview, attention reason, optional redacted identity, epoch/revision.
- Add exact-id/epoch revalidation at the Chat route boundary.

### P1: Chat message and composer polish

- Add message Copy, scroll-to-turn, role-aware row treatment, and bounded tool folding.
- Add pending image/paste chips and visible unsupported/failed states.
- Add per-session draft retention, prompt-history recall, and scoped `@file`/`/command` suggestions.
- Add explicit menu/action placeholders only where a host contract exists; do not invent edit/regenerate/reply/reaction behavior.

### P1/P2: Runtime trust polish

- Use incremental assembly with canonical rebuild fallback and differential tests.
- Preserve unsettled sends, fence late results, and keep live-edge/unread navigation scope-bound.
- Apply ask-card evidence gating and Stop accepted/rejected/unconfirmed outcomes.

## Verification plan for a future implementation

- Unit-test pure card filters against fields absent, stale, duplicated, and reordered.
- Differential-test incremental transcript output against full rebuild for append, duplicate, out-of-order, and scope-change cases.
- Test Home→Chat with removed/reappearing sessions, stale cache, host epoch change, and malformed route ids.
- Test composer scope changes during image upload, file search, command selection, dictation, and send.
- Test unknown action outcomes for Send, Answer, Stop, and artifact open; verify draft/view retention and no duplicate mutation.
- Verify accessibility labels for Copy, Open/Resume, refresh, disabled capabilities, and unavailable artifacts.

## Negative knowledge and explicit exclusions

The final sweep found no evidence supporting native-chat regenerate/edit/reply/reactions, a hostless permission model, client-derived titles/previews, arbitrary local file opening, client-owned unread/pin/archive/rename truth, speech RPC portability, or pane/tab mutation outside an explicit host contract. These are `not portable` as-is. A future host-backed version would be a new contract, not a visual-only port.

## Convergence report

- Stop reason: `maxIterationsReached`.
- Iterations completed: 20 of 20.
- Convergence threshold: 0.05.
- Convergence handling: telemetry only; no early synthesis.
- New-information ratios declined from high first-pass discovery to 0.34 on the final audit, while each late pass added transition, freshness, rich-content, testing, or negative-knowledge coverage.
- Question coverage: 5 of 5 charter questions answered by the combined evidence.
- Source coverage: both Orca `mobile/` and Electron `src/renderer/` surfaces, plus shared models/tests and current client contracts.
- Trusted external evidence: none; this was a local code/document research lineage.

## Iteration evidence index

The complete evidence is preserved in `iterations/iteration-001.md` through `iteration-020.md` and `deltas/iter-001.jsonl` through `deltas/iter-020.jsonl`. The focus progression was:

| Iterations | Coverage |
|---|---|
| 1–5 | Home history cards, peek/resume, ordering, status identity, host card model |
| 6–7 | Message copy, scroll, grouping, context-menu boundaries, non-evidenced mutation gaps |
| 8–12 | Image/paste, dictation, file/command autocomplete, prompt history, session options |
| 13–15 | Incremental streaming, optimistic reconciliation, ask cards, Stop outcomes |
| 16–18 | Route/tab transitions, freshness/refresh/loading, rich content/file-link/readability |
| 19–20 | Executable contracts, host-field prioritization, final rescan and exclusions |

## References

- [Research angles and current-state gaps](../../../research-angles.md)
- [Lineage resource map](./resource-map.md)
- [Current Home surface](../../../../../app-mobile/src/pages/home/screen-home.svelte)
- [Current chat contract](../../../../../app-mobile/src/pages/chat/README.md)
- [Current read-only cache](../../../../../app-mobile/src/shared/transport/cache.ts)
- [Current host command catalog](../../../../../app-mobile/src/shared/commands/host-command-catalog.svelte.ts)
