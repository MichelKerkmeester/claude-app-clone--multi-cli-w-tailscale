<script module lang="ts">
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

  import './screen-review.css';

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

  $effect(() => {
    if (focusId !== null && approvals.some((approval) => approval.approvalId === focusId)) {
      document.getElementById(`approval-${focusId}`)?.scrollIntoView({ block: 'center' });
    }
  });

  // ───────────────────────────────────────────────────────────────────
  // 6. HANDLERS
  // ───────────────────────────────────────────────────────────────────

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

<!-- @ds surface: review-view — exact-action review list. States: empty · pending · expired · submitted · error. -->
<!-- @ds guardrail: approval decisioning + grant tracking — Not designer-editable. -->
<main class="review-view">
  <div class="session-toolbar">
    <!-- @ds surface: back-button — quiet back arrow. react-aria Button wiring guarded. -->
    <Button class="back-button" onclick={onBack}>
      Back to sessions
    </Button>
    <span class="review-count">{pending.length} awaiting</span>
  </div>
  <section class="review-heading">
    <p class="surface-kicker">Exact-action review</p>
    <h1>Decide with the full action in view</h1>
    <p>
      Each decision binds only the redacted tool input shown here. The host must still verify it
      before execution.
    </p>
  </section>
  {#if grant !== null}
    <div class="grant-banner">
      Accept-edits grant active · {grant.remainingActions} actions remain · expires{' '}
      {relativeTime(grant.expiresAt)}
    </div>
  {/if}
  {#if error !== null}
    <div class="inline-alert">{error}</div>
  {/if}
  <!-- @ds guardrail: sr-only live region announces decision state — Not designer-editable. -->
  <div class="sr-only" aria-live="polite" aria-atomic="true">
    {pendingId === null ? '' : 'Decision submitted. Verifying at host.'}
  </div>
  <section class="approval-list">
    {#if approvals.length === 0}
      <div class="empty-state">
        <span class="empty-glyph" aria-hidden="true">
          ✓
        </span>
        <h3>No approvals</h3>
        <p>Protected actions appear here only after the host requests one.</p>
      </div>
    {:else}
      {#each approvals as approval (approval.approvalId)}
        {@const submitted = pendingId === approval.approvalId}
        {@const expired = Date.parse(approval.expiresAt) <= now}
        <article id={`approval-${approval.approvalId}`} class={`approval-card approval-${approval.status}`}>
          <header>
            <span>
              {approval.source === 'accept-edits' ? 'ACCEPT-EDITS LEASE' : 'PROTECTED ACTION'}
            </span>
            <time datetime={approval.expiresAt}>
              {expired ? 'Expired' : countdown(approval.expiresAt, now)}
            </time>
          </header>
          <div class="approval-tool">
            <span>Tool</span>
            <strong>{approval.tool}</strong>
          </div>
          <div class="approval-arguments">
            <span>Relay-redacted canonical input</span>
            <pre>{approval.canonicalArguments}</pre>
          </div>
          <div class="approval-digest">
            Digest {approval.digest.slice(0, 12)} / {approval.digest.slice(-8)}
          </div>
          {#if approval.status === 'pending' && !expired}
            <div class="approval-actions">
              <!-- @ds guardrail: deny / approve / grant onPress decisioning — Not designer-editable. -->
              <div class="approval-decision-group" role="group" aria-label="Single action approval">
                <Button class="deny-button" disabled={submitted} onclick={() => decide(approval, 'deny')}>
                  Deny
                </Button>
                <Button disabled={submitted} onclick={() => decide(approval, 'approve')}>
                  {submitted ? 'Submitted, verifying' : 'Approve once'}
                </Button>
              </div>
              {#if ['edit', 'write'].includes(approval.tool)}
                <div class="approval-grant-group" role="group" aria-label="Standing approval grant">
                  <Button
                    class="grant-button"
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
            <div class="approval-result result-verifying" role="status">
              Submitted, verifying at host
            </div>
          {:else}
            <div class={`approval-result result-${approval.status}`} role="status">
              {approval.status.replaceAll('-', ' ')}:{' '}
              {approval.reason ?? (expired ? 'lease-expired' : 'host-settled')}
            </div>
          {/if}
        </article>
      {/each}
    {/if}
  </section>
</main>

<!-- @ds surface: review-view — exact-action review list. Decomposed into this co-located CSS file; approval-card and its
     descendants, approval-actions, and the result-* state variants are owned solely by this component so
     they move with it. The .back-button solo extension and the .approval-actions button / .deny-button /
     .grant-button child-primitive selectors use :global so Svelte scoping cannot drop them. The shared
     chrome-button base (.nav-button/.theme-option/.back-button + hover), the routed-frame scaffold
     (.review-view, shared with home/session/inbox), .review-heading + its h1/p (shared with inbox/hero/
     enrollment), .grant-banner (shared group with .inline-alert/.barrier-note), .session-toolbar and
     .review-count (shared with the Inbox view), .approval-list (shared with .attention-list), the
     .approval-card prefers-contrast/forced-colors border groups, the .approval-actions button ink-override
     group (shared with composer/enrollment/push), and .inline-alert / .surface-kicker / .empty-state /
     .empty-glyph / .sr-only are shared by 2+ components and stay global in app.css. Values unchanged. -->
