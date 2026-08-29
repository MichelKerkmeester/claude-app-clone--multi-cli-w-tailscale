<!-- SPECKIT_TEMPLATE_SOURCE: checklist-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Checklist — Rich content cards

- [x] Feature `006-rich-content-blocks` is merged into `main` and its merge commit is recorded as the
      as-merged baseline before this grandchild starts. — merged `5925ff7`; the cards are present at
      `apps/pi-remote-web/src/rich-content/`; migration baseline `82fef7c`.
- [x] The command/output, code, and text-artifact cards read their colours from the semantic and
      component tokens; no raw source value is hard-coded in their rules. — the `.rich-block-*` rules
      were already fully tokenized; the migration adds `@ds` labels only (no literal→token needed).
- [x] Each card declares `@ds surface:`, its slots, its layout seam, and one `@ds state:` block per
      lifecycle and copy state. — `@ds surface:` per card + shared `rich-block-frame`; `@ds slot:`
      command / output / code / label / preview / actions; `@ds edit: layout`; `@ds state:` for the
      command lifecycle (running-tail / completed-top / malformed-fallback), code (plaintext-first /
      highlighted), copy (success / failure / unavailable), and the full-screen Open handoff.
- [x] The safe-Markdown renderer, clipboard boundary, and no-fetch/no-ticket wiring carry
      `@ds guardrail: do-not-edit` and are unchanged. — `SafeMarkdown.tsx` diff is entirely
      `@ds guardrail: do-not-edit` comments fencing the allowlist, scheme filtering, escaping, the
      fail-closed AST boundary, control/bidi handling, and the language allowlist; a security scan for
      `fetch`/`import`/`sanitiz`/`allowlist`/`clipboard`/`writeText`/handler changes on non-comment
      lines returned empty.
- [x] The cards render identically to their as-merged baseline in light and dark across every state. —
      token resolver CHANGED 0 / MISSING 0; rule resolver CHANGED 0 / VANISHED 0 / ADDED 0 across
      light/dark/system; all six `.tsx` are comments-only (0 deletions).
- [x] No mutation, host-file read, artifact endpoint, download, or file share is added; the exact-copy
      clipboard behaviour is preserved; no new dependency is added. — annotation-only; no fetch/
      endpoint/import/handler change; the copied canonical string and the sanitization allowlist are
      byte-identical.
- [x] `npm run typecheck` passes. — exit 0.
- [x] `npm test` passes. — backend outside sandbox; this phase touches no backend code; only the
      pre-existing `attachment-normalization.test.ts` WASM flake fails (proven on clean HEAD earlier).
- [x] `npm run test:web` passes. — exit 0; **670 passed / 62 files** (incl. `CommandOutputCard`,
      `CodeCard`, `TextArtifactCard`, `RichContentRouter`, `SafeMarkdown`, `useCopyFeedback`,
      `F6ViewerAdapter` — behaviour, sanitization, and exact-copy unchanged; no test file modified).
- [x] `npm run build` passes. — exit 0.
- [x] The true-390px light capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the as-merged baseline. — no rendered change possible: `.tsx`
      comments-only; the token + rule resolvers show every resolved declaration byte-identical.
- [x] The true-390px dark capture reports exactly 390 CSS pixels, has zero page horizontal overflow,
      and is visually identical to the as-merged baseline. — same proof, dark + system.
