// ───────────────────────────────────────────────────────────────────
// MODULE: Aria hide-outside reference counting
// ───────────────────────────────────────────────────────────────────
// Sheets nest: a sheet can open another sheet. The outside-hiding sessions are
// reference counted for that reason, and the counting is the whole contract --
// if an inner sheet's release tore the hiding down, assistive technology would
// regain the page underneath while a modal was still open over it, and the
// outer sheet would be announced as one item in a readable page.

import { afterEach, describe, expect, it } from 'vitest';

import { hideOutside } from '../src/shared/primitives/a11y/aria-hide-outside.svelte.js';

const releases: Array<() => void> = [];

function track(release: () => void): () => void {
  releases.push(release);
  return release;
}

afterEach(() => {
  while (releases.length > 0) releases.pop()?.();
  document.body.innerHTML = '';
});

function scaffold(): { outside: HTMLElement; outer: HTMLElement; inner: HTMLElement } {
  document.body.innerHTML = `
    <div id="outside">page beneath</div>
    <div id="outer">outer sheet</div>
    <div id="inner">inner sheet</div>
  `;
  const byId = (id: string): HTMLElement => {
    const el = document.getElementById(id);
    if (el === null) throw new Error(`missing #${id}`);
    return el;
  };
  return { outside: byId('outside'), outer: byId('outer'), inner: byId('inner') };
}

describe('hideOutside', () => {
  it('hides everything outside the target and exempts the target itself', () => {
    const { outside, outer } = scaffold();
    track(hideOutside([outer]));

    expect(outside.getAttribute('aria-hidden')).toBe('true');
    expect(outer.getAttribute('aria-hidden')).toBeNull();
  });

  it('keeps the page hidden when a nested session releases', () => {
    const { outside, outer, inner } = scaffold();
    const releaseOuter = track(hideOutside([outer]));
    const releaseInner = track(hideOutside([inner]));

    // Both sheets are open: each sheet is exempt, the page beneath is not.
    expect(outside.getAttribute('aria-hidden')).toBe('true');
    expect(outer.getAttribute('aria-hidden')).toBeNull();
    expect(inner.getAttribute('aria-hidden')).toBeNull();

    releaseInner();

    // The outer sheet is still open, so the page beneath must stay hidden and
    // the outer sheet must stay reachable. Releasing early is the defect this
    // test exists to catch.
    expect(outside.getAttribute('aria-hidden')).toBe('true');
    expect(outer.getAttribute('aria-hidden')).toBeNull();
    // The inner sheet is no longer exempt, so it joins the hidden page.
    expect(inner.getAttribute('aria-hidden')).toBe('true');

    releaseOuter();

    // Only the last release restores the page.
    expect(outside.getAttribute('aria-hidden')).toBeNull();
    expect(inner.getAttribute('aria-hidden')).toBeNull();
  });

  it('restores an author-set aria-hidden rather than removing it', () => {
    const { outside, outer } = scaffold();
    outside.setAttribute('aria-hidden', 'true');

    const release = track(hideOutside([outer]));
    release();

    // The value was the author's before the sheet opened; the sheet does not own
    // it and must hand it back untouched.
    expect(outside.getAttribute('aria-hidden')).toBe('true');
  });

  it('releases idempotently', () => {
    const { outside, outer } = scaffold();
    const release = track(hideOutside([outer]));

    release();
    release();

    expect(outside.getAttribute('aria-hidden')).toBeNull();
  });
});
