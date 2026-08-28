<script module lang="ts">
  export interface PushSettingsProps {
    readonly openSettings?: () => void;
  }
</script>

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
  import {
    getSettingsRow,
    searchSettingsRows,
    type SettingsRowId,
  } from '$shared/format/settings-search.js';
  import { messageFrom } from '$shared/format/view-helpers.js';
  import Button from '$shared/primitives/button/button.svelte';

  type PushSettingsProps = import('./push-settings.svelte').PushSettingsProps;

  // ───────────────────────────────────────────────────────────────────
  // 2. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  // This surface: push--settings — device notification preferences. States: loading · disabled · off · on.
  // Do not edit — push fetch / subscribe / unsubscribe / preference handlers — Not designer-editable.
  let { openSettings }: PushSettingsProps = $props();
  let config = $state<PushConfig | null>(null);
  let error = $state<string | null>(null);
  let settingsQuery = $state('');
  type NotificationPermissionState = 'default' | 'denied' | 'granted';

  let notificationPermission = $state<NotificationPermissionState | null>(readNotificationPermission());
  let blockedToastShown = $state(false);
  let blockedToastSequence = $state(0);
  let blockedNotice = $state(false);

  const ATTENTION_CLASSES = ['needs_input', 'finished', 'error'] as const;
  const permissionDenied = $derived(notificationPermission === 'denied');
  const permissionGranted = $derived(notificationPermission === 'granted');
  const matchingRows = $derived(searchSettingsRows(settingsQuery));
  const visibleAttentionClasses = $derived(
    ATTENTION_CLASSES.filter((attentionClass) =>
      matchingRows.some((row) => row.id === attentionClass),
    ),
  );
  const notificationsVisible = $derived(matchingRows.some((row) => row.id === 'notifications'));
  const visibleSettings = $derived(
    notificationsVisible || visibleAttentionClasses.length > 0,
  );

  // ───────────────────────────────────────────────────────────────────
  // 3. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  function readNotificationPermission(): NotificationPermissionState | null {
    if (typeof Notification === 'undefined') return null;
    return Notification.permission;
  }

  function probeNotificationPermission(): void {
    const next = readNotificationPermission();
    notificationPermission = next;
    if (next === 'denied') {
      if (!blockedToastShown) {
        blockedToastShown = true;
        blockedToastSequence += 1;
        blockedNotice = true;
      }
    } else if (next === 'granted') {
      blockedNotice = false;
    }
  }

  onMount(() => {
    probeNotificationPermission();
    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') probeNotificationPermission();
    };
    window.addEventListener('focus', probeNotificationPermission);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('focus', probeNotificationPermission);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  });

  onMount(() => {
    void fetchPushConfig()
      .then((value) => (config = value))
      .catch((cause: unknown) => (error = messageFrom(cause)));
  });

  // ───────────────────────────────────────────────────────────────────
  // 4. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  // Keep set preferences focused on its single responsibility.
  function setPreferences(preferences: PushPreferences): void {
    probeNotificationPermission();
    if (!permissionGranted || config === null) return;
    config = { ...config, preferences };
    void updatePushPreferences(preferences).catch((cause: unknown) => (error = messageFrom(cause)));
  }

  function togglePreference(attentionClass: (typeof ATTENTION_CLASSES)[number], selected: boolean): void {
    setPreferences({ ...config!.preferences!, [attentionClass]: !selected });
  }

  function handleSubscribe(): void {
    probeNotificationPermission();
    if (permissionDenied || config === null || config.vapidPublicKey === null) return;
    void subscribeToPush(config.vapidPublicKey)
      .then((preferences) => (config = { ...config!, preferences }))
      .catch((cause: unknown) => {
        probeNotificationPermission();
        error = messageFrom(cause);
      });
  }

  function handleOpenSettings(): void {
    if (openSettings !== undefined) openSettings();
  }

  function settingId(attentionClass: (typeof ATTENTION_CLASSES)[number]): SettingsRowId {
    return attentionClass;
  }
</script>

