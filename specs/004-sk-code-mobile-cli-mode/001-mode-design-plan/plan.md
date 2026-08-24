# Plan — Dedicated `sk-code` mode for Mobile-CLI app work (plan-only)

## Approach

Ground the plan in the hub's real contract, then design the new surface packet against it. Read
`sk-code/SKILL.md` §2, `mode-registry.json`, `ROUTER.md`, and an existing surface packet as the
template, and produce a plan document that specifies every artifact the future `sk-code-mobile-cli`
packet needs and how it encodes this packet's conventions. Write no skill, registry, or
graph-metadata file — the deliverable is the plan.

## Steps

1. Read the hub contract: `sk-code/SKILL.md` §2 Smart Routing (the two-axis model, surface packets
   as read-only evidence), `mode-registry.json` (the `workflowMode`/`packetKind`/`backendKind`
   discriminator and the `extensions.surface-axis` list), `ROUTER.md` (stage-two surface routing),
   and `shared/` (the surface-detection layer). Cite each.
2. Specify the packet identity: folder `sk-code-mobile-cli` (folder == `packetSkillName`), and its
   `graph-metadata.json` advisor-identity file (schema, `skill_id`, `family: sk-code`, edges),
   noting that `description.json`/`mode-registry.json`/`hub-router.json` stay hub-only.
3. Specify the `mode-registry.json` entry: `workflowMode: "sk-code-mobile-cli"`,
   `packetKind: "surface"`, `backendKind: "evidence-base"`, read-only `toolSurface`, aliases, and
   `advisorRouting.routingClass: "metadata"`; plus adding it to `extensions.surface-axis.surfaces`.
4. Specify the surface-detection marker: a new `PI_REMOTE`/`MOBILE_CLI` signal in `shared/` that
   matches `apps/pi-remote-web/` (and the app's siblings), and its precedence versus `OPENCODE` and
   `WEBFLOW` (this app is a Vite/React frontend, so define whether it overrides the generic frontend
   surface for these paths).
5. Specify the folded workflow doctrine: symlink `shared/references/workflow-implement.md`,
   `workflow-debug.md`, `workflow-verify.md` into the packet, as the existing surfaces do.
6. Specify the encoded conventions: how the packet's evidence carries the token library layering,
   the `@ds` inline-comment grammar, the editability guardrails, and the verification command set,
   so a workflow mode bundling this surface applies them automatically.
7. State the out-of-scope boundary and enumerate the exact files a follow-on build packet creates.

## Files to change

- This phase's plan document(s) only. **No files under `.opencode/skills/sk-code/` are written.**
- The plan lists (for the future build packet, not created here):
  `.opencode/skills/sk-code/sk-code-mobile-cli/SKILL.md`,
  `.opencode/skills/sk-code/sk-code-mobile-cli/graph-metadata.json`,
  the `mode-registry.json` edit, the `shared/` surface-marker edit, and the workflow-doctrine symlinks.

## Verification gate

Plan-only — no app or skill build, so the gate is documentary, not the app CDP gate:

```text
# Grounding check (read-only): confirm the cited hub contract exists and is quoted accurately
node .opencode/bin/compiled-route.cjs --hub sk-code --prompt "code work on apps/pi-remote-web" || true
```

The gate passes only when: the plan cites `sk-code/SKILL.md` §2 and the real `mode-registry.json`
schema; every hub convention (surface-packet contract, registry entry, graph-metadata identity,
surface marker, folded workflow doctrine, verification commands) maps to a concrete packet section;
the plan explains how the token library, `@ds` grammar, and editability guardrails are encoded; and
the plan states that building the mode is out of scope for this packet and lists the exact files a
follow-on build packet would create.
