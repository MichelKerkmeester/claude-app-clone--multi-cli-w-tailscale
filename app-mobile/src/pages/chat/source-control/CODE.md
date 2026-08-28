# source-control/: code map

## Topology

```text
source-control/
+-- source-control-types.ts       # Explicit client input contracts
+-- source-control-hub.svelte     # Segment composition and safe fallback
+-- pr-chip.svelte                # Pull-request summary affordance
+-- sheet-pr-details.svelte       # Read-only pull-request details
+-- check-summary.svelte          # Classified aggregate with unresolved guard
+-- check-list.svelte             # Host-ordered per-check disclosure rows
+-- changed-files.svelte          # Changed-file list and shared diff readout
+-- commit-history.svelte         # Lazy commit file expansion
+-- upstream-status.svelte        # Host upstream snapshot
+-- conflict-list.svelte           # Provider and local conflict provenance
+-- reviewer-list.svelte          # Host reviewer rows
`-- *.stories.ts                 # Inert catalog stories without host data
```

## Data boundary

`source-control-types.ts` is the only contract owned by this folder. Components accept optional models and an optional capability flag. Missing models and disabled capabilities render no markup. No component imports a relay store or protocol DTO.

The host supplies display labels, check classifications, check ordering, reviewer status, upstream counts, conflict source and URLs. The client only applies presentation and local disclosure state. It never computes a check verdict, derives ahead or behind values, merges conflict sources or constructs a provider URL.

## Flow

`source-control-hub.svelte` selects only segments with host-backed data. A requested segment without data falls back to the first available segment. The Changes view mounts `changed-files.svelte`, conflicts and upstream status. The PR view mounts the chip, details sheet, check summary, check rows and reviewers. The Commits view mounts lazy history and upstream status.

`changed-files.svelte` imports `parseUnifiedDiff` from `../artifacts/diff-preview.svelte` and mounts `DiffPreview`; it does not maintain a second parser. `commit-history.svelte` shows a loading or failure state until the host reports a file expansion result.

## Validation

Run the source-control component test at [`source-control.svelte.test.ts`](../../../../tests/source-control.svelte.test.ts). Run the web typecheck, targeted ESLint, full `test:web`, build and token identity verification from the repository root.
