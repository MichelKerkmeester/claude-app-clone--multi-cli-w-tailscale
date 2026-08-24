# Iteration 010 — final Pi Remote browser lifecycle and viewport mapping

## Focus

Consolidate the confirmed projection/tombstone contract into an adoptable SvelteKit/browser design, while checking the remaining mobile transcript, composer, keyboard, attachment, haptic, and lifecycle evidence. Do not invent the absent shared sync-package lease or sequence semantics.

## Actions Taken

- Read the remote preview projection, focused tests, resend replacement seam, and package dependency boundary.
- Read the chat message-area scroll and safe-area implementation, including initial-layout hiding, near-bottom gating, layout-shrink recovery, keyboard dismissal, and the jump-to-bottom control.
- Read the composer action-state, keyboard-aware popover, keyboard-height hook, attachment lifecycle, actionable vision failures, and haptic vocabulary.
- Rechecked transcript memoization, stable tool-row identity, accordion persistence, thinking presentation, and chunk-safe reasoning-tag parsing.
- Compared native app/conversation lifecycle ownership with the browser primitives that Pi Remote must supply; browser mapping statements below are explicitly design inferences where OGAM has no web implementation.

## Findings

### F1 — Pi Remote should preserve a service-owned stream and replace-all UI projection

OGAM states that the Pro chat-stream service owns frames, ordering, and expiry, while `remoteChatStreamStore` is a non-durable read-only projection; the finished message arrives separately through the op-log (`specs/context/OGAM-main/src/stores/remoteChatStreamStore.ts:17-24`). The focused tests enforce replacing the complete preview set rather than appending frames, and removing the preview when the durable reply arrives (`specs/context/OGAM-main/__tests__/unit/stores/remoteChatStreamStore.test.ts:49-70`).

Adoptable Pi Remote mapping: keep the WebSocket/WebTransport/session service authoritative for frame ordering, expiry, completion, and retirement. Expose a Svelte store containing the latest preview snapshot only. Key preview rows by stable `messageId`/turn identity, filter them by active conversation through the shared projection rule, and let the durable transcript replace the preview rather than render beside it.

The replacement seam tombstones each preview's durable message ID before invoking the discard hook, specifically to prevent an in-flight put from restoring the old reply (`specs/context/OGAM-main/src/services/sync/supersedeSyncedReplies.ts:10-27`). Pi Remote should retain that generation-fence order for resend, regenerate, conversation switch, and disconnect cleanup: retire the old turn first, then clear the projected preview, and reject late writes in the service.

### F2 — Browser lifecycle must pause presentation, not resurrect an in-flight reply

OGAM ends a generation session when the active conversation changes and clears model-side cache work on the next task (`specs/context/OGAM-main/src/screens/ChatScreen/useChatScreenLifecycle.ts:150-167`). Its app/navigation lifecycle unconditionally stops audio on blur/before-remove and subscribes to foreground/background transitions with cleanup (`specs/context/OGAM-main/src/screens/ChatScreen/useChatScreenLifecycle.ts:31-59`). The persisted chat store excludes forming-reply fields; prior source evidence establishes that crash/reload recovery restores finalized transcript records only (`specs/context/OGAM-main/src/stores/chatStore.ts:489-498`).

Pi Remote inference: `visibilitychange`, `pagehide`, `pageshow`, route changes, and `online/offline` should be lifecycle inputs to the stream service and projection adapter. Hidden pages may stop DOM updates and release presentation resources, but must not hydrate a synthetic partial as durable history on return. On `pageshow`/route re-entry, reconcile from the service's current snapshot plus durable transcript; if the old turn is retired or expired, show no stale bubble and require a new turn. Whether the producer continues while the tab is hidden is a transport policy decision, not something this OGAM snapshot proves.

### F3 — Viewport behavior is a near-bottom policy plus measured keyboard geometry

