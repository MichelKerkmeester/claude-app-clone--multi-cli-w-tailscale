# Rich content

> Rich content turns normalized transcript payloads into bounded prose, code, command and artifact previews.

---

## 1. OVERVIEW

This folder is the rendering boundary for non-plain transcript payloads. It normalizes protocol and
display blocks, pairs shell calls with results, splits fenced code from prose and routes each
normalized kind to one renderer. The result is a readable preview that keeps source state and
redaction metadata visible.

The folder also decides what text can become markup. Prose always goes through
`safe-markdown.svelte`. That renderer accepts a small Markdown grammar and emits text, headings,
lists, tables, quotes and code blocks without creating arbitrary HTML or links.

### Key Statistics

| Metric | Current behavior |
|---|---|
| Status | Shipped Svelte rendering package |
| Normalized kinds | Command, code, text-artifact, prose, activity, diff and fallback |
| Markdown model | Allowlisted block and inline forms with a fail-closed fallback |
| Highlight limits | 20,000 characters and 1,000 lines |
| Rich open handoff | In-memory artifact document, with no fetch or host-file read |

---

## 2. FEATURES

### Key Features

| Feature | What It Does |
|---|---|
| Transcript normalization | Keeps the latest block revision, pairs shell calls with results and preserves sequence and source metadata. |
| Safe prose | Supports headings, paragraphs, quotes, lists, tables, inline emphasis and fenced code while rejecting unsafe input. |
| Command previews | Shows the command and the newest output tail, with lifecycle, completeness, cache and missing-result labels. |
| Code previews | Shows plaintext first and progressively highlights supported languages in a Web Worker. |
| Text artifacts | Shows document, prompt, goal, plan, text and long-text previews with an optional full-screen handoff. |
| Redaction visibility | Carries command and output redaction metadata into the shared frame and categorizes protected values. |
| Copy and open actions | Copies canonical source when the browser exposes the clipboard and opens an in-memory artifact when a viewer is available. |

The redaction boundary protects against four concrete failures. Raw agent text cannot inject a script
or arbitrary HTML into the transcript. A Markdown destination cannot create a clickable
`javascript:`, `vbscript:`, `data:`, `file:` or `blob:` URL. Control and bidirectional characters
cannot silently change how text is presented. A rich card cannot turn a cached, optimistic or
redacted payload into a fresh host-file read.

When Markdown fails the safety gate, the component presents the source verbatim. ANSI and
bidirectional controls become visible markers so the reader can see the data that caused the
fallback instead of receiving a hidden control sequence.

---

## 3. REQUIREMENTS

| Requirement | Minimum | Notes |
|---|---|---|
| Transcript input | Display or protocol blocks with stable ids, revisions and sequence values | The normalizer uses these values to retain the latest revision and restore order. |
| Redaction metadata | Canonical command, output and text values from the relay or cache | Cards display the supplied redaction state. They do not recover withheld content. |
| Artifact viewer | An optional viewer provider for full-screen open actions | Without a provider, the preview remains inline. |
| Browser capabilities | Clipboard and Web Worker support are optional | Copy disappears without clipboard support. Highlighting falls back to plaintext without a Worker or outside the policy limits. |

---

## 4. STRUCTURE

| File | Role |
|---|---|
| [`normalize-transcript-blocks.ts`](./normalize-transcript-blocks.ts) | Produces normalized command, code, artifact, prose, activity, diff and fallback blocks. |
| [`rich-content-router.svelte`](./rich-content-router.svelte) | The single dispatch point for every normalized block kind and the optional artifact handoff. |
| [`safe-markdown.svelte`](./safe-markdown.svelte) | Parses the small Markdown grammar and renders the fail-closed fallback. |
| [`rich-block-frame.svelte`](./rich-block-frame.svelte) | Provides shared heading, metadata, status, redaction and action chrome. |
| [`redaction-badge.svelte`](./redaction-badge.svelte) | Labels protected fields by category. |
| [`card-command-output.svelte`](./card-command-output.svelte) | Shows shell command and output state. |
| [`card-code.svelte`](./card-code.svelte) | Shows fenced source and highlight state. |
| [`card-text-artifact.svelte`](./card-text-artifact.svelte) | Shows substantial text previews. |
| [`use-highlighted-code.svelte.ts`](./use-highlighted-code.svelte.ts) | Applies size, language, hash and revision checks around highlighting. |
| [`highlight.worker.ts`](./highlight.worker.ts) | Tokenizes supported source away from the main thread. |

