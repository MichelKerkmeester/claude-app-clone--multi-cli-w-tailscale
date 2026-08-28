# Source control

> Read-only source-control evidence for a chat session when the host supplies the corresponding capability and data.

## What this folder does

This folder renders pull-request summaries, classified checks, changed files, commit history, branch sync status, conflict provenance, reviewer status and the three source-control views. It owns only presentation and local disclosure state. It does not call the relay, infer repository state or mutate a patch.

Every surface is inert when its optional input is absent or its capability is disabled. The input contracts live in [`source-control-types.ts`](./source-control-types.ts) and are intentionally separate from the relay protocol.

## Where to start

- [`source-control-hub.svelte`](./source-control-hub.svelte) composes the Changes, PR and Commits segments.
- [`pr-chip.svelte`](./pr-chip.svelte) opens [`sheet-pr-details.svelte`](./sheet-pr-details.svelte).
- [`changed-files.svelte`](./changed-files.svelte) opens the shared [`diff-preview.svelte`](../artifacts/diff-preview.svelte) in a read-only view.
- [`commit-history.svelte`](./commit-history.svelte) defers per-commit file expansion.

## Boundaries

Host data is passed in through explicit component props. Provider URLs are used only when supplied by the host. The client does not construct provider links, calculate check verdicts, guess upstream state or expose patch-apply controls.
