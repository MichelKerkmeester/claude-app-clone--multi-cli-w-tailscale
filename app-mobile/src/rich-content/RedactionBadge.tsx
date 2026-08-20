import type { RedactionMetadata } from '@pi-remote/pi-rpc-protocol';

export interface RedactionBadgeProps {
  readonly redaction: RedactionMetadata | null;
}

export function RedactionBadge({ redaction }: RedactionBadgeProps) {
  if (redaction === null || redaction.fieldsRedacted < 1) return null;
  const categories = [...new Set(redaction.reasons.map(redactionCategory))];
  return (
    <span className="rich-redaction-badge" title="Sensitive values were redacted">
      Redacted{categories.length > 0 ? ` · ${categories.join(' · ')}` : ''}
    </span>
  );
}

function redactionCategory(reason: string): string {
  const normalized = reason.toLocaleLowerCase();
  if (/(?:secret|token|credential|password|key)/u.test(normalized)) return 'Secret';
  if (/(?:path|file|directory)/u.test(normalized)) return 'Path';
  if (/(?:command|input|argument)/u.test(normalized)) return 'Input';
  if (/(?:output|stdout|stderr)/u.test(normalized)) return 'Output';
  if (/(?:identity|session|user)/u.test(normalized)) return 'Identity';
  return 'Protected';
}
