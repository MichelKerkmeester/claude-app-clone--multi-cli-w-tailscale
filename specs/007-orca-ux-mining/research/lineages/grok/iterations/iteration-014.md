# Iteration 14: In-chat conversation actions (rename, pin, archive, export, new)

## Focus
Our gap: no in-chat rename/pin/archive/export/share-thread/new-session chrome. Confirm orca's actual surface: slash catalog vs UI.

## Actions Taken
- Re-read Codex slash catalog (`native-chat-slash-commands.ts`).
- Grep native-chat renderer for rename/archive conversation chrome.
- Recall History Resume vs `/resume` CLI.

## Findings

### F-ITER014-SLASH Rename/archive/new/fork/delete are **agent CLI strings** in the Codex catalog
[SOURCE: specs/context/orca-main/src/shared/native-chat-slash-commands.ts:16:18]
[SOURCE: specs/context/orca-main/src/shared/native-chat-slash-commands.ts:46:52]

Catalog comment: CLIs ship no machine-readable list; these track documented TUI commands. `/rename` = "Rename the current thread"; `/archive` = "Archive this session and exit"; `/new` = "Start a new chat"; `/fork`, `/delete`, `/copy` (copy last response as markdown).

**UX to copy:** we already autocomplete host `get_commands`. Showing those strings is **drop-in**. Adding **our own** rename/pin that writes `SessionCardDto` would invent session truth.
**Constraint map:** if the Pi child understands `/rename`, sending it via `prompt.submit` is host-authoritative (the child mutates). A SvelteKit pencil that PATCHes a title locally is **not portable**.
**Verdict:** slash rows for commands the host already lists → **drop-in**. Client-owned rename/pin/archive store → **not portable**. A **host** session-title RPC → **needs a new host field** (same bundle as home `title`).

### F-ITER014-UI No in-chat overflow menu for those verbs on mobile or Electron native-chat
[SOURCE: grep mobile/src/session setTitle: PR title only]
[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/use-native-chat-context-menu.tsx:60:80]

Electron native-chat context menu copies terminal/pane ids, not rename/archive. Mobile has no conversation overflow.

**UX implication:** orca does **not** give us a menu to copy for in-chat session actions. A "…" sheet that **forwards** host commands is a product invention, not an orca port — allowed as chrome over host commands, not as local metadata.
**Verdict:** inventing a chrome sheet that dispatches existing host commands → **drop-in view affordance**. Inventing verbs the host does not expose → **not portable**.

### F-ITER014-NEW Home "New Workspace" is not New Chat; Codex `/new` exits/starts a TUI chat
[SOURCE: specs/context/orca-main/mobile/src/components/MobileHomeQuickActions.tsx:97]
[SOURCE: specs/context/orca-main/src/shared/native-chat-slash-commands.ts:47]

**UX to copy:** a home **New session** control must call a host create-session RPC (we already have session creation elsewhere). Copying New Workspace onto our home would create git worktrees, not Pi sessions.
**Verdict:** New Workspace → **not portable**. Home New session button → **needs host create RPC** (likely already exists off-home). `/new` as typed command → **drop-in** if the child supports it.

## Questions Answered
Home/chat gap "in-chat conversation actions" and "new session on home".

## Ruled Out
- Porting an orca native-chat overflow menu (it does not exist).
- Client-side pin/archive of Pi sessions without a host field.

## Dead Ends
- Renderer context menu looked like a conversation menu; it is pane/terminal identity copy.

## Sources Consulted
- specs/context/orca-main/src/shared/native-chat-slash-commands.ts:16
- specs/context/orca-main/src/renderer/src/components/native-chat/use-native-chat-context-menu.tsx:60
- specs/context/orca-main/mobile/src/components/MobileHomeQuickActions.tsx:97

## Assessment
- newInfoRatio: 0.58
- noveltyJustification: Confirms absence of in-chat action chrome; separates CLI verbs from UI; New Workspace vs New session.
- confidence: high.

## Reflection
- What worked and why: Catalog file-header ("no machine-readable list") explains why these are strings not APIs.
- What did not work and why: Hoped Electron context menu would rename threads.
- What I would do differently: Next, history/home loading/empty/error + stale decay.

## Recommended Next Focus
History/home empty, loading, error, skipped-transcript honesty, 30-minute stale-dot decay, timeAgo without a live tick.
