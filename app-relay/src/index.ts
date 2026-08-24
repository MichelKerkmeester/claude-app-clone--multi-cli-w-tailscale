// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Relay Entrypoint
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { isAskQuestionPresentedEvent, isOpaqueId } from '@pi-remote/pi-rpc-protocol';
import type {
  AskQuestionAnswer,
  AskQuestionPresentedEvent,
  AskQuestionResultReason,
  Envelope,
  JsonValue,
  PiRpcCommand,
  PiRpcEvent,
} from '@pi-remote/pi-rpc-protocol';

import { startReadOnlyServer } from './http/server.js';
import { ApprovalService } from './approval/approval-service.js';
import { AttachmentReaper } from './attachments/attachment-reaper.js';
import { AttachmentService } from './attachments/attachment-service.js';
import { PiImageBridge } from './attachments/pi-image-bridge.js';
import {
  AskQuestionService,
  type AskQuestionHandoffInput,
  type AskQuestionHandoffOutcome,
} from './ask-question/ask-question-service.js';
import { CommandService } from './commands/command-service.js';
import { isMediaFeatureEnabled } from './auth/policy.js';
import { MutationPolicy } from './policy/mutation-policy.js';
import { PushService, createAttentionPayload } from './push/push-service.js';
import { PromptService } from './prompt/prompt-service.js';
import { PromptRevisionCoordinator } from './prompt/prompt-revision-coordinator.js';
import { SyncHub } from './replay/sync.js';
import type { AskQuestionCallbackOutcome } from './rpc/demux.js';
import { RpcSupervisor } from './rpc/supervisor.js';
import { RuntimeService } from './runtime/runtime-service.js';
import { SessionCatalog } from './sessions/catalog.js';
import { RelayStore } from './store/relay-store.js';
import { getAllowlistedArtifactSnapshot } from './store/artifact-sanitizer.js';
import {
  isAuthoritativeTodoProjectionEvent,
  TodoProjector,
  type TodoProjectionUpdate,
} from './store/todo-projector.js';
import { TranscriptProjector } from './store/transcript-projector.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const HOST_ID = 'host_local';
const WORKSPACE_REF = 'workspace_default';
const SESSION_ID = 'session_local';
const DEFAULT_PORT = 4_310;
const ASK_QUESTION_HANDOFF_TIMEOUT_MS = 15_000;

// ───────────────────────────────────────────────────────────────────
// 3. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface HostAskQuestionBinding {
  readonly requestId: string;
}

