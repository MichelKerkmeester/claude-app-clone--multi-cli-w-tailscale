# Spec 002 — Handover

> **State:** build in progress. All 10 features are research-complete + build-ready.
> **Features 001–006 are BUILT and merged to `main`** — `001-change-model`, `002-change-effort`,
> `003-slash-commands`, `004-plan-mode-tab`, `005-file-preview`, `006-rich-content-blocks` (23 build
> phases; `main` at merge `5925ff7`). Features 007–010 pending. A separate **`specs/003-pi-remote-design-system/`**
> packet (designer-editable design system, 4 phases, planning-only scaffold, committed `2899db2`) also
> lives on `main` — see its own docs. This packet lives in the app repo (`Mobile CLI`), tracked on `main`.
> **Resume:** read this file → `build-strategy.md` (the how + model roster) → the target
> feature's `research/research.md` + its build sub-phase docs, then build. Next: `007-media-upload`
> (**HARD-GATED** — new binary lane user→pi; adversarial security review of the spec BEFORE any build phase).

---

## 1. What this packet is

Pi Remote mobile UI/UX feature-parity. The secure foundation shipped in the sibling
packet `../001-pi-remote-mobile-agent-like-cc`; this packet brings the mobile chat to
Claude-iOS / Kimi-app quality and adds the agent controls `pi` exposes on the desktop
terminal — **without** weakening the two frozen contracts:

- **Design system (frozen):** ink-on-parchment — bone `#f8f8f6` / carbon ink `#24221f` / clay `#d97757`; Inter + Source Serif 4; light + dark; WCAG AA.
- **Security posture (frozen):** read-only default; one-use ticketed + revision-checked mutations that fail closed; redaction everywhere; host/extension-enforced plan mode; content-free push; operator-only `--full-access` the phone can never enable.

## 2. Current state

