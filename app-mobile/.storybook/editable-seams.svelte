<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // MODULE: EDITABLE SEAMS
  // ───────────────────────────────────────────────────────────────────
  // The design system already records what a designer may change and what is
  // frozen — as comments next to the rules themselves. That is the right home
  // for them and the wrong place to read them: finding the answer means
  // grepping component source.
  //
  // This reads those markers straight out of the component files at build
  // time, so the page cannot drift from the code it describes. A seam that is
  // renamed or removed changes here on the next build without anyone
  // remembering to update a list.

  // ───────────────────────────────────────────────────────────────────
  // 1. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  interface Seam {
    readonly category: string;
    readonly note: string;
  }

  interface ComponentEntry {
    readonly path: string;
    readonly group: string;
    readonly name: string;
    readonly seams: readonly Seam[];
    readonly frozen: readonly string[];
  }

  // ───────────────────────────────────────────────────────────────────
  // 2. SOURCE SCAN
  // ───────────────────────────────────────────────────────────────────

  // Raw component text, resolved by the bundler. Reading the source is what
  // keeps this honest — anything derived from a generated list could disagree
  // with the file it claims to describe.
  // The stylesheet is scanned alongside the components: the token seams live
  // there, and they are the ones a designer reaches for first.
  const SOURCES = {
    ...(import.meta.glob('../src/**/*.svelte', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>),
    ...(import.meta.glob('../src/app.css', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>),
  };

  // A marker runs from its opening delimiter to whichever comment close comes
  // first, so it reads the same whether it sits in a style block or in markup.
  //
  // The delimiters are written as escapes rather than literally. An HTML comment
  // opener inside a script puts the parser into its escaped-text state, where it
  // stops recognising the closing script tag — which fails the build with the
  // baffling complaint that the script was left open.
  const SEAM = /(?:\/\*|\x3C!--)\s*Editable seam:\s*([a-z-]+)\s*[—-]\s*([\s\S]*?)(?:\*\/|--\x3E)/gu;
  const FROZEN = /(?:\/\*|\x3C!--)\s*Do not edit\s*[—-]\s*([\s\S]*?)(?:\*\/|--\x3E)/gu;

  function tidy(value: string): string {
    return value.replace(/\s+/gu, ' ').replace(/\s*[-—]\s*$/u, '').trim();
  }

  function scan(): readonly ComponentEntry[] {
    const entries: ComponentEntry[] = [];
    for (const [file, source] of Object.entries(SOURCES)) {
      const seams: Seam[] = [];
      const frozen: string[] = [];
      for (const match of source.matchAll(SEAM)) {
        seams.push({ category: match[1] ?? '', note: tidy(match[2] ?? '') });
      }
      for (const match of source.matchAll(FROZEN)) {
        const note = tidy(match[1] ?? '');
        if (note.length > 0) frozen.push(note);
      }
      if (seams.length === 0 && frozen.length === 0) continue;
      const relative = file.replace('../src/', '');
      const parts = relative.split('/');
      entries.push({
        path: relative,
        group: parts.slice(0, -1).join('/') || 'src',
        name: (parts[parts.length - 1] ?? relative).replace('.svelte', ''),
        seams,
        frozen,
      });
    }
    return entries.sort((a, b) => a.path.localeCompare(b.path));
  }

  // ───────────────────────────────────────────────────────────────────
  // 3. LOCAL STATE
  // ───────────────────────────────────────────────────────────────────

  const all = scan();

  let filter = $state('');
  let category = $state('all');

  // ───────────────────────────────────────────────────────────────────
  // 4. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const categories = $derived([
    'all',
    ...[...new Set(all.flatMap((entry) => entry.seams.map((seam) => seam.category)))].sort((a, b) =>
      a.localeCompare(b),
    ),
  ]);

  const needle = $derived(filter.trim().toLocaleLowerCase());

  const visible = $derived(
    all
      .filter((entry) => category === 'all' || entry.seams.some((seam) => seam.category === category))
      .filter(
        (entry) =>
          needle.length === 0 ||
          entry.path.toLocaleLowerCase().includes(needle) ||
          entry.seams.some((seam) => seam.note.toLocaleLowerCase().includes(needle)) ||
          entry.frozen.some((note) => note.toLocaleLowerCase().includes(needle)),
      ),
  );

  const seamCount = $derived(all.reduce((total, entry) => total + entry.seams.length, 0));
  const frozenCount = $derived(all.reduce((total, entry) => total + entry.frozen.length, 0));
