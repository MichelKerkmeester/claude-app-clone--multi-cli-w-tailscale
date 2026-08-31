---
title: "Rule: The verification ladder"
description: "Behaviour gates cannot see whether a surface renders correctly, so presentation has its own ladder. Four of those gates depend on a package declared nowhere, and one is macOS-only."
trigger_phrases:
  - "run the gates"
  - "verification ladder"
  - "npm run typecheck"
  - "npm run build"
  - "claim complete"
  - "is it done"
  - "whole tree coverage"
  - "typecheck is green"
  - "playwright"
  - "Cannot find module 'playwright'"
  - "catalog smoke"
  - "ui-audit"
  - "token identity"
  - "story coverage"
  - "npm ci removed it"
  - "boot.mjs"
  - "node version floor"
importance_tier: important
contextType: reference
version: 1.0.0.0
---

# Rule: The verification ladder

> Routed from [`REPO RULES.md`](../REPO%20RULES.md). Load it before running the gates, and before claiming any work here is complete.
> Expands `AGENTS.md`, never overrides it — where they appear to disagree, `AGENTS.md` wins and this file is wrong. Say so.

## Fires when

- Running any gate in this repository.
- Claiming work is complete, or quoting a gate result.
- Reading a green typecheck as coverage.

## The rule

**Behaviour gates and presentation gates are separate ladders, and neither one's green covers the other.**

---

## 1. BEHAVIOUR GATES

From the repository root:

```bash
npm run typecheck                    # five of six workspaces — see below
npm run test:web                     # both web suites: svelte, then logic
npm test                             # protocol, relay, extensions, release
npm run build                        # dependency order
```

**`npm run typecheck` covers five workspaces; the repository has six.** `@pi-remote/inbound-media-extension` is not in the chain and is never typechecked. **Do not read a green typecheck as whole-tree coverage.**

---

## 2. PRESENTATION GATES

The behaviour gates cannot see whether a surface renders correctly. A component mounts, passes its tests, and still shows text in its own background colour.

```bash
node scripts/token-identity.mjs verify app-mobile/src/app.css
npm run story:coverage
npm run build-storybook -w @pi-remote/web
node scripts/catalog-smoke-cdp.mjs
node scripts/catalog-state-visibility.mjs
node scripts/token-override-check.mjs
node scripts/css-comment-integrity.mjs
node scripts/ui-audit.mjs
npm run story:shots
```

---

## 3. THE UNDECLARED DEPENDENCY

**Four gates need `playwright`, and it is declared nowhere.** `ui-audit.mjs`, `catalog-state-visibility.mjs`, `token-override-check.mjs` and `capture-screenshots.mjs` all require it and launch with `channel: 'chrome'`.

It appears in neither `package.json` nor `package-lock.json`; the copy in `node_modules` is an undeclared leftover. **`npm ci` removes it, and those four then throw `Cannot find module 'playwright'`** even with Chrome installed. Reinstall it explicitly after a clean install.

**The failure this prevents:** reading four missing gates as four passing ones after a clean install.

---

## 4. TWO MORE ENVIRONMENT FLOORS

**`catalog-smoke-cdp.mjs` is macOS-only.** It shells Chrome at the hardcoded `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` with no `CHROME_PATH` fallback, and exits as a harness failure rather than a story failure when that path is absent.

**Node and npm floors live in `scripts/boot.mjs`, not `package.json`.** There is no `engines` field, no `packageManager`, no `.nvmrc`. `boot.mjs` requires Node 22+, npm 10+, a pinned `pi`, and `tailscale` on PATH — so a tree that installs cleanly can still fail to boot.

---

## 5. SELF-CHECK

- [ ] Both ladders ran; neither one's result was quoted as covering the other.
- [ ] The typecheck result was not described as whole-tree.
- [ ] After any clean install, `playwright` was reinstalled before trusting its four gates.
- [ ] A harness failure was distinguished from a story failure.
