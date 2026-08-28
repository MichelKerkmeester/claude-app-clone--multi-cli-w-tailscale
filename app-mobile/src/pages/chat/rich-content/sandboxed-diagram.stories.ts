// ───────────────────────────────────────────────────────────────────
// MODULE: SANDBOXED DIAGRAM STORIES
// ───────────────────────────────────────────────────────────────────

import type { Meta, StoryObj } from '@storybook/sveltekit';

import SafeMarkdown from './safe-markdown.svelte';
import SandboxedDiagram from './sandboxed-diagram.svelte';

const DIAGRAM_SOURCE = `flowchart LR
request[Mobile request] --> relay[Relay policy check]
relay --> response[Safe response]`;

const REJECTED_SOURCE = `flowchart LR
request[Mobile request] --> relay[Relay policy check]
click request "https://example.com"`;
const MERMAID_FENCE = '```';

const meta: Meta<typeof SandboxedDiagram> = {
  title: 'Rich Content/SandboxedDiagram',
  component: SandboxedDiagram,
  tags: ['autodocs'],
} satisfies Meta<typeof SandboxedDiagram>;

export default meta;
type Story = StoryObj<typeof SandboxedDiagram>;

export const Valid: Story = {
  args: { source: DIAGRAM_SOURCE },
};

export const RejectedInput: Story = {
  args: { source: REJECTED_SOURCE },
  render: (args) => ({
    Component: SafeMarkdown,
    props: {
      source: [MERMAID_FENCE, 'mermaid', args.source, MERMAID_FENCE].join('\n'),
    },
  }),
};
