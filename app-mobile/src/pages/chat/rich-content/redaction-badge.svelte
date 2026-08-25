<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: REDACTION BADGE
  // ───────────────────────────────────────────────────────────────────

  // This surface: RedactionBadge — badge that labels redacted sensitive fields by category.
  import type { RedactionMetadata } from '@pi-remote/pi-rpc-protocol';

  interface Props {
    readonly redaction: RedactionMetadata | null;
  }

  let { redaction }: Props = $props();

  // Keep redaction category focused on its single responsibility.
  function redactionCategory(reason: string): string {
    const normalized = reason.toLocaleLowerCase();
    if (/(?:secret|token|credential|password|key)/u.test(normalized)) return 'Secret';
    if (/(?:path|file|directory)/u.test(normalized)) return 'Path';
    if (/(?:command|input|argument)/u.test(normalized)) return 'Input';
    if (/(?:output|stdout|stderr)/u.test(normalized)) return 'Output';
    if (/(?:identity|session|user)/u.test(normalized)) return 'Identity';
    return 'Protected';
  }
</script>

<!-- Component content -->
{#if redaction !== null && redaction.fieldsRedacted >= 1}
  {@const categories = [...new Set(redaction.reasons.map(redactionCategory))]}
  <span class="rich--redaction-badge" title="Sensitive values were redacted">
    Redacted{categories.length > 0 ? ` · ${categories.join(' · ')}` : ''}
  </span>
{/if}

<style>
  /* Keep this rule aligned with its surrounding surface. */
  .rich--redaction-badge {
    padding: 0.2rem 0.45rem;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    color: var(--ink-muted);
    font-size: 0.6875rem;
    white-space: nowrap;
  }
</style>
