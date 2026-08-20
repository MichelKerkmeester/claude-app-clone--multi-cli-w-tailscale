import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import ArtifactHeader from '../src/lib/artifacts/ArtifactHeader.svelte';

// Smoke test: proves the Svelte test harness compiles a runes component,
// renders it under jsdom, and exposes its accessibility tree to queries.
describe('ArtifactHeader (svelte harness smoke)', () => {
  it('renders the title heading and a labelled close button', () => {
    render(ArtifactHeader, { props: { onClose: () => undefined, title: 'File diff' } });
    expect(screen.getByRole('heading', { name: 'File diff' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close file diff viewer' })).toBeInTheDocument();
  });

  it('omits the revision line when no revision is given', () => {
    render(ArtifactHeader, { props: { onClose: () => undefined } });
    expect(screen.queryByText(/Exact revision/u)).toBeNull();
  });
});
