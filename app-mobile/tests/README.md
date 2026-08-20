---
title: 'Web Tests: Vitest Component Suite'
description: 'jsdom component tests for the App views, run through vitest.web.config.ts.'
trigger_phrases:
  - 'pi remote web tests'
  - 'web component suite'
---

# Web Tests: Vitest Component Suite

> jsdom component tests for the exported App views, run through vitest.web.config.ts from the repository root.

---

## 1. TABLE OF CONTENTS

- [2. OVERVIEW](#2-overview)
- [3. ARCHITECTURE](#3-architecture)
- [4. KEY FILES](#4-key-files)
- [5. BOUNDARIES AND FLOW](#5-boundaries-and-flow)
- [6. ENTRYPOINTS](#6-entrypoints)
- [7. VALIDATION](#7-validation)
- [8. RELATED](#8-related)

---

## 2. OVERVIEW

`tests/` holds the jsdom component suite for `@pi-remote/web`. The suite renders the views exported from `src/App.tsx`, mocks the relay and attention modules, and verifies transcript projection, prompt submission, approval decisions and the attention inbox. It runs through `vitest.web.config.ts` at the repository root, which sets the jsdom environment, the setup file and the test file glob.

Current state:

- `setup.ts` installs jest-dom matchers, a `ResizeObserver` stub and an in-memory `localStorage`
- `App.test.tsx` mocks `../src/relay.js` and `../src/attention.js` with `vi.hoisted`
- `@tanstack/react-virtual` is replaced by a fixed-size mock
- `fetch` is stubbed only in the prompt submission test and restored by `vi.unstubAllGlobals`
- The config restricts the run to `apps/pi-remote-web/tests/**/*.test.tsx`

---

## 3. ARCHITECTURE

```text
vitest.web.config.ts (repository root)
        │ jsdom environment, react plugin
        ▼
setup.ts  jest-dom, ResizeObserver stub, localStorage stub
        │
        ▼
App.test.tsx
        │ vi.mock ../src/relay.js  ../src/attention.js
        │ vi.mock @tanstack/react-virtual
        ▼
render Home, TranscriptList, Session, Review, AttentionInbox
        │
        ▼
assert with jest-dom matchers and waitFor
```

---

## 4. KEY FILES

| File           | Responsibility                                                                       |
| -------------- | ------------------------------------------------------------------------------------ |
| `App.test.tsx` | Five fixtures against the exported App views with mocked relay and attention modules |
| `setup.ts`     | jest-dom matchers, `ResizeObserver` stub, in-memory `localStorage`                   |

The config file `vitest.web.config.ts` lives at the repository root, not in this folder.

---

## 5. BOUNDARIES AND FLOW

| Boundary     | Rule                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------- |
| Imports      | Views from `../src/App.js`, `transcriptReducer` and `EMPTY_TRANSCRIPT` from `../src/state.js` |
| Mocks        | `../src/relay.js`, `../src/attention.js` and `@tanstack/react-virtual`                        |
| Global stubs | `fetch` inside the compose test only, undone in `afterEach`                                   |
| Config       | `vitest.web.config.ts` owns the environment, this folder owns the fixtures                    |

Main flow:

```text
npm run test:web
        │
        ▼
vitest run --config vitest.web.config.ts
        │ setup.ts runs first
        ▼
App.test.tsx renders a view with mocked modules
        │
        ▼
jest-dom matchers assert headings, buttons and calls
```

---

## 6. ENTRYPOINTS

| Test                                             | View             | Covers                                                         |
| ------------------------------------------------ | ---------------- | -------------------------------------------------------------- |
| lists sessions on Home                           | `Home`           | session cards, connection state, push config fetch             |
| renders every projected transcript block kind    | `TranscriptList` | text, thinking, plan, tool call, tool result, file diff, usage |
| submits the compose box through the relay path   | `Session`        | auth ticket, prompt submit, optimistic transcript              |
| renders a pending approval and submits decisions | `Review`         | approve once, deny, `decideApproval` calls                     |
| renders the Attention Inbox                      | `AttentionInbox` | needs input item, open current state                           |

---

## 7. VALIDATION

Run from the repository root.

```bash
npm run test:web
```

Expected result: all component tests pass under the jsdom environment defined in `vitest.web.config.ts`.

---

## 8. RELATED

- [`vitest.web.config.ts`](../../vitest.web.config.ts)
- [`Package README`](../README.md)
- [`src README`](../src/README.md)
- [testing-library docs](https://testing-library.com/docs/) for the `render`, `screen`, `waitFor` and `userEvent` helpers used by the fixtures
