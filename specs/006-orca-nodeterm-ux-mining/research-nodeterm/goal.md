# Goal — nodeterm UX mining (autonomous)

Run 10 iterations of deep research over `specs/context/nodeterm-main` and, without asking questions, produce a verified synthesis of the best portable UI/UX and chat-feature logic for our host-authoritative SvelteKit mobile client, prioritising (1) user chat UX and (2) home-screen session-selection UX.

Work the six ranked angles in `research-angles.md`. Weight the headline angle — nodeterm's Trello-style board of live Claude Code sessions — most heavily. Read only; never modify `specs/context/**`.

Every finding names the nodeterm file/pattern, the concrete thing to copy, its mapping onto THE CONSTRAINT (a: view over existing DTO fields / b: pure interaction / c: new host field to request), and a portability verdict (✅ drop-in / ⚠️ needs host field / ❌ not portable). Reject anything that needs the client to own mutable session truth. Dedupe against the orca findings (`../research/research.md`) and the `007-host-requests` host set — flag reinforcement or supersession rather than re-requesting.

No early convergence — run all 10 iterations. Synthesize `research.md` + a resource map at the end.
