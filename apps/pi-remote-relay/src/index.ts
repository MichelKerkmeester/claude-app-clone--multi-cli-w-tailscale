// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Relay Entrypoint
// ───────────────────────────────────────────────────────────────────

import { randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { isOpaqueId } from '@pi-remote/pi-rpc-protocol';
import type { Envelope, JsonValue, PiRpcEvent } from '@pi-remote/pi-rpc-protocol';

import { startReadOnlyServer } from './http/server.js';
import { ApprovalService } from './approval/approval-service.js';
import { MutationPolicy } from './policy/mutation-policy.js';
import { PushService, createAttentionPayload } from './push/push-service.js';
import { PromptService } from './prompt/prompt-service.js';
import { SyncHub } from './replay/sync.js';
import { RpcSupervisor } from './rpc/supervisor.js';
import { SessionCatalog } from './sessions/catalog.js';
import { RelayStore } from './store/relay-store.js';
import { TranscriptProjector } from './store/transcript-projector.js';

const HOST_ID = 'host_local';
const WORKSPACE_REF = 'workspace_default';
const SESSION_ID = 'session_local';
const DEFAULT_PORT = 4_310;

/** Start the durable relay, loopback API and one supervised Pi RPC source. */
export async function runRelay(): Promise<() => Promise<void>> {
  const store = new RelayStore({ filename: process.env.PI_REMOTE_DB ?? './pi-remote.db' });
  const catalog = new SessionCatalog(store);
  const syncHub = new SyncHub(store);
  const push = createPushService(store);
  const fullAccess = process.env.PI_REMOTE_FULL_ACCESS === '1';
  const mutationPolicy = new MutationPolicy();
  const configuredFamily = process.env.PI_REMOTE_MUTATION_FAMILY;
  const mutationFamily =
    configuredFamily === 'filesystem' ||
    configuredFamily === 'process' ||
    configuredFamily === 'network'
      ? configuredFamily
      : null;
  if (mutationFamily !== null) {
    mutationPolicy.enableFamily(mutationFamily);
  }
  mutationPolicy.setEnabled(
    process.env.PI_REMOTE_MUTATION_ENABLED === '1' && mutationFamily !== null,
  );
  const approvals = new ApprovalService({
    store,
    syncHub,
    policy: mutationPolicy,
    identity: { hostId: HOST_ID, workspaceRef: WORKSPACE_REF },
  });
  const epoch = `epoch_${randomUUID()}`;
  // Full access takes precedence over the mutation family path, so mutation stays off
  // whenever PI_REMOTE_FULL_ACCESS is set. Nothing downstream may require the operator
  // principal, mint an approval secret, or pass an extension authority in that mode.
  const mutationEnabled = !fullAccess && mutationPolicy.status().enabled;
  const extensionSecret = mutationEnabled ? randomBytes(32).toString('base64url') : null;
  const operatorPrincipal = mutationEnabled
    ? requiredEnvironment('PI_REMOTE_OPERATOR_PRINCIPAL')
    : null;
  const relayPort = parsePort(process.env.PI_REMOTE_PORT);
  const mutationChildEnvironment =
    mutationEnabled &&
    mutationFamily !== null &&
    extensionSecret !== null &&
    operatorPrincipal !== null
      ? {
          ...process.env,
          PI_REMOTE_APPROVAL_RELAY_URL: '',
          PI_REMOTE_APPROVAL_SECRET: extensionSecret,
          PI_REMOTE_APPROVAL_PRINCIPAL: operatorPrincipal,
          PI_REMOTE_APPROVAL_SESSION_ID: SESSION_ID,
          PI_REMOTE_APPROVAL_EPOCH: epoch,
        }
      : null;
  const transcriptProjector = new TranscriptProjector();
  catalog.register(SESSION_ID, 'idle', 0);

  const supervisor = new RpcSupervisor({
    fixtureOnly: process.env.PI_REMOTE_USE_FIXTURE === '1',
    ...(fullAccess
      ? { args: fullAccessPiArguments() }
      : mutationChildEnvironment !== null && mutationFamily !== null
        ? {
            args: mutationPiArguments(mutationFamily),
            env: mutationChildEnvironment,
          }
        : {}),
  });
  const prompts = new PromptService({
    store,
    syncHub,
    supervisor,
    projector: transcriptProjector,
    hostId: HOST_ID,
    workspaceRef: WORKSPACE_REF,
    sessionId: SESSION_ID,
    epoch,
  });
  supervisor.onEvent((event) => {
    publishPiEvent(store, syncHub, transcriptProjector, event, epoch);
    if (event.type === 'agent_start') {
      catalog.register(SESSION_ID, 'running', 0);
    } else if (event.type === 'agent_settled') {
      catalog.register(SESSION_ID, 'idle', 0);
    }
  });

  const server = await startReadOnlyServer({
    store,
    catalog,
    syncHub,
    hostId: HOST_ID,
    workspaceRef: WORKSPACE_REF,
    publicOrigin: requiredEnvironment('PI_REMOTE_PUBLIC_ORIGIN'),
    serveSecret: requiredEnvironment('PI_REMOTE_SERVE_SECRET'),
    approvals,
    ...(mutationEnabled && extensionSecret !== null && operatorPrincipal !== null
      ? {
          extensionAuthority: {
            secret: extensionSecret,
            principal: operatorPrincipal,
            sessionId: SESSION_ID,
            epoch,
            policyVersion: 1,
          },
        }
      : {}),
    prompts,
    ...(push === undefined ? {} : { push }),
    port: relayPort,
  });
  if (mutationChildEnvironment !== null) {
    mutationChildEnvironment.PI_REMOTE_APPROVAL_RELAY_URL = `http://${server.host}:${server.port}`;
  }
  const stopPushListener =
    push === undefined
      ? () => undefined
      : bindPushNotifications(store, syncHub, push, () => server.foregroundDeviceIds);
  if (process.env.PI_REMOTE_PRINT_ENROLLMENT === '1') {
    process.stdout.write(`${JSON.stringify(server.auth.enrollment.createChallenge())}\n`);
  }
  await supervisor.start();

  return async () => {
    await supervisor.stop();
    stopPushListener();
    approvals.close();
    await server.stop();
    store.close();
  };
}

function approvalIdFrom(payload: JsonValue): string | null {
  return typeof payload === 'object' &&
    payload !== null &&
    !Array.isArray(payload) &&
    'approvalId' in payload &&
    typeof payload['approvalId'] === 'string' &&
    isOpaqueId(payload['approvalId'])
    ? payload['approvalId']
    : null;
}

export function bindPushNotifications(
  store: RelayStore,
  syncHub: SyncHub,
  push: PushService,
  foregroundDeviceIds: () => ReadonlySet<string> = () => new Set(),
): () => void {
  return syncHub.onCommitted((envelope) => {
    if (envelope.kind === 'approval.requested') {
      const identity = {
        hostId: envelope.hostId,
        workspaceRef: envelope.workspaceRef,
        sessionId: envelope.sessionId,
      };
      syncHub.publish({
        ...envelope,
        eventId: `event_${randomUUID()}`,
        kind: 'attention.changed',
        seq: store.nextSequence(identity, envelope.epoch),
        causedBy: approvalIdFrom(envelope.payload),
        payload: createAttentionPayload('needs_input', envelope.seq),
      });
      return;
    }
    void push.publish(envelope, {
      committed: true,
      foregroundDeviceIds: foregroundDeviceIds(),
    });
  });
}

export function publishPiEvent(
  store: RelayStore,
  syncHub: SyncHub,
  transcriptProjector: TranscriptProjector,
  event: PiRpcEvent,
  epoch: string,
): void {
  const identity = {
    hostId: HOST_ID,
    workspaceRef: WORKSPACE_REF,
    sessionId: SESSION_ID,
  };
  const causedBy = typeof event.id === 'string' && isOpaqueId(event.id) ? event.id : null;
  const envelope: Envelope = {
    v: 1,
    eventId: `event_${randomUUID()}`,
    kind: `pi.${event.type}`,
    ...identity,
    epoch,
    seq: store.nextSequence(identity, epoch),
    occurredAt: new Date().toISOString(),
    causedBy,
    payload: event as JsonValue,
    redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
    replay: { eligible: true, snapshotEligible: true },
  };
  syncHub.publish(envelope);
  let nextProjectedSequence = store.nextSequence(identity, epoch);
  for (const block of transcriptProjector.project(event, {
    occurredAt: envelope.occurredAt,
    nextSequence: () => nextProjectedSequence++,
  })) {
    syncHub.publish({
      ...envelope,
      eventId: `event_${randomUUID()}`,
      kind: 'transcript.block',
      seq: block.seq,
      payload: block,
    });
  }
  const attentionClass = attentionClassFor(event);
  if (attentionClass !== null) {
    syncHub.publish({
      ...envelope,
      eventId: `event_${randomUUID()}`,
      kind: 'attention.changed',
      seq: store.nextSequence(identity, epoch),
      payload: createAttentionPayload(attentionClass, envelope.seq),
    });
  }
}

function attentionClassFor(event: PiRpcEvent): 'needs_input' | 'finished' | 'error' | null {
  if (event.type === 'extension_ui_request') return 'needs_input';
  if (event.type === 'agent_settled' || event.type === 'agent_end') return 'finished';
  if (event.type === 'extension_error') return 'error';
  return null;
}

function createPushService(store: RelayStore): PushService | undefined {
  const key = process.env.PI_REMOTE_PUSH_ENCRYPTION_KEY;
  const publicKey = process.env.PI_REMOTE_VAPID_PUBLIC_KEY;
  const privateKey = process.env.PI_REMOTE_VAPID_PRIVATE_KEY;
  const subject = process.env.PI_REMOTE_VAPID_SUBJECT;
  if (
    key === undefined ||
    publicKey === undefined ||
    privateKey === undefined ||
    subject === undefined
  ) {
    return undefined;
  }
  const encryptionKey = Buffer.from(key, 'base64url');
  return new PushService({
    store,
    encryptionKey,
    vapid: { subject, publicKey, privateKey },
  });
}

function parsePort(value: string | undefined): number {
  if (value === undefined) {
    return DEFAULT_PORT;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 65_535) {
    throw new Error('PI_REMOTE_PORT must be an integer from 0 through 65535.');
  }
  return parsed;
}

// Full access is the desktop posture. `--approve` trusts project-local files, and with no
// `--no-tools` or `--tools` allowlist every built-in tool stays enabled. The approval
// extension exists only to gate remote mutation through the phone, and gating tool calls
// defeats full access, so it is deliberately not loaded here. Without it pi executes each
// tool call directly, exactly as it does on a local desktop.
export function fullAccessPiArguments(): readonly string[] {
  return ['--mode', 'rpc', '--no-session', '--approve'];
}

export function mutationPiArguments(
  family: 'filesystem' | 'process' | 'network',
): readonly string[] {
  const familyTools =
    family === 'filesystem' ? ['edit', 'write'] : family === 'process' ? ['bash'] : ['fetch'];
  const extensionPath = new URL(
    '../../../extensions/pi-remote-approval/dist/index.js',
    import.meta.url,
  );
  return [
    '--mode',
    'rpc',
    '--no-session',
    '--tools',
    ['read', 'grep', 'find', 'ls', ...familyTools].join(','),
    '--no-extensions',
    '--extension',
    fileURLToPath(extensionPath),
  ];
}

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.length === 0) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

const entryPath = process.argv[1];
if (entryPath !== undefined && import.meta.url === pathToFileURL(entryPath).href) {
  void runRelay()
    .then((shutdown) => {
      let isShuttingDown = false;
      const stop = (): void => {
        if (isShuttingDown) {
          return;
        }
        isShuttingDown = true;
        void shutdown().finally(() => {
          process.exitCode = 0;
        });
      };
      process.once('SIGINT', stop);
      process.once('SIGTERM', stop);
    })
    .catch(() => {
      process.stderr.write('Pi Remote relay failed to start.\n');
      process.exitCode = 1;
    });
}
