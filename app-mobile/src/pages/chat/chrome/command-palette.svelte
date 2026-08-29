<script module lang="ts">
  // This module holds the shared Command Palette types and helpers.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: Slash Command Palette (typed / commands)
  // ───────────────────────────────────────────────────────────────────
  // Session-scoped slash insertion via rankHostCommands; selection drafts only, never submits.

  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import type { HostCommandCatalogState, SelectedCommandBinding } from '$shared/commands/commands.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  export interface CommandPaletteProps {
    readonly catalog: HostCommandCatalogState;
    readonly onInsert: (name: string, binding: SelectedCommandBinding) => void;
    readonly isDisabled?: boolean;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 3. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { Combobox } from 'bits-ui';

  import { hideOutside } from '$shared/primitives/a11y/aria-hide-outside.svelte.js';
  import { bindingFor } from '$shared/commands/commands.js';
  import { rankHostCommands } from '$shared/commands/rank-host-commands.js';

  // ───────────────────────────────────────────────────────────────────
  // 4. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { catalog, onInsert, isDisabled = false }: CommandPaletteProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 5. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let query = $state('');
  // Never retains a selection — a local insertion trigger only (selectedKey={null}).
  let selected = $state('');
  let open = $state(false);
  let contentEl = $state<HTMLElement | null>(null);
  let inputEl: HTMLInputElement | null = null;

  // ───────────────────────────────────────────────────────────────────
  // 6. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  // Ranker owns filtering; Bits must not apply its own input filtering.
  // Do not edit — ranker — Deterministic host-command ranking.
  const ranked = $derived.by(() => rankHostCommands(catalog.commands, query));
  const placeholder = $derived(
    catalog.status === 'loading'
      ? 'Loading commands…'
      : isDisabled
        ? 'Commands unavailable'
        : '/ command',
  );

  // ───────────────────────────────────────────────────────────────────
  // 7. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  // Keep this effect synchronized with the state it observes.
  $effect(() => {
    if (contentEl === null) return;
    const targets: Element[] = [contentEl];
    // Keep the combobox input in the a11y tree while portalled content is open.
    if (inputEl !== null) targets.push(inputEl);
    return hideOutside(targets);
  });

  // ───────────────────────────────────────────────────────────────────
  // 8. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  // Keep on query input focused on its single responsibility.
  function onQueryInput(event: Event): void {
    const target = event.currentTarget;
    if (target instanceof HTMLInputElement) query = target.value;
  }

  // Keep on input focus focused on its single responsibility.
  function onInputFocus(): void {
    if (!isDisabled) open = true;
  }

  // Keep chain handler focused on its single responsibility.
  function chainHandler(fromBits: unknown, event: Event): void {
    if (typeof fromBits === 'function') (fromBits as (event: Event) => void)(event);
  }

  // Keep on selected change focused on its single responsibility.
  function onSelectedChange(name: string): void {
    selected = '';
    if (name.length === 0) return;
    // Binding must match the scoped snapshot; selection drafts only, never submits.
    // Do not edit — fail-closed — Selection is a local insertion draft only.
    const binding = bindingFor(catalog.snapshot, name);
    if (binding === null) return;
    onInsert(name, binding);
  }
</script>

<!-- Component content -->
<!-- Ranking, bindings, and the fail-closed selection path are frozen. -->
<!-- Slash autocomplete > -->
<!-- This surface: slash-autocomplete -->
<!-- Do not edit — React-aria wiring — ComboBox select/focus lifecycle and aria/role map to Bits Combobox. -->
<Combobox.Root
  type="single"
  disabled={isDisabled}
  bind:open
  bind:value={selected}
  onValueChange={onSelectedChange}
