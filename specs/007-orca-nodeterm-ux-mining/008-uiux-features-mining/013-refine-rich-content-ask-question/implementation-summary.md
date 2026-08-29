---
title: "Phase 13 implementation summary — refine rich content and ask question (COMPLETE)"
description: "Every rich card in the app was rendering a CSS boilerplate comment as visible body text, three times per card, because the comments had been pasted into the Svelte markup rather than a style block. No gate could see it — garbage text has perfect contrast — and it took reading the picture to notice."
contextType: "implementation"
_memory:
  continuity:
    packet_pointer: "specs/007-orca-nodeterm-ux-mining/008-uiux-features-mining/013-refine-rich-content-ask-question"
    last_updated_at: "2026-08-29T06:01:34.396Z"
    last_updated_by: "claude-opus-5"
    recent_action: "Removed comments rendering as card text and fixed the selected option row."
    next_safe_action: "Operator reviews; the archive and the audit are the evidence."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: impl-summary-core | v2.2 -->
<!-- SPECKIT_LEVEL: 2 -->

# Phase 13 implementation summary — refine rich content and ask question

<!-- ANCHOR:metadata -->
## METADATA

| Field | Value |
|-------|-------|
| **Parent** | `008-uiux-features-mining` |
| **Level** | 2 |
| **Status** | Complete |
| **Scope** | 54 rich-content and ask-question screenshots |
| **Commits** | `50198e2`, `1d8ad32` |
| **Executors** | Grok 4.6 xhigh via Cursor and GPT-5.6 Luna xhigh via Codex, on disjoint files |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:what-built -->
## WHAT WAS BUILT

- **The rich cards stopped printing a CSS comment at the reader.** Three
  `/* Keep this rule aligned with its surrounding surface. */` comments sat in the markup of the shared
  rich block frame, between elements, so Svelte rendered them as text nodes. Every card built on that
  frame — command output, code, text artifact and the transcript blocks — showed the string three
  times, once as the card's own title.
- **The shell well and the code card became readable in dark theme**, through the shared invariant-ink
  fix recorded in the artifacts phase; they had been painting their text in their own background.
- **The selected ask-question row became readable.** It uses the code surface as its selected fill and
  paired it with the flipping inverse ink, so in dark theme the chosen answer was the one row a person
  could not read.
- **`scripts/css-comment-integrity.mjs`** now fails the build on both shapes: a comment that swallowed
  a rule, and a CSS comment sitting in Svelte markup.
<!-- /ANCHOR:what-built -->

---

<!-- ANCHOR:how-delivered -->
## HOW IT WAS DELIVERED

The leak was found by reading a screenshot, not by a tool — and the first tool written to find its
siblings reported the tree clean over all three live instances. It blanked `<style>` blocks before
HTML comments, and a comment that merely mentioned the text "<style>" opened a false blank region that
ran to the real closing tag, hiding exactly the lines being looked for. Ordering the blanking the
other way found them. The gate now carries that reasoning in a comment so the next reader does not
reintroduce it.
<!-- /ANCHOR:how-delivered -->

---

<!-- ANCHOR:decisions -->
## KEY DECISIONS

- **The frame's frozen comment was respected.** An earlier attempt at a neighbouring story opened a
  `children` hole in the model-effort sheet directly beneath a comment marking its modal wiring
  frozen. It was reverted; scaffolding belongs in a story host, not in the component.
- **Find highlighting in the safe-Markdown renderer marks only parsed text nodes.** The renderer is a
  sanitization boundary; the highlight reuses the existing shared helper and adds no raw-HTML path.
- **A transparent control over text is not occlusion.** A wrapper that makes a whole row tappable sits
  in front of the words while every one of them still shows through, so the audit requires a blocker
  to actually paint before it reports one.
<!-- /ANCHOR:decisions -->

---

<!-- ANCHOR:verification -->
## VERIFICATION

- `node scripts/css-comment-integrity.mjs` — `PASS: 1 css + 128 svelte files clean`; before the fix it
  reported 7 swallowed rules and 3 leaked comments and exited 1.
- The rendered DOM was read directly to confirm the three leaks were text nodes rather than markup
  that merely looked wrong in source, and read again afterwards to confirm they are gone.
- `node scripts/ui-audit.mjs` — no high or medium finding on any `rich-content-*` or `ask-question-*`
  story in either theme.
- `npm run typecheck -w @pi-remote/web` — 1250 files, 0 errors (6 warnings, the standing baseline).
- `npm run test:web` — exit 0; 114 files / 782 passed + 3 skipped, and 83 files / 772 passed.
<!-- /ANCHOR:verification -->

---

<!-- ANCHOR:limitations -->
## KNOWN LIMITATIONS

- **The audit is structurally blind to this defect class.** Text rendered from a stray comment has
  perfect contrast, sits inside its container and collides with nothing, so every geometric and
  colour check passes over it. The dedicated gate closes this instance; the general lesson is that
  semantic defects still need a person to look at the picture.
- **The comment damage was not audited for a cause.** Seven swallowed rules and three leaks came from
  an earlier automated comment pass. Whatever produced them has not been identified, so nothing
  prevents a future pass from doing it again beyond the gate now failing the build.
- **Code spans do not receive find highlighting** in the Markdown preview, only prose text; the
  behaviour is consistent but not complete.
<!-- /ANCHOR:limitations -->
