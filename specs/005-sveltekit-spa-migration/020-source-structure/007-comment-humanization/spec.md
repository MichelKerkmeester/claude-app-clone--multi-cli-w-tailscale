---
title: "Comment humanization — retire @ds, human-voice comments across the client, taught in the skill"
description: "Phase parent for replacing the @ds inline-comment grammar with natural, concise, human-voice comments across every .svelte file: keep the numbered section banners, add a module-script header and in-markup section labels, and give each function and effect a plain purpose line. Teach the convention in the surface skill first, refactor the whole client second, then re-verify the skill against the shipped reality. Comment-only: proven by a per-file non-comment-identical check, token identity at 0 diffs, and test:web."
contextType: "planning"
_memory:
  continuity:
    packet_pointer: "specs/005-sveltekit-spa-migration/020-source-structure/007-comment-humanization"
    last_updated_at: "2026-08-25T21:00:00.000Z"
    last_updated_by: "claude-opus-4-8"
    recent_action: "All three phases shipped; @ds retired across skill and source."
    next_safe_action: "None — comment-humanization is complete."
    blockers: []
    completion_pct: 100
---

<!-- SPECKIT_TEMPLATE_SOURCE: spec-core | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Comment humanization — phase parent

> **Phase links** — Parent: [`../spec.md`](../spec.md) · Predecessor: `006-bem-css`

---

<!-- ANCHOR:metadata -->
## 1. METADATA

| Field | Value |
|---|---|
| Parent | `020-source-structure` |
| Mode | Phase parent |
| Children | `001-skill-convention`, `002-svelte-refactor`, `003-skill-reverify` |
| Status | Complete |
| Reference example | `app-mobile/src/pages/chat/screen-chat.svelte` (piloted, approved) |
<!-- /ANCHOR:metadata -->

---

<!-- ANCHOR:problem -->
## 2. PROBLEM & PURPOSE

The client's inline comments are written in an `@ds` marker grammar — `@ds surface`, `@ds slot`,
`@ds edit`, `@ds guardrail` — that reads like machine metadata, not prose. The operator finds the
`.svelte` files hard to read and edit: the markers are jargon, the `<script module>` island has no
header explaining what it holds, the markup carries no section labels, and a long banner is often
followed by a wall of functions with nothing telling the reader which part is which.

This packet retires `@ds` in favour of natural, concise, human-voice comments, and adds the navigation
the files are missing — a module-script header, in-markup section labels, and a one-line purpose
comment on each function, effect and rule. The numbered ALL-CAPS section banners are **kept**; they are
the file's table of contents and are not `@ds`. The `@ds guardrail: do-not-edit` intent survives as a
plain-English "do not edit this wiring" note, so nothing about editability is lost.

The order is deliberate: teach the convention in the surface skill first so the refactor has a written
authority to follow, apply it across every `.svelte` file second, then re-verify the skill against what
actually shipped — because the refactor is where the edge cases surface.

Each concern is a phase because each has a different verification: a skill change is proven by a
reference scan and a loading dispatch, a source refactor by a per-file comment-only diff and token
identity, a re-verification by re-reading the skill against the shipped files.
<!-- /ANCHOR:problem -->

---

<!-- ANCHOR:phases -->
## 3. PHASE DOCUMENTATION MAP

| Phase | Child | Scope |
|---|---|---|
| 1 | `001-skill-convention` | Update the `sk-code-mobile-cli` surface skill: retire the `@ds` grammar and document the natural human-voice convention — module header, kept numbered banners, per-function purpose lines, in-markup section labels, plain-English do-not-edit note. Land via the Public worktree flow. Skill docs only. |
| 2 | `002-svelte-refactor` | Apply the convention to every `.svelte` file in the repo, comment-only: retire `@ds`, add module headers and in-markup labels and per-part comments, keep banners. Update the `scan-comments` gate to enforce the new convention instead of the `@ds` fence count. Proven per file (non-comment content byte-identical), plus token identity 0-diff and `test:web`. |
| 3 | `003-skill-reverify` | After the refactor, re-read the skill against the shipped `.svelte` reality and the edge cases 002 surfaced; update the skill if it drifted. Skill docs only. |
<!-- /ANCHOR:phases -->

---

<!-- ANCHOR:invariants -->
## 4. INVARIANTS

Non-negotiable across every phase:

- Every source change is comment-only: the non-comment content of each `.svelte` file is byte-identical
  before and after (proven by a comment-span strip + hash), token identity resolves to 0 diffs across
  light/dark/system, and `test:web` stays green.
- The numbered ALL-CAPS section banners are preserved — retiring `@ds` never removes a banner.
- No `@ds` marker remains in any `.svelte` source after phase 2.
- The `do-not-edit` intent is preserved as a plain-English note wherever an `@ds guardrail: do-not-edit`
  fence stood; no frozen seam becomes editable.
- Comment hygiene: no spec path or artifact id in any code comment.
- `screen-chat.svelte` is the approved reference for the voice; every other file matches its register.
<!-- /ANCHOR:invariants -->

---

<!-- ANCHOR:cross-refs -->
## 5. CROSS-REFERENCES

- `../spec.md` — the `020-source-structure` phase parent.
- `../002-comment-structure/` — established the numbered section-banner vocabulary this packet keeps.
- `../005-comment-brevity/` — the earlier concise-durable-WHY pass this continues.
- `../../019-surface-skill-refresh/` — the surface-skill phase this packet's 001 and 003 extend.
<!-- /ANCHOR:cross-refs -->
