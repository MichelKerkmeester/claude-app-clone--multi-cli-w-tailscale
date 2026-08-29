# Iteration 1 — Build and tooling surface

Lens: how this repository is built, run, and configured. Audience: facts `REPO RULES.md` does not already capture, that a cold agent would get wrong. Every load-bearing claim cites a path or a command. Speculative items are marked or dropped.

Read first: `REPO RULES.md` (204 lines). Section 2 already names the behaviour ladder, the presentation ladder, the `test:web | tail` trap, the one-writer `storybook-static` rule, and the bare-`tests` vitest trap. Those are not re-proposed.

Commands run (read-only): `node --version`, `npm --version`, `ls` of workspace roots / `packages/` / `extensions/` / protocol `dist/`, `npx prettier --file-info` on representative paths, `node -e` of `scripts/story-coverage-allowlist.json`. No builds, no suites, no git.

---

## 1. Workspaces: six packages, five gates

Root `package.json` workspaces (`package.json:6-11`):

```json
"workspaces": ["packages/*", "app-mobile", "app-relay", "extensions/*"]
```

On disk (`ls packages`, `ls extensions`):

| Folder | Package name | In root `typecheck` / `build` / `test` |
|---|---|---|
| `packages/pi-rpc-protocol` | `@pi-remote/pi-rpc-protocol` | yes |
| `app-relay` | `@pi-remote/relay` | yes (`test` via `app-relay/tests`) |
| `app-mobile` | `@pi-remote/web` | typecheck + build only; tests are `test:web`, not `npm test` |
| `extensions/pi-remote-approval` | `@pi-remote/approval-extension` | yes |
| `extensions/pi-remote-plan` | `@pi-remote/plan-extension` | yes |
| `extensions/pi-remote-inbound-media` | `@pi-remote/inbound-media-extension` | **no** |

`extensions/README.md:15-28` calls inbound-media one of the three host-boundary extensions. It has its own `typecheck` / `test` scripts (`extensions/pi-remote-inbound-media/package.json:8-10`) and two test files (`tests/publish.test.ts`, `tests/publisher-boundary.test.ts`).

Root scripts name five workspaces and five test directories (`package.json:13`, `22-23`):

- `typecheck` / `build`: protocol → relay → web → approval → plan. No inbound-media.
- `test`: `packages/pi-rpc-protocol/tests` `app-relay/tests` `extensions/pi-remote-approval/tests` `extensions/pi-remote-plan/tests` `release/tests`. No inbound-media, no `app-mobile/tests`.

`REPO RULES.md:42` says `npm run typecheck` is "all five workspaces". That matches the script. It does not match the workspace graph. An agent that changes inbound-media and runs the section-2 ladder gets a green typecheck, a green `npm test`, and a green `npm run build` without compiling or running that package.

`npm run release:verify` reads inbound-media **source as strings** (`scripts/release-verify.mjs:51-59`, `88-90`) and does not run its tests either.

**Belongs in REPO RULES.** The number to write is six workspaces / five gated. Name `@pi-remote/inbound-media-extension` as the omitted one, and the commands that actually cover it (`npm run typecheck -w @pi-remote/inbound-media-extension`, `npm run test -w @pi-remote/inbound-media-extension`, `npm run build -w @pi-remote/inbound-media-extension`).

Folder names are not workspace names. `npm run build -w extensions/pi-remote-approval` is the wrong `-w` token; the name is `@pi-remote/approval-extension`.

---

## 2. Node / npm: floors exist only in boot, not in the package

No `engines`, no `packageManager`, no Volta, no `.nvmrc`, no `.node-version` in the root `package.json` (confirmed: no `"engines"` / `packageManager` keys). `package-lock.json:3` is `lockfileVersion: 3`.

The only enforced floors are in `scripts/boot.mjs`:

- Node **22+** (`scripts/boot.mjs:176-177`)
- npm **10+** (`scripts/boot.mjs:180-181`)
- pi **0.84.x with patch ≥ 1** (`scripts/boot.mjs:25-26`, `153-160`, `183-187`)
- `tailscale` on PATH and connected (`scripts/boot.mjs:168`, `189-194`)

This machine measured `v26.7.0` / `11.19.0` (satisfies those floors). That is a local reading, not a pin.

An agent on Node 20 can `npm ci`, `npm run typecheck`, and `npm test` and never hear about the 22 / 10 floors. They only fail at `npm run boot`.

**Belongs in REPO RULES** as the version line: Node 22+, npm 10+, pi 0.84.1+. Point at `scripts/boot.mjs`, not at a fictional `engines` block.

Also true here and easy to miss: every workspace `package.json` sets `"type": "module"`. CommonJS `require` of repo sources fails.

---

