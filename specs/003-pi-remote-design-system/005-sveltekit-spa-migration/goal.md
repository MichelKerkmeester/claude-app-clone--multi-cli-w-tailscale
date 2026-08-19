# SvelteKit SPA Migration — Program Goal

> The north-star that spans all eight children of this phase. When a child's local plan disagrees
> with this file, this file wins. It is scoped to the migration; the product goal remains the root
> [`goal.md`](../../../goal.md).

---

## 1. The goal

Re-home the Pi Remote phone UI onto **Svelte 5 / SvelteKit** so every screen and component is
authored as **one `.svelte` file** — HTML markup, its own scoped CSS, and typed logic together —
making the app genuinely designer-editable, while **preserving byte-for-byte** the shipped look, the
accessibility guarantees, the security posture, and the PWA behavior.

A designer opens one file and sees the whole component. Cross-component style leaks become
structurally impossible (Svelte scopes every `<style>`). Nothing about what the app *does* or how it
*looks* changes.

## 2. Why this is safe to do

The migration is a **re-hosting, not a redesign**. Three properties make "nothing changed"
verifiable rather than hoped-for:

- **The design system is already token-first.** Every rendered value resolves through `--pi-*`
  primitives → semantic roles → component aliases. Moving a rule from one stylesheet into a scoped
  `<style>` does not change what a token resolves to — CSS custom properties inherit into scoped
  blocks unchanged.
- **The behavior lives in framework-agnostic TypeScript.** `relay.ts` (the WebSocket client),
  `state.ts` (pure reducers), `cache.ts`, `auth.ts`, `effort.ts`, and the pure halves of
  `runtime.ts`/`commands.ts` have **zero React imports** and port verbatim.
- **The backend is untouched.** The relay, protocol, and extensions stay plain TypeScript. Tailscale
  Serve — not the relay — serves the web build, so `adapter-static` keeping `dist/` output means the
  relay needs zero serving changes. The backend suite is a leak-detector: it must stay green
  throughout, proving the rewrite never reached across the boundary.

## 3. Invariants held across every child

These do not move. Any child that would change one is out of scope → stop and escalate.

- **Every rendered token value is identical** in all three theme states (light, dark, system).
- **Every security invariant** in the root `goal.md` §3 still holds — loopback relay, tailnet-only
  ingress (Funnel off), foreground authority for mutations, redaction everywhere, mutation
  approval-gated and default-off, ticketed revision-checked control, host-enforced plan mode,
  content-free push. The phone still cannot enable full-access mode.
- **Every a11y contract** survives the react-aria → Bits UI / Melt UI swap — roles, focus order,
  focus trapping, `aria-*` wiring, `≥44px` targets, reduced-motion and forced-colors guardrails.
- **The routing behavior is identical** — the same three URLs (`/`, `/session/[id]`,
  `/attention/[lookupId]`), Review/Inbox as overlay state, Enrollment as an auth branch.
- **The PWA behaves identically** — installable, offline shell, the `/attention/:lookupId` deep
  link. The one deliberate change is the service-worker shell path (`/assets/` → `/_app/immutable/`)
  with a bumped cache name.

## 4. The acceptance authority for "nothing changed"

The claim "the migration preserved everything" is proven by machine checks, not by inspection:

- **Token-identity resolver** — resolve every `--pi-*` / semantic / component token to its final
  value in all three theme states, from a corpus concatenating every scoped `<style>` plus
  `app.css`, and diff against the pre-migration snapshot. **PASS = CHANGED 0 / VANISHED 0 / ADDED 0.**
- **CDP 390 px structural gate** — zero horizontal overflow, both themes, against the built preview.
- **The backend suite stays green** the entire time.
- **Contrast** — every WCAG pair ≥ threshold (arithmetic unchanged) and every guardrail regex
  matches; **≥76 `@ds guardrail:` fences** preserved.

The full nine-gate list is in [`implementation-phases.md`](implementation-phases.md) §Verification.

## 5. Done looks like

- The app runs as a SvelteKit 5 SPA from `src/mobile-app`; `apps/*` is gone, `src/*` is the tree.
- A designer edits any screen or component in one `.svelte` file and sees markup + CSS + logic
  together; a leaked style is structurally impossible.
- All nine objective gates are green; the token-identity resolver reports zero diffs.
- The `sk-code-mobile-cli` skill teaches the Svelte stack, so future code work auto-loads the
  correct conventions (child 008).
- The design-system spec records the React→SvelteKit reversal as a formal amendment
  ([`amendment.md`](amendment.md)) — never a silent contradiction of the frozen decision.
