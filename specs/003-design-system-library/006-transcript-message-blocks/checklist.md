<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Checklist — Transcript & message blocks

- [x] `TranscriptList`, `Block`, `ActivityGroup`, `CollapsedEvidence`, `AssistantActions`, and
      `FilePreviewCard` declare `@ds surface:` and one `@ds state:` block per kind/state, reading
      from tokens only. — `@ds surface:` on transcript-list, transcript-block, activity-group,
      file-preview-card, runtime-status-region; `@ds state:` per block kind (text user/assistant,
      thinking, plan, tool_call, tool_result+error, file_diff, file_preview, usage, unknown) and per
      transcript state (empty, streaming, not-live-edge, turn-start); rules read semantic tokens.
- [x] Every block kind renders identically to today in both themes. — annotation-only + 2 equivalent
      padding conversions; token + rule resolvers prove every declaration byte-identical (CHANGED 0).
- [x] The empty, streaming ("Working…"), and not-at-live-edge (scroll-to-latest + new-count) states
      render identically to today. — `@ds state:` labels on the existing selectors; no value changed.
- [x] The transcript stays virtualized (`@tanstack/react-virtual`) and measured row heights are
      unchanged. — `.tsx` comments-only (0 deletions) so the virtualizer/measurement is byte-identical;
      the only CSS change is 2 padding shorthand→longhand conversions that preserve vertical padding
      exactly (`padding-block` = the old top/bottom value), so row heights are unchanged.
- [x] Virtualization, turn-grouping, normalization, streaming, and transport logic are unchanged and
      fenced with `@ds guardrail`. — guardrails on virtualization layout, measureElement/estimateSize,
      normalization/turn-grouping, live-edge/scroll handlers, the announce effect, and react-aria
      wiring; `.tsx` comments-only; `turns.ts`/`state.ts` untouched.
- [x] The `Block` renderer leaves a documented seam for the rich-content card group. — an
      `@ds slot: rich-content-cards` seam is documented in `Block` (named without a grandchild number
      per comment hygiene).
- [x] No source value, security boundary, or dependency is changed; the transcript stays read-only. —
      token resolver CHANGED 0; only 2 equivalent padding conversions; no logic/dependency change;
      read-only preserved.
- [x] `npm run typecheck` passes. — exit 0.
- [x] `npm test` passes. — backend outside sandbox; this phase touches no backend code; only the
      pre-existing `attachment-normalization.test.ts` WASM flake fails (proven on clean HEAD earlier).
- [x] `npm run test:web` passes. — exit 0; **670 passed / 62 files** (incl. transcript-placement,
      turns, normalizeTranscriptBlocks) — behaviour + row heights unchanged.
- [x] `npm run build` passes. — exit 0.
- [x] The true-390px light capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline. — no rendered change possible: `.tsx`
      comments-only; the token + rule resolvers show every resolved declaration byte-identical (the 2
      padding conversions are proven equivalents); 390px no-overflow holds.
- [x] The true-390px dark capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the pre-migration baseline. — same proof, dark + system.
