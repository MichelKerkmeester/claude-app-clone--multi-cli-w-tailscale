# Iteration 8: Attachments and image-only chat sends

## Focus

Trace Orca’s mobile and Electron attachment paths from picker/clipboard through host storage and submit, focusing on the fail-closed question of where the agent can read bytes.

## Findings

### F-LUNA-008-A — Hold uploaded images as scoped chips until submit

**Orca file/pattern:** `mobile/src/session/MobileNativeChatComposer.tsx:34-60,91-100,166-199,221-280` renders removable thumbnails and allows send when text or attachments exist; `mobile-native-chat-image-attachment.ts:7-14,47-78` stores a host path plus local preview URI without pasting early.

**Copy:** Add a pending attachment strip, removable chips, upload-in-progress state, and image-only send. Lock send while upload is pending; clear only the attachments that rode along with the accepted submit.

**Constraint mapping:** The local preview is display-only. The host path is usable only if the host has accepted/stored it for the target agent/session. A preview URI without a host attachment reference is not a message. Scope pending chips by host/worktree/tab so they cannot cross a session switch.

**Verdict:** `drop-in view affordance` for chips/locking; the host ingest/reference contract `needs a new host field`.

### F-LUNA-008-B — Distinguish unsupported attachment targets from failed uploads

**Orca file/pattern:** `src/renderer/src/components/native-chat/use-native-chat-composer-attachments.ts:104-141` rejects remote/local mismatches visibly; `native-chat-image-paste.ts:10-47` returns `attachment` or `unsupported` per agent rather than silently pasting a path.

**Copy:** Show an inline, actionable error for unsupported target/agent and retain only confirmed chips. Use a single send outcome so upload, submit, and cleanup do not make the composer claim success when delivery is unknown.

**Constraint mapping:** Unsupported and failed are fail-closed states. The client must not infer that a remote agent can read a local file, and must not retry an ambiguous submit blindly. Host capability and accepted attachment id belong in the transport contract.

**Verdict:** error/locking UX `drop-in view affordance`; remote attachment capability `needs a new host field`.

## Negative knowledge

- A browser-only `File`/blob or local `file://` URI is not portable to a remote Pi agent.
- Generic document upload cannot be recommended from Orca until the Pi host exposes an ingest route and an accepted reference format.

## Questions answered

- Attachment UX is portable, but the bytes-to-agent seam is host-owned and cannot be faked by SvelteKit.

## SCOPE VIOLATIONS

None.

[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatComposer.tsx:34-60,91-100,166-199,221-280]
[SOURCE: specs/context/orca-main/mobile/src/session/mobile-native-chat-image-attachment.ts:7-14,47-78]
[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/use-native-chat-composer-attachments.ts:104-141]
[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/native-chat-image-paste.ts:10-47]
