# Checklist — Inline ask-question card, options, free-text, and non-optimistic state machine

- [ ] `npm run typecheck` exits 0.
- [ ] `npx vitest run packages/pi-rpc-protocol/tests apps/pi-remote-relay/tests` exits 0.
- [ ] `npm run test:web` exits 0.
- [ ] A true-390px CDP run passes in light and dark themes with one inline card, fully visible options, no route change, and the focused field above the virtual keyboard.
- [ ] A valid presentation renders exactly once at the correct chronological transcript position with no modal, scrim, or page-level focus trap.
- [ ] Prompt, descriptions, options, free text, read-only hint, status, and submit action render only from the guarded redacted view model.
- [ ] Single and multiple selection semantics are correct, required free text validates locally, and free text appears only when allowed.
- [ ] Selection, blur, and free-text edits send no mutation; explicit submit enters `submitting` and disables all answer controls.
- [ ] Retryable errors preserve local values, accepted confirmation produces an immutable answered line, terminal lifecycle states block stale submission, and duplicate submits produce one mutation.
- [ ] Ordinary transcript ordering, `SessionComposer`, read-only cache behavior, content-free push, and existing mutation boundaries remain intact.
