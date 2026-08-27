# 007 UI/UX Conformance Review — implementation vs orca · nodeterm · design system

**Date:** 2026-08-27
**Method:** Two independent GLM 5.3 flash reviewers (highest thinking level) dispatched read-only via
`cli-opencode` (`openrouter/z-ai/glm-5.3-flash --variant high`), each grounding every claim in a `file:line`
it read. This review extends the earlier per-surface GLM UI/UX review with a **conformance / fidelity**
dimension: does the shipped `app-mobile` (+ `app-relay`) UI faithfully realize each source's recommendations
and the design-system contract?

**Sources compared against:**
- **orca recs** — `../research/research.md` (6 angles + ranked Top-10; ✅/⚠️/❌ verdict tags).
- **nodeterm recs** — `../research-nodeterm/research.md` + `../research-nodeterm/findings/angle-{1..6}.md`
  (58 findings, deduped against orca; some *supersede* orca findings).
- **design system ("design md")** — the 3-layer token model (`token-library.md` + `component-tokens.md` in
  the `sk-code-mobile-cli` skill), the token declarations in `app-mobile/src/app.css`, the AA gate
  `app-mobile/tests/contrast.test.ts`, and the visual teardown in
  `sk-code-mobile-cli/references/design-reference/mobile-chat-apps/`.

> These are reviewer findings — a finding is a hypothesis. The two P0 AA failures were independently
> corroborated (arithmetic + code + gate coverage) before being recorded here. The remainder carry the
> reviewer's cited evidence; confirm against the real symptom before acting on any fix.

---

## Overall verdict

**High fidelity, with a concentrated design-token debt cluster.** Every orca Top-10 rec and every nodeterm
top win has identifiable, fail-closed code behind it, and all three explicit nodeterm supersessions of orca
were resolved in nodeterm's favor. Token discipline is strong: **zero `--pi-*` primitive reaches and zero
font-family violations** across all 19 audited scoped styles. The actionable debt is small and repeating —
**two P0 WCAG-AA failures** on new surfaces the AA gate does not cover, a missing `--on-accent` token
duplicated four times, and a scrim literal copy-pasted across three sheets. The main *research*-fidelity
losses are structural, not conceptual: the device-local Unread axis is gated behind a host field it was not
supposed to need, and the host accepts an `activity` field it never actually produces.

---

## 1. Research conformance (orca + nodeterm)

**Verdict:** the implementation is high-fidelity to both documents. Every ✅ ship-now rec maps to real code;
every ⚠️ host-dependent field degrades fail-closed when absent; every ❌ exclusion is correctly absent.

### 1.1 Supersession check — impl followed nodeterm over older orca (all 3)

| Conflict | Orca form | Shipped form | Proof |
|---|---|---|---|
| Stale-working decay | 30 min → dimmed **idle** (orca 1.8) | **20 min → Unknown** (`WORKING_STALE_MS`), presentation-only, never writes `status`; comment rejects the idle form | `card-projection.ts:8-44`; `card-session.svelte:70-76,409-411` |
| Peek accordion vs inline | Expand-in-place ≤5 turns (orca 2.5) | **Always-inline detail row**; no accordion on the card; tap still means Open (ND-3.8) | `card-session.svelte:163-203` |
| Uncertain reconnect | Decay toward idle/truth | **Undecided default**; only a live `running` row earns the dimmed stale look; idle never re-verified (ND-6.1) | `reconcile-seams.ts:64-82`; `card-session.svelte:67-76,413-417` |

### 1.2 Fail-closed check — host-dependent card fields

All verified degrading correctly (no empty meters, blank chips, "undefined", or fabricated values):
`contextPercent` (absent ⇒ meter omitted), `attention` (absent or `running` ⇒ badge null), `model` (rides
the meter — no meter ⇒ no chip), `activity`/`tool`/`prompt`/`preview` (any absence ⇒ detail row not
rendered), `title` (falls back to `compactId`, never client slicing). Relay omits null fields rather than
emitting empty strings/0 (`session-enrichment-service.ts:93-106`); the protocol guard treats every optional
field as additive-safe and falls back to the bare card on a malformed merge (`guards.ts:1256-1296`;
`server.ts:804`).

