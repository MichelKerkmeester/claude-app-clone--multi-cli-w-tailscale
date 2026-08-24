// ───────────────────────────────────────────────────────────────────
// MODULE: Persistent Pi RPC Supervisor
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';

import { isPiRpcEvent } from '@pi-remote/pi-rpc-protocol';
import type { PiRpcCommand, PiRpcEvent, PiRpcResponse } from '@pi-remote/pi-rpc-protocol';

import {
  RpcDemultiplexer,
  type AskQuestionCallbackOutcome,
  type AskQuestionCallbackRoute,
} from './demux.js';
import { StrictJsonlDecoder } from './framing.js';
import {
  authoritativeTodoProjectionSource,
  isAuthoritativeTodoProjectionEvent,
} from '../store/todo-projector.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RESTARTS = 3;
const MAX_RESTART_DELAY_MS = 5_000;

// ───────────────────────────────────────────────────────────────────
// 3. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

export type SupervisorState = 'stopped' | 'starting' | 'running' | 'fixture' | 'failed';

export type SupervisorLifecycleReason = 'spawn' | 'exit' | 'restart' | 'fixture' | 'failed';

export interface SupervisorLifecycleEvent {
  readonly state: SupervisorState;
  readonly reason: SupervisorLifecycleReason;
}

export interface RpcSupervisorOptions {
  readonly command?: string;
  readonly args?: readonly string[];
  readonly requestTimeoutMs?: number;
  readonly maxRestarts?: number;
  readonly fixturePath?: URL;
  readonly fixtureOnly?: boolean;
  readonly spawn?: typeof spawn;
  readonly env?: NodeJS.ProcessEnv | (() => NodeJS.ProcessEnv);
  /**
   * Integration-time verification must bind this route to Pi's exact
   * ask-question callback/event names before enabling the capability.
   */
  readonly askQuestionCallback?: Omit<AskQuestionCallbackRoute, 'onOutcome'>;
}

export interface SupervisorHealth {
  readonly state: SupervisorState;
  readonly restartCount: number;
  readonly stderrBytes: number;
}

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

/** Remove image-shaped event payloads before any relay framing or projection path. */
export function stripImagePayloadFromEventFrame(record: unknown): unknown {
  if (!isPiRpcEvent(record)) return record;
  return stripImageValue(record, true);
}

function stripImageValue(value: unknown, root = false): unknown {
  if (Array.isArray(value)) {
    return value.filter((child) => !isImageValue(child)).map((child) => stripImageValue(child));
  }
  if (typeof value !== 'object' || value === null) return value;
  if (isImageValue(value) && !root) return null;
  const source = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(source)) {
    if (key === 'images' || (key === 'image' && isImageValue(child))) continue;
    if (isImageValue(child)) continue;
    output[key] = stripImageValue(child);
  }
  return output;
}

function isImageValue(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.type === 'image' ||
    (typeof candidate.mimeType === 'string' &&
      candidate.mimeType.startsWith('image/') &&
      typeof candidate.data === 'string')
  );
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/** Own exactly one persistent Pi RPC child and its serialized command stream. */
export class RpcSupervisor {
  private child: ChildProcessWithoutNullStreams | null = null;
  private readonly eventListeners = new Set<(event: PiRpcEvent) => void>();
  private readonly errorListeners = new Set<(error: Error) => void>();
  private readonly lifecycleListeners = new Set<(event: SupervisorLifecycleEvent) => void>();
  private readonly askQuestionCallbackListeners = new Set<
    (outcome: AskQuestionCallbackOutcome) => void
  >();
  private readonly todoProjectionListeners = new Set<(source: unknown) => void>();
  private readonly demultiplexer: RpcDemultiplexer;
  private state: SupervisorState = 'stopped';
  private restartCount = 0;
  private stderrBytes = 0;
  private isStopping = false;
  private isFallbackActive = false;
  private writeChain: Promise<void> = Promise.resolve();
  private mutationLane: Promise<unknown> = Promise.resolve();

