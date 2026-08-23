# Review

> Review is a shell-owned overlay for inspecting a redacted exact action and deciding whether the host may execute it.

---

## 1. OVERVIEW

Review shows approval cards with the tool name, relay-redacted canonical input, digest fragments,
expiry and current status. A person can deny an action, approve it once or request a short accept-edits
grant for edit and write tools. The relay and host still verify the exact action after the decision.

Review is an overlay, not a route. [routes/+layout.svelte](../../routes/+layout.svelte) renders it
above the current routed page when `reviewOpen` is true. Home and Chat own URLs. An
[attention deep-link](../../routes/attention/[lookupId]/+page.svelte) resolves a lookup id and can
open Review with a focus id, while the Chat shell can open the same overlay without changing the
underlying session route.

### Key Statistics

| Metric | Current behavior |
|---|---|
| Surface type | Shell overlay |
| Approval states | Pending, approved, denied, expired, revoked, consumed and failed |
| Refresh cadence | One second while the overlay is mounted |
| Grant scope | Three remaining edit or write actions with an expiry |

---

## 2. FEATURES

### Key Features

| Feature | What It Does |
|---|---|
| Exact-action card | Shows the canonical redacted input that the decision covers. |
| Expiry tracking | Counts down each approval lease and disables decisions after expiry. |
| Deny and approve | Sends one decision and reloads the current approval list. |
| Accept-edits grant | Offers a three-action grant only for `edit` and `write` approvals. |
| Focus handoff | Scrolls to a requested approval after an Inbox or attention deep-link resolution. |
| Fail-closed feedback | Reports relay errors and announces that the host is verifying a submitted decision. |

---

## 3. REQUIREMENTS

| Requirement | Minimum | Notes |
|---|---|---|
| Shell inputs | Session id list, `onBack` and optional `focusId` | The shell supplies session context and controls overlay visibility. |
| Approval relay | `loadApprovals`, `decideApproval` and `createAcceptEditsGrant` | The overlay reloads approvals after a decision. |
| Current time | Browser timer while mounted | Expiry and countdown labels update every second. |
| Redacted action data | Canonical arguments and digest from the relay | The UI never turns the redacted display into an unrestricted host action. |

---

## 4. STRUCTURE

| File | Role |
|---|---|
| [`screen-review.svelte`](./screen-review.svelte) | Loads approvals, renders cards and submits decisions or grants. |
| [`screen-review.stories.ts`](./screen-review.stories.ts) | Exercises default and focused review states. |
| [routes/+layout.svelte](../../routes/+layout.svelte) | Owns the overlay flag, session context and back behavior. |
| [routes/attention/[lookupId]/+page.svelte](../../routes/attention/[lookupId]/+page.svelte) | Resolves attention links that target Review. |

The component arrangement and ownership boundaries are in [`CODE.md`](./CODE.md).

---

## 5. CONFIGURATION

The folder has no local configuration file. The shell provides the review inputs.

| Input | Effect |
|---|---|
| `sessions` | Limits approval loading to the session roster known by the shell. |
| `focusId` | Identifies an approval card to scroll into view after load. |
| `onBack` | Closes Review without changing the underlying route. |

---

## 6. USAGE EXAMPLES

| Situation | What the person sees or does |
|---|---|
| No approvals exist | Review explains that protected actions appear only after a host request. |
| An approval is pending | Inspect the tool, redacted canonical input, digest and expiry before choosing Deny or Approve once. |
| An edit or write needs a short run | Select Accept next 3 edits. The banner shows remaining actions and expiry. |
| A decision is submitted | The action disables and a live announcement says the host is verifying it. |
| An approval expires | The card shows Expired and does not offer decision buttons. |
| Inbox resolves to Review | Review loads, then scrolls to the focus id when the approval is present. |

---

## 7. TROUBLESHOOTING

| What You See | Cause | Fix |
|---|---|---|
| The approval list refreshes every second | Review polls while mounted so expiry and host state stay current. | Keep the overlay mounted only while it is needed. |
| Approve is disabled | The approval expired or another decision is pending. | Wait for the current result or reload the current approval state. |
| A decision says Submitted, verifying | The relay accepted the request and the host has not settled it yet. | Wait for the next approval refresh. |
| The grant button is missing | The approval tool is not `edit` or `write`. | Use the one-action decision for the protected tool. |
| Review opens without the requested card | The focus id is not present in the current approval list. | Reconcile the attention signal and reload current approvals. |
| A relay error appears | Approval loading or decision submission failed. | Keep the overlay open, read the error and retry against current state. |

---

## 8. RELATED RESOURCES

| Document | Purpose |
|---|---|
| [`CODE.md`](./CODE.md) | Polling, approval flow, overlay ownership and grant boundaries. |
| [Inbox README](../inbox/README.md) | Explains the signal surface that can hand off into Review. |
| [Routes layout](../../routes/+layout.svelte) | Shows Review's position above routed Home and Chat pages. |
| [Attention deep-link](../../routes/attention/[lookupId]/+page.svelte) | Resolves a lookup id into Review or a session route. |
