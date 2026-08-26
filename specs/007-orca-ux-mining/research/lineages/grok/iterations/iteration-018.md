# Iteration 18: Frozen host-field request bundle vs opaque-identifier product rule

## Focus
Collapse iterations 1–4 into a request list the host could ship without violating fail-closed or the "opaque ids / no paths on home" product rule.

## Actions Taken
- Re-read `SessionCardDto` and home card copy constraints from iter 4 matrix.
- Re-read `AiVaultSession` fields and Inbox-as-attention (iter 2–3).
- Separate **home list DTO** from **chat RPCs**.

## Findings

### F-ITER018-MIN Minimum home-list bundle (does not require paths)
[SOURCE: packages/pi-rpc-protocol/src/types.ts:428:433]
[SOURCE: specs/context/orca-main/src/shared/ai-vault-types.ts:83:120]
[SOURCE: specs/context/orca-main/mobile/src/agent-history/agent-history-session-card.ts:7:52]

Request these **host-authored, client-read-only** fields on `SessionCardDto` (or a sibling projection):

1. `title` — string, host may send `"Untitled session"`
2. `lastMessagePreview` — short redacted string (or `previewMessages[]` capped)
3. `agent` — label the host already knows (model optional)
4. `attention` — `none | blocked | waiting | completed` (iter 3: unread ≠ working)

Keep existing `id`, `status`, `updatedAt`, `messageCount`, `epoch`.

**UX unlocked:** human title, last-message line, agent chip, needs-you badge **on the card** (not only Inbox). Search/filter that matches title/preview. Recency sort already possible.
**Constraint map:** client must render empty/Untitled if absent; never synthesize from compacted id or local transcript cache across epochs.
**Verdict:** **needs a new host field** (this is the request). Until then, sort/PTR/status pill/relabel "blocks" → **drop-in**.

### F-ITER018-OPT Optional fields (product decision, not required for ranked chat UX)
- `cwd` / `projectLabel` / `branch` — orca History uses these for Workspace/Project tabs. Our home copy currently **forbids paths**. A **redacted project label** (not a filesystem path) would unlock grouping without leaking machine paths.
- `pinned` + pin RPC — orca pins **worktrees** (`worktree.set`), not AiVault sessions. A Pi pin would be a **new** host mutation, not an orca copy.
- `previewMessages[]` — enables peek-before-open (iter 1). Heavier than one preview string.
- `hasMore` / transcript page token — only if we stop sending full snapshots.

**Verdict:** projectLabel → **needs host field** if we lift path ban. Pin → **needs host field** (new). Peek array → **needs host field**. Device-only pin → **not portable**.

### F-ITER018-CHAT Chat RPCs distinct from the card DTO
Already identified, not card fields:

| Capability | Verdict |
|---|---|
| `@` file search (`files.searchPaths` shape) | **needs host RPC** |
| Image paste upload lease | **needs host RPC** (if not already) |
| Dictation / STT | paired-desktop or **not portable** on-device |
| Typed Ask indices | we have tickets; **drop-in** wizard |
| Typed approval envelope | Review tickets; TUI keystrokes **not portable** |
| Prompt history | device-local stack; **drop-in** |
| Fence copy | **drop-in** view |
| `set_model` / thinking | we have; do not copy TUI slash options |

### F-ITER018-RULE Opaque identifiers remain for `id`; titles are not ids
[SOURCE: app-mobile/src/pages/home/screen-home.svelte:94:108]

Compacted id is a **fallback**, not a title. Host `title` can still be non-path, non-secret (redacted). That is compatible with opaque-id policy: **id stays opaque; label is a projection**.

**Verdict:** requesting `title` does not violate opaque identifiers. Requesting raw `cwd` on home **would**.

## Questions Answered
q-card-content-model closed as a request bundle; q-home-parallel-sessions fields vs chrome split.

## Ruled Out
- Shipping path/cwd on the home card under current product copy.
- Device-only pin as a substitute for host pin.
- Deriving title from compact id (false drop-in).

## Dead Ends
- Trying to unlock History-quality cards from `messageCount` alone.

## Sources Consulted
- packages/pi-rpc-protocol/src/types.ts:428
- specs/context/orca-main/src/shared/ai-vault-types.ts:83
- app-mobile/src/pages/home/screen-home.svelte:94

## Assessment
- newInfoRatio: 0.48
- noveltyJustification: Synthesis of the request bundle and product-rule split; little new orca reading, high decision value.
- confidence: high.

## Reflection
- What worked and why: Separating card DTO from chat RPCs keeps the host conversation small.
- What did not work and why: Pin looks portable until you notice it is a worktree RPC.
- What I would do differently: Next, audit remaining research-angles gaps.

## Recommended Next Focus
Gap audit vs `research-angles.md`: every listed chat/home gap → orca verdict or "not in orca".
