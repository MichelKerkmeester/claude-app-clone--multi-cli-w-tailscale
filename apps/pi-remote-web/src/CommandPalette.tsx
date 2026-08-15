// ───────────────────────────────────────────────────────────────────
// MODULE: Slash Command Palette (typed / commands)
// ───────────────────────────────────────────────────────────────────

import { Button, ComboBox, Input, ListBox, ListBoxItem, Popover } from 'react-aria-components';
import type { Key } from 'react-aria-components';

import type { CommandDescriptorDto } from '@pi-remote/pi-rpc-protocol';

/**
 * Discoverable slash-command insertion. Selecting a command inserts `/name ` into the
 * composer draft and returns focus there — it NEVER submits, and only relay-filtered
 * (non-privileged) commands are ever offered.
 */
export function CommandPalette({
  commands,
  onInsert,
  isDisabled = false,
}: {
  readonly commands: readonly CommandDescriptorDto[];
  readonly onInsert: (text: string) => void;
  readonly isDisabled?: boolean;
}) {
  return (
    <ComboBox
      aria-label="Insert a command"
      className="command-palette"
      isDisabled={isDisabled}
      menuTrigger="focus"
      allowsEmptyCollection
      selectedKey={null}
      onSelectionChange={(key: Key | null) => {
        if (key !== null) onInsert(`/${String(key)} `);
      }}
    >
      <Input placeholder="/ command" />
      <Button aria-label="Show commands">/</Button>
      <Popover>
        <ListBox renderEmptyState={() => <span className="command-empty">No commands</span>}>
          {commands.map((command) => (
            <ListBoxItem key={command.name} id={command.name} textValue={command.name}>
              <span className="command-name">{`/${command.name}`}</span>
              {command.description !== null && (
                <span className="command-desc">{command.description}</span>
              )}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </ComboBox>
  );
}
