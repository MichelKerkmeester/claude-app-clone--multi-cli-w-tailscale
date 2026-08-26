<script module lang="ts">
  // This module holds the shared Empty State types and helpers.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: EMPTY STATE
  // ───────────────────────────────────────────────────────────────────

  export interface EmptyStateProps {
    readonly loading: boolean;
    readonly error: string | null;
    readonly hostTooOld?: boolean;
  }
</script>

<script lang="ts">
  let { loading, error, hostTooOld = false }: EmptyStateProps = $props();

  const heading = $derived(
    hostTooOld
      ? 'Host too old'
      : loading
        ? 'Reading the relay'
        : error !== null
          ? 'Catalog unavailable'
          : 'No sessions found',
  );
  const body = $derived(
    hostTooOld
      ? 'This relay cannot list sessions. Update the host and retry.'
      : loading
        ? 'The catalog is being read from the relay.'
        : (error ?? 'The catalog is empty. Start a local Pi session and refresh this view.'),
  );
  const icon = $derived(loading ? '•••' : hostTooOld ? '△' : error !== null ? '!' : '○');
</script>

<!-- Component content -->
<!-- Empty state -->
<!-- This surface: empty--state — empty/unavailable list state. -->
<div class="empty--state" data-list-kind={hostTooOld ? 'host-too-old' : loading ? 'loading' : error !== null ? 'error-retry' : 'empty'}>
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
