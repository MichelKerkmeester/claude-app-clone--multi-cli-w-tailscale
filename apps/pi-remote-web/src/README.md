---
title: 'Web Source: State, Cache, Relay, Auth and Attention Zones'
description: 'Zone map for the browser client, from the relay client to the state reducers and the offline cache.'
trigger_phrases:
  - 'pi remote web source'
  - 'web client zones'
---

# Web Source: State, Cache, Relay, Auth and Attention Zones

---

## 1. OVERVIEW

`src/` owns the browser client for `@pi-remote/web`. `App.tsx` composes the views, `relay.ts` and `auth.ts` own all fetch and WebSocket traffic, `state.ts` owns the reducers, `cache.ts` owns the offline snapshot, and `attention.ts` owns the attention inbox and push subscriptions.

Current state:

- `state.ts` runs three reducers: connection, session list and transcript
- `cache.ts` persists a bounded read-only snapshot under the `pi-remote.read-only.v1` key
- `relay.ts` is the only module that calls `/api` endpoints
- `auth.ts` stores the device key in IndexedDB under `pi-remote-device-v1`

---

## 2. ARCHITECTURE

```text
╭──────────────────────────────────────────────────────────────────╮
│                            src/                                  │
╰──────────────────────────────────────────────────────────────────╯

┌─────────────┐      ┌────────────────┐      ┌────────────────────┐
│ App.tsx     │ ───▶ │ relay.ts       │ ───▶ │ Relay /api         │
│ views       │      │ WebSocket sync │      │ /api/sync          │
└──────┬──────┘      └────────────────┘      └────────────────────┘
       │
       ├──▶ auth.ts ───────▶ /api/auth/* (enroll, session, revoke)
       ├──▶ attention.ts ──▶ /api/attention*, /api/push*
       │
       ▼
┌─────────────┐      ┌────────────────┐
│ state.ts    │ ◀─── │ cache.ts       │
│ reducers    │      │ localStorage   │
└─────────────┘      └────────────────┘

Dependency direction: App.tsx ───▶ relay.ts, auth.ts, attention.ts, state.ts, cache.ts
state.ts ───▶ pi-rpc-protocol types only
```

---

## 3. KEY FILES

| File           | Responsibility                                                                                                                     |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `state.ts`     | `connectionReducer`, `sessionListReducer`, `transcriptReducer`, block normalization and validation                                 |
| `cache.ts`     | `loadCache`, `saveCache`, 7 day max age, 8 sessions, 500 blocks                                                                    |
| `relay.ts`     | `fetchSessions`, `submitPrompt`, `fetchApprovals`, `decideApproval`, `createAcceptEditsGrant`, `fetchTranscript`, `openSyncSocket` |
| `auth.ts`      | `enrollDevice`, `establishSession`, `revokeDevice`, `logoutDevice`, `scanQrImage`                                                  |
| `attention.ts` | `fetchAttention`, `openAttentionHint`, push config, subscribe and preferences                                                      |
| `App.tsx`      | Root component, routing between Enrollment, Home, Session, Review and Inbox                                                        |
| `style.css`    | Tailwind entry and app styles                                                                                                      |
| `main.tsx`     | Bootstrap and service worker registration                                                                                          |

---

## 4. BOUNDARIES AND FLOW

| Boundary  | Rule                                                                                            |
| --------- | ----------------------------------------------------------------------------------------------- |
| Imports   | Views import from `state.js`, `relay.js`, `auth.js`, `attention.js` and `cache.js`              |
| Exports   | App views and state functions are exported for the tests folder                                 |
| Ownership | Relay HTTP and WebSocket traffic lives in `relay.ts`, storage lives in `cache.ts` and `auth.ts` |

Main flow:

```text
╭──────────────────────────────────────────╮
│ main.tsx mounts App                      │
╰──────────────────────────────────────────╯
                  │
                  ▼
┌──────────────────────────────────────────┐
│ auth.ts establishSession                 │
└──────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────┐
│ relay.ts fetchSessions, fetchTranscript  │
└──────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────┐
│ state.ts reducers apply snapshot, delta  │
└──────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────┐
│ cache.ts saveCache on relay source       │
└──────────────────────────────────────────┘
```

---

## 5. VALIDATION

Run from the repository root.

```bash
npm run test:web
npm run typecheck -w @pi-remote/web
```

Expected result: the web suite passes and TypeScript reports no errors.

---

## 6. RELATED

- [`Package README`](../README.md)
- [`tests/` README](../tests/README.md)
