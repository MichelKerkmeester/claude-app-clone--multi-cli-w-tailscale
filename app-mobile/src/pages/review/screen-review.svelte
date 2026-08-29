<script module lang="ts">
  // This module holds the shared Screen Review types and helpers.
  export interface ReviewProps {
    readonly sessions: readonly { readonly id: string }[];
    readonly onBack: () => void;
    readonly focusId: string | null;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import type { ApprovalCardDto } from '@pi-remote/pi-rpc-protocol';
  import { loadApprovals, messageFrom, relativeTime, countdown } from '$shared/format/view-helpers.js';
  import { decideApproval, createAcceptEditsGrant } from '$shared/transport/relay.js';
  import Button from '$shared/primitives/button/button.svelte';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { sessions, onBack, focusId }: ReviewProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let approvals = $state<readonly ApprovalCardDto[]>([]);
  let pendingId = $state<string | null>(null);
  let grant = $state<{ readonly remainingActions: number; readonly expiresAt: string } | null>(null);
  let error = $state<string | null>(null);
  let now = $state(Date.now());

  // ───────────────────────────────────────────────────────────────────
  // 4. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const pending = $derived(approvals.filter((approval) => approval.status === 'pending'));

  // ───────────────────────────────────────────────────────────────────
  // 5. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  // Keep this effect synchronized with the state it observes.
  $effect(() => {
    const controller = new AbortController();
    void loadApprovals(sessions, controller.signal)
      .then((next) => {
        approvals = next;
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) error = messageFrom(cause);
      });
    const timer = window.setInterval(() => {
      now = Date.now();
      void loadApprovals(sessions)
        .then((next) => {
          approvals = next;
        })
        .catch(() => undefined);
    }, 1_000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  });

  // Keep this effect synchronized with the state it observes.
  $effect(() => {
    if (focusId !== null && approvals.some((approval) => approval.approvalId === focusId)) {
      document.getElementById(`approval-${focusId}`)?.scrollIntoView({ block: 'center' });
    }
  });

  // ───────────────────────────────────────────────────────────────────
  // 6. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  // Keep decide focused on its single responsibility.
  function decide(approval: ApprovalCardDto, decision: 'approve' | 'deny'): void {
    pendingId = approval.approvalId;
    error = null;
    void decideApproval(approval, decision)
      .then(() => loadApprovals(sessions).then((next) => {
        approvals = next;
      }))
      .catch((cause: unknown) => {
        error = messageFrom(cause);
      })
      .finally(() => {
        pendingId = null;
      });
  }
</script>

<!-- Component content -->
<!-- Review view -->
<!-- This surface: review--view — exact-action review list. States: empty · pending · expired · submitted · error. -->
<!-- Do not edit — approval decisioning + grant tracking — Not designer-editable. -->
<main class="review--view">
  <div class="session--toolbar">
<!-- Back button -->
    <!-- This surface: back-button — quiet back arrow. react-aria Button wiring guarded. -->
    <Button class="back-button" onclick={onBack}>
      Back to sessions
    </Button>
    <span class="review--count">{pending.length} awaiting</span>
  </div>
  <section class="review--heading">
    <p class="surface--eyebrow">Exact-action review</p>
    <h1>Decide with the full action in view</h1>
    <p>
      Each decision binds only the redacted tool input shown here. The host must still verify it
      before execution.
    </p>
  </section>
  {#if grant !== null}
    <div class="grant--banner">
      Accept-edits grant active · {grant.remainingActions} actions remain · expires{' '}
      {relativeTime(grant.expiresAt)}
    </div>
  {/if}
  {#if error !== null}
    <div class="inline-alert">{error}</div>
  {/if}
  <!-- Do not edit — sr-only live region announces decision state — Not designer-editable. -->
  <div class="sr-only" aria-live="polite" aria-atomic="true">
    {pendingId === null ? '' : 'Decision submitted. Verifying at host.'}
  </div>
  <section class="approval--list">
    {#if approvals.length === 0}
      <div class="empty--state">
        <span class="empty--icon" aria-hidden="true">
          ✓
        </span>
        <h3>No approvals</h3>
        <p>Protected actions appear here only after the host requests one.</p>
      </div>
    {:else}
      {#each approvals as approval (approval.approvalId)}
        {@const submitted = pendingId === approval.approvalId}
        {@const expired = Date.parse(approval.expiresAt) <= now}
        <article id={`approval-${approval.approvalId}`} class={`approval--card approval--${approval.status}`}>
          <header>
            <span>
              {approval.source === 'accept-edits' ? 'ACCEPT-EDITS LEASE' : 'PROTECTED ACTION'}
            </span>
            <time datetime={approval.expiresAt}>
              {expired ? 'Expired' : countdown(approval.expiresAt, now)}
            </time>
          </header>
          <div class="approval--tool">
            <span>Tool</span>
            <strong>{approval.tool}</strong>
          </div>
          <div class="approval--arguments">
            <span>Relay-redacted canonical input</span>
            <pre>{approval.canonicalArguments}</pre>
          </div>
          <div class="approval--digest">
            Digest {approval.digest.slice(0, 12)} / {approval.digest.slice(-8)}
          </div>
          {#if approval.status === 'pending' && !expired}
            <div class="approval--actions">
              <!-- Do not edit — deny / approve / grant onPress decisioning — Not designer-editable. -->
              <div class="approval--decision-group" role="group" aria-label="Single action approval">
                <Button class="deny-button" disabled={submitted} onclick={() => decide(approval, 'deny')}>
                  Deny
                </Button>
                <Button class="approve-button" disabled={submitted} onclick={() => decide(approval, 'approve')}>
                  {submitted ? 'Submitted, verifying' : 'Approve once'}
                </Button>
              </div>
              {#if ['edit', 'write'].includes(approval.tool)}
                <div class="approval--grant-group" role="group" aria-label="Standing approval grant">
                  <Button
                    class="grant--button"
                    disabled={submitted}
                    onclick={() => {
                      pendingId = approval.approvalId;
                      void createAcceptEditsGrant(approval, 3)
                        .then((created) => {
                          grant = {
                            remainingActions: created.remainingActions,
                            expiresAt: created.expiresAt,
                          };
                        })
                        .catch((cause: unknown) => {
                          error = messageFrom(cause);
                        })
                        .finally(() => {
                          pendingId = null;
                        });
                    }}
                  >
                    Accept next 3 edits
                  </Button>
                </div>
              {/if}
            </div>
          {:else if approval.status === 'approved'}
            <div class="approval--result result--verifying" role="status">
              Submitted, verifying at host
            </div>
          {:else}
            <div class={`approval--result result--${approval.status}`} role="status">
              {approval.status.replaceAll('-', ' ')}:{' '}
              {approval.reason ?? (expired ? 'lease-expired' : 'host-settled')}
            </div>
          {/if}
        </article>
      {/each}
    {/if}
  </section>
</main>

<!-- Review view -->
<!-- This surface: review--view — exact-action review list. Decomposed into this scoped block; approval--card and its
     descendants, approval--actions, and the result-* state variants are owned solely by this component so
     they move with it. The .back-button solo extension and the .approval--actions button / .deny-button /
     .grant--button child-primitive selectors use :global so Svelte scoping cannot drop them. The shared
     chrome-button base (.nav-button/.theme--option/.back-button + hover), the routed-frame scaffold
     (.review--view, shared with home/session/inbox), .review--heading + its h1/p (shared with inbox/hero/
     enrollment), .grant--banner (shared group with .inline-alert/.barrier-note), .session--toolbar and
     .review--count (shared with the Inbox view), .approval--list (shared with .attention--list), the
     .approval--card prefers-contrast/forced-colors border groups, the .approval--actions button ink-override
     group (shared with composer/enrollment/push), and .inline-alert / .surface--eyebrow / .empty--state /
     .empty--icon / .sr-only are shared by 2+ components and stay global in app.css. Values unchanged. -->
<style>
  /* This surface: routed-frame — shared page scaffold for home / session / review / inbox roots. */
  /* Editable seam: layout — page gutter + safe bottom inset shared by routed surfaces. */
  .review--view {
    padding: var(--space-8) var(--page-gutter) max(var(--space-16), env(safe-area-inset-bottom));
  }

  /* This surface: home-view — hero, session roster, device footer, push settings. */
  /* This state: loading · empty · error · stale — via shared empty--state, inline-alert and freshness surfaces. */
  .review--heading h1 {
    max-width: 13ch;
    margin: 0;
    color: var(--ink);
    font-size: clamp(2.85rem, 8vw, 5.75rem);
    font-weight: 620;
    letter-spacing: -0.04em;
    line-height: 0.98;
    text-wrap: balance;
  }

  /* This surface: back-button — quiet back arrow, built on the shared chrome-button base. */
  :global(.back-button) {
    position: relative;
    padding-inline-start: 1.65rem;
  }

  /* This slot: chevron */
  :global(.back-button::before) {
    position: absolute;
    inset-inline-start: 0.65rem;
    content: '←';
  }
  /* End of surface: back-button */

  /* This surface: review--heading — review surface intro (states below via approval--card / inline-alert). */
  /* This surface: inbox--heading — inbox surface intro (states: empty · error). */
  /* This slot: heading — surface title + description. */
  .review--heading {
    max-width: 58rem;
    padding-bottom: clamp(2.5rem, 7vw, 5rem);
  }

  /* Keep this rule aligned with its surrounding surface. */
  .review--heading h1 {
    max-width: 15ch;
    font-size: clamp(2.8rem, 7vw, 5.6rem);
  }

  /* Keep this rule aligned with its surrounding surface. */
  .review--heading > p:last-child {
    max-width: 43rem;
    margin: var(--space-6) 0 0;
    color: var(--ink-secondary);
    font-size: 1rem;
    line-height: 1.65;
  }

  /* This state: info — grant--banner (active accept-edits lease). */
  /* This state: error — inline-alert (surface error). */
  /* This state: stale — barrier-note (reconciliation / checking). */
  .grant--banner {
    margin-bottom: var(--space-4);
    padding: var(--space-4);
    border-radius: var(--radius-md);
    background: var(--accent-soft);
    color: var(--accent-ink);
    font-size: 0.8rem;
    font-weight: 650;
    line-height: 1.45;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .approval--list {
    display: grid;
    gap: var(--space-4);
  }

  /* Keep this rule aligned with its surrounding surface. */
  .approval--card {
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
  }

  /* Keep this rule aligned with its surrounding surface. */
  .approval--pending {
    border-color: color-mix(in oklch, var(--warning) 55%, var(--line));
    box-shadow: var(--shadow-raised);
  }

  /* Keep this rule aligned with its surrounding surface. */
  .approval--card > header,
  .approval--tool,
  .approval--arguments {
    display: flex;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-4) var(--space-6);
    border-bottom: 1px solid var(--line);
  }

  /* Keep this rule aligned with its surrounding surface. */
  .approval--card > header,
  .approval--tool > span,
  .approval--arguments > span,
  .approval--digest,
  .approval--result {
    color: var(--ink-muted);
    font-size: 0.7rem;
    font-weight: 680;
    line-height: 1.4;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .approval--card > header time {
    color: var(--warning);
    font-variant-numeric: tabular-nums;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .approval--tool strong {
    font-family: var(--font-mono);
    font-size: 0.92rem;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .approval--arguments {
    display: grid;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .approval--arguments pre {
    margin: 0;
    overflow: auto;
    color: var(--ink);
    font-family: var(--font-mono);
    font-size: 0.76rem;
    line-height: 1.65;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .approval--digest,
  .approval--result {
    padding: var(--space-3) var(--space-6);
    overflow-wrap: anywhere;
    font-family: var(--font-mono);
  }

  /* Keep this rule aligned with its surrounding surface. */
  .approval--actions {
    display: grid;
    gap: var(--space-4);
    padding: var(--space-4) var(--space-6) var(--space-6);
  }

  /* Keep this rule aligned with its surrounding surface. */
  .approval--decision-group {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-3);
  }

  /* Keep this rule aligned with its surrounding surface. */
  .approval--grant-group {
    display: grid;
    gap: var(--space-3);
    padding-block-start: var(--space-4);
    border-block-start: 1px solid var(--line-strong);
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.approval--actions button) {
    min-height: 3rem;
    padding-inline: var(--space-3);
    border: 0;
    border-radius: var(--radius-sm);
    background: var(--accent);
    color: var(--on-accent-text);
    font-size: 0.78rem;
    font-weight: 720;
    white-space: nowrap;
    cursor: pointer;
    transition:
      background-color var(--duration-fast) ease,
      transform var(--duration-fast) var(--ease-out);
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.approval--actions .approve-button[data-hovered]) {
    background: color-mix(in oklch, var(--accent) 75%, white);
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.approval--actions button[data-disabled]) {
    background: var(--surface-muted);
    color: var(--ink-muted);
    cursor: wait;
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.approval--actions .deny-button) {
    background: var(--danger-soft);
    color: var(--danger);
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.approval--actions .deny-button[data-hovered]) {
    background: var(--danger);
    color: var(--on-danger);
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.approval--actions .grant--button) {
    border: 1px solid var(--line-strong);
    background: var(--surface);
    color: var(--ink);
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.approval--actions .grant--button[data-hovered]) {
    background: var(--surface-muted);
  }

  /* Keep this rule aligned with its surrounding surface. */
  .result--approved,
  .result--consumed {
    color: var(--success);
  }

  /* Keep this rule aligned with its surrounding surface. */
  .result--verifying {
    color: var(--warning);
    animation: signal-pulse 1.4s ease-in-out infinite;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .result--denied,
  .result--expired,
  .result--revoked,
  .result--failed {
    color: var(--danger);
  }

  @media (max-width: 39rem) {
    /* Keep this rule aligned with its surrounding surface. */
    .review--view {
      padding-top: var(--space-6);
    }

    /* Keep this rule aligned with its surrounding surface. */
    .approval--card > header,
    .approval--tool {
      align-items: flex-start;
      flex-direction: column;
    }

    /* Keep this rule aligned with its surrounding surface. */
    .approval--decision-group {
      grid-template-columns: 1fr;
    }
  }

  /* Editable seam: layout — safe inline gutters for the routed surfaces. */
  .review--view {
    padding-inline-start: max(var(--page-gutter), env(safe-area-inset-left, 0px));
    padding-inline-end: max(var(--page-gutter), env(safe-area-inset-right, 0px));
  }

  /* End of surface: review--view */
</style>
