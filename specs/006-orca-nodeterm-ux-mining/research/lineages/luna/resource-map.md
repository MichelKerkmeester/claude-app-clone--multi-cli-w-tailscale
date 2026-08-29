---
title: Resource map - Orca UX mining Luna lineage
description: Read-only source inventory used by the 20-iteration research loop.
contextType: research
importance_tier: "normal"
trigger_phrases:
  - "luna resource map"
  - "luna packet"
  - "resource map"
version: 1.0.0
---

# Resource map

## Scope

This map inventories source evidence for the detached lineage. Source files are outside the write surface and were read only. The canonical authored packet was not modified; this map is emitted locally under the lineage because the initialized run had no packet-level resource map.

## Charter

- Target: `specs/context/orca-main`
- Surfaces: React Native `mobile/`, Electron `src/renderer/`, shared `src/`
- Consumer: SvelteKit `app-mobile/src`
- Priority: chat UX, then Home session selection
- Constraint: host-authoritative and fail-closed

## Orca mobile selection and navigation

- `specs/context/orca-main/mobile/src/agent-history/agent-history-session-card.ts`
- `specs/context/orca-main/mobile/src/agent-history/agent-history-sections.ts`
- `specs/context/orca-main/mobile/src/agent-history/MobileAgentSessionHistoryList.tsx`
- `specs/context/orca-main/mobile/src/worktree/home-resume-card.ts`
- `specs/context/orca-main/mobile/src/worktree/workspace-list-types.ts`
- `specs/context/orca-main/mobile/src/worktree/workspace-list-sections.ts`
- `specs/context/orca-main/mobile/src/worktree/workspace-list-ordering.ts`
- `specs/context/orca-main/mobile/src/worktree/workspace-view-settings.ts`
- `specs/context/orca-main/mobile/src/storage/preferences.ts`
- `specs/context/orca-main/mobile/src/session/mobile-session-route.ts`
- `specs/context/orca-main/mobile/src/session/active-session-tab.ts`
- `specs/context/orca-main/mobile/src/session/mobile-session-tab-activation.ts`
- `specs/context/orca-main/mobile/src/session/mobile-session-last-tab-close.test.ts`

## Orca shared and Electron selection

- `specs/context/orca-main/src/shared/ai-vault-types.ts`
- `specs/context/orca-main/src/shared/ai-vault-session-filters.ts`
- `specs/context/orca-main/src/shared/ai-vault-session-display.ts`
- `specs/context/orca-main/src/renderer/src/components/AgentStateDot.tsx`
- `specs/context/orca-main/src/renderer/src/components/dashboard/DashboardAgentRow.tsx`
- `specs/context/orca-main/src/renderer/src/components/sidebar/worktree-card-compact-agents.tsx`
- `specs/context/orca-main/src/renderer/src/components/sidebar/WorktreeCardAgents.tsx`
- `specs/context/orca-main/src/renderer/src/components/activity/useActivityUnreadCount.ts`
- `specs/context/orca-main/src/renderer/src/components/right-sidebar/AiVaultSessionRow.tsx`
- `specs/context/orca-main/src/renderer/src/components/right-sidebar/AiVaultSessionDetails.tsx`
- `specs/context/orca-main/src/renderer/src/components/right-sidebar/AiVaultSessionVirtualList.tsx`
- `specs/context/orca-main/src/renderer/src/components/right-sidebar/AiVaultSessionActionMenuItems.tsx`
- `specs/context/orca-main/src/renderer/src/lib/agent-row-primary-text.ts`

## Orca native chat message and rich content

- `specs/context/orca-main/mobile/src/session/MobileNativeChatMessage.tsx`
- `specs/context/orca-main/src/renderer/src/components/native-chat/NativeChatMessageList.tsx`
- `specs/context/orca-main/src/renderer/src/components/native-chat/NativeChatCopyButton.tsx`
- `specs/context/orca-main/src/renderer/src/components/native-chat/native-chat-message-grouping.ts`
- `specs/context/orca-main/src/renderer/src/components/native-chat/use-native-chat-context-menu.tsx`
- `specs/context/orca-main/src/renderer/src/components/native-chat/native-chat-file-link.ts`
- `specs/context/orca-main/mobile/src/session/mobile-native-chat-readability.ts`

## Orca composer, attachments, and drafts