interface PendingAskQuestionHandoff {
  readonly resolve: (outcome: AskQuestionCallbackOutcome) => void;
  readonly timer: NodeJS.Timeout;
  settled: boolean;
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/** Start the durable relay, loopback API and one supervised Pi RPC source. */
export async function runRelay(): Promise<() => Promise<void>> {
  const store = new RelayStore({ filename: process.env.PI_REMOTE_DB ?? './pi-remote.db' });
  const catalog = new SessionCatalog(store);
  const syncHub = new SyncHub(store);
  const push = createPushService(store);
  const fullAccess = process.env.PI_REMOTE_FULL_ACCESS === '1';
  const mediaEnabled = isMediaFeatureEnabled();
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
  let epoch = `epoch_${randomUUID()}`;
  const attachmentService = new AttachmentService({
    currentEpoch: () => epoch,
    now: Date.now,
    ...(process.env.PI_REMOTE_ATTACHMENT_QUARANTINE === undefined
      ? {}
      : { quarantineRoot: process.env.PI_REMOTE_ATTACHMENT_QUARANTINE }),
  });
  const attachmentReaper = new AttachmentReaper({ service: attachmentService });
  await attachmentReaper.start();
  // Full access takes precedence over the mutation family path, so mutation stays off
  // whenever PI_REMOTE_FULL_ACCESS is set. Nothing downstream may require the operator
  // principal, mint an approval secret, or pass an extension authority in that mode.
  const mutationEnabled = !fullAccess && mutationPolicy.status().enabled;
  const extensionSecret = mutationEnabled ? randomBytes(32).toString('base64url') : null;
  const operatorPrincipal = mutationEnabled
    ? requiredEnvironment('PI_REMOTE_OPERATOR_PRINCIPAL')
    : null;
  const relayPort = parsePort(process.env.PI_REMOTE_PORT);
  let mutationChildRelayUrl = '';
  const mutationChildEnvironment =
    mutationEnabled &&
    mutationFamily !== null &&
    extensionSecret !== null &&
    operatorPrincipal !== null
      ? {
          ...process.env,
          PI_REMOTE_APPROVAL_SECRET: extensionSecret,
          PI_REMOTE_APPROVAL_PRINCIPAL: operatorPrincipal,
          PI_REMOTE_APPROVAL_SESSION_ID: SESSION_ID,
        }
      : null;
  const transcriptProjector = new TranscriptProjector(store.artifactStore);
  const todoProjector = new TodoProjector();
  catalog.register(SESSION_ID, 'idle', 0);

  const supervisor = new RpcSupervisor({
    fixtureOnly: process.env.PI_REMOTE_USE_FIXTURE === '1',
    askQuestionCallback: {
      matches: isAskQuestionCallbackRecord,
      map: mapAskQuestionCallbackOutcome,
    },
    ...(fullAccess
      ? { args: fullAccessPiArguments() }
      : mutationChildEnvironment !== null && mutationFamily !== null
        ? {
            args: mutationPiArguments(mutationFamily),
            env: () => ({
              ...mutationChildEnvironment,
              PI_REMOTE_APPROVAL_RELAY_URL: mutationChildRelayUrl,
              PI_REMOTE_APPROVAL_EPOCH: epoch,
            }),
          }
        : {}),
  });
  const commands = new CommandService(supervisor, { sessionId: SESSION_ID });
  const runtime = new RuntimeService(supervisor, {
    sessionId: SESSION_ID,
    mediaEnabled,
  });
  const revisionCoordinator = new PromptRevisionCoordinator();
  const imageBridge = new PiImageBridge({
    supervisor,
    attachments: attachmentService,
    getRuntimeSnapshot: () => runtime.getSnapshot(),
    currentPromptRevision: () => revisionCoordinator.current(),
    planPolicy: (snapshot) => snapshot.state.mode === 'build' || snapshot.state.mode === 'plan',
  });
  const prompts = new PromptService({
    store,
    syncHub,
    supervisor,
    projector: transcriptProjector,
    hostId: HOST_ID,
    workspaceRef: WORKSPACE_REF,
    sessionId: SESSION_ID,
    epoch: () => epoch,
    commands,
    imageBridge,
    revisionCoordinator,
    getAttachmentOwner: (deviceId, attachmentSetId) =>
      attachmentSetId === undefined
        ? null
        : attachmentService.getOwnerForDevice(attachmentSetId, deviceId),
  });
  const hostAskQuestionBindings = new Map<string, HostAskQuestionBinding>();
  const pendingAskQuestionHandoffs: PendingAskQuestionHandoff[] = [];
  const askQuestions = new AskQuestionService({
    store,
    syncHub,
    hostId: HOST_ID,
    workspaceRef: WORKSPACE_REF,
    sessionId: SESSION_ID,
    epoch: () => epoch,
    now: Date.now,
    handoff: {
      submit: (input) =>
        submitAskQuestionAnswer(
          supervisor,
          hostAskQuestionBindings,
          pendingAskQuestionHandoffs,
          input,
        ),
    },
    canAnswer: () => runtime.getState()?.mode === 'build',
  });
  supervisor.onAskQuestionCallback((outcome) => {
    const pending = pendingAskQuestionHandoffs.shift();
    if (pending !== undefined) completeAskQuestionHandoff(pending, outcome);
  });
  // A restarted host gets a new epoch: every prior catalog snapshot and binding
  // dies with it, so nothing from the old generation can authorize a submission.
  supervisor.onLifecycle((event) => {
    if (event.reason === 'exit' || event.reason === 'restart' || event.reason === 'failed') {
      const endedEpoch = epoch;
      epoch = `epoch_${randomUUID()}`;
      commands.invalidate();
      todoProjector.reset();
      void attachmentReaper.onEpochChange(endedEpoch);
      hostAskQuestionBindings.clear();
      for (const pending of pendingAskQuestionHandoffs.splice(0)) {
        completeAskQuestionHandoff(pending, { status: 'delivery-unknown' });
      }
    }
  });
  supervisor.onError((error) => {
    process.stderr.write(`${error.message}\n`);
  });
  supervisor.onTodoProjection((source) => {
    const update = todoProjector.project(source);
    if (update !== null) publishTodoProjection(store, syncHub, update, epoch);
  });
  supervisor.onEvent((event) => {
    if (isAuthoritativeTodoProjectionEvent(event)) return;
    const askQuestion = askQuestionPresentationFor(event);
    if (askQuestion !== null) {
      hostAskQuestionBindings.set(askQuestion.presentation.questionId, askQuestion.binding);
      askQuestions.present(askQuestion.presentation);
      return;
    }
    publishPiEvent(store, syncHub, transcriptProjector, event, epoch);
    if (event.type === 'agent_start') {
      catalog.register(SESSION_ID, 'running', 0);
      commands.setAvailability('running');
    } else if (event.type === 'agent_settled') {
      catalog.register(SESSION_ID, 'idle', 0);
      commands.setAvailability('idle');
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
            epoch: () => epoch,
            policyVersion: 1,
          },
        }
      : {}),
    prompts,
    runtime,
    askQuestions,
    commands,
    ...(push === undefined ? {} : { push }),
    mediaEnabled,
    attachments: attachmentService,
    attachmentReaper,
    attachmentSessionId: SESSION_ID,
    port: relayPort,
  });
  if (mutationChildEnvironment !== null) {
    mutationChildRelayUrl = `http://${server.host}:${server.port}`;
  }
  const stopPushListener =
    push === undefined
      ? () => undefined
      : bindPushNotifications(store, syncHub, push, () => server.foregroundDeviceIds);
  if (process.env.PI_REMOTE_PRINT_ENROLLMENT === '1') {
    process.stdout.write(`${JSON.stringify(server.auth.enrollment.createChallenge())}\n`);
  }
  await supervisor.start();
  // Read authoritative runtime state once the child is live. In fixture or offline mode
  // this stays not-live and the runtime endpoints report unavailable rather than guessing.
  void runtime.hydrate().catch(() => undefined);

  return async () => {
    await supervisor.stop();
    stopPushListener();
    await attachmentReaper.shutdown();
    approvals.close();
    await server.stop();
    store.close();
  };
}

