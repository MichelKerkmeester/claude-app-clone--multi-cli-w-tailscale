// ───────────────────────────────────────────────────────────────────
// MODULE: Reusable-Prompt Picker Tests (host-gated client half)
// ───────────────────────────────────────────────────────────────────
// The relay does not expose the reusable-prompt catalog field, so the picker
// must be provably inert: nothing renders, nothing is fetched, no rows are
// invented. Against a guarded fixture the picker exposes entries with
// collision badges and inserts a chosen entry as an editable draft — pure
// text transformation, never a submission.

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { flushSync } from 'svelte';
import { describe, expect, it } from 'vitest';

import type { CommandDescriptorDto, ScopedCommandSnapshot } from '@pi-remote/pi-rpc-protocol';

import {
  extractReusablePromptCatalog,
  insertReusablePrompt,
  useReusablePromptPicker,
  type ReusablePromptEntryDto,
  type ReusablePromptPickerState,
} from '../src/shared/commands/reusable-prompt-catalog.svelte.js';

// ───────────────────────────────────────────────────────────────────
// 2. FIXTURES
// ───────────────────────────────────────────────────────────────────

const SESSION_A = 'session_picker_a';
const SESSION_B = 'session_picker_b';

function entry(name: string, source: string, body = `Canned body for ${name}.`): ReusablePromptEntryDto {
  return { name, title: `Prompt: ${name}`, body, source };
}

function commandRow(name: string, enabled = true): CommandDescriptorDto {
  return {
    name,
    description: null,
    source: 'extension',
    enabled,
    disabledReason: null,
    requiresConfirmation: false,
  };
}

function commandSnapshot(commands: CommandDescriptorDto[]): ScopedCommandSnapshot {
  return {
    hostEpoch: 'epoch_picker_001',
    sessionId: SESSION_A,
    sessionRevision: 1,
    catalogRevision: 1,
    commands,
    fetchedAt: 0,
  };
}

function catalogPayload(sessionId: string, entries: ReusablePromptEntryDto[]) {
  return { reusablePrompts: { sessionId, entries } };
}

/** Mount the hook in an effect root with mutable live scope. */
function createPickerHarness(initial: {
  session: string;
  commands: ScopedCommandSnapshot | null;
}) {
  let picker!: ReusablePromptPickerState;
  let setSession!: (next: string) => void;
  let setCommands!: (next: ScopedCommandSnapshot | null) => void;

  const dispose = $effect.root(() => {
    let liveSession = $state(initial.session);
    let liveCommands = $state(initial.commands);
    picker = useReusablePromptPicker(
      () => liveSession,
      () => liveCommands,
    );
    setSession = (next) => {
      liveSession = next;
    };
    setCommands = (next) => {
      liveCommands = next;
    };
  });

  return { picker, setSession, setCommands, dispose };
}

// ───────────────────────────────────────────────────────────────────
// 3. TESTS
// ───────────────────────────────────────────────────────────────────

describe('picker inertness without the host field', () => {
  it('renders nothing when no carrier has delivered a catalog', () => {
    const harness = createPickerHarness({ session: SESSION_A, commands: null });

    expect(harness.picker.status).toBe('inert');
    expect(harness.picker.entries).toEqual([]);
    expect(harness.picker.visible).toBe(false);
  });

  it('an intake without the catalog field never lights the picker up', () => {
    const harness = createPickerHarness({ session: SESSION_A, commands: null });

    // Host payloads that do not carry the field — today's reality.
    harness.picker.acceptCatalog({ hostEpoch: 'epoch_picker_001' });
    harness.picker.acceptCatalog({});

    expect(harness.picker.status).toBe('inert');
    expect(harness.picker.entries).toEqual([]);
    expect(harness.picker.visible).toBe(false);
  });

  it('extract resolves a payload without the field to null', () => {
    expect(extractReusablePromptCatalog({ hostEpoch: 'epoch_picker_001' })).toBeNull();
    expect(extractReusablePromptCatalog('not-an-object')).toBeNull();
    expect(extractReusablePromptCatalog(null)).toBeNull();
  });

  it('malformed catalogs fail closed instead of committing rows', () => {
    const harness = createPickerHarness({ session: SESSION_A, commands: null });

    harness.picker.acceptCatalog({
      reusablePrompts: { sessionId: SESSION_A, entries: [{ name: 42, title: 'x', body: 'y', source: 's' }] },
    });
    harness.picker.acceptCatalog({
      reusablePrompts: { sessionId: SESSION_A, entries: [], leakyField: true },
    });

    expect(harness.picker.visible).toBe(false);
    expect(harness.picker.entries).toEqual([]);
  });

  it('a catalog for another session never commits into this one', () => {
    const harness = createPickerHarness({ session: SESSION_A, commands: null });

    harness.picker.acceptCatalog(catalogPayload(SESSION_B, [entry('standup', 'ext-one')]));

    expect(harness.picker.status).toBe('inert');
    expect(harness.picker.visible).toBe(false);
  });

  it('a session switch drops committed rows', () => {
    const harness = createPickerHarness({ session: SESSION_A, commands: null });
    harness.picker.acceptCatalog(catalogPayload(SESSION_A, [entry('standup', 'ext-one')]));
    expect(harness.picker.visible).toBe(true);

    harness.setSession(SESSION_B);
    flushSync();

    expect(harness.picker.status).toBe('inert');
    expect(harness.picker.visible).toBe(false);
    expect(harness.picker.entries).toEqual([]);
  });
});

