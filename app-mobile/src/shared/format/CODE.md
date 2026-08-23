# `format/` — structure & logic

Editor map. For *what/why*, see `README.md`.

## Shape

- **`format.ts`** — the small pure value formatters: `formatTime`, `formatNumber`, `formatCost`, and `formatArtifactSize`.
- **`view-helpers.ts`** — `loadApprovals`, route readers, `attentionLabel`, `attentionIcon`, `sessionStatusLabel`, `readThemePreference`, `compactId`, `relativeTime`, `messageFrom`, and `countdown`.
- **`attention.ts`** — `fetchAttention`, `openAttentionHint`, `fetchPushConfig`, `subscribeToPush`, `updatePushPreferences`, `unsubscribeFromPush`, and `setPushForeground`.

## Do-not

- **Don't put state transitions here.** Formatters may derive copy, but reducers and runtime controls own phase changes and authority.
- **Don't duplicate labels in components.** Use the exported view and attention helpers so status names, icons, and accessible copy remain consistent.
- **Don't treat `attention.ts` as a pure formatter.** Its functions perform endpoint calls and browser permission/service-worker work; keep that I/O explicit and response-guarded.
- **Don't expose unbounded route ids or transport payloads as labels.** Route readers validate opaque ids, and endpoint responses must pass their protocol guards before callers receive them.
- **Don't use `formatArtifactSize` for transport limits.** `MAX_ARTIFACT_BYTES` and resource validation belong to `app-mobile/src/shared/transport/relay.ts`; this helper only formats a value already accepted by its caller.