## 3. Typecheck does not build, and consumers resolve protocol types from `dist/`

`@pi-remote/pi-rpc-protocol` exports only built files (`packages/pi-rpc-protocol/package.json:6-11`):

```json
"exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } }
```

Protocol / relay / extension `typecheck` scripts are `tsc --noEmit`. They do not write `dist/`. Root `typecheck` therefore does **not** refresh the `.d.ts` that relay, web, and the extensions import.

There are no TypeScript `references` arrays (relay `tsconfig.json` is composite but lists none). `dist/` is gitignored (`.gitignore:2`). After `npm ci` on a clean tree, protocol `dist/` is missing until `npm run build -w @pi-remote/pi-rpc-protocol`. On this tree `ls packages/pi-rpc-protocol/dist` showed a prior build (`index.d.ts` present). Changing a protocol type and running only `npm run typecheck` typechecks the protocol sources and then typechecks consumers against **stale** declarations.

`REPO RULES.md:42-46` lists `typecheck` before `build`. That order is safe only when `dist/` is already warm.

**Belongs in REPO RULES.** Build protocol (or `npm run build`) before trusting consumer typecheck. A green `typecheck` after a protocol edit is not proof the new types compiled against callers.

Web typecheck is not `tsc`. It is `svelte-kit sync && svelte-check --tsconfig ./tsconfig.json` (`app-mobile/package.json:11`). `app-mobile/tsconfig.json:2` extends `./.svelte-kit/tsconfig.json`, which is generated and gitignored (`.gitignore:3`). `ls` confirmed `app-mobile/.svelte-kit/tsconfig.json` exists on this machine; a tree without a prior `svelte-kit sync` cannot typecheck the web workspace. The generated file uses `moduleResolution: "bundler"` / `module: "esnext"` (`app-mobile/.svelte-kit/tsconfig.json:25-28`). `tsconfig.base.json` uses `NodeNext` (`tsconfig.base.json:3-4`). Later-extends wins for those keys, so the web package is bundler-resolution; every other workspace is NodeNext.

`tsconfig.base.json:5-8` also turns on `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`. Those persist into the web merge (the generated file does not turn them off). A type that is legal under a default `strict` `tsc` still fails here.

`app-mobile/tsconfig.json:8-21` `include` is a closed list: `.svelte-kit` ambient types, `vite.config.ts`, `svelte.config.js`, `src/app.d.ts`, and `src/{routes,pages,shared}/**/*.{ts,svelte}`. It omits `app-mobile/tests`, `app-mobile/.storybook`, and anything else under `src/`. TypeScript does not inherit `include` from an extended config, so the generated `../tests/**/*.ts` (`app-mobile/.svelte-kit/tsconfig.json:43-45`) is discarded. The file's own comment (`app-mobile/tsconfig.json:7`) claims svelte-check discovers every `.svelte`/`.ts` itself. That claim was not re-run. Confirmed: `tsc` scoped to this tsconfig does not see the test tree.

Relay `build` is not `tsc` alone: `tsc -p tsconfig.json && node scripts/copy-runtime-assets.mjs` (`app-relay/package.json:8`). The copier writes `dist/fixtures/` and `dist/migrations/` from `src/fixtures/` and `migrations/` (`app-relay/scripts/copy-runtime-assets.mjs:7-18`). `npm run start -w @pi-remote/relay` runs `node dist/index.js`. Typecheck-only leaves those assets missing.

---

## 4. How the app is actually run (boot ≠ `vite dev`)

`npm run boot` → `node scripts/boot.mjs` (`package.json:15`). Boot does not start Vite itself. After preflight it `spawn`s `deploy/setup-tailscale-serve.sh` (`scripts/boot.mjs:756`). That script:

1. `npm run start -w @pi-remote/relay` (`deploy/setup-tailscale-serve.sh:37`)
2. `npm run preview -w @pi-remote/web -- --host 127.0.0.1 --port "$PI_REMOTE_WEB_PORT"` (`deploy/setup-tailscale-serve.sh:39`)
3. Tailscale Serve `/` → web preview, `/api` and `/health` → relay `_serve/$SECRET/...` (`deploy/setup-tailscale-serve.sh:44-48`)
4. Attempts `tailscale funnel --https=443 off` (`deploy/setup-tailscale-serve.sh:43`). Boot's comment (`scripts/boot.mjs:421-424`) says that same Funnel-off command **clears Serve config** on this Tailscale version, so boot itself only *verifies* Funnel is off.

