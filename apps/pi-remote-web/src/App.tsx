// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Web Application Shell
// ───────────────────────────────────────────────────────────────────

import { useVirtualizer } from '@tanstack/react-virtual';
import {
  isOpaqueId,
  type ApprovalCardDto,
  type AttentionItemDto,
  type FileDiffBlock,
  type FilePreviewBlock,
  type PushPreferences,
  type RuntimeMediaCapabilityDto,
  type SessionCardDto,
  type SyncMessage,
} from '@pi-remote/pi-rpc-protocol';
import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  Button,
  Disclosure,
  DisclosurePanel,
  Heading,
  Switch,
  ToggleButton,
} from 'react-aria-components';

import { installCacheRevalidation, loadCache, saveCache, type ReadOnlyCache } from './cache.js';
import { ArtifactCard } from './artifacts/ArtifactCard.js';
import { ArtifactViewerProvider } from './artifacts/ArtifactViewerProvider.js';
import { useOptionalArtifactViewer } from './artifacts/ArtifactViewerProvider.js';
import {
  enrollDevice,
  establishSession,
  revokeDevice,
  logoutDevice,
  scanQrImage,
  type DeviceIdentity,
} from './auth.js';
import {
  fetchAttention,
  fetchPushConfig,
  openAttentionHint,
  subscribeToPush,
  setPushForeground,
  unsubscribeFromPush,
  updatePushPreferences,
  type PushConfig,
} from './attention.js';
import {
  abortPrompt,
  createAcceptEditsGrant,
  decideApproval,
  fetchApprovals,
  fetchSessions,
  fetchTranscript,
  noteRelayHeartbeat,
  openSyncSocket,
  submitPrompt,
} from './relay.js';
import {
  EMPTY_TRANSCRIPT,
  DEFAULT_MEDIA_CAPABILITY_OFF,
  connectionReducer,
  filePreviewAvailability,
  sessionListReducer,
  transcriptReducer,
  type ConnectionAction,
  type ConnectionPhase,
  type DisplayTranscriptBlock,
  type SessionListState,
  type TranscriptState,
} from './state.js';
import { ModelEffortSheet, type EffortSheetSection } from './ModelEffortSheet.js';
import { LeavePlanSheet } from './LeavePlanSheet.js';
import { PlanReadyCard } from './PlanReadyCard.js';
import { PlanReviewSheet } from './PlanReviewSheet.js';
import { RuntimeModeAnnouncer } from './RuntimeModeAnnouncer.js';
import { RuntimeStrip } from './RuntimeStrip.js';
import { SessionComposer } from './SessionComposer.js';
import { AttachmentDraftProvider } from './attachments/AttachmentDraftProvider.js';
import { SessionHeader } from './SessionHeader.js';
import {
  bindingMatchesSnapshot,
  useHostCommandCatalog,
  type SelectedCommandBinding,
} from './commands.js';
import { bindingAfterDraftChange } from './insertSlashCommand.js';
import { modeAuthority, runtimeAnnouncement, useRuntime, type RuntimeUiState } from './runtime.js';
import { submitSlashDraft, type SlashSubmitFailureCode } from './submitSlashDraft.js';
import { groupBlocksIntoTurns } from './turns.js';
import { RichContentRouter } from './rich-content/RichContentRouter.js';
import {
  normalizeTranscriptBlocks,
  type NormalizedActivityBlock,
  type NormalizedTranscriptBlock,
} from './rich-content/normalizeTranscriptBlocks.js';

const initialCache = loadCache();
type ThemePreference = 'system' | 'light' | 'dark';

export interface AppProps {
  /** Typed fixture injection keeps production media disabled until host enablement. */
  readonly mediaCapability?: Pick<RuntimeMediaCapabilityDto, 'enabled' | 'imageIn'> | null;
}

export function App({ mediaCapability = DEFAULT_MEDIA_CAPABILITY_OFF }: AppProps = {}) {
  const [device, setDevice] = useState<DeviceIdentity | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authAttempt, setAuthAttempt] = useState(0);
  const [selectedSessionId, setSelectedSessionId] = useState(readSessionIdFromLocation);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewFocusId, setReviewFocusId] = useState<string | null>(null);
  const [inboxOpen, setInboxOpen] = useState(readAttentionIdFromLocation() !== null);
  const [theme, setTheme] = useState<ThemePreference>(readThemePreference);
  const [connection, dispatchConnection] = useReducer(connectionReducer, {
    phase: navigator.onLine ? 'authenticating' : 'offline',
    changedAt: new Date().toISOString(),
    lastMessageAt: null,
    detail: null,
  });
  const [sessions, dispatchSessions] = useReducer(sessionListReducer, {
    items: initialCache?.sessions ?? [],
    phase: initialCache === null ? 'idle' : 'ready',
    source: initialCache === null ? 'none' : 'cache',
    updatedAt: initialCache?.savedAt ?? null,
    error: null,
  });
  const [transcript, dispatchTranscript] = useReducer(transcriptReducer, EMPTY_TRANSCRIPT);

  useEffect(() => {
    const root = document.documentElement;
    document
      .querySelector('meta[name="viewport"]')
      ?.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      root.dataset.theme = theme;
      const dark = theme === 'dark' || (theme === 'system' && scheme.matches);
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', dark ? '#24221f' : '#f8f8f6');
    };
    applyTheme();
    try {
      localStorage.setItem('pi-remote.theme', theme);
    } catch {
      // Theme selection still applies when persistent browser storage is unavailable.
    }
    scheme.addEventListener('change', applyTheme);
    return () => scheme.removeEventListener('change', applyTheme);
  }, [theme]);

  useEffect(() => {
    let stopped = false;
    if (!navigator.onLine) return;
    dispatchConnection({ type: 'authenticating' });
    void establishSession()
      .then((identity) => {
        if (stopped) return;
        setDevice(identity);
        setAuthReady(identity !== null);
        dispatchConnection(
          identity === null ? { type: 'unenrolled' } : { type: 'connecting', reconnect: false },
        );
      })
      .catch(() => {
        if (stopped) return;
        setAuthReady(false);
        dispatchConnection({ type: 'error', detail: 'Device authentication failed.' });
      });
    return () => {
      stopped = true;
    };
  }, [authAttempt]);

  useEffect(() => {
    const onPopState = () => setSelectedSessionId(readSessionIdFromLocation());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!authReady) return;
    const lookupId = readAttentionIdFromLocation();
    if (lookupId === null) return;
    const controller = new AbortController();
    void openAttentionHint(lookupId, controller.signal)
      .then((resolution) => {
        window.history.replaceState(
          {},
          '',
          resolution.target === 'review'
            ? `/?review=1&focus=${encodeURIComponent(lookupId)}`
            : `/session/${encodeURIComponent(resolution.sessionId)}`,
        );
        if (resolution.target === 'review') {
          setReviewFocusId(resolution.focusId);
          setReviewOpen(true);
          setInboxOpen(false);
        } else {
          setSelectedSessionId(resolution.sessionId);
          setInboxOpen(false);
        }
      })
      .catch(() => setInboxOpen(true));
    return () => controller.abort();
  }, [authReady]);

  useEffect(() => {
    if (!authReady) return;
    const report = () => {
      void setPushForeground(document.visibilityState === 'visible').catch(() => undefined);
    };
    report();
    document.addEventListener('visibilitychange', report);
    return () => {
      document.removeEventListener('visibilitychange', report);
      void setPushForeground(false).catch(() => undefined);
    };
  }, [authReady]);

  useEffect(() => {
    const onOnline = () => setAuthAttempt((current) => current + 1);
    const onOffline = () => dispatchConnection({ type: 'offline' });
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!authReady) return;
    const controller = new AbortController();
    dispatchSessions({ type: 'loading' });
    void fetchSessions(controller.signal)
      .then((items) => {
        const at = new Date().toISOString();
        dispatchSessions({ type: 'loaded', items, at });
        if (selectedSessionId === null) dispatchConnection({ type: 'live', at });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        dispatchSessions({ type: 'error', error: messageFrom(error) });
        dispatchConnection({
          type: navigator.onLine ? 'error' : 'offline',
          ...(navigator.onLine ? { detail: 'Relay unavailable.' } : {}),
        } as ConnectionAction);
      });
    return () => controller.abort();
  }, [authReady, selectedSessionId]);

  useEffect(() => {
    if (sessions.source === 'relay') saveCache(sessions.items, transcript);
  }, [sessions, transcript]);

  function navigate(sessionId: string | null) {
    const nextPath = sessionId === null ? '/' : `/session/${encodeURIComponent(sessionId)}`;
    window.history.pushState({}, '', nextPath);
    setSelectedSessionId(sessionId);
  }

  // In a live session the global bar yields to the quiet SessionHeader (back · model · overflow).
  const inSession = authReady && !reviewOpen && !inboxOpen && selectedSessionId !== null;
  const openReview = () => {
    setReviewOpen(true);
    setInboxOpen(false);
  };
  const openInbox = () => {
    setReviewOpen(false);
    setInboxOpen(true);
  };

  return (
    <div className="app-shell">
      {!inSession && (
        <Header
          connection={connection.phase}
          onHome={() => {
            setReviewOpen(false);
            navigate(null);
          }}
          onReview={openReview}
          onInbox={openInbox}
          reviewAvailable={authReady}
          theme={theme}
          onThemeChange={setTheme}
        />
      )}
      {!authReady ? (
        <Enrollment
          phase={connection.phase}
          onEnrolled={(identity) => {
            setDevice(identity);
            setAuthReady(true);
            dispatchConnection({ type: 'connecting', reconnect: false });
          }}
        />
      ) : reviewOpen ? (
        <Review
          focusId={reviewFocusId}
          onBack={() => setReviewOpen(false)}
          sessions={sessions.items}
        />
      ) : inboxOpen ? (
        <AttentionInbox
          onBack={() => setInboxOpen(false)}
          onOpen={(resolution) => {
            setInboxOpen(false);
            if (resolution.target === 'review') {
              setReviewFocusId(resolution.focusId);
              setReviewOpen(true);
            } else navigate(resolution.sessionId);
          }}
        />
      ) : selectedSessionId === null ? (
        <Home
          cache={initialCache}
          connection={connection.phase}
          sessions={sessions}
          onSelect={(sessionId) => navigate(sessionId)}
          device={device}
          onRevoke={() => {
            window.dispatchEvent(new Event('pi-remote:app-lock'));
            void revokeDevice().finally(() => {
              setAuthReady(false);
              setDevice(null);
              dispatchConnection({ type: 'unenrolled' });
            });
          }}
          onLogout={() => {
            window.dispatchEvent(new Event('pi-remote:logout'));
            void unsubscribeFromPush()
              .catch(() => undefined)
              .then(logoutDevice)
              .finally(() => {
                setAuthReady(false);
                dispatchConnection({ type: 'authenticating' });
                setAuthAttempt((current) => current + 1);
              });
          }}
        />
      ) : (
        <Session
          connection={connection.phase}
          sessionId={selectedSessionId}
          initialCache={initialCache}
          transcript={transcript}
          dispatchConnection={dispatchConnection}
          dispatchTranscript={dispatchTranscript}
          status={
            sessions.items.find((session) => session.id === selectedSessionId)?.status ?? 'unknown'
          }
          onBack={() => navigate(null)}
          onInbox={openInbox}
          onReview={openReview}
          theme={theme}
          onThemeChange={setTheme}
          mediaCapability={mediaCapability}
        />
      )}
    </div>
  );
}