The complete flat inventory and the ownership rules are in [`CODE.md`](./CODE.md). The neighboring
transcript package decides when a block enters this router. The neighboring artifacts package owns
the viewer host.

---

## 5. CONFIGURATION

The rendering policy is code-local rather than environment-driven.

| Policy | Current value | Source |
|---|---|---|
| Supported fenced languages | Bash, JavaScript, TypeScript, JSX, TSX, JSON, HTML, CSS, Markdown, Python, Go, Rust, YAML, SQL, diff, ANSI and plaintext | [`normalize-transcript-blocks.ts`](./normalize-transcript-blocks.ts) |
| Highlight character limit | 20,000 characters | [`use-highlighted-code.svelte.ts`](./use-highlighted-code.svelte.ts) |
| Highlight line limit | 1,000 lines | [`use-highlighted-code.svelte.ts`](./use-highlighted-code.svelte.ts) |
| Safe Markdown output | Fixed AST nodes and text-only inline links | [`safe-markdown.svelte`](./safe-markdown.svelte) |

Changing these values changes a trust boundary or a rendering contract. Keep the router, redaction
badge and safety parser aligned when a policy changes.

---

## 6. USAGE EXAMPLES

| Situation | What the reader sees or does |
|---|---|
| Assistant prose arrives | The normalized prose goes through SafeMarkdown and keeps its role and direction metadata. |
| A shell call is running | The command card shows the command, current output and running lifecycle. |
| A shell result is complete | The card shows the newest output tail and labels completeness or failure. |
| A fenced block arrives | The normalizer creates a code block. The preview is plaintext first and may become highlighted. |
| A long settled text block arrives | The normalizer presents it as a long-text artifact with a bounded preview. |
| The browser supports copying | Copy uses the canonical source and announces success or failure in a polite status region. |
| A viewer is available | Open full screen receives an in-memory document containing the already-normalized source. |
| A block is unsupported or redacted | The router shows a bounded fallback and keeps the original kind or redaction state visible. |

---

## 7. TROUBLESHOOTING

| What You See | Cause | Fix |
|---|---|---|
| Prose appears as a verbatim fallback | Raw HTML, unsafe URL scheme, control character, bidirectional control or malformed fenced Markdown failed the safety gate. | Treat the source as text. Fix the producer or keep the visible fallback rather than enabling raw HTML. |
| A link is not clickable | SafeMarkdown preserves the label as text and does not emit anchors. | Use the original transcript context or a trusted application action. |
| Code is plain text | The language is unsupported, the source exceeds a limit or a Worker is unavailable. | Read the plaintext preview. Highlighting is an enhancement, not the source of truth. |
| A command shows only recent lines | The card intentionally previews the output tail. | Open the in-memory artifact when available. |
| A card shows stale cache or connection lost | The source is cached or the last known command was running when the connection ended. | Treat the preview as the last trustworthy snapshot. |
| Open full screen is missing | No viewer provider or open callback is available. | Use the inline preview. |
| Redacted content looks incomplete | The relay withheld sensitive fields before rendering. | Use the badge and availability state. Do not infer or reconstruct the missing value. |

---

## 8. RELATED RESOURCES

| Document | Purpose |
|---|---|
| [`CODE.md`](./CODE.md) | Normalization flow, security boundaries and renderer topology. |
| [Chat transcript README](../transcript/README.md) | Explains how the transcript chooses and groups rich blocks. |
| [Chat transcript CODE](../transcript/CODE.md) | Shows the transcript-to-router handoff. |
| [Artifacts README](../artifacts/README.md) | Documents the viewer and artifact preview host. |
