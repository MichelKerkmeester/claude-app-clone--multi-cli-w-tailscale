# Chat screen

> The in-session surface where a person reads a live conversation, sends work to Pi and inspects the resulting evidence.

---

## 1. OVERVIEW

This folder is the composition root for the session view at /session/[id]. A person can follow the transcript while a turn runs, send or stop a prompt, choose the host-confirmed runtime mode, attach photos and open plans or artifacts without leaving the session.

[`screen-chat.svelte`](./screen-chat.svelte) owns the session-level wiring. It connects the sync stream and runtime controls to the visual areas below. The child folders own their own rendering and interaction contracts, so a change to a preview or a composer sheet should usually stay in that child folder.

### Key Statistics

| Metric | Current behavior |
|---|---|
| Status | Shipped Svelte session surface |
| Direct surface | [`screen-chat.svelte`](./screen-chat.svelte) |
| Main audience | People operating an active Pi session |
| Child areas | Transcript, chrome, artifacts, attachments, rich content and ask-question |

---

## 2. FEATURES

### Key Features

| Feature | What it does |
|---|---|
| Live conversation | [`transcript/README.md`](./transcript/README.md) keeps prompts, answers, activity and evidence readable as the session changes. |
| Session controls | [`chrome/README.md`](./chrome/README.md) provides the composer, runtime readout, model and effort controls, command palette and plan flow. |
| Artifact inspection | [`artifacts/README.md`](./artifacts/README.md) opens code, diff, Markdown, text, PDF and image previews with bounded resource states. |
| Photo input | [`attachments/README.md`](./attachments/README.md) keeps selected photos local until an explicit send operation is authorized. |
| Rich block rendering | [`rich-content/README.md`](./rich-content/README.md) handles safe Markdown, code and command output inside transcript blocks. |
| Agent questions | [`features/ask-question/README.md`](./features/ask-question/README.md) renders an answerable question when the agent needs a decision. |

The screen also shows session status, reconciliation barriers and a read-only todo projection. Those surfaces are composed here and implemented by the child areas that render them.

---

## 3. REQUIREMENTS

| Requirement | Minimum | Notes |
|---|---|---|
| Session state | A session id, connection phase and transcript state | The route supplies these values to [`screen-chat.svelte`](./screen-chat.svelte). |
| Runtime authority | Host-backed runtime state | Model, effort and Build or Plan labels stay disabled until the host confirms a safe state. |
| Prompt submission | A live connection and a non-empty draft | Slash commands also need a current host command binding. |
| Photo sending | Media capability, a vision-capable model and a current session snapshot | The attachment flow rejects stale or unsupported submissions before commit. |

---

## 4. STRUCTURE

```text
./
+-- screen-chat.svelte             # Session composition root and sync wiring
+-- screen-chat.stories.ts         # Session surface stories
+-- transcript/                    # Conversation normalization and virtual rows
+-- chrome/                       # Composer, header, runtime controls and sheets
+-- artifacts/                     # Artifact and image viewer subsystem
+-- attachments/                   # Local photo draft and transfer flow
+-- rich-content/                  # Safe rich block renderers
`-- features/ask-question/         # Interactive question feature slice
```

| Path | Purpose |
|---|---|
| [`transcript/CODE.md`](./transcript/CODE.md) | How blocks become normalized, grouped and virtualized rows. |
| [`chrome/CODE.md`](./chrome/CODE.md) | Where focus-sensitive controls and overlays are arranged. |
| [`artifacts/CODE.md`](./artifacts/CODE.md) | Where viewer state, resource verification and preview selection live. |
| [`attachments/CODE.md`](./attachments/CODE.md) | Where local draft state and ticketed transfer phases are separated. |

---

## 5. USAGE EXAMPLES

| Person action | Surface | Result |
|---|---|---|
| Read a running turn | [`transcript/README.md`](./transcript/README.md) | New output follows the live edge when the reader is near the bottom. |
| Send a prompt | [`chrome/README.md`](./chrome/README.md) | The draft is submitted only while the session and runtime authority are usable. |
| Inspect a file or image | [`artifacts/README.md`](./artifacts/README.md) | A bounded viewer opens and returns focus to the originating transcript control when it closes. |
| Add photos | [`attachments/README.md`](./attachments/README.md) | Photos stay in a local draft until the transfer state machine commits them with the message. |
| Answer an agent question | [`features/ask-question/README.md`](./features/ask-question/README.md) | The answer is validated and sent through the question feature's fail-closed flow. |

---

## 6. TROUBLESHOOTING

| What you see | Cause | Fix |
|---|---|---|
| The status says reconnecting | The connection is not live, the transcript is from cache or a fresh snapshot is required. | Wait for the sync stream to become live before sending or changing runtime controls. |
| Send is disabled | The draft is empty, a turn is still sending or the connection is waiting for reconciliation. | Keep the draft, wait for the current state and try again. |
| A slash command will not send | The host command list is stale or the selected binding no longer matches it. | Open the command list again and select the current command. |
| Add photo is unavailable | Media capability is off or the selected model cannot view photos. | Choose a model with image input or enable the host capability. |
| A preview is unavailable | The relay withheld, denied, expired or could not verify the exact resource. | Read the viewer status and use its available retry or latest-revision action. |
| A todo panel cannot be edited | The panel is a read-only projection of the host plan. | Refresh the projection or make task changes in the controlling chat workflow. |

---

## 7. RELATED RESOURCES

### Related Documents

| Document | Purpose |
|---|---|
| [`screen-chat.svelte`](./screen-chat.svelte) | Session-level props, connection lifecycle, prompt handlers and child composition. |
| [`transcript/README.md`](./transcript/README.md) | Reader-facing transcript behavior. |
| [`chrome/README.md`](./chrome/README.md) | Composer and control behavior. |
| [`artifacts/README.md`](./artifacts/README.md) | Viewer behavior and preview states. |
| [`attachments/README.md`](./attachments/README.md) | Photo selection and sending behavior. |
| [`rich-content/README.md`](./rich-content/README.md) | Safe rich content rendering. |
| [`features/ask-question/README.md`](./features/ask-question/README.md) | Agent question interaction. |
