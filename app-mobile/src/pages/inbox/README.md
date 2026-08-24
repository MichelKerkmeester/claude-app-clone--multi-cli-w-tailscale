# Attention inbox

> The Attention Inbox is a shell-owned overlay for opening current relay state from content-free attention signals.

---

## 1. OVERVIEW

The Inbox lists attention classes and occurrence times without showing session content. Selecting a
signal calls the relay to reauthenticate and resolve its current target. The result either opens the
Review overlay or navigates to the target session.

Inbox is an overlay, not a routed page. [routes/+layout.svelte](../../routes/+layout.svelte) renders
it above the current route while `inboxOpen` is true. The
[attention deep-link](../../routes/attention/[lookupId]/+page.svelte) is a resolver with no view of
its own. It briefly opens Inbox while resolving a lookup id, then replaces the URL with the Review
overlay or a session route.

### Key Statistics

| Metric | Current behavior |
|---|---|
| Surface type | Shell overlay |
| Signal content | Attention class, occurrence time and lookup id |
| Detail loading | Reauthentication and current-state resolution on open |
| Empty behavior | Inbox remains available when notifications are denied |

---

## 2. FEATURES

### Key Features

| Feature | What It Does |
|---|---|
| Attention list | Shows `needs_input`, `finished` and `error` signals with labels and relative times. |
| Content-free notifications | Keeps session prompts, paths and host context out of the signal list. |
| Current-state handoff | Resolves a lookup id at the moment it is opened instead of trusting a stale notification. |
| Overlay back action | Returns to the route that was underneath the overlay. |
| Empty fallback | Explains that the Inbox remains available without push notifications. |

---

## 3. REQUIREMENTS

| Requirement | Minimum | Notes |
|---|---|---|
| Shell callbacks | `onBack` and `onOpen` from [routes/+layout.svelte](../../routes/+layout.svelte) | The screen does not decide whether the resolution becomes Review or Chat. |
| Attention relay | `fetchAttention` and `openAttentionHint` | The list fetch is abortable. Opening a signal reports relay errors in the overlay. |
| Authenticated device | An established device session | The relay reauthenticates before returning current state. |

---

## 4. STRUCTURE

| File | Role |
|---|---|
| [`screen-attention-inbox.svelte`](./screen-attention-inbox.svelte) | Fetches signals, renders the overlay and resolves an opened item. |
| [`screen-attention-inbox.stories.ts`](./screen-attention-inbox.stories.ts) | Exercises the empty fallback with real component wiring. |
| [routes/+layout.svelte](../../routes/+layout.svelte) | Owns the overlay flag and resolution destination. |
| [routes/attention/[lookupId]/+page.svelte](../../routes/attention/[lookupId]/+page.svelte) | Resolves an attention deep-link and replaces it with the final destination. |

---

## 5. IMPLEMENTATION BOUNDARIES

The shell owns overlay visibility and the destination. The screen owns the signal list and the resolver handoff.

| Boundary | Rule |
|---|---|
| Shell | [`routes/+layout.svelte`](../../routes/+layout.svelte) renders Inbox when `inboxOpen` is true, supplies `onBack` and `onOpen` and chooses Review or session navigation. |
| Screen | `screen-attention-inbox.svelte` owns the fetch, AbortController cleanup, selected-row state and visible errors. It does not render session content or build a URL. |
| Resolver | [`routes/attention/[lookupId]/+page.svelte`](../../routes/attention/[lookupId]/+page.svelte) opens Inbox while a deep-link is pending and replaces the temporary URL after `openAttentionHint` returns a target. |
| Callback | `onOpen` receives the current resolver result. The shell decides how that result becomes an overlay or route. |

Put list, row and fetch-state changes in `screen-attention-inbox.svelte`. Put destination and overlay changes in `routes/+layout.svelte`. Put deep-link waiting and URL replacement in the attention route adapter.

Run `node scripts/naming/scan-folder-docs.mjs` from the repository root to verify folder coverage and local references.

---

## 6. CONFIGURATION

The screen has no local configuration file. Its behavior is defined by two callbacks.

| Input | Effect |
|---|---|
| `onBack` | Closes the overlay and reveals the route underneath. |
| `onOpen` | Receives the resolved target so the shell can open Review or navigate to Chat. |

---

## 7. USAGE EXAMPLES

| Situation | What the person sees or does |
|---|---|
| The header opens Inbox | The current routed surface stays underneath the signal list. |
| No signals exist | The overlay shows No attention needed and explains the push-independent fallback. |
| A signal is selected | The row disables while the relay reauthenticates and resolves current state. |
| The signal targets Review | The shell closes Inbox and opens Review with a focus id. |
| The signal targets a session | The shell closes Inbox and navigates to `/session/[id]`. |
| The fetch fails | The overlay shows the relay error and keeps its Back action. |

---

## 8. TROUBLESHOOTING

| What You See | Cause | Fix |
|---|---|---|
| Inbox has no session details | Signals are intentionally content-free. | Open a signal to fetch current relay state. |
| A row says Reauthenticating | The lookup is being resolved. | Wait for the shell handoff to complete. |
| The overlay stays open after a deep-link | Lookup resolution failed or auth is not ready. | Restore authentication or retry the lookup. |
| Push is disabled but Inbox works | Inbox is the fallback channel by design. | Use the overlay from the authenticated shell. |
| Back returns to the previous surface | Inbox does not own a route. | Keep the underlying route and use the overlay action again when needed. |

---

## 9. RELATED RESOURCES

| Document | Purpose |
|---|---|
| [Review README](../review/README.md) | Describes the overlay that receives review-targeting signals. |
| [Routes layout](../../routes/+layout.svelte) | Shows the shell branch order for Enrollment, Review, Inbox and routed pages. |
| [Attention deep-link](../../routes/attention/[lookupId]/+page.svelte) | Documents the URL resolver with no view of its own. |