- `specs/context/orca-main/mobile/src/session/MobileNativeChatComposer.tsx`
- `specs/context/orca-main/mobile/src/session/MobileNativeChatComposerSuggestions.tsx`
- `specs/context/orca-main/mobile/src/session/mobile-native-chat-autocomplete.ts`
- `specs/context/orca-main/mobile/src/session/use-mobile-native-chat-file-search.ts`
- `specs/context/orca-main/mobile/src/session/use-mobile-native-chat-image-attachments.ts`
- `specs/context/orca-main/mobile/src/session/mobile-native-chat-image-attachment.ts`
- `specs/context/orca-main/mobile/src/session/use-mobile-native-chat-drafts.ts`
- `specs/context/orca-main/mobile/src/session/use-mobile-native-chat-message-send.ts`
- `specs/context/orca-main/mobile/src/session/use-mobile-native-chat-session-options.ts`
- `specs/context/orca-main/src/renderer/src/components/native-chat/use-native-chat-composer-attachments.ts`
- `specs/context/orca-main/src/renderer/src/components/native-chat/use-native-chat-composer-paste.ts`
- `specs/context/orca-main/src/renderer/src/components/native-chat/use-native-chat-draft.ts`
- `specs/context/orca-main/src/renderer/src/components/native-chat/use-native-chat-composer-keydown.ts`
- `specs/context/orca-main/src/renderer/src/components/native-chat/native-chat-composer-state.ts`

## Orca streaming, prompts, and controls

- `specs/context/orca-main/src/renderer/src/components/native-chat/native-chat-incremental-assembler.ts`
- `specs/context/orca-main/src/renderer/src/components/native-chat/native-chat-live-status.ts`
- `specs/context/orca-main/src/renderer/src/components/native-chat/native-chat-pending.ts`
- `specs/context/orca-main/mobile/src/session/mobile-native-chat-streaming-gate.ts`
- `specs/context/orca-main/mobile/src/session/use-mobile-native-chat-session.ts`
- `specs/context/orca-main/mobile/src/session/use-mobile-native-chat-prompts.ts`
- `specs/context/orca-main/mobile/src/session/use-mobile-native-chat-ask-dismiss.ts`
- `specs/context/orca-main/mobile/src/session/use-mobile-native-chat-stop.ts`
- `specs/context/orca-main/mobile/src/session/use-mobile-native-chat-answer-send.ts`
- `specs/context/orca-main/mobile/src/session/use-mobile-native-chat-terminal-stream.ts`

## Orca executable contract evidence

- `specs/context/orca-main/src/renderer/src/components/native-chat/native-chat-incremental-assembler.test.ts`
- `specs/context/orca-main/src/renderer/src/components/native-chat/native-chat-image-paste.test.ts`
- `specs/context/orca-main/src/renderer/src/components/native-chat/native-chat-file-link.test.ts`
- `specs/context/orca-main/mobile/src/session/mobile-native-chat-draft-reconcile.test.ts`
- `specs/context/orca-main/mobile/src/session/use-mobile-native-chat-send-error.test.ts`
- `specs/context/orca-main/mobile/src/session/mobile-session-last-tab-close.test.ts`
- `specs/context/orca-main/mobile/src/session/use-mobile-native-chat-session.test.ts`
- `specs/context/orca-main/mobile/src/session/use-mobile-native-chat-message-send.test.ts`

## Current client contracts

- `app-mobile/src/pages/home/screen-home.svelte`
- `app-mobile/src/pages/home/README.md`
- `app-mobile/src/pages/chat/README.md`
- `app-mobile/src/shared/transport/cache.ts`
- `app-mobile/src/shared/commands/host-command-catalog.svelte.ts`
- `app-mobile/src/shared/commands/README.md`
- `app-mobile/src/pages/chat/attachments/README.md`
- `app-mobile/src/pages/chat/attachments/use-attachment-submission.svelte.ts`

## Lineage evidence

- `iterations/iteration-001.md` through `iterations/iteration-020.md`
- `deltas/iter-001.jsonl` through `deltas/iter-020.jsonl`
- `research.md`

## Coverage note

The map intentionally lists source pointers rather than copying source content. All cited sources were treated as untrusted read-only data and mapped through the host-authoritative/fail-closed constraint before a finding was promoted.
