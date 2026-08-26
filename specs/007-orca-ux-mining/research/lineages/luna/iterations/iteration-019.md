# Iteration 19: Contract audit and host-field priority

## Focus

Audit the researched patterns against Orca's executable tests and the SvelteKit client's documented contracts, then turn the remaining host-dependent ideas into a small, ordered field request rather than client-owned metadata.

## Findings

### F-LUNA-019-A — Reuse pure decision helpers with differential and boundary tests

**Orca file/pattern:** `src/renderer/src/components/native-chat/native-chat-incremental-assembler.test.ts:22-43,46-123` compares every incremental append prefix with a full transcript rebuild and exercises re-emitted ids, cross-source precedence, out-of-order timestamps, null timestamps, duplicate prompts, empty batches, and object identity. `mobile/src/session/mobile-native-chat-draft-reconcile.test.ts:25-48,50-120` tests pending image/send reconciliation, including incomplete multi-image turns and independent adjacent sends. `mobile/src/session/mobile-session-last-tab-close.test.ts:9-28` asserts transient empty snapshots and stale identity clearing.

**Copy:** Extract home filtering/sorting/grouping, message grouping, draft reconciliation, and scope guards as pure functions. Test normal and adversarial sequences against a simple canonical implementation: session removal/reappearance, stale refresh, duplicate streaming ids, route changes during send, partial attachment arrival, and unknown delivery. Keep UI tests focused on observable disabled/placeholder/outcome states.

**Constraint mapping:** Pure helpers may order or present host data, but their inputs must be immutable snapshots with explicit session id, host epoch, and revision. Differential tests must prove that optimization does not change the authoritative result. Boundary tests should assert that stale, unknown, or mismatched data is retained as visibly unresolved or rejected, never promoted to success.

**Verdict:** `drop-in view affordance` for the testable architecture and deterministic presentation helpers.

### F-LUNA-019-B — Request one coherent host card envelope before adding rich home selection

**Orca file/pattern:** `src/shared/ai-vault-types.ts:65-120,151-183` models host-scanned session records with identity, worktree/source context, agent, status, message counts, timestamps, and optional summary metadata. `src/shared/ai-vault-session-filters.ts:72-144,146-242,245-276` filters and sorts that record set by structured fields, while `src/renderer/src/components/right-sidebar/AiVaultSessionRow.tsx:80-143,185-221,224-246` renders title/preview/status and action affordances. The current home explicitly states “Opaque identifiers only. No prompts, paths, or host context” in `app-mobile/src/pages/home/screen-home.svelte:82-103`.

**Copy:** Prioritize a host-authored `SessionCardDto` extension containing `title`, `preview`, `attention`/unread reason, and optional redacted `agent` or project label, plus `updatedAt`/status revision already used by the client. Use the Orca filter/sort interaction only over fields present in the snapshot. Keep model, branch, cwd, cost, token, pin, and grouping metadata as later opt-in fields.

**Constraint mapping:** Titles and previews must be authored or redacted by the host; the client must not infer them from prompt text, paths, or cached transcript. Every card envelope must carry exact session identity plus host epoch/revision, and the roster response must declare capability/field availability. Missing fields disable only the dependent affordance; they must not be filled from another session or guessed locally.

**Verdict:** `needs a new host field` for the richer card envelope; local filtering, stable ordering, and card affordance states remain `drop-in view affordance` once fields exist.

## Negative knowledge

- A larger DTO assembled from client transcript mining would violate the no-editable-metadata boundary.
- A single “status” field cannot safely stand in for unread, blocked, waiting, progress, or permissions.
- Orca tests prove useful contracts and edge cases, but their host model is not evidence that the same fields exist in this client.

## Questions answered

- The safest implementation seam is pure, differential-tested presentation logic around scoped snapshots.
- The highest-value new host fields are title, preview, attention reason, optional redacted agent/project label, and a revision envelope; model/path/cost fields can follow.

## SCOPE VIOLATIONS

None.

## Assessment

- newInfoRatio: 0.49
- Novelty: tests the proposed ports against Orca's executable edge-case contracts and narrows rich home selection to one host-authored envelope.
- Status: complete

## Next Focus

Final ranked-angle rescan and negative-knowledge audit before synthesis.

[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/native-chat-incremental-assembler.test.ts:22-43,46-123]
[SOURCE: specs/context/orca-main/mobile/src/session/mobile-native-chat-draft-reconcile.test.ts:25-48,50-120]
[SOURCE: specs/context/orca-main/mobile/src/session/mobile-session-last-tab-close.test.ts:9-28]
[SOURCE: specs/context/orca-main/src/shared/ai-vault-types.ts:65-120,151-183]
[SOURCE: specs/context/orca-main/src/shared/ai-vault-session-filters.ts:72-144,146-242,245-276]
[SOURCE: specs/context/orca-main/src/renderer/src/components/right-sidebar/AiVaultSessionRow.tsx:80-143,185-221,224-246]
[SOURCE: app-mobile/src/pages/home/screen-home.svelte:82-103]