function Enrollment({
  phase,
  onEnrolled,
}: {
  readonly phase: ConnectionPhase;
  readonly onEnrolled: (device: DeviceIdentity) => void;
}) {
  const [qrData, setQrData] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = () => {
    setBusy(true);
    setError(null);
    void enrollDevice(qrData.trim())
      .then(async (identity) => {
        const authenticated = await establishSession();
        if (authenticated === null) throw new Error('Enrollment did not produce a device session.');
        onEnrolled(identity);
      })
      .catch((cause: unknown) => {
        setError(messageFrom(cause));
      })
      .finally(() => setBusy(false));
  };

  return (
    <main className="enrollment-view">
      <section className="enrollment-card">
        <div className="surface-symbol" aria-hidden="true">
          π
        </div>
        <p className="surface-kicker">Private device enrollment</p>
        <h1>Bind this phone once</h1>
        <p>
          Scan or paste the relay's short-lived QR data. This device creates its own key and starts
          in read-only mode.
        </p>
        <label htmlFor="qr-data">Enrollment data</label>
        <textarea
          id="qr-data"
          value={qrData}
          onChange={(event) => setQrData(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder="Paste QR data"
        />
        <div className="enrollment-actions">
          <label className="scan-button">
            Scan image
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file === undefined) return;
                void scanQrImage(file)
                  .then(setQrData)
                  .catch((cause: unknown) => {
                    setError(messageFrom(cause));
                  });
              }}
            />
          </label>
          <Button onPress={submit} isDisabled={busy || qrData.trim().length === 0}>
            {busy ? 'Binding device' : 'Enroll device'}
          </Button>
        </div>
        {error !== null && <div className="inline-alert">{error}</div>}
        {phase === 'authenticating' && <div className="barrier-note">Checking this device</div>}
      </section>
    </main>
  );
}

function Header({
  connection,
  onHome,
  onReview,
  onInbox,
  reviewAvailable,
  theme,
  onThemeChange,
}: {
  readonly connection: ConnectionPhase;
  readonly onHome: () => void;
  readonly onReview: () => void;
  readonly onInbox: () => void;
  readonly reviewAvailable: boolean;
  readonly theme: ThemePreference;
  readonly onThemeChange: (theme: ThemePreference) => void;
}) {
  return (
    <header className="topbar">
      <Button className="wordmark" onPress={onHome} aria-label="Pi Remote home">
        <span className="pi-mark" aria-hidden="true">
          π
        </span>
        <span className="wordmark-copy">
          <strong>Pi Remote</strong>
          <small>Private relay</small>
        </span>
      </Button>
      <div className="topbar-actions">
        {reviewAvailable && (
          <Button className="nav-button" onPress={onInbox}>
            Inbox
          </Button>
        )}
        {reviewAvailable && (
          <Button className="nav-button" onPress={onReview}>
            Review
          </Button>
        )}
        <ThemeControl value={theme} onChange={onThemeChange} />
        <StatusPill phase={connection} />
      </div>
    </header>
  );
}

function ThemeControl({
  value,
  onChange,
}: {
  readonly value: ThemePreference;
  readonly onChange: (value: ThemePreference) => void;
}) {
  return (
    <div className="theme-control" role="group" aria-label="Color theme">
      {(['system', 'light', 'dark'] as const).map((theme) => (
        <ToggleButton
          key={theme}
          className="theme-option"
          isSelected={value === theme}
          onChange={(selected) => {
            if (selected) onChange(theme);
          }}
          aria-label={`Use ${theme} theme`}
        >
          {theme === 'system' ? 'Auto' : theme === 'light' ? 'Light' : 'Dark'}
        </ToggleButton>
      ))}
    </div>
  );
}

