# rich-content/: normalization, safe routing and bounded previews

---

## 1. OVERVIEW

`rich-content/` is the flat presentation package between transcript normalization and the rendered
rich block. It keeps one normalized union for command, code, text-artifact, prose, activity, diff
and fallback content. The router then selects a card or a bounded read-out without asking the host
for another payload.

Current state:

- [`normalize-transcript-blocks.ts`](./normalize-transcript-blocks.ts) keeps the latest revision, pairs shell calls with results, splits fenced code and attaches source and redaction metadata.
- [`rich-content-router.svelte`](./rich-content-router.svelte) is the only block-kind dispatch point. Its pure guards are exported for transcript projection and security tests.
- [`safe-markdown.svelte`](./safe-markdown.svelte) is the only Markdown renderer. Its parser rejects unsafe source and falls back to visible verbatim text.
- Code highlighting uses [`use-highlighted-code.svelte.ts`](./use-highlighted-code.svelte.ts) and [`highlight.worker.ts`](./highlight.worker.ts). The preview stays readable when highlighting is skipped or fails.

---

## 2. ARCHITECTURE

```text
transcript-list.svelte
        |
        v
normalize-transcript-blocks.ts
        |
        +--> command · code · text-artifact
        +--> prose · activity · diff · fallback
        |
        v
rich-content-router.svelte
        |
        +--> rich-block-frame.svelte --> redaction-badge.svelte
        +--> safe-markdown.svelte
        +--> card-command-output.svelte
        +--> card-code.svelte --> use-highlighted-code.svelte.ts
        |                              |
        |                              v
        |                        highlight.worker.ts
        +--> card-text-artifact.svelte
        |
        `--> f6-viewer-adapter.ts --> artifact viewer provider
```

The router has two kinds of output. Rich cards can copy canonical source or hand an in-memory
document to the artifacts viewer. Prose, activity, diff and fallback blocks stay inside the
transcript surface. No branch fetches a host file or reconstructs redacted input.

---

## 3. PACKAGE TOPOLOGY

```text
normalization and policy
  normalize-transcript-blocks.ts
  safe-markdown.svelte
  prose-link.ts
  use-highlighted-code.svelte.ts
  highlight.worker.ts

dispatch and shared chrome
  rich-content-router.svelte
  rich-block-frame.svelte
  redaction-badge.svelte

rich cards and actions
  card-command-output.svelte
  card-code.svelte
  card-text-artifact.svelte
  use-copy-feedback.svelte.ts
  f6-viewer-adapter.ts
