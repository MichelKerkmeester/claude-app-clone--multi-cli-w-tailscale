# Home screen

> Home is the authenticated `/` surface for opening sessions, checking roster freshness and managing device attention hints.

---

## 1. OVERVIEW

Home presents the session roster after enrollment. A person can open a recent session, see whether
the roster is live or stale, revoke or log out the device and manage notification preferences. The
screen receives its session data and actions from the app shell through the route adapter.

Home is a routed page. The URL is owned by [routes/+page.svelte](../../routes/+page.svelte), and a
session opens at [routes/session/[id]/+page.svelte](../../routes/session/[id]/+page.svelte). Review
and Inbox are different surfaces. The shell renders them as overlays above the current route, so
this folder does not own their open state.

### Key Statistics

| Metric | Current behavior |
|---|---|
| Route | `/` |
| Main content | Recent session roster |
| Roster state | Loading, empty, error, live or stale |
| Device controls | Log out, revoke device and notification preferences |

---

## 2. FEATURES

### Key Features

| Feature | What It Does |
|---|---|
| Session roster | Shows opaque session identifiers, status, message count and relative update time. |
| Session opening | Sends the selected session id to the shell, which navigates to the session route. |
| Freshness readout | Shows the last known sync time and labels the roster as live or stale, with the matching steering or input message. |
| Empty and error states | Explains an empty catalog and reports a roster error without hiding the rest of the page. |
| Device actions | Lets the person log out or revoke the current device from the footer. |
| Attention hints | Loads content-free push preferences. Notification messages do not contain session content or actions. |

---

## 3. REQUIREMENTS

| Requirement | Minimum | Notes |
|---|---|---|
| Authenticated shell | `authReady` is true in [routes/+layout.svelte](../../routes/+layout.svelte) | The shell renders Enrollment instead when the device is not authenticated. |
| Session state | A `SessionListState` value | The route adapter passes items, phase, source, error and update time to the screen. |
| Device state | A device identity or null | The footer shows a host fingerprint when one is available. |
| Route actions | Navigate, log out and revoke callbacks | The screen does not fetch sessions or decide URL transitions. |

---

## 4. STRUCTURE

| File | Role |
|---|---|
| [`screen-home.svelte`](./screen-home.svelte) | Composes the hero, session roster, device footer and push settings. |
| [`card-session.svelte`](./card-session.svelte) | Renders one session card from a per-id selector. |
| [`empty-state.svelte`](./empty-state.svelte) | Shows loading, empty, error and host-too-old copy for the roster. |
| [`freshness.svelte`](./freshness.svelte) | Renders live or stale status and the last sync time. |
| [`push-settings.svelte`](./push-settings.svelte) | Loads push support and manages attention-class switches. |
| [routes/+page.svelte](../../routes/+page.svelte) | Supplies shell state and callbacks to the Home component. |
| [routes/+layout.svelte](../../routes/+layout.svelte) | Owns authentication, overlays and global navigation. |

The Storybook files next to each Svelte component exercise the roster, empty, freshness and push
states. The code arrangement is in [`CODE.md`](./CODE.md).

---

## 5. CONFIGURATION

The folder has no local configuration file. The route adapter provides the runtime inputs.

| Input | Effect |
|---|---|
| `sessions` | Supplies roster items, loading or error state, source and update time. |
| `connection` | Determines whether the roster is described as live or stale. |
| `cache` | Provides a last-saved time when the roster has no fresh update time. |
| `device` | Provides the host fingerprint shown in the footer. |
| `onSelect`, `onRevoke`, `onLogout` | Hand actions back to the shell. |

---

## 6. USAGE EXAMPLES

| Situation | What the person sees or does |
|---|---|
| The roster is loading | The empty-state copy says the relay is being read. |
| No sessions exist | The page explains that the catalog is empty and suggests starting a local Pi session. |
| The roster is cached or disconnected | Freshness reports stale data and displays the input-disabled message. |
| Sessions are available | Select a session card to open its routed Chat surface. |
| Push is supported but disabled | Select Enable notifications, then choose attention classes. |
| The device should stop being trusted | Select Revoke this device. The shell clears the device and returns to Enrollment. |

---

## 7. TROUBLESHOOTING

| What You See | Cause | Fix |
|---|---|---|
| The page says the roster is stale | Sessions came from cache or the connection is not live. | Restore the relay connection and wait for a fresh roster update. |
| No session card appears | The session list is empty or still loading. | Check the empty-state message and the relay session catalog. |
| Push says it is disabled at the relay | Push support or the VAPID key is unavailable. | Use the Inbox overlay. It remains available without push. |
| The footer shows a host fingerprint | The shell supplied a device identity. | Treat it as a host identifier, not session content. |
| Selecting a card does not stay on Home | The callback navigates to the session route. | Inspect the route adapter and the selected session id. |

---

## 8. RELATED RESOURCES

| Document | Purpose |
|---|---|
| [`CODE.md`](./CODE.md) | Component topology, route ownership and state flow. |
| [Routes page](../../routes/+page.svelte) | Wires shell context into Home. |
| [Routes layout](../../routes/+layout.svelte) | Renders Home, Chat, Review, Inbox and Enrollment branches. |
| [Review README](../review/README.md) | Explains the shell-owned review overlay. |
| [Inbox README](../inbox/README.md) | Explains the shell-owned attention overlay. |