### 1.3 Ranked research gaps (PARTIAL / MISSING)

1. **Device-local Unread triage is hostage to the host `attention` field it wasn't supposed to need.**
   `groupingUnread` is emptied unless some card carries `attention` (`screen-home.svelte:142-146`), so the
   Unread section + unread badge are permanently dead on today's DTO — even though nodeterm positions
   device-local read-state as the *free* ✅ half (the seen-dot works; the unread lattice doesn't). The
   attention-first list loses its middle tier. **Fix:** feed `groupingUnread` from the device-local set
   unconditionally (the running-exclusion + foreground-gating already prevent every failure mode the docs warn
   about).
2. **`activity` is accepted but never produced.** The client is fully wired and fails closed
   (`card-session.svelte:92-99`) and the protocol accepts `activity`/`tool` (`types.ts:439-440`), but the
   relay's `SessionCardEnrichment` has no `activity` member (`session-enrichment-service.ts:29-36`) — so
   ND-3.2's headline "Running npm test" line degrades to a bare tool token. **Fix:** project a capped
   present-tense phrase from the latest tool block host-side.
3. **Search ignores the rich fields it now has.** `matchesClientHeldQuery` matches only ids + device-local
   labels (`session-list-seams.ts:317-328`) although `title`/`lastMessagePreview` now ship. orca 1.5's
   "useful search" caveat is unmet one packet after the unlock landed. **Fix:** match against the same
   projection the card renders.
4. **Policy-copy drift.** The home heading still asserts "Opaque identifiers only. No prompts, paths, or host
   context." (`screen-home.svelte:337`) directly above cards that now render host title, preview, prompt,
   model, and context%. Misleads users/auditors about what the surface shows. **Fix:** update the copy to
   describe the redacted-projection reality.
5. **Dead `host-too-old` branch + unbuilt ask-wizard.** The fourth list state can never fire
   (`session-list-seams.ts:210-212`); orca 5.5's stepped multi-question wizard is absent (single-step ticket,
   though it correctly uses stable option ids + out-of-tree dismissal). Lower impact; fix opportunistically.

*Minor (unranked):* prompt history records at submit rather than host-accept (a rejected send leaves an entry,
`session-composer.svelte:548-550`); the textarea disables during `awaitingSnapshot` — a slightly harder lock
than orca 4.1's letter (`session-composer.svelte:770-773`). orca 4.8's specific "no-revert-on-identical-report"
reconciliation test was UNVERIFIED at file level (the invariant is documented + structurally supported, but
the negative test was not located).

### 1.4 Correctly excluded (❌ items, confirmed absent)

Swipe-to-action / multi-select / long-press card menus; client-authored rename/pin/archive/labels/priority/
assignee; drag-kanban board; client prompt-slicing to invent a title; second `stateEnteredAt` clock (correctly
not requested — `updatedAt` stays the sole clock).

---

## 2. Design-system conformance (3-layer token model + teardown)

**Verdict:** strong. No component reaches past a semantic role to a `--pi-*` primitive; no stray font family.
`sheet-model-effort` is the exemplar — the only surface implementing the full Layer-3 component-token pattern,
including a reasoned dark-theme AA remap (`sheet-model-effort.svelte:1160-1207`). The debt is a concentrated,
repeating set of raw literals on the newest surfaces, two of which are real AA failures.

### 2.1 P0 — WCAG-AA failures (corroborated)

- **[P0] `transcript-list.svelte:784-786`** — the new-message count badge is `#fff` text (0.7rem, weight 700)
  on `background: var(--accent)`. `--accent` = `--pi-clay` = `#d97757` (theme-invariant), so the pair is
  **3.12:1** — normal-size text needs **4.5:1**. Not gated by `contrast.test.ts`. **Fix:** use a paired
  `--on-accent` foreground with AA against clay (or `color: var(--ink)`), and add the pair to the gate.
- **[P0] `composer-tools.svelte:626-628`** — the recording mic is `#fff` on `background: var(--danger)`. In
  **dark** theme `--danger` flips to the light tint `#ee9b91` (`app.css:206`) while the fg stays white →
  **≈2.2:1**, failing even the 3:1 non-text minimum. The gate covers `danger on danger-soft` but not this
  pair. **Fix:** pair `--danger` with a role-driven foreground (e.g. `color: var(--canvas)` / an
  `--action-fg`-style token) and gate it.

