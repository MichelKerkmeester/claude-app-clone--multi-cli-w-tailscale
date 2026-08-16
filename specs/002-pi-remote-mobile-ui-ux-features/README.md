# Spec 002 — Pi Remote feature parity (research → build)

One **phase per feature**. Inside each feature phase, the first sub-phase is
**research (`001-research/`)**; no build work starts until a feature's research is
complete and synthesized into a build-ready decision.

Target bar: the Claude iOS app and the Kimi Code app. Fixed and out of scope to
change: the ink-on-parchment design system (bone/ink/clay, light + dark, WCAG) and
the security posture (read-only default, one-use ticketed + revision-checked
mutations, redaction everywhere, host/extension-enforced plan mode, content-free
push, operator-only full-access). UI-only unless a feature inherently needs a new
lane — flagged and designed security-first.

## Features and research budgets

| Build | Folder | Feature | Tier | Research budget (models) |
|-------|--------|---------|------|--------------------------|
| F1 | `001-change-model` | Change AI model | YES — harden + improve | 5 × DeepSeek v4 Flash |
| F2 | `002-change-effort` | Change effort level | YES — harden + improve | 5 × DeepSeek v4 Flash |
| F3 | `003-slash-commands` | Typed `/` commands, real inline list | PARTIAL — reach desired | 5 × SOL high + 5 × Grok 4.6 xhigh |
| F4 | `004-plan-mode-tab` | Plan-mode switch incl. Tab affordance | PARTIAL — reach desired | 5 × SOL high + 5 × Grok 4.6 xhigh |
| F6 | `005-file-preview` | See/preview a file like Claude | PARTIAL — reach desired | 5 × SOL high + 5 × Grok 4.6 xhigh |
| F7 | `006-rich-content-blocks` | Bash Command/Output + code/text artifact cards | PARTIAL — reach desired | 5 × SOL high + 5 × Grok 4.6 xhigh |
| F5 | `007-media-upload` | Upload media from iOS gallery | NO — net-new binary lane, security-first | 5 × SOL high + 5 × Grok 4.6 xhigh + 5 × DeepSeek v4 Flash |
| F8 | `008-inbound-media` | Preview media/screenshots pi sends, inline | NO — net-new inbound lane, security-first | 5 × SOL high + 5 × Grok 4.6 xhigh + 5 × DeepSeek v4 Flash |

Total: **80 research iterations** across the 8 build-ready features, no early convergence.

Two further net-new features — `009-ask-question`, `010-todos` — have reference-screen research only and are **not yet synthesized** (no `research.md`, spec, or phase manifest).

DeepSeek v4 Flash is dispatched via the OpenCode Go gateway
(`opencode-go/deepseek-v4-flash`) because the direct DeepSeek provider is out of
credit (operator decision).

## Layout

```
specs/002/<Fn-feature>/
  research/                     deep-loop-aligned research (NOT a phase child)
    BRIEF.md                    the research question + target + output contract
    iterations/iteration-NNN.md one independent, cited research pass per iteration
    reference-screens.md        real Mobbin/Refero captures + UI/UX direction
    research.md                 (written after iters complete) build-ready decision
  001-research/                 lean spec-kit phase child (spec + 2 JSONs); points at ../research/
```
