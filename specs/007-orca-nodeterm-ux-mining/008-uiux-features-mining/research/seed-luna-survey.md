# Iteration 001: Survey orca-main and nodeterm-main UX Affordances

**Date**: 2026-08-27
**Focus**: Survey specs/context/orca-main and specs/context/nodeterm-main for available UX affordances and feature lists relevant to the mobile CLI client app-mobile.

---

## Key Sources Surveyed

1. **orca-main**: `src/preload/api-types.ts` (full PreloadApi surface, 60+ API modules), `src/preload/api/mobile-api.ts`, `src/preload/api/native-chat-api.ts`, `src/shared/native-chat-*.ts` (types, slash commands, agent profiles, session options, empty states, ask types)
2. **nodeterm-main**: `src/preload/index.ts` (full `NodeTerminalApi` surface, 650 lines), `src/renderer/lib/` (facepile, addMenuSpec, agentIcons, kanban, brandPulse), `src/shared/types.ts` (PtyCreateOptions, PtyCreateResult, node kinds), `CLAUDE.md` (comprehensive architecture doc)

---

## FINDINGS

### Finding 1: Rich transcript/subscription API incompatible with current mobile client
[SOURCE: specs/context/orca-main/src/preload/api/native-chat-api.ts:56-71]
The orca-main `NativeChatApi` provides:
- `readSession(agent, sessionId, limit, transcriptPath)` — windowed transcript reads
- `subscribe(args, onFrame)` — live-tail with `snapshot`/`replacement`/`appended` frames
- `NativeChatSubscriptionFrame` with turn lifecycle tracking (`working | completed | interrupted`)
- Messenger block types: `text`, `tool-call`, `tool-result`, `image-ref`

**Verdict: needs-host-field** — the mobile client lacks any live transcript subscription model. The host (orca) already provides the subscription architecture; the mobile client must consume the `subscribe()` + `onFrame` pattern and render `NativeChatBlock[]`.

---

### Finding 2: Slash command catalog exists but is host-bound
[SOURCE: specs/context/orca-main/src/shared/native-chat-slash-commands.ts:20-91]
- Per-agent slash command catalogs exist for claude (6 commands + common), codex (30+ commands)
- `getAgentSlashCommands(agent)` + `getVerifiedNativeChatCommands(agent)` (grok excluded from verified)
- `isSlashCommandDraft(draft)` — prevents optimistic rendering of slash drafts
- `SlashCommandSuggestion{name, description}` for autocomplete UI
- Agent profiles define `skillPrefix` (`$` for codex, `/` for claude/grok) and `groupedSlash` boolean [SOURCE: specs/context/orca-main/src/shared/native-chat-agent-profiles.ts:11-32]

**Verdict: drop-in** — the shared types in `native-chat-slash-commands.ts` and `native-chat-agent-profiles.ts` are pure data, no Electron/React dependencies. Mobile can import directly and render `/command` autocomplete suggestions from the agent catalog.

---

### Finding 3: Session options framework (model/thought-level/mode) is portable
[SOURCE: specs/context/orca-main/src/shared/native-chat-session-options.ts:1-65]
- `SessionOptionDescriptor` with `select` or `boolean` kind, `category` (model | thought_level | model_config | mode), `settable` flag, `disabledReason`, `action` (agent-picker, toggle-command)
- `SessionOptionSetResult` with snapshot
- `PersistedNativeChatSessionOptions` for per-model option persistence

**Verdict: needs-host-field** — session option discovery is host-driven (`getSnapshot()`). Mobile needs to expose these through a settings/composer panel, but the host provides the data shape.

---

### Finding 4: Empty/loading/error state copy is drop-in ready
[SOURCE: specs/context/orca-main/src/shared/native-chat-empty-state.ts:9-38]
- `formatNativeChatEmptyStateCopy(kind, agentLabel)` resolves `loading | empty | error | notAgent` states
- Pure function, no platform dependencies, returns `{title, subtitle}`

**Verdict: drop-in** — mobile can import and render immediately for any chat/transcript view.

---

### Finding 5: Agent status mirror protocol targets the mobile companion
[SOURCE: specs/context/nodeterm-main/CLAUDE.md — "Hook server" section]
The nodeterm-main `agent-status-mirror.ts` feeds the mobile companion with:
- `NormalizedAgentEvent` with 4-state model: `working | waiting | blocked | done`
- Per-node `agentStatus` including `state, agentId, unread, session, sessionId, loop, hibernated`
- Settings block with `claudePermissionMode`, `autoSupported`, `claudeAccounts`
- SSH slices get per-host settings via `remote-status-push`