Defaults: relay `4310`, web preview `4173` (`scripts/boot.mjs:22-23`; `deploy/setup-tailscale-serve.sh:21-22`). Relay process env is `PI_REMOTE_PORT` (`app-relay/src/index.ts:126`, default `4310` at `:61`). Serve env uses `PI_REMOTE_RELAY_PORT`; the shell copies it (`deploy/setup-tailscale-serve.sh:26`). Starting the relay with `npm run start -w @pi-remote/relay` and only `PI_REMOTE_RELAY_PORT` set leaves the relay on 4310 via the default — unless someone exports a bad `PI_REMOTE_PORT`. Two names, one process.

`vite.config.ts` proxy (`app-mobile/vite.config.ts:9-15`, `:39-40`): `/api` (HTTP+WS) and `/health` → `http://127.0.0.1:4310`. That proxy is for **loopback** `vite dev` / `vite preview`. Tailscale Serve does not go through it; Serve sends `/api` and `/health` to the relay directly.

`preview.allowedHosts` is `['.ts.net']` plus the hostname of `PI_REMOTE_PUBLIC_ORIGIN` (`app-mobile/vite.config.ts:21-33`, `:40`). `server` (dev) has the proxy and **no** `allowedHosts`. Phone traffic via Tailscale Serve against `npm run dev` (`vite dev`) gets Vite's blocked-host response. Production boot uses `preview` on 4173, which is the configuration that allows `.ts.net`.

`npm run preview` serves the **built** `app-mobile/dist/` (adapter-static `pages`/`assets` = `dist`, `fallback: 'index.html'`, `strict: false` — `app-mobile/svelte.config.js:13-19`). Preview without `npm run build -w @pi-remote/web` is an empty or stale SPA.

**Belongs in REPO RULES** (run surface): boot = preview on 127.0.0.1:4173 + relay on 127.0.0.1:4310 + Serve; `vite dev` is not the phone path; `allowedHosts` is preview-only; Funnel stays off and boot will not turn it off for you.

---

## 5. CSP is in `svelte.config.js`, not `app.html`

`REPO RULES.md:91-94` already states the CSP effect (headless Chrome renders the app unstyled; resolve tokens as literals). It does not say where the directives live.

They are `kit.csp` hash-mode (`app-mobile/svelte.config.js:20-34`):

```js
csp: {
  mode: 'hash',
  directives: {
    'default-src': ['self'],
    'script-src': ['self'],
    'style-src': ['self'],
    'img-src': ['self', 'blob:'],
    'connect-src': ['self'],
    'object-src': ['none'],
    'frame-src': ['none'],
    'base-uri': ['none'],
  },
}
```

`app-mobile/src/app.html` has no CSP meta tag (`app-mobile/src/app.html:1-22`). Hash mode exists so SvelteKit can hash its own inline bootstrap (`app-mobile/svelte.config.js:20-21`). An agent that "adds a CSP meta to `app.html`" is editing a surface that is no longer authoritative, and can fight the hash.

Relay artifact / page responses send `content-security-policy: default-src 'none'; frame-ancestors 'none'` (`app-relay/src/http/server.ts:706`, `:2481`). That matches the REPO RULES sentence; the line numbers are the missing pointer.

`scripts/release-verify.mjs:91-104` still asserts CSP strings in `app-mobile/index.html` and `app-mobile/public/service-worker.js`. Neither path exists (`Glob` of `app-mobile/index.html` = 0; service worker is `app-mobile/static/service-worker.js`, and eslint already knows that — `eslint.config.js:69`). `readSource` throws; `runBoundaryGate` catches and treats the whole check as `[false]` (`scripts/release-verify.mjs:284-290`). The hygiene gate therefore fails closed on this tree for a stale path, not for a CSP regression.

**Belongs in REPO RULES** as the path (svelte config, not `app.html`) and as a release-verify trap if that command is named.

---

## 6. Vitest: three configs, one silent quarantine, a stale React comment

| Config | Invoked by | Include | Extra |
|---|---|---|---|
| `vitest.config.ts` | `npm test` (and bare `vitest run`) | default `*.test.*` minus excludes | `fileParallelism: false`; excludes `app-mobile/tests/**`, `.opencode/**` `.pi/**` `.claude/**` `.codex/**` `.cursor/**` `.devin/**`, `specs/context/**` (`vitest.config.ts:10-41`) |
| `vitest.web.svelte.config.ts` | `npm run test:web:svelte` | `app-mobile/tests/**/*.svelte.test.ts` | jsdom; `fileParallelism: false`; inlines bits-ui / runed / svelte-toolbelt / `@internationalized` / `@storybook/svelte` (`vitest.web.svelte.config.ts:19-40`) |
| `vitest.web.logic.config.ts` | `npm run test:web:logic` | `app-mobile/tests/**/*.test.ts` | excludes `*.svelte.test.ts` **and four quarantined files** (`vitest.web.logic.config.ts:18-47`) |