</script>

<!-- Component content -->
<!-- This surface: editable-seams — what a designer may change, read from the components. -->
<div class="es">
  <header class="es--head">
    <p class="es--eyebrow">Design system</p>
    <h1 class="es--title">Editable seams</h1>
    <p class="es--lede">
      Where the design system invites a change, and where it does not. Read straight from the
      component sources, so this page cannot disagree with the code.
      <strong>{seamCount}</strong> seams and <strong>{frozenCount}</strong> frozen notes across
      <strong>{all.length}</strong> components.
    </p>
  </header>

  <div class="es--controls">
    <label class="es--field">
      <span class="es--label">Filter</span>
      <input type="search" placeholder="composer, tokens, focus…" bind:value={filter} />
    </label>
    <label class="es--field">
      <span class="es--label">Category</span>
      <select bind:value={category}>
        {#each categories as option (option)}<option value={option}>{option}</option>{/each}
      </select>
    </label>
  </div>

  {#each visible as entry (entry.path)}
    <section class="es--component">
      <h2 class="es--component-name">
        {entry.name}
        <span class="es--path">{entry.group}</span>
      </h2>

      {#if entry.seams.length > 0}
        <ul class="es--list">
          {#each entry.seams as seam, index (index)}
            <li class="es--seam">
              <span class="es--tag is-open">{seam.category}</span>
              <span class="es--note">{seam.note}</span>
            </li>
          {/each}
        </ul>
      {/if}

      {#if entry.frozen.length > 0}
        <ul class="es--list">
          {#each entry.frozen as note, index (index)}
            <li class="es--seam">
              <span class="es--tag is-frozen">frozen</span>
              <span class="es--note">{note}</span>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/each}

  {#if visible.length === 0}
    <p class="es--empty">No component matches that filter.</p>
  {/if}
</div>

<style>
  /* Catalog chrome, built from the same tokens it documents. */
  .es {
    display: grid;
    gap: var(--space-5, 1.5rem);
    max-inline-size: 62rem;
    margin: 0 auto;
    padding: var(--space-4, 1rem);
    color: var(--ink);
    font-family: var(--font-display, system-ui);
  }

  .es--head {
    padding-block-end: var(--space-3, 0.75rem);
    border-block-end: 1px solid var(--line);
  }

  .es--eyebrow {
    margin: 0;
    color: var(--ink-muted);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .es--title {
    margin: 0.15rem 0 0.4rem;
    font-size: 1.6rem;
    font-weight: 620;
    letter-spacing: -0.02em;
  }

  .es--lede {
    max-inline-size: 52ch;
    margin: 0;
    color: var(--ink-muted);
    font-size: 0.85rem;
    line-height: 1.5;
  }

  .es--controls {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3, 0.75rem);
  }

  .es--field {
    display: grid;
    gap: 0.3rem;
  }

  .es--label {
    color: var(--ink-muted);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .es--field input,
  .es--field select {
    min-block-size: 2.75rem;
    min-inline-size: 12rem;
    padding-inline: var(--space-3, 0.75rem);
    border: 1px solid var(--control-border);
    border-radius: var(--radius-control, 0.625rem);
    background: var(--surface);
    color: var(--ink);
    font: inherit;
  }

  .es--component {
    display: grid;
    gap: 0.4rem;
    padding-block-end: var(--space-3, 0.75rem);
    border-block-end: 1px solid var(--line);
  }

  .es--component-name {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.6rem;
    margin: 0;
    font-family: var(--font-mono, ui-monospace);
    font-size: 0.9rem;
    font-weight: 650;
  }

  .es--path {
    color: var(--ink-muted);
    font-size: 0.72rem;
    font-weight: 400;
  }

  .es--list {
    display: grid;
    gap: 0.3rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .es--seam {
    display: grid;
    grid-template-columns: 5.5rem minmax(0, 1fr);
    align-items: start;
    gap: var(--space-2, 0.5rem);
  }

  .es--tag {
    padding: 0.1rem 0.4rem;
    border-radius: 999px;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-align: center;
    text-transform: uppercase;
  }

  .es--tag.is-open {
    background: var(--success-soft);
    color: var(--success);
  }

  .es--tag.is-frozen {
    background: var(--surface-muted);
    color: var(--ink-muted);
  }

  .es--note {
    color: var(--ink);
    font-size: 0.8rem;
    line-height: 1.5;
  }

  .es--empty {
    color: var(--ink-muted);
  }
</style>