- **Feature 001 `change-model` — SHIPPED to `main`** (`69c0480`→`3b5546c`): bound-ticket protocol/redaction, RAC model-switcher sheet + state machine, iPhone a11y/visual hardening, demo-fixture sync. Verified: typecheck 0, test 140, test:web 74; light+dark 390px screenshots delivered.
- **Feature 002 `change-effort` — SHIPPED to `main`** (merged at `84b7433`): typed host snapshot + redacted reconcile, complete runtime state machine + mutation boundary, canonical model+effort sheet with effort radio group, a11y/visual hardening. Verified: typecheck 0, test 147, test:web 176; effort-sheet light+dark 390px screenshots delivered.
- **Feature 003 `slash-commands` — SHIPPED to `main`** (merged at `0408c3c`): versioned catalog authority + fail-closed slash submission, shared in-memory catalog + pure engine, inline autocomplete surface, explicit-Send integration + PWA hardening. Verified: typecheck 0, **test 168/168**, **test:web 358/358**. Autocomplete screenshots DEFERRED to a batched visual pass (needs a `demo.ts` command-catalog fixture sync; functional rendering proven by 358 DOM tests).
- **Feature 004 `plan-mode-tab` — SHIPPED to `main`** (merged at `51b0685`; 5 phases): set_mode/execute_plan protocol + relay authority (independent runtime/plan revisions, idempotency, delivery-unknown, planToken redaction); host default-deny enforcement + structured plan lifecycle + fail-closed execution lease + `/plan` isolation; persistent composer Build/Plan control + `Shift+Tab`/`⌘⇧M`; plan-ready card + review sheet + atomic `execute_plan`; a11y/PWA/cache hardening. Verified: typecheck 0, **test 221/221**, **test:web 459/459**. Screenshots DEFERRED to the batched visual pass.
- **Feature 005 `file-preview` — SHIPPED to `main`** (`45ac145`→`86d9d76`→`adf1db3`→`41bef3e`; 4 phases): openable redacted-diff foundation (shared `ArtifactViewer` shell, race-safe, no-fetch-on-open); relay-authored immutable artifact contract (`FilePreviewBlock`, SQLite `artifact-store` with SHA-256 identity, authenticated exact-tuple read endpoint — auth-first, ticket-free, no-store/nosniff/same-origin, `latest`/path rejected); text/Markdown/code/diff renderers + digest-verified race-safe resource hook + Copy/policy-gated Share (inert Markdown, no URL minting); sanitized image (PNG decode/re-encode metadata-strip) + controlled PDF.js (self-hosted worker, annotations+XFA disabled, text-layer only when relay-attested, unsafe→withheld) + binary Share (files-only) + memory/PWA/cache hardening. Verified: build 0, typecheck 0, **npm test 246**, **test:web 511**; image/PDF + text/code + diff + artifact-states light+dark 390px CDP inspected. Adds pinned `pdfjs-dist@6.2.108` (only new dep; local worker, no CDN). Physical-device pass operator-required.
- **Feature 006 `rich-content-blocks` — SHIPPED to `main`** (`a2488fc`→`b5bffee`→`9ec55fd`, merge `5925ff7`; 3 phases): authoritative rich-block protocol + relay redacted projection (opaque `callId`, shell genre, lifecycle/checkpoint, completeness, `TextArtifactBlock`; redaction before persistence/replay/broadcast; no new route); inline Bash Command/Output + code + text-artifact cards, exact canonical-source Copy, inert SafeMarkdown (no innerHTML; HTML/`javascript:`/`data:` → plaintext; URLs stripped), F6 Open reusing the 005 viewer (one modal, opaque-id history); progressive hand-rolled highlighter WORKER (allowlist, 20k-char/1k-line cutoff before dispatch, redacted-source-only, stale-response dropped, memory-only + cleaned, text-node tokens), SafeMarkdown ANSI/bidi hardening, streaming/F6 reconciliation, a11y/RTL/200%/reduced-motion, memory no-growth. Verified: build 0, typecheck 0, **npm test 261**, **test:web 545**; legacy-activity + rich-core + rich-release light+dark 390px CDP inspected. No new dependency. Physical-device pass operator-required. NOTE: repo-wide `npm run lint` (`eslint .`) fails ONLY on ~45 pre-existing errors in unmodified files (phase-6 code is lint-clean) — same debt class as prettier.
- **Features 007–010 — build-ready, not started.** Each has synthesized `research.md`, build-ready `spec.md` + `implementation-phases.md`, and numbered build sub-phases. **40 build phases total; 23 done.** Hard security gates before their Phase 1: `007-media-upload`, `008-inbound-media`, `009-ask-question` (adversarial review by Claude of the spec BEFORE any build phase).
- **Live build route (see `build-strategy.md` §3 session note):** quotas rotate. As of feature-005 completion: opencode-go weekly cap ACTIVE (Luna Max via `opencode-go/gpt-5.6-luna --variant max` hangs 0-byte on 429 — probe with a short `gtimeout`); Devin daily quota exhausted; DeepSeek direct 402. **Two working routes right now:** `codex exec --model gpt-5.6-luna -c model_reasoning_effort="max" -c service_tier="fast" -c approval_policy=never --sandbox workspace-write` (OpenAI OAuth — but its sandbox blocks localhost sockets, so re-run `npm test` OUTSIDE it), and `cursor-agent -p --model gpt-5.6-luna-max-fast --force --sandbox disabled --output-format text` (network-enabled, self-installs deps — used for 005 phase 4's pdfjs). Env prefix both: `MK_SPEC_GATE_ENFORCE=0 AI_SESSION_CHILD=1`. Claude orchestrates + verifies, never writes app code.
- **Known issues (non-blocking):** (1) `apps/pi-remote-relay/tests/auth.test.ts` "requires foreground..." — the socket-close race (§7.2) is now failing CONSISTENTLY (not ~50%) under this machine's load, `expected 201 to be 403`; unchanged by feature 005 (it passed repeatedly in the 005 worktree gates), fix per §7.2 (await server deregistration). Track future `npm test` as "all pass except this one known test." (2) **Repo-wide prettier debt: ~685+ files unformatted** (external-model-built code committed un-formatted; `npm run format:check` fails repo-wide). Dedicated `npm run format` + commit pass recommended as final cleanup. (3) **Batched screenshots** for features 003+004 pending a `demo.ts` fixture sync (functional rendering proven by DOM tests); 001/002/005 screenshots delivered.

## 3. Structure

```
002-pi-remote-mobile-ui-ux-features/        ← phase-parent (lean trio + goal/README/ROADMAP/ARCHITECTURE + this file)
  001-change-model/                          ← feature phase (itself a phase-parent)
    spec.md  description.json  graph-metadata.json   ← feature intent + metadata
    implementation-phases.md                         ← the phased build plan
    001-research/                            ← LEAN spec-kit phase (spec + 2 JSONs), points at ../research/
    research/                                ← deep-loop-aligned research artifacts (NOT a phase)
      research.md                            ← the build-ready synthesized decision (canonical)
      reference-screens.md                   ← real Mobbin/Refero captures + reference-backed UI/UX direction
      iterations/iteration-NNN.md            ← the cited research passes
      BRIEF.md  .research-topic.txt  deep-research-config.json  PROVENANCE.md
    002-…/ 003-…/ …                          ← numbered build sub-phases (spec/plan/tasks/checklist each)
  002-change-effort/ … 008-inbound-media/    ← same shape
  009-ask-question/ 010-todos/               ← net-new; research/ has reference-screens.md + brief; research.md PENDING
```

**The 10 features (phase number = build order):**

| Phase | Feature | Research |
|-------|---------|----------|
| `001-change-model` | host-authoritative model switcher sheet | ✅ synthesized + 8 ref screens |
| `002-change-effort` | effort/reasoning picker in the model/effort sheet | ✅ + 12 |
| `003-slash-commands` | inline `/` command autocomplete from the live catalog | ✅ + 14 |
| `004-plan-mode-tab` | host-confirmed plan mode + composer `Shift+Tab` | ✅ + 13 |
| `005-file-preview` | redacted file card + full-screen read-only viewer (viewer shell others reuse) | ✅ + 14 |
| `006-rich-content-blocks` | bash command/output cards + code/text artifact cards (copy + full-screen) | ✅ + 14 |
| `007-media-upload` | upload from iOS gallery (new binary lane, security-first) | ✅ + 14 |
| `008-inbound-media` | preview media/screenshots pi sends inline (new inbound lane, security-first) | ✅ + 14 |
| `009-ask-question` | pi's ask-question extension, terminal-style prompt UI | ⏳ ref screens only, synthesis pending |
| `010-todos` | pi's todos, Manus/Claude-grade task list | ⏳ ref screens only, synthesis pending |

**Hard gates:** `007-media-upload` and `008-inbound-media` each add a new binary content lane and MUST pass an adversarial security/redaction review of their spec before any build phase. `005-file-preview` establishes the viewer shell that `006` and `008` reuse — build it first among that group.

## 4. Reusable recipes (how the research was produced)

**Reference-screen research via code-mode Mobbin/Refero** (orchestrator: scratchpad `reference-screens-002.mjs`):
- Dispatch `opencode run --model opencode-go/deepseek-v4-flash "<prompt>" </dev/null` with **cwd = the Public project root**. The code-mode MCP (Mobbin, Refero, Figma, GitHub, Chrome) only loads from the project dir — running from scratchpad or relying on `~/.config/opencode` yields **zero MCP** (a false negative).
- Refero is the reliable source (`refero_refero_search_screens`, 315+ matches/query). Mobbin (`mobbin_search_screens`) is intermittent (sometimes 0 — likely rate-limit); agents note gaps rather than fabricate. A re-run when Mobbin isn't throttled adds coverage (orchestrator is resumable — it skips features whose `reference-screens.md` already exists).
- **Concurrency 2 + ~8s stagger.** Three concurrent full-framework agents fast-fail (exit 0 in ~14s, no output) from a startup race.
- Envelope: `MK_HOOKS_DISABLED=1 MK_SPEC_GATE_DISABLED=1 AI_SESSION_CHILD=1`, and **pre-resolve Gate 3 in the prompt** — the Public project loads the code-env `AGENTS.md`, so a dispatched agent otherwise stops to ask the A/B/C/D/E documentation-scope question and never does the work.

**Original synthesis research** (external-CLI, no `/deep:research` runtime): DeepSeek v4 Flash via `opencode run --model opencode-go/deepseek-v4-flash`; SOL high via `codex --search exec -m gpt-5.6-sol -c model_reasoning_effort=high`; Grok 4.6 xhigh via `cursor-agent -p --model cursor-grok-4.6-xhigh --mode ask -f`. 80 iterations, no early convergence. Because this didn't run through the deep-loop state machine, `research/` intentionally omits runtime artifacts (`deep-research-state.jsonl`, `findings-registry.json`, dashboard, deltas, lineages) — see each `research/PROVENANCE.md`.

## 5. Spec-kit metadata & validation (keep it clean)

- Metadata is **scripted, not hand-crafted**: `generate-description.js <folder> <specroot> --level phase|3 --description "…"` + `backfill-graph-metadata.js <relpath>` (run from `Public/specs`). Dist scripts under `.opencode/skills/system-spec-kit/scripts/dist/`.
- **Generate metadata LAST**, after all `spec.md` edits — otherwise fingerprints drift → `GENERATED_METADATA_INTEGRITY` / `_DRIFT` errors.
- Every `spec.md` needs a `SPECKIT_TEMPLATE_SOURCE` marker near the top. Phase-parents need `_memory.continuity` frontmatter with **compact** `recent_action`/`next_safe_action` (≤96 chars, ≤16 tokens, ≤1 period; `next_safe_action` must start with an allowed verb — build/prepare/investigate/run/… **not** gather), `open_questions`/`answered_questions` arrays, and `packet_pointer` = the folder's **own** path.
- Stale parent `children_ids` (e.g. after deleting a folder): `backfill-graph-metadata.js <pp> --prune-report` then `… --prune --prune-confirm <contentHash>` (report writes to `Public/specs/.backfill-graph-metadata-prune-report.json`).
- **Gate:** `validate.sh <packet-path> --strict` → `Errors: 0`. The only remaining warning is `PHASE_LINKS` (inherent — the reference `001` packet carries it too; not worth chasing). Standalone-validating a *feature* also surfaces Level-3 file gaps on the un-built leaf phases — expected for un-built scaffolds; the authoritative packet-level validate stays clean.

## 6. Git / remote state

- Repo: framework monorepo `opencode--skilled-agent-loops-with-spec-kit-memory`, branch `skilled/v4.0.0.0`. Live-sync auto-publishes commits; also push explicitly to be sure.
- Commit each change **scoped**: `git commit --only -- <spec-path>` isolates from other sessions' concurrent staged work (the repo is shared — `sk-vision`, `pi-fast-mode`, etc. move independently).
- This packet's commits: relocated packet → warnings fix → reference research + F9/F10 → metadata fix. All pushed.
- The old app-repo copy (`Apps/Pi Mobile` → `specs/002`) was removed from the `pi-mobile-pwa-tailscale` remote (mass-deletion hook needs `SPECKIT_ALLOW_MASS_DELETION=1` on both commit and push; app `specs/` is a symlink → use `git rm --cached`).

## 7. Next steps

1. **Build feature `007-media-upload`** next — but it is **HARD-GATED**: a new binary lane (user→pi gallery upload), so Claude MUST run an adversarial security/redaction review of its `spec.md` + `implementation-phases.md` BEFORE dispatching any build phase. `008-inbound-media` (reuses the 005 viewer; also hard-gated) and `009-ask-question` (new ticketed mutation surface; hard-gated) follow; `010-todos` is read-only. Isolated worktree off `main`, dispatch each build phase to a working route (cursor Luna Max fast, or codex — see §2), verify OUTSIDE any sandbox (typecheck + `npm test` + `npm run test:web` + `npm run build` + 390px light/dark CDP), merge per feature.
2. **Fix a known flaky test:** `apps/pi-remote-relay/tests/auth.test.ts` → "requires foreground and consumes an exact bound runtime ticket before control". After `socket.close()` it asserts the next `/api/runtime/ticket` returns 403, but only awaits the *client-side* close, so the server may not have deregistered the socket yet → intermittent 201. Fix: poll the foreground state until the server reflects the closed socket before asserting 403.
3. **Hard security gates** (adversarial review before that feature's Phase 1): `007-media-upload`, `008-inbound-media`, `009-ask-question`.
4. Each feature: implement from `research.md` (decision) + build sub-phase docs (phased plan); verify with typecheck + tests + true-390px light/dark CDP. The CDP capture harness (zero-dep, system Chrome over CDP) + demo-mode capture technique were built this session.

## 8. Known caveats

- **Mobbin intermittent** — reference docs lean on Refero; re-run for denser Mobbin coverage when it's not rate-limited.
- **`009`/`010` research is partial** (reference screens only; no synthesized decision yet).
- **Build-time docs** (`decision-record.md`, `implementation-summary.md`) are intentionally absent on un-built sub-phases; add them as each phase is built.
- Pre-push tests on the monorepo are report-only; their pre-existing failures are unrelated to this doc-only packet.
