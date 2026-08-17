# Tasks — Transcript & message blocks

- [ ] Map the transcript in `App.tsx` (`TranscriptList`, `Block` per-kind switch, `ActivityGroup`,
      `CollapsedEvidence`, `AssistantActions`, `FilePreviewCard`, `RuntimeStatusRegion`) and confirm
      the block model in `turns.ts` / `state.ts`.
- [ ] Migrate `TranscriptList` onto tokens and layout seams (virtualized list, streaming marker,
      scroll-to-latest pill + new-count badge, sr-only announcer).
- [ ] Migrate `Block` with one `@ds state:` block per kind (text user/assistant, thinking, plan,
      tool_call, tool_result with error, file_diff, file_preview, usage, unknown).
- [ ] Migrate `ActivityGroup`, `CollapsedEvidence`, `AssistantActions` (default / "Copied"), and
      `FilePreviewCard` (ready / withheld / missing / denied / unsupported) onto tokens.
- [ ] Fence virtualization, turn-grouping, normalization, and streaming with `@ds guardrail`, and
      leave a documented seam in `Block` for the rich-content card group (grandchild `010`).
- [ ] Confirm measured row heights are unchanged; capture true-390px light/dark of empty, streaming,
      and each block kind, and prove pixel-identity against the pre-migration baseline; record in
      `checklist.md`.
