import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import type { ChildProcessWithoutNullStreams, spawn as nodeSpawn } from 'node:child_process';

import { describe, expect, it, vi } from 'vitest';

import { RpcSupervisor } from '../src/rpc/supervisor.js';
import { RpcDemultiplexer } from '../src/rpc/demux.js';

function response(id: string, command: string): string {
  return `${JSON.stringify({ id, type: 'response', command, success: true })}\n`;
}

describe('supervisor settled mutation lane', () => {
  it('waits for the first response before writing the second mutation', async () => {
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    const child = Object.assign(new EventEmitter(), {
      stdin,
      stdout,
      stderr,
      exitCode: null,
      kill: vi.fn(),
    }) as unknown as ChildProcessWithoutNullStreams;
    const spawn = vi.fn(() => child) as unknown as typeof nodeSpawn;
    const order: string[] = [];
    let releaseFirst!: () => void;
    const firstResponse = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    stdin.on('data', (chunk: Buffer) => {
      const command = JSON.parse(chunk.toString('utf8')) as { id: string; type: string };
      order.push(`write:${command.id}`);
      if (command.id === 'mutation_1') {
        void firstResponse.then(() => {
          order.push('response:mutation_1');
          stdout.write(response(command.id, command.type));
        });
        return;
      }
      order.push('response:mutation_2');
      stdout.write(response(command.id, command.type));
    });

    const supervisor = new RpcSupervisor({ spawn, requestTimeoutMs: 200 });
    const started = supervisor.start();
    child.emit('spawn');
    await started;

    const first = supervisor.sendSettled({ id: 'mutation_1', type: 'abort' });
    const second = supervisor.sendSettled({ id: 'mutation_2', type: 'abort' });

    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(order).toEqual(['write:mutation_1']);

    releaseFirst();
    await expect(first).resolves.toMatchObject({ id: 'mutation_1', success: true });
    await expect(second).resolves.toMatchObject({ id: 'mutation_2', success: true });
    expect(order).toEqual([
      'write:mutation_1',
      'response:mutation_1',
      'write:mutation_2',
      'response:mutation_2',
    ]);
  });
});

describe('ask-question callback demultiplexing', () => {
  it('emits only a safe callback outcome and never forwards callback payload data', () => {
    const outcomes: unknown[] = [];
    const protocolErrors: Error[] = [];
    const demultiplexer = new RpcDemultiplexer({
      onEvent: () => undefined,
      onProtocolError: (error) => protocolErrors.push(error),
      askQuestionCallback: {
        matches: (record) =>
          typeof record === 'object' && record !== null && 'questionCallback' in record,
        map: () => ({ status: 'delivery-unknown' as const }),
        onOutcome: (outcome) => outcomes.push(outcome),
      },
    });

    demultiplexer.accept({
      type: 'response',
      id: 'callback_1',
      command: 'integration-defined',
      success: true,
      questionCallback: { prompt: 'callback-content-canary' },
    });

    expect(outcomes).toEqual([{ status: 'delivery-unknown' }]);
    expect(JSON.stringify(outcomes)).not.toContain('callback-content-canary');
    expect(protocolErrors).toEqual([]);
  });
});

describe('supervisor lifecycle subscription', () => {
  it('notifies listeners when the child spawns and closes', async () => {
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    const child = Object.assign(new EventEmitter(), {
      stdin,
      stdout,
      stderr,
      exitCode: null,
      kill: vi.fn(),
    }) as unknown as ChildProcessWithoutNullStreams;
    const spawn = vi.fn(() => child) as unknown as typeof nodeSpawn;
    const lifecycle: Array<{ state: string; reason: string }> = [];
    const supervisor = new RpcSupervisor({ spawn });
    supervisor.onLifecycle((event) => lifecycle.push(event));

    const started = supervisor.start();
    child.emit('spawn');
    await started;

    const stopping = supervisor.stop();
    child.emit('close', 0, null);
    await stopping;

    expect(lifecycle).toEqual([
      { state: 'running', reason: 'spawn' },
      { state: 'running', reason: 'exit' },
    ]);
  });
});
