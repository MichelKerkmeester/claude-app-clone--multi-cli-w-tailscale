---
title: "Phase 2 implementation summary — streaming, reader, and media (COMPLETE)"
description: "Client implementation of the thirteen streaming/reader/media findings: a running turn reads clearly, artifacts gained dimensions and a find stepper, a patch renders by line, the transcript pinches to scale, and the markdown sanitization boundary gained a sandboxed diagram path, one fail-closed scheme gate, inert file-path classification, and an in-app link overlay."
trigger_phrases:
  - "streaming reader media implementation summary"
  - "streaming reader media phase"
  - "implementation summary"
importance_tier: "normal"
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/006-orca-nodeterm-ux-mining/008-uiux-features-mining/002-streaming-reader-media"
    last_updated_at: "2026-08-28T11:42:24.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "Shipped all thirteen findings across two commits; adversarial review fixed."
    next_safe_action: "Operator picks phase 003; the transcript re-feed guard waits on a consumer."
    blockers:
      - "The re-feed guard has no call site: no feature re-feeds transcript text into a live turn yet."
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: impl-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 2 implementation summary — streaming, reader, and media

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|-------|-------|
| **Parent** | `008-uiux-features-mining` |
| **Level** | 2 |
| **Status** | Complete |
| **Findings** | SP-1, SP-2, SP-4, TE-1, TE-2, TE-4, TE-5, MA-1, MA-2, MA-4, MA-5, MI-2, MI-4 (13) |
| **Commits** | `78beb1c`, `fd6e1d6` |
| **Executors** | Four parallel agents on file-disjoint lanes: GPT-5.6 Luna and Grok 4.6, both at xhigh |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

- **A running turn reads clearly.** Thinking renders as always-expanded muted prose ahead of the generic
  activity frame; a live "Working — m:ss" counts up from the transcript's existing one-second clock rather
  than a second timer; and Stop hides the working state at once instead of waiting on the host.
- **Artifacts gained their missing detail.** An image shows its intrinsic dimensions over a checkerboard, and
  find gained a `{i}/{count}` stepper that wraps both ways while every match stays highlighted. The code
  preview's duplicate matcher was deleted in favour of the shared one.
- **A patch reads by line.** Unified diffs render a file header, per-hunk gutter numbers and a +N/-M stat,
  with old and new numbers advancing independently and each hunk restarting from its own header. The raw
  diff branch imports the same parse rather than carrying a second copy.
- **The transcript pinches to scale** between 0.8x and 1.8x as a transient reading aid, never persisted.
- **The sanitization boundary gained four changes**, under a narrow authorisation to cross its frozen fence:
  a diagram fence compiled to SVG inside an empty sandbox, one fail-closed scheme gate replacing two
  overlapping ones, file-path classification that stays inert, and an in-app overlay for external links.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

Six executor dispatches across two commits. Four ran concurrently on lanes partitioned by FILE OWNERSHIP
rather than by theme — six of the thirteen tasks wanted the same two files, so a thematic split would have
put three agents in one file. Every lane was gated on typecheck, eslint over its own files, and both
`test:web` suites confirmed by content, then every executor-written constraint test was negative-controlled:
the source broken, the test watched to go red, the source restored.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

- **The diagram renderer is a small hand-rolled compiler, not a bundled engine.** It parses a narrow
  edge/node grammar and emits a fixed SVG template, so it is structurally incapable of emitting a script,
  `foreignObject`, or `use`. That is a smaller attack surface than embedding a third-party engine, and it
  needs no network path — at the cost of supporting only a fraction of real diagram syntax; anything else
  falls back to the code block.
- **Sending again re-arms the working indicator, not the relay epoch.** An epoch marks a relay generation,
  not a turn, so it can stay fixed for a whole session.
- **An ending watch parks rather than restores.** Text recovered from an unresolved send goes back to the
  session that owns it, never into whichever chat is on screen now.
- **Escape cannot close the overlay from inside the framed page.** A cross-origin frame never delivers its
  key events to this document; that is a browser guarantee, so the close control stays visible as the
  dependable exit rather than pretending the shortcut works everywhere.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

- `npm run typecheck -w @pi-remote/web` — 1174 files, 0 errors (6 warnings, the standing baseline).
- `npm run test:web` — 88 files / 670 passed + 3 skipped, and 52 files / 616 passed, from the final state.
- `node scripts/token-identity.mjs verify app-mobile/src/app.css` — `PASS: all 35 tokens.md goldens
  matched across light/dark/system`. The gate must be given its input files; invoked bare it reads
  nothing and reports all 35 goldens missing, which is how it was mis-recorded here originally.
- `npx eslint` — exit 0 on every changed file; the remaining `.svelte.ts` parse error is a repo-wide config
  gap, proven pre-existing by linting a pristine `HEAD` copy.
- Two independent adversarial reviews each found a different P0 in the same feature, both reproduced.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

- **The re-feed guard protects nothing yet.** The constant and its builder exist and are tested, but no
  feature in the app re-feeds transcript text into a live turn, so there is no call site. It is scaffolding
  until one lands — worth knowing so it is not mistaken for active protection.
- **Stop does not re-arm on a turn started elsewhere.** It clears on a session switch, an epoch advance, and
  a local send. If the operator sends from another device or the CLI, this client's working indicator stays
  hidden until they send here or switch chats. Not fixed here: the requirement names epoch and new-turn as
  the signals and forbids a timer, and both of this phase's P0s came from exactly this kind of speculative
  state tracking.
- **The checkerboard is unconditional.** It sits behind every image rather than only transparent ones; there
  is no alpha detection. Visible only where an image does not cover it.
- **Two security tests were vacuous and were rewritten.** One asserted a script payload was inert while its
  source was rejected before parsing, so no frame ever rendered; the other compared the frame's sandbox
  attribute to the constant it is rendered from. Both now fail when their protection is removed.
<!-- /ANCHOR:limitations -->
