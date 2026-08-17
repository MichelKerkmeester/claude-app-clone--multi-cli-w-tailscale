import type { InboundImageBlock } from '@pi-remote/pi-rpc-protocol';

import { demoInboundImageState, demoInboundMediaCapabilityOff } from '../demo.js';
import { InboundImageCard } from './InboundImageCard.js';

export interface InboundImageBlockViewProps {
  readonly block: InboundImageBlock;
  readonly sessionId: string;
}

export function InboundImageBlockView({ block, sessionId }: InboundImageBlockViewProps) {
  if (demoInboundMediaCapabilityOff()) {
    return (
      <p className="block-copy quiet-copy" data-unsupported-kind="inbound_image">
        A redacted “inbound_image” block cannot be displayed by this client.
      </p>
    );
  }
  const fixtureState = demoInboundImageState();
  return (
    <InboundImageCard
      block={block}
      sessionId={sessionId}
      {...(fixtureState === null ? { deferReady: true } : { state: fixtureState })}
    />
  );
}
