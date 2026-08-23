# inbox/: shell-owned attention overlay and reauthentication handoff

---

## 1. OVERVIEW

`inbox/` is a flat screen package for the attention overlay. It owns the signal fetch, row state,
abort cleanup and open-in-progress label. The shell owns when the overlay appears and where a resolved
signal goes.

Current state:

- [`screen-attention-inbox.svelte`](./screen-attention-inbox.svelte) fetches attention items on mount and aborts that request on teardown.
- An item contains a lookup id, attention class and timestamp. The component does not render session content.
- Opening an item calls the relay resolver and passes its result to the shell through `onOpen`.
- The overlay can sit above Home or Chat. It does not own a URL.

---

## 2. ARCHITECTURE

```text
Header or session action
          |
          v
routes/+layout.svelte
          |
          v
screen-attention-inbox.svelte
          |
          +--> fetchAttention()
          |          |
          |          v
          |    attention signal list
          |
          `--> openAttentionHint()
                     |
                     v
                  onOpen()
             /                 \
            v                   v
      Review overlay       session route
```

The deep-link resolver at `routes/attention/[lookupId]/+page.svelte` uses the same open resolver,
shows Inbox while auth is settling and replaces the temporary URL after it receives a target.

---

## 3. PACKAGE TOPOLOGY

```text
screen-attention-inbox.svelte
        |
        +--> shared attention fetch and resolver
        +--> shared view formatting
        +--> shared Button primitive
        `--> shell callbacks
```

Allowed dependency direction:

```text
shell → screen props → attention transport and local view state → shell resolution callback
```

The screen does not mutate app overlay flags, build a session URL or open Review directly. Those
decisions stay in `routes/+layout.svelte`.

---

## 4. DIRECTORY TREE

The folder is flat. This inventory names every direct file other than the README.

| File | Responsibility |
|---|---|
| [`screen-attention-inbox.svelte`](./screen-attention-inbox.svelte) | Renders the attention overlay and owns fetch and open state. |
| [`screen-attention-inbox.stories.ts`](./screen-attention-inbox.stories.ts) | Exercises the default empty-state wiring. |
| `CODE.md` | This code-folder map. |

---

## 5. KEY FILES

| File | Responsibility |
|---|---|
| [`screen-attention-inbox.svelte`](./screen-attention-inbox.svelte) | Owns the AbortController, item list, error state, opening id and signal rows. |
| [Routes layout](../../routes/+layout.svelte) | Sets `inboxOpen`, supplies callbacks and handles the resolved target. |
| [Attention deep-link](../../routes/attention/[lookupId]/+page.svelte) | Resolves a cold attention URL without rendering a second Inbox implementation. |

---

## 6. BOUNDARIES AND FLOW

| Boundary | Rule |
|---|---|
| Visibility | The shell renders Inbox when its overlay flag is true. The route beneath remains the navigation context. |
| Signal data | The list displays attention class and time only. It does not display prompts, paths or host context. |
| Fetch lifecycle | `onMount` starts `fetchAttention` with an AbortController and cleanup aborts it. |
| Open lifecycle | `openItem` disables the selected row, clears the old error and calls `openAttentionHint`. |
| Destination | `onOpen` receives the resolver result. The shell chooses Review overlay or session navigation. |
| Deep-link | The attention route is a resolver. It briefly opens Inbox, then replaces the URL after resolution. |

Main flow:

```text
overlay opens
      |
      v
fetch attention signals
      |
      +--> empty state
      |
      `--> signal row
                 |
                 v
          reauthenticate and resolve
                 |
          +------+------+
          |             |
          v             v
       review        session
```

---

## 7. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|---|---|---|
| [`screen-attention-inbox.svelte`](./screen-attention-inbox.svelte) | Svelte component | Mounted by the shell above the current route. |
| `AttentionInboxProps` | Interface | Defines the Back and resolved-open callbacks. |
| `openItem` | Function | Starts one signal resolution and reports the result to the shell. |

---

## 8. VALIDATION

Run from the repository root:

```bash
node scripts/naming/scan-folder-docs.mjs
```

The folder is healthy when the scan finds both documents and no broken-reference entry for
`pages/inbox`.

---

## 9. RELATED

- [`README.md`](./README.md)
- [Routes layout](../../routes/+layout.svelte)
- [Review README](../review/README.md)
- [Attention deep-link](../../routes/attention/[lookupId]/+page.svelte)