export function Review({
  sessions,
  onBack,
  focusId,
}: {
  readonly sessions: readonly { readonly id: string }[];
  readonly onBack: () => void;
  readonly focusId: string | null;
}) {
  const [approvals, setApprovals] = useState<readonly ApprovalCardDto[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [grant, setGrant] = useState<{
    readonly remainingActions: number;
    readonly expiresAt: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const controller = new AbortController();
    void loadApprovals(sessions, controller.signal)
      .then(setApprovals)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(messageFrom(cause));
      });
    const timer = window.setInterval(() => {
      setNow(Date.now());
      void loadApprovals(sessions)
        .then(setApprovals)
        .catch(() => undefined);
    }, 1_000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [sessions]);

  useEffect(() => {
    if (focusId !== null && approvals.some((approval) => approval.approvalId === focusId)) {
      document.getElementById(`approval-${focusId}`)?.scrollIntoView({ block: 'center' });
    }
  }, [approvals, focusId]);

  const decide = (approval: ApprovalCardDto, decision: 'approve' | 'deny') => {
    setPendingId(approval.approvalId);
    setError(null);
    void decideApproval(approval, decision)
      .then(() => loadApprovals(sessions).then(setApprovals))
      .catch((cause: unknown) => setError(messageFrom(cause)))
      .finally(() => setPendingId(null));
  };

  const pending = approvals.filter((approval) => approval.status === 'pending');
  return (
    <main className="review-view">
      <div className="session-toolbar">
        <Button className="back-button" onPress={onBack}>
          Back to sessions
        </Button>
        <span className="review-count">{pending.length} awaiting</span>
      </div>
      <section className="review-heading">
        <p className="surface-kicker">Exact-action review</p>
        <h1>Decide with the full action in view</h1>
        <p>
          Each decision binds only the redacted tool input shown here. The host must still verify it
          before execution.
        </p>
      </section>
      {grant !== null && (
        <div className="grant-banner">
          Accept-edits grant active · {grant.remainingActions} actions remain · expires{' '}
          {relativeTime(grant.expiresAt)}
        </div>
      )}
      {error !== null && <div className="inline-alert">{error}</div>}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {pendingId === null ? '' : 'Decision submitted. Verifying at host.'}
      </div>
      <section className="approval-list">
        {approvals.length === 0 ? (
          <div className="empty-state">
            <span className="empty-glyph" aria-hidden="true">
              ✓
            </span>
            <h3>No approvals</h3>
            <p>Protected actions appear here only after the host requests one.</p>
          </div>
        ) : (
          approvals.map((approval) => {
            const submitted = pendingId === approval.approvalId;
            const expired = Date.parse(approval.expiresAt) <= now;
            return (
              <article
                id={`approval-${approval.approvalId}`}
                className={`approval-card approval-${approval.status}`}
                key={approval.approvalId}
              >
                <header>
                  <span>
                    {approval.source === 'accept-edits' ? 'ACCEPT-EDITS LEASE' : 'PROTECTED ACTION'}
                  </span>
                  <time dateTime={approval.expiresAt}>
                    {expired ? 'Expired' : countdown(approval.expiresAt, now)}
                  </time>
                </header>
                <div className="approval-tool">
                  <span>Tool</span>
                  <strong>{approval.tool}</strong>
                </div>
                <div className="approval-arguments">
                  <span>Relay-redacted canonical input</span>
                  <pre>{approval.canonicalArguments}</pre>
                </div>
                <div className="approval-digest">
                  Digest {approval.digest.slice(0, 12)} / {approval.digest.slice(-8)}
                </div>
                {approval.status === 'pending' && !expired ? (
                  <div className="approval-actions">
                    <Button
                      className="deny-button"
                      isDisabled={submitted}
                      onPress={() => decide(approval, 'deny')}
                    >
                      Deny
                    </Button>
                    <Button isDisabled={submitted} onPress={() => decide(approval, 'approve')}>
                      {submitted ? 'Submitted, verifying' : 'Approve once'}
                    </Button>
                    {['edit', 'write'].includes(approval.tool) && (
                      <Button
                        className="grant-button"
                        isDisabled={submitted}
                        onPress={() => {
                          setPendingId(approval.approvalId);
                          void createAcceptEditsGrant(approval, 3)
                            .then((created) => {
                              setGrant({
                                remainingActions: created.remainingActions,
                                expiresAt: created.expiresAt,
                              });
                            })
                            .catch((cause: unknown) => setError(messageFrom(cause)))
                            .finally(() => setPendingId(null));
                        }}
                      >
                        Accept next 3 edits
                      </Button>
                    )}
                  </div>
                ) : approval.status === 'approved' ? (
                  <div className="approval-result result-verifying" role="status">
                    Submitted, verifying at host
                  </div>
                ) : (
                  <div className={`approval-result result-${approval.status}`} role="status">
                    {approval.status.replaceAll('-', ' ')}:{' '}
                    {approval.reason ?? (expired ? 'lease-expired' : 'host-settled')}
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}

export function Home({
  sessions,
  connection,
  cache,
  device,
  onSelect,
  onRevoke,
  onLogout,
}: {
  readonly sessions: SessionListState;
  readonly connection: ConnectionPhase;
  readonly cache: ReadOnlyCache | null;
  readonly device: DeviceIdentity | null;
  readonly onSelect: (sessionId: string) => void;
  readonly onRevoke: () => void;
  readonly onLogout: () => void;
}) {
  const isStale = sessions.source === 'cache' || connection !== 'live';
  return (
    <main className="home-view">
      <section className="hero">
        <div className="hero-copy-block">
          <p className="surface-kicker">Private relay</p>
          <h1>Your agents, within reach</h1>
          <p className="hero-copy">
            Follow redacted Pi activity from this device. Actions stay read-only until an exact
            approval is requested.
          </p>
        </div>
        <div className="relay-orbit" aria-hidden="true">
          <span className="orbit-core">π</span>
          <span className="orbit-node orbit-node-one" />
          <span className="orbit-node orbit-node-two" />
          <span className="orbit-node orbit-node-three" />
        </div>
      </section>

      <section className="session-section" aria-labelledby="session-heading">
        <div className="section-heading">
          <div>
            <h2 id="session-heading">Recent sessions</h2>
            <p>Opaque identifiers only. No prompts, paths, or host context.</p>
          </div>
          <Freshness stale={isStale} at={sessions.updatedAt ?? cache?.savedAt ?? null} />
        </div>
        {sessions.items.length === 0 ? (
          <EmptyState loading={sessions.phase === 'loading'} error={sessions.error} />
        ) : (
          <div className="session-grid">
            {sessions.items.map((session) => (
              <Button
                className="session-card"
                key={session.id}
                onPress={() => onSelect(session.id)}
              >
                <span className={`session-state state-${session.status}`}>
                  <SessionStateIcon status={session.status} />
                  {sessionStatusLabel(session.status)}
                </span>
                <strong>{compactId(session.id)}</strong>
                <span className="session-meta">
                  {session.messageCount} blocks <i aria-hidden="true" />{' '}
                  {relativeTime(session.updatedAt)}
                </span>
                <span className="open-arrow" aria-hidden="true">
                  Open
                </span>
              </Button>
            ))}
          </div>
        )}
      </section>
      <div className="device-footer">
        <span>
          {device === null ? 'Device key active' : `Host ${compactId(device.hostFingerprint)}`}
        </span>
        <div>
          <Button onPress={onLogout}>Log out</Button>
          <Button onPress={onRevoke}>Revoke this device</Button>
        </div>
      </div>
      <PushSettings />
    </main>
  );
}

export function AttentionInbox({
  onBack,
  onOpen,
}: {
  readonly onBack: () => void;
  readonly onOpen: (resolution: Awaited<ReturnType<typeof openAttentionHint>>) => void;
}) {
  const [items, setItems] = useState<readonly AttentionItemDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetchAttention(controller.signal)
      .then(setItems)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(messageFrom(cause));
      });
    return () => controller.abort();
  }, []);

  return (
    <main className="inbox-view">
      <div className="session-toolbar">
        <Button className="back-button" onPress={onBack}>
          Back to sessions
        </Button>
        <span className="review-count">{items.length} signals</span>
      </div>
      <section className="inbox-heading">
        <p className="surface-kicker">Attention inbox</p>
        <h1>Only what needs you</h1>
        <p>
          Signals carry no session content. Opening one reauthenticates and fetches current relay
          state.
        </p>
      </section>
      {error !== null && <div className="inline-alert">{error}</div>}
      <section className="attention-list" aria-live="polite">
        {items.length === 0 ? (
          <div className="empty-state">
            <span className="empty-glyph" aria-hidden="true">
              ✓
            </span>
            <h3>No attention needed</h3>
            <p>This inbox remains available even when notifications are denied.</p>
          </div>
        ) : (
          items.map((item) => (
            <Button
              className={`attention-card attention-${item.attentionClass}`}
              key={item.lookupId}
              isDisabled={opening === item.lookupId}
              onPress={() => {
                setOpening(item.lookupId);
                setError(null);
                void openAttentionHint(item.lookupId)
                  .then(onOpen)
                  .catch((cause: unknown) => setError(messageFrom(cause)))
                  .finally(() => setOpening(null));
              }}
            >
              <span className="attention-icon" aria-hidden="true">
                {attentionIcon(item.attentionClass)}
              </span>
              <span>{attentionLabel(item.attentionClass)}</span>
              <time dateTime={item.occurredAt}>{relativeTime(item.occurredAt)}</time>
              <strong>
                {opening === item.lookupId ? 'Reauthenticating' : 'Open current state'}
              </strong>
            </Button>
          ))
        )}
      </section>
    </main>
  );
}

function PushSettings() {
  const [config, setConfig] = useState<PushConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void fetchPushConfig()
      .then(setConfig)
      .catch((cause: unknown) => setError(messageFrom(cause)));
  }, []);
  const setPreferences = (preferences: PushPreferences) => {
    setConfig((current) => (current === null ? current : { ...current, preferences }));
    void updatePushPreferences(preferences).catch((cause: unknown) => setError(messageFrom(cause)));
  };
  return (
    <section className="push-settings">
      <div>
        <p className="surface-kicker">This device</p>
        <h2>Attention hints</h2>
        <p>
          Notifications never contain session content or actions. The inbox is always the fallback.
        </p>
      </div>
      {error !== null && <div className="inline-alert">{error}</div>}
      {config === null ? (
        <span>Checking support</span>
      ) : !config.supported || config.vapidPublicKey === null ? (
        <span>Push is disabled at the relay. Inbox remains active.</span>
      ) : config.preferences === null ? (
        <Button
          onPress={() => {
            void subscribeToPush(config.vapidPublicKey ?? '')
              .then((preferences) => setConfig({ ...config, preferences }))
              .catch((cause: unknown) => setError(messageFrom(cause)));
          }}
        >
          Enable notifications
        </Button>
      ) : (
        <>
          <div className="preference-grid">
            {(['needs_input', 'finished', 'error'] as const).map((attentionClass) => (
              <Switch
                key={attentionClass}
                isSelected={config.preferences?.[attentionClass] ?? false}
                onChange={(selected) =>
                  // Preferences are non-null here because the branch above returned early.
                  setPreferences({ ...config.preferences!, [attentionClass]: selected })
                }
              >
                <span className="switch-track" aria-hidden="true">
                  <span />
                </span>
                {attentionLabel(attentionClass)}
              </Switch>
            ))}
          </div>
          <Button
            className="push-disable"
            onPress={() => {
              void unsubscribeFromPush()
                .then(() => setConfig({ ...config, preferences: null }))
                .catch((cause: unknown) => setError(messageFrom(cause)));
            }}
          >
            Disable notifications
          </Button>
        </>
      )}
    </section>
  );
}

export function Session({
  connection,
  sessionId,
  initialCache: cache,
  transcript,
  dispatchConnection,
  dispatchTranscript,
  status,
  onBack,
  onInbox,
  onReview,
  theme,
  onThemeChange,
  mediaCapability = DEFAULT_MEDIA_CAPABILITY_OFF,
}: {
  readonly connection: ConnectionPhase;
  readonly sessionId: string;
  readonly initialCache: ReadOnlyCache | null;
  readonly transcript: TranscriptState;
  readonly dispatchConnection: Dispatch<ConnectionAction>;
  readonly dispatchTranscript: Dispatch<Parameters<typeof transcriptReducer>[1]>;
  readonly status: SessionCardDto['status'];
  readonly onBack: () => void;
  readonly onInbox: () => void;
  readonly onReview: () => void;
  readonly theme: 'system' | 'light' | 'dark';
  readonly onThemeChange: (theme: 'system' | 'light' | 'dark') => void;
  readonly mediaCapability?: Pick<RuntimeMediaCapabilityDto, 'enabled' | 'imageIn'> | null;
}) {
  const cursorRef = useRef<{ epoch: string; seq: number } | null>(null);
  const frameRef = useRef<number | null>(null);
  const pendingMessagesRef = useRef<Array<{ readonly message: SyncMessage; readonly at: string }>>(
    [],
  );
  const [prompt, setPrompt] = useState('');
  const [sendingPrompt, setSendingPrompt] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [retrySubmissionId, setRetrySubmissionId] = useState<string | null>(null);
  const runtimeControls = useRuntime(sessionId);
  const modelCanViewPhotos = runtimeModelCanViewPhotos(runtimeControls.runtime);
  const commandCatalog = useHostCommandCatalog(sessionId, connection);
  const [stopping, setStopping] = useState(false);
  const [binding, setBinding] = useState<SelectedCommandBinding | null>(null);
  // Bounded revalidation progress for one explicit slash Send; the flag is
  // local state only and never carries command content.
  const [slashSubmitting, setSlashSubmitting] = useState(false);
  const [cacheResumeGeneration, setCacheResumeGeneration] = useState(0);
  const planReviewTriggerRef = useRef<HTMLButtonElement>(null);
  const [leavePlanReadyOpen, setLeavePlanReadyOpen] = useState(false);

  // One shared sheet per session view: the header opens the model section,
  // RuntimeStrip the effort section, and focus returns to whichever trigger
  // opened it. The sheet holds no committed runtime state itself.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetSection, setSheetSection] = useState<EffortSheetSection>('model');
  const activeSheetTriggerRef = useRef<HTMLButtonElement | null>(null);
  const headerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const stripTriggerRef = useRef<HTMLButtonElement | null>(null);
  const openSheet = (section: EffortSheetSection, trigger: RefObject<HTMLButtonElement | null>) => {
    activeSheetTriggerRef.current = trigger.current;
    setSheetSection(section);
    setSheetOpen(true);
  };

  useEffect(() => {
    const reconcileRuntime = () => {
      if (document.visibilityState === 'visible') void runtimeControls.refresh('foreground');
    };
    const reconcileCatalog = () => {
      if (document.visibilityState === 'visible') void commandCatalog.refresh('foreground');
    };
    document.addEventListener('visibilitychange', reconcileRuntime);
    document.addEventListener('visibilitychange', reconcileCatalog);
    const onOnline = () => {
      void runtimeControls.refresh('online');
      void commandCatalog.refresh('online');
    };
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', reconcileRuntime);
      document.removeEventListener('visibilitychange', reconcileCatalog);
      window.removeEventListener('online', onOnline);
    };
  }, [runtimeControls.refresh, commandCatalog.refresh]);

  // A binding is only valid for the exact scope it was created in; any
  // session, host-epoch, or revision change clears it so Send must
  // re-resolve. The session guard runs on the same commit as the switch so
  // another session can never retain this session's binding, even for one
  // render.
  useEffect(() => {
    setBinding((current) => {
      if (current === null) return null;
      if (current.sessionId !== sessionId) return null;
      return bindingMatchesSnapshot(current, commandCatalog.snapshot) ? current : null;
    });
  }, [commandCatalog.snapshot, sessionId]);

  // Draft edits re-evaluate the binding: token edits clear it, argument edits
  // retain it.
  const handleDraftChange = (value: string) => {
    setPrompt(value);
    setBinding(bindingAfterDraftChange({ previousDraft: prompt, nextDraft: value, binding }));
  };

  const insertCommand = (name: string, inserted: SelectedCommandBinding) => {
    setBinding(inserted);
  };

  useEffect(() => {
    // The sync stream reaching live is read-only refresh authority. While the
    // initial hydrate is still checking, that hydrate already covers the moment.
    // Deps are keyed on the connection phase value on purpose: a live stream
    // that stays live must not re-trigger hydration on every sync message.
    if (connection === 'live' && runtimeControls.runtime.phase !== 'checking') {
      void runtimeControls.refresh('live');
    }
  }, [connection, runtimeControls.refresh]);

  const stopRun = () => {
    if (stopping) return;
    setStopping(true);
    // Interrupt the running turn. Delivery-unknown is surfaced, never auto-retried.
    void abortPrompt()
      .then((result) => {
        if (result.outcome.status !== 'aborted') {
          setPromptError(`Stop was not confirmed (${result.outcome.status}).`);
        }
      })
      .catch((cause: unknown) => setPromptError(messageFrom(cause)))
      .finally(() => setStopping(false));
  };

  useEffect(
    () => installCacheRevalidation(() => setCacheResumeGeneration((value) => value + 1)),
    [],
  );

  useEffect(() => {
    dispatchTranscript({ type: 'select', sessionId });
    const cached = cache?.transcripts.find((item) => item.sessionId === sessionId);
    if (cached !== undefined) {
      dispatchTranscript({
        type: 'hydrate',
        sessionId,
        epoch: cached.epoch,
        coversThrough: cached.coversThrough,
        blocks: cached.blocks,
        savedAt: cached.savedAt,
      });
      cursorRef.current =
        cached.epoch === null ? null : { epoch: cached.epoch, seq: cached.coversThrough };
    } else {
      cursorRef.current = null;
    }

    const controller = new AbortController();
    void fetchTranscript(sessionId, controller.signal)
      .then((page) => {
        dispatchTranscript({
          type: 'page',
          sessionId,
          coversThrough: page.coversThrough,
          blocks: page.items,
          at: new Date().toISOString(),
        });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          dispatchTranscript({ type: 'error', error: messageFrom(error) });
        }
      });

    let socket: WebSocket | null = null;
    let retryTimer: number | null = null;
    let retryCount = 0;
    let stopped = false;

    const connect = () => {
      if (stopped || !navigator.onLine) {
        dispatchConnection({ type: 'offline' });
        return;
      }
      dispatchConnection({ type: 'connecting', reconnect: retryCount > 0 });
      void openSyncSocket(
        sessionId,
        cursorRef.current,
        (message) => {
          noteRelayHeartbeat();
          const at = new Date().toISOString();
          if (
            message.kind === 'sync.delta' &&
            cursorRef.current !== null &&
            cursorRef.current.epoch !== message.epoch
          ) {
            cursorRef.current = null;
            dispatchTranscript({ type: 'delta', message, at });
            socket?.close();
            return;
          }
          pendingMessagesRef.current.push({ message, at });
          if (frameRef.current === null) {
            frameRef.current = window.requestAnimationFrame(() => {
              for (const pending of pendingMessagesRef.current) {
                applySyncMessage(pending.message, pending.at, dispatchTranscript);
              }
              pendingMessagesRef.current = [];
              frameRef.current = null;
            });
          }
          if (message.kind !== 'sync.gap') {
            cursorRef.current = { epoch: message.epoch, seq: message.coversThrough };
            dispatchConnection({ type: 'live', at });
            retryCount = 0;
            const invalidation = planInvalidationFromSync(message);
            if (invalidation !== null) runtimeControls.invalidatePlan?.(invalidation);
            void runtimeControls.refresh('live');
          }
        },
        controller.signal,
      )
        .then((openedSocket) => {
          if (stopped) {
            openedSocket.close();
            return;
          }
          socket = openedSocket;
          noteRelayHeartbeat();
          openedSocket.addEventListener('close', () => {
            if (stopped) return;
            retryCount += 1;
            dispatchConnection({
              type: navigator.onLine ? 'connecting' : 'offline',
              ...(navigator.onLine ? { reconnect: true } : {}),
            } as ConnectionAction);
            retryTimer = window.setTimeout(connect, Math.min(1_000 * 2 ** retryCount, 15_000));
          });
          openedSocket.addEventListener('error', () => openedSocket.close());
        })
        .catch(() => {
          if (stopped) return;
          retryCount += 1;
          dispatchConnection({ type: 'connecting', reconnect: true });
          retryTimer = window.setTimeout(connect, Math.min(1_000 * 2 ** retryCount, 15_000));
        });
    };
    connect();

    return () => {
      stopped = true;
      controller.abort();
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      pendingMessagesRef.current = [];
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      socket?.close();
    };
  }, [
    cache,
    cacheResumeGeneration,
    dispatchConnection,
    dispatchTranscript,
    runtimeControls.refresh,
    sessionId,
  ]);

  const isStale =
    connection !== 'live' || transcript.source === 'cache' || transcript.awaitingSnapshot;
  const canSubmit =
    connection === 'live' &&
    !transcript.awaitingSnapshot &&
    prompt.trim().length > 0 &&
    !sendingPrompt &&
    !slashSubmitting;
  // Running/plan authority comes only from a host-confirmed runtime
  // snapshot. Without it the client never guesses whether a turn is running
  // and slash Send stays disabled; plan-mode policy itself remains
  // host/extension enforced.
  const runtimeState = runtimeControls.runtime.state;
  const runtimeAuthority =
    runtimeState !== null &&
    (runtimeControls.runtime.status === 'ready' || runtimeControls.runtime.status === 'pending');
  const runtimeRunning = runtimeState !== null && runtimeState.streaming === true;
  const sendPrompt = (behavior?: 'steer' | 'followUp') => {
    const message = prompt.trim();
    if (!canSubmit || message.length === 0) return;
    const submissionId = retrySubmissionId ?? `prompt_${crypto.randomUUID().replaceAll('-', '_')}`;
    const optimisticId = `optimistic_${submissionId}`;
    const occurredAt = new Date().toISOString();
    dispatchTranscript({
      type: 'promptOptimistic',
      sessionId,
      block: {
        id: optimisticId,
        kind: 'text',
        role: 'user',
        text: message,
        revision: 1,
        seq: transcript.coversThrough + 1,
        occurredAt,
      },
    });
    setPrompt('');
    setPromptError(null);
    setRetrySubmissionId(null);
    setSendingPrompt(true);
    void submitPrompt(sessionId, submissionId, message, behavior)
      .then((block) => {
        dispatchTranscript({
          type: 'promptAccepted',
          sessionId,
          optimisticId,
          block,
          at: new Date().toISOString(),
        });
      })
      .catch((cause: unknown) => {
        dispatchTranscript({ type: 'promptRejected', sessionId, optimisticId });
        setPrompt(message);
        setRetrySubmissionId(submissionId);
        setPromptError(messageFrom(cause));
      })
      .finally(() => setSendingPrompt(false));
  };
  // One explicit slash Send: revalidate the current binding, spend one
  // fresh ticket and one expected-revision envelope, and reconcile without
  // retry. Every failure preserves the drafted message, clears the unsafe
  // binding (so the next Send requires reselection), and maps to bounded
  // local copy; a stale race additionally refreshes the catalog.
  const sendSlashDraft = () => {
    const message = prompt.trim();
    if (binding === null || slashSubmitting || message.length === 0 || !canSubmit) return;
    setSlashSubmitting(true);
    setPromptError(null);
    void submitSlashDraft({
      sessionId,
      draft: message,
      binding,
      snapshot: commandCatalog.snapshot,
      connection,
      awaitingSnapshot: transcript.awaitingSnapshot,
      runtimeAuthority,
      running: runtimeRunning,
    })
      .then((outcome) => {
        if (outcome.status === 'accepted') {
          // Optimistic transcript behavior applies only after the host
          // accepted the explicit submission; the authoritative block lands
          // directly.
          dispatchTranscript({
            type: 'promptAccepted',
            sessionId,
            optimisticId: outcome.block.id,
            block: outcome.block,
            at: new Date().toISOString(),
          });
          setPrompt('');
          setBinding(null);
          return;
        }
        // Fail closed: keep the draft, drop the unsafe binding, and never
        // retry. A stale race also refreshes the catalog for reselection.
        setBinding(null);
        if (outcome.code === 'stale') void commandCatalog.refresh('manual');
        setPromptError(slashFailureMessage(outcome.code));
      })
      .finally(() => setSlashSubmitting(false));
  };
  return (
    <main className="session-view">
      <RuntimeStatusRegion runtime={runtimeControls.runtime} />
      <RuntimeModeAnnouncer runtime={runtimeControls.runtime} connection={connection} />
      <SessionHeader
        onBack={onBack}
        onInbox={onInbox}
        onReview={onReview}
        theme={theme}
        onThemeChange={onThemeChange}
        runtimeControls={runtimeControls}
        sheetOpen={sheetOpen}
        onOpenModelSheet={() => openSheet('model', headerTriggerRef)}
        modelTriggerRef={headerTriggerRef}
      />
      <div className="session-statusline" role="status" aria-live="polite">
        <span className={`agent-dot agent-${status}`} aria-hidden="true">
          <SessionStateIcon status={status} />
        </span>
        <span className="session-status-label">{sessionStatusLabel(status)}</span>
        {transcript.updatedAt !== null && (
          <span className="session-status-time">
            · {isStale ? 'reconnecting' : relativeTime(transcript.updatedAt)}
          </span>
        )}
      </div>
      {transcript.error !== null && <div className="inline-alert">{transcript.error}</div>}
      {transcript.awaitingSnapshot && (
        <div className="barrier-note">
          Reconciliation barrier active. Waiting for a fresh snapshot.
        </div>
      )}
      <PlanReadyCard
        artifact={runtimeControls.runtime.planArtifact}
        isLive={
          modeAuthority(runtimeControls.runtime).confirmedMode === 'plan' &&
          runtimeControls.runtime.planLive === true
        }
        canReview={
          runtimeControls.runtime.planToken !== null &&
          runtimeControls.runtime.planToken !== undefined &&
          runtimeControls.runtime.executePending !== true
        }
        reviewButtonRef={planReviewTriggerRef}
        onReview={() => {
          runtimeControls.openPlanReview?.();
        }}
      />
      <ArtifactViewerProvider>
        <TranscriptList
          sessionId={sessionId}
          blocks={transcript.blocks}
          running={status === 'running'}
        />
      </ArtifactViewerProvider>
      <RuntimeStrip
        controls={runtimeControls}
        sheetOpen={sheetOpen}
        onOpenEffortSheet={() => openSheet('effort', stripTriggerRef)}
        effortTriggerRef={stripTriggerRef}
      />
      <AttachmentDraftProvider
        capability={mediaCapability}
        sessionId={sessionId}
        modelCanViewPhotos={modelCanViewPhotos}
      >
        <SessionComposer
          prompt={prompt}
          sessionId={sessionId}
          sessionEpoch={transcript.epoch}
          expectedPromptRevision={runtimeState?.revision ?? null}
          setPrompt={setPrompt}
          onDraftChange={handleDraftChange}
          sendPrompt={sendPrompt}
          sendSlashDraft={sendSlashDraft}
          stopRun={stopRun}
          canSubmit={canSubmit}
          status={status}
          connection={connection}
          awaitingSnapshot={transcript.awaitingSnapshot}
          sendingPrompt={sendingPrompt}
          stopping={stopping}
          promptError={promptError}
          runtimeControls={runtimeControls}
          catalog={commandCatalog}
          binding={binding}
          slashSubmitting={slashSubmitting}
          runtimeAuthority={runtimeAuthority}
          runtimeRunning={runtimeRunning}
          onInsertCommand={insertCommand}
          externalOverlayOpen={sheetOpen}
          mediaCapability={mediaCapability}
          onAttachmentSubmitted={() => {
            setPromptError(null);
            setRetrySubmissionId(null);
            setBinding(null);
          }}
        />
      </AttachmentDraftProvider>
      <PlanReviewSheet
        isOpen={runtimeControls.runtime.reviewOpen === true}
        onOpenChange={(open) => {
          if (!open) runtimeControls.dismissPlanReview?.();
        }}
        artifact={
          runtimeControls.runtime.reviewedPlan?.artifact ?? runtimeControls.runtime.planArtifact
        }
        isExecuting={runtimeControls.runtime.executePending === true}
        triggerRef={planReviewTriggerRef}
        onKeepPlanning={() => runtimeControls.dismissPlanReview?.()}
        onRevisePlan={() => {
          runtimeControls.dismissPlanReview?.();
          window.setTimeout(() => document.getElementById('session-prompt')?.focus(), 0);
        }}
        onLeaveWithoutRunning={() => {
          runtimeControls.dismissPlanReview?.();
          setLeavePlanReadyOpen(true);
        }}
        onExecuteReviewedPlan={() => {
          void runtimeControls.executePlan?.();
        }}
      />
      <LeavePlanSheet
        isOpen={leavePlanReadyOpen}
        onOpenChange={setLeavePlanReadyOpen}
        variant="plan-ready"
        onSwitchToBuild={() => {
          setLeavePlanReadyOpen(false);
          void runtimeControls.setMode('build');
        }}
        onLeaveWithoutRunning={() => {
          setLeavePlanReadyOpen(false);
          void runtimeControls.setMode('build');
        }}
        triggerRef={planReviewTriggerRef}
      />
      <ModelEffortSheet
        isOpen={sheetOpen}
        onOpenChange={setSheetOpen}
        initialSection={sheetSection}
        runtimeControls={runtimeControls}
        triggerRef={activeSheetTriggerRef}
      />
    </main>
  );
}

