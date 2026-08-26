# Iteration 11: File mentions and bounded autocomplete

## Focus

Inspect Orca’s mobile autocomplete and file-search path for a useful Svelte composer palette that never invents workspace paths or mounts an unbounded list.

## Findings

### F-LUNA-011-A — Keep trigger detection pure and bounded

**Orca file/pattern:** `mobile/src/session/mobile-native-chat-autocomplete.ts:21-71,73-122` treats `@` after start/whitespace as a file trigger, `/` only at input start, replaces the token with a trailing space, and ranks/caps suggestions.

**Copy:** Use a pure draft+caret detector for `@files` and `/commands`; apply selection at the exact token span and preserve the user’s remaining text. Cap visible results and rank prefix matches before substring matches.

**Constraint mapping:** Detection and ranking are local presentation logic. A selected `@path` is not authoritative merely because it appears in a list; the host must resolve or validate the path for the active session before send. Do not offer a suggestion when the active scope is missing.

**Verdict:** `drop-in view affordance` for trigger/palette mechanics; path resolution `needs a new host field` or a host file-search RPC.

### F-LUNA-011-B — Debounce host file search and fence stale queries

**Orca file/pattern:** `mobile/src/session/use-mobile-native-chat-file-search.ts:16-46,48-145` debounces 120ms, caps results/cache, keys searches by worktree, and rejects late responses after a generation or sequence change; it falls back to `files.list` for older hosts.

**Copy:** When the host exposes file search, debounce the query, bound results, cancel stale display updates, and retain a clear unavailable state. Keep legacy fallback explicit rather than silently searching a different worktree.

**Constraint mapping:** Worktree/session identity and host epoch must fence every response. A legacy full-list fallback is safe only if its host scope is proven; otherwise omit `@file` completion. The client must never read the local filesystem as a substitute for a remote host.

**Verdict:** `drop-in view affordance` for debounce/fencing; host file index/scope `needs a new host field`.

## Negative knowledge

- Orca `@` means files, not people or agent mentions; importing a social mention model is not supported by this source.
- A locally scanned device filesystem is not a portable fallback for remote Pi sessions.

## Questions answered

- `@files` is worth porting only as a host-backed completion; trigger and bounded-list mechanics are independent of the host.

## SCOPE VIOLATIONS

None.

[SOURCE: specs/context/orca-main/mobile/src/session/mobile-native-chat-autocomplete.ts:21-71,73-122]
[SOURCE: specs/context/orca-main/mobile/src/session/use-mobile-native-chat-file-search.ts:16-46,48-145]
