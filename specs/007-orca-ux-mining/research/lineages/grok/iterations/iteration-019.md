# Iteration 19: Electron unread/attention join vs Inbox; home "needs you" without a new field?

## Focus
Can we surface orca-style needs-you on home **without** `attention` by joining Inbox, and what must stay host-authored? Broaden after the field-bundle freeze.

## Actions Taken
- Re-read iter 2–3 unread definition (`done|blocked|waiting`, ack vs `stateStartedAt`).
- Compare our Inbox/Review split (research-angles current state).
- Check whether history cards show unread (they omit resting done dots).

## Findings

### F-ITER019-JOIN Home unread can be a **view join** of host Inbox tickets onto session ids
[SOURCE: specs/007-orca-ux-mining/research-angles.md:11:13]
[SOURCE: specs/context/orca-main/src/renderer/src/hooks/useActivityUnreadCount.ts — iter 3]

Orca home worktree rows carry `unread` from agent activity; History cards **do not** show a needs-you bell (iter 3: resting done dots omitted on history). We already have Inbox (attention) and Review (approvals) as separate surfaces.

**UX to copy:** a small badge on the session card when Inbox has an open ticket for that `id`. No new field if Inbox payloads already include `sessionId`.
**Constraint map:** badge must disappear when the host ticket is gone (fail-closed). Do not keep a local "I saw it" that hides a still-open host ticket unless the host defines ack (orca `ackAt < stateStartedAt` is host-relative).
**Verdict:** join-on-`sessionId` → **drop-in** **if** Inbox items carry session id. Client-only ack clock → **not portable**. Dedicated `attention` on the card DTO → still useful when Inbox is a different query (**needs host field** as fast-path).

### F-ITER019-UNREAD-DEF Unread ≠ working
[SOURCE: iter 3 / Electron `useActivityUnreadCount`]

Orca unread is **done | blocked | waiting**, not `working`. Badging a running session as unread would be a mistranslation.

**UX to copy:** running = progress chrome (dots/Working); needs-you = blocked/waiting/completed-unacked.
**Verdict:** mapping `status===running` → unread badge → **not portable**. Mapping Inbox kinds → **drop-in**.

### F-ITER019-HISTORY History is the better analog for our home than Orca Home
[SOURCE: iter 1–2]

Orca Home lists **worktrees**. Our home lists **Pi sessions**. Agent History is the analog. Therefore: copy History card + panel chrome, **not** New Workspace / pin-worktree / PR badges.

**Verdict:** restated for synthesis; prevents a late wrong-object port.

## Questions Answered
q-home-parallel-sessions: attention-on-card via Inbox join vs new field.

## Ruled Out
- Treating `status=running` as unread.
- Copying Orca Home worktree chrome onto Pi session cards.

## Dead Ends
- Using History dots as unread (they hide resting done).

## Sources Consulted
- specs/007-orca-ux-mining/research-angles.md:11
- Prior iterations 1–3 (Electron unread, History vs Home)

## Assessment
- newInfoRatio: 0.42
- noveltyJustification: Inbox-join path may avoid an attention field; unread≠working restated as a hard rule.
- confidence: high.

## Reflection
- What worked and why: Checking whether Inbox already has sessionId is the cheap alternative to a DTO change (operator must confirm payload).
- What did not work and why: Did not re-open Inbox DTO in this pass — inferred from research-angles "attention lives only in Inbox".
- What I would do differently: Confirm Inbox item shape in our protocol (read-only) during synthesis.

## Recommended Next Focus
Final gap audit vs research-angles.md checklist (iteration 20).
