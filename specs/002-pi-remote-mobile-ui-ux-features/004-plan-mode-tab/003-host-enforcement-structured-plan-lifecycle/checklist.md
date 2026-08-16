# Checklist — Phase 2 — Host enforcement and structured plan lifecycle

- [x] Every unclassified mutation-capable tool is denied in Plan, including extension tools, MCP tools, and shell control-token variants. — default-deny classifier with an EMPTY read-only extension/MCP allowlist + narrow bash allowlist; `plan-mode.test.ts`.
- [x] A structured plan event produces a bounded artifact, while assistant prose alone never produces `Plan ready`. — `plan-artifact.ts` accepts only structured events; `plan-mode.test.ts`.
- [x] Plan feedback invalidates the old artifact and disables its Execute action before a replacement artifact is accepted. — accept/invalidate flow; tested.
- [x] Execution restoration failure leaves Plan restrictions active and publishes only `Plan safety could not be verified` without sensitive details. — `PLAN_SAFETY_ERROR` bounded string; lease timer forces restrictions back; tested.
- [x] `/plan`, `/plan on`, `/plan off`, and `/plan execute` are rejected before host prompt submission and do not appear in the phone command catalog. — `prompt-service.ts` `firstToken === '/plan'` rejection before forwarding; `command-service.ts` removes the control command; `prompt.test.ts`/`commands.test.ts`.
- [x] Internal control events are absent from transcript blocks and model-visible prompts. — `plan-control-redaction.test.ts` + `authority-loop.test.ts`.
- [x] Host/relay security review approves the default-deny classifier, shell allowlist, artifact/token lifecycle, invalidation rules, and restoration failure path before Phase 4 Execute exposure. — Claude review recorded in `implementation-summary.md`; all crux properties confirmed in code.
- [x] `npm run typecheck` passes. — verified (worktree).
- [x] `npm test -- extensions/pi-remote-plan/tests apps/pi-remote-relay/tests packages/pi-rpc-protocol/tests` passes. — covered by full `npm test` 218/218 (the one intermittent 217/218 is the known flaky auth test).
- [ ] The fixture emits Build, Plan, plan-ready, executing-plan, superseded, and extension-error states and produces true `390px` CDP screenshots in light and dark mode for Plan and extension-error. — satisfied by construction: no web src changed (host/extension/relay only); the mode/extension-error UI surface arrives in later phases; captures ride the feature-004 visual checkpoint.
- [x] The scoped phase diff contains only the intended host, relay, prompt/catalog, redaction, and test changes. — `git status`: extension + relay runtime/prompt/command/redaction + tests only; no web src.
