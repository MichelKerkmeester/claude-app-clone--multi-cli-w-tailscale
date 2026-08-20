import type { CSSProperties } from 'react';

export interface ImagePlaceholderProps {
  readonly aspectRatio?: number | null;
  readonly state: string;
  readonly noAspect?: boolean;
}

export function ImagePlaceholder({ aspectRatio, state, noAspect = false }: ImagePlaceholderProps) {
  const style: CSSProperties =
    !noAspect && aspectRatio !== null && aspectRatio !== undefined
      ? { aspectRatio: String(aspectRatio) }
      : {};
  return (
    <div
      className="inbound-image-well inbound-image-well-placeholder"
      data-image-well="placeholder"
      data-image-state={state}
      data-no-pixels="true"
      style={style}
      aria-hidden="true"
    >
      <span className="inbound-image-placeholder-pattern" />
    </div>
  );
}
