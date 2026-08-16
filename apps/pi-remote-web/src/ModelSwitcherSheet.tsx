import type { AvailableModelDto, RuntimeControlResponse } from '@pi-remote/pi-rpc-protocol';
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import {
  Autocomplete,
  Button,
  Dialog,
  Header,
  Heading,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  ListBoxSection,
  Modal,
  ModalOverlay,
  SearchField,
} from 'react-aria-components';

import {
  displayModelText,
  filterAndRankModels,
  isModelAvailable,
  matchesModel,
  modelAvailabilityMessage,
  modelCapabilities,
  modelKey,
  organizeModelCatalog,
} from './model-catalog.js';
import {
  modelCountMessage,
  modelRowName,
  modelStatusAnnouncement,
  modelSwitcherStrings,
  modelSwitchedMessage,
  noModelMatchMessage,
  runtimeOutcomeMessage,
} from './model-switcher-strings.js';
import type { RuntimeControls } from './runtime.js';

const SEARCH_THRESHOLD = 8;
const SWIPE_DISMISS_RATIO = 0.3;
const SWIPE_DISMISS_VELOCITY = 1_200;

export interface ModelSwitcherSheetProps {
  readonly isOpen: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly runtimeControls: RuntimeControls;
  readonly triggerRef: RefObject<HTMLButtonElement | null>;
}

