# Checklist — Transcript & message blocks

- [ ] `TranscriptList`, `Block`, `ActivityGroup`, `CollapsedEvidence`, `AssistantActions`, and
      `FilePreviewCard` declare `@ds surface:` and one `@ds state:` block per kind/state, reading
      from tokens only.
- [ ] Every block kind (text user/assistant, thinking, plan, tool_call, tool_result with error,
      file_diff, file_preview, usage, unknown) renders identically to today in both themes.
- [ ] The empty, streaming ("Working…"), and not-at-live-edge (scroll-to-latest + new-count) states
      render identically to today.
- [ ] The transcript stays virtualized (`@tanstack/react-virtual`) and measured row heights are
      unchanged.
- [ ] Virtualization, turn-grouping, normalization, streaming, and transport logic are unchanged and
      fenced with `@ds guardrail`.
- [ ] The `Block` renderer leaves a documented seam for the rich-content card group (grandchild `010`).
- [ ] No source value, security boundary, or dependency is changed; the transcript stays read-only.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run test:web` passes.
- [ ] `npm run build` passes.
- [ ] The true-390px light capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline.
- [ ] The true-390px dark capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline.
