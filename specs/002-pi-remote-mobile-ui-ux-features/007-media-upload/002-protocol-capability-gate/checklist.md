# Checklist — Protocol Contracts and Fail-Closed Capability Gate

- [x] Existing text prompt, steer, follow-up, plan, approval, sync, and cache tests pass. — backend `npm test` 266/266 (re-run, outside sandbox); web 545/545; all pre-existing suites green.
- [x] Malformed prompt-submit data and every pixel-bearing submission shape are rejected before relay business logic. — `isPromptSubmitCommand` exact-key allowlist; boundary tests reject `base64`, `path`, duplicate/out-of-range refs.
- [x] Runtime snapshot data is the sole source of active-model capability and host limits. — `withMediaCapability` populates `media` from `state.model.input`; web reads capability only via `isRuntimeMediaCapabilityDto`.
- [x] A text-only model reports `imageIn: false`; the client does not infer capability from a model label. — `imageIn = state.model.input.includes('image')`; no model-name parsing anywhere in the diff.
- [x] With `PI_REMOTE_MEDIA_ENABLED` unset or not `1`, no attachment route is registered and no UI photo action exists. — `handleHttp` returns 404 for attachment routes unless `mediaEnabled === true`; CDP shows zero media affordances (both themes).
- [x] Existing read-only routes retain their prior behavior and authorization semantics. — no route logic changed beyond the added fail-closed gate; relay suites (auth/runtime/plan/approval/sync/artifact) green.
- [x] New DTOs and guards reject unknown keys, invalid digests, invalid ordinals, out-of-range values, filenames, paths, base64, and pixels. — `hasOnlyKeys`/exact-key guards + `isSha256Digest` + bounded-integer checks; verified in `guards.test.ts`.
- [x] Unknown transcript kinds remain safely preserved or rendered as unknown without media assumptions. — `state.ts` routes `kind: 'attachment'` and unknown kinds to the existing unknown-display path; `isTranscriptBlock` rejects unregistered kinds.
- [x] `npm run typecheck` exits 0. — verified on `main`, outside sandbox.
- [x] `npm run test` exits 0. — 266/266 on re-run (+5 protocol tests vs 261 baseline). First run hit only the documented non-deterministic `auth.test.ts` socket-close flake (`expected 201 to be 403`), which passed on re-run; Phase 1 touched no registration/ticket code.
- [x] `npm run test:web` exits 0. — 545/545, delta 0 (data-layer change only).
- [x] Focused protocol guard and existing relay/web suites exit 0. — `packages/pi-rpc-protocol/tests/guards.test.ts` 40 tests; relay + web regression suites green.
- [x] A real CDP run uses exactly 390 CSS px in light and dark themes with media disabled. — headless Chrome via CDP, `Emulation.setDeviceMetricsOverride` width 390; both themes reported `width=390` and matching `data-theme`.
- [x] The CDP evidence shows no photo rows, no attachment rail, and no changed text-composer layout. — `mediaAffordances=0` (no file-input / photo·attach·camera·image labels / attachment-rail / photo-row); 390×844 PNGs inspected, composer + cards unchanged in light and dark.
- [x] The scoped worktree contains only intended implementation changes and repository-permitted generated output. — built on `main` (operator choice); `git status` shows exactly the 10 allowed files changed, no stray files.
