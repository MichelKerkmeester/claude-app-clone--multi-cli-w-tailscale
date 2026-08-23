<script module lang="ts">
  import type { AttentionItemDto } from '@pi-remote/pi-rpc-protocol';
  import { openAttentionHint } from '$shared/format/attention.js';

  export interface AttentionInboxProps {
    readonly onBack: () => void;
    readonly onOpen: (resolution: Awaited<ReturnType<typeof openAttentionHint>>) => void;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { onMount } from 'svelte';
  import { fetchAttention } from '$shared/format/attention.js';
  import { attentionIcon, attentionLabel, messageFrom, relativeTime } from '$shared/format/view-helpers.js';
  import Button from '$shared/primitives/button/button.svelte';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { onBack, onOpen }: AttentionInboxProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let items = $state<readonly AttentionItemDto[]>([]);
  let error = $state<string | null>(null);
  let opening = $state<string | null>(null);

  // @ds guardrail: inbox fetch + open handlers — not designer-editable.
  onMount(() => {
    const controller = new AbortController();
    void fetchAttention(controller.signal)
      .then((result) => {
        items = result;
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) error = messageFrom(cause);
      });
    return () => controller.abort();
  });

  // ───────────────────────────────────────────────────────────────────
  // 4. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  function openItem(item: AttentionItemDto): void {
    opening = item.lookupId;
    error = null;
    void openAttentionHint(item.lookupId)
      .then(onOpen)
      .catch((cause: unknown) => {
        error = messageFrom(cause);
      })
      .finally(() => {
        opening = null;
      });
  }
</script>

<!-- @ds surface: inbox-view — attention signals. States: empty · error. -->
<!-- @ds guardrail: inbox fetch + open handlers — not designer-editable. -->
<main class="inbox-view">
  <div class="session-toolbar">
    <!-- @ds surface: back-button — quiet back arrow. react-aria Button wiring guarded. -->
    <Button class="back-button" onclick={onBack}>
      Back to sessions
    </Button>
    <span class="review-count">{items.length} signals</span>
  </div>
  <section class="inbox-heading">
    <p class="surface-kicker">Attention inbox</p>
    <h1>Only what needs you</h1>
    <p>
      Signals carry no session content. Opening one reauthenticates and fetches current relay
      state.
    </p>
  </section>
  {#if error !== null}
    <div class="inline-alert">{error}</div>
  {/if}
  <section class="attention-list" aria-live="polite">
    {#if items.length === 0}
      <div class="empty-state">
        <span class="empty-glyph" aria-hidden="true">✓</span>
        <h3>No attention needed</h3>
        <p>This inbox remains available even when notifications are denied.</p>
      </div>
    {:else}
      {#each items as item (item.lookupId)}
        <Button
          class={`attention-card attention-${item.attentionClass}`}
          disabled={opening === item.lookupId}
          onclick={() => openItem(item)}
        >
          <span class="attention-icon" aria-hidden="true">
            {attentionIcon(item.attentionClass)}
          </span>
          <span>{attentionLabel(item.attentionClass)}</span>
          <time datetime={item.occurredAt}>{relativeTime(item.occurredAt)}</time>
          <strong>
            {opening === item.lookupId ? 'Reauthenticating' : 'Open current state'}
          </strong>
        </Button>
      {/each}
    {/if}
  </section>
</main>

<!-- @ds surface: inbox-view — attention signals. Decomposed into this scoped block; inbox-heading,
     attention-list and attention-icon are owned solely by this component so they move with it.
     .inbox-heading h1 carries the full merged declaration set from the shared hero/review/inbox/
     enrollment h1 group plus the review/inbox h1 override group;
     the .enrollment-card h1 half of the first group is owned by Enrollment.svelte and is not
     reproduced here. .attention-card and its .attention-{needs_input,finished,error} state
     variants live on the Button primitive, so the original top-level selectors are reproduced with
     :global(...) and their directly-rendered span/time/strong descendants stay scoped. .inbox-view
     (shared page-scaffold group with home/session/review at 479-484, 7003-7008, 7532-7538),
     .attention-card inside the prefers-contrast / forced-colors shared groups (7455, 7483),
     .session-toolbar / .back-button / .review-count (shared with Review), .inline-alert (composer),
     .surface-kicker (many), and .empty-state / .empty-glyph (Review/Home) are shared by 2+
     components and stay global in app.css. Values unchanged. -->
<style>
  /* @ds surface: inbox-heading — inbox surface intro (states: empty · error). */
  /* @ds slot: heading — surface title + description. */
  .inbox-heading {
    max-width: 58rem;
    padding-bottom: clamp(2.5rem, 7vw, 5rem);
  }

  .inbox-heading h1 {
    max-width: 15ch;
    margin: 0;
    color: var(--ink);
    font-size: clamp(2.8rem, 7vw, 5.6rem);
    font-weight: 620;
    letter-spacing: -0.04em;
    line-height: 0.98;
    text-wrap: balance;
  }

  .inbox-heading > p:last-child {
    max-width: 43rem;
    margin: var(--space-6) 0 0;
    color: var(--ink-secondary);
    font-size: 1rem;
    line-height: 1.65;
  }

  .attention-list {
    display: grid;
    gap: var(--space-4);
  }

  .attention-icon {
    display: grid;
    width: 2.4rem;
    height: 2.4rem;
    place-items: center;
    border-radius: 50%;
    background: var(--accent-soft);
    color: var(--accent-ink);
    font-weight: 750;
  }

  :global(.attention-card) {
    display: grid;
    grid-template-columns: 2.5rem 1fr auto;
    align-items: center;
    gap: var(--space-3);
    min-height: 5.5rem;
    padding: var(--space-4);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
    color: var(--ink);
    text-align: start;
    cursor: pointer;
    transition:
      border-color var(--duration-fast) ease,
      background-color var(--duration-fast) ease;
  }

  :global(.attention-card[data-hovered]) {
    border-color: var(--line-strong);
    background: var(--surface-raised);
  }

  :global(.attention-card > span:not(.attention-icon)) {
    font-size: 0.9rem;
    font-weight: 700;
  }

  :global(.attention-card time) {
    color: var(--ink-muted);
    font-size: 0.7rem;
    font-weight: 600;
  }

  :global(.attention-card strong) {
    grid-column: 2 / -1;
    color: var(--ink-secondary);
    font-size: 0.78rem;
    font-weight: 600;
  }

  :global(.attention-needs_input) .attention-icon {
    background: var(--warning-soft);
    color: var(--warning);
  }

  :global(.attention-finished) .attention-icon {
    background: var(--success-soft);
    color: var(--success);
  }

  :global(.attention-error) .attention-icon {
    background: var(--danger-soft);
    color: var(--danger);
  }

  @media (max-width: 39rem) {
    :global(.attention-card) {
      grid-template-columns: 2.5rem 1fr;
    }

    :global(.attention-card time) {
      grid-column: 2;
    }

    :global(.attention-card strong) {
      grid-column: 2;
    }
  }
</style>
