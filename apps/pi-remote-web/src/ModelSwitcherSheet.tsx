import type { AvailableModelDto, RuntimeControlResponse } from '@pi-remote/pi-rpc-protocol';
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
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
import type { RuntimeControls } from './runtime.js';

const SEARCH_THRESHOLD = 8;

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
  const searchRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const current = runtime.state?.model ?? null;
  const currentKey = current === null ? null : modelKey(current);
  const showSearch = runtime.models.length >= SEARCH_THRESHOLD;

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setDraftKey(null);
    setTerminalBlocked(false);
    setMutationMessage('');
    void refresh('open');
  }, [isOpen, refresh]);

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
    setAnnouncement(resultCountMessage(visibleModels.length, runtime.models.length));
  }, [isOpen, runtime.models.length, showSearch, visibleModels.length]);

  useEffect(() => {
    if (!isOpen || runtime.catalogPhase !== 'ready') return;
    dialogRef.current
      ?.querySelector<HTMLElement>('.model-sheet-row[aria-current="true"]:not([data-disabled])')
      ?.focus();
  }, [currentKey, isOpen, runtime.catalogPhase]);

  const restoreTriggerFocus = () => {
    window.setTimeout(() => triggerRef.current?.focus({ preventScroll: true }), 0);
  };
  const close = () => {
    if (isCommitting) return;
    onOpenChange(false);
    restoreTriggerFocus();
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
    setMutationMessage('Applying…');
    const response = await setModel(draft.provider, draft.id);
    setIsCommitting(false);
    if (response === null) {
      setMutationMessage('Host state changed. Choose again.');
      setDraftKey(null);
      return;
    }
    handleOutcome(response, draft);
  };
  const handleOutcome = (response: RuntimeControlResponse, target: AvailableModelDto) => {
    switch (response.outcome.status) {
      case 'accepted':
        setAnnouncement(`Model switched to ${displayModelText(target.label)}.`);
        onOpenChange(false);
        restoreTriggerFocus();
        break;
      case 'stale':
        setTerminalBlocked(true);
        setDraftKey(null);
        setMutationMessage('Host state changed. Choose again.');
        break;
      case 'policy_blocked':
        setTerminalBlocked(true);
        setMutationMessage('Blocked by host policy.');
        break;
      case 'delivery-unknown':
        setTerminalBlocked(true);
        setMutationMessage('Outcome unknown · Reconcile before switching again.');
        break;
      default:
        setTerminalBlocked(true);
        setMutationMessage(runtime.error ?? 'That model is unavailable. Choose another model.');
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
      <span className="sr-only" role="status" aria-live="polite">
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
        <Modal className="model-sheet-modal" style={{ maxWidth: '100vw', overflowX: 'hidden' }}>
          <Dialog
            ref={dialogRef}
            id="model-switcher-dialog"
            aria-labelledby="model-switcher-title"
            className="model-sheet-dialog"
          >
            <div className="model-sheet-content" onKeyDownCapture={handleSheetKeyDown}>
              <div className="model-sheet-grabber" aria-hidden="true" />
              <header className="model-sheet-header">
                <Heading id="model-switcher-title" slot="title" className="model-sheet-title">
                  Change model
                </Heading>
                <Button
                  className="model-sheet-close"
                  aria-label="Close model switcher"
                  onPress={close}
                  isDisabled={isCommitting}
                >
                  <CloseGlyph />
                </Button>
              </header>

              {streamingBlocked && (
                <p className="model-sheet-policy">
                  Available after the current turn. You can still browse and select a model.
                </p>
              )}

              {runtime.catalogPhase === 'opening' && runtime.models.length === 0 ? (
                <div className="model-sheet-skeletons" aria-label="Loading models" aria-busy="true">
                  {Array.from({ length: 4 }, (_, index) => (
                    <div className="model-sheet-skeleton" key={index} />
                  ))}
                </div>
              ) : showSearch ? (
                <Autocomplete inputValue={query} onInputChange={setQuery} filter={() => true}>
                  <SearchField className="model-sheet-search">
                    <Label>Search models</Label>
                    <div className="model-sheet-search-control">
                      <SearchGlyph />
                      <Input
                        ref={searchRef}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        enterKeyHint="search"
                        placeholder="Provider, model, or ID"
                      />
                      <Button aria-label="Clear model search" className="model-sheet-search-clear">
                        Clear
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
                className={`model-sheet-mutation${runtime.deliveryUnknown ? ' is-barrier' : ''}`}
                role={runtime.deliveryUnknown ? 'alert' : 'status'}
                aria-live={runtime.deliveryUnknown ? 'assertive' : 'polite'}
              >
                {mutationMessage ||
                  runtime.error ||
                  (runtime.catalogPhase === 'refreshing' ? 'Refreshing…' : '')}
              </p>
              <footer className="model-sheet-footer">
                <Button className="model-sheet-cancel" onPress={close} isDisabled={isCommitting}>
                  Cancel
                </Button>
                <Button
                  className="model-sheet-switch"
                  onPress={() => void commit()}
                  isDisabled={!canCommit}
                >
                  {isCommitting ? 'Applying…' : 'Switch model'}
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
    return (
      <p className="model-sheet-empty">No models configured. Configure a provider on the host.</p>
    );
  }
  if (rows === 0 && catalog.retiredCurrent === null) {
    return <p className="model-sheet-empty">No models match “{displayModelText(query)}”.</p>;
  }

  return (
    <ListBox
      aria-label="Available models"
      className="model-sheet-list"
      style={{ overflowX: 'hidden' }}
      selectionMode="single"
      selectedKeys={draftKey === null ? new Set() : new Set([draftKey])}
    >
      {catalog.retiredCurrent !== null && (
        <ListBoxSection id="current-model-section">
          <Header>Current model</Header>
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
  const reason = isRetired ? 'No longer available' : modelAvailabilityMessage(model);
  const capabilities = modelCapabilities(model);
  const descriptionId = `model-description-${modelDomId(key)}`;
  return (
    <ListBoxItem
      ref={(element) => {
        if (isCurrent) element?.setAttribute('aria-current', 'true');
        else element?.removeAttribute('aria-current');
      }}
      id={key}
      textValue={`${displayModelText(model.label)} ${displayModelText(model.provider)} ${displayModelText(model.id)}`}
      className="model-sheet-row"
      isDisabled={isCommitting || isRetired || !isModelAvailable(model)}
      aria-describedby={descriptionId}
      aria-busy={isCommitting && isDraft ? 'true' : undefined}
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
            Current
          </span>
        )}
        {isDraft && <span className="model-state-selected">Selected</span>}
      </span>
      <span id={descriptionId} className="model-sheet-row-description">
        <span>{displayModelText(model.provider)}</span>
        {capabilities.map((capability) => (
          <span key={capability}>{capability}</span>
        ))}
        {reason !== null && <span className="model-state-unavailable">{reason}</span>}
        {isCommitting && isDraft && <span>Applying…</span>}
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
    return (
      <p className="model-sheet-catalog-state">You’re offline. Catalog browsing is read-only.</p>
    );
  }
  if (runtime.catalogPhase === 'unreachable') {
    return (
      <div className="model-sheet-catalog-state">
        Host unreachable. <Button onPress={onRefresh}>Retry refresh</Button>
      </div>
    );
  }
  if (runtime.catalogPhase === 'access_denied') {
    return (
      <div className="model-sheet-catalog-state" role="alert">
        Access expired. <Button onPress={onRefresh}>Reconnect</Button>
      </div>
    );
  }
  return null;
}

function resultCountMessage(visible: number, total: number): string {
  const category = new Intl.PluralRules().select(visible);
  return `${visible} of ${total} ${category === 'one' ? 'model' : 'models'}`;
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
