# Fixtures

Demo data that ships to local previews and stories rather than to users or the live relay. It is separate from every runtime folder precisely so the distinction is visible before opening a file: fixtures exercise surfaces, while transport and state preserve production authority.

## What lives here

- **`demo.ts`** — the double-gated local demo identity, query-selected fixture descriptors, transcript and rich-content blocks, todo and artifact data, media states, fake relay responses, artifact bytes, and demo socket behavior.

## Why it's shaped this way

- **Preview needs data without a host.** The demo can populate the mobile chat and design-system surfaces when no relay is available, but it never speaks to the real relay.
- **Opt-in is explicit twice.** `isDemoMode` requires the build flag and the `demo=1` opt-in, with `demo=0` clearing the persisted preview choice.
- **Fixture breadth is intentional.** The data covers normal content and boundary states such as empty, denied, withheld, corrupt, expired, delivery-unknown, and unsupported surfaces.
- **Production authority stays untouched.** Demo identity, fake responses, and in-memory resources remain local to the tab and are not a substitute for enrollment or host-confirmed state.

Structure, fixture gates, and demo do-nots are in `CODE.md`.
