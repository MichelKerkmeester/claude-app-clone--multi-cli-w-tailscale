<script lang="ts">
  import { onMount } from 'svelte';
  import type { PushPreferences } from '@pi-remote/pi-rpc-protocol';
  import {
    fetchPushConfig,
    subscribeToPush,
    unsubscribeFromPush,
    updatePushPreferences,
    type PushConfig,
  } from '../../shared/data/attention.js';
  import { attentionLabel, messageFrom } from '../../shared/data/view-helpers.js';
  import Button from '../../shared/primitives/Button.svelte';

  // @ds surface: push-settings — device notification preferences. States: loading · disabled · off · on.
  // @ds guardrail: push fetch / subscribe / unsubscribe / preference handlers — not designer-editable.
  let config = $state<PushConfig | null>(null);
  let error = $state<string | null>(null);

  onMount(() => {
    void fetchPushConfig()
      .then((value) => (config = value))
      .catch((cause: unknown) => (error = messageFrom(cause)));
  });

  function setPreferences(preferences: PushPreferences): void {
    config = config === null ? config : { ...config, preferences };
    void updatePushPreferences(preferences).catch((cause: unknown) => (error = messageFrom(cause)));
  }

  const ATTENTION_CLASSES = ['needs_input', 'finished', 'error'] as const;
</script>

