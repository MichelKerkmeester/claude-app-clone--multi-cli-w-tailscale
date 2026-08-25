<script module lang="ts">
  // This module holds the shared Empty State types and helpers.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: EMPTY STATE
  // ───────────────────────────────────────────────────────────────────

  export interface EmptyStateProps {
    readonly loading: boolean;
    readonly error: string | null;
  }
</script>

<script lang="ts">
  let { loading, error }: EmptyStateProps = $props();
</script>

<!-- Component content -->
<!-- Empty state -->
<!-- This surface: empty--state — empty/unavailable list state. -->
<div class="empty--state">
  <span class="empty--icon" aria-hidden="true">
    {loading ? '•••' : '○'}
  </span>
  <h3>{loading ? 'Reading the relay' : 'No sessions found'}</h3>
  <p>{error ?? 'The catalog is empty. Start a local Pi session and refresh this view.'}</p>
</div>

<!-- Empty state -->
<!-- This surface: empty--state — empty/unavailable list state. .empty--state and .empty--icon are
     SHARED: the same classes are rendered inline by the Review and Inbox views (App.tsx), not only
     by this component. They are therefore left GLOBAL in app.css (unchanged) and resolve there;
     this component intentionally carries no scoped rules for them. -->
