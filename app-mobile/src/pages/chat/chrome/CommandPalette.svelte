<script module lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: Slash Command Palette (typed / commands)
  // ───────────────────────────────────────────────────────────────────
  // Discoverable slash-command insertion over the shared session-scoped
  // catalog. Filtering is local and deterministic (rankHostCommands); the
  // palette renders whatever snapshot the session lifecycle committed, and
  // selecting a row inserts the canonical `/${name} ` draft with a revision
  // binding — it NEVER submits, and only relay-filtered (non-privileged)
  // commands are ever offered.

  import type { HostCommandCatalogState, SelectedCommandBinding } from '$shared/data/commands.js';

  export interface CommandPaletteProps {
    readonly catalog: HostCommandCatalogState;
    readonly onInsert: (name: string, binding: SelectedCommandBinding) => void;
    readonly isDisabled?: boolean;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 1. IMPORTS
  // ───────────────────────────────────────────────────────────────────

  import { Combobox } from 'bits-ui';

  import { hideOutside } from '$shared/primitives/ariaHideOutside.svelte.js';
  import { bindingFor } from '$shared/data/commands.js';
  import { rankHostCommands } from '$shared/data/rankHostCommands.js';

  // ───────────────────────────────────────────────────────────────────
  // 2. PROPS
  // ───────────────────────────────────────────────────────────────────

  let { catalog, onInsert, isDisabled = false }: CommandPaletteProps = $props();

  // ───────────────────────────────────────────────────────────────────
  // 3. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  let query = $state('');
  // Never retains a selection — a local insertion trigger only (selectedKey={null}).
  let selected = $state('');
  let open = $state(false);
  let contentEl = $state<HTMLElement | null>(null);
  let inputEl: HTMLInputElement | null = null;

  // ───────────────────────────────────────────────────────────────────
  // 4. EFFECTS
  // ───────────────────────────────────────────────────────────────────

  $effect(() => {
    if (contentEl === null) return;
    const targets: Element[] = [contentEl];
    // The combobox input is the active anchor for the open listbox and remains
    // in the accessibility tree while its portalled content is visible.
    if (inputEl !== null) targets.push(inputEl);
    return hideOutside(targets);
  });

  // ───────────────────────────────────────────────────────────────────
  // 5. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  // Filtering is deterministic and owned by the frozen ranker; the palette renders
  // exactly the ranked snapshot. Bits must not apply its own input filtering.
  // @ds guardrail: ranker — deterministic host-command ranking.
  const ranked = $derived.by(() => rankHostCommands(catalog.commands, query));

  // ───────────────────────────────────────────────────────────────────
  // 6. HANDLERS
  // ───────────────────────────────────────────────────────────────────

  function onQueryInput(event: Event): void {
    const target = event.currentTarget;
    if (target instanceof HTMLInputElement) query = target.value;
  }

  function onInputFocus(): void {
    if (!isDisabled) open = true;
  }

  function chainHandler(fromBits: unknown, event: Event): void {
    if (typeof fromBits === 'function') (fromBits as (event: Event) => void)(event);
  }

  function onSelectedChange(name: string): void {
    selected = '';
    if (name.length === 0) return;
    // Bindings only exist inside the current scoped snapshot; anything
    // else fails closed without touching the draft. This selection path
    // only ever requests an insertion draft — it never submits.
    // @ds guardrail: fail-closed — selection is a local insertion draft only.
    const binding = bindingFor(catalog.snapshot, name);
    if (binding === null) return;
    onInsert(name, binding);
  }
</script>

<!-- The render only restyles; the ranking-awarded collection, bindings, and the
     fail-closed selection path below are frozen. -->
<!-- @ds surface: slash-autocomplete -->
<!-- @ds guardrail: react-aria wiring — ComboBox select/focus lifecycle and aria/role.
     Maps to Bits Combobox. -->
<Combobox.Root
  type="single"
  disabled={isDisabled}
  bind:open
  bind:value={selected}
  onValueChange={onSelectedChange}
>
  <div class="command-palette">
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
            <!-- @ds state: ready.emptyCatalog — no ranked commands; fail-closed empty copy. -->
            <span class="command-empty">No commands</span>
          {:else}
            {#each ranked.items as item (item.name)}
              <!-- @ds slot: label — the command name and its description line. -->
              <!-- @ds state: disabled-with-reason — a row rendered but not selectable. -->
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
                    <span class="command-name">/{item.name}</span>
                    {#if item.description !== null}
                      <span class="command-desc">{item.description}</span>
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

<!-- @ds surface: slash-autocomplete — the command palette. Decomposed into this scoped block;
     command-palette / command-empty / command-name / command-desc have no owned
     declarations in the original stylesheet (they inherit the shared overlay
     primitives). Shared .react-aria-Popover / .react-aria-ListBox /
     .react-aria-ListBoxItem stay GLOBAL — they style every react-aria dropdown
     (Select / ComboBox). Child-primitive classes and react-aria/runtime
     data-attributes use :global so Svelte scoping cannot drop them. Values unchanged. -->
<style>
  /* @ds surface: slash-autocomplete — the inline autocomplete card and the
     command palette share this surface name. */
  /* `.command-palette`, `.command-empty`, `.command-name`, and `.command-desc`
     carry structure only; the original stylesheet has no owned declarations
     for them. Shared overlay primitives stay in app.css:
     .react-aria-Popover, .react-aria-ListBox, .react-aria-ListBoxItem. */
</style>
