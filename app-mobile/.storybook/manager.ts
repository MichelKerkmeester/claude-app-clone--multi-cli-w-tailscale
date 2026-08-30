// ───────────────────────────────────────────────────────────────────
// MODULE: SOURCE PANEL
// ───────────────────────────────────────────────────────────────────
// A panel beside the canvas showing the rendering component's own file, so a
// story can be read without leaving it for its docs page.
//
// This is the one place in the repository that touches React, and it is not a
// return of the app's old renderer: Storybook's manager IS a React application,
// React arrives as its transitive dependency rather than an app one, and this
// file is bundled into the manager, never into anything the app ships. Written
// with createElement rather than JSX so the tree keeps its "no .tsx files"
// property and needs no jsx compiler options.

import React, { useState } from 'react';
import { addons, types, useChannel } from 'storybook/manager-api';
import { SyntaxHighlighter } from 'storybook/internal/components';
import { themes } from 'storybook/theming';

import { ADDON_ID, PANEL_ID, SOURCE_EVENT, SOURCE_REQUEST_EVENT } from './source-panel-events.js';

interface SourcePayload {
  readonly name: string | null;
  readonly source: string | null;
}

const WRAP: React.CSSProperties = { height: '100%', overflow: 'auto' };
const NOTE: React.CSSProperties = {
  margin: 0,
  padding: '12px 16px',
  fontSize: 13,
  lineHeight: 1.5,
  opacity: 0.7,
};

function SourcePanel(): React.ReactElement {
  const [payload, setPayload] = useState<SourcePayload>({ name: null, source: null });

  // Ask on mount as well as listening: a panel opened after the story rendered
  // would otherwise stay blank until the next navigation.
  const emit = useChannel({
    [SOURCE_EVENT]: (next: SourcePayload) => setPayload(next),
  });
  React.useEffect(() => emit(SOURCE_REQUEST_EVENT), [emit]);

  if (payload.source === null) {
    return React.createElement(
      'div',
      { style: WRAP },
      React.createElement(
        'p',
        { style: NOTE },
        payload.name === null
          ? 'No component is attached to this story, so there is no file to show. Stories that render a wrapper or a composed scene have no single source.'
          : `No source found for ${payload.name}.`,
      ),
    );
  }

  // Highlighted as html: the bundled highlighter has no svelte grammar, and the
  // markup grammar is the closest fit — it colours the template and reaches into
  // the embedded <script> and <style> rather than treating the file as one blob.
  return React.createElement(
    'div',
    { style: WRAP },
    React.createElement(
      SyntaxHighlighter,
      { language: 'html', copyable: true, showLineNumbers: true, padded: true, bordered: false },
      payload.source,
    ),
  );
}

addons.register(ADDON_ID, () => {
  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: 'Source',
    match: ({ viewMode }) => viewMode === 'story',
    render: ({ active }) => (active === true ? React.createElement(SourcePanel) : null),
  });
});

addons.setConfig({
  // Reading the component is the reason this catalog exists for its authors, so
  // Source is what a story opens on rather than something to go find.
  selectedPanel: PANEL_ID,
  // The highlighter draws from the manager theme. A light manager would render
  // code on white, which is the opposite of the editor and devtools this panel
  // stands in for, and it would clash with the docs pages that are already dark.
  theme: themes.dark,
});
