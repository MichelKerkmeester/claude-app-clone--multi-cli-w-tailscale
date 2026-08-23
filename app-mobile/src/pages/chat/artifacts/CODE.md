# artifacts/: verified resources and preview routing

---

## 1. OVERVIEW

`artifacts/` is a flat viewer package. It receives a preview source from the transcript or another chat surface, captures it in [`artifact-viewer-provider.svelte`](./artifact-viewer-provider.svelte), loads remote bytes through [`use-artifact-resource.svelte.ts`](./use-artifact-resource.svelte.ts) and selects a renderer in [`artifact-viewer-host.svelte`](./artifact-viewer-host.svelte).

Current state:

- The provider owns context, open and close phases, browser history, focus and scroll restoration, privacy coverage and generation guards.
- The host owns the dialog and toolbar. It maps file descriptors to text, code, diff, Markdown, PDF, image or unsupported preview content.
- The resource hook is the only full-resource read path for descriptor and inbound-image content. It verifies exact identity, byte length, content type and digest before decoding or retaining image bytes.
- Preview components render supplied text or verified bytes. They do not decide whether a relay response is trustworthy.

The place for a change is deliberate. Add a renderer in its own `*-preview.svelte` file, add its selection branch in [`artifact-viewer-host.svelte`](./artifact-viewer-host.svelte) and add a story for its states. Change fetching, digest checks, object URL lifetime or purge in [`use-artifact-resource.svelte.ts`](./use-artifact-resource.svelte.ts). Change dialog focus, history or privacy teardown in [`artifact-viewer-provider.svelte`](./artifact-viewer-provider.svelte).

---

## 2. ARCHITECTURE

```text
transcript/card-file-preview.svelte
transcript/block.svelte
        |
        v
artifact-viewer-provider.svelte
        |
        +--> context open / update / close
        |
        `--> artifact-viewer-host.svelte
                    |
                    +--> use-artifact-resource.svelte.ts
                    |          |
                    |          v
                    |    relay bytes, identity checks and object URLs
                    |
                    +--> artifact-status.svelte
                    +--> preview-controls.svelte
                    +--> artifact-header.svelte
                    |
                    +--> text / code / diff / Markdown previews
                    +--> pdf-preview.svelte
                    `--> secure-image-preview.svelte
```

Inbound images use a thumbnail resource and a full resource. Both pass through the same identity and digest checks. The host exposes an object URL only after the required image decode succeeds.

---

## 3. PACKAGE TOPOLOGY

```text
artifacts/
+-- artifact-viewer-provider.svelte       # Context and viewer phase machine
+-- artifact-viewer-host.svelte           # Dialog, resource wiring and renderer switch
+-- types.ts                              # Acyclic source and phase contracts
+-- use-artifact-resource.svelte.ts       # Reads, verifies, retains and purges resources
+-- use-artifact-history.svelte.ts        # Browser history wrapper
+-- artifact-share.ts                     # Copy and share capability gates
+-- artifact-header.svelte                # Viewer heading and close control
+-- artifact-status.svelte                # Live status announcements
+-- artifact-details.svelte               # Inbound image metadata
+-- preview-controls.svelte               # Per-kind toolbar
+-- card-artifact.svelte                  # Transcript file card
+-- card-inbound-image.svelte             # Transcript inbound-image card
+-- inbound-image-block-view.svelte       # Capability fallback and card mount
+-- *-preview.svelte                      # Content renderers and image state surfaces
+-- verified-image.svelte                 # Verified image display helper
+-- pdf-preview-shared.ts                 # PDF sizing and text helpers
```

Allowed dependency direction:

```text
transcript cards -> artifact-viewer-provider -> artifact-viewer-host
artifact-viewer-host -> use-artifact-resource
artifact-viewer-host -> preview components
preview components -> display props or verified bytes
use-artifact-resource -> relay transport and bounded memory stores
artifact-viewer-provider -> use-artifact-history and resource purge
```

Disallowed ownership direction:

```text
preview components -> relay reads or viewer context mutation
inbound image card -> raw unverified image bytes
resource hook -> dialog focus or renderer selection
transcript rows -> viewer history or object URL cleanup
```

---

## 4. DIRECTORY TREE

The folder is flat. The complete direct-file inventory is below. Story files cover the matching component states.

