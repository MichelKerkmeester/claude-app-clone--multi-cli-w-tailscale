<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: ROOT ERROR BOUNDARY
  // ───────────────────────────────────────────────────────────────────
  // @ds surface: RootErrorBoundary — Keep render failures inside an app-level recovery surface so reload and reset stay available.

  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import type { Snippet } from 'svelte';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { children }: { children: Snippet } = $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  function onerror(error: unknown): void {
    // Surface the error for test spies; omit component stacks from durable comments.
    console.error('Pi Remote failed to render.', error);
  }

  function reloadApp(): void {
    window.location.reload();
  }

  // Best-effort recovery clears a stale bundle's service worker and caches before reloading.
  function resetApp(): void {
    const done = () => window.location.reload();
    const tasks: Promise<unknown>[] = [];
    if ('serviceWorker' in navigator) {
      tasks.push(
        navigator.serviceWorker
          .getRegistrations()
          .then((registrations) =>
            Promise.all(registrations.map((registration) => registration.unregister())),
          )
          .catch(() => undefined),
      );
    }
    if ('caches' in window) {
      tasks.push(
        caches
          .keys()
          .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
          .catch(() => undefined),
      );
    }
    void Promise.all(tasks).finally(done);
  }

  // ───────────────────────────────────────────────────────────────────
  // 4. HELPERS
  // ───────────────────────────────────────────────────────────────────

  function getThemeColors() {
    const root = document.documentElement;
    const dark =
      root.dataset.theme === 'dark' ||
      (root.dataset.theme !== 'light' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    return {
      surface: dark ? '#24221f' : '#f8f8f6',
      ink: dark ? '#f3f1ec' : '#24221f',
      muted: dark ? '#b8b3a9' : '#5f5b52',
      border: dark ? '#3a3733' : '#d9d5cc',
    };
  }
</script>

<svelte:boundary {onerror}>
  {@render children()}
  {#snippet failed(_error, _reset)}
    {@const themeColors = getThemeColors()}
    <main
      role="alert"
      style="min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px;background:{themeColors.surface};color:{themeColors.ink};box-sizing:border-box"
    >
      <div style="max-width:22rem;text-align:center">
        <h1 style="font-size:1.125rem;margin:0 0 0.5rem;font-weight:600">
          Pi Remote hit an unexpected error
        </h1>
        <p style="font-size:0.9375rem;line-height:1.5;margin:0 0 1.25rem;color:{themeColors.muted}">
          The app could not finish loading. Reload to try again. If it keeps happening, reset the
          app data to clear a stale install.
        </p>
        <div style="display:flex;gap:0.5rem;justify-content:center">
          <button
            type="button"
            onclick={reloadApp}
            style="appearance:none;cursor:pointer;border-radius:0.625rem;padding:0.625rem 1rem;font-size:0.9375rem;font-weight:600;border:1px solid {themeColors.border};background:{themeColors.ink};color:{themeColors.surface}"
          >
            Reload
          </button>
          <button
            type="button"
            onclick={resetApp}
            style="appearance:none;cursor:pointer;border-radius:0.625rem;padding:0.625rem 1rem;font-size:0.9375rem;font-weight:600;border:1px solid {themeColors.border};background:transparent;color:{themeColors.ink}"
          >
            Reset app data
          </button>
        </div>
      </div>
    </main>
  {/snippet}
</svelte:boundary>