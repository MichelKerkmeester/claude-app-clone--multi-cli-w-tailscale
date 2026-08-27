<script lang="ts">
  // This route: /session/[id] — one live session.
  // The id stays raw — encodeURIComponent is the single encode boundary at +layout.svelte.
  import { page } from '$app/stores';

  import { getAppState, getAppActions } from '$shared/state/app-state.svelte.js';
  import Session from '../../../pages/chat/screen-chat.svelte';

  const app = getAppState();
  const actions = getAppActions();

  const sessionId = $derived($page.params.id!);

  // Re-validate against the authoritative roster: if absent, render unavailable.
  // Treat the id as navigation intent, never persisted truth.
  const session = $derived(
    app.sessions.items.find((session) => session.id === sessionId),
  );

  // null = available, 'not-found' = id not in settled roster,
  // 'not-available' = host explicitly denied the session via gap
  const unavailableReason = $derived(
    session === undefined
      ? app.sessions.phase === 'loading' || app.sessions.phase === 'idle'
        ? null  // Still loading — defer the decision
        : 'not-found'
      : app.transcript.sessionId === sessionId &&
          app.transcript.gapReason === 'unknown-session'
        ? 'not-available'
        : null,
  );

  const status = $derived(session?.status ?? 'unknown');
</script>

<!-- Component content -->
{#if unavailableReason !== null}
  <!-- Session unavailable: visibly-unresolved; no socket, no command, no <Session>. -->
  <div role="alert" aria-live="assertive" class="session--unavailable">
    <h1>Session unavailable</h1>
    <p>
      {#if unavailableReason === 'not-found'}
        The requested session is not available from the relay.
      {:else}
        This session is no longer available.
      {/if}
    </p>
    <button type="button" onclick={() => actions.navigate(null)}>Go Home</button>
  </div>
{:else}
  <Session
    connection={app.connection.phase}
    {sessionId}
    initialCache={app.initialCache}
    transcript={app.transcript}
    todoProjection={app.todoProjection}
    dispatchConnection={app.dispatchConnection}
    dispatchTranscript={app.dispatchTranscript}
    dispatchTodoProjection={app.dispatchTodoProjection}
    {status}
    onBack={() => actions.navigate(null)}
    onInbox={actions.openInbox}
    onReview={actions.openReview}
    theme={app.theme}
    onThemeChange={(value) => (app.theme = value)}
    mediaCapability={app.mediaCapability}
    askQuestionPrincipal={app.askQuestionPrincipal}
  />
{/if}

<style>
  /* This slot: unavailable -- session not found or no longer available. */
  .session--unavailable {
    display: grid;
    place-items: center;
    min-height: 40dvh;
    padding: var(--page-gutter);
    text-align: center;
  }

  .session--unavailable h1 {
    font-size: 1.5rem;
    font-weight: 620;
    color: var(--ink);
  }

  .session--unavailable p {
    color: var(--ink-secondary);
    margin: var(--space-4) 0;
  }

  .session--unavailable button {
    min-height: 2.75rem;
    padding: 0 var(--space-6);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--ink);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
  }
</style>