// ───────────────────────────────────────────────────────────────────
// 5. HELPERS
// ───────────────────────────────────────────────────────────────────

function askQuestionPresentationFor(event: PiRpcEvent): {
  readonly presentation: AskQuestionPresentedEvent;
  readonly binding: HostAskQuestionBinding;
} | null {
  const direct = event as unknown;
  if (isAskQuestionPresentedEvent(direct)) {
    return {
      presentation: direct,
      binding: {
        requestId: direct.answerCapability.ticketRef,
      },
    };
  }
  if (!isRecordValue(event) || event.type !== 'extension_ui_request') return null;
  if (event['method'] !== 'ask-question' && event['method'] !== 'askQuestion') return null;
  const candidate = event['presentation'] ?? event['question'] ?? event['askQuestion'];
  if (!isAskQuestionPresentedEvent(candidate)) return null;
  const requestId =
    typeof event['id'] === 'string' && event['id'].length > 0
      ? event['id']
      : candidate.answerCapability.ticketRef;
  return {
    presentation: candidate,
    binding: { requestId },
  };
}

function submitAskQuestionAnswer(
  supervisor: RpcSupervisor,
  bindings: ReadonlyMap<string, HostAskQuestionBinding>,
  pendingHandoffs: PendingAskQuestionHandoff[],
  input: AskQuestionHandoffInput,
): Promise<AskQuestionHandoffOutcome> {
  const binding = bindings.get(input.questionId);
  if (binding === undefined) return Promise.resolve({ status: 'delivery-unknown' });

  let pending: PendingAskQuestionHandoff | null = null;
  const outcome = new Promise<AskQuestionCallbackOutcome>((resolve) => {
    const timer = setTimeout(() => {
      if (pending !== null) {
        settlePendingAskQuestionHandoff(pendingHandoffs, pending, {
          status: 'delivery-unknown',
        });
      }
    }, ASK_QUESTION_HANDOFF_TIMEOUT_MS);
    pending = { resolve, timer, settled: false };
    pendingHandoffs.push(pending);
  });
  void supervisor
    .sendSettled(extensionUiResponseFor(binding, input.answer) as unknown as PiRpcCommand)
    .then((response) => {
      if (response.success !== true && pending !== null) {
        settlePendingAskQuestionHandoff(pendingHandoffs, pending, {
          status: 'delivery-unknown',
        });
      }
    })
    .catch(() => {
      if (pending !== null) {
        settlePendingAskQuestionHandoff(pendingHandoffs, pending, {
          status: 'delivery-unknown',
        });
      }
    });
  return outcome;
}

function extensionUiResponseFor(
  binding: HostAskQuestionBinding,
  answer: AskQuestionAnswer,
): Record<string, JsonValue> {
  return {
    type: 'extension_ui_response',
    id: binding.requestId,
    value: JSON.stringify(answer),
  };
}

