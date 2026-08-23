# Command discovery and submission

> Slash-command support from host catalog refresh through explicit insertion and fail-closed submission.

---

## 1. OVERVIEW

`commands/` owns the command experience inside the composer. It reads a session-scoped catalog, decides whether a leading slash token is active, ranks matching rows, inserts the canonical command name and carries a scoped binding into submission. Local discovery does not contact the host. `submitSlashDraft` is the only path that can request a ticket and send a command.

### Key Statistics

| Metric | Current behavior |
|---|---|
| Modules | Seven flat TypeScript modules |
| Catalog scope | Host epoch, session id, session revision and catalog revision |
| Matching | Exact, prefix, boundary, substring, subsequence, description and hint tiers |
| Submission rule | One fresh ticket and one envelope, with no retry after submission starts |

---

## 2. FEATURES

### Key Features

| Feature | What It Does |
|---|---|
| Catalog lifecycle | Refreshes the host command list for one session and refuses responses from another scope. |
| Slash trigger | Opens only for a focused leading slash token with a collapsed caret and no active IME composition. |
| Deterministic ranking | Orders matches by tier and preserves host order for ties. |
| Canonical insertion | Replaces the active token with `/${name} ` and returns the new caret offset. |
| Binding retention | Keeps a selected binding through argument edits and clears it when the command token changes. |
| Explicit submission | Rechecks the current row, revisions, connection and runtime authority before sending. |

The draft remains available after a failed or uncertain result. A reader must select the command again after a stale or delivery-unknown outcome.

---

## 3. REQUIREMENTS

| Requirement | Minimum | Notes |
|---|---|---|
| Catalog source | A relay-filtered `CommandCatalogDto` | The lifecycle commits one snapshot for the current session scope. |
| Composer state | Draft text, selection, focus and IME state | `deriveSlashTrigger` uses these values without changing them. |
| Submission authority | Live connection and host-confirmed runtime snapshot | A draft cannot submit while the client is awaiting authoritative state. |
| Binding | `SelectedCommandBinding` from the current snapshot | The send path rejects missing, disabled or stale rows before requesting a ticket. |

---

## 4. STRUCTURE

| File | Role |
|---|---|
| [`commands.ts`](./commands.ts) | Defines catalog states and scoped binding checks. |
| [`host-command-catalog.svelte.ts`](./host-command-catalog.svelte.ts) | Owns session-scoped refresh, cancellation and snapshot commits. |
| [`rank-host-commands.ts`](./rank-host-commands.ts) | Normalizes query text and ranks host command descriptors. |
| [`use-slash-trigger.ts`](./use-slash-trigger.ts) | Detects an active leading slash token. |
| [`insert-slash-command.ts`](./insert-slash-command.ts) | Inserts a command and retains its binding through argument edits. |
| [`plan-mode-shortcut.ts`](./plan-mode-shortcut.ts) | Guards Shift+Tab and the mode-menu keyboard shortcut. |
| [`submit-slash-draft.ts`](./submit-slash-draft.ts) | Validates and submits one explicit slash draft. |
| [`CODE.md`](./CODE.md) | Explains the catalog, draft and transport boundaries. |

---

## 5. USAGE EXAMPLES

| Situation | What happens |
|---|---|
| The composer contains a leading slash | `deriveSlashTrigger` returns an active state with an empty query and token range. |
| The reader types a query | `rankHostCommands` returns rows with match tiers and grapheme ranges for highlighting. |
| The reader selects a row | `insertSlashCommand` writes the canonical name plus a trailing space and returns an announcement. |
| The reader adds arguments | `bindingAfterDraftChange` keeps the binding while the command token remains intact. |
| The reader presses Send | `submitSlashDraft` checks the current snapshot, runtime and connection before one ticketed relay call. |
| The reader uses Shift+Tab | `createPlanModeShortcut` consumes the key only inside the focused composer and only for settled host authority. |

---

## 6. TROUBLESHOOTING

| What You See | Cause | Fix |
|---|---|---|
| No command rows appear | The catalog is loading, stale, unavailable or scoped to another session. | Read the catalog status and refresh the current session scope. |
| A selected command cannot be sent | Its enabled row or one of its revisions changed. | Treat the result as stale and insert a fresh binding. |
| Adding an argument clears the selection | The edit changed the canonical token boundary. | Keep the command name intact and edit after its whitespace boundary. |
| Slash suggestions close while typing | The caret is not in the first token, the input is unfocused or IME composition is active. | Restore focus and a collapsed caret before continuing. |
| A failed send leaves the draft visible | The send lane preserves drafts so an uncertain command is not silently repeated. | Reconcile the host, then select and insert the command again. |

---

## 7. FAQ

**Q: Does ranking change the command sent to the host?**

A: No. Ranking chooses display order. Insertion and submission use the descriptor's canonical `name`.

**Q: Why does a refresh clear another session's command rows?**

A: The snapshot carries the session and host scope. Clearing on a scope change prevents a row from one session being offered in another.

---

## 8. RELATED RESOURCES

| Document | Purpose |
|---|---|
| [`CODE.md`](./CODE.md) | Data flow, ownership rules and exported entrypoints. |
| [Catalog documentation](../catalog/README.md) | Model and effort catalog patterns used by adjacent controls. |
| [State documentation](../state/README.md) | Host-confirmed runtime and connection state. |
| [Transport documentation](../transport/README.md) | Ticketed relay calls used by catalog reads and submission. |
| [Shared layer documentation](../README.md) | The broader shared data and logic boundary. |
