<!-- SPECKIT_TEMPLATE_SOURCE: tasks-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Tasks — Transcript & message blocks

- [x] Map the transcript in `App.tsx` (`TranscriptList`, `Block` per-kind switch, `ActivityGroup`,
      `CollapsedEvidence`, `AssistantActions`, `FilePreviewCard`, `RuntimeStatusRegion`) and their
      styling in `style.css`; confirm the block model in `turns.ts` / `state.ts`. — mapped;
      `turns.ts`/`state.ts` confirmed read-only, untouched.
- [x] Migrate `TranscriptList` onto tokens and layout seams: virtualized list, streaming marker,
      scroll-to-latest pill + new-count badge, sr-only announcer. — `@ds surface:`/`@ds slot:` labels;
      rules already token-backed.
- [x] Migrate `Block` with one `@ds state:` block per kind, reading from tokens. — per-kind
      `@ds state:` labels added (text/thinking/plan/tool_call/tool_result+error/file_diff/file_preview/
      usage/unknown).
- [x] Migrate `ActivityGroup`, `CollapsedEvidence`, `AssistantActions`, and `FilePreviewCard` onto
      tokens. — annotated; already token-backed; state variants preserved.
- [x] Fence virtualization, turn-grouping, normalization, and streaming with `@ds guardrail`, and
      leave a documented seam in `Block` for the rich-content card group. — guardrails added;
      `@ds slot: rich-content-cards` seam documented.
- [x] Confirm measured row heights are unchanged; capture true-390px light/dark of the empty,
      streaming, and each-block-kind states and prove pixel-identity. — token + rule resolvers
      CHANGED 0; the 2 padding conversions preserve vertical padding exactly (row heights unchanged);
      390px no-overflow.
