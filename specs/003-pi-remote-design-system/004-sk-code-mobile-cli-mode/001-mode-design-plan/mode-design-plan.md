# Mode design plan — `sk-code-mobile-cli` surface packet (plan-only)

> **Plan-only deliverable.** This document designs the future `sk-code-mobile-cli` SURFACE packet
> against the real `sk-code` hub contract. It authors **no** file under `.opencode/skills/sk-code/`.
> Section 8 lists the exact files a follow-on build packet would create.

## 1. Grounding — the real hub contract (cited)

- **`sk-code/SKILL.md` §2 Smart Routing** — routing is registry-driven; `mode-registry.json` is the
  single source of truth. The advisor routes any code query to the single identity `sk-code`; the hub
  picks the mode. The discriminator is **`workflowMode` / `packetKind` / `backendKind`**. Surface
  packets are advisor-invisible (`routingClass: metadata`, read-only `toolSurface`) and are bundled as
  evidence via `routerPolicy.outcomes.surfaceBundle` — the workflow mode first, then zero-or-more
  surfaces. Compiled routing is default-on: `node .opencode/bin/compiled-route.cjs --hub sk-code
  --prompt "<task>"`.
- **`mode-registry.json`** — the two axes: WORKFLOW (`sk-code-quality`, `sk-code-review`; modes that
  act) and SURFACE (`sk-code-webflow`, `sk-code-opencode`; `packetKind: "surface"`, `backendKind:
  "evidence-base"`, `routingClass: "metadata"`, `mutatesWorkspace: false`, `toolSurface.allowed:
  [Read, Bash, Grep, Glob]`, `forbidden: [Write, Edit, Task]`). Surfaces are listed under
  `extensions.surface-axis.surfaces`.
- **`hub-router.json`** — `routerPolicy.tieBreak` orders the modes; `routerPolicy.outcomes.surfaceBundle`
  defines "one workflow mode primary plus zero-or-more surface packets as read-only evidence". Each
  surface has a router entry with `classes` (e.g. `code-webflow-aliases`, `code-webflow-runtime`,
  `hub-identity`) and `resources` (e.g. `["sk-code-webflow/SKILL.md"]`), plus keyword classes.
- **`shared/references/stack-detection.md`** — surface detection runs on CWD + changed/target files
  BEFORE intent classification. Precedence: **OPENCODE** (target/CWD under `.opencode/`) > **WEBFLOW**
  markers (`src/2_javascript/`, `*.webflow.js`, `Webflow.push`/`--vw-`, vendor globals,
  `wrangler.toml`) > **UNKNOWN**. The generic-Node guard leaves any Node app outside `.opencode/` and
  without WEBFLOW markers as UNKNOWN.
- **Surface-packet template — `sk-code-webflow/`** — a surface packet is `README.md` + `SKILL.md` +
  `assets/` + `benchmark/` + `changelog/` + `manual-testing-playbook/` + `references/`, with the
  implement/debug/verify doctrine **symlinked** into `references/` from `../../shared/references/`. It
  carries **no** `graph-metadata.json`, `description.json`, `mode-registry.json`, or `hub-router.json`
  at the packet level.

### Reproducible evidence of the gap

```text
$ node .opencode/bin/compiled-route.cjs --hub sk-code --prompt "code work on apps/pi-remote-web design system"
{"hubId":"sk-code","action":"defer","selectionKind":null,"targets":[], ... }
```

Code work on `apps/pi-remote-web/` today routes to **`defer`** with **no targets** — the hub has no
surface for this app, so its token library, `@ds` grammar, and editability guardrails are not
auto-loaded. Per `stack-detection.md`, `apps/pi-remote-web/` (a Vite/React app with no WEBFLOW markers,
outside `.opencode/`) resolves to **UNKNOWN**. This is precisely the gap the planned surface fills.

## 2. Packet identity (corrects the scaffold assumption)

- Folder: `.opencode/skills/sk-code/sk-code-mobile-cli/` — **folder name == `packetSkillName`**
  (`grandfatheredFolderMismatch: false`).
- **No advisor-metadata files at the packet level.** The scaffold's task list assumed a packet
  `graph-metadata.json`; the real `sk-code-webflow`/`sk-code-opencode` surface packets carry none, and
  the advisor-metadata contract confirms `graph-metadata.json` is required only at hub-parent and
  standalone skill roots — never at a mode/packet sublevel — while `description.json` /
  `mode-registry.json` / `hub-router.json` are hub-only. **The surface packet therefore adds no
  advisor-identity file.** Its identity is the hub's single `sk-code` advisor identity; the surface is
  advisor-invisible and reached only by hub bundling. If the hub's own `graph-metadata.json` enumerates
  surface membership, the build packet updates that hub file — not a new packet file.

## 3. `mode-registry.json` entry (hub file — edited by the build packet, not here)

Add one `modes[]` entry, mirroring the `sk-code-webflow` surface entry:

```jsonc
{
  "workflowMode": "sk-code-mobile-cli",
  "packetKind": "surface",
  "backendKind": "evidence-base",
  "toolSurface": {
    "allowed": ["Read", "Bash", "Grep", "Glob"],
    "forbidden": ["Write", "Edit", "Task"],
    "mutatesWorkspace": false,
    "bashAllowlist": []
  },
  "packet": "sk-code-mobile-cli",
  "packetSkillName": "sk-code-mobile-cli",
  "grandfatheredFolderMismatch": false,
  "aliases": ["pi remote app", "mobile cli app", "pi-remote-web", "design system code",
              "@ds grammar", "token library edit", "designer-editable frontend"],
  "advisorRouting": { "routingClass": "metadata" }
}
```