export function ModelSwitcherSheet({
  isOpen,
  onOpenChange,
  runtimeControls,
  triggerRef,
}: ModelSwitcherSheetProps) {
  const { runtime, refresh, setModel } = runtimeControls;
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [draftKey, setDraftKey] = useState<string | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const [terminalBlocked, setTerminalBlocked] = useState(false);
  const [mutationMessage, setMutationMessage] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [isAssertive, setIsAssertive] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    readonly pointerId: number;
    readonly startY: number;
    readonly startedAt: number;
  } | null>(null);
  const snapTimerRef = useRef<number | null>(null);
  const current = runtime.state?.model ?? null;
  const currentKey = current === null ? null : modelKey(current);
  const showSearch = runtime.models.length >= SEARCH_THRESHOLD;

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setDraftKey(null);
    setTerminalBlocked(false);
    setMutationMessage('');
    setIsAssertive(false);
    setDragOffset(0);
    setIsDragging(false);
    setIsSnapping(false);
    void refresh('open');
  }, [isOpen, refresh]);

  useEffect(
    () => () => {
      if (snapTimerRef.current !== null) window.clearTimeout(snapTimerRef.current);
    },
    [],
  );

  const visibleModels = useMemo(
    () => filterAndRankModels(runtime.models, deferredQuery),
    [deferredQuery, runtime.models],
  );
  const groupingCurrent =
    current !== null && (deferredQuery.length === 0 || matchesModel(current, deferredQuery))
      ? current
      : null;
  const catalog = useMemo(
    () => organizeModelCatalog(visibleModels, groupingCurrent, deferredQuery.length > 0),
    [deferredQuery.length, groupingCurrent, visibleModels],
  );
  const draft =
    draftKey === null
      ? null
      : (runtime.models.find((model) => modelKey(model) === draftKey) ?? null);
  const streamingBlocked = runtime.state?.streaming === true && !runtime.canSetModelWhileStreaming;
  const canCommit =
    draft !== null &&
    draftKey !== currentKey &&
    isModelAvailable(draft) &&
    runtime.status === 'ready' &&
    runtime.catalogPhase === 'ready' &&
    !runtime.deliveryUnknown &&
    !streamingBlocked &&
    !terminalBlocked &&
    !isCommitting;

  useEffect(() => {
    if (
      runtime.status === 'ready' &&
      runtime.catalogPhase === 'ready' &&
      runtime.lastOutcome === null
    ) {
      setTerminalBlocked(false);
    }
  }, [runtime.catalogPhase, runtime.lastOutcome, runtime.status]);

  useEffect(() => {
    if (!isOpen || !showSearch) return;
    setAnnouncement(modelCountMessage(visibleModels.length, runtime.models.length));
  }, [isOpen, runtime.models.length, showSearch, visibleModels.length]);

  useEffect(() => {
    if (!isOpen || runtime.catalogPhase !== 'ready') return;
    const focusTimer = window.setTimeout(() => {
      dialogRef.current
        ?.querySelector<HTMLElement>('.model-sheet-row[aria-current="true"]:not([data-disabled])')
        ?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(focusTimer);
  }, [currentKey, isOpen, runtime.catalogPhase]);

  const restoreTriggerFocus = () => {
    window.setTimeout(() => triggerRef.current?.focus({ preventScroll: true }), 0);
  };
  const close = () => {
    if (isCommitting) return;
    dragRef.current = null;
    setDragOffset(0);
    setIsDragging(false);
    onOpenChange(false);
    restoreTriggerFocus();
  };
  const beginSwipe = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isCommitting || event.button !== 0) return;
    if (
      event.target instanceof Element &&
      event.target.closest('button, input, [role="button"]') !== null
    )
      return;
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startedAt: performance.now(),
    };
    setIsSnapping(false);
    setIsDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const moveSwipe = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag === null || drag.pointerId !== event.pointerId || isCommitting) return;
    event.preventDefault();
    setDragOffset(Math.max(0, event.clientY - drag.startY));
  };
  const endSwipe = (event: ReactPointerEvent<HTMLDivElement>, canDismiss: boolean) => {
    const drag = dragRef.current;
    if (drag === null || drag.pointerId !== event.pointerId) return;
    const travel = Math.max(0, event.clientY - drag.startY);
    const elapsed = Math.max(1, performance.now() - drag.startedAt);
    const velocity = (travel / elapsed) * 1_000;
    const sheetHeight = modalRef.current?.getBoundingClientRect().height ?? 0;
    dragRef.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (
      canDismiss &&
      !isCommitting &&
      ((sheetHeight > 0 && travel > sheetHeight * SWIPE_DISMISS_RATIO) ||
        velocity >= SWIPE_DISMISS_VELOCITY)
    ) {
      close();
      return;
    }
    setDragOffset(0);
    setIsSnapping(true);
    if (snapTimerRef.current !== null) window.clearTimeout(snapTimerRef.current);
    snapTimerRef.current = window.setTimeout(() => setIsSnapping(false), 220);
  };
  const handleSheetKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && query.length > 0 && !isCommitting) {
      event.preventDefault();
      event.stopPropagation();
      setQuery('');
      searchRef.current?.focus();
    } else if (event.key === 'Escape' && !isCommitting) {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === '/' && showSearch && event.target !== searchRef.current) {
      event.preventDefault();
      searchRef.current?.focus();
    }
  };
  const commit = async () => {
    if (!canCommit || draft === null) return;
    setIsCommitting(true);
    setMutationMessage(modelSwitcherStrings.applying);
    setAnnouncement(modelSwitcherStrings.applying);
    const response = await setModel(draft.provider, draft.id);
    setIsCommitting(false);
    if (response === null) {
      setMutationMessage(modelSwitcherStrings.hostChanged);
      setAnnouncement(modelStatusAnnouncement(modelSwitcherStrings.hostChanged));
      setDraftKey(null);
      return;
    }
    handleOutcome(response, draft);
  };
  const handleOutcome = (response: RuntimeControlResponse, target: AvailableModelDto) => {
    switch (response.outcome.status) {
      case 'accepted':
        setAnnouncement(modelSwitchedMessage(displayModelText(target.label)));
        onOpenChange(false);
        restoreTriggerFocus();
        break;
      case 'stale':
        setTerminalBlocked(true);
        setDraftKey(null);
        setMutationMessage(runtimeOutcomeMessage(response.outcome));
        setAnnouncement(modelStatusAnnouncement(runtimeOutcomeMessage(response.outcome)));
        break;
      case 'policy_blocked':
        setTerminalBlocked(true);
        setMutationMessage(runtimeOutcomeMessage(response.outcome));
        setAnnouncement(modelStatusAnnouncement(runtimeOutcomeMessage(response.outcome)));
        break;
      case 'delivery-unknown':
        setTerminalBlocked(true);
        setMutationMessage(runtimeOutcomeMessage(response.outcome));
        setIsAssertive(true);
        break;
      default:
        setTerminalBlocked(true);
        setMutationMessage(runtimeOutcomeMessage(response.outcome));
        setAnnouncement(modelStatusAnnouncement(runtimeOutcomeMessage(response.outcome)));
    }
  };

  const list = (
    <ModelList
      catalog={catalog}
      currentKey={currentKey}
      draftKey={draftKey}
      isCommitting={isCommitting}
      onStage={(model) => {
        if (isCommitting || !isModelAvailable(model)) return;
        const key = modelKey(model);
        setDraftKey(key === currentKey ? null : key);
        setMutationMessage('');
      }}
      query={deferredQuery}
      total={runtime.models.length}
    />
  );

  return (
    <>
      <span
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-live-announcer="true"
      >
        {announcement}
      </span>
      <ModalOverlay
        className="model-sheet-overlay"
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) close();
        }}
        isDismissable={!isCommitting}
        isKeyboardDismissDisabled={isCommitting}
      >
        <Modal
          ref={modalRef}
          className={`model-sheet-modal${isDragging ? ' is-dragging' : ''}${isSnapping ? ' is-snapping' : ''}`}
          style={
            {
              '--model-sheet-drag-offset': `${dragOffset}px`,
              maxWidth: '100vw',
              overflowX: 'hidden',
            } as CSSProperties
          }
        >
          <Dialog
            ref={dialogRef}
            id="model-switcher-dialog"
            aria-labelledby="model-switcher-title"
            className="model-sheet-dialog"
          >
            <div className="model-sheet-content" onKeyDownCapture={handleSheetKeyDown}>
              <div
                className="model-sheet-drag-region"
                data-testid="model-sheet-drag-region"
                onPointerDown={beginSwipe}
                onPointerMove={moveSwipe}
                onPointerUp={(event) => endSwipe(event, true)}
                onPointerCancel={(event) => endSwipe(event, false)}
              >
                <div className="model-sheet-grabber" aria-hidden="true" />
                <header className="model-sheet-header">
                  <Heading id="model-switcher-title" slot="title" className="model-sheet-title">
                    {modelSwitcherStrings.title}
                  </Heading>
                  <Button
                    className="model-sheet-close"
                    aria-label={modelSwitcherStrings.close}
                    onPress={close}
                    isDisabled={isCommitting}
                    style={{ minBlockSize: '44px' }}
                  >
                    <CloseGlyph />
                  </Button>
                </header>
              </div>

              {streamingBlocked && (
                <p className="model-sheet-policy">{modelSwitcherStrings.streamingBlocked}</p>
              )}

              {runtime.catalogPhase === 'opening' && runtime.models.length === 0 ? (
                <div
                  className="model-sheet-skeletons"
                  aria-label={modelSwitcherStrings.loading}
                  aria-busy="true"
                >
                  {Array.from({ length: 4 }, (_, index) => (
                    <div className="model-sheet-skeleton" key={index} />
                  ))}
                </div>
              ) : showSearch ? (
                <Autocomplete inputValue={query} onInputChange={setQuery} filter={() => true}>
                  <SearchField className="model-sheet-search">
                    <Label>{modelSwitcherStrings.searchLabel}</Label>
                    <div className="model-sheet-search-control">
                      <SearchGlyph />
                      <Input
                        ref={searchRef}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        enterKeyHint="search"
                        placeholder={modelSwitcherStrings.searchPlaceholder}
                      />
                      <Button
                        slot="clear"
                        aria-label={modelSwitcherStrings.clearSearch}
                        className="model-sheet-search-clear"
                        style={{ minBlockSize: '44px' }}
                      >
                        {modelSwitcherStrings.clearSearchVisible}
                      </Button>
                    </div>
                  </SearchField>
                  {list}
                </Autocomplete>
              ) : (
                list
              )}

              <CatalogStatus runtime={runtime} onRefresh={() => void refresh('manual')} />
              <p
                className={`model-sheet-mutation${runtime.deliveryUnknown || isAssertive ? ' is-barrier' : ''}`}
                role={runtime.deliveryUnknown || isAssertive ? 'alert' : undefined}
                aria-live={runtime.deliveryUnknown || isAssertive ? 'assertive' : undefined}
              >
                {mutationMessage ||
                  (runtime.catalogPhase === 'refreshing' ? modelSwitcherStrings.refreshing : '')}
              </p>
              <footer className="model-sheet-footer">
                <Button
                  className="model-sheet-cancel"
                  onPress={close}
                  isDisabled={isCommitting}
                  style={{ minBlockSize: '48px' }}
                >
                  {modelSwitcherStrings.cancel}
                </Button>
                <Button
                  className="model-sheet-switch"
                  onPress={() => void commit()}
                  isDisabled={!canCommit}
                  style={{ minBlockSize: '48px' }}
                >
                  {isCommitting ? modelSwitcherStrings.applying : modelSwitcherStrings.switchModel}
                </Button>
              </footer>
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </>
  );
}

