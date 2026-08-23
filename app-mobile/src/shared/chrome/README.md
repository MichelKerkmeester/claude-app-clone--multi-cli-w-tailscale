# Shared chrome

> Reusable Svelte controls that frame routed surfaces with navigation, theme, connection status and recovery.

---

## 1. OVERVIEW

`chrome/` contains the small controls that make a routed surface feel like the same app. The header receives navigation callbacks and theme state from its host. The status and session glyphs turn typed phases into local copy. The root boundary keeps reload and app-data reset available when rendering fails.

### Key Statistics

| Metric | Current behavior |
|---|---|
| Components | Five Svelte components |
| Story coverage | One Storybook file per component |
| Header inputs | Connection phase, theme preference, navigation callbacks and review availability |
| Recovery actions | Reload the page or clear service workers and caches before reload |

---

## 2. FEATURES

### Key Features

| Feature | What It Does |
|---|---|
| Global header | Shows the Pi Remote wordmark, home action, optional Inbox and Review actions, theme control and relay status. |
| Connection status | Maps every `ConnectionPhase` to a bounded label and status dot. |
| Theme selection | Exposes Auto, Light and Dark as a compact pressed-state control. |
| Session status | Shows idle, running, interrupted and unknown session states as a small glyph. |
| Error recovery | Renders the app-level failed state with reload and reset-app-data actions. |

The components own presentation and local event wiring. The page or shell owns navigation, persistence and the state that supplies their props.

---

## 3. REQUIREMENTS

| Requirement | Minimum | Notes |
|---|---|---|
| Svelte runtime | Svelte 5 component props and snippets | `RootErrorBoundary` renders its child snippet inside `svelte:boundary`. |
| Connection state | `ConnectionPhase` | `StatusPill` maps each phase to local copy. |
| Theme state | `ThemePreference` | `Header` and `ThemeControl` pass the value and change callback through. |
| Shared interaction | Button and accessibility helpers | Header navigation uses the shared button primitive. Theme options use the shared interaction actions. |

---

## 4. STRUCTURE

| File | Role |
|---|---|
| [`header.svelte`](./header.svelte) | Renders global navigation, theme selection and connection status. |
| [`status-pill.svelte`](./status-pill.svelte) | Announces the current connection phase with local labels. |
| [`theme-control.svelte`](./theme-control.svelte) | Renders the Auto, Light and Dark pressed-state options. |
| [`session-state-icon.svelte`](./session-state-icon.svelte) | Maps a session status to a compact glyph. |
| [`root-error-boundary.svelte`](./root-error-boundary.svelte) | Keeps render failures inside a reloadable recovery surface. |
| [`header.stories.ts`](./header.stories.ts) | Covers the header with and without Review navigation. |
| [`status-pill.stories.ts`](./status-pill.stories.ts) | Covers the connection phases. |
| [`theme-control.stories.ts`](./theme-control.stories.ts) | Covers the three theme preferences. |
| [`session-state-icon.stories.ts`](./session-state-icon.stories.ts) | Covers idle and running session states. |
| [`root-error-boundary.stories.ts`](./root-error-boundary.stories.ts) | Covers normal child pass-through. |
| [`CODE.md`](./CODE.md) | Explains component ownership and prop flow. |

---

## 5. USAGE EXAMPLES

| Situation | What the host supplies |
|---|---|
| A non-session route needs app navigation | Pass `onHome`, `onInbox`, `onReview` and `reviewAvailable` to `Header`. |
| The relay changes phase | Pass the typed phase to `StatusPill`. Its `role="status"` label updates locally. |
| A user changes the theme | Pass the current `ThemePreference` and handle `onChange` in the shell. |
| A session card shows work | Pass its `SessionCardDto['status']` to `SessionStateIcon`. |
| The app shell throws during render | Wrap the shell in `RootErrorBoundary` and let its Reload or Reset app data action recover the page. |

---

## 6. TROUBLESHOOTING

| What You See | Cause | Fix |
|---|---|---|
| Inbox and Review are missing | `reviewAvailable` is false. | Confirm the host has supplied the review capability before rendering those actions. |
| The status pill says the wrong phase | The caller passed a stale or mismatched `ConnectionPhase`. | Feed it from the connection reducer rather than from browser reachability alone. |
| Theme buttons show labels on a narrow phone | The compact media rule has not applied or the component is outside the app styles. | Keep the component inside the app stylesheet and preserve its `theme-option` classes. |
| Reset app data reloads without clearing the problem | The failure is not a stale service worker or cache. | Use Reload first, then inspect the error reported by the boundary's `onerror` handler. |

---

## 7. FAQ

**Q: Does `Header` fetch sessions or change routes?**

A: No. It invokes callbacks. The shell supplies those callbacks and owns route changes.

**Q: Why does `StatusPill` use local labels?**

A: Connection status is a user-facing vocabulary. Local labels keep relay details out of the status region.

---

## 8. RELATED RESOURCES

| Document | Purpose |
|---|---|
| [`CODE.md`](./CODE.md) | Component dependency direction and entrypoints. |
| [Button primitive](../primitives/button/README.md) | Native button behavior and shared interaction state. |
| [Accessibility helpers](../primitives/a11y/README.md) | Pointer and focus actions used by theme options. |
| [State documentation](../state/README.md) | Connection phases and app-shell state. |
| [Format documentation](../format/README.md) | Theme preference type and view helpers. |
