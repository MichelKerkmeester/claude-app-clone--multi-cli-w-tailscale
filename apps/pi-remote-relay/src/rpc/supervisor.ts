// ───────────────────────────────────────────────────────────────────
// MODULE: Persistent Pi RPC Supervisor
// ───────────────────────────────────────────────────────────────────

import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';

import type { PiRpcCommand, PiRpcEvent, PiRpcResponse } from '@pi-remote/pi-rpc-protocol';

import { RpcDemultiplexer } from './demux.js';
import { StrictJsonlDecoder } from './framing.js';

const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RESTARTS = 3;
const MAX_RESTART_DELAY_MS = 5_000;

export type SupervisorState = 'stopped' | 'starting' | 'running' | 'fixture' | 'failed';

export interface RpcSupervisorOptions {
  readonly command?: string;
  readonly args?: readonly string[];
  readonly requestTimeoutMs?: number;
  readonly maxRestarts?: number;
  readonly fixturePath?: URL;
  readonly fixtureOnly?: boolean;
  readonly spawn?: typeof spawn;
  readonly env?: NodeJS.ProcessEnv;
}

export interface SupervisorHealth {
  readonly state: SupervisorState;
  readonly restartCount: number;
  readonly stderrBytes: number;
}

/** Own exactly one persistent Pi RPC child and its serialized command stream. */
export class RpcSupervisor {
  private child: ChildProcessWithoutNullStreams | null = null;
  private readonly eventListeners = new Set<(event: PiRpcEvent) => void>();
  private readonly errorListeners = new Set<(error: Error) => void>();
  private readonly demultiplexer: RpcDemultiplexer;
  private state: SupervisorState = 'stopped';
  private restartCount = 0;
  private stderrBytes = 0;
  private isStopping = false;
  private isFallbackActive = false;
  private writeChain: Promise<void> = Promise.resolve();

  public constructor(private readonly options: RpcSupervisorOptions = {}) {
    this.demultiplexer = new RpcDemultiplexer({
      onEvent: (event) => this.emitEvent(event),
      onProtocolError: (error) => this.emitError(error),
    });
  }

  /** Start the live child once, or load the recorded fixture when requested. */
  public async start(): Promise<void> {
    if (this.state !== 'stopped' && this.state !== 'failed') {
      return;
    }
    this.isStopping = false;
    if (this.options.fixtureOnly === true) {
      await this.activateFixture();
      return;
    }
    this.launchChild();
  }

  /** Stop the owned child without affecting any unrelated process. */
  public async stop(): Promise<void> {
    this.isStopping = true;
    this.demultiplexer.rejectAll(new Error('Pi RPC supervisor stopped.'));
    const activeChild = this.child;
    this.child = null;
    if (activeChild !== null && activeChild.exitCode === null) {
      await new Promise<void>((resolve) => {
        activeChild.once('close', () => resolve());
        activeChild.kill('SIGTERM');
      });
    }
    this.state = 'stopped';
  }

  /** Send one correlated command through the serialized stdin writer. */
  public async send(command: PiRpcCommand): Promise<PiRpcResponse> {
    const activeChild = this.child;
    if (this.state !== 'running' || activeChild === null) {
      throw new Error('Pi RPC command unavailable because no live child is running.');
    }
    const id = command.id ?? `rpc_${randomUUID()}`;
    const response = this.demultiplexer.expect(
      id,
      this.options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
    );
    const serialized = `${JSON.stringify({ ...command, id })}\n`;
    this.writeChain = this.writeChain
      .catch(() => undefined)
      .then(
        () =>
          new Promise<void>((resolve, reject) => {
            activeChild.stdin.write(serialized, (error) => {
              if (error === null || error === undefined) {
                resolve();
              } else {
                reject(error);
              }
            });
          }),
      );
    try {
      await this.writeChain;
    } catch (error: unknown) {
      const cause = error instanceof Error ? error : new Error(String(error));
      this.demultiplexer.rejectAll(cause);
      throw cause;
    }
    return response;
  }

  /** Subscribe to parsed Pi events. */
  public onEvent(listener: (event: PiRpcEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /** Subscribe to framing, protocol and process errors. */
  public onError(listener: (error: Error) => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  /** Return metadata-only supervisor health. */
  public health(): SupervisorHealth {
    return {
      state: this.state,
      restartCount: this.restartCount,
      stderrBytes: this.stderrBytes,
    };
  }

  private launchChild(): void {
    if (this.child !== null || this.isStopping) {
      return;
    }
    this.state = 'starting';
    const child = (this.options.spawn ?? spawn)(
      this.options.command ?? 'pi',
      [
        ...(this.options.args ?? [
          '--mode',
          'rpc',
          '--no-session',
          '--no-tools',
          '--no-extensions',
        ]),
      ],
      {
        stdio: ['pipe', 'pipe', 'pipe'],
        ...(this.options.env === undefined ? {} : { env: this.options.env }),
      },
    );
    this.child = child;
    this.isFallbackActive = false;

    const decoder = new StrictJsonlDecoder({
      onRecord: (record) => this.demultiplexer.accept(record),
      onError: (error) => this.emitError(error),
    });
    child.stdout.on('data', (chunk: Buffer) => decoder.push(chunk));
    child.stdout.on('end', () => decoder.finish());
    child.stderr.on('data', (chunk: Buffer) => {
      this.stderrBytes += chunk.byteLength;
    });
    child.once('spawn', () => {
      this.state = 'running';
    });
    child.once('error', (error: NodeJS.ErrnoException) => {
      this.emitError(new Error(`Pi RPC child failed to start: ${error.message}`));
      if (error.code === 'ENOENT') {
        this.child = null;
        this.isFallbackActive = true;
        void this.activateFixture();
      }
    });
    child.once('close', (code, signal) => {
      if (this.child === child) {
        this.child = null;
      }
      this.demultiplexer.rejectAll(
        new Error(`Pi RPC child exited with code ${String(code)} and signal ${String(signal)}.`),
      );
      if (!this.isStopping && !this.isFallbackActive) {
        this.scheduleRestart();
      }
    });
  }

  private scheduleRestart(): void {
    const maxRestarts = this.options.maxRestarts ?? DEFAULT_MAX_RESTARTS;
    if (this.restartCount >= maxRestarts) {
      this.state = 'failed';
      return;
    }
    this.restartCount += 1;
    const delay = Math.min(250 * 2 ** (this.restartCount - 1), MAX_RESTART_DELAY_MS);
    setTimeout(() => this.launchChild(), delay).unref();
  }

  private async activateFixture(): Promise<void> {
    const fixturePath =
      this.options.fixturePath ?? new URL('../fixtures/pi-rpc.jsonl', import.meta.url);
    try {
      const contents = await readFile(fixturePath, 'utf8');
      const decoder = new StrictJsonlDecoder({
        onRecord: (record) => this.demultiplexer.accept(record),
        onError: (error) => this.emitError(error),
      });
      decoder.push(contents);
      decoder.finish();
      this.state = 'fixture';
    } catch (error: unknown) {
      this.state = 'failed';
      const message = error instanceof Error ? error.message : String(error);
      this.emitError(new Error(`Recorded Pi RPC fixture failed: ${message}`));
    }
  }

  private emitEvent(event: PiRpcEvent): void {
    for (const listener of this.eventListeners) {
      listener(event);
    }
  }

  private emitError(error: Error): void {
    for (const listener of this.errorListeners) {
      listener(error);
    }
  }
}