function settlePendingAskQuestionHandoff(
  pendingHandoffs: PendingAskQuestionHandoff[],
  pending: PendingAskQuestionHandoff,
  outcome: AskQuestionCallbackOutcome,
): void {
  const index = pendingHandoffs.indexOf(pending);
  if (index >= 0) pendingHandoffs.splice(index, 1);
  completeAskQuestionHandoff(pending, outcome);
}

function completeAskQuestionHandoff(
  pending: PendingAskQuestionHandoff,
  outcome: AskQuestionCallbackOutcome,
): void {
  if (pending.settled) return;
  pending.settled = true;
  clearTimeout(pending.timer);
  pending.resolve(outcome);
}

function isAskQuestionCallbackRecord(record: unknown): boolean {
  return askQuestionCallbackPayload(record) !== null;
}

function mapAskQuestionCallbackOutcome(record: unknown): AskQuestionCallbackOutcome {
  const callback = askQuestionCallbackPayload(record);
  if (callback === null) return { status: 'delivery-unknown' };
  if (callback['status'] === 'accepted') return { status: 'accepted' };
  if (callback['status'] === 'delivery-unknown') return { status: 'delivery-unknown' };
  const reason = callback['reason'];
  return isAskQuestionResultReason(reason)
    ? { status: 'rejected', reason }
    : { status: 'delivery-unknown' };
}

function askQuestionCallbackPayload(record: unknown): Record<string, unknown> | null {
  if (!isRecordValue(record)) return null;
  const callback = record['questionCallback'] ?? record['askQuestionCallback'];
  return isRecordValue(callback) ? callback : null;
}

function isAskQuestionResultReason(value: unknown): value is AskQuestionResultReason {
  return (
    value === 'invalid-ticket' ||
    value === 'revision-mismatch' ||
    value === 'question-withdrawn' ||
    value === 'question-already-answered' ||
    value === 'plan-mode-blocked' ||
    value === 'redaction-policy-blocked' ||
    value === 'validation-failed' ||
    value === 'host-unavailable' ||
    value === 'delivery-unknown'
  );
}

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
  if (isAuthoritativeTodoProjectionEvent(event)) return;
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
    payload: stripArtifactSnapshotSources(event as JsonValue),
    redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
    replay: { eligible: true, snapshotEligible: true },
  };
  syncHub.publish(envelope);
  let nextProjectedSequence = store.nextSequence(identity, epoch);
  for (const block of transcriptProjector.project(event, {
    occurredAt: envelope.occurredAt,
    nextSequence: () => nextProjectedSequence++,
    sessionId: identity.sessionId,
  })) {
    // The store may decline a projection without consuming a sequence, so it owns the counter.
    const seq = store.nextSequence(identity, epoch);
    syncHub.publish({
      ...envelope,
      eventId: `event_${randomUUID()}`,
      kind: 'transcript.block',
      seq,
      payload: { ...block, seq },
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

export function publishTodoProjection(
  store: RelayStore,
  syncHub: SyncHub,
  update: TodoProjectionUpdate,
  epoch: string,
  identity: {
    readonly hostId: string;
    readonly workspaceRef: string;
    readonly sessionId: string;
  } = { hostId: HOST_ID, workspaceRef: WORKSPACE_REF, sessionId: SESSION_ID },
): void {
  syncHub.publish({
    v: 1,
    eventId: `event_${randomUUID()}`,
    kind: update.kind,
    ...identity,
    epoch,
    seq: store.nextSequence(identity, epoch),
    occurredAt: new Date().toISOString(),
    causedBy: null,
    payload: update.payload,
    redaction: { policyVersion: 1, fieldsRedacted: 0, reasons: [] },
    replay: { eligible: true, snapshotEligible: true },
  });
}

function stripArtifactSnapshotSources(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(stripArtifactSnapshotSources);
  if (value === null || typeof value !== 'object') return value;
  const source = value as Record<string, JsonValue>;
  let changed = false;
  const output: Record<string, JsonValue> = {};
  for (const [key, child] of Object.entries(source)) {
    if (
      (key === 'artifactSnapshot' || key === 'snapshot') &&
      getAllowlistedArtifactSnapshot(child) !== null
    ) {
      changed = true;
      continue;
    }
    const next = stripArtifactSnapshotSources(child);
    output[key] = next;
    changed ||= next !== child;
  }
  return changed ? output : value;
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
    '../../extensions/pi-remote-approval/dist/index.js',
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