`npm run test:web` is svelte then logic (`package.json:24-26`). It is **not** a parent of `test:web:runtime`. `test:web:runtime` is a sibling that runs `node scripts/runtime-smoke-cdp.mjs` (`package.json:27`). An agent who "runs the web tests" via `test:web` never starts Chrome and never hits a real page.

Quarantine (`vitest.web.logic.config.ts:27-39`) — these files sit in `app-mobile/tests/` and look like coverage:

| File | Config's stated reason | Spot-check |
|---|---|---|
| `highlight.worker.test.ts` | worker token regex invalid under the unicode flag | still excluded; imports `highlight.worker.js` while the source is `highlight.worker.ts`. The invalid-escape claim was **not** re-run (no suite). |
| `submitSlashDraft.test.ts` | `beforeEach is not defined` | still true: `beforeEach` at line 113, import at line 15 is `afterEach, describe, expect, it, vi` only |
| `submitSlashDraftTransport.test.ts` | ticket-fetch / retry-after mismatch | not re-run |
| `relay-runtime-transport.test.ts` | same class of assertion drift | not re-run |

A green `test:web:logic` does not mean those four files pass. Adding a fifth `*.test.ts` is picked up automatically (the config says so at `vitest.web.logic.config.ts:15-17`). Putting a new file in the quarantine list, or assuming the quarantine is empty, is how coverage disappears.

`vitest.web.svelte.config.ts:4-7` still talks about a React suite on `vitest.web.config.ts` (`*.test.tsx`). That file does not exist (`Glob` = 0). There are no `.tsx` tests left (`app-mobile/tsconfig.json:7` says the migration is complete). Trust the include globs, not the header comment.

Root `fileParallelism: false` is load-bearing (`vitest.config.ts:27-35`): a pinned-Pi integration probe raced other workers and reported a stdout image leak that vanished when serialised. Turning parallelism back on reintroduces a false failure. The svelte suite's serialisation is a different reason (bits-ui rAF under jsdom, `vitest.web.svelte.config.ts:22-28`) and matches the REPO RULES flake note for `menu-plan-mode.svelte.test.ts`.

`$shared` is remapped in **both** web vitest configs to `app-mobile/src/shared` (`vitest.web.svelte.config.ts:16`, `vitest.web.logic.config.ts:42`). Kit's alias is `$shared → src/shared` (`app-mobile/svelte.config.js:8-9`). A test that imports `$shared/...` without that alias fails to resolve. Do not "simplify" the vitest alias away.

`app-mobile/tests/setup.ts` stubs `ResizeObserver`, `scrollIntoView`, and `localStorage`. bits-ui Combobox/Select throws under jsdom without the scroll stub (`app-mobile/tests/setup.ts:17-21`).

**Belongs in REPO RULES:** `test:web` ≠ `test:web:runtime`; the four quarantined logic files; do not resurrect `vitest.web.config.ts`; do not re-enable root file parallelism.

`REPO RULES.md:161-163` already covers the bare-`tests` positional. `vitest.config.ts:19-23` is the code that implements the `specs/context/**` exclude. Keep the explicit directory list anyway — it is also what drops inbound-media.

---

## 7. ESLint vs Prettier: different ignore sets, and Prettier does not format Svelte

`npm run lint` → `eslint .` (`package.json:21`). `npm run format` / `format:check` → `prettier --write .` / `prettier --check .` (`package.json:19-20`). Neither is in `REPO RULES.md` section 2. `scripts/release-verify.mjs:121-133` runs both.

ESLint ignores (`eslint.config.js:13-32`): `dist`, `node_modules`, `release/evidence`, `coverage`, `.svelte-kit`, `storybook-static`, **`specs/**`**, and the runtime-tooling symlinks.

`.prettierignore` (`./.prettierignore:1-12`): `coverage`, `dist`, `node_modules`, `release/evidence`, `package-lock.json`, and the same runtime-tooling symlinks. **No `specs/`.** No `.svelte-kit`. No `storybook-static`.

Measured with Prettier 3.9.6:

```text
npx prettier --file-info specs/007-repo-rules/spec.md
→ { "ignored": false, "inferredParser": "markdown" }

npx prettier --file-info app-mobile/src/pages/home/screen-home.svelte
→ { "ignored": false, "inferredParser": null }

npx prettier --file-info app-mobile/src/app.css
→ { "ignored": false, "inferredParser": "css" }
```

`.gitignore:33-35` force-includes `specs/**`. `specs/context/` is therefore not gitignored. `npm run format` / `format:check` will walk spec markdown and, when the five research clones are present, their markdown too. ESLint will not, because it ignores `specs/**`. An agent who "fixes format:check" by running `npm run format` rewrites spec packets and context-repo docs. That is the same class of accident `REPO RULES.md:171-173` already warns about for `git add`.

