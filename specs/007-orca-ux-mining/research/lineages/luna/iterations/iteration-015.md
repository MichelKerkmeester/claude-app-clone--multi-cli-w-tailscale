# Iteration 15: Stop, permission, and ask-card fail-closed behavior

## Focus

Inspect how Orca distinguishes live work, approval/question prompts, interruption, cancellation, and ambiguous control delivery.

## Findings

### F-LUNA-015-A — Show ask/permission cards only from scoped blocked evidence

**Orca file/pattern:** `mobile/src/session/use-mobile-native-chat-prompts.ts:15-66` gates permission/question extraction on `waiting|blocked`, resolves transcript asks only after settled reads, and avoids resurfacing stale status envelopes; `use-mobile-native-chat-ask-dismiss.ts:7-78` keys dismissal by scope/session/ask key and retains it across view toggles.

**Copy:** Place a single ask/permission card above the composer, with explicit options and a dismiss/cancel affordance. Suppress it when the agent is merely working/done, and keep dismissal stable through chat↔terminal or route remounts. Re-enable only for a genuinely different host prompt.

**Constraint mapping:** A client-parsed text fragment is not enough to authorize an answer. Require host status or settled transcript evidence, exact session scope, and a stable ask key. If evidence is loading or mismatched, hide/disable the answer rather than sending into an unknown terminal state.

**Verdict:** `drop-in view affordance` for scoped dismissal; prompt capability/evidence `needs a new host field` if the Pi protocol lacks it.

### F-LUNA-015-B — Treat Stop as an idempotent, ambiguous control action

**Orca file/pattern:** `mobile/src/session/use-mobile-native-chat-stop.ts:43-76,78-144` sends paced Escape bytes, cancels pending work, fences by handle/stream identity, waits for both attempts, and reports unknown delivery as “check chat” rather than inviting a duplicate Stop.

**Copy:** Expose Stop only while the host says the active session is working; cancel pending sends on press. Resolve a single action as accepted, rejected, or unconfirmed after its whole sequence, with no premature error toast.

**Constraint mapping:** Stop is a host mutation and must use the existing authorized control route. Client-side “agent stopped” is not proof; unknown delivery requires a check-chat state and a fenced retry policy. Never send a stale stop to a newly selected session.

**Verdict:** `drop-in view affordance` for outcome/fencing UX; additional stop capability `needs a new host field`.

## Negative knowledge

- A working status alone must not surface an approval card; sticky status envelopes can outlive their answer.
- One failed acknowledgement is not proof that a paced Stop did not land; immediate duplicate Escape is unsafe.

## Questions answered

- The host-authoritative constraint is clearest at control boundaries: prompt cards and Stop need evidence, scope, and ambiguous-outcome handling.

## SCOPE VIOLATIONS

None.

[SOURCE: specs/context/orca-main/mobile/src/session/use-mobile-native-chat-prompts.ts:15-66]
[SOURCE: specs/context/orca-main/mobile/src/session/use-mobile-native-chat-ask-dismiss.ts:7-78]
[SOURCE: specs/context/orca-main/mobile/src/session/use-mobile-native-chat-stop.ts:43-76,78-144]
