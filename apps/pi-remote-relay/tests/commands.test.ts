// ───────────────────────────────────────────────────────────────────
// MODULE: Versioned Command Catalog Authority Tests
// ───────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import type { CommandBindingDto, PiRpcCommand, PiRpcResponse } from '@pi-remote/pi-rpc-protocol';

import type { RpcSupervisor } from '../src/rpc/supervisor.js';
import { CommandService } from '../src/commands/command-service.js';

const SESSION = 'session_local';
const HOST_EPOCH = 'epoch_command_authority';

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
  public rawData: unknown = RAW_COMMANDS;
  public send(command: PiRpcCommand): Promise<PiRpcResponse> {
    this.sent.push(command);
    return Promise.resolve({
      type: 'response',
      command: 'get_commands',
      success: true,
      data: this.rawData as PiRpcResponse['data'],
    });
  }
}

function service(fake: FakeSupervisor): CommandService {
  return new CommandService(fake as unknown as RpcSupervisor, {
    sessionId: SESSION,
    hostEpoch: HOST_EPOCH,
  });
}

function binding(
  catalog: { readonly hostEpoch: string; readonly sessionRevision: number; readonly catalogRevision: number },
  name: string,
): CommandBindingDto {
  return {
    hostEpoch: catalog.hostEpoch,
    name,
    sessionRevision: catalog.sessionRevision,
    catalogRevision: catalog.catalogRevision,
  };
}

describe('versioned command catalog authority', () => {
  it('exposes only safe commands with full versioned identity and never a path', async () => {
    const fake = new FakeSupervisor();
    const catalog = await service(fake).listCommands();

    const names = catalog.commands.map((command) => command.name);
    expect(names).toEqual(['plan', 'model']);
    expect(catalog.hostEpoch).toBe(HOST_EPOCH);
    expect(catalog.sessionId).toBe(SESSION);
    expect(catalog.sessionRevision).toBe(0);
    // The first snapshot allocates the initial catalog revision.
    expect(catalog.catalogRevision).toBe(1);
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
    expect(serialized.includes('Authenticate')).toBe(false);
  });

  it('projects aliases and argument hints only when the host metadata is safe', async () => {
    const fake = new FakeSupervisor();
    fake.rawData = {
      commands: [
        {
          name: 'review',
          description: 'Review changes',
          source: 'extension',
          aliases: ['r', '/bad-alias', 'r'],
          argumentHint: '<scope>',
          filename: 'review.ts',
          prompt: 'secret body',
        },
        {
          name: 'model',
          description: 'Pick a model',
          source: 'prompt',
          argumentHint: '/Users/secret/path',
          aliases: ['m'],
        },
      ],
    };
    const catalog = await service(fake).listCommands();
    const [review, model] = catalog.commands;
    expect(review?.name).toBe('review');
    expect(review?.aliases).toEqual(['r']);
    expect(review?.argumentHint).toBe('<scope>');
    expect(model?.aliases).toEqual(['m']);
    // An unsafe hint is omitted, never emitted.
    expect(model?.argumentHint).toBeUndefined();
    const serialized = JSON.stringify(catalog);
    for (const canary of [
      '/bad-alias',
      'filename',
      'review.ts',
      'secret body',
      '/Users/secret/path',
    ]) {
      expect(serialized.includes(canary)).toBe(false);
    }
  });

  it('advances the catalog revision only when the filtered content changes', async () => {
    const fake = new FakeSupervisor();
    const svc = service(fake);
    const first = await svc.listCommands();
    const unchanged = await svc.listCommands();
    expect(first.catalogRevision).toBe(1);
    expect(unchanged.catalogRevision).toBe(1);

    fake.rawData = { commands: [{ name: 'compact', source: 'prompt' }] };
    const changed = await svc.listCommands();
    expect(changed.catalogRevision).toBe(2);
    expect(changed.commands.map((command) => command.name)).toEqual(['compact']);
  });

  it('ages out bindings on settled-availability transitions and host invalidation', async () => {
    const fake = new FakeSupervisor();
    const svc = service(fake);
    const first = await svc.listCommands();
    expect(svc.getAvailability()).toBe('idle');

    svc.setAvailability('running');
    svc.setAvailability('idle');
    expect(svc.getAvailability()).toBe('idle');
    const afterTransitions = await svc.listCommands();
    expect(afterTransitions.sessionRevision).toBe(2);
    expect(await svc.revalidateSlashSubmission(binding(first, 'plan'))).toBe('stale_catalog');

    svc.invalidate();
    expect(svc.getSnapshot()).toBeNull();
    expect(svc.getAvailability()).toBe('idle');
    expect(await svc.revalidateSlashSubmission(binding(first, 'plan'))).toBe('stale_catalog');

    const reloaded = await svc.listCommands();
    expect(reloaded.hostEpoch).not.toBe(HOST_EPOCH);
    expect(await svc.revalidateSlashSubmission(binding(reloaded, 'plan'))).toBe('allowed');
  });

  it('revalidates a current binding as allowed and denies stale or hidden names', async () => {
    const fake = new FakeSupervisor();
    const svc = service(fake);
    const catalog = await svc.listCommands();

    expect(await svc.revalidateSlashSubmission(binding(catalog, 'plan'))).toBe('allowed');
    expect(await svc.revalidateSlashSubmission(binding(catalog, 'login'))).toBe('command_denied');
    expect(await svc.revalidateSlashSubmission(binding(catalog, 'unknown-command'))).toBe(
      'command_denied',
    );

    fake.rawData = { commands: [{ name: 'compact', source: 'prompt' }] };
    expect(await svc.revalidateSlashSubmission(binding(catalog, 'plan'))).toBe('stale_catalog');
    const reloaded = await svc.listCommands();
    expect(await svc.revalidateSlashSubmission(binding(reloaded, 'compact'))).toBe('allowed');
  });

  it('denies slash submission while a turn is running', async () => {
    const fake = new FakeSupervisor();
    const svc = service(fake);
    await svc.listCommands();

    svc.setAvailability('running');
    // A binding that is current under the running session revision is still denied.
    const runningCatalog = await svc.listCommands();
    expect(await svc.revalidateSlashSubmission(binding(runningCatalog, 'plan'))).toBe(
      'command_denied',
    );
    // The denial is decided without another host read.
    expect(fake.sent.filter((command) => command.type === 'get_commands')).toHaveLength(2);
  });
});