```

Allowed dependency direction:

```text
transcript → normalize → router → card or safe read-out
card → frame → redaction badge
card-code → highlighted-code hook → highlight worker
router → in-memory viewer adapter → artifact viewer provider
```

Disallowed ownership edges:

- Prose must not bypass [`safe-markdown.svelte`](./safe-markdown.svelte) for a raw HTML renderer.
- Cards must not fetch a new source or read a host file during the open handoff.
- The highlight worker must receive only canonical normalized source and must not decide whether a block is safe to render.
- Redaction metadata belongs to the normalized block and shared frame. A card must not remove the badge to make a preview look complete.

---

## 4. DIRECTORY TREE

The folder is flat. This inventory names every direct file other than the README.

| File | Responsibility |
|---|---|
| [`card-code.svelte`](./card-code.svelte) | Renders fenced code previews, copy and open actions. |
| [`card-code.stories.ts`](./card-code.stories.ts) | Exercises a normalized code preview. |
| [`card-command-output.svelte`](./card-command-output.svelte) | Reconciles and renders shell command and output snapshots. |
| [`card-command-output.stories.ts`](./card-command-output.stories.ts) | Exercises running, completed, failed, denied, cancelled and interrupted command states. |
| [`card-text-artifact.svelte`](./card-text-artifact.svelte) | Renders text artifact previews, copy and open actions. |
| [`card-text-artifact.stories.ts`](./card-text-artifact.stories.ts) | Exercises document and long-text artifacts. |
| [`f6-viewer-adapter.ts`](./f6-viewer-adapter.ts) | Projects rich cards into in-memory artifact documents. |
| [`highlight.worker.ts`](./highlight.worker.ts) | Tokenizes allowlisted source in a Web Worker. |
| [`normalize-transcript-blocks.ts`](./normalize-transcript-blocks.ts) | Normalizes revisions, fenced code, long text, shell pairs and fallback blocks. |
| [`prose-link.ts`](./prose-link.ts) | Classifies http(s) URLs versus file-path tokens; never opens a local path. |
| [`redaction-badge.svelte`](./redaction-badge.svelte) | Shows redaction categories for protected fields. |
| [`redaction-badge.stories.ts`](./redaction-badge.stories.ts) | Exercises command, cache and no-redaction states. |
| [`rich-block-frame.svelte`](./rich-block-frame.svelte) | Provides shared rich-card header, content and action chrome. |
| [`rich-block-frame.stories.ts`](./rich-block-frame.stories.ts) | Exercises plain and redacted frames. |
| [`rich-content-router.svelte`](./rich-content-router.svelte) | Dispatches every normalized block kind and handles viewer handoff. |
| [`rich-content-router.stories.ts`](./rich-content-router.stories.ts) | Exercises command lifecycle, prose, code, text artifact and fallback kinds. |
| [`safe-markdown.svelte`](./safe-markdown.svelte) | Parses and renders the fixed safe Markdown subset. |
| [`safe-markdown.stories.ts`](./safe-markdown.stories.ts) | Exercises prose and bidirectional-text fallback cases. |
| [`use-copy-feedback.svelte.ts`](./use-copy-feedback.svelte.ts) | Provides clipboard actions and polite copy feedback. |
| [`use-highlighted-code.svelte.ts`](./use-highlighted-code.svelte.ts) | Controls highlight eligibility, worker lifecycle and response validation. |
| `CODE.md` | This code-folder map. |

---

## 5. KEY FILES

| File | Responsibility |
|---|---|
| [`normalize-transcript-blocks.ts`](./normalize-transcript-blocks.ts) | Converts protocol or display input into stable normalized blocks with canonical source and redaction metadata. |
| [`rich-content-router.svelte`](./rich-content-router.svelte) | Keeps block-kind guards and dispatch in one auditable place. |
| [`safe-markdown.svelte`](./safe-markdown.svelte) | Rejects raw HTML, unsafe schemes, controls and malformed fences before creating markup. |
| [`use-highlighted-code.svelte.ts`](./use-highlighted-code.svelte.ts) | Sends bounded canonical source to a Worker and accepts only matching hash, request, revision and token coverage. |
| [`f6-viewer-adapter.ts`](./f6-viewer-adapter.ts) | Creates the in-memory document used by the full-screen artifact handoff. |
| [`rich-block-frame.svelte`](./rich-block-frame.svelte) | Keeps title, metadata, lifecycle status and redaction visible across card types. |

---

## 6. BOUNDARIES AND FLOW

| Boundary | Rule |
|---|---|
| Input | The transcript supplies protocol or display blocks. The normalizer retains the latest revision for each block identity. |
| Source policy | Optimistic input becomes a fallback block. Cached input keeps its cache provenance and is labeled by the relevant card. |
| Markdown | [`safe-markdown.svelte`](./safe-markdown.svelte) is the only sanctioned path for transcript prose. It emits http(s) anchors that open externally and keeps file-path tokens inert. |
| Redaction | Command and output metadata is merged into the normalized block and displayed by [`redaction-badge.svelte`](./redaction-badge.svelte). |
| Highlighting | Only allowlisted languages within 20,000 characters and 1,000 lines enter the Worker. A response must match request id, revision id, content hash and source length. |
| Viewer | [`f6-viewer-adapter.ts`](./f6-viewer-adapter.ts) creates an in-memory document. The router delegates it to the existing artifacts viewer without a fetch, ticket, download or host-file read. |

Main flow:

```text
DisplayTranscriptBlock[] or TranscriptBlock[]
                    |
                    v
          latest revision by block id
                    |
                    v
       pair shell calls and shell results
                    |
                    v
       normalize into stable rich kinds
                    |
                    v
             router dispatch
          /        |        \
         v         v         v
      prose      code      command
         |         |         |
    SafeMarkdown  Worker   bounded output tail
                    |
                    v
             plaintext or tokens
```

The safety decision happens before the Svelte markup branch. A rejected Markdown source is rendered
as visible verbatim text, while a skipped highlight only changes decoration around canonical source.

---

## 7. ENTRYPOINTS

| Entrypoint | Type | Purpose |
|---|---|---|
| [`normalize-transcript-blocks.ts`](./normalize-transcript-blocks.ts) | Module | Exports transcript normalization, fence-language normalization and block identity helpers. |
| [`rich-content-router.svelte`](./rich-content-router.svelte) | Svelte component | Receives a normalized block and selects its renderer. |
| `isNormalizedRichContentBlock` | Function | Checks whether a value has a supported normalized kind. |
| `isRichCardBlock` | Function | Checks whether a normalized block can become an in-memory artifact document. |
| `parseSafeMarkdown` | Function | Parses the fixed safe Markdown subset or returns a fail-closed null result. |
| `createInMemoryArtifactDocument` | Function | Converts a command, code or text artifact into the viewer's in-memory document shape. |
| `useHighlightedCode` | Runes hook | Exposes plaintext, pending, highlighted, skipped and failed states. |

---

## 8. VALIDATION

Run from the repository root:

```bash
node scripts/naming/scan-folder-docs.mjs
```

The folder is healthy when the scan finds both documents and no broken-reference entry for
`pages/chat/rich-content`.

---

## 9. RELATED

- [`README.md`](./README.md)
- [Chat transcript README](../transcript/README.md)
- [Chat transcript CODE](../transcript/CODE.md)
- [Artifacts README](../artifacts/README.md)
- [Artifacts viewer provider](../artifacts/artifact-viewer-provider.svelte)