There is no `prettier-plugin-svelte` (`node -e require.resolve` → `NO prettier-plugin-svelte`). Svelte files are visible to Prettier and have no parser, so `format:check` does not fail them and `format` does not format them. ESLint **does** lint `*.svelte` (`eslint.config.js:55-67`). A green `format:check` is not a Svelte format gate.

`eslint.config.js` never imports `eslint-plugin-react-hooks` or `eslint-plugin-react-refresh`, which remain in root `package.json:46-47` beside `@testing-library/react` (`package.json:37`). Dead React leftovers. `release-verify.mjs:46` still records the React Testing Library version for the `web-tests` gate.

`REPO RULES.md:159-160` already covers the eslint baseline in `sheet-model-effort.svelte` / `+layout.svelte` and the `.svelte.ts` parse gap. Confirmed: 19 `*.svelte.ts` files under `app-mobile/` (Glob). The `**/*.{js,mjs,ts,tsx}` block (`eslint.config.js:37`) matches `foo.svelte.ts`. Judge the delta, as the rules file says.

**Belongs in REPO RULES:** `format:check` is unsafe while `specs/context/` is present; Prettier does not own `.svelte`; lint and format are release-verify gates, not the daily section-2 ladder.

---

## 8. Vite / SvelteKit details an agent will trip over

Already in REPO RULES: CSP effect; Storybook on 6006; one `storybook-static` writer.

Missing:

- **adapter-static SPA.** `dist/` + `index.html` fallback + `strict: false` (`app-mobile/svelte.config.js:13-19`). A missing route does not fail `vite build`. Tailscale Serve, not the relay, serves this build (comment at `:10-12`).
- **`pdfjs-dist` is excluded from `optimizeDeps`** (`app-mobile/vite.config.ts:37`). `worker.format` is `'es'` (`:38`). Re-including pdfjs in dep-optimisation is how the PDF worker breaks in dev.
- **`$shared` is a Kit alias**, not a TS `paths` entry in `tsconfig.base.json`. Editor/tsc resolution for the web package comes from the generated `.svelte-kit/tsconfig.json` `paths` (`app-mobile/.svelte-kit/tsconfig.json:3-9`). Vitest must repeat the alias (section 6).
- **Demo preview is double-gated.** `VITE_PI_DEMO=1` at dev-server start **and** `?demo=1` (persisted in `localStorage` as `pi-remote.demo`). Either flag alone is off (`app-mobile/src/shared/fixtures/demo.ts:4`, `:189-203`; `app-mobile/src/vite-env.d.ts:4-5`). Feature CDP scripts set the env (`scripts/runtime-smoke-cdp.mjs:71` and the same pattern in `rich-content-cdp.mjs:82`, `inbound-media-cdp.mjs:80`, `file-preview-cdp.mjs:103`, `design-system-cdp.mjs:84`). They then hit `/session/demo-session-refactor?demo=1&fixture=...`.
- **Port collision.** Those CDP scripts launch `vite dev` on **4173** (`DEV_PORT = 4173` in each), which is the **preview/boot** port, not Vite's default 5173. A live `npm run boot` / `npm run preview` and `npm run test:web:runtime` cannot share a machine. Default `npm run dev` on 5173 does not collide.
- **Storybook stories glob** (`app-mobile/.storybook/main.ts:9`): `../src/**/*.stories.@(ts|svelte)` plus `./*.stories.@(ts|svelte)` for catalog tooling kept out of `src`. Coverage (`scripts/story-coverage.mjs:46-50`) only accepts a co-located `*.stories.ts` or `*.stories.svelte` next to a `.svelte` file. The allowlist has **28** entries (`node -e` of `scripts/story-coverage-allowlist.json`). A component without a story must be added there with a reason, or `story:coverage` fails. Stale allowlist rows (component gone, or now has a story) also fail (`scripts/story-coverage.mjs:65-68`).
- **No repo-root CI.** There is no `.github/workflows` at the repository root (the only `.github` trees found were under `specs/context/`, which this pass did not read). The gates in section 2 are operator-run.

---

## 9. Playwright is undeclared and four presentation gates need it

`REPO RULES.md:50-60` already names `ui-audit.mjs`, `catalog-state-visibility.mjs`, `token-override-check.mjs`, and `npm run story:shots` (which runs `capture-screenshots.mjs`). All four `require('playwright')` and launch `chromium.launch({ headless: true, channel: 'chrome' })` (`scripts/ui-audit.mjs:54`, `:454`; `scripts/catalog-state-visibility.mjs:42`, `:114`; `scripts/token-override-check.mjs:42`, `:91`; `scripts/capture-screenshots.mjs:35`, `:339`).

