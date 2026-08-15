// ───────────────────────────────────────────────────────────────────
// MODULE: Filtered Command Catalog Tests
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import type { PiRpcCommand, PiRpcResponse } from '@pi-remote/pi-rpc-protocol';

import type { RpcSupervisor } from '../src/rpc/supervisor.js';
import { CommandService } from '../src/commands/command-service.js';

const SESSION = 'session_local';

const RAW_COMMANDS = [
  { name: 'plan', description: 'Toggle plan mode', source: 'extension', path: '/x/plan.ts' },
  { name: 'model', description: 'Pick a model', source: 'prompt' },
  { name: 'login', description: 'Authenticate', source: 'prompt' },
  { name: 'reload', description: 'Reload extensions', source: 'prompt' },
  { name: 'share-session', description: 'Share', source: 'prompt' },
  { name: 'install', description: 'Install a package', source: 'prompt' },
  { name: '!', description: 'user bash', source: 'prompt' },
  { name: '/usr/bin/evil', description: 'path name', source: 'prompt' },
  { name: 'revoke-device', description: 'Revoke', source: 'prompt' },
];

class FakeSupervisor {
  public sent: PiRpcCommand[] = [];
  public send(command: PiRpcCommand): Promise<PiRpcResponse> {
    this.sent.push(command);
    return Promise.resolve({
      type: 'response',
      command: 'get_commands',
      success: true,
      data: RAW_COMMANDS as unknown as PiRpcResponse['data'],
    });
  }
}

function service(fake: FakeSupervisor): CommandService {
  return new CommandService(fake as unknown as RpcSupervisor, { sessionId: SESSION });
}

describe('command catalog filtering', () => {
  it('exposes only safe commands and never a path or privileged action', async () => {
    const fake = new FakeSupervisor();
    const catalog = await service(fake).listCommands();

    const names = catalog.commands.map((command) => command.name);
    expect(names).toEqual(['plan', 'model']);
    // Privileged, bang, and path-like commands are all hidden.
    for (const hidden of [
      'login',
      'reload',
      'share-session',
      'install',
      '!',
      '/usr/bin/evil',
      'revoke-device',
    ]) {
      expect(names).not.toContain(hidden);
    }
    const serialized = JSON.stringify(catalog);
    expect(serialized.includes('/x/plan.ts')).toBe(false);
    expect(serialized.includes('path')).toBe(false);
  });

  it('assigns and advances a catalog revision', async () => {
    const svc = service(new FakeSupervisor());
    const first = await svc.listCommands();
    const second = await svc.listCommands();
    expect(first.revision).toBe(0);
    expect(second.revision).toBe(1);
  });

  it('revalidates slash commands against the filtered catalog', async () => {
    const svc = service(new FakeSupervisor());
    expect(await svc.isSlashCommandAllowed('plan')).toBe(true);
    expect(await svc.isSlashCommandAllowed('login')).toBe(false);
    expect(await svc.isSlashCommandAllowed('unknown-command')).toBe(false);
  });
});