**Verdict: needs-host-field** — the mirror exists on the host side. Mobile must consume the event stream and display agent state badges. The `agent-status-mirror` carries optional settings so the phone can launch agents with desktop permission mode + managed accounts.

---

### Finding 6: Nodeterm's rich node kind system has no mobile analogue
[SOURCE: specs/context/nodeterm-main/src/shared/types.ts — node kinds from CLAUDE.md]
Nodeterm supports 13+ node kinds: `terminal`, `sticky`, `group`, `editor`, `diff`, `video`, `web`, `browser`, `dino`, `subagent`, `loop`, `chat (removed)`, `agent`. Each carries distinct UI behavior:
- `group` frames with nesting, `NodeResizer`, `fitGroupToChildren`
- `editor` with Monaco code editor, markdown preview toggle, image preview
- `diff` with staged/unstaged git diff modes
- `browser` with navigable Chromium webview

**Verdict: not-portable** — the mobile client has no canvas. These node kinds are Electron/React-Flow-specific. Mobile attaches to tmux sessions over Transport protocol, so it only sees terminal sessions. Group/editor/diff/browser nodes are unreachable from mobile.

---

### Finding 7: File drop, OSC 52 copy, and clipboard patterns available via host
[SOURCE: specs/context/nodeterm-main/src/preload/index.ts:293-297, CLAUDE.md "Terminal node lifecycle" section]
- `clipboard.writeText(text)` and `clipboard.writeFiles(paths)` IPC
- `getPathForFile(file)` for Electron File API
- OSC 52 clipboard handler writes system clipboard, floats "Copied N lines" pill
- File drop handling in `terminal/file-drop.ts`

**Verdict: needs-host-field** — host provides clipboard and file-drop APIs. Mobile needs its own copy/ paste/upload surface, potentially consuming the same OSC 52 stream from the remote transport.

---

### Finding 8: Facepile/presence system is desktop-only
[SOURCE: specs/context/nodeterm-main/src/renderer/lib/facepile.ts:1-127]
The `facepileEntries()` function and `FacepileEntry` type support:
- Per-peer avatar with initials, color, `isPhone` flag
- Project-aware labeling ("Ada · api" for off-project peers)
- Click targets: `node | project | null`
- Separate awareness of phone vs desktop peers

**Verdict: not-portable** — the presence system is canvas-bound (peer coordinates, node id references). Mobile does not have a canvas, so cross-project presence makes no sense on a phone. Mobile would need its own simplified "who's online" surface.

---

### Finding 9: NativeChatImageRefBlock enables image reference in chat
[SOURCE: specs/context/orca-main/src/shared/native-chat-types.ts:54-59]
`NativeChatImageRefBlock` with `path`, `url`, and `alt` fields. Part of the `NativeChatBlock` union alongside text, tool calls, and tool results.

**Verdict: drop-in** — mobile can render image references from the chat transcript using the `url` field for remote images and potentially `path` for file references. The block model is portable.

---

### Finding 10: AskUserQuestion prompt types define interactive permission model
[SOURCE: specs/context/orca-main/src/shared/native-chat-ask-types.ts:1-15]
- `AskQuestion{question, header, multiSelect, options}` with `AskOption{label, description}`
- `InteractiveQuestionParser` — parses agent tool input to normalized prompts
- Codex and Claude have distinct permission/dialog models

**Verdict: needs-host-field** — the permission prompt rendering depends on host-side parsing of the agent's tool input. Mobile must expose these as permission dialogs but needs the `AskPrompt` data from the host.

---

### Finding 11: AddMenuSpec centralized node creation spec
[SOURCE: specs/context/nodeterm-main/src/renderer/lib/addMenuSpec.tsx:42-72]
- `CONTENT_ADD_ITEMS` — canonical list: terminal, remote, browser, web, sticky, dino, open-file, new-file, spawn-team, worktree
- `AddCtx` with `hasCwd` and `isSshProject` for conditional filtering
- Two render adapters: `contentAddItemsToMenuItems` and `contentAddItemsToDockRows`

**Verdict: not-portable** — creation UX is bound to desktop node kinds and the React Flow canvas. Mobile has its own session attachment model and no canvas node creation.

---

### Finding 12: Agent icon/brand system is ready
[SOURCE: specs/context/nodeterm-main/src/renderer/lib/agentIcons.tsx:97-111]
- `AgentIcon(agentId, size)` resolves agent icons via `brandLogoSrc()` and `capabilityAgentId()`
- Supports claude, codex, gemini, grok, copilot, opencode with branded logos
- Defaults to `IconTerminal` for unrecognized agents
- `BrandPulse` for RUNNING badge indicators