/**
 * The one document-level polite atomic runtime status region. Confirmations
 * and failures announce through this single region so announcements survive
 * sheet dismissal without competing live regions; copy is bounded local text.
 */
export function RuntimeStatusRegion({ runtime }: { readonly runtime: RuntimeUiState }) {
  return (
    <div
      className="sr-only"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-runtime-announcer="true"
    >
      {runtimeAnnouncement(runtime)}
    </div>
  );
}

export function TranscriptList({
  sessionId,
  blocks,
  running,
}: {
  readonly sessionId?: string;
  readonly blocks: readonly DisplayTranscriptBlock[];
  readonly running: boolean;
}) {
  const artifactSessionId = sessionId ?? '';
  const scrollRef = useRef<HTMLDivElement>(null);
  const previousCountRef = useRef(blocks.length);
  const [announcement, setAnnouncement] = useState('');
  const [atLiveEdge, setAtLiveEdge] = useState(true);
  const [newAway, setNewAway] = useState(0);
  const followToBottom = () => {
    const element = scrollRef.current;
    if (element !== null) element.scrollTop = element.scrollHeight;
    setNewAway(0);
  };
  const onScroll = () => {
    const element = scrollRef.current;
    if (element === null) return;
    // The reader owns the live edge: only follow new blocks when already near the bottom.
    const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 96;
    setAtLiveEdge(nearBottom);
    if (nearBottom) setNewAway(0);
  };
  const normalizedBlocks = useMemo(
    () =>
      normalizeTranscriptBlocks({
        sessionId: artifactSessionId || 'unknown-session',
        blocks,
        settled: !running,
      }),
    [artifactSessionId, blocks, running],
  );
  const renderItems = useMemo(
    () => groupNormalizedTranscript(normalizedBlocks),
    [normalizedBlocks],
  );
  const turnStartIds = useMemo(() => {
    // Mark the first block of every turn after the first so a boundary rule can space
    // consecutive turns; the derivation never mutates or drops a block.
    const turns = groupBlocksIntoTurns(blocks);
    return new Set(turns.slice(1).map((turn) => turn.blocks[0]?.id));
  }, [blocks]);
  const virtualizer = useVirtualizer({
    count: renderItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 180,
    overscan: 6,
  });

  useEffect(() => {
    if (blocks.length > previousCountRef.current) {
      const completed = blocks.at(-1);
      if (completed !== undefined) {
        setAnnouncement(`${blockLabel(completed)} block completed.`);
      }
      const element = scrollRef.current;
      if (atLiveEdge && element !== null) {
        element.scrollTop = element.scrollHeight;
      } else {
        setNewAway((count) => count + (blocks.length - previousCountRef.current));
      }
    }
    previousCountRef.current = blocks.length;
  }, [blocks, atLiveEdge]);

  if (blocks.length === 0) {
    return <div className="empty-transcript">No transcript blocks are available yet.</div>;
  }

  return (
    <section className="transcript-frame" aria-label="Typed transcript" tabIndex={-1}>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      <div className="transcript-scroll" ref={scrollRef} onScroll={onScroll}>
        <div
          className="transcript-virtual"
          style={{ height: virtualizer.getTotalSize() + (running ? 72 : 0) }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const item = renderItems[virtualItem.index];
            if (item === undefined) return null;
            const leadId =
              item.kind === 'block' ? item.block.sourceBlockId : item.blocks[0]?.sourceBlockId;
            const isTurnStart = leadId !== undefined && turnStartIds.has(leadId);
            return (
              <div
                className={isTurnStart ? 'virtual-row turn-start' : 'virtual-row'}
                key={item.id}
                ref={virtualizer.measureElement}
                data-index={virtualItem.index}
                style={{ transform: `translateY(${virtualItem.start}px)` }}
              >
                {item.kind === 'activity' ? (
                  <NormalizedActivityGroup blocks={item.blocks} />
                ) : (
                  <NormalizedTranscriptBlockView block={item.block} sessionId={artifactSessionId} />
                )}
              </div>
            );
          })}
          {running && (
            <div
              className="streaming-marker"
              style={{ transform: `translateY(${virtualizer.getTotalSize()}px)` }}
            >
              <span className="streaming-glyph" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="streaming-label">Working…</span>
            </div>
          )}
        </div>
      </div>
      {!atLiveEdge && (
        <button
          type="button"
          className="scroll-to-latest"
          onClick={followToBottom}
          aria-label={
            newAway > 0
              ? `Jump to ${newAway} new message${newAway === 1 ? '' : 's'}`
              : 'Jump to latest'
          }
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
            <path
              d="M6 9l6 6 6-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {newAway > 0 && <span className="scroll-badge">{newAway}</span>}
        </button>
      )}
    </section>
  );
}

