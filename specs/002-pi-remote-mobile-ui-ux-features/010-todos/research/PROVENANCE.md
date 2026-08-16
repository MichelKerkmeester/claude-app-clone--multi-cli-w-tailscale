# Research provenance — Support pi's todos in the PWA

**Reference-screen research: complete.** `reference-screens.md` holds 14 real
`refero.design` iOS captures with a reference-backed UI/UX direction. Mobbin's
`mobbin_search_screens` returned zero on every query, so no mobbin.com URLs are
cited; nothing is fabricated.

**Synthesis: complete.** `research.md` is the build-ready decision, synthesized
from `reference-screens.md` + `BRIEF.md` and the fixed ink-on-parchment + security
contracts. It was produced in a single pass by GPT-5.6 Luna (reasoning effort
`max`, fast tier) dispatched via Codex, then reviewed and accepted against the
frozen contracts and the cited URLs (only the 14 real Refero screens appear). The
decision holds the read-only-projection stance: the phone never mutates the todo
list.

**Divergence from 001–008 (honest note):** this feature used one synthesis pass
rather than the multi-iteration deep-loop, so there is **no `iterations/`
folder** here — the equivalent 001–008 packets carry `iterations/iteration-NNN.md`
cited passes. The decision quality was verified directly (contracts respected,
URL provenance clean, 20 objective acceptance checks) rather than via convergence
across passes. A later deep-loop pass could add `iterations/` if that parity is
required.