OGAM hides the list until its first non-empty layout has scrolled to the end, then only follows content changes while `isNearBottomRef` is true (`specs/context/OGAM-main/src/screens/ChatScreen/ChatMessageArea.tsx:159-161,247-267`). It recovers from a shrinking viewport by scrolling after a short settle delay, dismisses the keyboard on list touch/drag, preserves visible content, and offers a haptic jump-to-bottom control when the user is away from the tail (`specs/context/OGAM-main/src/screens/ChatScreen/ChatMessageArea.tsx:269-303`). Bottom safe-area padding collapses while the keyboard is visible and distinguishes overlay insets from opaque navigation bars (`specs/context/OGAM-main/src/screens/ChatScreen/ChatMessageArea.tsx:50-73,198-209`).

Pi Remote mapping: implement the transcript as a flex child with `overflow:auto` and a composer that owns its bottom safe-area padding. Track `nearBottom` from `scrollHeight - (scrollTop + clientHeight)` with a small threshold; append/stream updates auto-scroll only when true. On first layout, defer reveal until the initial scroll-to-end has completed. When false, keep the reader's position stable and show a jump-to-bottom FAB. Use CSS scroll anchoring/explicit anchor preservation when older history is inserted. Treat `visualViewport.resize` and `visualViewport.offsetTop` as the browser keyboard geometry source, with `env(safe-area-inset-bottom)` for device insets; avoid assuming a fixed keyboard height.

### F4 — Keyboard-aware overlays need a settle-and-measure sequence

The native popover hook dismisses the keyboard first, waits for `keyboardDidHide`, then waits another 300 ms for the keyboard-avoiding input bar to settle before measuring the trigger; it computes bottom and right anchors from window coordinates and status-bar offset (`specs/context/OGAM-main/src/components/ChatInput/useKeyboardAwarePopover.ts:30-70`). The keyboard-height hook uses frame-change events on iOS and show/hide events on Android, exposing measured height rather than only visibility (`specs/context/OGAM-main/src/hooks/useKeyboardHeight.ts:4-35`).

Pi Remote mapping: for composer menus/popovers, close or account for the virtual keyboard, wait for `visualViewport` resize to settle across a `requestAnimationFrame` boundary, then measure with `getBoundingClientRect()` and clamp the overlay to the visual viewport. Recompute on resize, orientation, scroll, and route change; cancel pending listeners/timers on unmount. The invariant is “measure after the composer has settled,” not a copied native delay.

### F5 — Composer action precedence and attachment ownership are directly portable

The composer enables send when trimmed text or at least one attachment exists and the input is not disabled, then clears text/attachments and refocuses after dispatch (`specs/context/OGAM-main/src/components/ChatInput/index.tsx:196-209`). Its action button precedence is send, then stop while generating, then voice recording (`specs/context/OGAM-main/src/components/ChatInput/index.tsx:323-352`). Attachments are local pending state with generated IDs, removable previews, bounded image dimensions/quality, single-flight document picking, and explicit unsupported/stuck-picker messages (`specs/context/OGAM-main/src/components/ChatInput/Attachments.tsx:35-55,58-79,136-185,234-256`).

Pi Remote mapping: model the composer as a small explicit state machine (`disabled`, `canSend`, `generating`, `recording`) with the same precedence and one send path. Keep pending `File`/object-URL state separate from durable transcript records; revoke object URLs on removal/unmount. Persisting attachments across reloads is still an open web-surface decision: OGAM's native URI/file behavior does not establish IndexedDB, File System Access, or upload semantics.

### F6 — Failure messages should name the actionable next step, and haptics need a non-blocking fallback

`buildNoVisionAlert` distinguishes remote models, repairable missing vision files, and genuinely unsupported models, and each branch names the next action (`specs/context/OGAM-main/src/components/ChatInput/index.tsx:69-106`). Send, stop, and settings toggles use distinct medium/light impact feedback (`specs/context/OGAM-main/src/components/ChatInput/index.tsx:191-205,238-243`); the haptic wrapper catches failures because feedback is non-critical (`specs/context/OGAM-main/src/utils/haptics.ts:3-21`).

