---
title: 'Pi Remote Plan Extension: Read-Only Plan Mode'
description: 'Pi extension that adds a plan command and enforces read-only plan mode, blocking mutation-capable tools until an execution lease is granted.'
trigger_phrases:
  - 'pi remote plan mode'
  - 'read-only plan'
  - 'plan execution lease'
---

# Pi Remote Plan Extension: Read-Only Plan Mode

---

## 1. OVERVIEW

`extensions/pi-remote-plan/` is the `@pi-remote/plan-extension` package. It registers a `plan` command
that toggles and controls a read-only plan mode. While plan mode is on, only read-only tools run;
mutation-capable tools are blocked until execution is explicitly begun under a time-bound lease. A plan
artifact — title, summary, steps and approaches — records what the plan is before any change is made.

Current state:

- The `plan` command toggles or controls read-only plan mode (`STATUS_KEY = 'pi-remote-plan-mode'`)
- Read-only tools pass: the read-only builtins `read`, `grep`, `find`, `ls`, the read-only bash tools,
  and the `artifact:read` extension tool
- Mutation-capable builtins `edit`, `write`, `fetch`, `apply_patch` are blocked in plan mode
- `artifact:publish` is host-authoritative media, not a plan mutation
- Execution runs under a lease of `EXECUTION_LEASE_MS` (one hour); a plan that cannot be verified fails
  with `PLAN_SAFETY_ERROR`

---

## 2. ARCHITECTURE

```text
pi.registerCommand('plan', …)  ← toggle / control plan mode
        │
        ▼
tool call arrives
        │
   isPlanReadOnlyTool(tool)? ──yes──▶ allow
        │no
        ▼
   plan mode on? ──yes──▶ block (mutation-capable)
        │no / execution begun under lease
        ▼
   allow the mutation
```

A plan is captured as a `PlanArtifact` (title, summary, steps, approaches) with size caps, projected
through `PlanArtifactAdapter`, so the plan a reviewer sees is bounded and stable before execution.

---

## 3. DIRECTORY TREE

```text
pi-remote-plan/
+-- src/
|   +-- index.ts          # The plan command, tool classification, and the execution lease
|   `-- plan-artifact.ts  # The plan document model: caps, validity, draft and projection
+-- tests/
|   `-- plan-mode.test.ts # Plan-mode gating and lease behaviour
`-- package.json
```

---

## 4. KEY FILES

| File | Responsibility |
|---|---|
| [`src/index.ts`](./src/index.ts) | Registers the `plan` command, classifies tools (read-only vs mutation-capable vs host-authoritative), and gates execution under a lease. Default export `piRemotePlan(pi)`. |
| [`src/plan-artifact.ts`](./src/plan-artifact.ts) | The plan artifact model — `PLAN_ARTIFACT_KEY`, the title/summary/step/approach caps, `PlanValidity`, and the draft and projection shapes. |

---

## 5. BOUNDARIES AND FLOW

| Boundary | Rule |
|---|---|
| Read-only tools | `read`, `grep`, `find`, `ls`, the read-only bash tools, and `artifact:read` always pass. |
| Mutations | `edit`, `write`, `fetch`, `apply_patch` are blocked while plan mode is on. |
| Execution | Mutations run only after execution begins under the one-hour lease. |
| Media | `artifact:publish` is host-authoritative, classified separately from plan mutations. |

---

## 6. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|---|---|---|
| `piRemotePlan(pi)` | Default export | Install the extension; registers the `plan` command and returns the `PlanHost`. |
| `isPlanReadOnlyTool(...)` | Export | Classify a tool as read-only for plan mode. |
| `isHostAuthoritativeMediaTool(name)` | Export | Distinguish host-authoritative media from a plan mutation. |

---

## 7. VALIDATION

Run from the Pi Remote root:

```bash
npm run typecheck -w @pi-remote/plan-extension
npm test -w @pi-remote/plan-extension
```

Expected result: typecheck exits 0 and the plan-mode suite passes.

---

## 8. RELATED

| Path | Purpose |
|---|---|
| [`../README.md`](../README.md) | The extensions map. |
| [`../../app-relay/src/runtime/plan-status.ts`](../../app-relay/src/runtime/plan-status.ts) | The relay's plan-status projection. |