function ModelList({
  catalog,
  currentKey,
  draftKey,
  isCommitting,
  onStage,
  query,
  total,
}: {
  readonly catalog: ReturnType<typeof organizeModelCatalog>;
  readonly currentKey: string | null;
  readonly draftKey: string | null;
  readonly isCommitting: boolean;
  readonly onStage: (model: AvailableModelDto) => void;
  readonly query: string;
  readonly total: number;
}) {
  const rows = catalog.groups.reduce((count, group) => count + group.models.length, 0);
  if (total === 0) {
    return <p className="model-sheet-empty">{modelSwitcherStrings.noModels}</p>;
  }
  if (rows === 0 && catalog.retiredCurrent === null) {
    return <p className="model-sheet-empty">{noModelMatchMessage(displayModelText(query))}</p>;
  }

  return (
    <ListBox
      aria-label={modelSwitcherStrings.availableModels}
      className="model-sheet-list"
      style={{ overflowX: 'hidden', overscrollBehaviorY: 'contain' }}
      selectionMode="single"
      selectedKeys={draftKey === null ? new Set() : new Set([draftKey])}
    >
      {catalog.retiredCurrent !== null && (
        <ListBoxSection id="current-model-section">
          <Header>{modelSwitcherStrings.currentSection}</Header>
          <ModelRow
            model={catalog.retiredCurrent}
            currentKey={currentKey}
            draftKey={draftKey}
            isCommitting={isCommitting}
            isRetired
            onStage={onStage}
          />
        </ListBoxSection>
      )}
      {catalog.groups.map((group) => (
        <ListBoxSection key={group.provider} id={`provider-${modelDomId(group.provider)}`}>
          <Header>{group.providerLabel}</Header>
          {group.models.map((model) => (
            <ModelRow
              key={modelKey(model)}
              model={model}
              currentKey={currentKey}
              draftKey={draftKey}
              isCommitting={isCommitting}
              isRetired={false}
              onStage={onStage}
            />
          ))}
        </ListBoxSection>
      ))}
    </ListBox>
  );
}

