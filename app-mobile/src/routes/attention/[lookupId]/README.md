# Attention deep link

> Resolve one attention lookup into the review surface or a live session.

---

## 1. OVERVIEW

`/attention/[lookupId]` is a deep-link resolver, not a screen. The `lookupId` parameter identifies a
content-free attention hint from the relay. After the shell establishes authentication,
`+page.svelte` asks `shared/format/attention.ts` for the target and replaces the URL with `/` for a
review item or `/session/[id]` for a session.

The route opens the Inbox while the lookup is pending. A failed lookup leaves the Inbox open so the
person can see the available attention state instead of landing on a blank page.

---

## 2. FEATURES

| Feature | What it does |
|---|---|
| Auth wait | Delays lookup work until the app shell has an authenticated device session. |
| Review resolution | Stores the returned focus id, opens Review and replaces the resolver URL with `/`. |
| Session resolution | Encodes the returned session id and replaces the resolver URL with `/session/[id]`. |

---

## 3. REQUIREMENTS

| Requirement | Minimum | Notes |
|---|---|---|
| Parameter | A non-empty `lookupId` | SvelteKit matches this folder only when the parameter exists. |
| App shell | `authReady`, `inboxOpen` and `reviewOpen` state | The route reads and updates these values through app context. |
| Relay access | `openAttentionHint` | The lookup can fail or be aborted while the route changes. |

---

## 4. STRUCTURE

This folder has one source file:

| File | Role |
|---|---|
| [`+page.svelte`](./+page.svelte) | Reads `lookupId`, resolves the attention hint and redirects. |

---

## 5. USAGE EXAMPLES

| Situation | Result |
|---|---|
| A push hint opens this URL | The Inbox appears while the relay resolves the lookup. |
| The lookup targets a review item | Review opens with the returned focus id and the URL becomes `/`. |
| The lookup targets a session | The URL becomes `/session/[id]` and the session route renders the chat screen. |
| The lookup cannot be read | The Inbox stays open and the resolver aborts when the route unmounts. |

---

## 6. TROUBLESHOOTING

| What you see | Cause | Fix |
|---|---|---|
| The Inbox remains open | The lookup failed or returned no usable target. | Check the attention transport response and retry from a fresh hint. |
| The route waits before doing anything | Authentication has not completed. | Finish enrollment and let the layout retry the route effect. |
| A session opens with an unexpected id | The relay returned a different target session. | Treat the resolved session id as authoritative and inspect the relay hint. |

---

## 7. RELATED RESOURCES

| Document | Purpose |
|---|---|
| [`CODE.md`](./CODE.md) | Parameter flow, boundaries and redirect behavior. |
| [`Routes README`](../../README.md) | All URL adapters and the app shell. |
| [`shared/format/attention.ts`](../../../shared/format/attention.ts) | Attention lookup and push helpers. |
| [`session/[id]/README.md`](../../session/[id]/README.md) | The target session route. |
