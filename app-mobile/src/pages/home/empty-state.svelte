<script module lang="ts">
  // This module holds the shared Empty State types and helpers.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: EMPTY STATE
  // ───────────────────────────────────────────────────────────────────

  export interface EmptyStateProps {
    readonly loading: boolean;
    readonly error: string | null;
    readonly hostTooOld?: boolean;
    readonly noMatch?: boolean;
  }
</script>

<script lang="ts">
  let { loading, error, hostTooOld = false, noMatch = false }: EmptyStateProps = $props();

  const heading = $derived(
    hostTooOld
      ? 'Host too old'
      : loading
        ? 'Reading the relay'
        : error !== null
          ? 'Catalog unavailable'
          : noMatch
            ? 'No sessions match'
            : 'No sessions here',
  );
  const body = $derived(
    hostTooOld
      ? 'This relay cannot list sessions. Update the host and retry.'
      : loading
        ? 'The catalog is being read from the relay.'
        : error !== null
          ? error
          : noMatch
            ? 'Nothing on this device matches that session id. A title search waits on the host.'
            : 'The catalog is empty. Start a local Pi session and refresh this view.',
  );
  const icon = $derived(loading ? '•••' : hostTooOld ? '△' : error !== null ? '!' : '○');
  const listKind = $derived(
    hostTooOld
      ? 'host-too-old'
      : loading
        ? 'loading'
        : error !== null
          ? 'error-retry'
          : noMatch
            ? 'no-match'
            : 'empty',
  );
</script>

<!-- Component content -->
<!-- Empty state -->
<!-- This surface: empty--state — empty/unavailable list state. -->
<div class="empty--state" data-list-kind={listKind}>
  <span class="empty--icon" aria-hidden="true">
    {icon}
  </span>
  <h3>{heading}</h3>
  <p>{body}</p>
</div>

<!-- Empty state -->
<!-- This surface: empty--state — empty/unavailable list state. .empty--state and .empty--icon are
     SHARED: the same classes are rendered inline by the Review and Inbox views, not only
     by this component. They are therefore left GLOBAL in app.css (unchanged) and resolve there;
     this component intentionally carries no scoped rules for them. -->