### 2.2 Token-bypass inventory (every non-tokenized color/font on the audited surfaces)

| file:line | literal | should be | severity |
|---|---|---|---|
| `transcript-list.svelte:785` | `color: #fff` on accent badge (text) | `--on-accent` | **P0** |
| `composer-tools.svelte:627` | `#fff` on `--danger` (recording mic) | danger-paired fg token | **P0** |
| `session-composer.svelte:1114` | `#fff` on `.composer--primary.is-send` (accent disc) | `--on-accent` | P1 |
| `dictation-overlay.svelte:671` | `#fff` on `.dictation-overlay--stop` (accent) | `--on-accent` | P1 |
| `screen-home.svelte:654` | `color: white` on `.orbit--core` (accent) | `--on-accent` | P1 |
| `sheet-dictation.svelte:291` | `color-mix(… #24221f 56% …)` scrim | `--scrim` | P1 |
| `sheet-prompt-history.svelte:226` | identical scrim literal | `--scrim` | P1 |
| `sheet-model-effort.svelte:1174` | identical scrim literal | `--scrim` | P1 |
| `sheet-dictation.svelte:453` | `background: #fff` toggle knob | `--surface`/knob token | P1 |
| `dictation-overlay.svelte:640` | `font-family: var(--font-display, monospace)` on the timer | `var(--font-mono)` | P1 |
| `composer-tools.svelte:632` | `color-mix(… var(--danger) 80%, black)` | token-based mix | P2 |
| `card-session.svelte:322` | `hsl(var(--session-hue) 62% 46%)` | n/a — dynamic id hue (legit) | P2 |

**Clean (verified, not assumed):** `screen-home` (except :654), `empty-state`, `freshness`, `screen-chat`,
`transcript-find-bar`, `tool-fold`, `collapsed-evidence`, `menu-transcript-action`, `normalized-activity-group`,
`transcript-load-panel`, `screen-enrollment` — no color literals, no primitive reaches.

### 2.3 Systemic P1 — two missing tokens

- **Missing `--on-accent` token.** White-on-accent is hardcoded 4× (screen-home:654, session-composer:1114,
  dictation-overlay:671, transcript-list:785). `app.css` pairs `--action-bg`/`--action-fg` but nothing pairs
  with `--accent`. One retint of `--pi-clay` silently breaks all four (and the P0 badge). Add `--on-accent`
  and route all four through it.
- **Missing `--scrim` token.** `color-mix(in srgb, #24221f 56%, transparent)` is byte-identical across three
  sheets, while `sheet-leave-plan.svelte:211` uses a *different* scrim (`rgb(0 0 0 / 35%)`). Two competing
  backdrops, zero tokens — overlays can't be unified or retinted. Add `--scrim`.

### 2.4 P2 — lower priority

- **No component-token layer on the new surfaces.** Only `sheet-model-effort` declares Layer-3 aliases;
  `dictation-overlay`, `transcript-find-bar`, `sheet-dictation`, `sheet-prompt-history` read semantic roles
  directly. The contract *permits* semantic-role reads, so this is not a bypass — but those surfaces cannot be
  retinted in isolation. Adopt the `sheet-model-effort` pattern if per-surface retint is wanted.
- **No `--text-*` type scale.** `app.css` tokenizes fonts/radius/ease but not sizes, so font-sizes are literals
  everywhere; the audited files alone use ~19 distinct rem values, several of which (0.73, 0.84, 0.98, 1.0625)
  read as drift rather than intent.
- **Catalog drift.** `feature-catalog/design-system/token-library.md:29,47` points at
  `apps/pi-remote-web/src/style.css`, which no longer exists — the authoritative file is `app-mobile/src/app.css`.
  `contrast.test.ts:14-17` still narrates "once style.css is retired at cutover."
