# Tasks — Dedicated `sk-code` mode for Mobile-CLI app work (plan-only)

- [ ] Read and cite the hub contract: `sk-code/SKILL.md` §2 Smart Routing, `mode-registry.json`,
      `ROUTER.md`, and `shared/` (the surface-detection layer), plus an existing surface packet as
      the structural template.
- [ ] Specify the packet identity: folder `sk-code-mobile-cli` (folder == `packetSkillName`) and its
      `graph-metadata.json` advisor-identity file; note `description.json`/`mode-registry.json`/
      `hub-router.json` stay hub-only.
- [ ] Specify the `mode-registry.json` entry (`workflowMode`, `packetKind: "surface"`,
      `backendKind: "evidence-base"`, read-only `toolSurface`, aliases, `routingClass: "metadata"`)
      and its listing under `extensions.surface-axis.surfaces`.
- [ ] Specify the new `PI_REMOTE`/`MOBILE_CLI` surface-detection marker in `shared/` that matches
      `apps/pi-remote-web/`, and its precedence versus `OPENCODE` and `WEBFLOW`.
- [ ] Specify how the packet folds in the shared implement → debug → verify workflow doctrine via
      symlinks, as the existing surfaces do.
- [ ] Specify how the packet encodes the token library layering, the `@ds` inline-comment grammar,
      the editability guardrails, and the verification command set.
- [ ] State the out-of-scope boundary and enumerate the exact files a follow-on build packet creates.
- [ ] Run the documentary grounding check and record evidence in `checklist.md`. Author **no** files
      under `.opencode/skills/sk-code/`.
