# Iteration 8: History panel search, scope tabs, capability fail-closed, resume haptics

## Focus
Agent Session History **panel chrome** (not the card row): Workspace/Project/All tabs, search box with `repo:`/`path:` placeholder, skipped-transcript notice, host-too-old fail-closed, resume waiting haptic.

## Actions Taken
- Read `MobileAgentSessionHistoryPanel.tsx` (tabs, search, empty copy, resume errors).
- Cross-check resume haptics (`triggerError` / `triggerSuccess`).
- Confirm search is client-side `query` into `buildMobileAgentHistorySections`.

## Findings

### F-ITER008-TABS Scope tabs are a client view over host sessions, with empty-path fallback already documented
[SOURCE: specs/context/orca-main/mobile/src/agent-history/MobileAgentSessionHistoryPanel.tsx:46:49]
[SOURCE: specs/context/orca-main/mobile/src/agent-history/MobileAgentSessionHistoryPanel.tsx:294:308]

Workspace / Project / All. Host-too-old screen: "Update Orca on this host to browse agent session history."

**UX to copy:** segmented scope control; fail-closed capability screen instead of an empty list that looks like "you have no sessions".
**Constraint map:** our home is one Pi host. Workspace/Project tabs **need cwd/project fields**. A single-host segmented filter on `status` (Active / Idle / Interrupted) is a **drop-in** stand-in. Capability missing → error/upgrade copy, not a silent empty grid.
**Verdict:** status segmented filter + fail-closed empty → **drop-in**. Workspace/Project path tabs → **needs a new host field**.

### F-ITER008-SEARCH Search box is local filter with operator hint in the placeholder
[SOURCE: specs/context/orca-main/mobile/src/agent-history/MobileAgentSessionHistoryPanel.tsx:310:337]

Placeholder `Search sessions, repo:, path:`. Empty: "No sessions match your search." vs "No past agent sessions in this scope." Distinct copy for filter-miss vs truly empty.

**UX to copy:** search field on home; two empty strings (no matches vs no sessions). Operators stay hints until fields exist.
**Verdict:** search chrome + empty-copy split → **drop-in**. Operator matching → **needs host fields** (iter 4).

### F-ITER008-NOTICE Skipped-transcript banner is host scan honesty, not a client hide
[SOURCE: specs/context/orca-main/mobile/src/agent-history/MobileAgentSessionHistoryPanel.tsx:321:326]

`N transcripts skipped` from scan `issues`.

**UX to copy:** if the host list is partial, say so (we have a global Live/Stale banner; a count of omitted sessions would need a host `truncated`/`issues` field).
**Verdict:** **needs a new host field** for omitted-count; reusing Stale banner for "list may be incomplete" → **drop-in**.

### F-ITER008-HAPTIC Resume fail/success uses dedicated haptic helpers; disconnected resume is error haptic + "Waiting for host..."
[SOURCE: specs/context/orca-main/mobile/src/agent-history/MobileAgentSessionHistoryPanel.tsx:147:160]
[SOURCE: specs/context/orca-main/mobile/src/platform/haptics.ts:3:37]

`triggerError` when not connected or missing resume id; `triggerSuccess` on success (imported). Android uses `performAndroidHapticsAsync` (no VIBRATE permission).

**UX to copy:** haptic on failed open (fail-closed) and successful open; do not no-op silently.
**Verdict:** **drop-in view affordance**.

## Questions Answered
Partial q-home-parallel-sessions (panel chrome) and q-session-chat-nav (fail-closed capability).

## Ruled Out
- Inventing Workspace/Project tabs without cwd: would filter everything out or lie.

## Dead Ends
- Treating History search as a server round-trip — it filters the already-scanned host list.

## Sources Consulted
- specs/context/orca-main/mobile/src/agent-history/MobileAgentSessionHistoryPanel.tsx:46
- specs/context/orca-main/mobile/src/platform/haptics.ts:3

## Assessment
- newInfoRatio: 0.72
- noveltyJustification: Panel chrome (scope tabs, search placeholder, skipped banner, capability screen, resume haptics) was not covered by card-row iterations.
- confidence: high.

## Reflection
- What worked and why: Distinguishing card content from panel chrome avoided repeating iter 1.
- What did not work and why: Expected search to hit an RPC; it is in-memory over host snapshot.
- What I would do differently: Next, in-chat jump-to-latest / load-earlier / view mode.

## Recommended Next Focus
In-chat navigation: jump-to-latest FAB, load-earlier at top, chat vs terminal per-tab override, 600ms lock settle.
