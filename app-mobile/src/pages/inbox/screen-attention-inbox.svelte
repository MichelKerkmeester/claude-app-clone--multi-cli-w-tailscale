<script module lang="ts">
  // MODULE: ATTENTION INBOX SCREEN
  // This module holds the shared Screen Attention Inbox types and helpers.
  import type { AttentionItemDto } from '@pi-remote/pi-rpc-protocol';
  import type { InboxEventStream } from '$shared/format/inbox-timeline.js';
  import { openAttentionHint } from '$shared/format/attention.js';

  export type AttentionApprovalDecision = 'approve' | 'deny';

  export interface AttentionApprovalTicket {
    readonly lookupId: string;
    readonly ticketId: string;
    readonly status: 'blocked' | 'answered' | 'expired' | 'superseded';
  }

  export function isAttentionTicketBlocked(
    ticket: AttentionApprovalTicket | undefined,
  ): boolean {
    return ticket?.status === 'blocked';
  }

  export interface AttentionInboxProps {
    readonly onBack: () => void;
    readonly onOpen: (resolution: Awaited<ReturnType<typeof openAttentionHint>>) => void;
    readonly eventStream?: InboxEventStream;
    readonly approvalTickets?: readonly AttentionApprovalTicket[];
    readonly isTicketStillBlocked?: (
      ticket: AttentionApprovalTicket,
    ) => boolean | Promise<boolean>;
    readonly onInlineDecision?: (
      ticket: AttentionApprovalTicket,
      decision: AttentionApprovalDecision,
    ) => void | Promise<void>;
    readonly onBulkAcknowledge?: (lookupIds: readonly string[]) => void | Promise<void>;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { onMount } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import { buildInboxTimeline } from '$shared/format/inbox-timeline.js';
  import {
    countAttentionItems,
    fetchAttention,
    visibleAttentionItems,
  } from '$shared/format/attention.js';
  import { attentionIcon, attentionLabel, messageFrom, relativeTime } from '$shared/format/view-helpers.js';
  import {
    markInboxItemRead,
    readInboxReadState,
    writeInboxReadState,
    type InboxReadState,
  } from '$shared/state/inbox-read-state.js';
  import Button from '$shared/primitives/button/button.svelte';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let {
    onBack,
    onOpen,
    eventStream,
    approvalTickets,
    isTicketStillBlocked,
    onInlineDecision,
    onBulkAcknowledge,
  }: AttentionInboxProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  const EMPTY_READ_IDS: ReadonlySet<string> = new Set();
  let items = $state<readonly AttentionItemDto[]>([]);
  let error = $state<string | null>(null);
  let opening = $state<string | null>(null);
  let pendingInlineDecision = $state<string | null>(null);
  let selectionMode = $state(false);
  let selectedLookupIds = $state<ReadonlySet<string>>(new Set());
  let bulkPending = $state(false);
  let inboxReadState = $state<InboxReadState>(readInboxReadState());
  const localReadIds = $derived(
    inboxReadState.storageReadable ? inboxReadState.readIds : EMPTY_READ_IDS,
  );
  const visibleItems = $derived(visibleAttentionItems(items, localReadIds));
  const timelineItems = $derived(
    eventStream === undefined ? [] : buildInboxTimeline(eventStream),
  );
  const signalCount = $derived(
    timelineItems.length > 0
      ? timelineItems.length
      : countAttentionItems(items, localReadIds),
  );
  const inlineActionsAvailable = $derived(
    approvalTickets !== undefined &&
      isTicketStillBlocked !== undefined &&
      onInlineDecision !== undefined,
  );
  const bulkActionsAvailable = $derived(
    onBulkAcknowledge !== undefined && timelineItems.length === 0,
  );
  const selectedCount = $derived(selectedLookupIds.size);

  // Do not edit — inbox fetch + open handlers — Not designer-editable.
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

  // Reading hides a signal on this device without changing the host item.
  function markItemRead(lookupId: string): void {
    if (!inboxReadState.storageReadable) return;
    const nextReadIds = markInboxItemRead(inboxReadState.readIds, lookupId);
    if (!writeInboxReadState(nextReadIds)) return;
    inboxReadState = { readIds: nextReadIds, storageReadable: true };
  }

  function ticketForItem(lookupId: string): AttentionApprovalTicket | undefined {
    if (!inlineActionsAvailable) return undefined;
    return approvalTickets?.find((ticket) => ticket.lookupId === lookupId && isAttentionTicketBlocked(ticket));
  }

  // Keep inline decisions behind a fresh host-side blocked check.
  function decideInline(lookupId: string, decision: AttentionApprovalDecision): void {
    const ticket = ticketForItem(lookupId);
    const checkBlocked = isTicketStillBlocked;
    const decide = onInlineDecision;
    if (
      ticket === undefined ||
      checkBlocked === undefined ||
      decide === undefined ||
      pendingInlineDecision !== null
    ) {
      return;
    }

    pendingInlineDecision = lookupId;
    error = null;
    void Promise.resolve()
      .then(() => checkBlocked(ticket))
      .then((stillBlocked) => {
        if (!stillBlocked || !isAttentionTicketBlocked(ticket)) return;
        return decide(ticket, decision);
      })
      .catch((cause: unknown) => {
        error = messageFrom(cause);
      })
      .finally(() => {
        pendingInlineDecision = null;
      });
  }

  function toggleSelectionMode(): void {
    if (!bulkActionsAvailable) return;
    selectionMode = !selectionMode;
    if (!selectionMode) selectedLookupIds = new SvelteSet();
  }

  function toggleSelected(lookupId: string): void {
    if (!bulkActionsAvailable || !selectionMode) return;
    const next = new SvelteSet(selectedLookupIds);
    if (next.has(lookupId)) next.delete(lookupId);
    else next.add(lookupId);
    selectedLookupIds = next;
  }

  function clearSelection(): void {
    selectedLookupIds = new SvelteSet();
  }

  // Keep bulk acknowledgement host-authoritative; this never marks local items read.
  function acknowledgeSelected(): void {
    const acknowledge = onBulkAcknowledge;
    if (acknowledge === undefined || selectedCount === 0 || bulkPending) return;
    const lookupIds = visibleItems
      .map((item) => item.lookupId)
      .filter((lookupId) => selectedLookupIds.has(lookupId));
    if (lookupIds.length === 0) return;

    bulkPending = true;
    error = null;
    void Promise.resolve()
      .then(() => acknowledge(lookupIds))
      .catch((cause: unknown) => {
        error = messageFrom(cause);
      })
      .finally(() => {
        bulkPending = false;
      });
  }

  // Keep open item focused on its single responsibility.
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

<!-- Component content -->
<!-- Inbox view -->
<!-- This surface: inbox--view — attention signals. States: empty · error. -->
<!-- Do not edit — inbox fetch + open handlers — Not designer-editable. -->
<main class="inbox--view">
  <div class="session--toolbar">
<!-- Back button -->
    <!-- This surface: back-button — quiet back arrow. react-aria Button wiring guarded. -->
    <Button class="back-button" onclick={onBack}>
      Back to sessions
    </Button>
    <span class="review--count">{signalCount} signals</span>
    {#if bulkActionsAvailable && visibleItems.length > 0}
      <Button class="attention--select-toggle" onclick={toggleSelectionMode}>
        {selectionMode ? 'Exit select mode' : 'Select signals'}
      </Button>
    {/if}
  </div>
  <section class="inbox--heading">
    <p class="surface--eyebrow">Attention inbox</p>
    <h1>Only what needs you</h1>
    <p>
      Signals carry no session content. Opening one reauthenticates and fetches current relay
      state.
    </p>
  </section>
  {#if error !== null}
    <div class="inline-alert">{error}</div>
  {/if}
  {#if bulkActionsAvailable && selectionMode}
    <div class="attention--bulk-bar" role="toolbar" aria-label="Bulk inbox actions">
      <span>{selectedCount} selected</span>
      <Button class="attention--clear-selection" onclick={clearSelection}>
        Clear selection
      </Button>
      <Button
        class="attention--bulk-acknowledge"
        disabled={selectedCount === 0 || bulkPending}
        onclick={acknowledgeSelected}
      >
        {bulkPending ? 'Acknowledging selected' : 'Acknowledge selected'}
      </Button>
    </div>
  {/if}
  {#if timelineItems.length > 0}
    <section class="inbox--timeline" aria-label="Inbox timeline" data-inbox-timeline="true">
      {#each timelineItems as event (event.eventId)}
        <article
          class="inbox--timeline-card"
          data-inbox-event={event.eventId}
          data-session-id={event.sessionId}
        >
          <header>
            <span>{event.kind}</span>
            <span>Session {event.sessionId}</span>
          </header>
          <h3>{event.title}</h3>
          <p>{event.content}</p>
          <time datetime={new Date(event.occurredAt).toISOString()}>
            {relativeTime(new Date(event.occurredAt).toISOString())}
          </time>
          {#if event.resolved}
            <span class="inbox--timeline-status">Resolved</span>
          {/if}
        </article>
      {/each}
    </section>
  {:else}
    <section class="attention--list" aria-live="polite">
      {#if visibleItems.length === 0}
        <div class="empty--state">
          <span class="empty--icon" aria-hidden="true">✓</span>
          <h3>No attention needed</h3>
          <p>This inbox remains available even when notifications are denied.</p>
        </div>
      {:else}
        {#each visibleItems as item (item.lookupId)}
          {@const inlineTicket = ticketForItem(item.lookupId)}
          <article
            class={`attention--card attention--${item.attentionClass}${selectionMode ? ' is-selecting' : ''}`}
          >
            {#if bulkActionsAvailable && selectionMode}
              <input
                class="attention--selection"
                type="checkbox"
                aria-label={`Select ${item.lookupId}`}
                checked={selectedLookupIds.has(item.lookupId)}
                onchange={() => toggleSelected(item.lookupId)}
              />
            {/if}
            <span class="attention--icon" aria-hidden="true">
              {attentionIcon(item.attentionClass)}
            </span>
            <span>{attentionLabel(item.attentionClass)}</span>
            <time datetime={item.occurredAt}>{relativeTime(item.occurredAt)}</time>
            <strong>
              {opening === item.lookupId ? 'Reauthenticating' : 'Open current state'}
            </strong>
            <div class="attention--actions">
              <Button
                class="attention--open"
                disabled={opening === item.lookupId}
                onclick={() => openItem(item)}
              >
                {opening === item.lookupId ? 'Reauthenticating' : 'Open current state'}
              </Button>
              <Button class="attention--read" onclick={() => markItemRead(item.lookupId)}>
                Mark as read
              </Button>
              {#if inlineTicket !== undefined}
                <div class="attention--approval-actions" role="group" aria-label="Single action approval">
                  <Button
                    class="attention--deny"
                    disabled={pendingInlineDecision === item.lookupId}
                    onclick={() => decideInline(item.lookupId, 'deny')}
                  >
                    Deny
                  </Button>
                  <Button
                    disabled={pendingInlineDecision === item.lookupId}
                    onclick={() => decideInline(item.lookupId, 'approve')}
                  >
                    {pendingInlineDecision === item.lookupId ? 'Submitted, verifying' : 'Approve once'}
                  </Button>
                </div>
              {/if}
            </div>
          </article>
        {/each}
      {/if}
    </section>
  {/if}
</main>

<!-- Inbox view -->
<!-- This surface: inbox--view — attention signals. Decomposed into this scoped block; inbox--heading,
     attention--list and attention--icon are owned solely by this component so they move with it.
     .inbox--heading h1 carries the full merged declaration set from the shared hero/review/inbox/
     enrollment h1 group plus the review/inbox h1 override group;
     the .enrollment--card h1 half of the first group is owned by Enrollment.svelte and is not
     reproduced here. .attention--card and its .attention-{needs_input,finished,error} state
     variants wrap the Button actions, so the shared selectors stay global while the directly-rendered
     span/time/strong descendants stay scoped. .inbox--view
     (shared page-scaffold group with home/session/review at 479-484, 7003-7008, 7532-7538),
     .attention--card inside the prefers-contrast / forced-colors shared groups (7455, 7483),
     .session--toolbar / .back-button / .review--count (shared with Review), .inline-alert (composer),
     .surface--eyebrow (many), and .empty--state / .empty--icon (Review/Home) are shared by 2+
     components and stay global in app.css. Values unchanged. -->
<style>
  /* This surface: routed-frame — shared page scaffold for home / session / review / inbox roots. */
  /* Editable seam: layout — page gutter + safe bottom inset shared by routed surfaces. */
  .inbox--view {
    padding: var(--space-8) var(--page-gutter) max(var(--space-16), env(safe-area-inset-bottom));
  }

  /* This surface: inbox--heading — inbox surface intro (states: empty · error). */
  /* This slot: heading — surface title + description. */
  .inbox--heading {
    max-width: 58rem;
    padding-bottom: clamp(2.5rem, 7vw, 5rem);
  }

  /* Keep this rule aligned with its surrounding surface. */
  .inbox--heading h1 {
    max-width: 15ch;
    margin: 0;
    color: var(--ink);
    font-size: clamp(2.8rem, 7vw, 5.6rem);
    font-weight: 620;
    letter-spacing: -0.04em;
    line-height: 0.98;
    text-wrap: balance;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .inbox--heading > p:last-child {
    max-width: 43rem;
    margin: var(--space-6) 0 0;
    color: var(--ink-secondary);
    font-size: 1rem;
    line-height: 1.65;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .attention--list {
    display: grid;
    gap: var(--space-4);
  }

  /* Keep this rule aligned with its surrounding surface. */
  .attention--icon {
    display: grid;
    width: 2.4rem;
    height: 2.4rem;
    place-items: center;
    border-radius: 50%;
    background: var(--accent-soft);
    color: var(--accent-ink);
    font-weight: 750;
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.attention--card) {
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

  /* Keep this rule aligned with its surrounding surface. */
  :global(.attention--card[data-hovered]) {
    border-color: var(--line-strong);
    background: var(--surface-raised);
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.attention--card > span:not(.attention--icon)) {
    font-size: 0.9rem;
    font-weight: 700;
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.attention--card time) {
    color: var(--ink-muted);
    font-size: 0.7rem;
    font-weight: 600;
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.attention--card strong) {
    grid-column: 2 / -1;
    color: var(--ink-secondary);
    font-size: 0.78rem;
    font-weight: 600;
  }

  /* Keep local read and host-opening actions distinct without changing host state. */
  .attention--actions {
    grid-column: 2 / -1;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  /* Keep both actions usable at touch size while retaining the inbox surface treatment. */
  :global(.attention--actions button) {
    min-height: 2.75rem;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--ink);
    font: inherit;
    font-size: 0.78rem;
    font-weight: 650;
  }

  /* Keep the device-only action visually quieter than opening relay state. */
  :global(.attention--read) {
    color: var(--ink-secondary);
  }

  /* This surface: inbox--approval-actions — inline exact-action decisions. */
  .attention--approval-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    flex-basis: 100%;
    gap: var(--space-2);
    padding-block-start: var(--space-2);
  }

  /* Keep approve and deny controls usable at touch size. */
  :global(.attention--approval-actions button) {
    min-height: 3rem;
    background: var(--accent);
    color: white;
    font-weight: 720;
  }

  /* Keep denial visually distinct from an approval decision. */
  :global(.attention--approval-actions .attention--deny) {
    background: var(--danger-soft);
    color: var(--danger);
  }

  /* This surface: inbox--timeline — host-published cross-session event history. */
  .inbox--timeline {
    display: grid;
    gap: var(--space-4);
  }

  /* Keep each host event readable without merging it into the snapshot card shape. */
  .inbox--timeline-card {
    display: grid;
    gap: var(--space-2);
    padding: var(--space-4);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
    color: var(--ink);
  }

  /* Keep event identity and session provenance quiet but visible. */
  .inbox--timeline-card > header {
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
    color: var(--ink-muted);
    font-size: 0.7rem;
    font-weight: 680;
  }

  /* Keep the host-provided event title prominent in the timeline. */
  .inbox--timeline-card h3 {
    margin: 0;
    font-size: 1rem;
  }

  /* Keep event content readable while preserving exactly what the host supplied. */
  .inbox--timeline-card p {
    margin: 0;
    color: var(--ink-secondary);
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  /* Keep event time and resolved state distinguishable from event content. */
  .inbox--timeline-card time,
  .inbox--timeline-status {
    color: var(--ink-muted);
    font-size: 0.7rem;
    font-weight: 650;
  }

  /* This surface: attention--bulk-bar — host-capability-gated selection controls. */
  .attention--bulk-bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
    padding: var(--space-3);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-md);
    background: var(--surface-raised);
  }

  /* Keep the selection toggle compact beside the existing inbox count. */
  :global(.attention--select-toggle) {
    margin-inline-start: auto;
  }

  /* Keep selection controls visible while preserving the card's existing grid. */
  :global(.attention--selection) {
    min-width: 2.75rem;
    min-height: 2.75rem;
    accent-color: var(--accent);
  }

  /* Add a selection column only while multi-select mode is active. */
  :global(.attention--card.is-selecting) {
    grid-template-columns: 2.75rem 2.5rem 1fr auto;
  }

  /* Keep bulk actions usable at touch size. */
  :global(.attention--bulk-bar button) {
    min-height: 2.75rem;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--ink);
    font: inherit;
    font-size: 0.78rem;
    font-weight: 650;
  }

  /* Keep an unavailable selection from appearing actionable. */
  :global(.attention--bulk-bar button:disabled) {
    cursor: default;
    opacity: 0.58;
  }

  /* Keep card metadata aligned with the extra selection column. */
  :global(.attention--card.is-selecting > strong),
  :global(.attention--card.is-selecting > .attention--actions) {
    grid-column: 3 / -1;
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.attention--needs_input) .attention--icon {
    background: var(--warning-soft);
    color: var(--warning);
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.attention--finished) .attention--icon {
    background: var(--success-soft);
    color: var(--success);
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.attention--error) .attention--icon {
    background: var(--danger-soft);
    color: var(--danger);
  }

  @media (max-width: 39rem) {
    /* Keep this rule aligned with its surrounding surface. */
    .inbox--view {
      padding-top: var(--space-6);
    }

    /* Keep this rule aligned with its surrounding surface. */
    :global(.attention--card) {
      grid-template-columns: 2.5rem 1fr;
    }

    /* Keep this rule aligned with its surrounding surface. */
    :global(.attention--card time) {
      grid-column: 2;
    }

    /* Keep this rule aligned with its surrounding surface. */
    :global(.attention--card strong) {
      grid-column: 2;
    }

    /* Keep selecting cards aligned after the mobile grid collapses. */
    :global(.attention--card.is-selecting) {
      grid-template-columns: 2.75rem 2.5rem 1fr;
    }

    /* Keep selecting card content in the third mobile column. */
    :global(.attention--card.is-selecting time),
    :global(.attention--card.is-selecting > strong),
    :global(.attention--card.is-selecting > .attention--actions) {
      grid-column: 3;
    }
  }

  /* Editable seam: layout — safe inline gutters for the routed surfaces. */
  .inbox--view {
    padding-inline-start: max(var(--page-gutter), env(safe-area-inset-left, 0px));
    padding-inline-end: max(var(--page-gutter), env(safe-area-inset-right, 0px));
  }
</style>
