# Iteration 20: Final angle rescan and portability audit

## Focus

Perform the required final independent pass over all ranked angles, the current-state gaps, the 19 preceding passes, and the host-authoritative/fail-closed constraint. Convergence is recorded as telemetry only; synthesis follows this pass.

## Findings

### F-LUNA-020-A — Prioritize home selection and chat as two cooperating, scope-fenced surfaces

**Orca file/pattern:** The final cross-surface pattern is the combination of `mobile/src/agent-history/MobileAgentSessionHistoryList.tsx:64-86,107-175`, `mobile/src/worktree/workspace-list-sections.ts:40-88,90-116,119-145`, `mobile/src/worktree/workspace-list-ordering.ts:25-43,45-76,78-123`, and `src/renderer/src/components/native-chat/NativeChatMessageList.tsx:70-98,200-220,236-279`. Orca separates attention-first session selection from bounded, virtualized chat content.

**Copy:** Make Home the attention-first chooser: reserved Resume slot, host card title/preview/attention when available, search/filter/sort/group over the current snapshot, safe peek, stable refresh, and exact-id route transition. Make Chat the action surface: message copy/scroll/tool fold, draft and attachment chips, command/file suggestions, prompt history, stream reconciliation, ask/Stop outcomes, and unread/live-edge navigation. Preserve roster and transcript scopes independently when moving between them.

**Constraint mapping:** Home presentation is informational until exact session revalidation. Chat actions are disabled whenever connection, session id, host epoch, capability, or revision is unknown. Local sort, expansion, draft, unread position, and selected card are ephemeral UI state; host status, content, permissions, titles, previews, and action outcomes remain host-owned.

**Verdict:** `drop-in view affordance` for the split-surface interaction model; host-authored card content and attention state `need a new host field`.

### F-LUNA-020-B — Preserve a strict negative-knowledge boundary in the implementation backlog

**Orca file/pattern:** The source sweep and tests confirm concrete implementations for selection rows, status dots, message grouping, copy, attachments, autocomplete, prompt history, incremental assembly, draft reconciliation, and guarded control outcomes. The sweep found no native-chat implementation that establishes portable regenerate/edit/reply/reaction behavior, no hostless permission model, and no safe arbitrary local-file or client-owned session-metadata path.

**Copy:** Record these absences as explicit backlog exclusions. Do not invent message mutation actions, unread authority, pin persistence, conversation rename/archive, arbitrary file opening, speech RPC, or local title/preview derivation while implementing the portable set. Add a host contract first for any item that changes what the user believes about session state or permits a host action.

**Constraint mapping:** Unknown capability is disabled, not approximated. Unknown content is unavailable, not guessed. Unknown delivery is unconfirmed, not reported as success. This rule applies equally to a polished home card, a chat menu, an attachment chip, and a Stop button.

**Verdict:** `not portable` for client-owned mutation/authority ideas; future host-backed variants `need a new host field` or command contract.

## Negative knowledge

- Convergence below the threshold before iteration 20 was telemetry, not permission to synthesize early.
- No final rescan evidence supports client-derived titles, raw-path opening, native-chat regenerate/edit/reactions, or hostless unread/pin state.
- A polished visual affordance must not hide that the current home DTO intentionally exposes only status, message count, updated time, and opaque id.

## Questions answered

- All five research questions are answered by the combined evidence; the remaining work is implementation and host-contract design, not more source mining.
- The highest leverage order is home card/attention/selection, then chat message/composer affordances, then streaming/control polish, with host fields isolated as explicit dependencies.

## SCOPE VIOLATIONS

None.

## Assessment

- newInfoRatio: 0.34
- Novelty: final audit confirms the priority order and records absence of evidence as negative knowledge rather than inventing portability.
- Status: complete; max-iterations reached

## Next Focus

Synthesis of all 20 iterations.

[SOURCE: specs/007-orca-ux-mining/research-angles.md:3-24]
[SOURCE: specs/context/orca-main/mobile/src/agent-history/MobileAgentSessionHistoryList.tsx:64-86,107-175]
[SOURCE: specs/context/orca-main/mobile/src/worktree/workspace-list-sections.ts:40-88,90-116,119-145]
[SOURCE: specs/context/orca-main/mobile/src/worktree/workspace-list-ordering.ts:25-43,45-76,78-123]
[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/NativeChatMessageList.tsx:70-98,200-220,236-279]
[SOURCE: app-mobile/src/pages/home/screen-home.svelte:82-103]
[SOURCE: app-mobile/src/pages/chat/README.md:41-48,75-95]
