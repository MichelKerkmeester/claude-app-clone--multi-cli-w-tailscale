# Spec 002 — Handover (detailed)

> **State:** build in progress, 6/10 features shipped.
> **Features 001–006 are BUILT, VERIFIED, and merged to `main`** — `001-change-model`,
> `002-change-effort`, `003-slash-commands`, `004-plan-mode-tab`, `005-file-preview`,
> `006-rich-content-blocks` (**23 of 40 build phases**; `main` at `07bd02f`, feature-006 merge
> `5925ff7`). **Feature `007-media-upload` is GATE-CLEARED** (adversarial security review done +
> committed `07bd02f`) but **NOT built** — build it next, starting at its Phase 1. Features 008–010 pending.
> A sibling **`specs/003-pi-remote-design-system/`** packet (designer-editable design system; planning
> scaffold only; committed `2899db2`) also lives on `main`.
> **Resume ladder:** this file → `build-strategy.md` (§3 model roster + the dispatch how-to) →
> the target feature's `spec.md` + `implementation-phases.md` + `research/research.md` → its build
> sub-phase docs. Then run the build loop in §4 below.

---

## 1. What this packet is

Pi Remote — an installable **iPhone PWA** that remote-controls the `pi` coding agent on a Mac over a private **Tailscale** tailnet. Monorepo (npm workspaces, `@pi-remote/*`, strict TS): `packages/pi-rpc-protocol`, `apps/pi-remote-relay` (Node + SQLite), `apps/pi-remote-web` (React 19 + Vite + Tailwind 4 + react-aria-components), `extensions/pi-remote-plan` + `pi-remote-approval`. The secure foundation shipped in sibling packet `001-pi-remote-mobile-agent-like-cc`. This packet brings the mobile chat to **Claude-iOS / Kimi-app quality** and adds the agent controls `pi` exposes on the desktop terminal — **without weakening two frozen contracts.**

- **Design system (FROZEN):** ink-on-parchment. Light: bone `#f8f8f6`, raised `#ffffff`, carbon `#24221f`, muted `#6c6a65`, clay `#d97757`, AA text accent `#8a452f`, AA UI accent `#b85f42`, soft selection `#f3e4de`. Dark: page `#24221f`, raised `#2d2a26`, text `#f8f8f6`, muted `#9f998f`, clay `#d97757`, accent text `#f0b19a`, soft selection `#3a2720`. Inter + Source Serif 4. Light + dark. WCAG AA. ≥44px targets. Clay is never the sole state signal and never small/normal body text.
- **Security posture (FROZEN):** read-only by default; one-use ticketed + revision-checked mutations that fail closed; redaction everywhere (allowlist, not blocklist); host/extension-enforced plan mode; content-free push; operator-only `--full-access` the phone can never enable. Work is UI-only unless a feature inherently needs a new lane — flagged and designed security-first, hard-gated on an adversarial review.

**THE IRON CONSTRAINT:** Claude **orchestrates and verifies**; external models **implement all app code**. Claude never writes code under `apps/`, `packages/`, or `extensions/` (test files included). Claude MAY author spec-folder docs (spec/plan/tasks/checklist/implementation-summary/handover/build-strategy/adversarial reviews) and MAY run builds, dependency installs, git, and verification.

## 2. Current state — shipped features (all on `main`, independently verified)

| Feature | Phases | Merge | Backend `npm test` | `npm run test:web` | What shipped (1-line) |
|---|---|---|---|---|---|
| `001-change-model` | — | `3b5546c` | 140 | 74 | host-authoritative model switcher sheet; browse read-only, confirm = one-use revision-bound ticket |
| `002-change-effort` | — | `84b7433` | 147 | 176 | effort picker in the canonical model/effort sheet; non-optimistic confirmed state |
| `003-slash-commands` | — | `0408c3c` | 168 | 358 | composer `/` autocomplete from the relay live catalog; mutates nothing until Send |
| `004-plan-mode-tab` | 5 | `51b0685` | 221 | 459 | host-confirmed Build/Plan control + structured Plan lifecycle + atomic execute_plan + `Shift+Tab` |
| `005-file-preview` | 4 | `41bef3e` | 246 | 511 | redacted-diff card + full-screen viewer shell; immutable artifact contract; text/code/image/PDF renderers |
| `006-rich-content-blocks` | 3 | `5925ff7` | 261 | 545 | Command/Output + code/text cards + exact Copy + F6 reuse + progressive highlighter worker |

Per-feature detail (each phase was: dispatch → independent gate outside sandbox → adversarial security review of the diff → checklist/implementation-summary → `validate.sh --strict` → scoped commit → per-feature merge, with light+dark 390px CDP inspected):

