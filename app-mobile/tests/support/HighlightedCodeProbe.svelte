<script lang="ts">
  // Svelte equivalent of the React renderHook(useHighlightedCode) probe.
  // useHighlightedCode is a runes factory ($state/$effect) that must run
  // inside a component <script>, so this probe mounts it with a reactive
  // getter thunk over the source/language/revision/theme/enabled props and
  // renders the HighlightState fields into the DOM for the test to read.
  // The optional onState callback hands the live HighlightState to the test
  // on every state change — the Svelte equivalent of reading
  // hook.result.current. rerender({ source, revision }) drives the
  // prop-change path the React hook.rerender exercised.
  import {
    useHighlightedCode,
    type HighlightState,
    type UseHighlightedCodeOptions,
  } from '../../src/pages/chat/rich-content/use-highlighted-code.svelte.js';

  let {
    source,
    language = 'typescript',
    revision = 1,
    theme,
    enabled,
    onState,
  }: {
    source: string;
    language?: string | null;
    revision?: string | number;
    theme?: 'light' | 'dark';
    enabled?: boolean;
    onState?: (state: HighlightState) => void;
  } = $props();

  const handle = useHighlightedCode(() => {
    const opts: UseHighlightedCodeOptions = { source, language, revision };
    if (theme !== undefined) opts.theme = theme;
    if (enabled !== undefined) opts.enabled = enabled;
    return opts;
  });
  const current = $derived(handle.current);

  // Mirrors the React renderHook `hook.result.current` access: hands the
  // live HighlightState to the test on every state change so the test can
  // assert on tokens, status, revisionId exactly as the React oracle did.
  $effect(() => {
    onState?.(current);
  });
</script>

<div data-testid="status">{current.status}</div>
<div data-testid="tokens">{current.tokens?.map((token) => token.text).join('') ?? ''}</div>
<div data-testid="revision-id">{current.revisionId}</div>
