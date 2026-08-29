---
title: "Phase 3 implementation summary — home, switcher, navigation, and search (COMPLETE)"
description: "Client implementation of the nineteen home/switcher/navigation/search findings: the roster gained a smart sort, a shared device density preference, a tool glyph and a preview-honest fuzzy search; a recent-sessions dock ships mounted over a client-local recency stack with host reconciliation; navigation became a single-slot stack-aware coordinator with background-paused polling; and one shared attention resolver now feeds the home card, the dock chip and a PWA app badge."
trigger_phrases:
  - "home switcher nav search implementation summary"
  - "home switcher nav search phase"
  - "implementation summary"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/008-uiux-features-mining/003-home-switcher-nav-search"
    last_updated_at: "2026-08-28T13:40:00.000Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Shipped all nineteen findings; review found the dock unreachable and it now mounts."
    next_safe_action: "Operator picks phase 004; the repo:/path: search half waits on host cwd."
    blockers:
      - "The repo:/path: search operators parse but stay inert until the host exposes cwd and branch, tracked against phase 006."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: impl-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 3 implementation summary — home, switcher, navigation, and search

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|-------|-------|
| **Parent** | `008-uiux-features-mining` |
| **Level** | 2 |
| **Status** | Complete |
| **Findings** | HP-1, HP-4, HP-5, SC-2, SC-4, SD-1, SD-2, SD-3, SD-4, SD-5, SD-6, NL-1, NL-2, NL-4, NL-5, SH-2, SH-3, SH-4, SH-5 (19) |
| **Commits** | `054de60` |
| **Executors** | Four parallel file-disjoint lanes, then two closing dispatches: GPT-5.6 Luna and Grok 4.6, both at xhigh |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

- **The roster reads and searches better.** A single-comparator smart sort ranks needs-you above a freshly
  finished session, then working, then idle or stale. Search matches only the preview text the card actually
  renders, labels a preview hit honestly, and ranks fuzzily so `clde` finds `claude`. The `repo:` and `path:`
  operators parse and stay inert while their host fields are absent.
- **Card density became one device preference.** It persists beside the roster grouping and is held once in
  the home screen, so every mounted card changes together rather than each row keeping a private copy.
- **A recent-sessions dock ships mounted.** It lists visited sessions newest-first over a client-local recency
  stack, navigates through the app's own action, reconciles against the host roster before render, composites
  its status ring against the local surface in all three themes, fades only on measured overflow, and disables
  a removal that would do nothing to what the person can see.
- **Navigation is single-slot and stack-aware.** A notification tap racing a manual tap retargets or cancels
  rather than double-pushing; exit-to-home pops from a card entry and replaces from a deep link; the roster
  poll pauses while hidden and fires exactly one catch-up read on refocus.
- **One attention resolver now feeds three surfaces.** The home card, the dock chip and a new PWA app badge
  all read the same working > permission > unread > done precedence, so they cannot disagree.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Four executor lanes ran concurrently, partitioned by FILE OWNERSHIP rather than by theme — six of the tasks
wanted the same two files, so a thematic split would have put three agents in one file. Independent adversarial
review then ran on a separate account, and its report reshaped the phase: two closing dispatches were needed
before the work could be called done. Every mechanism was negative-controlled by hand — the source broken, the
owning suite watched to go red, the source restored and the suite watched to go green again.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

- **The dock's guarantee is tested, not its mechanism.** Two independent guards drop a host-dropped id, and
  the component's own lookup is the load-bearing one. Rather than pin the test to either, it enumerates the
  whole rendered strip, so a leaked chip fails under whatever label it happens to take.
- **A running session is not a needs-you signal.** The badge counts permission, unread and done, and excludes
  live work, so an agent quietly working does not read as something demanding attention.
- **The unused offline-edge helper was deleted rather than wired.** It had tests but no call site, which made
  a requirement look covered when nothing exercised it. The reconnect path genuinely runs through the
  navigator edge helper, so the honest move was removing the duplicate rather than inventing a caller.
- **Density persistence lives beside the grouping preference, but its reactive state does not.** The
  preference module stays a plain module of pure read/write helpers, matching what is already there; the one
  piece of shared reactive state sits in the home screen and is passed to all four card sites.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

- `npm run typecheck -w @pi-remote/web` — 1181 files, 0 errors (6 warnings, the standing baseline).
- `npm run test:web` — 92 files / 692 passed + 3 skipped, and 60 files / 674 passed, from the final state.
- `node scripts/token-identity.mjs verify app-mobile/src/app.css` — `PASS: all 35 tokens.md goldens matched
  across light/dark/system`. The gate must be given its input files; invoked bare it reads nothing.
- `npx eslint` — exit 0 on every changed file; the remaining `.svelte.ts` parse error is a repo-wide config
  gap, proven pre-existing by linting pristine `HEAD` content at the same path.
- Nineteen separate negative controls were run by hand across the phase's mechanisms; each broke a source
  and confirmed the owning suite went red, then confirmed it went green again on restore.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

- **The badge's two call sites are verified structurally, not behaviourally.** They live in the root layout,
  which brings up sockets, pollers and navigation and is mounted by no suite here. Deleting either call site
  fails the checks, but one left in place and made unreachable would still pass. What the wiring feeds — the
  count and the adapter — is covered behaviourally.
- **`repo:` and `path:` return nothing.** They parse and stay inert until the host exposes `cwd` and `branch`,
  tracked against phase 006. Free-term search over title, agent and model works now.
- **Four constraint tests were vacuous and were rewritten.** Two passed with the dock's fail-closed guards
  disabled and its status ring collapsed to the bare status colour — the dark-mode halo it exists to prevent.
  One compared a draft against its own initial value across a rerender that never propagated, because
  `rerender(Component, { props })` is silently ignored by this testing-library version. The badge wiring
  checks could not distinguish live wiring from dead wiring. All four now fail when their feature is removed.
- **The dock's own reconciliation call is redundant.** The component's roster lookup already drops an unknown
  id, so breaking the shared reconcile helper alone changes nothing observable. It is kept as defence in
  depth, but only the combined guarantee is under test.
<!-- /ANCHOR:limitations -->
