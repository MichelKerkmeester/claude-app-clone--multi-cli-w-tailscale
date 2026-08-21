<script module lang="ts">
  import type { SessionListState, ConnectionPhase } from '../../state.js';
  import type { ReadOnlyCache } from '../../cache.js';
  import type { DeviceIdentity } from '../../auth.js';

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
  import { sessionStatusLabel, compactId, relativeTime } from './view-helpers.js';
  import Button from '../primitives/Button.svelte';
  import Freshness from './Freshness.svelte';
  import EmptyState from './EmptyState.svelte';
  import SessionStateIcon from './SessionStateIcon.svelte';
  import PushSettings from './PushSettings.svelte';

  let {
    sessions,
    connection,
    cache,
    device,
    onSelect,
    onRevoke,
    onLogout,
  }: HomeProps = $props();

  // @ds guardrail: staleness derivation — not designer-editable.
  const isStale = $derived(sessions.source === 'cache' || connection !== 'live');
</script>

<!-- @ds surface: home-view — hero, session roster, device footer, push settings. States: loading · empty · error · stale. -->
<!-- @ds guardrail: staleness derivation + select/revoke/logout handlers — not designer-editable. -->
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
          <!-- @ds guardrail: session open onPress → onSelect route — not designer-editable. -->
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
      <!-- @ds guardrail: device logout / revoke onPress handlers — not designer-editable. -->
      <Button onclick={onLogout}>Log out</Button>
      <Button onclick={onRevoke}>Revoke this device</Button>
    </div>
  </div>
  <PushSettings />
</main>

<!-- @ds surface: home-view — hero, session roster, device footer, push settings. Decomposed from style.css;
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
     forced-colors / reduced-motion .session-card groups stay GLOBAL in style.css (unchanged). The
     @media .section-heading .freshness variant lives in Freshness.svelte. The orbit is static (no
     @keyframes). Values unchanged. -->
