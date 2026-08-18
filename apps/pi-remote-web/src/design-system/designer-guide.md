# Designer guide — coming in the editability audit

The full designer guide is a stub today. It will land in the editability audit, after the token
reference and the component state seams are re-read and the per-surface edit rules are reconciled.
Until then, the live catalog enumerates every migrated surface and its declared states, and the token
reference in `src/design-system/tokens.md` records what each semantic and component token resolves to
and which rows are safe to edit. The catalog is read-only design tooling: it renders the real
components over deterministic offline fixtures and adds no mutation, host action, or network call.