describe('picker against a fixture catalog', () => {
  it('exposes committed rows and becomes visible', () => {
    const harness = createPickerHarness({ session: SESSION_A, commands: null });
    harness.picker.acceptCatalog(
      catalogPayload(SESSION_A, [entry('standup', 'ext-one'), entry('triage', 'ext-one')]),
    );

    expect(harness.picker.status).toBe('ready');
    expect(harness.picker.visible).toBe(true);
    expect(harness.picker.entries.map((row) => row.entry.name)).toEqual(['standup', 'triage']);
  });

  it('inserting an entry yields an editable draft — never a submission', () => {
    const result = insertReusablePrompt({
      draft: 'Hello world',
      selectionStart: 6,
      selectionEnd: 6,
      entry: entry('standup', 'ext-one', 'Daily standup notes:'),
    });

    // Pure text transformation with a caret — no send path, no binding, no
    // submission id exists in the result shape.
    expect(Object.keys(result).sort()).toEqual(['announcement', 'caretOffset', 'draft']);
    expect(result.draft).toBe('Hello Daily standup notes:world');
    expect(result.caretOffset).toBe(6 + 'Daily standup notes:'.length);
    expect(result.announcement).toContain('Not sent.');

    // The module must not even reach the relay: the intake is local-only.
    const source = readFileSync(
      'app-mobile/src/shared/commands/reusable-prompt-catalog.svelte.ts',
      'utf8',
    );
    const importLines = source.match(/^import[^\n]*$/gm) ?? [];
    expect(importLines.length).toBeGreaterThan(0);
    for (const line of importLines) {
      expect(line).not.toContain('relay');
      expect(line).not.toContain('submit');
    }
  });

  it('replaces the current selection range rather than appending blindly', () => {
    const result = insertReusablePrompt({
      draft: 'keep DROP ME tail',
      selectionStart: 5,
      selectionEnd: 12,
      entry: entry('standup', 'ext-one', 'Body'),
    });

    expect(result.draft).toBe('keep Body tail');
    expect(result.caretOffset).toBe(9);
  });

  it('badges entries whose name is offered by more than one source', () => {
    const harness = createPickerHarness({ session: SESSION_A, commands: null });
    harness.picker.acceptCatalog(
      catalogPayload(SESSION_A, [
        entry('review', 'ext-one'),
        entry('review', 'pack-two'),
        entry('standup', 'ext-one'),
      ]),
    );

    // Key by name AND source: two rows share 'ext-one', so a source-only key
    // silently resolves to the wrong row.
    const rows = new Map(
      harness.picker.entries.map((row) => [`${row.entry.name}:${row.entry.source}`, row]),
    );
    expect(rows.get('review:ext-one')?.collidesWithOtherSource).toBe(true);
    expect(rows.get('review:pack-two')?.collidesWithOtherSource).toBe(true);
    expect(harness.picker.entries.find((row) => row.entry.name === 'standup')?.collidesWithOtherSource).toBe(false);
  });

  it('badges a collision with an enabled command row but not a disabled one', () => {
    const harness = createPickerHarness({
      session: SESSION_A,
      commands: commandSnapshot([commandRow('greenlight', true), commandRow('archived', false)]),
    });
    harness.picker.acceptCatalog(
      catalogPayload(SESSION_A, [entry('greenlight', 'ext-one'), entry('archived', 'ext-one')]),
    );

    const byName = new Map(harness.picker.entries.map((row) => [row.entry.name, row]));
    expect(byName.get('greenlight')?.collidesWithOtherSource).toBe(true);
    expect(byName.get('archived')?.collidesWithOtherSource).toBe(false);
  });

  it('accepting the same session again replaces the committed rows', () => {
    const harness = createPickerHarness({ session: SESSION_A, commands: null });
    harness.picker.acceptCatalog(catalogPayload(SESSION_A, [entry('standup', 'ext-one')]));

    harness.picker.acceptCatalog(catalogPayload(SESSION_A, [entry('triage', 'ext-one')]));

    expect(harness.picker.entries.map((row) => row.entry.name)).toEqual(['triage']);
  });
});