| File | Responsibility |
|---|---|
| [`artifact-details.svelte`](./artifact-details.svelte) | Shows inbound image type, dimensions, byte sizes, revision and redaction metadata. |
| [`artifact-details.stories.ts`](./artifact-details.stories.ts) | Stories for image metadata details. |
| [`artifact-header.svelte`](./artifact-header.svelte) | Renders viewer kind, title, exact revision and close control. |
| [`artifact-header.stories.ts`](./artifact-header.stories.ts) | Stories for viewer header states. |
| [`artifact-share.ts`](./artifact-share.ts) | Checks browser capability and artifact policy for copy and share. |
| [`artifact-status.svelte`](./artifact-status.svelte) | Maps phase and resource status to live-region messages. |
| [`artifact-status.stories.ts`](./artifact-status.stories.ts) | Stories for loading, stale, failure and terminal status announcements. |
| [`artifact-viewer-host.svelte`](./artifact-viewer-host.svelte) | Owns dialog interaction, resource hooks, toolbar state and renderer selection. |
| [`artifact-viewer-provider.svelte`](./artifact-viewer-provider.svelte) | Owns viewer context, open and close generation, privacy purge and focus restoration. |
| [`card-artifact.svelte`](./card-artifact.svelte) | Opens a file diff or preview source from a transcript card. |
| [`card-artifact.stories.ts`](./card-artifact.stories.ts) | Stories for file card preview states. |
| [`card-inbound-image.svelte`](./card-inbound-image.svelte) | Renders inbound image lifecycle state and opens the verified viewer. |
| [`card-inbound-image.stories.ts`](./card-inbound-image.stories.ts) | Stories for inbound image lifecycle states. |
| [`code-preview.svelte`](./code-preview.svelte) | Renders text with optional language highlighting, find matches and live-tail behavior. |
| [`code-preview.stories.ts`](./code-preview.stories.ts) | Stories for plain, highlighted, wrapped and live code. |
| [`diff-preview.svelte`](./diff-preview.svelte) | Renders unified diff lines with add, remove, context and find states. |
| [`diff-preview.stories.ts`](./diff-preview.stories.ts) | Stories for diff wrapping and search states. |
| [`image-placeholder.svelte`](./image-placeholder.svelte) | Renders an empty inbound-image well when pixels are unavailable. |
| [`image-placeholder.stories.ts`](./image-placeholder.stories.ts) | Stories for placeholder aspect and state variants. |
| [`image-preview.svelte`](./image-preview.svelte) | Renders a bounded decoded image with zoom and pointer pan for descriptor previews. |
| [`image-preview.stories.ts`](./image-preview.stories.ts) | Stories for image loading, ready, corrupt and size states. |
| [`image-status.svelte`](./image-status.svelte) | Maps inbound-image lifecycle state to status copy and actions. |
| [`image-status.stories.ts`](./image-status.stories.ts) | Stories for inbound image status and action combinations. |
| [`inbound-image-block-view.svelte`](./inbound-image-block-view.svelte) | Mounts the inbound image card or the unsupported capability fallback. |
| [`inbound-image-block-view.stories.ts`](./inbound-image-block-view.stories.ts) | Stories for supported and unsupported inbound image blocks. |
| [`markdown-preview.svelte`](./markdown-preview.svelte) | Renders a bounded Markdown preview with search highlighting. |
| [`markdown-preview.stories.ts`](./markdown-preview.stories.ts) | Stories for Markdown content and search state. |
| [`pdf-page.svelte`](./pdf-page.svelte) | Renders one PDF page canvas and its text layer state. |
| [`pdf-preview-shared.ts`](./pdf-preview-shared.ts) | Provides PDF bounds, zoom and text-span helpers shared by PDF surfaces. |
| [`pdf-preview.svelte`](./pdf-preview.svelte) | Coordinates PDF loading, page selection, zoom, find and page rendering. |
| [`pdf-preview.stories.ts`](./pdf-preview.stories.ts) | Stories for PDF loading, empty and error states. |
| [`preview-controls.svelte`](./preview-controls.svelte) | Renders kind, read-only, find, wrap, zoom, pan, details, copy and share controls. |
| [`preview-controls.stories.ts`](./preview-controls.stories.ts) | Stories for per-kind toolbar combinations. |
| [`secure-image-preview.svelte`](./secure-image-preview.svelte) | Displays a verified object URL with bounded zoom, pan and lifecycle status. |
| [`secure-image-preview.stories.ts`](./secure-image-preview.stories.ts) | Stories for secure image loading, degradation and controls. |
| [`text-preview.svelte`](./text-preview.svelte) | Renders bounded text with wrapping and find highlighting. |
| [`text-preview.stories.ts`](./text-preview.stories.ts) | Stories for text wrapping and search states. |
| [`types.ts`](./types.ts) | Defines viewer phases, dismissal reasons, source types, snapshots and context contracts. |
| [`unsupported-preview.svelte`](./unsupported-preview.svelte) | Renders withheld, denied, corrupt, missing, too-large and unsupported notices. |
| [`unsupported-preview.stories.ts`](./unsupported-preview.stories.ts) | Stories for unavailable renderer messages. |
| [`use-artifact-history.svelte.ts`](./use-artifact-history.svelte.ts) | Adds and removes a browser history entry for an open viewer. |
| [`use-artifact-resource.svelte.ts`](./use-artifact-resource.svelte.ts) | Loads, verifies, caches, decodes, retains and purges bounded artifact resources. |
| [`verified-image.svelte`](./verified-image.svelte) | Renders a verified image source and its unavailable states. |
| [`verified-image.stories.ts`](./verified-image.stories.ts) | Stories for verified image rendering and fallback states. |
| [`README.md`](./README.md) | Feature behavior and user-facing troubleshooting. |
| [`CODE.md`](./CODE.md) | This implementation map. |

