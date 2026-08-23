# Iteration 005: Convergence Check

## Findings
- No new primary pattern was found after combining the four evidence passes. The recurring design is separation of concerns: replayable state machine, typed adapter seam, pure policy, and production-view harness.
- The sibling's protocol also warns that an HTTP success response does not prove a turn is healthy; asynchronous errors arrive later as events. `docs/protocol-v1.md:16-20`
- For streaming, consume deltas rather than snapshots, accumulate by part ID, throttle forwarding, and flush on idle so the last tokens are not lost. `docs/protocol-v1.md:167-193`

## PWA Adoption
Treat transport acknowledgement and turn health as different states. Reducers should accept snapshot and delta events idempotently and flush pending buffered text on terminal/idle events.

## Ruled Out
No additional native-only behavior was promoted into the PWA recommendations.