<!-- @ds surface: push-settings — device notification preferences. States: loading · disabled · off · on. -->
<!-- @ds guardrail: push fetch / subscribe / unsubscribe / preference handlers — not designer-editable. -->
<section class="push-settings">
  <div>
    <p class="surface-kicker">This device</p>
    <h2>Attention hints</h2>
    <p>
      Notifications never contain session content or actions. The inbox is always the fallback.
    </p>
  </div>
  {#if error !== null}
    <div class="inline-alert">{error}</div>
  {/if}
  {#if config === null}
    <span>Checking support</span>
  {:else if !config.supported || config.vapidPublicKey === null}
    <span>Push is disabled at the relay. Inbox remains active.</span>
  {:else if config.preferences === null}
    <Button
      onclick={() => {
        void subscribeToPush(config!.vapidPublicKey ?? '')
          .then((preferences) => (config = { ...config!, preferences }))
          .catch((cause: unknown) => (error = messageFrom(cause)));
      }}
    >
      <!-- @ds guardrail: push subscribe onPress handler — not designer-editable. -->
      Enable notifications
    </Button>
  {:else}
    <div class="preference-grid">
      {#each ATTENTION_CLASSES as attentionClass (attentionClass)}
        {@const selected = config.preferences?.[attentionClass] ?? false}
        <button
          type="button"
          role="switch"
          aria-checked={selected}
          data-selected={selected ? '' : undefined}
          onclick={() => setPreferences({ ...config!.preferences!, [attentionClass]: !selected })}
        >
          <!-- @ds guardrail: preference Switch onChange → updatePushPreferences — not designer-editable. -->
          <span class="switch-track" aria-hidden="true">
            <span></span>
          </span>
          {attentionLabel(attentionClass)}
        </button>
      {/each}
    </div>
    <!-- @ds guardrail: push unsubscribe onPress handler — not designer-editable. -->
    <Button
      class="push-disable"
      onclick={() => {
        void unsubscribeFromPush()
          .then(() => (config = { ...config!, preferences: null }))
          .catch((cause: unknown) => (error = messageFrom(cause)));
      }}
    >
      Disable notifications
    </Button>
  {/if}
</section>

<!-- @ds surface: push-settings — device notification preferences. Decomposed into this scoped block;
     push-settings / preference-grid / switch-track and their switch state rules are owned solely
     by this component so they move with it. The hand-rolled switch renders the original
     [role='switch'] + [data-selected] + .switch-track structure the frozen CSS targets, so the
     switch state selectors stay :global at the attribute compounds and scoped at the .switch-track
     class. Button primitive outputs (.push-settings > button / .push-disable) use :global so Svelte
     scoping cannot drop the child-component element. .surface-kicker (shared by review/home/inbox/
     plan surfaces) and .inline-alert (shared by the composer) are shared by 2+ components and stay
     global in app.css. The .push-settings h2 / .push-settings p solo occurrences are extracted
     from the shared .section-heading groups; the shared groups stay global. Values unchanged. -->
<style>
  /* @ds surface: push-settings — device notification preferences. */
  /* @ds state: loading · disabled · off · on — support check, relay-off, enable CTA, preference grid. */
  .push-settings {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-6);
    margin-top: var(--space-8);
    padding: var(--space-6);
    border-radius: var(--radius-lg);
    background: var(--surface-muted);
  }

  .push-settings .surface-kicker {
    margin-bottom: var(--space-2);
  }

  .push-settings > span {
    color: var(--ink-secondary);
    font-size: 0.82rem;
  }

  /* .push-settings h2 / .push-settings p — solo occurrences extracted from the shared
     .section-heading h2, .push-settings h2 / .section-heading p, .push-settings p groups;
     the shared groups stay global. */
  .push-settings h2 {
    margin: 0;
    font-size: clamp(1.4rem, 3vw, 2rem);
    font-weight: 650;
    letter-spacing: -0.025em;
  }

  .push-settings p {
    max-width: 34rem;
    margin: var(--space-2) 0 0;
    color: var(--ink-muted);
    font-size: 0.86rem;
    line-height: 1.55;
  }

  /* Button primitive outputs (subscribe / disable) — :global so Svelte scoping cannot
     drop the child-component element. The shared grouped hover override
     stays global. */
  :global(.push-settings > button),
  :global(.push-disable) {
    min-height: 2.75rem;
    padding-inline: var(--space-4);
    border: 0;
    border-radius: var(--radius-sm);
    background: var(--ink);
    color: var(--ink-inverse);
    font-size: 0.78rem;
    font-weight: 700;
    white-space: nowrap;
    cursor: pointer;
  }

  :global(.push-settings > button[data-hovered]) {
    background: var(--accent-strong);
    color: white;
  }

  :global(.push-settings .push-disable) {
    justify-self: end;
    background: transparent;
    color: var(--danger);
  }

  /* @ds slot: preferences — per-class alert switches. */
  .preference-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: end;
    gap: var(--space-3);
  }

  .preference-grid :global([role='switch']) {
    display: flex;
    min-height: 2.75rem;
    align-items: center;
    gap: var(--space-2);
    color: var(--ink-secondary);
    font-size: 0.76rem;
    font-weight: 620;
    cursor: pointer;
  }

  .switch-track {
    display: flex;
    width: 2.3rem;
    height: 1.35rem;
    align-items: center;
    padding: 0.15rem;
    border-radius: 99px;
    background: var(--line-strong);
    transition: background-color var(--duration-state) ease;
  }

  .switch-track > span {
    width: 1.05rem;
    height: 1.05rem;
    border-radius: 50%;
    background: white;
    box-shadow: 0 1px 3px oklch(0 0 0 / 0.2);
    transition: transform var(--duration-state) var(--ease-out);
  }

  :global([role='switch'][data-selected]) .switch-track {
    background: var(--accent);
  }

  :global([role='switch'][data-selected]) .switch-track > span {
    transform: translateX(0.95rem);
  }

  /* [role='switch']:focus-visible — solo occurrence extracted from the shared focus-visible
     group; the shared group stays global. A native <button> supplies
     the :focus-visible the CSS keys on (no [data-hovered] on the switch). */
  :global([role='switch']:focus-visible) {
    outline: 3px solid var(--focus);
    outline-offset: 3px;
  }

  @media (max-width: 39rem) {
    .push-settings {
      grid-template-columns: 1fr;
    }

    .preference-grid {
      justify-content: start;
    }

    :global(.push-settings .push-disable) {
      justify-self: start;
    }
  }

  /* @ds state: motion — reduced-motion switch knob zeroing. Solo occurrence extracted from
     the shared reduced-motion group; the shared group stays global. */
  @media (prefers-reduced-motion: reduce) {
    :global([role='switch'][data-selected]) .switch-track > span {
      transform: none !important;
    }
  }
  /* @ds end surface: push-settings */
</style>
