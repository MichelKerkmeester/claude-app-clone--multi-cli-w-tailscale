# Checklist — Dedicated `sk-code` mode for Mobile-CLI app work (plan-only)

- [x] The plan cites `sk-code/SKILL.md` §2 Smart Routing and the real `mode-registry.json` schema. —
      `mode-design-plan.md` §1 cites SKILL.md §2 (registry-driven routing, the workflowMode/packetKind/
      backendKind discriminator, advisor-invisible surfaces bundled via `surfaceBundle`) and the real
      `mode-registry.json` surface-entry schema.
- [x] The packet identity is specified: folder `sk-code-mobile-cli` (folder == `packetSkillName`)
      with its `graph-metadata.json` advisor-identity file; hub-only files noted as such. —
      **CORRECTED against the real hub:** §2 specifies folder `sk-code-mobile-cli`
      (folder == `packetSkillName`, `grandfatheredFolderMismatch: false`) and documents that the real
      `sk-code-webflow`/`-opencode` surface packets carry **no** `graph-metadata.json` /
      `description.json` at the packet level (verified by `ls` + the advisor-metadata contract). The
      scaffold's assumption that the packet needs its own `graph-metadata.json` is wrong; the surface is
      advisor-invisible under the hub's single `sk-code` identity. `mode-registry.json` /
      `hub-router.json` / `description.json` stay hub-only.
- [x] The `mode-registry.json` entry is specified as a surface packet (`packetKind: "surface"`,
      `backendKind: "evidence-base"`, read-only tools, `routingClass: "metadata"`) and listed under
      `extensions.surface-axis.surfaces`. — §3 gives the exact JSON entry (read-only `toolSurface`,
      `mutatesWorkspace: false`, aliases) plus the `surface-axis.surfaces` addition.
- [x] The `PI_REMOTE`/`MOBILE_CLI` surface-detection marker and its precedence versus `OPENCODE` and
      `WEBFLOW` are specified. — §4: markers match `apps/pi-remote-web/` + the pi-remote workspaces;
      precedence **OPENCODE > PI_REMOTE > WEBFLOW > UNKNOWN**, with a generic-Node-style guard and new
      TEST CASE rows. Grounded on the current UNKNOWN/`defer` behavior.
- [x] The folded implement → debug → verify workflow doctrine (via symlinks) is specified. — §5: the
      three `references/workflow-*.md` symlinks to `../../shared/references/`, mirroring
      `sk-code-webflow/references/`.
- [x] The plan explains how the token library, `@ds` grammar, and editability guardrails are encoded
      so future app code work auto-loads them. — §6: the three-layer token model, the `@ds` grammar,
      the guardrail fences, the verification command set (incl. the browser-free resolvers + catalog
      mount check), and pointers to `tokens.md` / `designer-guide.md` / `catalog.html`. §7 shows the
      resulting `surfaceBundle` behavior.
- [x] The plan states building the mode is out of scope and enumerates the exact files a follow-on
      build packet would create. — §8 lists the new packet files and the exact hub files edited.
- [x] No files under `.opencode/skills/sk-code/` are authored; no app source, source value, or
      security boundary is changed; no dependency is added. — the only writes are this phase's spec
      docs; `git status` shows nothing under `.opencode/skills/sk-code/` or `apps/`.
- [x] The documentary grounding check ran and the cited contract exists and is quoted accurately. —
      `node .opencode/bin/compiled-route.cjs --hub sk-code --prompt "code work on apps/pi-remote-web
      design system"` returned `action: "defer"`, `targets: []` (recorded verbatim in §1), confirming
      the missing-surface gap; the cited SKILL/registry/router/detection files were read directly.
