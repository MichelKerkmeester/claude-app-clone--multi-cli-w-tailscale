// ───────────────────────────────────────────────────────────────────
// MODULE: Sandboxed Diagram Tests
// ───────────────────────────────────────────────────────────────────

import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import SandboxedDiagram, {
  buildDiagramDocument,
  DIAGRAM_FRAME_SANDBOX,
  parseDiagramSource,
} from '../src/pages/chat/rich-content/sandboxed-diagram.svelte';

// ───────────────────────────────────────────────────────────────────
// 1. TESTS
// ───────────────────────────────────────────────────────────────────

describe('SandboxedDiagram', () => {
  it('renders a valid mermaid fence as a sandboxed diagram', () => {
    const source = 'graph TD; A-->B';
    expect(parseDiagramSource(source)).not.toBeNull();
    const { container } = render(SandboxedDiagram, { props: { source } });
    const frame = container.querySelector('iframe');
    expect(frame).not.toBeNull();
    expect(frame?.hasAttribute('sandbox')).toBe(true);
    // Assert the literal value, not the imported constant: comparing the
    // attribute to the constant it is rendered from passes no matter what
    // the constant becomes.
    expect(frame?.getAttribute('sandbox')).toBe('');
    expect(DIAGRAM_FRAME_SANDBOX).toBe('');
    for (const token of ['allow-scripts', 'allow-same-origin', 'allow-top-navigation', 'allow-forms', 'allow-popups']) {
      expect(frame?.getAttribute('sandbox') ?? '').not.toContain(token);
    }
    expect(frame?.getAttribute('sandbox') ?? '').not.toContain('allow-top-navigation');
    const srcdoc = frame?.getAttribute('srcdoc') ?? '';
    expect(srcdoc).toContain('<svg');
    expect(srcdoc).not.toContain('<script');
    expect(srcdoc).not.toMatch(/<script[^>]+src=/u);
    expect(buildDiagramDocument(source)).toContain('<svg');
  });

  it('falls back to no frame when the fence is not a diagram', () => {
    const source = 'this is not a diagram';
    expect(parseDiagramSource(source)).toBeNull();
    const { container } = render(SandboxedDiagram, { props: { source } });
    expect(container.querySelector('iframe')).toBeNull();
    expect(buildDiagramDocument(source)).toBeNull();
  });

  it('escapes markup characters in a node label that the source guard lets through', () => {
    // The source guard rejects `<` followed by a letter, so a raw <script>
    // never parses. What still reaches the renderer is a label carrying bare
    // markup characters — those must arrive escaped, or the frame's document
    // is malformed and the label is reinterpreted as structure.
    const source = 'graph TD; A[a <3 b & "c"]-->B';
    expect(parseDiagramSource(source)).not.toBeNull();
    const { container } = render(SandboxedDiagram, { props: { source } });
    const srcdoc = container.querySelector('iframe')?.getAttribute('srcdoc') ?? '';
    expect(srcdoc).toContain('&lt;3');
    expect(srcdoc).toContain('&amp;');
    expect(srcdoc).toContain('&quot;');
    expect(srcdoc).not.toMatch(/<text[^>]*>[^<]*<3/u);
  });

  it('does not execute a script or HTML payload in diagram source', () => {
    const source = 'graph TD; A-->B\n<script>window.__diagramPwned = true</script>';
    expect(parseDiagramSource(source)).toBeNull();
    const { container } = render(SandboxedDiagram, { props: { source } });
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect((window as Window & { __diagramPwned?: boolean }).__diagramPwned).toBeUndefined();
  });
});