function CollapsedEvidence({
  summary,
  children,
}: {
  readonly summary: string;
  readonly children: ReactNode;
}) {
  // The trigger names what it reveals (e.g. "Tool call · grep") instead of a generic "Show",
  // so routine evidence reads as a quiet, truthful disclosure beside the assistant's prose.
  return (
    <Disclosure defaultExpanded={false}>
      <Heading>
        <Button slot="trigger" className="evidence-trigger">
          <span className="evidence-chevron" aria-hidden="true">
            ›
          </span>
          <span className="evidence-summary">{summary}</span>
        </Button>
      </Heading>
      <DisclosurePanel>{children}</DisclosurePanel>
    </Disclosure>
  );
}

type RenderItem =
  | { readonly kind: 'block'; readonly id: string; readonly block: NormalizedTranscriptBlock }
  | {
      readonly kind: 'activity';
      readonly id: string;
      readonly blocks: readonly NormalizedActivityBlock[];
    };

function groupNormalizedTranscript(blocks: readonly NormalizedTranscriptBlock[]): RenderItem[] {
  const items: RenderItem[] = [];
  let run: NormalizedActivityBlock[] = [];
  const flush = () => {
    const first = run[0];
    if (first !== undefined) {
      items.push({ kind: 'activity', id: `activity-${first.blockId}`, blocks: run });
    }
    run = [];
  };
  for (const block of blocks) {
    if (block.kind === 'activity') {
      run.push(block);
    } else {
      flush();
      items.push({ kind: 'block', id: block.blockId, block });
    }
  }
  flush();
  return items;
}

