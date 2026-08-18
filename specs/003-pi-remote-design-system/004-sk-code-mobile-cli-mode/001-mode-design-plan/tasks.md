# Tasks — Dedicated `sk-code` mode for Mobile-CLI app work (plan-only)

- [x] Read and cite the hub contract: `sk-code/SKILL.md` §2 Smart Routing, `mode-registry.json`,
      `ROUTER.md`, and `shared/` (the surface-detection layer), plus an existing surface packet as
      the structural template. — read directly: SKILL.md §2, `mode-registry.json`, `hub-router.json`,
      `shared/references/stack-detection.md`, and the `sk-code-webflow/` packet as the template. All
      cited in `mode-design-plan.md` §1.
- [x] Specify the packet identity: folder `sk-code-mobile-cli` (folder == `packetSkillName`) and its
      `graph-metadata.json` advisor-identity file; note `description.json`/`mode-registry.json`/
      `hub-router.json` stay hub-only. — §2. **Correction from grounding:** surface packets carry no
      packet-level advisor metadata at all (webflow/opencode have none); the surface is advisor-invisible
      under the hub's single `sk-code` identity, so no packet `graph-metadata.json` is created. Hub-only
      files remain hub-only.
- [x] Specify the `mode-registry.json` entry (`workflowMode`, `packetKind: "surface"`,
      `backendKind: "evidence-base"`, read-only `toolSurface`, aliases, `routingClass: "metadata"`)
      and its listing under `extensions.surface-axis.surfaces`. — §3 (exact JSON).
- [x] Specify the new `PI_REMOTE`/`MOBILE_CLI` surface-detection marker in `shared/` that matches
      `apps/pi-remote-web/`, and its precedence versus `OPENCODE` and `WEBFLOW`. — §4: markers +
      precedence OPENCODE > PI_REMOTE > WEBFLOW > UNKNOWN + guard + TEST CASE rows.
- [x] Specify how the packet folds in the shared implement → debug → verify workflow doctrine via
      symlinks, as the existing surfaces do. — §5 (the three `references/workflow-*.md` symlinks).
- [x] Specify how the packet encodes the token library layering, the `@ds` inline-comment grammar,
      the editability guardrails, and the verification command set. — §6, with pointers to the live
      `tokens.md` / `designer-guide.md` / `catalog.html`; §7 shows the `surfaceBundle` result.
- [x] State the out-of-scope boundary and enumerate the exact files a follow-on build packet creates. —
      §8 (new packet files + edited hub files).
- [x] Run the documentary grounding check and record evidence in `checklist.md`. Author **no** files
      under `.opencode/skills/sk-code/`. — `compiled-route.cjs … --prompt "code work on
      apps/pi-remote-web design system"` → `action: "defer"`, `targets: []` (recorded in §1 and
      checklist); no file under `.opencode/skills/sk-code/` was written (plan lives only in this spec
      folder).
