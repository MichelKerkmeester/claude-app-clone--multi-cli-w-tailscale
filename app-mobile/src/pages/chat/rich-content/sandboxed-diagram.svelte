<script module lang="ts">
  // This module holds the sandboxed diagram compiler. Diagram source is
  // model-produced text: it is parsed here, escaped into SVG, and shown in a
  // frame that cannot run script, join the parent origin, or navigate the chat.
  // ───────────────────────────────────────────────────────────────────
  // MODULE: SANDBOXED DIAGRAM
  // ───────────────────────────────────────────────────────────────────

  // ───────────────────────────────────────────────────────────────────
  // 1. TYPE DEFINITIONS
  // ───────────────────────────────────────────────────────────────────

  interface DiagramNode {
    readonly id: string;
    readonly label: string;
  }

  interface DiagramEdge {
    readonly from: string;
    readonly to: string;
  }

  interface Diagram {
    readonly direction: 'TD' | 'LR' | 'BT' | 'RL';
    readonly nodes: readonly DiagramNode[];
    readonly edges: readonly DiagramEdge[];
  }

  // ───────────────────────────────────────────────────────────────────
  // 2. CONSTANTS
  // ───────────────────────────────────────────────────────────────────

  // Empty sandbox: no same-origin, no top-navigation, no network, no script.
  export const DIAGRAM_FRAME_SANDBOX = '';
  const MAX_SOURCE_LENGTH = 8_000;
  const MAX_NODES = 48;
  const MAX_EDGES = 64;
  const NODE_WIDTH = 140;
  const NODE_HEIGHT = 40;
  const NODE_GAP = 28;
  const HEADER_PATTERN = /^(?:graph|flowchart)\s+(TD|TB|BT|LR|RL)$/iu;
  const NODE_ATOM = '([A-Za-z][\\w-]*)(?:\\[([^\\]]*)\\]|\\(([^)]*)\\)|\\{([^}]*)\\})?';
  const EDGE_PATTERN = new RegExp(`^${NODE_ATOM}\\s*(?:-->|---|-.->|==>)\\s*${NODE_ATOM}$`, 'u');
  const NODE_PATTERN = new RegExp(`^${NODE_ATOM}$`, 'u');
  const UNSAFE_SOURCE_PATTERN = /javascript:|vbscript:|data:|<\s*\/?\s*[a-z!?]/iu;

  // ───────────────────────────────────────────────────────────────────
  // 3. PARSER
  // ───────────────────────────────────────────────────────────────────

  // Keep parse diagram source focused on its single responsibility.
  export function parseDiagramSource(source: string): Diagram | null {
    const text = source.trim();
    if (text.length === 0 || text.length > MAX_SOURCE_LENGTH) return null;
    if (UNSAFE_SOURCE_PATTERN.test(text)) return null;
    const lines = text
      .replace(/;/gu, '\n')
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('%%'));
    const headerLine = lines[0];
    if (headerLine === undefined) return null;
    const header = HEADER_PATTERN.exec(headerLine);
    if (header === null) return null;
    const rawDirection = (header[1] ?? 'TD').toLocaleUpperCase();
    const direction: Diagram['direction'] =
      rawDirection === 'TB' ? 'TD' : (rawDirection as Diagram['direction']);
    const nodes: Record<string, DiagramNode> = Object.create(null) as Record<string, DiagramNode>;
    const edges: DiagramEdge[] = [];

    const remember = (id: string, label: string | undefined): void => {
      const existing = nodes[id];
      if (existing === undefined) {
        nodes[id] = { id, label: label !== undefined && label.length > 0 ? label : id };
        return;
      }
      if (label !== undefined && label.length > 0 && existing.label === id) {
        nodes[id] = { id, label };
      }
    };

    for (const line of lines.slice(1)) {
      if (/^(?:click|call|href|linkStyle|classDef|style|callback)\b/iu.test(line)) {
        return null;
      }
      const edge = EDGE_PATTERN.exec(line);
      if (edge !== null) {
        const fromId = edge[1] ?? '';
        const toId = edge[5] ?? '';
        if (fromId.length === 0 || toId.length === 0) return null;
        remember(fromId, edge[2] ?? edge[3] ?? edge[4]);
        remember(toId, edge[6] ?? edge[7] ?? edge[8]);
        edges.push({ from: fromId, to: toId });
        continue;
      }
      const node = NODE_PATTERN.exec(line);
      if (node !== null) {
        const id = node[1] ?? '';
        if (id.length === 0) return null;
        remember(id, node[2] ?? node[3] ?? node[4]);
        continue;
      }
      return null;
    }

    const nodeCount = Object.keys(nodes).length;
    if (nodeCount === 0 || nodeCount > MAX_NODES || edges.length > MAX_EDGES) return null;
    return { direction, nodes: Object.values(nodes), edges };
  }

  // ───────────────────────────────────────────────────────────────────
  // 4. SVG COMPILER
  // ───────────────────────────────────────────────────────────────────

  // Keep escape xml focused on its single responsibility.
  function escapeXml(value: string): string {
    return value
      .replace(/&/gu, '&amp;')
      .replace(/</gu, '&lt;')
      .replace(/>/gu, '&gt;')
      .replace(/"/gu, '&quot;')
      .replace(/'/gu, '&apos;');
  }

  // Keep render diagram svg focused on its single responsibility.
  function renderDiagramSvg(diagram: Diagram): string {
    const vertical = diagram.direction === 'TD' || diagram.direction === 'BT';
    const reversed = diagram.direction === 'BT' || diagram.direction === 'RL';
    const ordered = reversed ? [...diagram.nodes].reverse() : diagram.nodes;
    const positions: Record<string, { readonly x: number; readonly y: number }> = Object.create(
      null,
    ) as Record<string, { readonly x: number; readonly y: number }>;
    for (const [index, node] of ordered.entries()) {
      const x = vertical ? 16 : 16 + index * (NODE_WIDTH + NODE_GAP);
      const y = vertical ? 16 + index * (NODE_HEIGHT + NODE_GAP) : 16;
      positions[node.id] = { x, y };
    }
    const width = vertical
      ? NODE_WIDTH + 32
      : 32 + ordered.length * NODE_WIDTH + Math.max(0, ordered.length - 1) * NODE_GAP;
    const height = vertical
      ? 32 + ordered.length * NODE_HEIGHT + Math.max(0, ordered.length - 1) * NODE_GAP
      : NODE_HEIGHT + 32;
    const edgeMarkup = diagram.edges
      .map((edge) => {
        const from = positions[edge.from];
        const to = positions[edge.to];
        if (from === undefined || to === undefined) return '';
        const x1 = from.x + NODE_WIDTH / 2;
        const y1 = from.y + NODE_HEIGHT / 2;
        const x2 = to.x + NODE_WIDTH / 2;
        const y2 = to.y + NODE_HEIGHT / 2;
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#8a8680" stroke-width="1.5" />`;
      })
      .join('');
    const nodeMarkup = ordered
      .map((node) => {
        const pos = positions[node.id];
        if (pos === undefined) return '';
        const label = escapeXml(node.label);
        return `<g><rect x="${pos.x}" y="${pos.y}" width="${NODE_WIDTH}" height="${NODE_HEIGHT}" rx="6" fill="#f8f8f6" stroke="#6c6a65" /><text x="${pos.x + NODE_WIDTH / 2}" y="${pos.y + NODE_HEIGHT / 2 + 4}" text-anchor="middle" font-size="12" font-family="ui-sans-serif, system-ui, sans-serif" fill="#24221f">${label}</text></g>`;
      })
      .join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img">${edgeMarkup}${nodeMarkup}</svg>`;
  }

  // ───────────────────────────────────────────────────────────────────
  // 5. SRCDOC BUILDER
  // ───────────────────────────────────────────────────────────────────

  // Keep build diagram document focused on its single responsibility.
  export function buildDiagramDocument(source: string): string | null {
    const diagram = parseDiagramSource(source);
    if (diagram === null) return null;
    const svg = renderDiagramSvg(diagram);
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; connect-src 'none'; script-src 'none'; frame-src 'none'"/><style>html,body{margin:0;background:transparent}svg{max-width:100%;height:auto;display:block}</style></head><body>${svg}</body></html>`;
  }
</script>

<script lang="ts">
  // ───────────────────────────────────────────────────────────────────
  // 6. PROPS
  // ───────────────────────────────────────────────────────────────────

  interface Props {
    source: string;
  }

  let { source }: Props = $props();

  // ───────────────────────────────────────────────────────────────────
  // 7. DERIVED STATE
  // ───────────────────────────────────────────────────────────────────

  const srcdoc = $derived(buildDiagramDocument(source));
</script>

<!-- Component content -->
<!-- This surface: sandboxed-diagram — a unique-origin frame around compiled SVG. -->
{#if srcdoc !== null}
  <iframe
    class="sandboxed-diagram--frame"
    sandbox={DIAGRAM_FRAME_SANDBOX}
    srcdoc={srcdoc}
    title="Diagram"
    referrerpolicy="no-referrer"
  ></iframe>
{/if}

<style>
  /* This slot: sandboxed-diagram--frame — the inert unique-origin diagram viewport. */
  .sandboxed-diagram--frame {
    display: block;
    inline-size: 100%;
    min-block-size: 8rem;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--surface-code);
  }
</style>
