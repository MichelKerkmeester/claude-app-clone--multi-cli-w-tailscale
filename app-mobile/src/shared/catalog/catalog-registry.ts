// ───────────────────────────────────────────────────────────────────
// MODULE: Design System Catalog Registry
// ───────────────────────────────────────────────────────────────────
// Pure-data backbone of the catalog. Every migrated `@ds surface:` and the
// `@ds state:` / `@ds guardrail:` seams it declares are indexed here so the
// Catalog is a faithful, browsable index of the whole system. This module is
// Data only — it never imports a component and never touches the app shell.
//
// @ds grammar used here, matching the source seams:
//   Surface  — one reusable component/layout contract.
//   State    — a declared discrete appearance the surface renders.
//   Slot     — a named, typed region inside a surface (see source components).
//   Variant  — an alternative presentation of a surface.
//   Edit     — a seam a designer may change (layout, tokens, presentation).
//   Guardrail: do-not-edit — a frozen accessibility / security / logic seam.
//   Catalog  — this read-only preview surface (the one net-new surface).
//   Theme    — the light / dark semantic remap a surface reads via tokens.
//
// `live` surfaces render real components; `registry-only` records why preview is unsafe here.

// ───────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export type PreviewKind = 'live' | 'registry-only';

export interface CatalogSurface {
  readonly id: string;
  readonly title: string;
  readonly purpose: string;
  readonly states: readonly string[];
  readonly tokens: readonly string[];
  readonly editability: string;
  readonly preview: PreviewKind;
  readonly previewReason?: string;
}

// ───────────────────────────────────────────────────────────────────
// 2. SHARED PRIMITIVE GUARDRAIL NOTE
// ───────────────────────────────────────────────────────────────────

/** Shared guardrail note for the accessibility primitives (focus / motion / status). */
const A11Y_PRIMITIVES = {
  editability:
    'frozen accessibility seam (@ds guardrail: do-not-edit) — every control depends on it, and the collector cannot be narrowed without breaking AA contrast.',
  preview: 'registry-only' as const,
  previewReason:
    'a shared primitive with no standalone component — it renders inside every live control, never on its own.',
} as const;

// ───────────────────────────────────────────────────────────────────
// 3. SURFACE REGISTRY
// ───────────────────────────────────────────────────────────────────

