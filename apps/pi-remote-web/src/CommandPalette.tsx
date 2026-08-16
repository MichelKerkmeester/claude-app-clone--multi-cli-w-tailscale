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
  const ranked = useMemo(
    () => rankHostCommands(catalog.commands, query),
    [catalog.commands, query],
  );

  return (
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
        // else fails closed without touching the draft.
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
        <ListBox renderEmptyState={() => <span className="command-empty">No commands</span>}>
          {(item: RankedHostCommand) => (
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
