# Commands

Slash-command handling from host catalog refresh through ranking, insertion, trigger detection, and one explicit submission. This folder is separate because command selection has its own scoped binding and stale-catalog rules; it is not generic composer state and it is not relay transport.

## What lives here

- **`commands.ts` / `host-command-catalog.svelte.ts`** — the scoped snapshot and binding types, fail-closed binding checks, and the session-scoped in-memory catalog lifecycle.
- **`rank-host-commands.ts`** — pure normalization and deterministic ranking across names, aliases, boundaries, substrings, subsequences, descriptions, and hints.
- **`use-slash-trigger.ts`** — the pure leading-slash predicate, including caret, focus, IME composition, and Escape dismissal handling.
- **`insert-slash-command.ts`** — canonical `/${name} ` insertion, caret placement, announcement text, and binding retention while arguments are edited.
- **`submit-slash-draft.ts`** — the fail-closed submission pipeline that validates the draft, current binding, catalog row, connection, and host runtime before requesting one ticket and sending one command.

## Why it's shaped this way

- **Selection is local and harmless.** Ranking, trigger detection, and insertion do not perform network work or mutate host state.
- **Bindings carry scope.** A selected command is tied to host epoch, session, session revision, and catalog revision so a reconnect or refresh cannot send another scope's row.
- **Submission has one narrow write boundary.** Only `submitSlashDraft` may turn a valid binding into a ticketed host submission, and failures preserve the draft for deliberate reselection.

Structure, binding rules, and command do-nots are in `CODE.md`.
