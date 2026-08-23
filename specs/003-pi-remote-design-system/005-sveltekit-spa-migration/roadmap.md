---
title: "SvelteKit SPA migration — roadmap"
description: "The order of play for the nine remaining packets: what is executable now, what each one is gated on, the two lanes that run in parallel, and what done looks like."
contextType: "planning"
---

# Roadmap — the post-cutover queue

Nine packets remain. Two lanes run in parallel and never touch the same files, which is the whole
reason the queue is shaped this way.

---

## 1. THE TWO LANES

**The relay lane** (`016` → `017`) touches `app-relay/src/**` and is independent of everything else.
It is executable today and unaffected by the client queue's blocked state.

**The client lane** (`015` → `012` → `013` → `014` → `019`) is mostly sequential, because `012` and
`013` both rewrite all 148 source files and must never run concurrently.

`011` sits outside both, driven by operator requests. `018` needs three upstreams and therefore lands
late despite holding the defect a user is most likely to notice.

```
RELAY LANE (start now, runs throughout)
  016/001 projection-integrity ─┐
  016/002 route-authority      ─┼─► 017 ask-question-activation
  016/003 connection-lifecycle ─┘

CLIENT LANE
  015 test-lanes ──► 012/001 grammar+manifest ──► 012/002 shared-split ──► 012/003 pages+tooling
                                                                                │
                                                        ┌───────────────────────┤
                                                        ▼                       ▼
                                                  013 comments            018 transcript
                                                        │                  (also needs 015, 011)
                                                        ▼
                                                  014 folder-docs
                                                        │
                                                        ▼
                                                  019 skill refresh  ◄── needs 012, 013, 014

  011 ux-affordances — opt-in, operator-driven, feeds 018
```

---

## 2. ORDER OF PLAY

### Start immediately, in parallel

**`015-test-lanes`** — the precondition. Replaces the hardcoded 15-path logic-test allowlist with a
glob (four tests named in its header comment are already dead), stops mocking the virtualizer out of
existence, gives ESLint a Svelte parser, and covers the transcript reducer. Everything downstream
becomes provable once this lands; nothing downstream is provable before it.

**`016/001-projection-integrity`** — first in the relay lane because the other two can fail *into* the
path it fixes. A projection sequence counter is cached locally while the store drops control-plane
projections without consuming a sequence, so the next block in the same batch throws — and the throw
is caught by the framing layer, relabelled as a parse failure, and handed to an error listener that is
never registered. The user sees a block referenced in the transcript and never rendered, with no error
anywhere. This is live, silent data loss on a first-party path, verified line by line against source.
Also carries epoch rotation on host restart and the cross-epoch garbage collection that rotation
obliges — the two ship together or neither ships.

**`016/002-route-authority`** — parallel with 001, different file, one pass through the route table.
Twelve routes honour the foreground invariant and three do not. Every rate-limited response gains the
`Retry-After` header the client is already built to parse and never receives. "Foreground" gets one
meaning computed in one place.

**`012/001-grammar-and-manifest`** — unblocked as of the naming sign-off. Builds the rename manifest
as data with the specifier rewrite *generated* from it, then proves the mechanics on 23 files
(`shared/primitives/` and `shared/chrome/`) where every trap is present and the diff is still short
enough to read line by line.

### Then

**`016/003-connection-lifecycle`** — server heartbeat with an injectable interval, and a client that
classifies a socket close by the recovery it implies rather than meeting a fifteen-minute credential
expiry with backoff. Carries an open operator question about whether to ship the client half without a
test.

**`017-ask-question-activation`** — after 016. The client ships the entire feature — a card, six
sub-components, seven stories, a test, roughly fifteen protocol types — and every relay route answers
`503`, because the service is constructed only inside its own test. The operator has confirmed the
feature is meant to be live.

**`012/002-shared-tree-split`** — the 28-file `shared/data/` redistribution into seven folders, in one
commit. The widest specifier impact in the programme, and the place where a partial application is
most likely to still compile. The existence check and the specifier grep are the gate here, not the
build.