function normalizedActivitySummary(blocks: readonly NormalizedActivityBlock[]): string {
  const tools = blocks.filter((block) => block.sourceBlock.kind === 'tool_call').length;
  if (tools > 0) return `Worked · ${tools} tool${tools === 1 ? '' : 's'}`;
  if (blocks.some((block) => block.sourceBlock.kind === 'thinking')) return 'Thinking';
  if (blocks.some((block) => block.sourceBlock.kind === 'usage')) return 'Usage';
  return 'Activity';
}

function NormalizedActivityGroup({
  blocks,
}: {
  readonly blocks: readonly NormalizedActivityBlock[];
}) {
  return (
    <div className="activity-group">
      <Disclosure defaultExpanded={false}>
        <Heading>
          <Button slot="trigger" className="evidence-trigger">
            <span className="evidence-chevron" aria-hidden="true">
              ›
            </span>
            <span className="evidence-summary">{normalizedActivitySummary(blocks)}</span>
          </Button>
        </Heading>
        <DisclosurePanel>
          <div className="activity-stack">
            {blocks.map((block) => (
              <RichContentRouter key={block.blockId} block={block} />
            ))}
          </div>
        </DisclosurePanel>
      </Disclosure>
    </div>
  );
}

function NormalizedTranscriptBlockView({
  block,
  sessionId,
}: {
  readonly block: NormalizedTranscriptBlock;
  readonly sessionId: string;
}) {
  if (block.kind === 'fallback' && block.sourceBlock !== null) {
    return <Block block={block.sourceBlock} sessionId={sessionId} />;
  }
  if (block.kind === 'diff' && block.sourceBlock.kind === 'file_diff') {
    return <Block block={block.sourceBlock} sessionId={sessionId} />;
  }
  return <RichContentRouter block={block} />;
}

