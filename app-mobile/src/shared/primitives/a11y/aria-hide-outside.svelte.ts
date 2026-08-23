// ───────────────────────────────────────────────────────────────────
// MODULE: Aria Hide-Outside
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { getContext, setContext } from 'svelte';

// ───────────────────────────────────────────────────────────────────
// 2. CONTEXT AND SESSION TYPES
// ───────────────────────────────────────────────────────────────────

export const SHEET_CONTEXT = Symbol('sheet-context');

export interface SheetContext {
  readonly isOpen: () => boolean;
}

interface HideSession {
  readonly targets: readonly Element[];
}

// ───────────────────────────────────────────────────────────────────
// 3. ACTIVE SESSION STATE
// ───────────────────────────────────────────────────────────────────

const activeSessions: HideSession[] = [];
const changedAttributes = new Map<Element, string | null>();
let observer: MutationObserver | null = null;
let observedBody: HTMLElement | null = null;

// ───────────────────────────────────────────────────────────────────
// 4. PUBLIC API
// ───────────────────────────────────────────────────────────────────

export function hideOutside(targets: Element[]): () => void {
  if (typeof document === 'undefined' || document.body === null) return () => {};

  const session: HideSession = { targets: [...targets] };
  activeSessions.push(session);
  if (activeSessions.length === 1) {
    const body = document.body;
    observedBody = body;
    if (typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(() => applyVisibility());
      observer.observe(body, { childList: true, subtree: true });
    }
  }

  applyVisibility();

  let released = false;
  return () => {
    if (released) return;
    released = true;
    const index = activeSessions.indexOf(session);
    if (index !== -1) activeSessions.splice(index, 1);

    if (activeSessions.length === 0) {
      observer?.disconnect();
      observer = null;
      restoreChangedAttributes();
      changedAttributes.clear();
      observedBody = null;
      return;
    }

    applyVisibility();
  };
}

export function setSheetContext(isOpen: () => boolean): void {
  setContext<SheetContext>(SHEET_CONTEXT, { isOpen });
}

export function getSheetContext(): SheetContext | undefined {
  return getContext<SheetContext | undefined>(SHEET_CONTEXT);
}

// ───────────────────────────────────────────────────────────────────
// 5. VISIBILITY ENGINE
// ───────────────────────────────────────────────────────────────────

function applyVisibility(): void {
  const body = observedBody ?? (typeof document === 'undefined' ? null : document.body);
  if (body === null || activeSessions.length === 0) return;

  const elements = collectElements(body);
  const exempt = new Set<Element>();

  for (const session of activeSessions) {
    for (const target of session.targets) addExemptSubtreeAndAncestors(target, body, exempt);
  }

  for (const element of elements) {
    if (isLiveRegion(element)) addExemptSubtreeAndAncestors(element, body, exempt);
  }

  for (const element of elements) {
    if (exempt.has(element)) restoreOwnedAttribute(element);
    else hideElement(element);
  }
}

function collectElements(body: HTMLElement): Element[] {
  const elements: Element[] = [];
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode()) elements.push(walker.currentNode as Element);
  return elements;
}

function addExemptSubtreeAndAncestors(
  element: Element,
  body: HTMLElement,
  exempt: Set<Element>,
): void {
  exempt.add(element);
  for (const descendant of element.querySelectorAll('*')) exempt.add(descendant);

  let ancestor = element.parentElement;
  while (ancestor !== null && ancestor !== body) {
    exempt.add(ancestor);
    ancestor = ancestor.parentElement;
  }
}

function isLiveRegion(element: Element): boolean {
  const live = element.getAttribute('aria-live');
  if (live !== null && live.toLowerCase() !== 'off') return true;

  const role = element.getAttribute('role')?.toLowerCase();
  return role === 'alert' || role === 'log' || role === 'marquee' || role === 'status' || role === 'timer';
}

// ───────────────────────────────────────────────────────────────────
// 6. ARIA-HIDDEN ATTRIBUTE BOOKKEEPING
// ───────────────────────────────────────────────────────────────────

function hideElement(element: Element): void {
  if (element.getAttribute('aria-hidden')?.toLowerCase() === 'true') return;
  if (!changedAttributes.has(element)) {
    changedAttributes.set(element, element.getAttribute('aria-hidden'));
  }
  element.setAttribute('aria-hidden', 'true');
}

function restoreOwnedAttribute(element: Element): void {
  if (!changedAttributes.has(element)) return;
  const previous = changedAttributes.get(element);
  if (previous === undefined) return;
  if (previous === null) element.removeAttribute('aria-hidden');
  else element.setAttribute('aria-hidden', previous);
}

function restoreChangedAttributes(): void {
  for (const [element, previous] of changedAttributes) {
    if (previous === null) element.removeAttribute('aria-hidden');
    else element.setAttribute('aria-hidden', previous);
  }
}
