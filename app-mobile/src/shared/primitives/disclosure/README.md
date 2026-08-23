# Disclosure

> A bindable collapsible that moves secondary content behind a heading-level trigger without owning its visual treatment.

---

## 1. OVERVIEW

[`collapsible.svelte`](./collapsible.svelte) combines a Bits UI collapsible root, a trigger snippet inside an `h3` and a content snippet. It keeps the trigger and body in one semantic relationship and exposes `open` for controlled or bound state. [`collapsible.stories.ts`](./collapsible.stories.ts) demonstrates collapsed and expanded content.

The primitive is for secondary information such as transcript evidence or details. It does not animate, size or color the disclosure. The consuming surface decides whether the content needs a transition and how the open state looks.

### Key Statistics

| Metric | Current behavior |
|---|---|
| Runtime parts | One root with one trigger and one content part |
| Heading boundary | Trigger is always rendered inside `h3` |
| State | Bindable boolean, default `false` |
| Component CSS | None |

---

## 2. FEATURES

### Key Features

| Feature | What It Does |
|---|---|
| Semantic disclosure | Bits UI supplies trigger state, controlled visibility and the trigger-to-content relationship. |
| Heading structure | The trigger sits inside an `h3` so repeated disclosures have a predictable document outline. |
| Bindable state | A caller can read or control `open` without creating a second visibility model. |
| Snippet composition | The caller supplies trigger and body content while the wrapper owns the root relationship. |

### Accessibility Contract

| Concern | Guaranteed here | Caller must supply |
|---|---|---|
| Roles | Bits UI supplies the collapsible trigger semantics and expanded state. The wrapper adds the `h3` structural boundary. | Meaningful trigger content and an appropriate heading level in the surrounding page structure. |
| Focus movement | Normal focus stays on the trigger and follows document order. | Any custom focus movement if opening the content starts a separate workflow. |
| Dismissal | No outside or Escape dismissal. The trigger and bound `open` state control collapse. | A caller close action when another workflow needs to close the disclosure. |
| Hit target | No minimum size or padding is emitted. | A comfortable trigger target and a visible focus indicator. |
| Reduced motion | No animation or transition is defined. | Collapse or expand motion that honors `prefers-reduced-motion`. |
| Forced colors | No color or contrast rule is defined. | Open state, borders and focus styles that remain clear in forced-colors mode. |

---

## 3. REQUIREMENTS

| Requirement | Minimum | Notes |
|---|---|---|
| Trigger | A `trigger` snippet | The snippet is rendered inside the Bits trigger and the fixed `h3`. |
| Body | A `children` snippet | The content is rendered through Bits UI's content part. |
| Context | One `Collapsible` instance around both snippets | Do not split the trigger and content into separate components without the root. |
| Heading plan | A surrounding outline that can accept an `h3` | The wrapper does not expose a prop to change the heading element. |

---

## 4. STRUCTURE

| File | Purpose |
|---|---|
| [`collapsible.svelte`](./collapsible.svelte) | Bindable root, fixed heading boundary, trigger and content composition. |
| [`collapsible.stories.ts`](./collapsible.stories.ts) | Collapsed and expanded Storybook examples. |
| [`CODE.md`](./CODE.md) | Source flow and ownership boundaries. |

---

## 5. CONFIGURATION

| Prop | Default | Purpose |
|---|---|---|
| `open` | `false` | Controls or binds whether the content is open. |
| `trigger` | Required | Snippet rendered inside `Collapsible.Trigger`. |
| `children` | Required | Snippet rendered inside `Collapsible.Content`. |
| Remaining root props | Bits UI defaults | Forward disabled state, callbacks and other supported collapsible behavior. |

---

## 6. USAGE EXAMPLES

Bind the open state when another part of the surface needs to observe it:

```svelte
<script lang="ts">
  import Collapsible from './collapsible.svelte'

  let open = $state(false)
</script>

<Collapsible bind:open>
  {#snippet trigger()}
    Activity details
  {/snippet}
  <p>Secondary information appears here when the trigger is open.</p>
</Collapsible>
```

Keep the trigger text meaningful. The wrapper supplies the heading boundary, while the caller supplies the content label and any state styling.

---

## 7. TROUBLESHOOTING

| What You See | Cause | Fix |
|---|---|---|
| The trigger does not open the body | The trigger or body was rendered outside the wrapper's root. | Pass both snippets to one `Collapsible` instance. |
| The disclosure heading is at the wrong level | The primitive always uses `h3`. | Place the disclosure in a section where an `h3` is valid or choose another component for a different outline. |
| The body flashes during state changes | The caller adds its own visibility rule beside Bits UI content behavior. | Style the Bits state and let the content part own visibility. |
| Expansion motion ignores reduced motion | The primitive has no motion policy. | Add a caller-owned `prefers-reduced-motion` rule. |
| The trigger is hard to tap | The wrapper has no hit-target CSS. | Increase the trigger's caller-owned size and padding. |
| Open and closed states look identical | The caller did not style the state exposed by Bits UI. | Add visible open-state and focus-visible styles. |

---

## 8. FAQ

**Q: Does opening a disclosure move focus into the body?**

A: No. Focus remains with normal document flow unless the caller adds a deliberate interaction.

**Q: Can this primitive become a different heading level?**

A: No. Its trigger is fixed inside `h3` to keep the family consistent.

**Q: Does the primitive animate?**

A: No. The caller owns transitions and the reduced-motion rule.

---

## 9. RELATED RESOURCES

| Document | Purpose |
|---|---|
| [`CODE.md`](./CODE.md) | Disclosure source map and flow. |
| [Accessibility helpers README](../a11y/README.md) | Shared interaction state used by disclosure surfaces. |
| [Button README](../button/README.md) | Native action primitive often used inside disclosure content. |
| [Shared primitives README](../README.md) | Family-wide unstyled and accessibility rules. |
