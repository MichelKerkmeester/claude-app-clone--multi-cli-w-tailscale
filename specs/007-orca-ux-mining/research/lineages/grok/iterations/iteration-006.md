# Iteration 6: Native-chat composer — image, @files, slash, dictation, send lock

## Focus
Orca mobile native-chat input surface: attachments, clipboard image upload, @-file autocomplete, slash catalog, dictation hold vs toggle, send without revoking keyboard, image-only send.

## Actions Taken
- Read `MobileNativeChatComposer.tsx`, `mobile-native-chat-autocomplete.ts`, `native-chat-slash-commands.ts`.
- Read `mobile-clipboard-image.ts`, `mobile-dictation-setup.ts`.
- Noted composer tests: leading whitespace is not turned into a slash command; mic hold vs toggle.

## Findings

### F-ITER006-SEND Send is single-flight; draft is not trimmed on the wire by the composer; image-only is a valid send
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatComposer.tsx:89:164]
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatComposer.tsx:212:218]

`canSend` = (trimmed text OR attachments) AND not disabled/sending/attaching/session-option-dispatching. `sendingRef` prevents double-send. Composer sends **raw** `value` so a rejection can restore exactly what was typed. `editable` is never revoked (iOS would yank the keyboard); the lock only gates sending.

**UX to copy:** we already have Send/Steer/Stop. Portable: never disable the TextInput on transient lock; image-or-text send; restore exact draft on reject.
**Constraint map:** send still goes to the host. Restoring rejected drafts is client view state over the last typed string, not session metadata.
**Verdict:** **drop-in view affordance**.

### F-ITER006-AT Slash is line-leading only; @file is a whitespace-bounded mention that asks the host for paths
[SOURCE: specs/context/orca-main/mobile/src/session/mobile-native-chat-autocomplete.ts:21:58]
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatComposer.tsx:102:127]
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatComposer.tsx:78]

Placeholder: `Message, @files, /commands`. `/` only at start of input (so prose `/foo` is not a command). `@` after whitespace. File trigger calls `onNeedFiles(query)` so the host/search can populate `filePaths`. Slash suggestions capped at 12 from a **verified per-agent catalog**.

**UX to copy:** we already have slash autocomplete. Portable delta: `@` mentions as a second trigger; keep slash line-leading; cap suggestion list; fetch file candidates from the host rather than walking a client FS.
**Constraint map:** `@file` **needs a host file-search RPC** (orca: `use-mobile-native-chat-file-search`). Inventing paths from the device → **not portable**. Slash catalog as local UX over commands the host agent already understands → **drop-in** (we have this). Codex `/rename` `/archive` `/new` in the catalog are **agent CLI strings**, not in-app session mutations.
**Verdict:** slash chrome → **drop-in**. `@file` → **needs a new host field/RPC**. Treating `/rename` as a client rename of session metadata → **not portable**.

### F-ITER006-IMG Image attach + clipboard paste is a host upload lease, not a data-URL in the DTO
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatComposer.tsx:44:49]
[SOURCE: specs/context/orca-main/mobile/src/session/mobile-clipboard-image.ts:5:12]
[SOURCE: specs/context/orca-main/mobile/src/session/mobile-clipboard-image.test.ts:50:90]

Composer shows removable thumbnails of `PendingNativeChatImage`. Clipboard path: downscale to budget, then `clipboard.startImageUpload` / chunk / commit (or abort on cutover). Max ~24MB base64, 512KB chunks.

**UX to copy:** we have photo attach; gaps are file/doc, paste-image. Portable interaction: thumbnail strip + remove. Paste/upload **must** use a host media RPC; stuffing base64 into the session card or a client store as truth → fail-closed violation if the host never accepted it.
**Verdict:** thumbnail strip → **drop-in**. Paste-image / generic file attach → **needs a new host field/RPC** (we may already have photo; docs/files are extra). Copying orca's `clipboard.*` method names → **not portable** (Pi relay media contract).

### F-ITER006-MIC Dictation is a paired-desktop speech RPC with setup-required fail-closed
[SOURCE: specs/context/orca-main/mobile/src/dictation/mobile-dictation-setup.ts:9:42]
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatComposer.tsx:50:55]
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatComposer.tsx:243:263]

Mic: hold (press-in/out walkie-talkie) vs toggle (tap). Setup errors `voice_dictation_disabled` / `voice_model_not_selected` open a setup sheet instead of a dead toast. Models listed via `speech.models.list`; legacy desktops get an upgrade message, not a raw method-not-found.

**UX to copy:** hold vs toggle; fail-closed when the host cannot dictate; never pretend on-device STT is host truth.
**Constraint map:** without a Pi speech/dictation RPC, wiring Web Speech on the phone would be **client-invented prompt text** — acceptable only as a **local draft** the user can edit before send (same as typing). Shipping it as an orca port of `speech.models.*` → **not portable**.
**Verdict:** hold/toggle chrome → **drop-in**. Host-backed dictation → **needs a new host field/RPC**. Silent on-device STT as committed transcript → **not portable**.

### F-ITER006-OPTIONS Session-option pickers sit in the composer action row
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatComposer.tsx:41:43]
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatComposer.tsx:236:241]

Model/session-option pickers render in the action row when the agent has a catalog; `pendingId` blocks send.

**UX to copy:** we already have model/effort bottom sheet. Portable: keep send disabled while a host option dispatch is in flight.
**Verdict:** **drop-in view affordance**.

## Questions Answered
Partial q-composer-input: image, @, slash, dictation, send-lock mapped.

## Questions Remaining
- Prompt-history / up-arrow (not seen in this composer).
- Generic file/doc attach (only images in this composer).
- Streaming/pending reconciliation.

## Ruled Out
- Client-side `/rename` `/archive` `/delete` as session-metadata edits: those are Codex CLI strings in a suggestion catalog.
- On-device STT as host-authoritative transcript.
- Local filesystem walk for `@` mentions.

## Dead Ends
- Looking for a files/docs paperclip next to ImagePlus — this composer is image-only plus @path mentions.

## Sources Consulted
- specs/context/orca-main/mobile/src/session/MobileNativeChatComposer.tsx:34
- specs/context/orca-main/mobile/src/session/mobile-native-chat-autocomplete.ts:21
- specs/context/orca-main/src/shared/native-chat-slash-commands.ts:20
- specs/context/orca-main/mobile/src/session/mobile-clipboard-image.ts:5
- specs/context/orca-main/mobile/src/dictation/mobile-dictation-setup.ts:9

## Assessment
- newInfoRatio: 0.85
- noveltyJustification: First composer pass; @ vs slash trigger rules, image-only send, clipboard upload lease, dictation fail-closed, and slash-catalog-vs-metadata distinction are new.
- confidence: high on mobile composer; prompt history still unknown.

## Reflection
- What worked and why: Separating CLI slash verbs from in-app session mutations avoided a false "orca has rename/archive menus" finding.
- What did not work and why: Expected a generic file picker; orca uses @path + image attach.
- What I would do differently: Next, streaming/pending/working/input-lock reconciliation.

## Recommended Next Focus
Streaming and progress: throttled partial bubble, optimistic pending, working indicator + Stop, input lock disconnected vs waiting, draft restore.