>
  <div class="command--palette">
    <Combobox.Input>
      {#snippet child({ props })}
        <input
          bind:this={inputEl}
          {...props}
          aria-label="Insert a command"
          aria-busy={catalog.status === 'loading' ? 'true' : undefined}
          placeholder={placeholder}
          value={query}
          oninput={(event) => {
            chainHandler(props.oninput, event);
            onQueryInput(event);
          }}
          onfocus={(event) => {
            chainHandler(props.onfocus, event);
            onInputFocus();
          }}
        />
      {/snippet}
    </Combobox.Input>
    <Combobox.Trigger class="command--trigger" aria-label="Show commands">
      <span class="command--trigger-chrome" aria-hidden="true">/</span>
    </Combobox.Trigger>
    <Combobox.Portal>
      <Combobox.Content class="react-aria-Popover" bind:ref={contentEl}>
        <Combobox.Viewport class="react-aria-ListBox">
          {#if ranked.items.length === 0}
            <!-- This state: ready.emptyCatalog — no ranked commands; fail-closed empty copy. -->
            <span class="command--empty">No commands</span>
          {:else}
            {#each ranked.items as item (item.name)}
              <!-- This slot: label — the command name and its description line. -->
              <!-- This state: disabled-with-reason — a row rendered but not selectable. -->
              <Combobox.Item
                value={item.name}
                label={item.name}
                disabled={!item.enabled}
              >
                {#snippet child({ props, highlighted })}
                  <div
                    {...props}
                    class="react-aria-ListBoxItem"
                    data-focused={highlighted ? true : undefined}
                    data-hovered={highlighted ? true : undefined}
                  >
                    <span class="command--name">/{item.name}</span>
                    {#if item.description !== null}
                      <span class="command--desc">{item.description}</span>
                    {/if}
                  </div>
                {/snippet}
              </Combobox.Item>
            {/each}
          {/if}
        </Combobox.Viewport>
      </Combobox.Content>
    </Combobox.Portal>
  </div>
</Combobox.Root>

<!-- Slash autocomplete -->
<!-- This surface: slash-autocomplete — the command palette. Decomposed into this scoped block;
     command--palette owns the field row; the input and trigger chrome live here.
     command--empty / command--name / command--desc inherit the shared overlay
     primitives. Shared .react-aria-Popover / .react-aria-ListBox /
     .react-aria-ListBoxItem stay GLOBAL — they style every react-aria dropdown
     (Select / ComboBox). Child-primitive classes and react-aria/runtime
     data-attributes use :global so Svelte scoping cannot drop them. -->
<style>
  /* ───────────────────────────────────────────────────────────────────
     1. FIELD ROW
  ─────────────────────────────────────────────────────────────────── */
  /* This surface: slash-autocomplete — the inline autocomplete card and the
     command palette share this surface name. */
  /* Lays the command field and the slash trigger on one row inside the
     tools popover width. */
  .command--palette {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    min-inline-size: 0;
    width: 100%;
  }

  /* Matches the sibling prompts field: bordered, padded, 44px-tall control. */
  .command--palette input {
    flex: 1 1 auto;
    min-inline-size: 0;
    min-block-size: 44px;
    margin: 0;
    padding-block: 0;
    padding-inline: var(--space-2);
    appearance: none;
    border: 1px solid var(--control-border);
    border-radius: var(--radius-control);
    background: var(--surface);
    color: var(--ink);
    font-family: inherit;
    font-size: 0.82rem;
    font-weight: 650;
  }

  /* Keep placeholder ink on the muted role so empty-state copy stays secondary. */
  .command--palette input::placeholder {
    color: var(--placeholder);
  }

  /* This state: disabled — authority is unavailable; the field stays readable
     but not operable. */
  .command--palette input:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }

  /* ───────────────────────────────────────────────────────────────────
     2. SLASH TRIGGER
  ─────────────────────────────────────────────────────────────────── */
  /* Combobox.Trigger renders a bits-ui button, so the hit-box rule is :global. */
  /* Do not edit — >=44px interactive target (WCAG). Only the inner face may shrink. */
  .command--palette :global(.command--trigger) {
    display: grid;
    flex: none;
    inline-size: 44px;
    block-size: 44px;
    min-inline-size: 44px;
    min-block-size: 44px;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--ink);
    cursor: pointer;
  }

  /* Paints the slash on a compact face so the extra hit area stays clear of the field. */
  .command--trigger-chrome {
    display: grid;
    inline-size: var(--space-6);
    block-size: var(--space-6);
    min-inline-size: var(--space-6);
    min-block-size: var(--space-6);
    place-items: center;
    border: 1px solid var(--control-border);
    border-radius: var(--radius-control);
    background: var(--surface);
    font-size: 0.82rem;
    font-weight: 650;
    line-height: 1;
  }

  /* This state: focus-visible — suppress the shared ring on the hit box so it can hug the face. */
  .command--palette :global(.command--trigger:focus-visible) {
    outline: none;
  }

  /* This state: focus-visible — the ring follows the painted face, not the invisible 44px box. */
  :global(.command--trigger:focus-visible) .command--trigger-chrome {
    outline: 3px solid var(--focus);
    outline-offset: 2px;
  }

  /* This state: disabled — the slash control tracks the field's unavailable treatment. */
  .command--palette :global(.command--trigger:disabled) {
    cursor: not-allowed;
    opacity: 0.4;
  }
</style>
