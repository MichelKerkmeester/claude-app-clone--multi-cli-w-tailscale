# Iteration 14: Pending echoes and session-scope reconciliation

## Focus

Examine the detailed optimistic-send accounting and mobile transcript retention logic for reliable chat UX over reconnects and ambiguous acknowledgements.

## Findings

### F-LUNA-014-A — Optimistic user bubbles need a per-send boundary and bounded queue

**Orca file/pattern:** `src/renderer/src/components/native-chat/native-chat-pending.ts:24-51,168-209,212-263` records pending text, send time, the last authoritative message boundary, matching occurrence, and a bounded eight-send queue; it prunes only when a matching transcript turn lands after that boundary.

**Copy:** Echo a submitted prompt immediately, preserve its position during the first transcript lag, and reconcile it against a matching host user turn after the send boundary. Bound pending echoes and show a distinct unconfirmed state after a deadline.

**Constraint mapping:** The optimistic bubble is never content authority and must not overwrite a host transcript. Boundary matching prevents an old identical prompt from retiring a new echo. Unknown outcomes remain “check chat” rather than definite failure or permission to resend.

**Verdict:** `drop-in view affordance` and reconciliation logic.

### F-LUNA-014-B — Retain old transcript only while the new session read is unsettled

**Orca file/pattern:** `mobile/src/session/use-mobile-native-chat-session.ts:17-33,63-89,121-209,211-295` tags reads with source/agent/session identity, clears on scope changes, fences late pages with generation/session checks, and keeps prior visible messages only while the new read is unsettled.

**Copy:** On a session switch, show a loading/stale boundary rather than a blank flash, but withhold prior content once the new identity is settled. Fence every page/stream callback by exact session identity and generation.

**Constraint mapping:** Retention is a transition affordance, not permission to act on old content. Disable send/answer until the new session is live and settled; never attach a pending echo or ask response to the retained prior session.

**Verdict:** `drop-in view affordance` and logic.

## Negative knowledge

- Matching optimistic text globally, without a send boundary, can prune a new prompt against an older identical turn.
- Keeping the old transcript indefinitely across a session switch is unsafe and not portable.

## Questions answered

- Good optimistic UX does not require a new host field, but it does require strict local scope/boundary bookkeeping.

## SCOPE VIOLATIONS

None.

[SOURCE: specs/context/orca-main/src/renderer/src/components/native-chat/native-chat-pending.ts:24-51,168-209,212-263]
[SOURCE: specs/context/orca-main/mobile/src/session/use-mobile-native-chat-session.ts:17-33,63-89,121-209,211-295]