- **005 `file-preview`** (`45ac145`→`86d9d76`→`adf1db3`→`41bef3e`): (P1) openable redacted-diff foundation — shared `apps/pi-remote-web/src/artifacts/` viewer (`ArtifactViewerProvider`/`ArtifactViewerHost`/`ArtifactCard`/`useArtifactHistory`), race-safe, zero fetch/path/tool on open. (P2) relay-authored immutable artifact contract — `FilePreviewBlock`, SQLite `artifact-store` with SHA-256 identity, authenticated **exact-tuple read endpoint** (`/api/sessions/{s}/artifacts/{a}/revisions/{r}`, auth-first, ticket-free, `private,no-store`/`nosniff`/`same-origin`/CSP, `latest`+path rejected, immutable-reuse throws), fail-closed sanitizer. (P3) text/Markdown/code/diff renderers + digest-verified race-safe `useArtifactResource` + Copy/policy-gated Share (inert Markdown, `{title,text}` share, no URL). (P4) sanitized image (PNG decode/re-encode metadata-strip) + controlled PDF.js (self-hosted worker, annotations+XFA off, text-layer only when relay-attested, unsafe→withheld) + binary Share (files-only) + memory/PWA/cache hardening. Adds pinned **`pdfjs-dist@6.2.108`** (only new dep; local worker, no CDN).
- **006 `rich-content-blocks`** (`a2488fc`→`b5bffee`→`9ec55fd`, merge `5925ff7`): (P1) authoritative rich-block protocol + relay redacted projection (opaque `callId`, shell genre, lifecycle/checkpoint, completeness, `TextArtifactBlock`; redaction before persistence/replay/broadcast; **no new route**). (P2) inline Bash Command/Output + code + text-artifact cards, exact canonical-source Copy, **inert SafeMarkdown** (no `dangerouslySetInnerHTML`; HTML/`javascript:`/`data:` → plaintext; link/image URLs stripped), F6 Open reusing the 005 viewer (**one modal**, opaque-id history). (P3) progressive hand-rolled highlighter **worker** (allowlist; 20k-char/1k-line cutoff before dispatch; redacted-source-only; stale request/revision dropped; memory-only + cleaned; text-node tokens), SafeMarkdown ANSI/bidi hardening, streaming/F6 reconciliation, a11y/RTL/200%/reduced-motion, memory no-growth. No new dependency.