<!-- Component content -->
<!-- Push settings -->
<!-- This surface: push--settings — device notification preferences. States: loading · disabled · off · on. -->
<!-- Do not edit — push fetch / subscribe / unsubscribe / preference handlers — Not designer-editable. -->
<section class="push--settings">
  <div>
    <p class="surface--eyebrow">This device</p>
    <h2>Attention hints</h2>
    <p>
      Notifications never contain session content or actions. The inbox is always the fallback.
    </p>
  </div>
  <label class="settings-search">
    <span class="sr-only">Search notification settings</span>
    <input
      type="search"
      bind:value={settingsQuery}
      placeholder="Search settings"
      aria-label="Search notification settings"
      autocomplete="off"
    />
  </label>
  {#if error !== null}
    <div class="inline-alert">{error}</div>
  {/if}
  {#if blockedNotice}
    <div
      class="permission--notice"
      role="status"
      data-toast="notification-blocked"
      data-toast-sequence={blockedToastSequence}
    >
      Notifications are blocked by the browser. This toggle stays off until permission is restored.
    </div>
    <Button
      class="permission--open-settings"
      disabled={openSettings === undefined}
      onclick={handleOpenSettings}
    >
      Open Settings
    </Button>
    {#if openSettings === undefined}
      <span class="permission--unavailable">Opening browser settings is unavailable here.</span>
    {/if}
  {/if}
  {#if config === null}
    <span>Checking support</span>
  {:else if !config.supported || config.vapidPublicKey === null}
    <span>Push is disabled at the relay. Inbox remains active.</span>
  {:else if config.preferences === null}
    {#if notificationsVisible && !permissionDenied}
      <Button onclick={handleSubscribe}>
        <!-- Do not edit — push subscribe onPress handler — Not designer-editable. -->
        Enable notifications
      </Button>
    {/if}
  {:else}
    {#if visibleAttentionClasses.length > 0}
      <div class="preference-grid">
        {#each visibleAttentionClasses as attentionClass (attentionClass)}
          {@const row = getSettingsRow(settingId(attentionClass))}
          {@const selected = permissionGranted && (config.preferences?.[attentionClass] ?? false)}
          <button
            type="button"
            role="switch"
            aria-checked={selected}
            data-selected={selected ? '' : undefined}
            data-settings-row={row.id}
            disabled={!permissionGranted}
            onclick={() => togglePreference(attentionClass, selected)}
            title={row.description}
          >
            <!-- Do not edit — preference Switch onChange → updatePushPreferences — Not designer-editable. -->
            <span class="switch-track" aria-hidden="true">
              <span></span>
            </span>
            {row.title}
          </button>
        {/each}
      </div>
    {/if}
    {#if notificationsVisible}
      <!-- Do not edit — push unsubscribe onPress handler — Not designer-editable. -->
      <Button
        class="push--disable"
        onclick={() => {
          void unsubscribeFromPush()
            .then(() => (config = { ...config!, preferences: null }))
            .catch((cause: unknown) => (error = messageFrom(cause)));
        }}
      >
        Disable notifications
      </Button>
    {/if}
  {/if}
  {#if config !== null && !visibleSettings && settingsQuery.trim().length > 0}
    <span role="status">No notification settings match “{settingsQuery}”.</span>
  {/if}
</section>

<!-- Push settings -->
<!-- This surface: push--settings — device notification preferences. Decomposed into this scoped block;
     push--settings / preference-grid / switch-track and their switch state rules are owned solely
     by this component so they move with it. The hand-rolled switch renders the original
     [role='switch'] + [data-selected] + .switch-track structure the frozen CSS targets, so the
     switch state selectors stay :global at the attribute compounds and scoped at the .switch-track
     class. Button primitive outputs (.push--settings > button / .push--disable) use :global so Svelte
     scoping cannot drop the child-component element. .surface--eyebrow (shared by review/home/inbox/
     plan surfaces) and .inline-alert (shared by the composer) are shared by 2+ components and stay
     global in app.css. The .push--settings h2 / .push--settings p solo occurrences are extracted
     from the shared .section-heading groups; the shared groups stay global. Values unchanged. -->
<style>
  /* This surface: push--settings — device notification preferences. */
  /* This state: loading · disabled · off · on — support check, relay-off, enable CTA, preference grid. */
  .push--settings {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-6);
    margin-top: var(--space-8);
    padding: var(--space-6);
    border-radius: var(--radius-lg);
    background: var(--surface-muted);
  }

  /* Keep this rule aligned with its surrounding surface. */
  .push--settings .surface--eyebrow {
    margin-bottom: var(--space-2);
  }

  /* Keeps the local settings index available without changing push state. */
  .settings-search {
    display: flex;
    grid-column: 1 / -1;
  }

  /* Keeps the search target touch-sized on narrow devices. */
  .settings-search input {
    width: min(100%, 24rem);
    min-height: 2.75rem;
    padding-inline: var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--ink);
  }

  /* Makes a browser-level denial explicit without implying that the app can change it. */
  .permission--notice {
    grid-column: 1 / -1;
    color: var(--danger);
    font-size: 0.82rem;
    line-height: 1.45;
  }

  /* Explains why the settings opener is intentionally inert when no capability is supplied. */
  .permission--unavailable {
    grid-column: 1 / -1;
    color: var(--ink-muted);
    font-size: 0.78rem;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .push--settings > span {
    color: var(--ink-secondary);
    font-size: 0.82rem;
  }

  /* Heading typography split from shared global groups. */
  .push--settings h2 {
    margin: 0;
    font-size: clamp(1.4rem, 3vw, 2rem);
    font-weight: 650;
    letter-spacing: -0.025em;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .push--settings p {
    max-width: 34rem;
    margin: var(--space-2) 0 0;
    color: var(--ink-muted);
    font-size: 0.86rem;
    line-height: 1.55;
  }

  /* :global on Button children so scoped CSS cannot drop primitive output. */
  :global(.push--settings > button),
  :global(.push--disable) {
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

  /* Keep this rule aligned with its surrounding surface. */
  :global(.push--settings > button[data-hovered]) {
    background: var(--accent-strong);
    color: white;
  }

  /* Keeps the optional browser-settings capability visibly secondary. */
  :global(.permission--open-settings) {
    min-height: 2.75rem;
    padding-inline: var(--space-4);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--ink);
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
  }

  /* Shows that the browser-settings action cannot run without its capability. */
  :global(.permission--open-settings:disabled) {
    cursor: not-allowed;
    opacity: 0.55;
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.push--settings .push--disable) {
    justify-self: end;
    background: transparent;
    color: var(--danger);
  }

  /* This slot: preferences — per-class alert switches. */
  .preference-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: end;
    gap: var(--space-3);
  }

  /* Keep this rule aligned with its surrounding surface. */
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

  /* Keeps a denied permission from looking interactive. */
  .preference-grid :global([role='switch']:disabled) {
    cursor: not-allowed;
    opacity: 0.6;
  }

  /* Keep this rule aligned with its surrounding surface. */
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

  /* Keep this rule aligned with its surrounding surface. */
  .switch-track > span {
    width: 1.05rem;
    height: 1.05rem;
    border-radius: 50%;
    background: white;
    box-shadow: 0 1px 3px oklch(0 0 0 / 0.2);
    transition: transform var(--duration-state) var(--ease-out);
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global([role='switch'][data-selected]) .switch-track {
    background: var(--accent);
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global([role='switch'][data-selected]) .switch-track > span {
    transform: translateX(0.95rem);
  }

  /* Switch focus ring — solo rule extracted from shared focus-visible group. */
  :global([role='switch']:focus-visible) {
    outline: 3px solid var(--focus);
    outline-offset: 3px;
  }

  @media (max-width: 39rem) {
    /* Keep this rule aligned with its surrounding surface. */
    .push--settings {
      grid-template-columns: 1fr;
    }

    /* Keep this rule aligned with its surrounding surface. */
    .preference-grid {
      justify-content: start;
    }

    /* Keep this rule aligned with its surrounding surface. */
    :global(.push--settings .push--disable) {
      justify-self: start;
    }
  }

  /* This state: motion — reduced-motion switch knob zeroing. Solo occurrence extracted from
     the shared reduced-motion group; the shared group stays global. */
  @media (prefers-reduced-motion: reduce) {
    /* Keep this rule aligned with its surrounding surface. */
    :global([role='switch'][data-selected]) .switch-track > span {
      transform: none !important;
    }
  }
  /* End of surface: push--settings */
</style>
