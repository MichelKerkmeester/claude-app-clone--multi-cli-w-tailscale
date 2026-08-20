// ───────────────────────────────────────────────────────────────────
// MODULE: RPC Framing and Demultiplexer Tests
// ───────────────────────────────────────────────────────────────────

import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import type { ChildProcessWithoutNullStreams, spawn as nodeSpawn } from 'node:child_process';

import { describe, expect, it, vi } from 'vitest';

import { fullAccessPiArguments } from '../src/index.js';
import { RpcDemultiplexer } from '../src/rpc/demux.js';
import { StrictJsonlDecoder } from '../src/rpc/framing.js';
import { RpcSupervisor } from '../src/rpc/supervisor.js';

describe('strict LF JSONL framing', () => {
  it('splits only on LF and preserves Unicode line separators', () => {
    const records: unknown[] = [];
    const errors: Error[] = [];
    const decoder = new StrictJsonlDecoder({
      onRecord: (record) => records.push(record),
      onError: (error) => errors.push(error),
    });

    const text = `left${String.fromCodePoint(0x2028)}middle${String.fromCodePoint(0x2029)}right`;
    const bytes = Buffer.from(`${JSON.stringify({ type: 'agent_start', text })}\n`, 'utf8');
    decoder.push(bytes.subarray(0, 17));
    decoder.push(bytes.subarray(17));
    decoder.finish();

    expect(errors).toEqual([]);
    expect(records).toEqual([{ type: 'agent_start', text }]);
  });

  it('reports malformed and empty records without emitting them', () => {
    const onRecord = vi.fn();
    const onError = vi.fn();
    const decoder = new StrictJsonlDecoder({ onRecord, onError });

    decoder.push('\n{broken}\n');

    expect(onRecord).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(2);
  });

  it('rejects CRLF and a final frame without LF', () => {
    const records: unknown[] = [];
    const errors: Error[] = [];
    const decoder = new StrictJsonlDecoder({
      onRecord: (record) => records.push(record),
      onError: (error) => errors.push(error),
    });

    decoder.push('{"type":"agent_start"}\r\n');
    decoder.push('{"type":"agent_start"}');
    decoder.finish();

    expect(records).toEqual([]);
    expect(errors.map((error) => error.message)).toEqual([
      'RPC JSONL requires LF delimiters without carriage returns.',
      'RPC JSONL stream ended without an LF delimiter.',
    ]);
  });
});

describe('response and event demultiplexing', () => {
  it('resolves correlated responses while events remain independent', async () => {
    const events: unknown[] = [];
    const errors: Error[] = [];
    const demux = new RpcDemultiplexer({
      onEvent: (event) => events.push(event),
      onProtocolError: (error) => errors.push(error),
    });
    const pending = demux.expect('request_1', 100);

    demux.accept({ type: 'agent_start' });
    demux.accept({
      id: 'request_1',
      type: 'response',
      command: 'get_state',
      success: true,
      data: {},
    });

    await expect(pending).resolves.toMatchObject({ id: 'request_1', success: true });
    expect(events).toEqual([{ type: 'agent_start' }]);
    expect(errors).toEqual([]);
  });

  it('rejects unknown records and unknown response ids', () => {
    const errors: Error[] = [];
    const demux = new RpcDemultiplexer({
      onEvent: () => undefined,
      onProtocolError: (error) => errors.push(error),
    });

    demux.accept({ type: 'future_event' });
    demux.accept({
      id: 'missing',
      type: 'response',
      command: 'get_state',
      success: true,
    });

    expect(errors).toHaveLength(2);
  });
});

describe('supervisor command writes', () => {
  it('writes the typed prompt request as exactly one LF-delimited JSON record', async () => {
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
    const writes: string[] = [];
    stdin.on('data', (chunk: Buffer) => {
      const serialized = chunk.toString('utf8');
      writes.push(serialized);
      const command = JSON.parse(serialized) as { id: string; type: string };
      stdout.write(
        `${JSON.stringify({
          id: command.id,
          type: 'response',
          command: command.type,
          success: true,
        })}\n`,
      );
    });
    const supervisor = new RpcSupervisor({ spawn, requestTimeoutMs: 100 });
    const started = supervisor.start();
    child.emit('spawn');
    await started;
    expect(spawn).toHaveBeenCalledWith(
      'pi',
      ['--mode', 'rpc', '--no-session', '--no-tools', '--no-extensions'],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    );

    await expect(
      supervisor.send({
        id: 'prompt_submission_001',
        type: 'prompt',
        message: 'Steer the current turn',
        streamingBehavior: 'steer',
      }),
    ).resolves.toMatchObject({ command: 'prompt', success: true });
    expect(writes).toEqual([
      '{"id":"prompt_submission_001","type":"prompt","message":"Steer the current turn","streamingBehavior":"steer"}\n',
    ]);
  });
});

describe('full-access launch posture', () => {
  it('returns the desktop-parity vector with no tool restriction', () => {
    const args = fullAccessPiArguments();
    expect(args).toEqual(['--mode', 'rpc', '--no-session', '--approve']);
    // A tool restriction or extension gate here would silently collapse desktop
    // parity back to the steering-only posture, so their absence is load-bearing.
    expect(args).not.toContain('--no-tools');
    expect(args).not.toContain('--tools');
    expect(args).not.toContain('--no-extensions');
  });

  it('reaches pi unmodified when the supervisor is launched with it', async () => {
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
    const supervisor = new RpcSupervisor({
      spawn,
      requestTimeoutMs: 100,
      args: fullAccessPiArguments(),
    });
    const started = supervisor.start();
    child.emit('spawn');
    await started;
    expect(spawn).toHaveBeenCalledWith('pi', ['--mode', 'rpc', '--no-session', '--approve'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  });

  it('keeps the safe supervisor default fail-closed and distinct from full access', async () => {
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
    const supervisor = new RpcSupervisor({ spawn, requestTimeoutMs: 100 });
    const started = supervisor.start();
    child.emit('spawn');
    await started;
    // The no-argument posture must stay read-only no matter how full access evolves.
    expect(spawn).toHaveBeenCalledWith(
      'pi',
      ['--mode', 'rpc', '--no-session', '--no-tools', '--no-extensions'],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    );
    expect(fullAccessPiArguments()).not.toEqual([
      '--mode',
      'rpc',
      '--no-session',
      '--no-tools',
      '--no-extensions',
    ]);
  });
});
