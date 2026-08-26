# Iteration 9: Clipboard image paste and async safety

## Focus

Inspect Orca’s clipboard paste path for a Svelte implementation that stays honest when host connectivity, target ownership, or composer eligibility changes during an asynchronous save.

## Findings

### F-LUNA-009-A — Intercept image paste, but let text preserve native caret/undo behavior

**Orca file/pattern:** `src/renderer/src/components/native-chat/use-native-chat-composer-paste.ts:27-50,118-149,160-197` detects `image/*`, prevents only image events, saves to the resolved local/SSH owner, and otherwise inserts plain clipboard text at the caret.

**Copy:** Add image paste to the composer; preserve ordinary text paste. Save image bytes through the host attachment path, show a chip, and focus the composer after completion. Surface save errors inline.

**Constraint mapping:** The attachment owner must be resolved at paste time, not assumed from the last render. A remote session requires remote-readable storage. If save fails or the target is not ready, do not add a chip and do not claim the prompt was sent.

**Verdict:** `drop-in view affordance` for image-vs-text handling and error surface; host storage `needs a new host field`.

### F-LUNA-009-B — Re-check disabled/session scope after the await

**Orca file/pattern:** `use-native-chat-composer-paste.ts:64-68,77-94,138-148` rereads disabled state after the clipboard round trip; `use-native-chat-composer-attachments.ts:42-50` reloads attachments when scope key changes so chips cannot ride into another pane.

**Copy:** Capture the session scope and caret before an async paste, then discard the result if session id, host epoch, connection, or composer eligibility changed. Keep the old draft intact on failure.

**Constraint mapping:** This is directly aligned with fail-closed behavior: no async result can mutate a new session. The host must supply an epoch or equivalent scope token if a session id can be reused; otherwise the client can still guard the exact current id and connection.

**Verdict:** `drop-in view affordance` for scope/eligibility checks; reusable host epoch in an attachment response `needs a new host field`.

## Negative knowledge

- Applying a late saved path to whichever session is active is explicitly rejected; it is a cross-session data leak and wrong-target send risk.
- Treating a failed clipboard save as an empty clipboard produces a silent no-op and is not portable.

## Questions answered

- Async paste is a small feature with a large correctness edge: target ownership and post-await validation are required parts of the UX.

## SCOPE VIOLATIONS

None.

[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/use-native-chat-composer-paste.ts:27-50,64-94,118-149,160-197]
[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/use-native-chat-composer-attachments.ts:42-50,104-141]
