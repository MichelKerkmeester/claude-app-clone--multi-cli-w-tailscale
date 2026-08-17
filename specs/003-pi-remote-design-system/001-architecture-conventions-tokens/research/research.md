# Research — Architecture, Conventions & Token Library (synthesized decision)

> **STATUS: PLACEHOLDER — decision pending.** The 20 research iterations are **not yet run**
> and the research **models are TBD** (operator-defined). This file is the canonical home for
> the build-ready synthesized decision; it will be written after the iterations complete. Until
> then it records only the shape the decision must take, so Phase 2 knows what to wait for.

## Table of Contents

- Decision 1 — Component architecture & conventions (pending)
- Decision 2 — Designer-editability model & inline-comment grammar (pending)
- Decision 3 — Token-library architecture (pending)
- Security & contrast implications (pending)
- Citations (pending)

## Decision 1 — Component architecture & conventions

**PENDING.** Will state the authoring pattern, file layout, and how variants, states, and slots
are declared, while keeping the single `src/style.css` + Tailwind-4 `@theme` authorship model
and react-aria's ownership of behaviour and state.

## Decision 2 — Designer-editability model & inline-comment grammar

**PENDING.** Will fix the inline-comment grammar (working proposal `@ds surface:` / `@ds edit:` /
`@ds slot:` / `@ds state:` / `@ds guardrail:`), the variant/slot conventions, the "edit here"
seams, and the guardrails that keep logic and the security boundary out of a designer's edit path.

## Decision 3 — Token-library architecture

**PENDING.** Will fix the primitive → semantic → component token layering, the frozen
ink-on-parchment palette as the primitive source, the light/dark theming mechanism, and how WCAG
AA contrast is guaranteed by the semantic→primitive mapping rather than per-rule.

## Security & contrast implications

**PENDING.** Will confirm the decision changes no source value and no security boundary, and
flag any security-crossing implication for the relevant Phase 2 grandchild to design
security-first.

## Citations

**PENDING.** Will cite each iteration and the reference systems (Untitled UI React, shadcn/ui,
Radix Themes, Material 3, Polaris) it draws from or rejects.