`playwright` does not appear in root or `app-mobile` `package.json`, and `rg '"playwright"' package-lock.json` returned no matches. This tree still has `node_modules/playwright` at **1.62.1** (`node -e require('./node_modules/playwright/package.json')`). That is an undeclared leftover. `npm ci` will remove it. After a clean install the four gates throw `Cannot find module 'playwright'` even though Chrome is present.

`scripts/catalog-smoke-cdp.mjs` does **not** use Playwright. It shells Chrome at the hardcoded Mac path `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` only (`scripts/catalog-smoke-cdp.mjs:46-49`). No `CHROME_PATH`, no Linux candidates. The other CDP scripts search `CHROME_PATH` plus Chromium names (`scripts/runtime-smoke-cdp.mjs:46-55`).

**Belongs in REPO RULES** next to the presentation ladder: those four scripts need an installed `playwright` **and** Chrome (`channel: 'chrome'`). Catalog-smoke needs the Mac Chrome.app path (or it exits as "harness could not run"). `npm ci` does not install Playwright today.

---

## 10. Release ladder is a different command, and it is not honest on this tree

`npm run release:verify` (`package.json:32`) runs, in order (`scripts/release-verify.mjs:49-172`):

1. Three in-process boundary string-gates (including the stale `app-mobile/index.html` / `public/service-worker.js` check in §5)
2. `npm run typecheck`
3. `npm run lint`
4. `npm run format:check` ← walks `specs/` (§7)
5. `npm test`
6. `npm run test:web`
7. `npm run build -w @pi-remote/web`
8. `npm run build`
9. `node scripts/rollback-drill.mjs` (imports `app-relay/dist/release/rollback-drill.js` — `scripts/rollback-drill.mjs:11`; needs a relay build)
10. `node scripts/check-thresholds.mjs`

It does **not** run the presentation ladder, inbound-media tests, or `test:web:runtime`. Treating `release:verify` as "the whole gate" drops the entire visual class `REPO RULES.md:48-50` exists to catch, and it currently fails the hygiene boundary on missing Vite-era paths.

`scripts/README.md` is stale: it lists four entrypoints, cites `apps/pi-remote-relay/dist/` (`scripts/README.md:47`), and `../docs/release-verification.md` (`:102`). There is no root `tests/` directory (`ls tests` → No such file). Root `README.md:45` still draws `-- tests/`. `docs/` exists and contains only `design-reference/` (`ls docs`).

**Belongs in REPO RULES** as a one-liner: release-verify is a second, larger ladder; it is not a substitute for section 2; hygiene currently looks at deleted paths; format:check is in it.

---

## 11. Script inventory (`scripts/`)

Every file under `scripts/` that this pass opened. "Section 2" means `REPO RULES.md` lines 41–60.

### Already named in section 2 — keep, do not re-add

| Path | One line | In REPO RULES? |
|---|---|---|
| `scripts/token-identity.mjs` | Browser-free token resolver; `verify` is the 39-golden gate | Yes (also §3) |
| `scripts/story-coverage.mjs` | Every renderable `.svelte` under `app-mobile/src` has a co-located story, allowlist of 28, stale rows fail | Yes (`npm run story:coverage`) |
| `scripts/catalog-smoke-cdp.mjs` | Serves `storybook-static`, renders every story light+dark via Mac Chrome CDP | Yes |
| `scripts/catalog-state-visibility.mjs` | Playwright: invisible state / inert control / impossible age; pinned clock | Yes |
| `scripts/token-override-check.mjs` | Playwright: playground override survives navigation to another story | Yes |
| `scripts/css-comment-integrity.mjs` | Swallowed CSS rules + leaked markup comments in `.svelte`/`.css` | Yes |
| `scripts/ui-audit.mjs` | Playwright: contrast/clip/collision/touch, both themes; writes `/ui-audit.json` (gitignored) | Yes |
| `scripts/capture-screenshots.mjs` | Playwright: whole-archive recapture into `screenshots/` at 402×874, pinned clock | Yes (`story:shots`) |

Add to those rows only the Playwright-undeclared and catalog-smoke-Mac-Chrome facts from §9.

### Gates / runners that belong in REPO RULES (not in section 2 today)