<style>
  /* @ds surface: home-view — hero, session roster, device footer, push settings. */
  /* @ds state: loading · empty · error · stale — via shared empty-state, inline-alert and freshness surfaces. */
  .hero {
    position: relative;
    display: grid;
    min-height: min(31rem, calc(100dvh - 6rem));
    align-items: center;
    gap: var(--space-12);
    padding-block: clamp(2rem, 8vw, 5.5rem);
    overflow: hidden;
  }

  .hero-copy-block {
    position: relative;
    z-index: 1;
    max-width: 43rem;
  }

  .hero-copy {
    max-width: 39rem;
    margin: var(--space-6) 0 0;
    color: var(--ink-secondary);
    font-size: clamp(1rem, 2vw, 1.15rem);
    line-height: 1.65;
    text-wrap: pretty;
  }

  /* @ds slot: orbit — decorative relay graphic. */
  .relay-orbit {
    position: absolute;
    right: -5rem;
    width: clamp(17rem, 34vw, 29rem);
    aspect-ratio: 1;
    border: 1px solid color-mix(in oklch, var(--accent) 25%, var(--line));
    border-radius: 50%;
  }

  .relay-orbit::before,
  .relay-orbit::after {
    position: absolute;
    border: 1px solid color-mix(in oklch, var(--accent) 20%, var(--line));
    border-radius: 50%;
    content: '';
  }

  .relay-orbit::before {
    inset: 18%;
  }

  .relay-orbit::after {
    inset: 36%;
    background: var(--accent-soft);
  }

  .orbit-core {
    position: absolute;
    z-index: 1;
    inset: 41%;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--accent);
    color: white;
    font-size: clamp(1.4rem, 4vw, 2.5rem);
    font-weight: 700;
  }

  .orbit-node {
    position: absolute;
    z-index: 2;
    width: 0.7rem;
    height: 0.7rem;
    border: 3px solid var(--canvas);
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
  }

  .orbit-node-one {
    top: 8%;
    left: 38%;
  }
  .orbit-node-two {
    right: 8%;
    bottom: 31%;
  }
  .orbit-node-three {
    bottom: 17%;
    left: 14%;
  }

  /* @ds slot: sessions — recent-sessions section. */
  .session-section {
    padding-top: var(--space-8);
    border-top: 1px solid var(--line-strong);
  }

  .section-heading {
    align-items: end;
    margin-bottom: var(--space-6);
  }

  /* @ds slot: session-grid — the session card roster. */
  .session-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
    gap: var(--space-3);
  }

  :global(.session-card) {
    position: relative;
    display: grid;
    min-height: 11rem;
    align-content: space-between;
    gap: var(--space-4);
    padding: var(--space-6);
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
    text-align: start;
    cursor: pointer;
    transition:
      border-color var(--duration-fast) ease,
      background-color var(--duration-fast) ease,
      transform var(--duration-fast) var(--ease-out);
  }

  :global(.session-card::after) {
    position: absolute;
    top: 0;
    /* symmetric right:0/left:0 → logical inline span (equivalent in any locale). */
    inset-inline: 0;
    height: 2px;
    background: var(--accent);
    content: '';
    opacity: 0;
    transition: opacity var(--duration-fast) ease;
  }

  :global(.session-card[data-hovered]) {
    border-color: var(--line-strong);
    background: var(--surface-raised);
    transform: translateY(-2px);
  }

  :global(.session-card[data-hovered]::after) {
    opacity: 1;
  }

  .session-state {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--ink-muted);
    font-size: 0.72rem;
    font-weight: 680;
  }

  :global(.session-card > strong) {
    align-self: end;
    padding-top: var(--space-4);
    overflow-wrap: anywhere;
    font-family: var(--font-mono);
    font-size: 1.05rem;
    font-weight: 650;
    letter-spacing: -0.02em;
  }

  .session-meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--ink-muted);
    font-size: 0.73rem;
    font-weight: 550;
  }

  .session-meta i {
    width: 0.2rem;
    height: 0.2rem;
    border-radius: 50%;
    background: var(--line-strong);
  }

  /* @ds slot: open-arrow — session-card affordance. */
  .open-arrow {
    position: absolute;
    right: var(--space-4);
    bottom: var(--space-4);
    color: var(--accent-ink);
    font-size: 0.7rem;
    font-weight: 700;
    opacity: 0;
    transition: opacity var(--duration-fast) ease;
  }

  :global(.session-card[data-hovered]) .open-arrow,
  :global(.session-card[data-focus-visible]) .open-arrow {
    opacity: 1;
  }

  /* @ds slot: device — device-key footer (logout · revoke). */
  .device-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    margin-top: var(--space-12);
    padding-block: var(--space-4);
    border-top: 1px solid var(--line);
    color: var(--ink-muted);
    font-family: var(--font-mono);
    font-size: 0.68rem;
  }

  .device-footer > div {
    display: flex;
    gap: var(--space-2);
  }

  :global(.device-footer button) {
    min-height: 2.75rem;
    padding-inline: var(--space-3);
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--danger);
    font-family: var(--font-sans);
    font-size: 0.72rem;
    font-weight: 650;
    white-space: nowrap;
    cursor: pointer;
  }

  :global(.device-footer button[data-hovered]) {
    background: var(--danger-soft);
  }

  @media (max-width: 52rem) {
    .relay-orbit {
      right: -10rem;
      opacity: 0.7;
    }

    .hero-copy-block {
      max-width: 75%;
    }
  }

  @media (max-width: 39rem) {
    .hero {
      min-height: 26rem;
      align-items: end;
      padding-bottom: var(--space-12);
    }

    .hero-copy-block {
      max-width: 100%;
    }

    .hero h1 {
      max-width: 11ch;
      font-size: clamp(2.75rem, 14vw, 4rem);
    }

    .relay-orbit {
      top: -3rem;
      right: -8rem;
      width: 18rem;
      opacity: 0.45;
    }

    :global(.session-card) {
      min-height: 9.5rem;
    }

    .device-footer > div {
      flex-wrap: wrap;
    }
  }

  @media (hover: none) {
    .open-arrow {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.session-card[data-hovered]) {
      transform: none;
    }
  }
  /* @ds end surface: home-view */
</style>
