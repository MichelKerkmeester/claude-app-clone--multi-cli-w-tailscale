// ───────────────────────────────────────────────────────────────────
// MODULE: Slash Command Palette (typed / commands)
// ───────────────────────────────────────────────────────────────────
// Discoverable slash-command insertion over the shared session-scoped
// catalog. Filtering is local and deterministic (rankHostCommands); the
// palette renders whatever snapshot the session lifecycle committed, and
// selecting a row inserts the canonical `/${name} ` draft with a revision
// binding — it NEVER submits, and only relay-filtered (non-privileged)
// commands are ever offered.

import { useMemo, useState } from 'react';
import { Button, ComboBox, Input, ListBox, ListBoxItem, Popover } from 'react-aria-components';
import type { Key } from 'react-aria-components';

import {
  bindingFor,
  type HostCommandCatalogState,
  type SelectedCommandBinding,
} from './commands.js';
import { rankHostCommands, type RankedHostCommand } from './rankHostCommands.js';

export function CommandPalette({
  catalog,
  onInsert,
  isDisabled = false,
}: {
  readonly catalog: HostCommandCatalogState;
  readonly onInsert: (name: string, binding: SelectedCommandBinding) => void;
  readonly isDisabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  // Filtering is deterministic and owned by the frozen ranker; the palette renders
  // exactly the ranked snapshot.
  // @ds guardrail: ranker — deterministic host-command ranking.
  const ranked = useMemo(
    () => rankHostCommands(catalog.commands, query),
    [catalog.commands, query],
  );

  return (
    // The render only restyles; the ranking-awarded collection, bindings, and the
    // fail-closed selection path below are frozen.
    // @ds surface: slash-autocomplete
    // @ds guardrail: react-aria wiring — ComboBox select/focus lifecycle and aria/role.
    <ComboBox
      aria-label="Insert a command"
      className="command-palette"
      isDisabled={isDisabled}
      menuTrigger="focus"
      allowsEmptyCollection
      selectedKey={null}
      items={ranked.items}
      // Ranking is already applied; keep the collection exactly as ranked.
      defaultFilter={() => true}
      onSelectionChange={(key: Key | null) => {
        if (key === null) return;
        const name = String(key);
        // Bindings only exist inside the current scoped snapshot; anything
        // else fails closed without touching the draft. This selection path
        // only ever requests an insertion draft — it never submits.
        // @ds guardrail: fail-closed — selection is a local insertion draft only.
        const binding = bindingFor(catalog.snapshot, name);
        if (binding === null) return;
        onInsert(name, binding);
      }}
    >
      <Input
        placeholder="/ command"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <Button aria-label="Show commands">/</Button>
      <Popover>
        <ListBox renderEmptyState={() => (
          // @ds state: ready.emptyCatalog — no ranked commands; fail-closed empty copy.
          <span className="command-empty">No commands</span>
        )}>
          {(item: RankedHostCommand) => (
            // @ds slot: label — the command name and its description line.
            // @ds state: disabled-with-reason — a row rendered but not selectable.
            <ListBoxItem
              key={item.name}
              id={item.name}
              textValue={item.name}
              isDisabled={!item.enabled}
            >
              <span className="command-name">{`/${item.name}`}</span>
              {item.description !== null && (
                <span className="command-desc">{item.description}</span>
              )}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </ComboBox>
  );
}