export const CATALOG_SURFACES: readonly CatalogSurface[] = [
  {
    id: 'focus-ring',
    title: 'Focus ring / focus-visible',
    purpose: 'The shared AA focus ring every control shares; colour + offset, never width.',
    states: ['focus-visible', 'pressed'],
    tokens: [],
    editability: A11Y_PRIMITIVES.editability,
    preview: A11Y_PRIMITIVES.preview,
    previewReason: A11Y_PRIMITIVES.previewReason,
  },
  {
    id: 'motion-scale',
    title: 'Motion scale',
    purpose: 'The duration + easing family (fast / state / interface-settle) behind every transition.',
    states: ['duration-fast', 'duration-state', 'ease-out-interface'],
    tokens: ['--duration-*', '--ease-out'],
    editability: 'editable token seam — retime the whole system on `:root` or one surface via its easing/duration rows.',
    preview: 'registry-only',
    previewReason:
      'a token convention, not a component — it animates the live components and has no standalone preview.',
  },
  {
    id: 'status-vocabulary',
    title: 'Status & state vocabulary',
    purpose: 'The recurring status/badge families and per-surface state machines (idle · ready · stalled · denied · …).',
    states: [
      'idle', 'loading', 'ready', 'empty', 'offline', 'stale', 'denied',
      'expired', 'missing', 'revoked', 'conflict', 'corrupt', 'too-large',
      'rate-limited', 'stop', 'stop-pending', 'unsupported',
    ],
    tokens: [],
    editability: 'frozen convention (@ds guardrail: do-not-edit) — the state machines and the announced status text are off-limits.',
    preview: 'registry-only',
    previewReason:
      'a documented convention with no shared class — each surface maps its own states onto the shared vocabulary.',
  },
  {
    id: 'app-shell',
    title: 'App shell / frame',
    purpose: 'The fixed-width app frame wrapping every routed surface.',
    states: ['default'],
    tokens: [],
    editability: 'editable layout — frame width + centring; safe gutters are token-driven.',
    preview: 'registry-only',
    previewReason: 'a layout convention only — meaningful when it wraps the live app frame, not in isolation.',
  },
  {
    id: 'topbar',
    title: 'Topbar',
    purpose: 'Global chrome header for the non-session surfaces.',
    states: ['default'],
    tokens: [],
    editability: 'editable layout — sticky-bar geometry + safe top gutter.',
    preview: 'registry-only',
    previewReason: 'requires the live host routing that supplies header actions and the device footer.',
  },
  {
    id: 'chrome-button',
    title: 'Chrome button',
    purpose: 'Shared quiet transparent chrome button (nav / back / theme).',
    states: ['default', 'hover', 'pressed', 'focus-visible'],
    tokens: [],
    editability: 'editable presentation — quiet transparent chrome button base.',
    preview: 'registry-only',
    previewReason: 'a base class shared by nav/back/theme buttons; each needs its host action to preview.',
  },
  {
    id: 'theme-switcher',
    title: 'Theme switcher',
    purpose: 'Segmented light / dark / system theme selector (ToggleButton group).',
    states: ['default', 'selected'],
    tokens: [],
    editability: 'editable presentation — segmented selector; the light/dark/system values are the theme contract.',
    preview: 'registry-only',
    previewReason: 'a routed host control; the catalog has its own theme toggle instead.',
  },
  {
    id: 'back-button',
    title: 'Back button',
    purpose: 'Quiet back arrow, built on the shared chrome-button base.',
    states: ['default', 'hover', 'pressed'],
    tokens: [],
    editability: 'editable presentation — inherits the chrome-button base.',
    preview: 'registry-only',
    previewReason: 'needs a host navigation target to preview meaningfully.',
  },
  {
    id: 'home-view',
    title: 'Home view / session roster',
    purpose: 'Hero, session roster, device footer, push settings.',
    states: ['loading', 'empty', 'error', 'stale'],
    tokens: [],
    editability: 'editable layout + presentation; roster + freshness read the shared status vocabulary.',
    preview: 'registry-only',
    previewReason: 'requires the live session list + device authority the host supplies.',
  },
  {
    id: 'enrollment-view',
    title: 'Enrollment view',
    purpose: 'First-run device binding against the host authority.',
    states: ['idle', 'busy', 'authenticating', 'error'],
    tokens: [],
    editability: 'editable layout — full-frame centring + safe gutters.',
    preview: 'registry-only',
    previewReason: 'an authenticated, host-authorized surface — never shown in read-only tooling.',
  },
  {
    id: 'push-settings',
    title: 'Push settings',
    purpose: 'Device notification preferences.',
    states: ['loading', 'disabled', 'off', 'on'],
    tokens: [],
    editability: 'editable presentation over the shared switch/status seams.',
    preview: 'registry-only',
    previewReason: 'requires the push-config transport + device preference state.',
  },
  {
    id: 'empty-state',
    title: 'Empty state',
    purpose: 'Empty / unavailable list state for home and routed list roots.',
    states: ['empty', 'error'],
    tokens: [],
    editability: 'editable presentation — shared empty-state / inline-alert surfaces.',
    preview: 'registry-only',
    previewReason: 'a convention rendered inside list roots, each with host-bound copy.',
  },
  {
    id: 'freshness',
    title: 'Freshness / sync staleness',
    purpose: 'Sync staleness readout for home and routed roots.',
    states: ['ready', 'stale'],
    tokens: [],
    editability: 'editable presentation — the stale readout.',
    preview: 'registry-only',
    previewReason: 'needs live sync telemetry from the relay to render a real state.',
  },
  {
    id: 'status-pill',
    title: 'Status pill / connection phase',
    purpose: 'Connection-phase status pill; pulsing transitional phases and error.',
    states: ['live', 'pulsing', 'error'],
    tokens: [],
    editability: 'editable presentation; the announced phase copy is the frozen vocabulary.',
    preview: 'registry-only',
    previewReason: 'a live connection readout driven by the relay heartbeat.',
  },
  {
    id: 'session-state-icon',
    title: 'Session state icon',
    purpose: 'Per-session runtime glyph (idle · running).',
    states: ['idle', 'running'],
    tokens: [],
    editability: 'editable presentation — part of the shared status vocabulary.',
    preview: 'registry-only',
    previewReason: 'bound to per-session runtime state from the host.',
  },
  {
    id: 'transcript',
    title: 'Transcript',
    purpose: 'The virtualized transcript list, its live-edge controls, and the per-kind message blocks.',
    states: ['virtualized-list', 'live-edge', 'turn-actions', 'evidence-disclosure', 'block-delivery'],
    tokens: [],
    editability: 'editable presentation (blocks, list chrome); the delivery + redaction routing is guarded.',
    preview: 'registry-only',
    previewReason: 'the virtualized list needs a live transcript feed and socket-driven live edge.',
  },
  {
    id: 'plan-todo',
    title: 'Plan / todo checklist',
    purpose: 'The plan-block ✓/○ checklist inside transcript messages.',
    states: ['pending', 'done'],
    tokens: [],
    editability: 'editable presentation — per-state glyph and tint; the read-only plan is the frozen contract.',
    preview: 'registry-only',
    previewReason: 'a CSS plan-todo surface rendered inline by the transcript; no standalone component.',
  },
  {
    id: 'rich-content-cards',
    title: 'Rich content cards',
    purpose: 'The rich-content card group: command/output, code, text-artifact, prose and activity frames.',
    states: [
      'running', 'completed', 'failed', 'denied', 'cancelled', 'interrupted',
      'prose', 'code', 'text-artifact', 'fallback',
    ],
    tokens: [],
    editability: 'editable presentation per card; the block-kind dispatch + redaction handoff are guarded.',
    preview: 'live',
  },
  {
    id: 'composer',
    title: 'Composer',
    purpose: 'The input island: send / steer / stop morphing disc and the composer toolset.',
    states: ['send', 'steer', 'stop', 'stopping', 'sending-inhibit'],
    tokens: [],
    editability: 'editable presentation + tokens; the send/steer/stop state machine is the guarded seam.',
    preview: 'registry-only',
    previewReason: 'the morphing disc needs a live submission + socket state (demoSocket only keeps the read model).',
  },
  {
    id: 'session-header',
    title: 'Session header',
    purpose: 'In-session quiet header (back · model · overflow).',
    states: ['default'],
    tokens: [],
    editability: 'editable layout — grid geometry + safe top gutter.',
    preview: 'registry-only',
    previewReason: 'host-backed header actions (back, model sheet, overflow) with live session identity.',
  },
  {
    id: 'slash-autocomplete',
    title: 'Slash autocomplete',
    purpose: 'The inline autocomplete card and the command palette it shares.',
    states: ['loading', 'ready-empty', 'ready', 'stale', 'stale-offline'],
    tokens: ['--slash-*'],
    editability: 'editable presentation + tokens; the keyboard nav + command dispatch are guarded.',
    preview: 'registry-only',
    previewReason: 'needs the host command catalog and slash-trigger state from the live session.',
  },
  {
    id: 'model-effort-sheet',
    title: 'Model / effort sheet',
    purpose: 'The model picker + effort sheet overlay with drag, snap and exit choreography.',
    states: [
      'opening', 'open', 'dragging', 'snapping', 'exiting',
      'model-open', 'search-shown', 'terminal-blocked', 'effort-open',
      'pending-effort', 'effort-requested', 'effort-confirmed', 'read-only', 'disabled',
    ],
    tokens: ['--model-sheet-*'],
    editability: 'editable presentation + tokens (thin aliases to semantic roles); the exit/drag/snap choreography is guarded.',
    preview: 'registry-only',
    previewReason: 'a live overlay sheet needing runtime/effort state and the shared sheet provider.',
  },
  {
    id: 'overlay',
    title: 'Overlay (shared)',
    purpose: 'The shared overlay base every sheet, popover and modal is an instance of.',
    states: ['open', 'exiting', 'dragging', 'snapping'],
    tokens: [],
    editability: 'editable base presentation; the exit/drag overlay choreography is guarded.',
    preview: 'registry-only',
    previewReason: 'a base rendered by live overlays; previewing it standalone yields no real surface.',
  },
  {
    id: 'runtime-strip',
    title: 'Runtime strip',
    purpose: 'Host-backed runtime/mode readout + the model/effort control strip.',
    states: ['idle', 'running', 'plan', 'build', 'disabled'],
    tokens: [],
    editability: 'editable presentation; the runtime authority + mode state are the frozen contract.',
    preview: 'registry-only',
    previewReason: 'requires the live runtime binding and host authority for mode/effort control.',
  },
  {
    id: 'plan-mode',
    title: 'Plan mode controls',
    purpose: 'Persistent host-confirmed mode control: plan-mode button, menu, ready card, review sheet, leave sheet.',
    states: ['build', 'plan', 'open', 'confirmed', 'reviewing', 'leaving'],
    tokens: [],
    editability: 'editable presentation per control; the mode authority and atomic execute path are guarded.',
    preview: 'registry-only',
    previewReason: 'mode control mutates host authority and needs the live session; never opened in read-only tooling.',
  },
  {
    id: 'ask-question',
    title: 'Ask-question card',
    purpose: 'The one-use interactive request card with option select + free text.',
    states: ['presented', 'selecting', 'submitting', 'accepted', 'error', 'expired', 'superseded', 'delivery-unknown'],
    tokens: [],
    editability: 'editable presentation per state; the answer-submission ticket path is guarded.',
    preview: 'registry-only',
    previewReason: 'submission mutates the session and needs the answer-write boundary the read-only catalog must not open.',
  },
  {
    id: 'todos',
    title: 'Todos / pi plan panel',
    purpose: 'The read-only todo projection panel (pi’s plan) with progress hairline and grouped tasks.',
    states: ['grouped', 'all-done', 'empty', 'unsupported'],
    tokens: [],
    editability: 'editable presentation; the read-only projection (phone never mutates pi’s tasks) is the guarded contract.',
    preview: 'registry-only',
    previewReason: 'the projection arrives via a live sync envelope; the demo projection is not exported for a typed preview.',
  },
{
    id: 'artifact-viewer',
    title: 'Artifact viewer',
    purpose: 'The full-frame modal reader chrome: overlay, dialog, header, status, history and the privacy cover.',
    states: [
      'idle', 'loading', 'stalled', 'ready', 'empty', 'whitespace', 'offline', 'stale', 'denied',
      'expired', 'missing', 'revoked', 'conflict', 'corrupt', 'too-large', 'rate-limited', 'closed',
    ],
    tokens: [],
    editability: 'editable presentation; the privacy boundary + full resource reads are guarded.',
    preview: 'registry-only',
    previewReason: 'a modal reader host driven by the live artifact resource + viewer provider.',
  },
  {
    id: 'artifact-status',
    title: 'Artifact status',
    purpose: 'The polite status + assertive terminal-alert live regions for the reader.',
    states: ['idle', 'loading', 'stalled', 'ready', 'empty', 'offline', 'stale', 'denied', 'expired', 'missing', 'revoked', 'corrupt', 'too-large'],
    tokens: [],
    editability: 'frozen (@ds guardrail: do-not-edit) — the announced status copy per state is the a11y contract.',
    preview: 'live',
  },
  {
    id: 'artifact-card',
    title: 'Artifact card',
    purpose: 'The in-transcript read-only card that opens the diff viewer.',
    states: ['default'],
    tokens: ['--diff-*'],
    editability: 'editable presentation; the react-aria Button + open-to-viewer handoff are guarded.',
    preview: 'live',
  },
  {
    id: 'diff-preview',
    title: 'Diff preview',
    purpose: 'The unified-diff read well with per-line add / remove / context / find-match tints.',
    states: ['add', 'remove', 'context', 'find-match', 'wrapped'],
    tokens: ['--diff-*'],
    editability: 'editable presentation + tokens; fixed ltr / isolate-bidi / selectable are guarded.',
    preview: 'live',
  },
  {
    id: 'code-preview',
    title: 'Code preview',
    purpose: 'The highlighted code well with gutter and optional live-edge follow.',
    states: ['highlight', 'wrapped', 'follow-tail'],
    tokens: [],
    editability: 'editable presentation + tokens; the highlight worker and scroll/live-edge logic are guarded.',
    preview: 'live',
  },
  {
    id: 'text-preview',
    title: 'Text / markdown preview',
    purpose: 'The plain-text and markdown read wells (shared reading base, hygiene-bounded).',
    states: ['ready', 'empty', 'whitespace', 'markdown'],
    tokens: [],
    editability: 'editable presentation; chunked bounded rendering + Markdown sanitization are guarded.',
    preview: 'live',
  },
  {
    id: 'image-preview',
    title: 'Image preview',
    purpose: 'The sanitized image stage with zoom/pan and the state well interface.',
    states: ['processing', 'loading', 'ready', 'degraded', 'denied', 'corrupt', 'too-large', 'missing', 'revoked'],
    tokens: [],
    editability: 'editable presentation; the pan/zoom stage and the privacy cover are guarded.',
    preview: 'registry-only',
    previewReason: 'the image stage reads real artifact bytes + blob lifecycle; the placeholder is shown via the image-state surfaces only.',
  },
  {
    id: 'pdf-preview',
    title: 'PDF preview',
    purpose: 'The controlled PDF.js reader (bounded pages/canvases).',
    states: ['loading', 'ready', 'blocked', 'unsafe', 'too-large'],
    tokens: [],
    editability: 'editable presentation; the bounded PDF.js reader is the frozen contract.',
    preview: 'registry-only',
    previewReason: 'depends on the PDF.js runtime + worker bundle; kept out to keep the catalog build lean.',
  },
];

// ───────────────────────────────────────────────────────────────────
// 4. LIVE SURFACES AND LOOKUP
// ───────────────────────────────────────────────────────────────────

/** The distinct surfaces the catalog renders live, in presentation order. */
export const LIVE_SURFACE_IDS: readonly string[] = CATALOG_SURFACES.filter(
  (surface) => surface.preview === 'live',
).map((surface) => surface.id);

export function catalogSurfaceById(id: string): CatalogSurface | undefined {
  return CATALOG_SURFACES.find((surface) => surface.id === id);
}
