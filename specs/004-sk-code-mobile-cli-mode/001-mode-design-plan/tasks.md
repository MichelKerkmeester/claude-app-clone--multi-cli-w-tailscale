# Tasks — Dedicated `sk-code` mode for Mobile-CLI app work (plan-only)

- [x] Read and cite the hub contract: `sk-code/SKILL.md` §2 Smart Routing, `mode-registry.json`,
      `ROUTER.md`, and `shared/` (the surface-detection layer), plus an existing surface packet as
      the structural template. — read directly: SKILL.md §2, `mode-registry.json`, `hub-router.json`
      (verified `routerSignals`/`vocabularyClasses` structure), `ROUTER.md` (`router_state: active`),
      `shared/references/stack-detection.md`, and the `sk-code-webflow/` packet as the template. All
      cited in `mode-design-plan.md` §1.
- [x] Align the plan with the `sk-create-skill` mode-creation standards and templates. — read and cited
      `parent-skills-nested-packets.md` (canonical parent-hub method + required `modes[]` fields +
      surface constraints + companion-file/changelog/naming policy), `skill-root-metadata-contract.md`
      (two-class matrix; `sk-code` = class H; `NESTED_IDENTITY` rule + `ci-skill-root-metadata.cjs`
      gate), `packet-skill-scaffold.md` (packet SKILL.md template), and
      `compiled-routing-lockstep-surfaces.json` (`sk-code` is a lockstep hub). Corrected the plan:
      packet `changelog/` is required + real (was "optional"), the packet SKILL.md follows the scaffold
      template with read-only tools, precise `hub-router` wiring (routerSignals full name / `code-`
      vocab prefix / compositional strategy), the active `ROUTER.md`, and the mandatory
      leaf-manifest regeneration + fleet gate + compiled-route re-mint.
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
      §9: new packet files (SKILL.md per template, README.md, real `changelog/v1.0.0.0.md`, the
      `references/` workflow symlinks, optional assets/benchmark/playbook) + edited hub files
      (mode-registry, hub-router, stack-detection, conditional ROUTER.md) + the mandatory regenerate/gate
      steps (`ci-skill-root-metadata.cjs --fix` then exit 0; `compiled-route-manifest.cjs mint` +
      freshness).
- [x] Run the documentary grounding check and record evidence in `checklist.md`. Author **no** files
      under `.opencode/skills/sk-code/`. — `compiled-route.cjs … --prompt "code work on
      apps/pi-remote-web design system"` → `action: "defer"`, `targets: []` (recorded in §1 and
      checklist); no file under `.opencode/skills/sk-code/` was written (plan lives only in this spec
      folder).
