# Review overlay

`Review.svelte` — the plan / approval **review overlay**. Not a route: the shell (`routes/+layout.svelte`) shows it above the routed page based on an overlay flag, and the `/attention/[lookupId]` route can redirect into it.

Single-component screen; state + actions come from shell context. Mutations it triggers are ticketed and fail-closed (a frozen security invariant).
