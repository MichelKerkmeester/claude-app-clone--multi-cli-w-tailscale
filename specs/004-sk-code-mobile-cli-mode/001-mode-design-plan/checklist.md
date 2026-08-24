# Checklist — Dedicated `sk-code` mode for Mobile-CLI app work (plan-only)

## Hub-contract grounding

- [x] The plan cites `sk-code/SKILL.md` §2 Smart Routing and the real `mode-registry.json` schema. —
      §1 cites SKILL.md §2 (registry-driven routing, the discriminator, advisor-invisible surfaces via
      `surfaceBundle`) and the real surface-entry schema.
- [x] The `mode-registry.json` entry is specified as a surface packet (`packetKind: "surface"`,
      `backendKind: "evidence-base"`, read-only tools, `routingClass: "metadata"`) and listed under
      `extensions.surface-axis.surfaces`. — §3 (exact JSON with every required `modes[]` field;
      surface constraints honored; aliases lowercase + unique).
- [x] The `PI_REMOTE`/`MOBILE_CLI` surface-detection marker and precedence vs `OPENCODE`/`WEBFLOW` are
      specified. — §6: OPENCODE > PI_REMOTE > WEBFLOW > UNKNOWN, guard + TEST CASE rows.
- [x] The folded implement → debug → verify workflow doctrine (via symlinks) is specified. — §7.
- [x] The plan explains how the token library, `@ds` grammar, and editability guardrails are encoded. —
      §8, pointing at the live `tokens.md` / `designer-guide.md` / `catalog.html`; bundling result shown.
- [x] The plan states building the mode is out of scope and enumerates the exact files a follow-on
      build packet would create. — §9 (packet files + edited hub files + regeneration/gates).
- [x] No files under `.opencode/skills/sk-code/` are authored; no app source, source value, or security
      boundary is changed; no dependency is added. — `git status` shows only this phase's spec docs.
- [x] The documentary grounding check ran and the cited contract exists and is quoted accurately. —
      `compiled-route.cjs … "code work on apps/pi-remote-web design system"` → `action: "defer"`,
      `targets: []` (recorded in §1); SKILL/registry/router/detection files read directly.

## sk-create-skill mode-creation alignment (this pass)

- [x] The plan is grounded in the `sk-create-skill` standards, not just the live hub. — §1 cites
      `parent-skills-nested-packets.md` (canonical parent-hub method), `skill-root-metadata-contract.md`
      (the two-class matrix; `sk-code` = class **H**), `assets/parent-skill/scaffold/
      packet-skill-scaffold.md` (the packet SKILL.md template), and
      `compiled-routing-lockstep-surfaces.json` (`sk-code` is a lockstep hub).
- [x] Packet identity conforms: `folder == packetSkillName`, `grandfatheredFolderMismatch: false`,
      hub-prefixed surface name; **no** packet-level `graph-metadata.json`/`description.json` (a
      `NESTED_IDENTITY` violation per the metadata contract; the fleet gate `ci-skill-root-metadata.cjs`
      enforces it). — §2.
- [x] The packet `SKILL.md` is specified per `packet-skill-scaffold.md`: frontmatter (`name`,
      `description` ≤130, **read-only** `allowed-tools: [Read, Bash, Grep, Glob]`, `version`) + the
      7-section body; never a separate advisor identity. — §2.
- [x] `hub-router.json` wiring is precise against the verified structure: `routerSignals` keyed by the
      full `sk-code-mobile-cli`; `vocabularyClasses` `code-mobile-cli-{aliases,runtime}` (the `code-…`
      prefix, not `sk-code-…`); `routerPolicy.tieBreak` append; sk-code's **compositional** vocab
      strategy. — §4.
- [x] The active root `ROUTER.md` is accounted for: add equal-key `INTENT_SIGNALS`/`RESOURCE_MAP` leaf
      entries only if the surface exposes stage-two leaves; never synthesize intents. — §5.
- [x] Packet companion-file policy honored: a **real** `changelog/v1.0.0.0.md` (never symlinked, never
      pointed at the hub changelog), `README.md`, `references/` (with the workflow symlinks), `assets/`
      as needed. — §8, §9.
- [x] Regeneration + gates are specified: `ci-skill-root-metadata.cjs --fix` to regenerate the hub
      `leaf-manifest.json`, then the gate at exit 0; and — because `sk-code` is a lockstep
      compiled-routing hub — re-mint the compiled-route manifest
      (`compiled-route-manifest.cjs mint --hub sk-code …`) + freshness. — §9.
