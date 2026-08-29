<!-- SPECKIT_TEMPLATE_SOURCE: plan-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Plan — Transcript & message blocks

## Approach

Migrate the transcript renderer onto tokens and per-kind/per-state seams without touching the
virtualization or block model. Move `TranscriptList` and `Block` and their siblings onto `@ds`
seams, add one state block per kind and per transcript state, fence the logic, and leave a
documented slot for the rich-content cards. Prove every kind and state renders identically and row
heights are unchanged.

## Steps

1. Map the transcript in `App.tsx`: `TranscriptList`, `Block`'s per-kind switch, `ActivityGroup`,
   `CollapsedEvidence`, `AssistantActions`, `FilePreviewCard`, `RuntimeStatusRegion`, and their
   styling in `style.css`; confirm the block model in `turns.ts` / `state.ts` (not re-architected).
2. Migrate `TranscriptList` onto tokens and layout seams: the virtualized list, the streaming
   marker, the scroll-to-latest pill + new-count badge, and the sr-only announcer.
3. Migrate `Block` with one `@ds state:` block per kind (text user/assistant, thinking, plan,
   tool_call, tool_result with error, file_diff, file_preview, usage, unknown), reading from tokens.
4. Migrate `ActivityGroup`, `CollapsedEvidence`, `AssistantActions` (default / "Copied"), and
   `FilePreviewCard` (ready / withheld / missing / denied / unsupported) onto tokens.
5. Fence virtualization, turn-grouping, normalization, and streaming with `@ds guardrail`, and leave
   a documented seam in `Block` for the rich-content card group (grandchild `010`).
6. Confirm measured row heights are unchanged; capture true-390px light/dark of the empty,
   streaming, and each-block-kind states and diff against the pre-migration baseline.

## Files to change

- `apps/pi-remote-web/src/App.tsx` (`TranscriptList`, `Block`, `ActivityGroup`, `CollapsedEvidence`,
  `AssistantActions`, `FilePreviewCard`, `RuntimeStatusRegion` — seam labels, token reads)
- `apps/pi-remote-web/src/style.css` (block / activity / streaming-marker / scroll-to-latest /
  assistant-actions rules)
- `apps/pi-remote-web/src/turns.ts`, `apps/pi-remote-web/src/state.ts` (confirm block model; touch
  only if a stable key or seam requires it — no behaviour change)
- `scripts/design-system-cdp.mjs` (transcript fixtures, if needed)

## Verification gate

Run from the repository root:

```text
npm run typecheck
npm test
npm run test:web
npm run build
node scripts/design-system-cdp.mjs --surface transcript --viewport-width 390 --theme light --output <temporary-directory>/transcript-light.png
node scripts/design-system-cdp.mjs --surface transcript --viewport-width 390 --theme dark --output <temporary-directory>/transcript-dark.png
```

The gate passes only when all suites and the build pass, the transcript stays virtualized with
unchanged measured row heights, the CDP runner reports exactly 390 CSS pixels with zero page
horizontal overflow, and the light/dark captures of the empty, streaming, and every block-kind
state are visually identical to the pre-migration baseline.
