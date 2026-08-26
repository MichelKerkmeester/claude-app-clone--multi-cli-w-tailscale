# Presentation formatting and view helpers

> Shared conversion of protocol values into user-facing labels, timestamps, sizes, attention data and push preferences.

---

## 1. OVERVIEW

`format/` keeps display conversion in one place. Most functions are pure and turn typed values into readable time, number, cost, size, route and status text. `attention.ts` is the deliberate I/O boundary for the Attention Inbox and Web Push because those responses need protocol guards and browser permission work beside their client calls.

### Key Statistics

| Metric | Current behavior |
|---|---|
| Modules | Three flat TypeScript modules |
| Pure helpers | Time, number, cost, size, route, status, theme and copy helpers |
| Browser I/O | Attention endpoints, service-worker subscription and foreground preference calls |
| Safety boundary | Protocol response guards and opaque route id checks before values reach screens |

---

## 2. FEATURES

### Key Features

| Feature | What It Does |
|---|---|
| Value formatting | Renders local time, compact numbers, USD cost and byte sizes. |
| View copy | Maps attention classes and session statuses to labels, icons and messages. |
| Route parsing | Reads opaque session and attention ids from the current path. |
| Approval loading | Fetches approval pages for the supplied sessions and sorts them by request time. |
| Attention and push | Validates Attention Inbox data and manages Web Push configuration and subscription preferences. |

The folder keeps wording close to the conversion that needs it. Reducers retain typed state and transport owns generic wire calls.

---

## 3. REQUIREMENTS

| Requirement | Minimum | Notes |
|---|---|---|
| Intl support | `Intl.DateTimeFormat`, `Intl.NumberFormat` and `Intl.PluralRules` | Formatters use the browser locale for time, number and model-count text. |
| Protocol values | Attention, approval, session and push DTOs | `view-helpers.ts` and `attention.ts` use protocol guards and types. |
| Browser APIs | `window`, `localStorage`, `Notification`, service workers and `atob` | Only the attention and preference paths need browser I/O. |
| Relay boundary | Auth and approval transport helpers | `attention.ts` establishes a session before opening an attention hint and delegates approval reads to transport. |

---

## 4. STRUCTURE

| File | Role |
|---|---|
| [`format.ts`](./format.ts) | Pure time, number, cost and artifact-size formatters. |
| [`view-helpers.ts`](./view-helpers.ts) | Route readers, approval loading, theme preference, labels, icons, compact ids, relative time, time buckets and countdowns. |
| [`card-projection.ts`](./card-projection.ts) | Session-card view model and stale-working decay. |
| [`roster-view-preference.ts`](./roster-view-preference.ts) | Device-local recency versus status grouping preference. |
| [`attention.ts`](./attention.ts) | Attention Inbox and Web Push endpoint calls with response validation. |
| [`CODE.md`](./CODE.md) | Data flow and the pure-helper versus I/O boundary. |

---

## 5. USAGE EXAMPLES

| Situation | Read or call |
|---|---|
| A timestamp needs a local clock display | Use `formatTime` from [`format.ts`](./format.ts). |
| A session card needs a short status | Use `sessionStatusLabel` and `compactId` from [`view-helpers.ts`](./view-helpers.ts). |
| A route needs its session id | Use `readSessionIdFromLocation`, which rejects malformed or non-opaque ids. |
| The Inbox needs a class icon and label | Use `attentionIcon` and `attentionLabel`. |
| Notification settings open | Use `fetchPushConfig`, then call the subscription or preference helper that matches the user's choice. |

---

## 6. TROUBLESHOOTING

| What You See | Cause | Fix |
|---|---|---|
| A time or cost looks different on two devices | The browser locale controls `Intl` formatting. | Compare the underlying value, not the locale-specific display string. |
| A route page has no session id | The path segment failed the opaque-id guard or was not decoded. | Keep the page in its empty or invalid-route state and use the route parser again after navigation. |
| An attention hint says it is stale | The session was not established or the relay returned an invalid resolution. | Reauthenticate and refresh the Inbox item before opening it again. |
| Push settings say the browser does not support Push | `serviceWorker` or `PushManager` is absent, or permission was denied. | Keep the setting disabled and use the browser's supported notification path. |
| Approval text appears in the wrong order | The caller bypassed `loadApprovals`. | Load through the helper so pages are flattened and sorted by `requestedAt`. |

---

## 7. FAQ

**Q: Is every function in this folder pure?**

A: No. `attention.ts` calls endpoints and browser APIs. The other two modules mainly convert values and keep their side effects local to storage reads or display derivation.

**Q: Why does `formatArtifactSize` not enforce an artifact limit?**

A: It formats an accepted byte count. The 50 MB resource limit and digest checks belong to the transport artifact reader.

---

## 8. RELATED RESOURCES

| Document | Purpose |
|---|---|
| [`CODE.md`](./CODE.md) | Helper ownership and attention request flow. |
| [Transport documentation](../transport/README.md) | Authenticated relay operations and artifact validation. |
| [State documentation](../state/README.md) | Reducers that consume formatted values and typed phases. |
| [Chrome documentation](../chrome/README.md) | Shared header and status components that consume theme and phase helpers. |
