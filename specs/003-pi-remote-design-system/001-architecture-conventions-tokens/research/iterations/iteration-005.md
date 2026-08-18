# Iteration 005 — Lens: Polaris role-segmented token naming + tiers

**Pass goal:** extract the *naming* discipline behind a production design system's tokens.

## Findings

- Polaris is Shopify's "unified UI framework built on web components", and every token surface
  (color, spacing, typography, motion) lives under a dedicated `Tokens` section ([C5a]).
- Its token model is **role-segmented**: colours are named for the *role* a token plays — text,
  icon, border, surface/background, action — so applied usage (`text`, `bg-`, `border`) is implied
  by the name, and base-level values back staged aliases ([C5b], carried: the live token page
  rendered as a client-rendered nav shell). This decouples *what it is* from *what it is used for*.

## Synthesis for Pi Remote

- The app already proves the value of **role** naming: `--canvas` / `--ink` / `--line` /
  `--accent-*` / `--control-border` say *role*, not *px value*. Formalizing a **primitive** layer
  (`--pi-*` = the frozen values) below those roles is exactly Polaris's base→alias staging:
  primitives hold the value; roles name the use (Decision 3).
- **Component tier** (`--model-sheet-*`, `--slash-*`) is the Polaris analogue of component-scoped
  tokens — but today those duplicate the role tier as raw values across three theme blocks. The
  decision: keep the component *names*, re-point them to **semantic** roles so they inherit theme
  and contrast (Decision 3, Layer 3).

## Rejected alternative

Role-free raw token names (`--white`, `--dark-gray`) used directly in rules. Rejected: any theme
remap would need re-naming, and the contrast manifest would have nothing role-like to pair.

## Confirmed by
- [C5a] <https://polaris.shopify.com/tokens>, <https://polaris.shopify.com/tokens/color>
  (fetched): Polaris = Shopify's unified UI framework built on web components; Tokens section.
- [C5b] role-segmented naming / base→alias→component tiers: carried as Polaris's documented token
  model (live pages client-rendered, nav shell).
- Repo: `src/style.css` role-token block (29-92) and component triples (4076-4116, 6343-6382).