- **Screenshot fixture leak.** `screenshots/Transcript/TranscriptList/Live-Edge.png` renders the literal
  comment `/* Keep this rule aligned with its surrounding surface. */` as card heading/status — mock-data
  leakage in the story fixture (not CSS). It invalidates that shot as fidelity evidence and should be fixed in
  the story's mock data during the screenshot rework.

### 2.5 Visual fidelity vs the teardown

The shipped UI tracks the Claude-style teardown closely: the composer is the rounded island with `+` left and
a circular morphing clay send disc right, plus the muted "Pi can make mistakes · actions stay read-only"
disclaimer; Home reads ink-on-parchment (warm bone canvas, clay orbit mark, accent-ink eyebrow, serif hero,
mono ids); the dictation overlay strips to a single quiet bar. Minor drift: the scroll-to-latest affordance is
an accent count-badge pill rather than the teardown's soft circular ↓ chevron — and it is the P0 AA site.

---

## 3. Consolidated action list (deduped, prioritized)

| # | Pri | Area | Item | Where | Fix |
|---|---|---|---|---|---|
| 1 | **P0** | design | Badge `#fff` on clay = 3.12:1 (text) | `transcript-list.svelte:785` | route through a new AA `--on-accent`; gate it |
| 2 | **P0** | design | Recording mic `#fff` on dark `--danger` = 2.2:1 | `composer-tools.svelte:627` | danger-paired fg token; gate it |
| 3 | P1 | design | Add `--on-accent`; retire 4 white-on-accent literals | screen-home:654, session-composer:1114, dictation-overlay:671, transcript-list:785 | one token, four call-sites |
| 4 | P1 | design | Add `--scrim`; unify the 3 (+1 competing) backdrops | sheet-dictation:291, sheet-prompt-history:226, sheet-model-effort:1174, sheet-leave-plan:211 | one token |
| 5 | P1 | design | Timer uses display face + stray `monospace` fallback | `dictation-overlay.svelte:640` | `var(--font-mono)` |
| 6 | P1 | research | Unread bucket dead — un-gate device-local unread | `screen-home.svelte:142-146` | feed `groupingUnread` unconditionally |
| 7 | P1 | research | `activity` accepted but never produced (host) | `session-enrichment-service.ts:29-36` | derive a capped present-tense phrase |
| 8 | P2 | research | Search ignores `title`/`preview` | `session-list-seams.ts:317-328` | match the rendered projection |
| 9 | P2 | research | Stale "opaque identifiers only" heading | `screen-home.svelte:337` | update copy to the redacted-projection reality |
| 10 | P2 | design | Screenshot fixture leaks a comment as card content | `transcript-list` story mock | fix mock data in the rework |
| 11 | P2 | mixed | Dead `host-too-old` branch; unbuilt ask-wizard; catalog/type-scale drift | see §1.3 / §2.4 | opportunistic |

---

## 4. What conforms well

- **Fail-closed discipline is intact end-to-end** — every host-dependent field degrades to nothing or a
  sanctioned fallback; the relay omits nulls; the protocol guard is additive-safe.
- **All three nodeterm supersessions landed correctly** (Unknown-not-idle @20 min, inline-not-accordion,
  undecided reconnect).
- **Primitive discipline is perfect** — zero `--pi-*` reaches across 19 scoped styles; layer order never skips
  inward.
- **`transcript-find-bar`** is the cleanest new surface (100% semantic roles, 44px targets, zero literals);
  **`sheet-model-effort`** is the exemplar for the full Layer-3 component-token pattern with a reasoned dark AA
  remap.
- **The AA gate exists and is arithmetic-based** (`contrast.test.ts`) — the two P0s exist precisely because
  their new pairs were never added to it, which is a gate-coverage gap, not a values-drift regression.

---

## 5. Caveats & method notes

- Reviewers ran read-only; no files were modified. Both grounded findings in `file:line`.
- The two P0 AA failures were independently corroborated (contrast arithmetic + the `--accent`/`--danger`
  token identities in `app.css` + confirmation that `contrast.test.ts` does not gate the pairs).
- No fixes were applied — this review documents findings only. App-source fixes are executor-owned per the
  standing source-fix dispatch policy; barrier/token files and the AA gate are the safe surfaces to change
  first (items 1–5 are the highest-value, lowest-blast starting set).
