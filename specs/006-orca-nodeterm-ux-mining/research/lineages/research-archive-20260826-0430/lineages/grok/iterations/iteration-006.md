# Iteration 6: Composer attachments, paste-image, mic, drafts, image-only send

## Focus
Orca native-chat composer input surface: image attach, clipboard paste, dictation mic, unsent drafts, send-with-image-only.

## Actions Taken
- Read `MobileNativeChatComposer.tsx`, `use-native-chat-composer-paste.ts`, `use-native-chat-file-attachment-actions.ts`, `use-native-chat-dictation-actions.ts`, `use-native-chat-draft.ts`, `mobile-dictation-setup.ts`.

## Findings

### F22. Image attachments are pending host-side files; image-only send is valid
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatComposer.tsx:44:100]
[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/use-native-chat-file-attachment-actions.ts:3:26]

Composer shows removable thumbnails of `PendingNativeChatImage` uploaded but not yet sent. `canSend` is true when **text OR attachments** exist, and false while attaching / sending / session-option dispatching / disabled. Desktop also accepts file-drop onto the composer and `shell.pickAttachment()`.

**UX to copy:** photo chip + send-without-caption (our gap: text+photo only, no file/doc, no paste-image). Disable send while upload in flight so we don’t send a missing path.
**Constraint map:** the bytes must land where the **host agent can read them**. Orca SSH paste saves the temp file **on the remote host** (`saveClipboardImageAsTempFile({ connectionId })`). A client-only blob that the Pi child cannot see is fail-open.
**Verdict:** thumbnail + disable-while-uploading + image-only send chrome → **drop-in view affordance**. The upload/path contract → **needs a new host field** (or existing Pi attachment RPC). Generic file/doc pick without a host ingest path → **not portable**.

### F23. Paste: clipboard image becomes an attachment; text inserts at caret; disabled is re-checked after await
[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/use-native-chat-composer-paste.ts:43:98]

Paste prefers image items (`image/*`). Failed remote save surfaces a notice (silent no-op would look like a broken paste). `disabledRef` is re-read after the async round-trip so a presence-lock flip cannot attach into a guarded composer. Pane-level paste listener exists because the OS often retargets paste off the textarea.

**UX to copy:** paste-image; fail visibly; don’t apply paste if the session went unsendable mid-await.
**Constraint map:** same as F22 — host must accept the image. Re-check disabled after await is portable **logic** on our existing send/steer lock.
**Verdict:** paste-image UX + fail-visible + disabled re-check → **drop-in** logic; ingest still **needs host**.

### F24. Mic is hold-or-toggle dictation that writes into parent-owned composer text; setup is host speech config
[SOURCE: specs/context/orca-main/mobile/src/session/MobileNativeChatComposer.tsx:50:55]
[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/use-native-chat-dictation-actions.ts:4:27]
[SOURCE: specs/context/orca-main/mobile/src/dictation/mobile-dictation-setup.ts:9:40]

Placeholder: `Message, @files, /commands`. Mic: `toggle` tap or `hold` press-in/out. Dictation focuses the field then dispatches control events. Mobile setup RPCs (`speech.models.list`) live on the paired desktop; missing models open a setup sheet rather than a dead toast. Legacy desktops get an upgrade message.

**UX to copy:** mic next to send; hold-to-talk; don’t block send on dictation errors — route to setup.
**Constraint map:** if we run speech **on device** and only insert text, that is a view affordance (text is what we already send). If we depend on orca desktop speech models, **not portable**. Our composer is already text+photo.
**Verdict:** on-device dictation → text into composer → **drop-in view affordance**. Orca-desktop speech.models RPC → **not portable**.

### F25. Unsent drafts are scoped to pane/session key, not global composer state
[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/use-native-chat-draft.ts:4:38]
[SOURCE: specs/context/orca-main/mobile/src/session/use-mobile-native-chat-drafts.ts:31:40]

Desktop caches draft by `scopeKey` (pane) so TUI/GUI toggle doesn’t wipe text. Mobile drafts also reconcile optimistic pending echoes against the host transcript (20s unconfirmed deadline).

**UX to copy:** per-session draft cache (we likely already have some); unconfirmed-send reconciliation is the deeper logic.
**Constraint map:** a draft cache is client view state as long as we don’t treat it as the transcript. Optimistic echo that never confirms must fail-closed (surface “unconfirmed — check chat”) — orca already does this on send errors.
**Verdict:** per-session draft cache → **drop-in**. Optimistic echo + 20s unconfirmed → **drop-in** reconciliation logic (not a new DTO field).

## Questions Answered
- Partial Q4: attach/paste/mic/draft.

## Questions Remaining
- `@` file mentions, `/` slash + skills picker, up-arrow prompt history, session-option pickers.

## Dead Ends
- Shipping file-picker that only stores a local URI the Pi agent cannot read. Ruled out (fail-open).
- Depending on orca `speech.models.list` from our SvelteKit client. Ruled out.

## Assessment
- newInfoRatio: **0.81**
- Confidence: high.

## Reflection
- What worked: treating “where the file bytes live” as the fail-closed hinge, not the chip UI.
- Ruled out: local-only file URIs; orca-desktop speech RPC.

## Recommended Next Focus
Composer autocomplete: `@files`, `/commands` + skills, session-option pickers, ArrowUp prompt history.

## SCOPE VIOLATIONS
None.
