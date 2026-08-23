# `commands/` — structure & logic

Editor map. For *what/why*, see `README.md`.

## Shape

- **`commands.ts`** — `ScopedCommandSnapshot`, `SelectedCommandBinding`, `bindingFor`, and `bindingMatchesSnapshot`.
- **`host-command-catalog.svelte.ts`** — `useHostCommandCatalog`; request identity, same-scope commits, stale-after timing, queued refreshes, and connection/session effects.
- **`rank-host-commands.ts`** — `normalizeCommandText`, `commandGraphemes`, `rankHostCommands`, `RankedHostCommand`, and match tiers with grapheme ranges.
- **`use-slash-trigger.ts`** — `slashDismissalSignature`, `deriveSlashTrigger`, and the stateless `useSlashTrigger` wrapper.
- **`insert-slash-command.ts`** — `insertSlashCommand` and `bindingAfterDraftChange`; text replacement is synchronous and returns the caret offset.
- **`submit-slash-draft.ts`** — `canonicalSlashMessage` and `submitSlashDraft`; pre-submit failures and post-submit uncertainty are classified separately.

## Do-not

- **Don't submit a binding captured from an old snapshot.** Revalidate host epoch, session, session revision, catalog revision, and enabled-row presence with `bindingMatchesSnapshot`.
- **Don't let ranking or insertion call the relay.** Those modules are pure local behavior; host-visible work belongs only in `submitSlashDraft`.
- **Don't fuzzy-correct a command name.** `rankHostCommands` may rank deterministic matches, but the canonical host name remains the inserted and submitted token.
- **Don't clear a binding for argument edits.** `bindingAfterDraftChange` retains it after the token boundary; editing the command token itself must clear it.
- **Don't retry a started submission.** Once the ticket or envelope path begins, an uncertain result stays `delivery-unknown` until the caller reconciles and inserts again.
