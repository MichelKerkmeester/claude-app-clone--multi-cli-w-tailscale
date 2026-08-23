# review/: shell-owned approval overlay and exact-action flow

---

## 1. OVERVIEW

`review/` is a flat single-screen package. It renders the approval data supplied by the relay and
keeps polling while the shell-owned Review overlay is visible.

Current state:

- [`screen-review.svelte`](./screen-review.svelte) loads approvals for the shell's session list and refreshes them every second.
- Each card shows a tool, relay-redacted canonical arguments, digest fragments, expiry and result state.
- Decision buttons call the relay and reload current approvals. Edit and write tools can request a three-action accept-edits grant.
- Review owns card presentation and pending state. The shell owns overlay visibility and the route beneath it.

---

## 2. ARCHITECTURE

```text
Home or Chat action
          |
          v
routes/+layout.svelte
          |
          v
screen-review.svelte
          |
          +--> loadApprovals()
          |          |
          |          v
          |    approval cards and expiry timer
          |
          +--> decideApproval()
          |          |
          |          v
          |    reload current approvals
          |
          `--> createAcceptEditsGrant()
                     |
                     v
                grant banner
```

The attention deep-link at `routes/attention/[lookupId]/+page.svelte` can set a focus id before the
shell opens Review. The overlay then scrolls to the matching approval after its first load.

---

## 3. PACKAGE TOPOLOGY

```text
screen-review.svelte
        |
        +--> approval loading and timer
        +--> approval card presentation
        +--> decision and grant handlers
        +--> shared relay and formatting helpers
        `--> shell callbacks
```

Allowed dependency direction:

```text
shell → Review props → relay loading and mutation → local approval state → shell back action
```

The screen does not own approval policy, execute a host action or navigate to a new route. It shows
the exact redacted input supplied by the relay and passes decisions to the relay.

---

## 4. DIRECTORY TREE

The folder is flat. This inventory names every direct file other than the README.

| File | Responsibility |
|---|---|
| [`screen-review.svelte`](./screen-review.svelte) | Renders approval cards and owns polling, pending state, grants and errors. |
| [`screen-review.stories.ts`](./screen-review.stories.ts) | Exercises default and focused review inputs. |
| `CODE.md` | This code-folder map. |

---

## 5. KEY FILES

| File | Responsibility |
|---|---|
| [`screen-review.svelte`](./screen-review.svelte) | Owns the approval list, one-second refresh timer, decision handlers and focus handoff. |
| [Routes layout](../../routes/+layout.svelte) | Renders Review above the routed page and clears the overlay on Back. |
| [Attention deep-link](../../routes/attention/[lookupId]/+page.svelte) | Supplies the focus id for attention links that target Review. |

---

## 6. BOUNDARIES AND FLOW

| Boundary | Rule |
|---|---|
| Visibility | `routes/+layout.svelte` renders the screen when `reviewOpen` is true. Review does not own a URL. |
| Approval input | `loadApprovals` returns current relay approval cards for the session list. |
| Exact action | The card displays relay-redacted canonical arguments and digest fragments. It does not synthesize new arguments. |
| Decision | `decideApproval` receives the approval card and one decision, then the list reloads. |
| Grant | `createAcceptEditsGrant` is offered only for `edit` and `write` tools and returns remaining actions and expiry. |
| Expiry | A browser interval updates `now` so expired cards stop offering actions. |
| Focus | `focusId` is used only to scroll to a loaded approval card. |

Main flow:

```text
Review overlay opens
        |
        v
load approvals and start timer
        |
        v
show redacted exact-action cards
        |
   +----+----+
   |         |
   v         v
 decision  accept-edits grant
   |         |
   +----+----+
        |
        v
reload approvals and show host verification state
```

---

## 7. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|---|---|---|
| [`screen-review.svelte`](./screen-review.svelte) | Svelte component | Mounted by the shell as the Review overlay. |
| `ReviewProps` | Interface | Defines sessions, Back and focus inputs. |
| `decide` | Function | Submits approve or deny for one approval and refreshes the list. |
| `pending` | Derived list | Counts approvals still awaiting a decision. |

---

## 8. VALIDATION

Run from the repository root:

```bash
node scripts/naming/scan-folder-docs.mjs
```

The folder is healthy when the scan finds both documents and no broken-reference entry for
`pages/review`.

---

## 9. RELATED

- [`README.md`](./README.md)
- [Routes layout](../../routes/+layout.svelte)
- [Inbox CODE](../inbox/CODE.md)
- [Attention deep-link](../../routes/attention/[lookupId]/+page.svelte)
