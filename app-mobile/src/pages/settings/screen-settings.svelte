<script module lang="ts">
  // This module holds the shared Settings Diagnostics types and helpers.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: SETTINGS DIAGNOSTICS SCREEN
  // ───────────────────────────────────────────────────────────────────

  // ───────────────────────────────────────────────────────────────────
  // 1. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export type DiagnosticsProbe = () => void | Promise<void>;
  export type HostCountCheck = () => number | Promise<number>;
  export type HostPing = (host: string) => void | Promise<void>;

  export interface SettingsProps {
    readonly hosts?: readonly string[];
    readonly hostCountCheck?: HostCountCheck;
    readonly connectivityProbe?: DiagnosticsProbe;
    readonly pingHost?: HostPing;
    readonly copyDiagnostics?: () => Promise<boolean>;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 2. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { onMount } from 'svelte';
  import {
    appendConnectionEvent,
    copyConnectionDiagnostics,
    type ConnectionLogCode,
    type ConnectionLogStatus,
  } from '$shared/transport/connection-log.js';
  import { getRelayHeartbeat } from '$shared/transport/relay.js';

  // ───────────────────────────────────────────────────────────────────
  // 3. PROPS AND STATE
  // ───────────────────────────────────────────────────────────────────

  let {
    hosts,
    hostCountCheck,
    connectivityProbe,
    pingHost,
    copyDiagnostics: copyDiagnosticsOverride,
  }: SettingsProps = $props();

  type DiagnosticStatus = 'pending' | 'passed' | 'failed' | 'unavailable';

  interface DiagnosticRow {
    readonly id: string;
    readonly label: string;
    readonly code: ConnectionLogCode;
    readonly status: DiagnosticStatus;
    readonly detail: string;
  }

  const effectiveHostCountCheck = $derived(
    hostCountCheck ?? (hosts === undefined ? undefined : () => hosts.length),
  );
  const effectivePingHost = $derived(
    pingHost ?? (hosts === undefined ? undefined : defaultPingHost),
  );
  let rows = $state<DiagnosticRow[]>([]);
  let copyState = $state<'idle' | 'copied' | 'failed'>('idle');
  let mounted = false;
  const hasPending = $derived(rows.some((row) => row.status === 'pending'));

  // ───────────────────────────────────────────────────────────────────
  // 4. DIAGNOSTIC HELPERS
  // ───────────────────────────────────────────────────────────────────

  function createInitialRows(
    hostList: readonly string[] | undefined,
    hasHostCountCheck: boolean,
  ): DiagnosticRow[] {
    const initial: DiagnosticRow[] = [
      {
        id: 'host-count',
        label: 'Host count',
        code: 'host-count',
        status: hasHostCountCheck ? 'pending' : 'unavailable',
        detail: hasHostCountCheck
          ? 'Checking the host inventory…'
          : 'Host inventory is not available on this client.',
      },
      {
        id: 'connectivity',
        label: 'Connectivity probe',
        code: 'connectivity',
        status: 'pending',
        detail: 'Checking relay reachability…',
      },
    ];

    if (hostList === undefined || hostList.length === 0) {
      initial.push({
        id: 'host-ping-unavailable',
        label: 'Per-host ping',
        code: 'ping',
        status: 'unavailable',
        detail: 'Per-host ping needs host inventory from the host.',
      });
      return initial;
    }

    for (const [index, host] of hostList.entries()) {
      initial.push({
        id: `host-ping-${index}`,
        label: `Ping ${host}`,
        code: 'ping',
        status: effectivePingHost === undefined ? 'unavailable' : 'pending',
        detail:
          effectivePingHost === undefined
            ? 'Per-host ping is not available on this client.'
            : 'Checking relay heartbeat evidence…',
      });
    }
    return initial;
  }

  function updateRow(
    id: string,
    status: Exclude<DiagnosticStatus, 'pending'>,
    detail: string,
    code: ConnectionLogCode,
    durationMs?: number,
  ): void {
    if (!mounted) return;
    rows = rows.map((row) => (row.id === id ? { ...row, status, detail } : row));
    const logStatus: Exclude<ConnectionLogStatus, 'started'> =
      status === 'passed' ? 'succeeded' : status;
    appendConnectionEvent({
      kind: 'diagnostic',
      status: logStatus,
      code,
      ...(durationMs === undefined ? {} : { durationMs }),
    });
  }

  function runProbe<T>(
    id: string,
    code: ConnectionLogCode,
    probe: () => T | Promise<T>,
    successDetail: (value: T) => string,
  ): void {
    const startedAt = Date.now();
    void Promise.resolve()
      .then(probe)
      .then((value) => {
        updateRow(id, 'passed', successDetail(value), code, elapsedSince(startedAt));
      })
      .catch(() => {
        updateRow(id, 'failed', 'The check failed. Try again.', code, elapsedSince(startedAt));
      });
  }

  function elapsedSince(startedAt: number): number {
    return Math.max(0, Date.now() - startedAt);
  }

  function runDiagnostics(): void {
    if (effectiveHostCountCheck !== undefined) {
      runProbe('host-count', 'host-count', effectiveHostCountCheck, (count) => {
        if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid host count.');
        return `${count} host${count === 1 ? '' : 's'} reported by the host.`;
      });
    }

    runProbe(
      'connectivity',
      'connectivity',
      connectivityProbe ?? defaultConnectivityProbe,
      () => 'Relay heartbeat is fresh.',
    );

    if (hosts !== undefined && effectivePingHost !== undefined) {
      for (const [index, host] of hosts.entries()) {
        runProbe(
          `host-ping-${index}`,
          'ping',
          () => effectivePingHost(host),
          () => 'Relay heartbeat is fresh.',
        );
      }
    }
  }

  function defaultConnectivityProbe(): void {
    requireFreshHeartbeat();
  }

  function defaultPingHost(host: string): void {
    void host;
    requireFreshHeartbeat();
  }

  function requireFreshHeartbeat(): void {
    const heartbeat = getRelayHeartbeat();
    if (!heartbeat.navigatorOnline || heartbeat.state !== 'fresh') {
      throw new Error('Relay heartbeat is not fresh.');
    }
  }

  async function handleCopyDiagnostics(): Promise<void> {
    const copy = copyDiagnosticsOverride ?? copyConnectionDiagnostics;
    copyState = (await copy()) ? 'copied' : 'failed';
  }

  // ───────────────────────────────────────────────────────────────────
  // 5. LIFECYCLE
  // ───────────────────────────────────────────────────────────────────

  onMount(() => {
    rows = createInitialRows(hosts, effectiveHostCountCheck !== undefined);
    mounted = true;
    runDiagnostics();
    return () => {
      mounted = false;
    };
  });

  // ───────────────────────────────────────────────────────────────────
  // 6. PRESENTATION LABELS
  // ───────────────────────────────────────────────────────────────────

  const statusLabels: Record<DiagnosticStatus, string> = {
    pending: 'Pending',
    passed: 'Passed',
    failed: 'Failed',
    unavailable: 'Unavailable',
  };
</script>

<!-- Component content -->
<!-- Settings diagnostics view -->
<!-- This surface: settings--view — device-run relay and host diagnostics with reachable pairing guidance. -->
<main class="settings--view">
  <header class="settings--header">
    <div>
      <p class="surface--eyebrow">Connection care</p>
      <h1>Diagnostics</h1>
      <p class="settings--intro">
        Run safe checks from this device. Results use relay evidence and never include credentials.
      </p>
    </div>
    <div class="settings--actions">
      <button class="settings--copy" type="button" onclick={() => void handleCopyDiagnostics()}>
        Copy diagnostics
      </button>
      {#if copyState === 'copied'}
        <span class="settings--copy-state" role="status">Diagnostics copied.</span>
      {:else if copyState === 'failed'}
        <span class="settings--copy-state" role="status">Copy unavailable.</span>
      {/if}
    </div>
  </header>

  <section
    class="diagnostics--section"
    aria-labelledby="diagnostics-heading"
    aria-busy={hasPending ? 'true' : 'false'}
  >
    <div class="section-heading">
      <div>
        <h2 id="diagnostics-heading">Diagnostic results</h2>
        <p>Each result appears as soon as its check settles.</p>
      </div>
    </div>
    <ol class="diagnostic--list" aria-live="polite">
      {#each rows as row (row.id)}
        <li class="diagnostic--row" data-diagnostic={row.id} data-status={row.status}>
          <div class="diagnostic--copy">
            <h3>{row.label}</h3>
            <p>{row.detail}</p>
          </div>
          <span class={`diagnostic--status is-${row.status}`} role="status">
            {statusLabels[row.status]}
          </span>
        </li>
      {/each}
    </ol>
  </section>

  <section class="faq--section" aria-labelledby="faq-heading">
    <div class="section-heading">
      <div>
        <h2 id="faq-heading">Reachable relay and pairing</h2>
        <p>Use these checks before trying enrollment again.</p>
      </div>
    </div>
    <details class="faq--item">
      <summary>How do I reach the relay?</summary>
      <p>
        This device must be able to reach the relay over HTTPS. Plain HTTP is accepted only for
        loopback addresses during local development. If the connectivity check fails, restore the
        device network or make the relay reachable, then run the check again.
      </p>
    </details>
    <details class="faq--item">
      <summary>How do I pair this phone?</summary>
      <p>
        Open the relay's enrollment screen and scan a fresh QR code from this device. Pairing data
        expires and is single-use, so start a new enrollment when an earlier code is rejected.
      </p>
    </details>
  </section>
</main>

<!-- Settings diagnostics view -->
<!-- This surface: settings--view — diagnostics layout and FAQ. Probe state remains in the script above. -->
<style>
  /* This surface: settings--view — diagnostics and pairing guidance. */
  /* Keeps the screen readable as a standalone settings destination. */
  .settings--view {
    max-width: 54rem;
    margin-inline: auto;
    padding: clamp(1.25rem, 5vw, 4rem) var(--page-gutter) 5rem;
  }

  /* Gives the copy and action a stable responsive relationship. */
  .settings--header {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: var(--space-8);
    margin-bottom: var(--space-12);
  }

  /* Keeps the introductory explanation short enough to scan. */
  .settings--intro {
    max-width: 38rem;
    margin: var(--space-5) 0 0;
    color: var(--ink-secondary);
    line-height: 1.6;
  }

  /* Keeps the copy action and its confirmation together. */
  .settings--actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: end;
    gap: var(--space-3);
  }

  /* Provides an explicit, keyboard-visible diagnostics action. */
  .settings--copy {
    min-block-size: 2.75rem;
    min-inline-size: 2.75rem;
    padding-inline: var(--space-4);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--ink);
    color: var(--ink-inverse);
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
  }

  /* Preserves the shared focus-ring contract on the local control. */
  .settings--copy:focus-visible,
  .faq--item summary:focus-visible {
    outline: 3px solid var(--focus);
    outline-offset: 3px;
  }

  /* Announces copy outcomes without changing the diagnostic result list. */
  .settings--copy-state {
    color: var(--ink-muted);
    font-size: 0.72rem;
  }

  /* Separates the runnable checks from the supporting FAQ. */
  .diagnostics--section,
  .faq--section {
    padding-top: var(--space-8);
    border-top: 1px solid var(--line-strong);
  }

  /* Prevents list markers from competing with result statuses. */
  .diagnostic--list {
    display: grid;
    gap: var(--space-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* Keeps each result scannable while it changes independently. */
  .diagnostic--row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-5);
    min-block-size: 4.5rem;
    padding: var(--space-4) var(--space-5);
    border: 1px solid var(--line);
    border-radius: var(--radius-md);
    background: var(--surface);
  }

  /* Lets long host labels wrap without pushing the state off-screen. */
  .diagnostic--copy {
    min-inline-size: 0;
  }

  /* Keeps the result title distinct from its bounded detail. */
  .diagnostic--copy h3 {
    margin: 0;
    font-size: 0.9rem;
  }

  /* Uses a generic failure message instead of reflecting probe errors. */
  .diagnostic--copy p {
    margin: var(--space-2) 0 0;
    color: var(--ink-muted);
    font-size: 0.75rem;
    line-height: 1.5;
  }

  /* Makes every outcome explicit instead of relying on color alone. */
  .diagnostic--status {
    flex: 0 0 auto;
    min-inline-size: 5.5rem;
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    color: var(--ink-muted);
    font-size: 0.68rem;
    font-weight: 750;
    text-align: center;
    text-transform: uppercase;
  }

  /* Adds a non-color success cue to completed checks. */
  .diagnostic--status.is-passed {
    border-color: var(--success);
    color: var(--success);
  }

  /* Adds a non-color failure cue to rejected checks. */
  .diagnostic--status.is-failed {
    border-color: var(--danger);
    color: var(--danger);
  }

  /* Keeps absent capabilities visibly distinct from failures and pending work. */
  .diagnostic--status.is-unavailable {
    border-style: dashed;
  }

  /* Keeps FAQ answers aligned with the same result surface. */
  .faq--section {
    display: grid;
    gap: var(--space-3);
    margin-top: var(--space-12);
  }

  /* Gives native disclosure controls a full touch target. */
  .faq--item {
    border-bottom: 1px solid var(--line);
  }

  /* Keeps the question readable and keyboard/touch friendly. */
  .faq--item summary {
    min-block-size: 2.75rem;
    padding-block: var(--space-3);
    color: var(--ink);
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
  }

  /* Keeps expanded guidance bounded and readable. */
  .faq--item p {
    max-width: 42rem;
    margin: 0 0 var(--space-5);
    color: var(--ink-secondary);
    font-size: 0.8rem;
    line-height: 1.65;
  }

  @media (max-width: 42rem) {
    /* Stacks the action under the heading on narrow screens. */
    .settings--header {
      align-items: start;
      flex-direction: column;
    }

    /* Keeps the copy action reachable at narrow widths. */
    .settings--actions {
      justify-content: start;
    }

    /* Gives long host labels the full row before the status pill. */
    .diagnostic--row {
      align-items: start;
      flex-direction: column;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    /* This surface has no required motion; keep the reduced-motion seam explicit. */
    .settings--view {
      scroll-behavior: auto;
    }
  }

  /* End of surface: settings--view */
</style>
