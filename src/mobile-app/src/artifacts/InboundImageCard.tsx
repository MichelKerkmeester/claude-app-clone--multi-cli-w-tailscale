import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { Button } from 'react-aria-components';
import type { InboundImageBlock, InboundImageReadyBlock } from '@pi-remote/pi-rpc-protocol';

import { useOptionalArtifactViewer } from './ArtifactViewerProvider.js';
import { ImagePlaceholder } from './ImagePlaceholder.js';
import {
  imageStatusDefinition,
  ImageStatus,
  type InboundImageLifecycleState,
  type InboundImageStatusAction,
} from './ImageStatus.js';
import { VerifiedImage } from './VerifiedImage.js';

export interface InboundImageCardProps {
  readonly block: InboundImageBlock;
  readonly sessionId: string;
  /** Used by the local fixture to hold a specific lifecycle state in place. */
  readonly state?: InboundImageLifecycleState;
  /** Real transcript cards begin ready blocks in the deferred state. */
  readonly deferReady?: boolean;
  readonly onAction?: (action: InboundImageStatusAction) => void;
}

const PIXEL_STATES = new Set<InboundImageLifecycleState>([
  'inline-ready',
  'full-fetching',
  'stalled',
  'full-degraded',
  'offline-loaded',
]);

function initialState(block: InboundImageBlock, deferReady: boolean): InboundImageLifecycleState {
  if (block.availability === 'processing') return 'processing';
  if (block.availability === 'expired') return 'expired';
  if (block.availability === 'revoked') return 'revoked';
  if (block.availability === 'withheld') {
    return block.reason === 'capture-permission' ? 'capture-permission' : 'withheld';
  }
  return deferReady ? 'deferred' : 'inline-ready';
}

function aspectRatioFor(block: InboundImageBlock): number {
  if (block.availability !== 'ready') return 1.6;
  const { width, height } = block.artifact.thumbnail;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 1.6;
  return Math.min(4, Math.max(0.5, width / height));
}

function terminalLabel(state: InboundImageLifecycleState): string | null {
  switch (state) {
    case 'capture-permission':
      return 'Withheld';
    case 'withheld':
      return 'Withheld';
    case 'expired':
      return 'Expired';
    case 'revoked':
      return 'Revoked';
    case 'corrupt':
      return 'Corrupt';
    case 'denied':
      return 'Denied';
    case 'missing':
    case 'revision-conflict':
      return 'Unavailable';
    case 'unsupported':
      return 'Unsupported';
    case 'privacy-covered':
      return 'Privacy covered';
    default:
      return null;
  }
}

function cardAccessibleName(block: InboundImageBlock): string {
  return `Open ${block.displayName.toLowerCase()} preview, processed, revision ${block.revision}`;
}

export function InboundImageCard({
  block,
  sessionId,
  state,
  deferReady = false,
  onAction,
}: InboundImageCardProps) {
  const viewer = useOptionalArtifactViewer();
  const controlled = state !== undefined;
  const [currentState, setCurrentState] = useState(() => initialState(block, deferReady));
  const buttonRef = useRef<HTMLButtonElement>(null);
  const identityRef = useRef(`${block.id}:${block.revision}:${deferReady ? 'deferred' : 'direct'}`);
  const pointerOriginRef = useRef<{ readonly x: number; readonly y: number } | null>(null);
  const pressCancelledRef = useRef(false);

  useEffect(() => {
    const identity = `${block.id}:${block.revision}:${deferReady ? 'deferred' : 'direct'}`;
    if (identityRef.current === identity) return;
    identityRef.current = identity;
    setCurrentState(initialState(block, deferReady));
  }, [block.id, block.revision, deferReady]);

  const imageState = state ?? currentState;
  const definition = imageStatusDefinition(imageState);
  const aspectRatio = aspectRatioFor(block);
  const redactionsApplied = block.availability === 'ready' && block.redaction.status === 'applied';
  const metadata = [
    ...(imageState === 'processing' ? [] : ['Processed']),
    `Revision ${block.revision}`,
    ...(redactionsApplied ? ['Redactions applied'] : []),
    ...(terminalLabel(imageState) === null ? [] : [terminalLabel(imageState) as string]),
  ];
  const canOpen = block.availability === 'ready' && imageState === 'inline-ready';
  const renderVerified =
    block.availability === 'ready' && !definition.noPixels && imageState !== 'processing';
  const verifiedState = controlled ? { state: imageState } : {};

  const handleStateChange = (next: InboundImageLifecycleState) => {
    if (!controlled) setCurrentState(next);
  };

  const handleAction = (action: InboundImageStatusAction) => {
    onAction?.(action);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    pointerOriginRef.current = { x: event.clientX, y: event.clientY };
    pressCancelledRef.current = false;
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const origin = pointerOriginRef.current;
    if (origin === null) return;
    if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 10) {
      pressCancelledRef.current = true;
    }
  };

  const handlePress = () => {
    const cancelled = pressCancelledRef.current;
    pointerOriginRef.current = null;
    pressCancelledRef.current = false;
    if (cancelled || !canOpen || block.availability !== 'ready') return;
    viewer?.openInboundImage(block as InboundImageReadyBlock, buttonRef.current, sessionId);
  };

  const cardBody: ReactNode = (
    <div className="inbound-image-card-body">
      <div className="inbound-image-identity" dir="auto">
        <div className="inbound-image-title-wrap">
          <strong className="inbound-image-title">{block.displayName}</strong>
          <span className="inbound-image-metadata">
            {metadata.map((item, index) => (
              <span key={`${item}-${index}`}>
                {item.startsWith('Revision ') ? <bdi dir="ltr">{item}</bdi> : item}
              </span>
            ))}
          </span>
        </div>
      </div>
      {renderVerified ? (
        <VerifiedImage
          block={block as InboundImageReadyBlock}
          sessionId={sessionId}
          aspectRatio={aspectRatio}
          forceLoad={controlled && PIXEL_STATES.has(imageState)}
          {...verifiedState}
          onStateChange={handleStateChange}
        />
      ) : (
        <ImagePlaceholder
          aspectRatio={definition.noAspect ? null : aspectRatio}
          state={imageState}
          noAspect={definition.noAspect ?? false}
        />
      )}
      <ImageStatus state={imageState} onAction={handleAction} />
    </div>
  );

  return (
    <article
      className="inbound-image-card"
      data-inbound-image-card="true"
      data-image-state={imageState}
      data-availability={block.availability}
      aria-busy={definition.ariaBusy || undefined}
      dir="auto"
    >
      {canOpen ? (
        <Button
          ref={buttonRef}
          className="inbound-image-card-button"
          aria-label={cardAccessibleName(block)}
          aria-haspopup="dialog"
          onPress={handlePress}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerCancel={() => {
            pressCancelledRef.current = true;
            pointerOriginRef.current = null;
          }}
        >
          {cardBody}
        </Button>
      ) : (
        cardBody
      )}
    </article>
  );
}
