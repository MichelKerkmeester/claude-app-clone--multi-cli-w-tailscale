// ───────────────────────────────────────────────────────────────────
// MODULE: Filtered Command Catalog (web)
// ───────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';

import type { CommandDescriptorDto } from '@pi-remote/pi-rpc-protocol';

import { fetchCommands } from './relay.js';

export type CommandCatalogStatus = 'loading' | 'ready' | 'error';

export interface CommandCatalogState {
  readonly commands: readonly CommandDescriptorDto[];
  readonly status: CommandCatalogStatus;
  readonly refresh: () => Promise<void>;
}

/** Load the relay-filtered command catalog. The relay already hid privileged rows. */
export function useCommands(): CommandCatalogState {
  const [commands, setCommands] = useState<readonly CommandDescriptorDto[]>([]);
  const [status, setStatus] = useState<CommandCatalogStatus>('loading');

  const refresh = useCallback(async () => {
    setStatus('loading');
    try {
      const catalog = await fetchCommands();
      setCommands(catalog.commands);
      setStatus('ready');
    } catch {
      setCommands([]);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { commands, status, refresh };
}
