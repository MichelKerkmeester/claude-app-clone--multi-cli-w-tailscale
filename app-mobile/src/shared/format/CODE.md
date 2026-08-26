# format/: value conversion and attention boundary

---

## 1. OVERVIEW

`format/` is a flat helper package. It converts typed values into display text and keeps the Attention Inbox and Web Push client beside the response guards those endpoints need.

Current state:

- `format.ts` contains four pure value formatters.
- `view-helpers.ts` contains route readers, labels, icons, theme preference and time helpers.
- `attention.ts` contains Attention Inbox reads, hint opening and push subscription lifecycle.
- `attention.ts` imports auth and relay helpers because opening a hint and reading approvals require an authenticated boundary.

---

## 2. ARCHITECTURE

Most callers use pure conversion. Attention and push take the browser and relay path:

```text
Typed values -> format.ts -> readable time, number, cost or size
Route and view DTOs -> view-helpers.ts -> labels, icons, ids and countdowns
Attention or push action -> attention.ts -> guarded endpoint response -> view data
Approval list -> view-helpers.ts -> transport fetch -> sorted approval cards
```

The output is presentation data. Reducers own state transitions. The transport module owns generic request handling and artifact limits.

---

## 3. PACKAGE TOPOLOGY

The folder is a set of flat helpers with two intentional I/O edges:

```text
format.ts -> pure value strings
view-helpers.ts -> pure view strings and route parsing
view-helpers.ts -> ../transport/relay.ts for approval pages
card-projection.ts -> pure card view model and optional host-field gate
seen-marker.ts -> localStorage last-seen clocks
attention.ts -> ../transport/auth.ts for session establishment
attention.ts -> local postJson for attention and push endpoints
```

Allowed ownership:

- Components use helpers for labels and formatting instead of defining duplicate copy.
- Route readers return an opaque id or `null`, never an unchecked path segment.
- Attention and push helpers validate protocol-shaped responses before returning them.
- `formatArtifactSize` formats an accepted value and does not enforce transport limits.

Disallowed ownership:

- These modules must not commit connection, transcript or runtime transitions.
- UI code must not display raw endpoint payloads or server response text as labels.
- `attention.ts` must not be treated as a pure formatter when changing its browser or network behavior.

---

## 4. DIRECTORY TREE

The folder is flat:

| File | Responsibility |
|---|---|
| [`format.ts`](./format.ts) | Time, number, cost and artifact-size formatters. |
| [`view-helpers.ts`](./view-helpers.ts) | Route, theme, approval, status, copy, relative time, absolute time and time-bucket helpers. |
| [`card-projection.ts`](./card-projection.ts) | Session-card view model, optional host-field gate, hue mark and stale-working decay. |
| [`seen-marker.ts`](./seen-marker.ts) | Device-local last-seen clocks for the changed-since-looked dot. |
| [`roster-view-preference.ts`](./roster-view-preference.ts) | Device-local recency/status grouping preference. |
| [`attention.ts`](./attention.ts) | Attention Inbox and Web Push endpoint calls. |
| [`README.md`](./README.md) | Feature orientation for formatting and attention data. |
| [`CODE.md`](./CODE.md) | This code-folder map. |

---

## 5. KEY FILES

| File | Responsibility |
|---|---|
| [`format.ts`](./format.ts) | Uses locale-aware `Intl` formatters for times, compact numbers, USD costs and artifact sizes. |
| [`view-helpers.ts`](./view-helpers.ts) | Reads opaque route ids, maps status values, loads approvals and creates compact or relative displays. |
| [`attention.ts`](./attention.ts) | Validates Attention Inbox and push payloads and handles service-worker subscription state. |

---

## 6. BOUNDARIES AND FLOW

| Boundary | Rule |
|---|---|
| Value formatting | Input values are already accepted by their caller. Formatting does not become validation. |
| Route parsing | Decode the segment and check `isOpaqueId` before returning it. |
| Attention reads | Validate every item and resolution with the protocol guards. |
| Push writes | Check browser support, permission and subscription shape before sending preferences. |
| Copy | Return local labels and bounded errors. Do not echo relay response bodies. |

Main flow:

```text
Protocol DTO or browser value -> helper -> local display string
Location pathname -> opaque id guard -> session or attention page input
Attention action -> establishSession when needed -> POST -> DTO guard -> page state
Push action -> browser permission and subscription -> POST -> preferences guard -> settings view
```

---

## 7. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|---|---|---|
| `formatTime`, `formatNumber`, `formatCost`, `formatArtifactSize` | Functions | Convert accepted values into locale-aware display strings. |
| `readSessionIdFromLocation` and `readAttentionIdFromLocation` | Functions | Parse and validate route ids. |
| `attentionLabel`, `attentionIcon`, `sessionStatusLabel` | Functions | Map protocol statuses to local labels and glyphs. |
| `readThemePreference`, `compactId`, `relativeTime`, `messageFrom`, `countdown` | Functions | Provide shared view-state copy and compact displays. |
| `fetchAttention` and `openAttentionHint` | Async functions | Read the Attention Inbox and open a valid hint. |
| `fetchPushConfig`, `subscribeToPush`, `updatePushPreferences`, `unsubscribeFromPush`, `setPushForeground` | Async functions | Manage the Web Push preference lifecycle. |

---

## 8. VALIDATION

Run from the repository root:

```bash
node "$PWD/scripts/naming/scan-folder-docs.mjs"
```

The folder is healthy when both documents exist and the scan reports no broken references for this folder.

---

## 9. RELATED

- [`README.md`](./README.md)
- [Transport documentation](../transport/CODE.md)
- [State documentation](../state/CODE.md)
- [Chrome documentation](../chrome/CODE.md)