**`012/003-pages-and-tooling`** — roughly a hundred kind-first renames across seven feature folders,
one dispatch each, then the tooling catch-up and the nine-gate barrier. Watch the CSS-corpus glob: a
stale one turns the load-bearing gate into a false green.

### After 012 closes

**`013-comment-grammar`** — section banners on the 51 files that lack them, and in-section comments
rewritten from WHAT-narration to durable WHY. 403 comments start lowercase; 5 are trailing. Cannot
overlap 012.

**`014-folder-documentation`** — 16 READMEs (5 to 75 lines) and 7 CODE files onto the sk-doc feature
and code-folder templates, plus the ones missing. Runs after 013 so it describes the final tree.

**`018-transcript-affordances`** — disclosure state that survives scrolling (keyed by block id, held
outside the row), an approval row where the blanket grant is not a visual twin of the single one, and
a transcript that can say *stalled* rather than *working* forever.

**`019-surface-skill-refresh`** — last, on purpose. Audits `sk-code-mobile-cli` against the shipped
tree, teaches the three new conventions, replaces the superseded divider grammar that has kept the
`008` branch stranded since the framework refactor, carries the runes self-invalidation doctrine as
prose, and finally merges that branch. Completion is the merge plus one dispatch loading the merged
surface — not the last edit.

---

## 3. WHAT GATES WHAT

| Packet | Gated on | Why |
|---|---|---|
| `015` | nothing | precondition |
| `016/001`, `016/002` | nothing | relay-side, mutually independent |
| `016/003` | `016/002` | sequenced for review, not correctness |
| `017` | `016` | wires into the corrected relay |
| `012/001` | `011` landing | avoids renaming a file with an open edit; not a correctness dependency |
| `012/002` | `012/001` | consumes the manifest |
| `012/003` | `012/002` | `pages/` moves after `shared/` settles |
| `013` | `012` | same 148 files — must not run concurrently |
| `014` | `012`, `013` | documents the final tree |
| `018` | `012`, `015`, `011` | renamed tree, provable tests, requirements |
| `019` | `012`, `013`, `014` | describes what shipped |

---

## 4. WHAT DONE LOOKS LIKE

- One naming grammar across the app, with a `shared/` tree whose folders each have one reason to
  change, and a directory listing that answers *what kind of thing is this* without opening a file.
- Every source file segmented into labelled sections with durable WHY comments, and every folder
  carrying documentation that explains its feature and its logic.
- No silent error path in the relay: an error the code deliberately raises reaches somewhere a human
  or a test can read it. Foreground authority is universal rather than nearly universal. Connection
  liveness is proven rather than assumed.
- The ask-question feature answers from a real service.
- Three transcript affordances a user actually notices.
- `sk-code-mobile-cli` teaches the tree that exists, and the branch stranded since the framework
  refactor is merged.
- All nine gates green from the final state, token identity at zero diffs, every packet passing
  `validate.sh --strict` through the script's realpath.

---

## 5. WHAT THE GATES CANNOT SEE

Worth holding while planning, because these classes need an operator on a device rather than a green
board.

- **Accessibility.** The react-aria → Bits UI swap regressed the a11y contract and no gate noticed.
  Three P0 and seven P1 findings are recorded in `007-verify-and-cutover/a11y-parity-findings.md`.
- **Real-device transcript behaviour.** jsdom cannot reproduce iOS Safari momentum scrolling, and the
  CDP scripts drive headless Chrome at 390px rather than a real compositor. Two of `018`'s three
  items need a device.
- **Whether a conventions document is *correct*.** A reference-integrity scan proves every path
  resolves and a grep proves the old grammar is gone. Neither proves the new prose is right about
  Svelte. Only a dispatch loading the merged surface tests meaning.
- **A stall threshold.** It is a guess until someone measures a long silent tool run. Set it too short
  and a legitimate run reads as stalled, which trains the user to ignore the signal.
