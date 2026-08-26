# Iteration 20: Gap audit vs research-angles.md (coverage close-out)

## Focus
Every chat and home gap listed in `research-angles.md` mapped to an orca verdict. Stop policy is max-iterations; this pass is coverage, not early synthesis.

## Actions Taken
- Re-read `specs/007-orca-nodeterm-ux-mining/research-angles.md` current-state gaps and six angles.
- Cross-walk iterations 1–19. No new orca files except confirming Inbox join uncertainty.

## Findings

### F-ITER020-CHAT Chat-gap audit
[SOURCE: specs/007-orca-nodeterm-ux-mining/research-angles.md:9:10]

| Our gap | Orca native-chat / renderer | Verdict |
|---|---|---|
| Long-press / reactions / reply / quote / edit-and-resend / regen | Absent in native-chat (iter 5) | **not an orca port**; regen/edit **need host RPCs** if we add later |
| In-conversation search | Absent | **not in orca** |
| Per-turn nav | Scroll-this-message-to-top (iter 5, 9) | **drop-in** |
| In-chat rename/pin/archive/export/new | Slash CLI strings only (iter 14) | chrome over host commands **drop-in**; local metadata **not portable** |
| File/doc attach | Image-only (iter 6) | extra MIME **needs host** |
| Voice/dictation | Paired-desktop speech; not on-device STT (iter 6) | on-device **not portable** |
| Paste-image | Clipboard upload lease (iter 6) | **needs host RPC** (if missing) |
| @-mentions | Host `files.searchPaths` (iter 10) | **needs host RPC** |
| Command-arg UI | Slash to TUI (iter 16) | **not portable**; keep our RPC sheet |
| Up-arrow prompt-history | Electron local stack only (iter 12) | mobile sheet **drop-in** |
| Partial typing indicator | Working dots + gated stream (iter 7) | **drop-in**; fake typing **not portable** |
| Haptics | Five helpers (iter 17) | **drop-in** |
| PTR in chat | History PTR; chat is live-edge (iter 1, 9) | chat PTR **not an orca chat pattern** |
| Copy-code in bubble | Whole-message copy; fence copy is **editor** (iter 13) | fence chip **drop-in** from editor |

### F-ITER020-HOME Home-gap audit
[SOURCE: specs/007-orca-nodeterm-ux-mining/research-angles.md:12:13]

| Our gap | Orca analog | Verdict |
|---|---|---|
| Search/filter/sort/group | History search + scope tabs + sort updated (iter 1, 8) | chrome **drop-in**; useful search **needs title/preview** |
| Pin/favorite | Worktree pin RPC (iter 2) | session pin **needs host**; device-only **not portable** |
| Swipe / multi-select / long-press | Absent (iter 17) | **not in orca** |
| Unread on card | Worktree bell; History omits; Inbox join (iter 3, 19) | join **drop-in** if sessionId; else **needs attention** |
| Title / preview / agent / model | History card (iter 1, 4) | **needs host fields** |
| Project/repo/branch/cwd | History cwd; home copy forbids paths (iter 4, 18) | raw path **not portable**; label optional |
| Progress / tokens | optional on vault session (iter 4) | **needs host** (optional) |
| New session on home | New Workspace ≠ new chat (iter 2, 14) | **needs host create**; Workspace **not portable** |
| Coarse time / no live tick | `formatTimeAgo` no interval (iter 15) | buckets **drop-in**; tick optional |
| PTR | History RefreshControl (iter 1) | **drop-in** |
| Skeletons | Spinner + keep-last-good (iter 15) | spinner **drop-in**; skeletons not orca |
| Peek before open | 5 preview turns (iter 1) | chrome **drop-in**; body **needs previewMessages** |
| Flat nav / tabs / back-swipe | Scope tabs; chat vs terminal (iter 8, 9) | status filter **drop-in**; PTY split **not portable** |

### F-ITER020-OPEN Still operator/host questions (not missing orca files)
[SOURCE: specs/007-orca-nodeterm-ux-mining/research-angles.md:4:5]

1. Confirm Inbox item includes `sessionId` (iter 19 inferred).
2. Whether product lifts path ban for a redacted `projectLabel`.
3. Whether paste-image / file-search RPCs already exist on Pi relay (out of orca scope).

**No remaining orca surface in scope that would change the ranked verdicts.** Electron native-chat and mobile native-chat were both sampled. Worktree Home was sampled and **ruled out** as the wrong object.

## Questions Answered
All five inbox questions have portable-vs-not answers. Residual items are product/host, not orca-unknown.

## Ruled Out
- Further mining of orca PR sidebar, git history, or mermaid as session-selection sources (wrong object / out of ranked angles).
- Waiting for orca to grow ChatGPT-style message menus (not present at v1.4.178-rc.2).

## Dead Ends
- Orca Home as a template for Pi session cards (wrong object, iter 2 + 19).

## Sources Consulted
- specs/007-orca-nodeterm-ux-mining/research-angles.md:9
- Iterations 1–19 of this lineage

## Assessment
- newInfoRatio: 0.22
- noveltyJustification: Coverage matrix; little new file evidence. Below 0.05 would be telemetry-only; this is the 20th and final iteration under max-iterations.
- confidence: high.

## Reflection
- What worked and why: A gap×verdict table is the synthesis input the host packet needs.
- What did not work and why: Inbox sessionId was not re-verified in protocol types this pass (call out as inferred).
- What I would do differently: Synthesis should weight History+native-chat and explicitly discard worktree Home.

## Recommended Next Focus
Phase synthesis: `research.md` + resource-map + `synthesis_complete` (stopReason `maxIterationsReached`).