**Features 007–010 — build-ready, not started** (except 007's gate, done). 40 build phases total; **23 done.**

## 3. Feature 007 status (GATE-CLEARED, build next)

`007-media-upload` = a **new binary lane** (iOS gallery/camera photos, user→pi), a controlled exception to read-only-by-default. The **hard-gate adversarial security review is DONE** — see `007-media-upload/adversarial-security-review.md` (committed `07bd02f`). **Verdict: approved to build.** It is a **5-phase** feature (see `007-media-upload/implementation-phases.md`): P1 protocol contracts + fail-closed capability gate (low risk, no bytes); P2 ticketed binary ingress + quarantine + normalization (own security review); P3 normalized Pi image bridge + redacted transcript + pinned-Pi persistence/echo probe (own security review); P4 local composer draft/preview/rail UI; P5 end-to-end + real-device + enablement (blocking security review). `PI_REMOTE_MEDIA_ENABLED` stays OFF until P5 sign-off.

**Two MUST-FIX items the build must honor (from the review, enforce in the owning phase):**
1. Decode images in a **real OS-level process/WASM sandbox**, NOT a Node `worker_thread` (a decoder CVE in a worker_thread owns the relay — no memory boundary). Phase 2.
2. Enforce pixel/dimension ceilings **at header-parse time, before allocating the decode buffer** (decompression-bomb protection). Phase 2.

`008-inbound-media` (pi→phone, reuses the 005 viewer) and `009-ask-question` (new ticketed mutation surface) are **also hard-gated** — run the same adversarial-review-before-build for each. `010-todos` is read-only (no hard gate).

## 4. THE BUILD LOOP (proven this session — follow it per phase)

1. **Worktree.** `bash .claude/skills/sk-git/scripts/worktree-naming.sh create pi-remote-00X-<slug> main` (allocator picks the number; creates `.worktrees/NNN-...` + branch `worktrees/NNN-...`). Then `cd` in, `ln -s "<main>/.opencode" .opencode` (gitignored; needed for commit hooks + skills), `npm ci`, `npm run build`.
2. **Baseline BEFORE dispatch.** A fresh worktree's web suite is RED until `npm run build` produces the protocol dist (`@pi-remote/pi-rpc-protocol` unresolved otherwise). Build, then capture real `npm test` + `npm run test:web` counts as the delta baseline.
3. **Compose the dispatch prompt** (scratchpad file). Include: EXECUTION-DISCIPLINE header; `Spec folder: <path> (pre-approved, skip Gate 3)`; what to build (point at the real files to read); FROZEN DESIGN TOKENS (verbatim); FROZEN SECURITY (the crux, per feature); **ALLOWED WRITE PATHS** (exact list); **BANNED OPERATIONS**; comment hygiene; the verification gate with **baseline counts**; "report back". For a CLI dispatch you MUST first `Read` the target `.claude/skills/cli-external-orchestration/cli-X/SKILL.md` (constitutional).
4. **Dispatch to a working route** (§5). Background it under `gtimeout`, env-prefix `MK_SPEC_GATE_ENFORCE=0 AI_SESSION_CHILD=1`, redirect `</dev/null`. Arm a **watchdog** (Monitor on the log/file-count) to catch an early 429 stall or a hang; fall back to another route if it stalls.
5. **Verify INDEPENDENTLY, outside any sandbox** (Iron Law): `npm run build`, `npm run typecheck`, `npm test`, `npm run test:web` — read exit + counts; confirm the **delta** vs baseline; confirm **main checkout is untouched** (RM-8 blast check) for `--sandbox disabled` dispatches. Then **read the security-critical diffs yourself** (finding = hypothesis) and run the phase's **CDP** light+dark at true 390px and **inspect the PNGs**.
6. **Finalize the phase docs** (Claude authors these): `implementation-summary.md` + mark `checklist.md` `[x]` with evidence (mark operator-required items honestly, never fabricated). `bash .opencode/skills/system-spec-kit/scripts/spec/validate.sh <phase-folder> --strict` → exit 0.
7. **Commit scoped** in the worktree (conventional; subject = lowercase imperative verb ≤ ~80 chars or the commit-msg hook blocks it; end with the `Co-Authored-By` + `Claude-Session` trailers).
8. **Merge per feature.** From the main checkout: `git merge --no-edit worktrees/NNN-...` (a plain merge — `main` may have diverged via other doc commits, so `--ff-only` can fail; disjoint files auto-merge cleanly). Then `git worktree remove <path>` **before** the main gate (avoids `.worktrees/` polluting vitest). Then on `main`: `npm ci` (if the feature added a dep), `npm run build`, and re-run the full gate. Update `handover.md`, commit.

## 5. Model routes (rotate on quota exhaustion)

Quotas rotate; probe before relying. As of `07bd02f`:
- **opencode-go / Luna Max** — 429 weekly cap ACTIVE (silently hangs 0-byte; probe with `gtimeout 75 opencode run --model opencode-go/gpt-5.6-luna --variant max --format json --dir <wt> "PROBE" </dev/null` → exit 124 + 0-byte log = capped).
- **Devin / DeepSeek v4 Flash Max** — daily quota exhausted (`devin -p --model deepseek-v4-flash-max --permission-mode dangerous --respect-workspace-trust false`).
- **codex (OpenAI OAuth) — WORKING.** `codex exec --model gpt-5.6-luna -c model_reasoning_effort="max" -c service_tier="fast" -c approval_policy=never --sandbox workspace-write "<prompt>"`. Runs the user's preferred Luna Max on a separate quota. **Caveat:** its sandbox blocks localhost sockets → relay socket tests throw false `listen EPERM` in-session; **re-run `npm test` OUTSIDE the sandbox** yourself. Cannot do network installs in-sandbox.
- **cursor / Luna Max fast — WORKING (primary this session).** `cursor-agent -p --model gpt-5.6-luna-max-fast --force --sandbox disabled --output-format text "<prompt>" </dev/null`. Network-enabled (self-installs deps — did 005's pdfjs), binds sockets in-session (relay tests run clean). Occasional "Connection lost, reconnecting" blips — it recovers; use a resume-tolerant watchdog. `--force --sandbox disabled` = full autonomy; the RM-8 mitigation (prompt BANNED/ALLOWED + worktree isolation + committed baseline + capable model) is why it's acceptable. Model id `gpt-5.6-luna-max-fast` is on cursor's enforced 21-id allowlist.
- Env-prefix all: `MK_SPEC_GATE_ENFORCE=0 AI_SESSION_CHILD=1`. Read the `cli-X` SKILL.md before composing any dispatch.

## 6. Known issues (non-blocking)

1. **Flaky `apps/pi-remote-relay/tests/auth.test.ts`** "requires foreground and consumes an exact bound runtime ticket before control" — socket-close race (`expected 201 to be 403`): after `socket.close()` it asserts the next control call is 403, but only awaits the *client-side* close, so the server may not have deregistered yet → intermittent 201. Frequency varies with machine load (seen 6/6 fail once, then passing). **Not a regression** (passes repeatedly in feature worktrees). Track `npm test` as "all pass except this one known test"; re-run to confirm. **Fix (worth doing):** poll the foreground/registration state until the server reflects the closed socket before asserting 403.
2. **Repo-wide lint/format debt** — `npm run lint` (`eslint .`) fails on ~45 pre-existing errors, and `npm run format:check` fails on ~685 files, ALL in unmodified external-model-built code from earlier features (never linted/formatted). Each shipped feature's OWN files are clean (scoped `eslint` on the diff passes). A dedicated `npm run format` + `eslint --fix` + commit pass is the recommended cleanup — do it as its own scoped change, not inside a feature phase.
3. **Deferred screenshots** — features 003+004 autocomplete/plan screenshots await a one-time `demo.ts` fixture sync (functional rendering proven by DOM tests); 001/002/005/006 screenshots delivered.
4. **Physical-device passes** — 005/006 (and 007–009 when built) each have an installed-PWA / Safari / VoiceOver / oldest-iPhone checklist that **cannot run headlessly** and is operator-required. Documented as such per feature; never claimed as done.

## 7. Structure & spec-kit hygiene

```
002-pi-remote-mobile-ui-ux-features/     ← phase-parent (spec.md + description.json + graph-metadata.json
  README.md goal.md goal-prompt.md roadmap.md architecture.md build-strategy.md handover.md
  00X-<feature>/                          ← each feature = a phase-parent
    spec.md implementation-phases.md description.json graph-metadata.json
    001-research/  research/              ← research-first (research.md = the build-ready decision)
    002-…/ 003-…/ …                       ← numbered build sub-phases: spec.md plan.md tasks.md checklist.md
                                            (+ implementation-summary.md once BUILT)
```
- Metadata is **scripted**: `generate-description.js` + `backfill-graph-metadata.js` (dist under `.opencode/skills/system-spec-kit/scripts/dist/`); generate LAST after spec edits (else fingerprint drift). A BUILT phase adds `implementation-summary.md`; a Level-3 phase would also want `decision-record.md`.
- **Gate:** `validate.sh <folder> --strict` → exit 0. Inherent warnings only: `PHASE_LINKS` + (on the 003 packet) `METADATA_DISK_PATH_CONSISTENCY` from the `app-mobile-cli/` monorepo-relative identity — both carried by the reference packets too; not worth chasing.
- Packet lives in `Mobile CLI/specs`, symlinked into the Public monorepo as `app-mobile-cli` — **edit here**, not the Public copy. Commits land on `main` in the `Mobile CLI` repo; per-phase scoped commits, per-feature merges.

## 8. The 003 design-system packet (separate, planning-only)

`specs/003-pi-remote-design-system/` (committed `2899db2`) — a NEW phase-parent packet scaffolding a **designer-editable** coded design system (Untitled-UI-React-grade, taken further so a low-code designer can safely adjust styling/markup/layout/per-state via a token-driven architecture + an `@ds` inline-comment grammar + guardrails). Four phases: (1) architecture + conventions + token library — **research-first with a 20-iteration deep-research scaffold, models TBD, NOT run**; (2) implement + migrate all components, **15 per-surface child phases**; (3) refine + audit designer-editability; (4) a new `sk-code` mobile-cli **surface mode** (plan only). `validate.sh --strict` clean. **Operator decisions still open:** the Phase-1 research model roster + `/deep:research`-vs-external-CLI; the final `@ds` grammar prefix + token-layer boundaries; whether Phase 3/4 stay lean-parents-with-one-leaf or become direct leaves. This packet is independent of the 002 build; do NOT block 002 on it.

## 9. Next steps (in order)

1. **Build `007-media-upload` — start at Phase 1** (protocol contracts + fail-closed capability gate; lowest risk, no decoder). Follow §4. The gate is already cleared (§3); carry the two MUST-FIX items into Phase 2.
2. Continue 007 Phases 2→3→(4 ∥)→5; run the **per-phase security review** Phase 2 and Phase 3 require; keep `PI_REMOTE_MEDIA_ENABLED` off until Phase 5 sign-off.
3. **`008-inbound-media`** — run its adversarial security review first (hard-gated), then build (reuses the 005 viewer).
4. **`009-ask-question`** — adversarial review first (new ticketed mutation), then build. NOTE: `009`/`010` research may be synthesis-partial — confirm each has a build-ready `research.md`/`implementation-phases.md` before dispatching; if not, synthesize the decision first.
5. **`010-todos`** — read-only projection; no hard gate.
6. **Cleanup passes** (own scoped commits, any time): the auth-flake fix (§6.1), the repo-wide lint/format debt (§6.2), the deferred 003/004 screenshots (§6.3).