**Verdict: drop-in** — pure rendering logic for agent icons can be ported or shared. Mobile needs a similar icon resolver for its session list and card views.

---

### Finding 13: Nodeterm settings store exposes rich configuration
[SOURCE: specs/context/nodeterm-main/src/preload/index.ts:144-147, 369-381]
- `settings.load()` / `settings.save()` — full settings CRUD
- `license` API (upgrade, activate, deactivate, status, detail)
- `announcements.fetch()`, `updates` API (check, progress, restart)
- `usage` API (fetch, refresh, providers, remote, cookie-providers)

**Verdict: needs-host-field** — these are host-side IPC calls. Mobile needs equivalent settings, license, and usage surfaces, either through the host transport or mobile-native equivalents.

---

### Finding 14: Nodeterm's dialog/file system is full-featured
[SOURCE: specs/context/nodeterm-main/src/preload/index.ts:140-143, 227-241, 303-316]
- `dialog.selectFolder()` / `dialog.selectFile()`
- `fs.read/write/mkdir/exists/list/readBinary`
- `files.quickOpen`, `files.downloadTicket`, `files.saveUpload`, `files.saveCanvasImage`
- `sshFs` with full remote filesystem CRUD for SSH projects
- `media.allow(absolutePath)`, `media.allowSsh`, `media.writeHtml`

**Verdict: not-portable** — these are Electron IPC async invocations over the main-process filesystem. Mobile has no local filesystem access model. The SSH filesystem operations would need a mobile-native file service.

---

### Finding 15: Host-authoritative fail-closed constraint shapes which UX patterns transfer
[INFERENCE: from the research brief and known architecture]
The mobile client cannot override host UI decisions. This means:
- Transcript display is read-only (host drives lifecycle)
- Agent state comes from host-side hooks, not local parsing
- Permission mode must be relayed from host settings
- Session options (model, mode) must request host-side changes
- File attachments must be tunneled through host

---

## Summary Table

| Finding | Verdict | Category |
|---------|---------|----------|
| 1: Transcript subscription API | needs-host-field | Chat/Transcript |
| 2: Slash command catalog | drop-in | Chat/Composer |
| 3: Session options framework | needs-host-field | Settings |
| 4: Empty/loading/error state copy | drop-in | UI Copy |
| 5: Agent status mirror protocol | needs-host-field | Agent State |
| 6: Node kind system | not-portable | Navigation |
| 7: Clipboard/file drop | needs-host-field | Input |
| 8: Facepile/presence | not-portable | Social |
| 9: Image ref in chat | drop-in | Chat/Rich Content |
| 10: Interactive permission prompts | needs-host-field | Permissions |
| 11: AddMenuSpec node creation | not-portable | Navigation |
| 12: Agent icon system | drop-in | Visual |
| 13: Settings/license/usage | needs-host-field | Settings |
| 14: Dialog/filesystem | not-portable | File Operations |
| 15: Host-authoritative constraint | INFERENCE | Architectural |

---

## Questions Answered

- [x] What user-facing capabilities exist in orca-main/nodeterm-main? Cataloged 15 findings across chat, navigation, permissions, settings, file ops, agent state, social presence
- [x] What chat/transcript affordances does the host offer? NativeChat subscription with live-tail, block types (text/tool-call/tool-result/image-ref), turn lifecycle, session options
- [x] What home/navigation patterns exist? Canvas-bound node kinds, add-menu spec, facepile presence — specific to desktop

## Questions Remaining (carried forward)

- [ ] How do orca/nodeterm handle streaming, interruptions, and error states differently from the mobile client? (Need to look at renderer terminal node lifecycle details)
- [ ] What keyboard/input affordances exist beyond slash commands? (Need markdown toolbar, autocomplete patterns)
- [ ] What notification/status awareness features exist? (Need notification dispatch, badge counts, unread dots)

## Edge Cases

- **Ambiguous input**: Agent profiles are partial — not every agent type has a profile, and `getNativeChatAgentProfile` returns null for unknown agents. Mobile must handle null profiles gracefully.
- **Contradictory evidence**: nodeterm's `isVerifiedNativeChatCommands` excludes grok from slash command verification, but agent profiles include grok. Mobile needs to respect the verification gate.
- **Missing dependency**: Mobile cannot access Electron IPC or the nodeterm core services. The `needs-host-field` findings require mobile to request data through the Transport protocol, which may not be wired for all query types.

## Recommended Next Focus

Analyze nodeterm-main's terminal node lifecycle, streaming/error handling patterns, and notification system to answer the remaining questions about streaming, interruptions, and status awareness.
