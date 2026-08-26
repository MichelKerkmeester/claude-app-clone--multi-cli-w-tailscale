# Iteration 16: Session route identity and active-tab transitions

## Focus

Inspect Orca's mobile route construction and active-session-tab precedence for a reliable home-card-to-chat transition, including transient browser or host changes.

## Findings

### F-LUNA-016-A — Keep session route identities raw until the navigator owns encoding

**Orca file/pattern:** `mobile/src/session/mobile-session-route.ts:3-19` returns a `HostStackRouteTarget` with raw `hostId` and `worktreeId`; its comment records that pre-encoding would leave the session screen with an escaped identity. `mobile/app/h/[hostId]/session/[worktreeId].tsx` is the route consumer.

**Copy:** Make a home-card press carry the canonical session id as an opaque value into the route helper. Let the SvelteKit router encode the segment exactly once, and decode/validate at the page boundary before loading the transcript. This prevents cards with spaces, slashes, or already-escaped identifiers from opening a different or unusable session.

**Constraint mapping:** The route is navigation intent, not proof that the session still exists. On entry, re-check the exact id against the current host-scoped roster or session read; if the host epoch, id, or authorization is unknown, render the stale/closed state and do not issue chat commands. Never derive a writable target from a display label.

**Verdict:** `drop-in view affordance` for raw identity propagation and guarded route loading; the current client already has the exact-session command scope needed for the second check.

### F-LUNA-016-B — Use explicit navigation intent precedence for active-session tabs

**Orca file/pattern:** `mobile/src/session/active-session-tab.ts:6-17,19-67` resolves `navigationIntent='follow'` before pending and selected local tabs, then falls back to the host snapshot. It retains a selected tab when a transient browser guest swap temporarily removes it. `mobile/src/session/mobile-session-tab-activation.ts:13-21,23-70,85-94` declares `intent`, uses caller-owned navigation, and retries only idempotent activation once after a logical client cutover.

**Copy:** On chat entry, retain the user-selected session through ordinary snapshot refreshes, but allow a host-issued follow/deep-link intent to supersede it. Represent “selected”, “host active”, and “navigation requested” as separate states. If the app exposes terminal/session tabs, show the selected tab immediately while activation is pending and reconcile to the host snapshot before enabling a tab mutation.

**Constraint mapping:** Local selection may control presentation, never session truth. A host follow event must carry an exact session/tab identity and current epoch; a missing or mismatched target disables activation and preserves the prior read-only view. A one-time retry is safe only for an idempotent host operation and must never be generalized to message send or Stop.

**Verdict:** `needs a new host field` for a true host follow/tab-activation contract; the precedence and pending-state presentation are `drop-in view affordance` for the existing single-session client.

## Negative knowledge

- A URL parameter or selected card is not evidence that the host still exposes that session.
- A browser or terminal tab swap cannot be treated as a local authority update; without an exact host event, retain read-only state.
- The activation retry pattern is not portable to non-idempotent chat sends, attachments, answers, or Stop.

## Questions answered

- Session-to-chat navigation can be copied safely as raw identity plus a second host-scope check.
- Multi-tab follow behavior requires an explicit host intent/activation field; local tab precedence alone must not invent authority.

## SCOPE VIOLATIONS

None.

## Assessment

- newInfoRatio: 0.68
- Novelty: route identity and active-tab precedence close the home-card-to-chat transition gap without transferring authority to the client.
- Status: complete

## Next Focus

Freshness, refresh, and stable home loading states.

[SOURCE: specs/context/orca-main/mobile/src/session/mobile-session-route.ts:3-19]
[SOURCE: specs/context/orca-main/mobile/src/session/active-session-tab.ts:6-17,19-67]
[SOURCE: specs/context/orca-main/mobile/src/session/mobile-session-tab-activation.ts:13-21,23-70,85-94]
[SOURCE: app-mobile/src/pages/home/screen-home.svelte:15-23,82-110]
[SOURCE: app-mobile/src/shared/commands/host-command-catalog.svelte.ts:46-70,96-151]
