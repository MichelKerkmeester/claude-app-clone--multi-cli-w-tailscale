<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import type { SessionListState, ConnectionPhase } from '$shared/state/state.js';
  import type { ReadOnlyCache } from '$shared/transport/cache.js';
  import type { DeviceIdentity } from '$shared/transport/auth.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export interface HomeProps {
    readonly sessions: SessionListState;
    readonly connection: ConnectionPhase;
    readonly cache: ReadOnlyCache | null;
    readonly device: DeviceIdentity | null;
    readonly onSelect: (sessionId: string) => void;
    readonly onRevoke: () => void;
    readonly onLogout: () => void;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 3. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { sessionStatusLabel, compactId, relativeTime } from '$shared/format/view-helpers.js';
  import Button from '$shared/primitives/button/button.svelte';
  import Freshness from './freshness.svelte';
  import EmptyState from './empty-state.svelte';
  import SessionStateIcon from '$shared/chrome/session-state-icon.svelte';
  import PushSettings from './push-settings.svelte';

  import './screen-home.css';

  // ───────────────────────────────────────────────────────────────────
  // 4. PROPS
  // ───────────────────────────────────────────────────────────────────

  let {
    sessions,
    connection,
    cache,
    device,
    onSelect,
    onRevoke,
    onLogout,
  }: HomeProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 5. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  // @ds guardrail: staleness derivation — Not designer-editable.
  const isStale = $derived(sessions.source === 'cache' || connection !== 'live');
</script>

<!-- @ds surface: home-view — hero, session roster, device footer, push settings. States: loading · empty · error · stale. -->
<!-- @ds guardrail: staleness derivation + select/revoke/logout handlers — Not designer-editable. -->
<main class="home-view">
  <section class="hero">
    <div class="hero-copy-block">
      <p class="surface-kicker">Private relay</p>
      <h1>Your agents, within reach</h1>
      <p class="hero-copy">
        Follow redacted Pi activity from this device. Actions stay read-only until an exact
        approval is requested.
      </p>
    </div>
    <div class="relay-orbit" aria-hidden="true">
      <span class="orbit-core">π</span>
      <span class="orbit-node orbit-node-one"></span>
      <span class="orbit-node orbit-node-two"></span>
      <span class="orbit-node orbit-node-three"></span>
    </div>
  </section>

  <section class="session-section" aria-labelledby="session-heading">
    <div class="section-heading">
      <div>
        <h2 id="session-heading">Recent sessions</h2>
        <p>Opaque identifiers only. No prompts, paths, or host context.</p>
      </div>
      <Freshness stale={isStale} at={sessions.updatedAt ?? cache?.savedAt ?? null} />
    </div>
    {#if sessions.items.length === 0}
      <EmptyState loading={sessions.phase === 'loading'} error={sessions.error} />
    {:else}
      <div class="session-grid">
        {#each sessions.items as session (session.id)}
          <!-- @ds guardrail: session open onPress → onSelect route — Not designer-editable. -->
          <Button class="session-card" onclick={() => onSelect(session.id)}>
            <span class={`session-state state-${session.status}`}>
              <SessionStateIcon status={session.status} />
              {sessionStatusLabel(session.status)}
            </span>
            <strong>{compactId(session.id)}</strong>
            <span class="session-meta">
              {session.messageCount} blocks <i aria-hidden="true"></i> {relativeTime(session.updatedAt)}
            </span>
            <span class="open-arrow" aria-hidden="true">
              Open
            </span>
          </Button>
        {/each}
      </div>
    {/if}
  </section>
  <div class="device-footer">
    <span>
      {device === null ? 'Device key active' : `Host ${compactId(device.hostFingerprint)}`}
    </span>
    <div>
      <!-- @ds guardrail: device logout / revoke onPress handlers — Not designer-editable. -->
      <Button onclick={onLogout}>Log out</Button>
      <Button onclick={onRevoke}>Revoke this device</Button>
    </div>
  </div>
  <PushSettings />
</main>

<!-- @ds surface: home-view — hero, session roster, device footer, push settings. Decomposed into this co-located CSS file;
     hero / hero-copy-block / hero-copy / relay-orbit(+::before/::after) / orbit-core / orbit-node(+one/two/three)
     / session-section / section-heading(solo) / session-grid / session-state / session-meta(+i) / open-arrow
     / device-footer(+>div) are owned solely by this component so they move with it. .session-card and
     .device-footer button (Button primitive prop-class + data-hovered/data-focus-visible) are reproduced as
     :global(...) top-level selectors so Svelte scoping cannot drop them; the .session-card > strong and
     .session-card[data-hovered|data-focus-visible] .open-arrow descendants keep the primitive ancestor
     :global and Home's own element scoped. .home-view (routed-frame group with session/review/inbox),
     .surface-kicker (shared kicker), the .hero h1 base group (shared with review/inbox/enrollment h1),
     .section-heading / .section-heading h2 / .section-heading p groups (shared with session-title /
     session-toolbar / push-settings), the .state-running / .state-idle / .state-interrupted color rules and
     the .state-running .state-icon / .agent-running .state-icon pulsing group (shared with the agent-row
     surface, already left global by SessionStateIcon.svelte), and the shared prefers-contrast /
     forced-colors / reduced-motion .session-card groups stay GLOBAL in app.css (unchanged). The
     @media .section-heading .freshness variant lives in Freshness.svelte. The orbit is static (no
     @keyframes). Values unchanged. -->
