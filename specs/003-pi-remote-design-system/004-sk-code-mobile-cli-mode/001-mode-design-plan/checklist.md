# Checklist — Dedicated `sk-code` mode for Mobile-CLI app work (plan-only)

- [ ] The plan cites `sk-code/SKILL.md` §2 Smart Routing and the real `mode-registry.json` schema.
- [ ] The packet identity is specified: folder `sk-code-mobile-cli` (folder == `packetSkillName`)
      with its `graph-metadata.json` advisor-identity file; hub-only files noted as such.
- [ ] The `mode-registry.json` entry is specified as a surface packet (`packetKind: "surface"`,
      `backendKind: "evidence-base"`, read-only tools, `routingClass: "metadata"`) and listed under
      `extensions.surface-axis.surfaces`.
- [ ] The `PI_REMOTE`/`MOBILE_CLI` surface-detection marker and its precedence versus `OPENCODE` and
      `WEBFLOW` are specified.
- [ ] The folded implement → debug → verify workflow doctrine (via symlinks) is specified.
- [ ] The plan explains how the token library, `@ds` grammar, and editability guardrails are encoded
      so future app code work auto-loads them.
- [ ] The plan states building the mode is out of scope and enumerates the exact files a follow-on
      build packet would create.
- [ ] No files under `.opencode/skills/sk-code/` are authored; no app source, source value, or
      security boundary is changed; no dependency is added.
- [ ] The documentary grounding check ran and the cited contract exists and is quoted accurately.
