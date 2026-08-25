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
          placeholder="/ command"
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
    <Combobox.Trigger aria-label="Show commands">/</Combobox.Trigger>
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
     command--palette / command--empty / command--name / command--desc have no owned
     declarations in the original stylesheet (they inherit the shared overlay
     primitives). Shared .react-aria-Popover / .react-aria-ListBox /
     .react-aria-ListBoxItem stay GLOBAL — they style every react-aria dropdown
     (Select / ComboBox). Child-primitive classes and react-aria/runtime
     data-attributes use :global so Svelte scoping cannot drop them. Values unchanged. -->
<style>
  /* This surface: slash-autocomplete — the inline autocomplete card and the
     command palette share this surface name. */
  /* `.command--palette`, `.command--empty`, `.command--name`, and `.command--desc`
     carry structure only; the original stylesheet has no owned declarations
     for them. Shared overlay primitives stay in app.css:
     .react-aria-Popover, .react-aria-ListBox, .react-aria-ListBoxItem. */
</style>