| Path | One line | Why it belongs |
|---|---|---|
| `scripts/boot.mjs` | Preflight (Node 22 / npm 10 / pi 0.84.1+ / tailscale), `npm run build`, then `deploy/setup-tailscale-serve.sh`; supervises until Ctrl-C | This is how the app is **run**. Ports, version floors, Funnel-verify-only, `--full-access` vs `--enable-mutation`. |
| `scripts/runtime-smoke-cdp.mjs` | Starts `vite dev` on **4173** with `VITE_PI_DEMO=1`, Chrome CDP over home/session/review/inbox | Wired as `test:web:runtime`. Agents will assume `test:web` includes it. Collides with boot/preview. |
| `scripts/release-verify.mjs` | Whole-gate runner: 3 boundary string-checks + typecheck + lint + format:check + both test lanes + two builds + rollback + thresholds | Different ladder. Stale hygiene paths. Runs format:check. |
| `scripts/rollback-drill.mjs` | Prints JSON from `app-relay/dist/release/rollback-drill.js` | Needs relay `dist/`. npm: `rollback:drill`. |
| `scripts/check-thresholds.mjs` | Machine measurements vs `release/thresholds.json` | npm: `release:thresholds`. |
| `scripts/check-rollout.mjs` | Stage readiness vs latest `release/evidence` + optional operator evidence | npm: `release:rollout`. Errors if verify has never been run. |
| `scripts/verify-full-access-runtime.mjs` | Black-box full-access pi RPC probe; restores state; fail-closed on leak patterns | npm: `verify:runtime-boundary`. Not a daily gate; needs a live `pi`. |

### Data files next to gates (mention only as attachments)

| Path | One line | In REPO RULES? |
|---|---|---|
| `scripts/story-coverage-allowlist.json` | 28 allowed story-less components, each with a reason | No standalone row. Already implied by `story:coverage`. Do not paste the 28 paths into REPO RULES. |
| `scripts/README.md` | Claims four release entrypoints and `apps/pi-remote-relay/` | No. It is stale. Do not cite it as authority. |

### Explicitly do **not** belong in REPO RULES

Omission is a decision.

| Path | One line | Why omit |
|---|---|---|
| `scripts/new-story.mjs` | Writes a CSF3 stub next to a `.svelte` file | Generator. Useful, not a gate. An agent that needs a story will find `npm run story:new` from `package.json`. |
| `scripts/comment-only-check.mjs` | `git diff` of `app-mobile/src` must be `//` comments or blanks; block comments rejected | Workflow-specific (comment-only CSS/docs pass). Not a default ladder step. Calls `git`. |
| `scripts/rich-content-cdp.mjs` | Chrome CDP capture of named rich-content fixtures at **exactly 390px**; screenshot **must be outside the repo** (`:648-650`) | Feature baseline, required CLI flags, out-of-repo output. Not a cold-start gate. |
| `scripts/inbound-media-cdp.mjs` | Chrome CDP of inbound-image states + privacy curtain; writes a PNG | Same class. `release-verify` already string-checks this file. |
| `scripts/file-preview-cdp.mjs` | Chrome CDP of the diff-viewer dialog at a stated viewport | Same class. |
| `scripts/design-system-cdp.mjs` | Chrome CDP 390px demo baseline for pixel/token regression | Same class. Token authority is already `token-identity.mjs`. |
| `scripts/naming/naming-rules.mjs` | Shared kebab / reserved-SvelteKit grammar | Library for the rename campaign, not a gate. |
| `scripts/naming/scan-naming.mjs` | Lists in-scope files whose names violate the grammar | Campaign scanner. Not an npm script. Conventions live in the surface skill. |
| `scripts/naming/scan-comments.mjs` | Counts comment-grammar properties for packet deltas | Campaign metric. |
| `scripts/naming/scan-folder-docs.mjs` | Folder README/CODE.md coverage | Campaign metric. |
| `scripts/naming/scan-skill-references.mjs` | Resolves backticked skill-doc paths against the app tree | Useful in the skill-docs packet; not a repo boot/build fact. |
| `scripts/naming/build-manifest.mjs` | Emits a rename manifest | Mutator input. |
| `scripts/naming/build-kind-overlay.mjs` | Emits the kind-prefix overlay | Mutator input. |
| `scripts/naming/apply-manifest.mjs` | Moves files and rewrites specifiers from the manifest | Mutator. `--apply` rewrites the tree. Lists a root `tests/` that does not exist (`:40`). |
| `scripts/naming/rewrite-stale-paths.mjs` | Git-rename-chain backstop rewrite | Mutator. Calls `git`. |
| `scripts/naming/verify-comment-only.mjs` | Comment-only proof by stripping comments | Duplicate of `comment-only-check.mjs` with a different algorithm. Campaign leftover. |
| `scripts/naming/rename-manifest.json` | Data for the applier | Data, not a command. |
| `scripts/naming/kind-prefixes.json` | Data for the overlay | Data. |
| `scripts/queue/next-node.mjs` | Picks the next node in `specs/004-sveltekit-spa-migration` by completion % and `validate.sh` | Hardcoded foreign path: `/Users/michelkerkmeester/MEGA/Development/Code_Environment/Public/.opencode/skills/system-spec-kit/scripts/spec/validate.sh` (`:23-24`). Closed migration queue. Will mislead on this packet. |
| `scripts/queue/graph.json` | Queue graph for that migration | Data for the above. |

