# attention/[lookupId]/: lookup resolution and redirect flow

---

## 1. OVERVIEW

This folder contains one route adapter. `+page.svelte` reads the SvelteKit `lookupId` parameter,
waits for `authReady`, opens the attention hint and redirects to the resolved destination. It owns no
markup beyond the shell state it toggles while the lookup is pending.

---

## 2. ARCHITECTURE

```text
$page.params.lookupId
          |
          v
     +page.svelte
          |
          +--> authReady false -> wait
          |
          +--> openAttentionHint(lookupId, signal)
          |          |
          |          +--> review -> focus id, Review, goto('/')
          |          `--> session -> goto('/session/<id>')
          |
          `--> failure -> keep Inbox open
```

The effect creates an `AbortController` for the lookup. Cleanup aborts the request when navigation
unmounts the route. Successful redirects use `replaceState`, so the temporary lookup URL does not
remain in the browser history.

---

## 3. KEY FILES

| File | Responsibility |
|---|---|
| [`+page.svelte`](./+page.svelte) | Reads the parameter, toggles Inbox state and chooses the redirect target. |

---

## 4. BOUNDARIES AND FLOW

| Boundary | Rule |
|---|---|
| Parameter | `lookupId` comes from `$page.params`. The route does not reconstruct it from push data. |
| Resolution | `openAttentionHint` in `shared/format/attention.ts` owns the relay request. |
| Overlay state | The route opens Inbox while pending and sets Review focus only for a review resolution. |
| Navigation | Use `goto` with `replaceState`. Do not render a second attention view here. |

---

## 5. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|---|---|---|
| [`+page.svelte`](./+page.svelte) | Route module | Handles `/attention/[lookupId]` from cold load through redirect. |

---

## 6. VALIDATION

Run from the repository root:

```bash
node scripts/naming/scan-folder-docs.mjs
npm run typecheck -w @pi-remote/web
```

Expected result: the scan resolves this folder's references and the web package typecheck passes.

---

## 7. RELATED

- [`README.md`](./README.md)
- [`Routes CODE.md`](../../CODE.md)
- [`shared/format/attention.ts`](../../../shared/format/attention.ts)
- [`shared/state/app-state.svelte.ts`](../../../shared/state/app-state.svelte.ts)
