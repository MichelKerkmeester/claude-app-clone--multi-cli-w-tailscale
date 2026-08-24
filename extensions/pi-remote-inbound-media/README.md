---
title: 'Pi Remote Inbound Media Extension: Host-Side Image Boundary'
description: 'Pi extension host seam that intercepts inbound images from allowlisted sources and publishes only approved, capability-gated media to the relay.'
trigger_phrases:
  - 'pi remote inbound media'
  - 'inbound media boundary'
  - 'host image adapter'
---

# Pi Remote Inbound Media Extension: Host-Side Image Boundary

---

## 1. OVERVIEW

`extensions/pi-remote-inbound-media/` is the `@pi-remote/inbound-media-extension` package. It is the
host-side boundary that lets inbound images reach the relay without giving Pi a direct transport writer.
The host installs the adapter through `createInboundMediaHostAdapter`; the adapter watches a pre-stdout
interception seam, and when an image arrives from an allowlisted source and the runtime media capability
is enabled, it hands the host an opaque capability that publishes the approved image.

Current state:

- Allowlisted sources are `tool_result`, `assistant_output` and `extension`; every other source is ignored
- Media classes are `screenshot`, `raster` and `generated`
- The boundary is gated: it produces a capability only when interception is available AND the runtime
  snapshot reports the media capability enabled
- The callback receives only an opaque capability handle — transport writers are never used by this
  boundary, so Pi cannot address the relay directly

---

## 2. ARCHITECTURE

```text
host installs createInboundMediaHostAdapter(options)
        │
        ▼
adapter subscribes to the pre-stdout interception seam
        │
        ▼
image event from an allowlisted source + class
        │
   capability gate (interception available AND runtime media enabled)
        │
        ▼
opaque InboundMediaCapability → host publishes the approved image to the relay
```

The gate is the whole point: the extension never writes transport itself and never exposes a writer to
Pi. It only decides, per event, whether the host is allowed to publish, and hands back a capability that
carries no relay address.

---

## 3. DIRECTORY TREE

```text
pi-remote-inbound-media/
+-- src/
|   `-- index.ts        # The host boundary: types, allowlists, and the adapter factory
+-- tests/
|   +-- publish.test.ts             # Publishing behaviour through the capability
|   `-- publisher-boundary.test.ts  # The boundary's negative controls
`-- package.json
```

---

## 4. KEY FILES

| File | Responsibility |
|---|---|
| [`src/index.ts`](./src/index.ts) | The `InboundMedia*` types, the source and class allowlists, and `createInboundMediaHostAdapter` — the only entry point. |
| [`tests/publisher-boundary.test.ts`](./tests/publisher-boundary.test.ts) | Proves the boundary refuses non-allowlisted sources and stays capability-gated. |

---

## 5. BOUNDARIES AND FLOW

| Boundary | Rule |
|---|---|
| Sources | Only `tool_result`, `assistant_output`, `extension` are considered; others are dropped. |
| Capability | No capability is produced unless interception is available and the runtime media capability is enabled. |
| Transport | The extension never writes transport; it returns an opaque capability the host uses to publish. |

---

## 6. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|---|---|---|
| `createInboundMediaHostAdapter(options)` | Export | Build the host seam; returns an `InboundMediaHostAdapter`. |
| `ALLOWLISTED_INBOUND_MEDIA_SOURCES` | Export | The frozen source allowlist the boundary enforces. |

---

## 7. VALIDATION

Run from the Pi Remote root:

```bash
npm run typecheck -w @pi-remote/inbound-media-extension
npm test -w @pi-remote/inbound-media-extension
```

Expected result: typecheck exits 0 and the publish and boundary suites pass.

---

## 8. RELATED

| Path | Purpose |
|---|---|
| [`../README.md`](../README.md) | The extensions map. |
| [`../../app-relay/src/attachments/README.md`](../../app-relay/src/attachments/README.md) | The relay side that receives and normalises inbound media. |