  public constructor(private readonly options: RpcSupervisorOptions = {}) {
    this.demultiplexer = new RpcDemultiplexer({
      onEvent: (event) => this.emitEvent(event),
      onProtocolError: (error) => this.emitError(error),
      ...(this.options.askQuestionCallback === undefined
        ? {}
        : {
            askQuestionCallback: {
              ...this.options.askQuestionCallback,
              onOutcome: (outcome: AskQuestionCallbackOutcome) =>
                this.emitAskQuestionCallback(outcome),
            },
          }),
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

  /** Send a mutation only after the prior mutation response has settled. */
  public sendSettled(command: PiRpcCommand): Promise<PiRpcResponse> {
    const mutation = this.mutationLane.catch(() => undefined).then(() => this.send(command));
    this.mutationLane = mutation;
    return mutation;
  }

  /** Subscribe to parsed Pi events. */
  public onEvent(listener: (event: PiRpcEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /** Subscribe to supervisor lifecycle transitions. */
  public onLifecycle(listener: (event: SupervisorLifecycleEvent) => void): () => void {
    this.lifecycleListeners.add(listener);
    return () => this.lifecycleListeners.delete(listener);
  }

  /** Subscribe to framing, protocol and process errors. */
  public onError(listener: (error: Error) => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  /** Subscribe to safe, confirmed ask-question callback outcomes only. */
  public onAskQuestionCallback(
    listener: (outcome: AskQuestionCallbackOutcome) => void,
  ): () => void {
    this.askQuestionCallbackListeners.add(listener);
    return () => this.askQuestionCallbackListeners.delete(listener);
  }

  /** Subscribe to the explicit host-owned todo source, never to transcript text. */
  public onTodoProjection(listener: (source: unknown) => void): () => void {
    this.todoProjectionListeners.add(listener);
    return () => this.todoProjectionListeners.delete(listener);
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
        ...(this.options.env === undefined
          ? {}
          : {
              env: typeof this.options.env === 'function' ? this.options.env() : this.options.env,
            }),
      },
    );
    this.child = child;
    this.isFallbackActive = false;

    const decoder = new StrictJsonlDecoder({
      onRecord: (record) => this.acceptFramedRecord(record),
      onError: (error) => this.emitError(error),
    });
    child.stdout.on('data', (chunk: Buffer) => decoder.push(chunk));
    child.stdout.on('end', () => decoder.finish());
    child.stderr.on('data', (chunk: Buffer) => {
      this.stderrBytes += chunk.byteLength;
    });
    child.once('spawn', () => {
      this.state = 'running';
      this.emitLifecycle({ state: this.state, reason: 'spawn' });
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
      this.emitLifecycle({ state: this.state, reason: 'exit' });
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
      this.emitLifecycle({ state: this.state, reason: 'failed' });
      return;
    }
    this.restartCount += 1;
    this.emitLifecycle({ state: this.state, reason: 'restart' });
    const delay = Math.min(250 * 2 ** (this.restartCount - 1), MAX_RESTART_DELAY_MS);
    setTimeout(() => this.launchChild(), delay).unref();
  }

  private async activateFixture(): Promise<void> {
    const fixturePath =
      this.options.fixturePath ?? new URL('../fixtures/pi-rpc.jsonl', import.meta.url);
    try {
      const contents = await readFile(fixturePath, 'utf8');
      const decoder = new StrictJsonlDecoder({
        onRecord: (record) => this.acceptFramedRecord(record),
        onError: (error) => this.emitError(error),
      });
      decoder.push(contents);
      decoder.finish();
      this.state = 'fixture';
      this.emitLifecycle({ state: this.state, reason: 'fixture' });
    } catch (error: unknown) {
      this.state = 'failed';
      this.emitLifecycle({ state: this.state, reason: 'failed' });
      const message = error instanceof Error ? error.message : String(error);
      this.emitError(new Error(`Recorded Pi RPC fixture failed: ${message}`));
    }
  }

  private emitEvent(event: PiRpcEvent): void {
    if (isAuthoritativeTodoProjectionEvent(event)) {
      const source = authoritativeTodoProjectionSource(event);
      for (const listener of this.todoProjectionListeners) listener(source);
      return;
    }
    for (const listener of this.eventListeners) {
      listener(event);
    }
  }

  private acceptFramedRecord(record: unknown): void {
    this.demultiplexer.accept(stripImagePayloadFromEventFrame(record));
  }

  private emitLifecycle(event: SupervisorLifecycleEvent): void {
    for (const listener of this.lifecycleListeners) {
      listener(event);
    }
  }

  private emitError(error: Error): void {
    for (const listener of this.errorListeners) {
      listener(error);
    }
  }

  private emitAskQuestionCallback(outcome: AskQuestionCallbackOutcome): void {
    for (const listener of this.askQuestionCallbackListeners) listener(outcome);
  }
}
