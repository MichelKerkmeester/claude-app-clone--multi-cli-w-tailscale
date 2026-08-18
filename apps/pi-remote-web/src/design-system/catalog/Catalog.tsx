// ───────────────────────────────────────────────────────────────────
// MODULE: Design System Catalog
// ───────────────────────────────────────────────────────────────────
// The catalog page: a light/dark toggle, the registry index of every migrated
// `@ds surface:` with its `@ds state:` / token / editability seams, best-effort
// live previews over offline fixtures, and the designer docs surface. It is
// read-only design tooling and shares nothing mount-wise with the operator app.

import { useState } from 'react';

import { CATALOG_SURFACES, type CatalogSurface } from './registry.js';
import { LivePreview, RegistryOnlyNote } from './previews.js';

type Theme = 'light' | 'dark';

function initialTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function applyTheme(next: Theme): void {
  // Reuse the app's theme mechanism: the token library resolves light/dark off
  // this exact attribute on <html>, so toggling it restyles every live preview.
  document.documentElement.dataset.theme = next;
}

function SurfaceCard({ surface }: { readonly surface: CatalogSurface }) {
  return (
    <article className="catalog-surface-card">
      <header className="catalog-surface-meta">
        <h3 className="catalog-surface-title">{surface.title}</h3>
        <span className="catalog-surface-id">{surface.id}</span>
      </header>
      <p className="catalog-surface-purpose">{surface.purpose}</p>
      <dl className="catalog-surface-facts">
        <div>
          <dt>States</dt>
          <dd>{surface.states.join(' · ')}</dd>
        </div>
        <div>
          <dt>Tokens</dt>
          <dd>{surface.tokens.length > 0 ? surface.tokens.join(' · ') : 'semantic roles'}</dd>
        </div>
        <div>
          <dt>Edits</dt>
          <dd>{surface.editability}</dd>
        </div>
      </dl>
      <div className="catalog-surface-preview" data-catalog-preview={surface.preview}>
        {surface.preview === 'live' ? (
          <LivePreview surfaceId={surface.id} />
        ) : (
          <RegistryOnlyNote reason={surface.previewReason ?? ''} />
        )}
      </div>
    </article>
  );
}

function GrammarPrimer() {
  const terms: ReadonlyArray<readonly [string, string]> = [
    ['surface', 'A reusable component/layout contract — the indexing unit of this catalog.'],
    ['slot', 'A named, typed region inside a surface (e.g. a card glyph or body).'],
    ['state', 'A declared discrete appearance a surface renders (idle · running · denied · …).'],
    ['variant', 'An alternative presentation of a surface.'],
    ['edit', 'A seam a designer may change — layout, tokens, or presentation.'],
    ['guardrail: do-not-edit', 'A frozen accessibility, security, or logic seam that must not be edited.'],
    ['catalog', 'This read-only preview surface — the one net-new surface in the phase.'],
    ['theme', 'The light / dark semantic remap a surface reads via tokens, switched on <html>.'],
  ];
  return (
    <dl className="catalog-grammar">
      {terms.map(([term, meaning]) => (
        <div key={term}>
          <dt>
            <code>@ds {term}</code>
          </dt>
          <dd>{meaning}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A page anchor heading with an id so designer docs can deep-link sections. */
function SectionHeading({ id, children }: { readonly id: string; readonly children: string }) {
  return <h2 id={id}>{children}</h2>;
}

export function Catalog() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const toggleTheme = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    applyTheme(next);
  };

  return (
    <main className="catalog-page">
      <header className="catalog-header">
        <div>
          <p className="catalog-header-eyebrow">Design system · read-only tooling</p>
          <h1>Pi Remote — Design System</h1>
          <p className="catalog-header-sub">
            Every migrated surface, its declared states, its token seams, and live previews over
            deterministic offline fixtures — in both themes.
          </p>
        </div>
        <div className="catalog-header-actions">
          <button
            type="button"
            className="catalog-theme-toggle"
            aria-pressed={theme === 'dark'}
            onClick={toggleTheme}
          >
            <span aria-hidden="true">{theme === 'dark' ? '◐' : '◑'}</span>
            {theme === 'dark' ? 'Dark' : 'Light'}
          </button>
        </div>
      </header>

      <SectionHeading id="registry">Registry</SectionHeading>
      <p className="catalog-section-intro">
        {CATALOG_SURFACES.length} surfaces are indexed. A <code>registry-only</code> card is a
        documented convention or a surface that needs a live host; a <code>live</code> card renders
        the real component below its facts.
      </p>
      <div className="catalog-surface-grid">
        {CATALOG_SURFACES.map((surface) => (
          <SurfaceCard key={surface.id} surface={surface} />
        ))}
      </div>

      <SectionHeading id="designer-docs">Designer docs</SectionHeading>
      <div className="catalog-docs">
        <p className="catalog-section-intro">
          How to read the <code>@ds</code> grammar declared across the source seams.
        </p>
        <GrammarPrimer />
        <ul className="catalog-doc-links">
          <li>
            <a href="/src/design-system/tokens.md" rel="noreferrer">
              Token reference
            </a>
            <span> — what every semantic and component token resolves to, and which rows are editable.</span>
          </li>
          <li>
            <a href="/src/design-system/designer-guide.md" rel="noreferrer">
              Designer guide
            </a>
            <span> — coming in the editability audit; a stub today.</span>
          </li>
        </ul>
        <p className="catalog-docs-note">
          The catalog is offline and read-only: it renders the real components over already-redacted
          demo fixtures, adds no mutation, route, socket, or network call, and never touches the
          operator app shell.
        </p>
      </div>
    </main>
  );
}