---
title: "Phase 6 implementation summary — usage, search, and change review (COMPLETE)"
description: "Five ready-now findings shipped as tested pure logic — a boundary-aligned usage countdown, a used/remaining toggle, a usage severity colour deliberately separate from the context meter, a debounced cross-session search harness, and host-resolved prose paths — alongside sixteen host-gated findings built as capability-checked surfaces that render nothing without their relay field, including a full source-control hub, account usage windows, and a branch entry."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/006-host-usage-search-review"
    last_updated_at: "2026-08-28T18:30:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Shipped five ready-now findings; sixteen ship inert with host fields filed."
    next_safe_action: "Operator picks phase 007, the last packet in this parent."
    blockers:
      - "Sixteen findings stay dormant until the relay publishes the fields filed as REQ-014 through REQ-018."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: impl-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 6 implementation summary — usage, search, and change review

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|-------|-------|
| **Parent** | `008-uiux-features-mining` |
| **Level** | 2 |
| **Status** | Complete |
| **Findings** | UQ-1..8, SH-1, CR-1..9, TE-3, MI-1, MI-3 (21) |
| **Commits** | `f2ea254` |
| **Executors** | Six file-disjoint lanes in two waves: GPT-5.6 Luna at xhigh |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

- **Usage formatting that does not burn battery.** `shared/format/usage-format.ts` renders a reset countdown
  and schedules ONE boundary-aligned wakeup per hour rather than ticking every second for a number that
  changes hourly. A used-versus-remaining toggle changes wording only.
- **Two colour functions kept apart on purpose.** The usage severity colour lives in `usage-format.ts` and the
  context meter colour stays in `card-projection.ts`. A test asserts they cannot be unified, because merging
  them would make an account quota and a single session's window silently report each other's state.
- **A debounced cross-session search harness.** `shared/format/session-search.ts` waits 180 ms and requires
  two characters, so a single keystroke never triggers a cross-session scan.
- **An account usage surface, inert.** A card slot in `screen-home.svelte` and `usage-sheet.svelte` render the
  window the HOST flags as gating — never the fullest bar, which is frequently not the window that will stop
  the next request. A failed poll keeps the last good figure and marks it stale rather than showing a zero,
  and values decay to unknown after thirty minutes with a twenty-four hour grace after a rate-limited read.
- **A source-control hub, inert.** Ten components under `pages/chat/source-control/` cover the PR chip and
  details sheet, a provider-neutral check summary, per-check rows, changed files, commit history, upstream
  status, conflicts and reviewers, behind a three-segment hub with a deep-linkable route that safe-defaults an
  unknown segment. The changed-files diff reuses `parseUnifiedDiff` rather than adding a second parser.
- **Host-resolved prose paths.** `safe-markdown.svelte` makes a file path tappable ONLY when the host has
  resolved it to a real artifact, opening at the host's line and column; anything else stays inert.
- **Quote-into-a-fresh-chat and a branch entry.** The composer prepares a budgeted excerpt as an editable
  draft that is never auto-sent, and `shared/commands/branch-entry.ts` renders nothing until its RPC lands.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Six executor lanes in two waves, partitioned by file ownership: the source-control hub owned an entirely new
directory, the pure formatters owned single new modules, and the second wave consumed what the first built.
Ten negative controls were run by hand, plus an independent probe that rendered all seven source-control
surfaces with no host data and confirmed each produced empty output.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

- **The headline window is the host's, never the fullest bar.** Picking the maximum client-side would
  confidently show the wrong limit, because the fullest window is often not the one that gates the next call.
- **An unknown check classification renders muted-unresolved, never passing.** Treating unknown as green is
  the specific way a review surface lies about whether something is safe to merge.
- **A failed poll keeps its last good value.** Falling back to zero would read as "quota exhausted", which is
  a worse error than showing a stale number that says it is stale.
- **The two colour functions are guarded by a test that fails if they merge.** They look similar enough that a
  future refactor would reasonably combine them; the test is there to make that refactor fail loudly.
- **Web URLs are host-supplied only.** Constructing a provider URL client-side would guess at a host's
  hosting arrangement and could send someone to the wrong place.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

- `npm run typecheck -w @pi-remote/web` — 1232 files, 0 errors (6 warnings, the standing baseline).
- `npm run test:web` — 108 files / 760 passed + 3 skipped, and 77 files / 749 passed, from the final state.
- `node scripts/token-identity.mjs verify app-mobile/src/app.css` — `PASS: all 35 tokens.md goldens matched
  across light/dark/system`.
- `git status packages/` — clean; no protocol type was widened to make a fixture typecheck.
- A grep for `{@html}` across `pages/` and `shared/` returns nothing, confirming the sanitization boundary
  gained no sink while TE-3 was wired through it.
- The composer fences were checked line by line: the new quote handler sits immediately BEFORE the
  mutation-path fence, touches no send, steer, stop or snapshot path, and leaves the keyboard-anchor
  variables untouched.
- An independent probe rendered all seven source-control surfaces with no host data; every one was empty.
- Ten negative controls, each confirmed red on break and green on restore.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

- **Sixteen of the twenty-one findings are dormant.** The usage card, the whole source-control hub, live
  search, tap-to-open and the branch entry all render nothing until the relay publishes the fields filed as
  REQ-014 through REQ-018. Nothing here should be read as a working PR review surface.
- **One constraint test was vacuous and was rewritten.** The stale-decay and rate-limit-grace tests derived
  their fixtures from the very constants they were checking, so the boundary was relative and held for any
  value — a threshold raised high enough that a reading never decayed would have passed. Both constants are
  now pinned and the offsets are literals.
- **A path miss shows nothing rather than a toast.** The checklist anticipated a toast on a failed
  resolution; the client instead leaves the text inert, which is the fail-closed behaviour but gives no
  feedback that a resolution was attempted. Worth revisiting once the host capability exists.
- **Outside-root path rejection is the host's to enforce.** The client covers the decline path — a
  host-declined path stays inert — but cannot itself judge whether a path escapes a repository root.
<!-- /ANCHOR:limitations -->
