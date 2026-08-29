# Iteration 5: Authoritative card content model

## Focus

Compare Orca’s host-scanned session fields and filtering model with the intentionally minimal Pi card DTO, identifying the smallest useful host extension.

## Findings

### F-LUNA-005-A — A card needs an authoritative title/preview envelope, not client transcript mining

**Orca file/pattern:** `src/shared/ai-vault-types.ts:65-120,151-183` defines host-scanned title, cwd, branch, model, timestamps, counts, preview messages, first/last prompts, and recoverability; `mobile/src/agent-history/agent-history-session-card.ts:7-16,23-53` derives a bounded display card from those fields.

**Copy:** Prefer a host-provided optional card envelope: `title`, `preview`, `agent`, and a bounded `updatedAt`/`messageCount` already present. Render missing optional fields as absent, not as locally mined prompt text. Keep the opaque session id as the stable identity and preserve the current redaction boundary.

**Constraint mapping:** The host must decide which title/preview is safe to expose, and the response must carry the same session id/epoch as the list request. A stale or scope-mismatched envelope is discarded; it must never be reconstructed from a cached transcript.

**Verdict:** `needs a new host field` for title/preview/agent; existing count/time are `drop-in view affordance` inputs.

### F-LUNA-005-B — Rich filters imply a field matrix and explicit “unsupported” behavior

**Orca file/pattern:** `src/shared/ai-vault-session-filters.ts:72-144,146-242,245-276` caps the query, searches host-authored title/session/agent/branch/model/cwd/file/preview fields, and groups deterministically by agent/project/folder.

**Copy:** Start with id/title/preview search only after those fields are part of the host contract. Keep filter and sort state separate from session records; show “no sessions match” rather than silently widening the query. Add group controls only for fields proven present in every row.

**Constraint mapping:** No query may inspect hidden prompt/path data in the browser. A field absent from a response is not a match and not proof of non-membership. Scope and epoch checks must wrap both the list and any search result refresh.

**Verdict:** `drop-in view affordance` for empty-state/query chrome; `needs a new host field` for rich search/group predicates.

## Negative knowledge

- Copying Orca’s cwd, branch, file path, or first prompt into the Pi client would violate its current redaction contract unless the host explicitly redacts and authorizes each field.
- A client-derived title from a transcript is not equivalent to Orca’s host scan and is rejected.

## Questions answered

- The minimal safe extension is an optional host-authored display envelope, not a browser-side transcript parser.

## SCOPE VIOLATIONS

None. No source, app, or spec files outside this lineage were modified.

[SOURCE: specs/context/orca-main/src/shared/ai-vault-types.ts:65-120,151-183]
[SOURCE: specs/context/orca-main/mobile/src/agent-history/agent-history-session-card.ts:7-16,23-53]
[SOURCE: specs/context/orca-main/src/shared/ai-vault-session-filters.ts:72-144,146-242,245-276]