function ModelRow({
  model,
  currentKey,
  draftKey,
  isCommitting,
  isRetired,
  onStage,
}: {
  readonly model: AvailableModelDto;
  readonly currentKey: string | null;
  readonly draftKey: string | null;
  readonly isCommitting: boolean;
  readonly isRetired: boolean;
  readonly onStage: (model: AvailableModelDto) => void;
}) {
  const key = modelKey(model);
  const isCurrent = key === currentKey;
  const isDraft = key === draftKey;
  const reason = isRetired ? modelSwitcherStrings.retired : modelAvailabilityMessage(model);
  const capabilities = modelCapabilities(model);
  const descriptionId = `model-description-${modelDomId(key)}`;
  const isApplying = isCommitting && isDraft;
  const accessibleName = modelRowName({
    label: displayModelText(model.label),
    provider: displayModelText(model.provider),
    id: displayModelText(model.id),
    capabilities,
    availability: reason ?? modelSwitcherStrings.available,
    isCurrent,
    isSelected: isDraft,
    isApplying,
  });
  return (
    <ListBoxItem
      ref={(element) => {
        if (isCurrent) element?.setAttribute('aria-current', 'true');
        else element?.removeAttribute('aria-current');
        if (isApplying) element?.setAttribute('aria-busy', 'true');
        else element?.removeAttribute('aria-busy');
        element?.setAttribute('aria-describedby', descriptionId);
      }}
      id={key}
      textValue={`${displayModelText(model.label)} ${displayModelText(model.provider)} ${displayModelText(model.id)}`}
      aria-label={accessibleName}
      className="model-sheet-row"
      style={{ minBlockSize: '64px' }}
      isDisabled={isCommitting || isRetired || !isModelAvailable(model)}
      aria-describedby={descriptionId}
      onAction={() => onStage(model)}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && !isCommitting) {
          event.preventDefault();
          onStage(model);
        }
      }}
    >
      <span className="model-sheet-row-main">
        <span className="model-sheet-row-label">{displayModelText(model.label)}</span>
        <span className="model-sheet-row-id" dir="ltr" translate="no">
          {displayModelText(model.id)}
        </span>
      </span>
      <span className="model-sheet-row-states">
        {isCurrent && (
          <span className="model-state-current">
            <CheckGlyph />
            {modelSwitcherStrings.current}
          </span>
        )}
        {isDraft && <span className="model-state-selected">{modelSwitcherStrings.selected}</span>}
      </span>
      <span id={descriptionId} className="model-sheet-row-description">
        <span>{displayModelText(model.provider)}</span>
        {capabilities.map((capability) => (
          <span key={capability}>{capability}</span>
        ))}
        <span className={reason === null ? 'sr-only' : 'model-state-unavailable'}>
          {reason ?? modelSwitcherStrings.available}
        </span>
        {isApplying && <span>{modelSwitcherStrings.applying}</span>}
      </span>
    </ListBoxItem>
  );
}

function CatalogStatus({
  runtime,
  onRefresh,
}: {
  readonly runtime: RuntimeControls['runtime'];
  readonly onRefresh: () => void;
}) {
  if (runtime.catalogPhase === 'offline') {
    return <p className="model-sheet-catalog-state">{modelSwitcherStrings.offline}</p>;
  }
  if (runtime.catalogPhase === 'unreachable') {
    return (
      <div className="model-sheet-catalog-state">
        {modelSwitcherStrings.unreachable}{' '}
        <Button onPress={onRefresh} style={{ minBlockSize: '44px' }}>
          {modelSwitcherStrings.retryRefresh}
        </Button>
      </div>
    );
  }
  if (runtime.catalogPhase === 'access_denied') {
    return (
      <div className="model-sheet-catalog-state" role="alert">
        {modelSwitcherStrings.accessExpired}{' '}
        <Button onPress={onRefresh} style={{ minBlockSize: '44px' }}>
          {modelSwitcherStrings.reconnect}
        </Button>
      </div>
    );
  }
  return null;
}

function modelDomId(value: string): string {
  return encodeURIComponent(value).replace(/%/gu, '_');
}

function CloseGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="m16 16 4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d="m3 8 3 3 7-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
