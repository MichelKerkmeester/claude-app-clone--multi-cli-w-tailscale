# commands/: scoped discovery, insertion and submission

---

## 1. OVERVIEW

`commands/` is a flat package with a pure discovery path, one Svelte catalog lifecycle and one guarded write path. It keeps the command row a reader selected tied to the host scope that produced it. The draft can remain local while the catalog refreshes or the host runtime settles.

Current state:

- `commands.ts` holds the snapshot and binding contract.
- `host-command-catalog.svelte.ts` commits only same-scope responses and coalesces refreshes.
- `rank-host-commands.ts`, `use-slash-trigger.ts` and `insert-slash-command.ts` stay local and deterministic.
- `plan-mode-shortcut.ts` handles composer-scoped keyboard guards.
- `submit-slash-draft.ts` is the only module that turns a valid binding into a ticketed command submission.

---

## 2. ARCHITECTURE

The main path preserves scope from the host catalog to the final send:

```text
Relay command catalog -> host-command-catalog.svelte.ts -> ScopedCommandSnapshot
                                  |
                                  v
Draft slash token -> rankHostCommands -> insertSlashCommand -> SelectedCommandBinding
                                  |
                                  v
Current snapshot + runtime authority + live connection
                                  |
                                  v
submitSlashDraft -> requestTicket -> submitSlashCommand -> accepted block or typed failure
```

The trigger predicate and ranking path perform no network work. The host catalog lifecycle owns cancellation and refresh. The submission path revalidates every scope field before requesting a ticket.

---

## 3. PACKAGE TOPOLOGY

The package has two layers and one write boundary:

```text
Pure command types and predicates -> commands.ts, rank-host-commands.ts, use-slash-trigger.ts
Pure draft transforms             -> insert-slash-command.ts
Svelte catalog lifecycle          -> host-command-catalog.svelte.ts
Composer mode shortcut            -> plan-mode-shortcut.ts
Guarded submission                -> submit-slash-draft.ts -> ../transport/relay.ts
```

Allowed dependency direction:

- `host-command-catalog.svelte.ts` reads `commands.ts` and calls the command catalog transport.
- `submit-slash-draft.ts` reads binding rules and calls the relay only after local gates pass.
- `plan-mode-shortcut.ts` reads the runtime authority projection and invokes callbacks supplied by its caller.
- Ranking, trigger detection and insertion remain independent of the relay.

Disallowed dependency direction:

- Ranking must not fetch command data or mutate the draft.
- Insertion must not submit the command.
- A submission must not use a captured snapshot after the current catalog or session scope changes.

---

## 4. DIRECTORY TREE

The folder is flat:

| File | Responsibility |
|---|---|
| [`commands.ts`](./commands.ts) | Snapshot status, binding type and fail-closed snapshot checks. |
| [`host-command-catalog.svelte.ts`](./host-command-catalog.svelte.ts) | Session-scoped catalog fetch and refresh lifecycle. |
| [`insert-slash-command.ts`](./insert-slash-command.ts) | Canonical token replacement and binding retention. |
| [`plan-mode-shortcut.ts`](./plan-mode-shortcut.ts) | Composer focus, overlay and runtime guards for keyboard shortcuts. |
| [`rank-host-commands.ts`](./rank-host-commands.ts) | Grapheme-aware normalization and ranking tiers. |
| [`submit-slash-draft.ts`](./submit-slash-draft.ts) | Draft validation, ticket request and outcome classification. |
| [`use-slash-trigger.ts`](./use-slash-trigger.ts) | Leading-slash trigger predicate and dismissal signature. |
| [`README.md`](./README.md) | Feature orientation for command behavior. |
| [`CODE.md`](./CODE.md) | This code-folder map. |

---

## 5. KEY FILES

| File | Responsibility |
|---|---|
| [`commands.ts`](./commands.ts) | Defines `ScopedCommandSnapshot` and checks that a selected command still belongs to the current enabled snapshot. |
| [`host-command-catalog.svelte.ts`](./host-command-catalog.svelte.ts) | Invalidates old requests on session changes, preserves same-scope rows during refresh and marks scope mismatches stale. |
| [`rank-host-commands.ts`](./rank-host-commands.ts) | Applies exact, prefix, boundary, substring, subsequence, description and hint tiers with host-order tie breaking. |
| [`insert-slash-command.ts`](./insert-slash-command.ts) | Replaces the token range, places the caret after the trailing space and retains a binding through argument edits. |
| [`submit-slash-draft.ts`](./submit-slash-draft.ts) | Checks draft shape, binding revisions, enabled row, connection and runtime authority before one relay submission. |

---

## 6. BOUNDARIES AND FLOW

| Boundary | Rule |
|---|---|
| Snapshot scope | A binding carries host epoch, session id, session revision and catalog revision. |
| Refresh lifecycle | A response commits only when its request is current and its session and host epoch still match. |
| Draft editing | Argument edits retain a binding. Changes to the command token clear it. |
| Runtime gate | Submission requires a live connection, a current runtime snapshot and a non-running turn. |
| Uncertain delivery | Once submission begins, the outcome is `delivery-unknown` and the module never retries it. |

Main flow:

```text
Focus + draft + caret -> deriveSlashTrigger -> query and token range
Command snapshot + query -> rankHostCommands -> visible rows and active name
Selected row -> insertSlashCommand -> draft plus binding
Draft edit -> bindingAfterDraftChange -> retained or cleared binding
Send -> canonicalSlashMessage -> bindingMatchesSnapshot -> local gates
Local gates pass -> fresh ticket -> slash envelope -> accepted block or bounded failure
```

---

## 7. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|---|---|---|
| `useHostCommandCatalog` | Svelte lifecycle | Loads and refreshes one session-scoped command snapshot. |
| `bindingFor` and `bindingMatchesSnapshot` | Functions | Create and validate a canonical binding. |
| `rankHostCommands` | Function | Returns ranked rows and the active command name. |
| `deriveSlashTrigger` and `useSlashTrigger` | Functions | Derive the active slash token from draft and caret state. |
| `insertSlashCommand` | Function | Insert a canonical command and return caret and announcement data. |
| `createPlanModeShortcut` | Function | Return a keyboard handler with composer and runtime guards. |
| `submitSlashDraft` | Async function | Send one explicit command after all fail-closed checks pass. |

---

## 8. VALIDATION

Run from the repository root:

```bash
node "$PWD/scripts/naming/scan-folder-docs.mjs"
```

The folder is healthy when both documents exist and the scan reports no broken references for this folder.

---

## 9. RELATED

- [`README.md`](./README.md)
- [Catalog documentation](../catalog/CODE.md)
- [State documentation](../state/CODE.md)
- [Transport documentation](../transport/CODE.md)
