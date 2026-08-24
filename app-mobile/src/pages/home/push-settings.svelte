<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { onMount } from 'svelte';
  import type { PushPreferences } from '@pi-remote/pi-rpc-protocol';
  import {
    fetchPushConfig,
    subscribeToPush,
    unsubscribeFromPush,
    updatePushPreferences,
    type PushConfig,
  } from '$shared/format/attention.js';
  import { attentionLabel, messageFrom } from '$shared/format/view-helpers.js';
  import Button from '$shared/primitives/button/button.svelte';

  import './push-settings.css';

  // ───────────────────────────────────────────────────────────────────
  // 2. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  // @ds surface: push-settings — device notification preferences. States: loading · disabled · off · on.
  // @ds guardrail: push fetch / subscribe / unsubscribe / preference handlers — Not designer-editable.
  let config = $state<PushConfig | null>(null);
  let error = $state<string | null>(null);

  onMount(() => {
    void fetchPushConfig()
      .then((value) => (config = value))
      .catch((cause: unknown) => (error = messageFrom(cause)));
  });

  // ───────────────────────────────────────────────────────────────────
  // 3. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  function setPreferences(preferences: PushPreferences): void {
    config = config === null ? config : { ...config, preferences };
    void updatePushPreferences(preferences).catch((cause: unknown) => (error = messageFrom(cause)));
  }

  const ATTENTION_CLASSES = ['needs_input', 'finished', 'error'] as const;
</script>

<!-- @ds surface: push-settings — device notification preferences. States: loading · disabled · off · on. -->
<!-- @ds guardrail: push fetch / subscribe / unsubscribe / preference handlers — Not designer-editable. -->
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
      <!-- @ds guardrail: push subscribe onPress handler — Not designer-editable. -->
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
          <!-- @ds guardrail: preference Switch onChange → updatePushPreferences — Not designer-editable. -->
          <span class="switch-track" aria-hidden="true">
            <span></span>
          </span>
          {attentionLabel(attentionClass)}
        </button>
      {/each}
    </div>
    <!-- @ds guardrail: push unsubscribe onPress handler — Not designer-editable. -->
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

<!-- @ds surface: push-settings — device notification preferences. Decomposed into this co-located CSS file;
     push-settings / preference-grid / switch-track and their switch state rules are owned solely
     by this component so they move with it. The hand-rolled switch renders the original
     [role='switch'] + [data-selected] + .switch-track structure the frozen CSS targets, so the
     switch state selectors stay :global at the attribute compounds and scoped at the .switch-track
     class. Button primitive outputs (.push-settings > button / .push-disable) use :global so Svelte
     scoping cannot drop the child-component element. .surface-kicker (shared by review/home/inbox/
     plan surfaces) and .inline-alert (shared by the composer) are shared by 2+ components and stay
     global in app.css. The .push-settings h2 / .push-settings p solo occurrences are extracted
     from the shared .section-heading groups; the shared groups stay global. Values unchanged. -->
