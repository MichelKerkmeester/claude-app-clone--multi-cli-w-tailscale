// ───────────────────────────────────────────────────────────────────
// MODULE: Transcript Selection Scope
// ───────────────────────────────────────────────────────────────────

// Copy only a selection whose anchor lives inside the transcript root, so a
// foreign selection cannot be claimed as this session's.

export interface TranscriptSelection {
  readonly text: string;
  readonly inside: boolean;
}

export function readTranscriptSelection(root: HTMLElement | null): TranscriptSelection {
  if (typeof window === 'undefined') return { text: '', inside: false };
  const selection = window.getSelection();
  const text = selection?.toString() ?? '';
  if (selection === null || text.length === 0 || root === null) {
    return { text, inside: false };
  }
  const anchor = selection.anchorNode;
  if (anchor === null) return { text, inside: false };
  const node =
    anchor.nodeType === Node.ELEMENT_NODE ? (anchor as Element) : anchor.parentElement;
  return { text, inside: node !== null && root.contains(node) };
}