/** Under-answer actions. Capability-gated and honest: Copy renders only where the Clipboard
 * API exists, and Share only where Web Share does — no decorative or disabled fake actions. */
function AssistantActions({ text }: { readonly text: string }) {
  const [copied, setCopied] = useState(false);
  const canCopy =
    typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function';
  const canShare =
    typeof navigator !== 'undefined' && typeof (navigator as Navigator).share === 'function';
  if (!canCopy && !canShare) return null;
  return (
    <div className="turn-actions">
      {canCopy && (
        <button
          type="button"
          className="turn-action"
          aria-label={copied ? 'Answer copied' : 'Copy answer'}
          onClick={() => {
            void navigator.clipboard
              .writeText(text)
              .then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              })
              .catch(() => undefined);
          }}
        >
          <CopyGlyph />
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      )}
      {canShare && (
        <button
          type="button"
          className="turn-action"
          aria-label="Share answer"
          onClick={() => {
            void (navigator as Navigator).share({ text }).catch(() => undefined);
          }}
        >
          <ShareGlyph />
          <span>Share</span>
        </button>
      )}
    </div>
  );
}

function CopyGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <rect
        x="9"
        y="9"
        width="11"
        height="11"
        rx="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M6 15V6a2 2 0 0 1 2-2h9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ShareGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path
        d="M12 15V4M12 4l-4 4M12 4l4 4M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Block({
  block,
  bare = false,
  sessionId,
}: {
  readonly block: DisplayTranscriptBlock;
  readonly bare?: boolean;
  readonly sessionId: string;
}) {
  let content: ReactNode;
  let label: string;
  // Routine evidence collapses to a recoverable disclosure; high-signal blocks
  // (text, plan, diffs, and tool errors) stay expanded and prominent.
  let collapsible = false;
  switch (block.kind) {
    case 'text':
      label = block.role === 'user' ? 'You' : 'Assistant';
      content = <p className="block-copy">{block.text}</p>;
      break;
    case 'text_artifact':
      label = `Text artifact · ${block.label}`;
      content = <pre className="block-copy">{block.source}</pre>;
      break;
    case 'thinking':
      label = 'Thinking summary';
      content = <p className="block-copy quiet-copy">{block.summary}</p>;
      collapsible = true;
      break;
    case 'plan':
      label = 'Plan / todo';
      content = (
        <ul className="plan-list">
          {block.items.map((item, index) => (
            <li key={`${block.id}-${index}`} className={item.done ? 'done' : ''}>
              <span aria-hidden="true">{item.done ? '✓' : '○'}</span>
              {item.text}
            </li>
          ))}
        </ul>
      );
      break;
    case 'tool_call':
      label = `Tool call · ${block.toolName}`;
      content = <pre>{block.inputSummary}</pre>;
      collapsible = true;
      break;
    case 'tool_result':
      label = `${block.isError ? 'Tool error' : 'Tool result'} · ${block.toolName}`;
      content = <pre className={block.isError ? 'error-output' : ''}>{block.output}</pre>;
      collapsible = !block.isError;
      break;
    case 'file_diff':
      label = 'File diff';
      content = <ArtifactCard block={block} />;
      break;
    case 'file_preview':
      label = 'File preview';
      content = <FilePreviewCard block={block} sessionId={sessionId} />;
      break;
    case 'usage':
      label = 'Usage';
      content = (
        <div className="usage-grid">
          <span>
            <strong>{formatNumber(block.inputTokens)}</strong> input
          </span>
          <span>
            <strong>{formatNumber(block.outputTokens)}</strong> output
          </span>
          <span>
            <strong>{formatCost(block.cost)}</strong> cost
          </span>
        </div>
      );
      collapsible = true;
      break;
    case 'attachment':
      label = 'Photo attachment';
      content = (
        <div className="redacted-attachment-card" role="status">
          <span className="redacted-attachment-glyph" aria-hidden="true">
            ◇
          </span>
          <div>
            <strong>Preview not retained</strong>
            <p>
              Photo {block.ordinal} was delivered without keeping image content in this transcript.
            </p>
          </div>
          <span className="redacted-attachment-status">
            {block.status === 'delivered' ? 'Delivered' : 'Delivery unknown'}
          </span>
        </div>
      );
      break;
    case 'unknown':
      label = 'Unsupported block';
      content = (
        <p className="block-copy quiet-copy" data-unsupported-kind={block.originalKind}>
          A redacted “{block.originalKind}” block cannot be displayed by this client.
        </p>
      );
      break;
  }
  const roleClass = block.kind === 'text' ? ` block-role-${block.role ?? 'assistant'}` : '';
  // Text turns imply role by placement + typography (Claude-style), and collapsible evidence
  // carries its own labelled trigger — so the label/timestamp header only shows for the
  // promoted, standalone blocks (plan and unsupported). When `bare`, this block is
  // already inside an Activity disclosure: show its label and render content directly.
  const showHeader =
    block.kind !== 'file_diff' &&
    block.kind !== 'file_preview' &&
    (bare ? block.kind !== 'text' : block.kind !== 'text' && !collapsible);
  const renderAsDisclosure = collapsible && !bare;
  return (
    <article
      className={`transcript-block block-${block.kind}${roleClass}${bare ? ' block-bare' : ''}`}
    >
      {showHeader && (
        <header>
          <span>{label}</span>
          <time dateTime={block.occurredAt}>{formatTime(block.occurredAt)}</time>
        </header>
      )}
      {renderAsDisclosure ? (
        <CollapsedEvidence summary={label}>{content}</CollapsedEvidence>
      ) : (
        content
      )}
      {!bare && block.kind === 'text' && block.role !== 'user' && (
        <AssistantActions text={block.text} />
      )}
    </article>
  );
}