---

## 5. KEY FILES

| File | Responsibility |
|---|---|
| [`artifact-viewer-provider.svelte`](./artifact-viewer-provider.svelte) | `getArtifactViewer()` exposes `openDiff`, `openInboundImage`, `openInMemory`, `updateInMemory` and `close` to card callers. |
| [`artifact-viewer-host.svelte`](./artifact-viewer-host.svelte) | Converts the captured source into a viewer subject, status, toolbar and renderer branch. |
| [`use-artifact-resource.svelte.ts`](./use-artifact-resource.svelte.ts) | `useArtifactResource()` verifies the exact tuple and exposes text, bytes or a verified object URL. |
| [`types.ts`](./types.ts) | Keeps provider and host contracts acyclic through type-only source definitions. |
| [`secure-image-preview.svelte`](./secure-image-preview.svelte) | The full viewer image surface. It receives verified bytes through an object URL and never performs the relay read. |
| [`image-status.svelte`](./image-status.svelte) | Keeps inbound-image status vocabulary and available actions explicit. |
| [`pdf-preview.svelte`](./pdf-preview.svelte) | Owns PDF page state while [`pdf-page.svelte`](./pdf-page.svelte) renders individual pages. |
| [`artifact-share.ts`](./artifact-share.ts) | Applies browser and redaction policy before copy or share. |

---

## 6. BOUNDARIES AND FLOW

| Boundary | Rule |
|---|---|
| Source capture | The provider freezes the source, trigger, session id and scroll position before opening. |
| Renderer selection | The host selects the renderer from the verified descriptor or in-memory renderer. Add a new type here only alongside its new preview file. |
| Resource reads | The resource hook checks identity, byte length, revision, content type and digest. Inline text is the only descriptor content that can avoid a relay read. |
| Image pixels | Image resources require image decode before object URL creation. Inbound image paths stay behind [`secure-image-preview.svelte`](./secure-image-preview.svelte) or [`verified-image.svelte`](./verified-image.svelte). |
| Dialog interaction | The host owns Escape, Tab containment, underlay dismissal, edge-back and focus-scrub behavior. |
| Privacy | The provider and resource hook purge bytes, workers, object URLs and image nodes on close, hide, pagehide, logout, session switch, revocation and transcript supersession. |
| PDF dependency | PDF rendering belongs to [`pdf-preview.svelte`](./pdf-preview.svelte) and [`pdf-page.svelte`](./pdf-page.svelte). Keep PDF loading details out of the generic resource and text preview paths. |

Main flow:

```text
Transcript file or image card
             |
             v
getArtifactViewer().openDiff()
             |
             v
artifact-viewer-provider.svelte
  capture source, trigger and scroll position
             |
             v
artifact-viewer-host.svelte
  classify source and choose resource variant
             |
             v
use-artifact-resource.svelte.ts
  read, verify, decode and retain
             |
             +--> artifact-status.svelte
             +--> preview-controls.svelte
             `--> selected preview component
                         |
                         v
                   read-only preview
                         |
                         v
                 close, purge and restore
```

---

## 7. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|---|---|---|
| `getArtifactViewer` | Function | Reads the required viewer context from a descendant card. |
| `getOptionalArtifactViewer` | Function | Reads viewer context for a card that can render without the provider. |
| `useArtifactResource` | Function | Creates the exact-tuple resource lifecycle for full or thumbnail content. |
| `purgeArtifactResourceStore` | Function | Cancels active requests and clears all retained resource stores. |
| `clearArtifactFullResourceStore` | Function | Drops full resources while preserving verified thumbnails. |
| `createArtifactHistory` | Function | Creates a framework-agnostic browser history controller. |
| `useArtifactHistory` | Function | Binds the history controller to the Svelte lifecycle. |
| `isArtifactResourceBlock` | Function | Guards file preview and inbound-image resource blocks. |

---

## 8. VALIDATION

Run from the repository root:

```bash
node scripts/naming/scan-folder-docs.mjs
```

The artifact folder is covered when it has both documents and every local preview or sibling link resolves. When changing source, exercise the relevant story files and run the app-mobile typecheck. The viewer's most important checks are exact revision mismatch, digest mismatch, image decode failure, stale state, privacy purge and focus restoration.

---

## 9. RELATED

- [`README.md`](./README.md)
- [`../README.md`](../README.md)
- [`../transcript/CODE.md`](../transcript/CODE.md)
- [`../rich-content/CODE.md`](../rich-content/CODE.md)
- [`../chrome/CODE.md`](../chrome/CODE.md)
