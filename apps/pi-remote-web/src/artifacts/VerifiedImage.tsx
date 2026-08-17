import { useEffect, useRef, useState } from 'react';
import type { InboundImageReadyBlock } from '@pi-remote/pi-rpc-protocol';

import { demoInboundArtifactResource, isDemoMode } from '../demo.js';
import { useArtifactResource, type ArtifactResourceStatus } from './useArtifactResource.js';
import type { InboundImageLifecycleState } from './ImageStatus.js';

export interface VerifiedImageProps {
  readonly block: InboundImageReadyBlock;
  readonly sessionId: string;
  readonly aspectRatio: number;
  readonly enabled?: boolean;
  readonly forceLoad?: boolean;
  readonly state?: InboundImageLifecycleState;
  readonly onStateChange?: (state: InboundImageLifecycleState) => void;
}

function stateForResourceStatus(status: ArtifactResourceStatus): InboundImageLifecycleState | null {
  switch (status) {
    case 'loading':
      return 'thumbnail-fetching';
    case 'stalled':
      return 'stalled';
    case 'ready':
      return 'inline-ready';
    case 'offline':
      return 'offline-unavailable';
    case 'stale':
      return 'stale';
    case 'denied':
      return 'denied';
    case 'expired':
      return 'expired';
    case 'missing':
    case 'conflict':
      return 'revision-conflict';
    case 'revoked':
      return 'revoked';
    case 'corrupt':
      return 'corrupt';
    case 'rate-limited':
      return 'rate-limited';
    case 'aborted':
      return 'aborted';
    default:
      return null;
  }
}

export function VerifiedImage({
  block,
  sessionId,
  aspectRatio,
  enabled = true,
  forceLoad = false,
  state,
  onStateChange,
}: VerifiedImageProps) {
  const [nearViewport, setNearViewport] = useState(
    forceLoad || typeof IntersectionObserver === 'undefined',
  );
  const [imageFailed, setImageFailed] = useState(false);
  const wellRef = useRef<HTMLDivElement>(null);
  const autoRetryRef = useRef(false);
  const reloadRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    setNearViewport(forceLoad || typeof IntersectionObserver === 'undefined');
    setImageFailed(false);
    autoRetryRef.current = false;
  }, [block.id, block.revision, forceLoad]);

  useEffect(() => {
    if (!enabled || forceLoad || nearViewport) return undefined;
    const element = wellRef.current;
    if (element === null || typeof IntersectionObserver === 'undefined') {
      setNearViewport(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0)) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200% 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled, forceLoad, nearViewport]);

  const resource = useArtifactResource(sessionId, block, {
    enabled: enabled && (forceLoad || nearViewport),
    variant: 'thumbnail',
    requireImageDecode: true,
    ...(isDemoMode() ? { read: demoInboundArtifactResource } : {}),
  });
  reloadRef.current = resource.reload;

  useEffect(() => {
    if (!enabled || (resource.status !== 'relay-error' && resource.status !== 'stalled')) {
      return undefined;
    }
    if (autoRetryRef.current) return undefined;
    autoRetryRef.current = true;
    const timer = window.setTimeout(() => reloadRef.current(), 750);
    return () => window.clearTimeout(timer);
  }, [enabled, resource.status]);

  useEffect(() => {
    if (state !== undefined || onStateChange === undefined) return;
    const next = stateForResourceStatus(resource.status);
    if (next !== null) onStateChange(next);
  }, [onStateChange, resource.status, state]);

  const showPixels =
    !imageFailed &&
    resource.status === 'ready' &&
    resource.objectUrl !== null &&
    (state === undefined ||
      state === 'inline-ready' ||
      state === 'full-fetching' ||
      state === 'stalled' ||
      state === 'full-degraded' ||
      state === 'offline-loaded');
  const style = { aspectRatio: String(aspectRatio) };

  return (
    <div
      ref={wellRef}
      className={showPixels ? 'inbound-image-well inbound-image-well-ready' : 'inbound-image-well'}
      data-image-well={showPixels ? 'verified' : 'placeholder'}
      data-verified-image={showPixels ? 'true' : undefined}
      data-image-state={state ?? stateForResourceStatus(resource.status) ?? 'deferred'}
      data-no-pixels={showPixels ? undefined : 'true'}
      style={style}
      aria-hidden="true"
    >
      {showPixels ? (
        <img
          className="inbound-image-thumbnail"
          src={resource.objectUrl}
          alt=""
          draggable={false}
          onError={() => {
            setImageFailed(true);
            resource.close();
            onStateChange?.('corrupt');
          }}
        />
      ) : (
        <span className="inbound-image-placeholder-pattern" />
      )}
    </div>
  );
}