Pi Remote mapping: error copy should identify the capability failure and offer the exact available action (choose a server vision model, repair/download, retry, or dismiss). Use `navigator.vibrate` only as a feature-detected enhancement and keep all actions correct without it; do not make haptics part of the state transition.

### F7 — Transcript performance and collapsible identity rules survive the platform change

`MessageRenderer` compares stable item references and scalar display flags, so historical messages skip markdown reparsing while only the synthetic streaming item changes per token (`specs/context/OGAM-main/src/screens/ChatScreen/MessageRenderer.tsx:133-165`). Tool result rows are memoized to keep press targets stable during sibling token churn, and their expanded state is keyed by `toolCallId`/stable identity in an external accordion store because the streaming row remounts at finalization (`specs/context/OGAM-main/src/components/ChatMessage/components/ToolMessages.tsx:55-58,80-141,179-201`; `specs/context/OGAM-main/src/stores/accordionStore.ts:4-18`). Thinking is a first-class toggle with a short collapsed preview, while `ThinkTagParser` buffers split open/close tags and routes reasoning separately from answer text (`specs/context/OGAM-main/src/components/ChatMessage/components/ThinkingBlock.tsx:13-53`; `specs/context/OGAM-main/src/services/providers/openAICompatibleStream.ts:16-20,33-117`).

Pi Remote mapping: use keyed Svelte blocks and immutable historical message objects; update only the active stream row. Keep reasoning, tool-call, and tool-result rows as separate collapsible records with stable turn/tool IDs that survive preview-to-durable replacement. Put expansion state outside the remounting row, and keep the parser state in the stream service so chunk boundaries cannot leak provider tags into visible answer text.

### F8 — Shared sync lease and sequence semantics remain UNKNOWN

The package manifest resolves `@offgrid/sync` to `file:../shared/packages/sync`, but that sibling implementation is not present in the supplied snapshot (`specs/context/OGAM-main/package.json:33-40`). The available consumers prove snapshot fields and ownership but do not prove lease duration, renewal/heartbeat, accepted sequence window, expiry clock, or behavior for frames arriving after tombstone. Those values must remain TBD until the shared package or an equivalent source snapshot is available.

## Questions Answered

- **Browser lifecycle and viewport mapping:** answered at the adoptable contract level: service-owned stream lifecycle, projection-only UI state, no stream resurrection after reload, near-bottom-gated autoscroll, initial-layout reveal, measured visual-viewport keyboard handling, and explicit safe-area treatment.
- **Mobile composer/keyboard/attachment/failure ergonomics:** answered with source-backed rules and browser translations; attachment durability remains an implementation choice for Pi Remote.
- **Transcript speed and collapsible surfaces:** answered: stable immutable historical rows, one changing stream row, external accordion state, stable tool-call identity, first-class thinking/tool rows, and chunk-safe reasoning parsing.
- **Exact shared sync lease/sequence/expiry protocol:** not answered; the source boundary is explicit and must not be guessed.

## Questions Remaining

- The exact `@offgrid/sync` producer/receiver lease, renewal, sequence-window, expiry, and late-frame retirement behavior remains UNKNOWN.
- Pi Remote must choose and test browser attachment durability (ephemeral object URLs versus IndexedDB/File System Access/upload-backed records).
- Pi Remote must define whether hidden tabs keep the producer alive, pause transport, or rely on server-side continuation; OGAM's native lifecycle only establishes that presentation/resource ownership needs explicit cleanup.

## Next Focus

No further research iteration is available. Implement the SvelteKit mapping against the confirmed contracts, keeping sync lease/sequence values and attachment durability behind explicit interfaces until their owning package/product decision is available.
