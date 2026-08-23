// ───────────────────────────────────────────────────────────────────
// MODULE: Pi Remote Web Story Render Assertions
// ───────────────────────────────────────────────────────────────────
// The CDP catalog smoke gate proves no story THROWS, and deliberately treats
// an empty frame as a pass — a deferred story legitimately renders nothing.
// That blind spot hides a whole failure class: a story whose decorators are
// composed in the wrong order supplies no context, so the component renders
// nothing at all and the gate still reports green.
//
// These tests close it for the surfaces where an empty render is the likely
// failure — the context-only components, whose entire input arrives through a
// provider that a decorator must mount ABOVE them. composeStories runs
// Storybook's real decorateStory pipeline, so this asserts the shipped
// composition rather than a model of it.

import { render, screen, waitFor } from '@testing-library/svelte';
import { composeStories } from '@storybook/svelte';
import { describe, it, expect } from 'vitest';

import * as railStories from '../src/pages/chat/attachments/attachment-rail.stories';
import * as dialogStories from '../src/pages/chat/attachments/attachment-preview-dialog.stories';

// composeStories' Svelte return shape is `{ Component, props }` per story.
interface ComposedStory {
  readonly Component: unknown;
  readonly props: Record<string, unknown>;
}

function compose(mod: unknown): Record<string, ComposedStory> {
  return composeStories(mod as Parameters<typeof composeStories>[0]) as unknown as Record<
    string,
    ComposedStory
  >;
}

function renderStory(story: ComposedStory): void {
  render(story.Component as never, { props: story.props });
}

describe('context-only attachment stories render their seeded content', () => {
  it('AttachmentRail shows the staged draft photos', async () => {
    renderStory(compose(railStories).Default);

    await waitFor(() => {
      expect(screen.getByRole('list', { name: /draft photos/i })).toBeTruthy();
    });
  });

  it('AttachmentPreviewDialog opens onto a staged photo', async () => {
    renderStory(compose(dialogStories).Open);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
    });
  });
});