function FilePreviewCard({
  block,
  sessionId,
}: {
  readonly block: FilePreviewBlock;
  readonly sessionId: string;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const viewer = useOptionalArtifactViewer();
  const availability = filePreviewAvailability(block);
  const stateLabel = {
    ready: 'Ready',
    withheld: 'Withheld',
    missing: 'Missing',
    denied: 'Denied',
    unsupported: 'Unsupported',
  }[availability];
  const metadata = [
    `${stateLabel} preview`,
    `${block.renderer} · ${block.mimeType}`,
    `Revision ${block.revision}`,
    block.byteLength === null ? 'Size unavailable' : `${formatArtifactSize(block.byteLength)}`,
    block.redaction === 'withheld' ? 'Relay withheld content' : 'Relay metadata only',
  ].join('\n');
  return (
    <div className="file-preview-card" data-preview-state={availability}>
      <Button
        ref={buttonRef}
        type="button"
        className="artifact-card"
        aria-label={`Open file preview: ${block.displayName}`}
        data-artifact-session-id={sessionId}
        onPress={() => viewer?.openDiff(block as unknown as FileDiffBlock, buttonRef.current)}
      >
        <span className="artifact-card-glyph" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M5 7h14M5 12h14M5 17h8" />
            <path d="M16 15v6M13 18h6" />
          </svg>
        </span>
        <span className="artifact-card-body">
          <span className="artifact-card-meta">
            <span>File preview</span>
            <span>{stateLabel}</span>
          </span>
          <span className="artifact-card-summary">{block.displayName}</span>
          <span className="artifact-card-peek" aria-label="Preview metadata">
            {metadata}
          </span>
        </span>
        <span className="artifact-card-open" aria-hidden="true">
          Open
        </span>
      </Button>
    </div>
  );
}

function StatusPill({ phase }: { readonly phase: ConnectionPhase }) {
  const labels: Record<ConnectionPhase, string> = {
    unenrolled: 'Enrollment required',
    authenticating: 'Authenticating',
    offline: 'Offline cache',
    connecting: 'Connecting',
    reconnecting: 'Reconnecting',
    live: 'Relay live',
    error: 'Relay unavailable',
  };
  return (
    <span className={`status-pill status-${phase}`} role="status">
      <i />
      {labels[phase]}
    </span>
  );
}

function Freshness({ stale, at }: { readonly stale: boolean; readonly at: string | null }) {
  return (
    <div className={`freshness ${stale ? 'is-stale' : ''}`}>
      <span>{stale ? 'Stale, input disabled' : 'Live, steering enabled'}</span>
      <time dateTime={at ?? undefined}>{at === null ? 'Not synced' : relativeTime(at)}</time>
    </div>
  );
}

function EmptyState({
  loading,
  error,
}: {
  readonly loading: boolean;
  readonly error: string | null;
}) {
  return (
    <div className="empty-state">
      <span className="empty-glyph" aria-hidden="true">
        {loading ? '•••' : '○'}
      </span>
      <h3>{loading ? 'Reading the relay' : 'No sessions found'}</h3>
      <p>{error ?? 'The catalog is empty. Start a local Pi session and refresh this view.'}</p>
    </div>
  );
}

function applySyncMessage(
  message: SyncMessage,
  at: string,
  dispatch: Dispatch<Parameters<typeof transcriptReducer>[1]>,
) {
  switch (message.kind) {
    case 'sync.snapshot':
      dispatch({ type: 'snapshot', message, at });
      break;
    case 'sync.delta':
      dispatch({ type: 'delta', message, at });
      break;
    case 'sync.gap':
      dispatch({ type: 'gap', message });
      break;
  }
}

function planInvalidationFromSync(message: SyncMessage): 'superseded' | 'invalid' | null {
  if (message.kind === 'sync.gap') return null;
  for (const envelope of message.envelopes) {
    const payload = envelope.payload;
    if (!isRecordValue(payload) || payload.type !== 'extension_ui_request') continue;
    if (payload.method !== 'setPlan' || payload.statusKey !== 'pi-remote-plan-artifact') continue;
    if (!isRecordValue(payload.plan)) continue;
    if (payload.plan.validity === 'superseded' || payload.plan.validity === 'invalid') {
      return payload.plan.validity;
    }
  }
  return null;
}

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function loadApprovals(
  sessions: readonly { readonly id: string }[],
  signal?: AbortSignal,
): Promise<readonly ApprovalCardDto[]> {
  const pages = await Promise.all(sessions.map((session) => fetchApprovals(session.id, signal)));
  return pages.flat().sort((left, right) => right.requestedAt.localeCompare(left.requestedAt));
}

function readSessionIdFromLocation(): string | null {
  const match = /^\/session\/([^/]+)$/.exec(window.location.pathname);
  if (match?.[1] === undefined) return null;
  try {
    const sessionId = decodeURIComponent(match[1]);
    return isOpaqueId(sessionId) ? sessionId : null;
  } catch {
    return null;
  }
}

function readAttentionIdFromLocation(): string | null {
  const match = /^\/attention\/([^/]+)$/.exec(window.location.pathname);
  if (match?.[1] === undefined) return null;
  try {
    const lookupId = decodeURIComponent(match[1]);
    return isOpaqueId(lookupId) ? lookupId : null;
  } catch {
    return null;
  }
}

function attentionLabel(value: AttentionItemDto['attentionClass']): string {
  return { needs_input: 'Needs input', finished: 'Finished', error: 'Error' }[value];
}

function attentionIcon(value: AttentionItemDto['attentionClass']): string {
  return { needs_input: '?', finished: '✓', error: '!' }[value];
}

function sessionStatusLabel(value: SessionCardDto['status']): string {
  return { idle: 'Settled', running: 'Working', interrupted: 'Interrupted', unknown: 'Unknown' }[
    value
  ];
}

function SessionStateIcon({ status }: { readonly status: SessionCardDto['status'] }) {
  return (
    <span className="state-icon" aria-hidden="true">
      {status === 'idle' ? '✓' : status === 'running' ? '•' : status === 'interrupted' ? '!' : '?'}
    </span>
  );
}

function blockLabel(block: DisplayTranscriptBlock): string {
  const labels: Record<DisplayTranscriptBlock['kind'], string> = {
    text: 'Assistant response',
    text_artifact: 'Text artifact',
    thinking: 'Thinking summary',
    plan: 'Plan',
    tool_call: 'Tool call',
    tool_result: 'Tool result',
    file_diff: 'File diff',
    file_preview: 'File preview',
    attachment: 'Photo attachment',
    usage: 'Usage',
    unknown: 'Unsupported',
  };
  return labels[block.kind];
}

function runtimeModelCanViewPhotos(runtime: RuntimeUiState): boolean {
  const current = runtime.state?.model;
  if (current === null || current === undefined) return true;
  const catalogModel = runtime.models.find(
    (model) => model.provider === current.provider && model.id === current.id,
  );
  const input = catalogModel?.input ?? current.input;
  return input === undefined || input.includes('image');
}

function readThemePreference(): ThemePreference {
  try {
    const saved = localStorage.getItem('pi-remote.theme');
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
  } catch {
    return 'system';
  }
}

function compactId(id: string): string {
  return id.length <= 18 ? id : `${id.slice(0, 8)}…${id.slice(-6)}`;
}

function relativeTime(value: string): string {
  const milliseconds = Date.now() - Date.parse(value);
  if (!Number.isFinite(milliseconds)) return 'unknown time';
  const minutes = Math.max(0, Math.round(milliseconds / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { notation: 'compact' }).format(value);
}

function formatCost(value: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value);
}

function formatArtifactSize(value: number): string {
  if (value < 1_024) return `${value} B`;
  if (value < 1_024 * 1_024) return `${Math.round(value / 1_024)} KB`;
  return `${(value / (1_024 * 1_024)).toFixed(1)} MB`;
}

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : 'The relay request failed.';
}

/** Bounded local copy for every fail-closed slash outcome; never host text. */
function slashFailureMessage(code: SlashSubmitFailureCode): string {
  switch (code) {
    case 'invalid-draft':
      return 'Choose a command from the list, then send it.';
    case 'not-live':
      return 'Reconnect, then choose a command again.';
    case 'no-running-authority':
      return 'Pi is not reachable right now. Reconnect to send a command.';
    case 'running':
      return 'Pi is running. Commands can be sent after this turn ends.';
    case 'stale':
      return 'Commands changed on the host. Choose the command again.';
    case 'denied':
      return 'That command is not available right now. Choose it again to retry.';
    case 'forbidden':
      return 'Commands are not available for this device.';
    case 'unavailable':
      return 'Pi is not responding. Your draft is saved.';
    case 'incompatible':
      return 'The phone and host versions do not agree. Your draft is saved.';
    case 'delivery-unknown':
      return 'The command may have reached Pi; nothing was retried. Choose it again to resend.';
  }
}

function countdown(expiresAt: string, now: number): string {
  const seconds = Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1_000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')} remaining`;
}