And add `"sk-code-mobile-cli"` to `extensions.surface-axis.surfaces` (alongside `sk-code-webflow`,
`sk-code-opencode`).

## 4. Surface-detection marker (hub `shared/references/stack-detection.md` — edited by the build packet)

Add a new **PI_REMOTE** (Mobile-CLI) surface branch to the detection order. Proposed precedence:
**OPENCODE > PI_REMOTE > WEBFLOW > UNKNOWN.** OPENCODE keeps top precedence (a `.opencode/` target
always wins). PI_REMOTE matches this monorepo's app paths, which carry no WEBFLOW markers, so it never
contends with WEBFLOW in practice; ordering it before WEBFLOW/UNKNOWN simply catches the app work that
today falls to UNKNOWN.

Markers (CWD or any changed/target file):
- under `apps/pi-remote-web/`, `apps/pi-remote-relay/`, or a `packages/pi-*` / `@pi-remote/*` workspace;
- fallback signal: the repo root declares the `@pi-remote/*` npm workspaces.

Guard: PI_REMOTE is gated to these pi-remote paths/workspaces only, so a generic Vite/React repo stays
UNKNOWN (mirrors the existing generic-Node guard). Add a TEST CASE row: `apps/pi-remote-web/… changed →
PI_REMOTE`, and `apps/pi-remote-web marker AND changed .opencode/… → OPENCODE` (OPENCODE precedence
holds).

## 5. Folded workflow doctrine (packet `references/` — symlinks, as the existing surfaces do)

The build packet symlinks the shared implement→debug→verify doctrine into the packet, exactly as
`sk-code-webflow/references/` does:

```text
sk-code-mobile-cli/references/workflow-implement.md -> ../../shared/references/workflow-implement.md
sk-code-mobile-cli/references/workflow-debug.md     -> ../../shared/references/workflow-debug.md
sk-code-mobile-cli/references/workflow-verify.md    -> ../../shared/references/workflow-verify.md
```

No doctrine is duplicated; the surface bundles the shared doctrine as read-only evidence and adds only
its Mobile-CLI-specific standards.

## 6. Encoded conventions — what the surface carries as evidence

The packet `SKILL.md` + `references/` encode this epic's conventions so any workflow mode bundling the
surface applies them automatically:

- **Token library layering** — primitive (`--pi-*`, the 8 frozen source values) → semantic role
  (`--canvas`, `--ink`, `--accent`, …) → component (`--model-sheet-*`, `--slash-*`, `--diff-*`).
  Retint a role at the semantic layer, a surface at the component layer; never edit a `--pi-*` value.
- **The `@ds` inline-comment grammar** — `surface / slot / state / variant / edit / guardrail /
  catalog / theme`, as migrated across `style.css` and the components in Phase 2 and documented in the
  Phase 3 designer guide.
- **Editability guardrails** — the `@ds guardrail: do-not-edit` fences (frozen primitives, focus ring,
  state machines + status text, plan-mode overlay + atomic execute path, ≥44px targets, reduced-motion
  / contrast / forced-colors, redaction chip, bounded-reading overflow). CSS/token/slot edits are
  presentation-only and cannot reach logic or the security boundary.
- **Verification command set** — `npm run typecheck`, `npm run build`, `npm run test:web` (incl.
  `contrast.test.tsx`), plus the browser-free token/rule resolvers and the catalog/shell structural
  390px mount check that this epic established as the authoritative gate (headless CDP renders the app
  unstyled under its CSP, so pixel-diffing is not the gate; selector→value resolution is).

The surface points to the live artifacts as evidence: `apps/pi-remote-web/src/design-system/tokens.md`,
`.../designer-guide.md`, and the catalog entry `catalog.html`.

## 7. Bundling behavior (design intent)

With the entry in place, `compiled-route.cjs --hub sk-code --prompt "<app task>"` for a
`apps/pi-remote-web/` target resolves the workflow mode (e.g. `sk-code-quality` for an author-quality
gate) and bundles `sk-code-mobile-cli` as read-only evidence (`surfaceBundle`: workflow first, surface
after) — e.g. `[sk-code-quality, sk-code-mobile-cli]` — so the design-system conventions load
automatically instead of today's `defer`.

## 8. Out of scope + exact files a follow-on BUILD packet creates

**Out of scope here:** authoring any skill/registry/detection file. This packet produces only this plan.

A follow-on build packet (a separate, non-plan-only phase) would create/edit exactly:

New (packet):
- `.opencode/skills/sk-code/sk-code-mobile-cli/SKILL.md`
- `.opencode/skills/sk-code/sk-code-mobile-cli/README.md`
- `.opencode/skills/sk-code/sk-code-mobile-cli/references/` (Mobile-CLI standards + the three
  `workflow-*.md` symlinks to `../../shared/references/`)
- optional, mirroring the template: `assets/`, `benchmark/`, `changelog/`, `manual-testing-playbook/`

Edited (hub):
- `.opencode/skills/sk-code/mode-registry.json` — the `modes[]` entry (§3) + `surface-axis.surfaces`.
- `.opencode/skills/sk-code/hub-router.json` — `tieBreak` + a `sk-code-mobile-cli` router entry
  (`classes`, `resources: ["sk-code-mobile-cli/SKILL.md"]`) + keyword classes.
- `.opencode/skills/sk-code/shared/references/stack-detection.md` — the PI_REMOTE marker + precedence
  + TEST CASE rows (§4).
- `.opencode/skills/sk-code/graph-metadata.json` — only if the hub's own identity file enumerates
  surface membership/edges (verify at build time; no new packet-level metadata file).

No app source, source value, or security posture changes at any point — the surface is read-only
evidence.
