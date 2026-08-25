<script module lang="ts">
  // This module holds the shared Composer Tools types and helpers.
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import type { RuntimeControls } from '$shared/state/runtime.js';
  import type { HostCommandCatalogState, SelectedCommandBinding } from '$shared/commands/commands.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export interface ComposerToolsProps {
    readonly runtimeControls: RuntimeControls;
    readonly catalog: HostCommandCatalogState;
    readonly onInsert: (name: string, binding: SelectedCommandBinding) => void;
    readonly onOpenChange: (open: boolean) => void;
    readonly mediaAvailable: boolean;
    readonly onFilesSelected: (files: FileList | null) => void;
    readonly shiftTabEnabled: boolean;
    readonly onShiftTabPreferenceChange: (enabled: boolean) => void;
  }

  // ───────────────────────────────────────────────────────────────────
  // 3. HELPERS
  // ───────────────────────────────────────────────────────────────────

  // Do not edit — tools popover status hint — Ported verbatim from SessionComposer.
  function statusHint(status: RuntimeControls['runtime']['status'], hasPending: boolean): string {
    switch (status) {
      case 'checking':
        return 'Checking runtime…';
      case 'pending':
        return hasPending ? 'Applying…' : 'Working…';
      case 'stale':
        return 'Refreshed — host changed';
      case 'error':
        return 'Unavailable — reconcile';
      default:
        return '';
    }
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 4. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { Popover } from 'bits-ui';
  import { hideOutside } from '$shared/primitives/a11y/aria-hide-outside.svelte.js';
  import Button from '$shared/primitives/button/button.svelte';
  import CommandPalette from './command-palette.svelte';
  import { ATTACHMENT_ACCEPT } from '../attachments/attachment-state.js';

  // ───────────────────────────────────────────────────────────────────
  // 5. PROPS
  // ───────────────────────────────────────────────────────────────────

  let {
    runtimeControls,
    catalog,
    onInsert,
    onOpenChange,
    mediaAvailable,
    onFilesSelected,
    shiftTabEnabled,
    onShiftTabPreferenceChange,
  }: ComposerToolsProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 6. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  // Bits Popover open is mirrored locally; host hears every transition.
  let open = $state(false);
  let contentEl = $state<HTMLElement | null>(null);
  let toolsDialogEl = $state<HTMLElement | null>(null);

  // Hidden file inputs reset value='' so repeat picks of the same file still fire onchange.
  let photoLibraryInput = $state<HTMLInputElement | null>(null);
  let takePhotoInput = $state<HTMLInputElement | null>(null);

  // Bridge focus-visible from the hidden checkbox input to its label.
  let checkboxFocusVisible = $state(false);

  // ───────────────────────────────────────────────────────────────────
  // 7. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const runtime = $derived(runtimeControls.runtime);

  // ───────────────────────────────────────────────────────────────────
  // 8. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  // Keep this effect synchronized with the state it observes.
  $effect(() => {
    if (contentEl === null) return;
    return hideOutside([contentEl]);
  });

  // ───────────────────────────────────────────────────────────────────
  // 9. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  // Keep handle open change focused on its single responsibility.
  function handleOpenChange(next: boolean): void {
    onOpenChange(next);
  }

  // Keep open photo library focused on its single responsibility.
  function openPhotoLibrary(): void {
    photoLibraryInput?.click();
  }

  // Keep open take photo focused on its single responsibility.
  function openTakePhoto(): void {
    takePhotoInput?.click();
  }

  // Keep on file change focused on its single responsibility.
  function onFileChange(event: Event): void {
    const target = event.currentTarget;
    if (target instanceof HTMLInputElement) {
      onFilesSelected(target.files);
      target.value = '';
    }
  }

  // Keep on checkbox focus focused on its single responsibility.
  function onCheckboxFocus(event: FocusEvent): void {
    const target = event.currentTarget;
    checkboxFocusVisible = target instanceof HTMLInputElement && target.matches(':focus-visible');
  }

  // Keep on checkbox blur focused on its single responsibility.
  function onCheckboxBlur(): void {
    checkboxFocusVisible = false;
  }

  // Keep on checkbox change focused on its single responsibility.
  function onCheckboxChange(event: Event): void {
    const target = event.currentTarget;
    if (target instanceof HTMLInputElement) onShiftTabPreferenceChange(target.checked);
  }
</script>

<!-- Component content -->
{#snippet plusGlyph()}
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
    <path
      d="M12 5v14M5 12h14"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
    />
  </svg>
{/snippet}

<!-- Do not edit — tools popover react-aria wiring (DialogTrigger / Popover / Dialog) — Unchanged. -->
<Popover.Root bind:open onOpenChange={handleOpenChange}>
  <!-- This slot: tools-trigger — the "+" popover trigger. -->
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        aria-haspopup={undefined}
        class="composer--plus"
        data-attachment-plus={mediaAvailable ? true : undefined}
        aria-label={mediaAvailable ? 'Add photo, mode, or command' : 'Mode and commands'}
      >
        {@render plusGlyph()}
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content
    class="composer-tools--popover"
    side="top"
    align="start"
    bind:ref={contentEl}
    onOpenAutoFocus={(event) => {
      event.preventDefault();
      toolsDialogEl?.focus();
    }}
  >
    <button
      type="button"
      class="sr-only"
      tabindex="-1"
      aria-label="Dismiss"
      onclick={() => {
        open = false;
      }}
    ></button>
    <div
      class="composer-tools"
      role="dialog"
      aria-label="Session tools"
      tabindex="-1"
      bind:this={toolsDialogEl}
    >
      {#if mediaAvailable}
        <section class="tools--group tools-photo-group" aria-labelledby="photo-tools-label">
          <span class="tools--label" id="photo-tools-label">
            Photos
          </span>
          <div class="tools--photo-actions">
            <input
              bind:this={photoLibraryInput}
              type="file"
              accept={ATTACHMENT_ACCEPT}
              multiple
              onchange={onFileChange}
              style="display:none"
            />
            <Button class="tools--action" onclick={openPhotoLibrary}>Photo Library</Button>
            <input
              bind:this={takePhotoInput}
              type="file"
              accept={ATTACHMENT_ACCEPT}
              capture="environment"
              onchange={onFileChange}
              style="display:none"
            />
            <Button class="tools--action" onclick={openTakePhoto}>Take Photo</Button>
          </div>
          <p class="tools--disclosure">
            Photos stay on this iPhone until Send. Pi and its model provider receive a
            prepared copy.
          </p>
        </section>
        <div class="tools--divider"></div>
      {/if}
      <section class="tools--group">
        <span class="tools--label">Commands</span>
        <CommandPalette
          {catalog}
          onInsert={onInsert}
          isDisabled={catalog.snapshot === null}
        />
      </section>

      <section class="tools--group">
        <span class="tools--label">Keyboard</span>
        <label
          class="tools--checkbox"
          data-selected={shiftTabEnabled ? true : undefined}
          data-focus-visible={checkboxFocusVisible ? true : undefined}
        >
          <span class="react-aria-Checkbox-indicator" aria-hidden="true">
            {#if shiftTabEnabled}
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <path
                  d="m3 8 3 3 7-7"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            {/if}
          </span>
          <input
            type="checkbox"
            checked={shiftTabEnabled}
            onchange={onCheckboxChange}
            onfocus={onCheckboxFocus}
            onblur={onCheckboxBlur}
            style="position:absolute;opacity:0;inset:0;margin:0;cursor:inherit"
          />
          CLI-style Shift+Tab in composer
        </label>
      </section>

      <span class="tools--status" role="status" aria-live="polite">
        {statusHint(runtime.status, runtime.pending !== null)}
      </span>
    </div>
    <button
      type="button"
      class="sr-only"
      tabindex="-1"
      aria-label="Dismiss"
      onclick={() => {
        open = false;
      }}
    ></button>
  </Popover.Content>
</Popover.Root>

<!-- Composer tools -->
<!-- This surface: composer-tools — the "+" tools popover. Decomposed into this scoped block;
     composer-tools / tools--checkbox / tools--photo-actions / tools--action / tools--disclosure /
     tools--divider / tools--status / composer--plus are owned solely by this component so they
     move with it. Shared .tools--group / .tools--label (also used by SessionHeader) and the
     shared grouped selectors .session--sheet-popover, .composer-tools--popover and the
     .composer--plus members of the prefers-contrast / forced-colors / 44px-target groups stay
     GLOBAL in app.css. Child-primitive classes and react-aria/runtime data-attributes use
     :global so Svelte scoping cannot drop them. Values unchanged. -->
<style>
  /* This surface: session-sheet — in-session overflow popover (nav · theme), shared chrome with the composer toolset. */
  /* This slot: tools-popover — the "+" popover chrome; shared with the session-sheet surface. */
  :global(.composer-tools--popover) {
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface-raised);
    box-shadow: var(--shadow-raised);
  }

  /* This slot: tools-trigger — the "+" popover trigger. */
  :global(.composer--plus) {
    display: grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: transparent;
    color: var(--ink-secondary);
    cursor: pointer;
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.composer--plus[data-hovered]),
  :global(.composer--plus[data-pressed]) {
    background: var(--surface-muted);
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.composer--plus[data-focus-visible]) {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  /* Keyboard preference row in the tools popover. */
  .tools--checkbox {
    display: flex;
    min-block-size: 44px;
    align-items: center;
    gap: var(--space-2);
    color: var(--ink-secondary);
    font-size: 0.85rem;
    cursor: pointer;
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.tools--checkbox .react-aria-Checkbox-indicator) {
    display: grid;
    flex: none;
    width: 1.25rem;
    height: 1.25rem;
    place-items: center;
    border: 1px solid var(--control-border);
    border-radius: 0.35rem;
    background: var(--surface);
    color: var(--ink-inverse);
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.tools--checkbox[data-selected] .react-aria-Checkbox-indicator) {
    border-color: var(--ink);
    background: var(--ink);
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.tools--checkbox[data-focus-visible] .react-aria-Checkbox-indicator) {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .tools--photo-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-2);
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.tools--action) {
    min-block-size: 44px;
    padding-inline: var(--space-2);
    border: 1px solid var(--control-border);
    border-radius: var(--radius-control);
    background: var(--surface);
    color: var(--ink);
    font-size: 0.82rem;
    font-weight: 650;
    cursor: pointer;
  }

  /* Keep this rule aligned with its surrounding surface. */
  :global(.tools--action[data-hovered]),
  :global(.tools--action[data-pressed]) {
    background: var(--accent-soft);
  }

  /* Keep this rule aligned with its surrounding surface. */
  .tools--disclosure {
    margin: var(--space-1) 0 0;
    color: var(--ink-muted);
    font-family: var(--font-display);
    font-size: 0.84rem;
    line-height: 1.35;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .tools--divider {
    block-size: 1px;
    background: var(--line);
  }

  @media (max-width: 20rem) {
    /* Keep this rule aligned with its surrounding surface. */
    .tools--photo-actions {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  /* Tools popover: model, effort, Build/Plan, and commands — one tap from "+". */
  .composer-tools {
    display: grid;
    gap: var(--space-3);
    width: min(88vw, 20rem);
    padding: var(--space-4);
    outline: none;
  }

  /* Keep this rule aligned with its surrounding surface. */
  .tools--status {
    min-height: 1rem;
    color: var(--ink-muted);
    font-size: 0.72rem;
  }
</style>