---

## 12. Recommended REPO RULES additions (this lens only)

Copy-ready facts, each already verified above. Not generic advice. Not already in the file.

1. **Workspaces.** Six npm workspaces. Root `typecheck` / `build` / `test` cover five. `@pi-remote/inbound-media-extension` is the sixth; its tests live at `extensions/pi-remote-inbound-media/tests/` and are not in `npm test`. Use the `@pi-remote/*` package name with `-w`, not the folder name.

2. **Versions.** Node 22+, npm 10+, pi 0.84.1+. Enforced only by `scripts/boot.mjs`. There is no `engines` field.

3. **Typecheck vs dist.** Protocol types are `dist/index.d.ts`. `npm run typecheck` is `--noEmit` and will not refresh them. Build protocol (or the whole `npm run build`) before trusting consumer typecheck. Web typecheck needs `svelte-kit sync` (`.svelte-kit/tsconfig.json` is generated). Relay `start` needs `copy-runtime-assets.mjs`, not just `tsc`.

4. **Run.** `npm run boot` → preview on `127.0.0.1:4173` + relay on `127.0.0.1:4310` + tailnet Serve. `vite dev` has no `.ts.net` `allowedHosts`. Preview does. Do not Funnel-off from boot. Relay env is `PI_REMOTE_PORT`; serve env is `PI_REMOTE_RELAY_PORT`.

5. **CSP path.** Directives live in `app-mobile/svelte.config.js` `kit.csp` (hash mode). Not in `app.html`.

6. **Web test lanes.** `test:web` = svelte + logic only. `test:web:runtime` is a sibling, starts `vite dev` on 4173, needs Chrome, collides with boot. Logic lane silently skips four files listed in `vitest.web.logic.config.ts`.

7. **Format.** `prettier --check .` formats spec markdown (`specs/` is not in `.prettierignore`) and does not format `.svelte` (no plugin). Do not run it as a cleanup while `specs/context/` is present. `eslint` ignores `specs/**`.

8. **Playwright.** Four presentation gates `require('playwright')` with `channel: 'chrome'`. Playwright is not in `package.json` / `package-lock.json`. `npm ci` drops a leftover install. Catalog-smoke uses only `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.

9. **Release-verify.** A second ladder (lint, format:check, both test lanes, two builds, rollback, thresholds). Not a substitute for the presentation ladder. Hygiene still reads `app-mobile/index.html` and `app-mobile/public/service-worker.js`, which are gone.

10. **Demo.** Offline fixtures require `VITE_PI_DEMO=1` **and** `?demo=1`.

---

## 13. Already covered — do not fold in again

From `REPO RULES.md`, confirmed still true and not repeated as new findings:

- Behaviour commands `typecheck` / `test:web` / `test` / `build` (`package.json:13-23`)
- Presentation commands and the `test:web \| tail` exit-status trap
- `storybook-static` single-writer; archive clock pin in three scripts (`FIXED_CLOCK` / `2026-08-28T12:00:00.000Z` in capture, ui-audit, catalog-state-visibility)
- Token-identity as token authority; one `app.css`; class grammar
- CSP *effect* (unstyled headless Chrome)
- Bare `vitest` positional vs `specs/context`
- eslint standing baseline and `.svelte.ts` parse gap
- `auth.test.ts` / `menu-plan-mode` flakes

---

## Status

- Read: `REPO RULES.md`, root and six workspace `package.json`s, the three vitest configs, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.gitignore`, `tsconfig.base.json`, all workspace `tsconfig.json`s, `app-mobile/vite.config.ts`, `app-mobile/svelte.config.js`, `app-mobile/src/app.html`, `app-mobile/.storybook/main.ts`, `app-mobile/.svelte-kit/tsconfig.json`, `deploy/setup-tailscale-serve.sh`, every `scripts/*.mjs` header and the naming/queue tree, `scripts/release-verify.mjs` gate list, `scripts/README.md`, root `README.md`.
- Ran: `node --version` → `v26.7.0`; `npm --version` → `11.19.0`; `ls` of workspaces / protocol dist / playwright; `npx prettier --file-info` on css / svelte / spec markdown; allowlist length → 28.
- Did not run: builds, test suites, `release:verify`, boot, or any git command.
- Did not read: `specs/context/**`.
- Inferred (would need a suite run to confirm): whether the highlight-worker quarantine reason still fails at import; whether svelte-check typechecks `app-mobile/tests` despite the narrow `include`.
