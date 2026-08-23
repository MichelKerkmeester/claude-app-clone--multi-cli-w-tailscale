# `fixtures/` — structure & logic

Editor map. For *what/why*, see `README.md`.

## Shape

- **`demo.ts`** — the only file here, and it carries three things:
  - **Fixture descriptors** — `DEMO_DIFF_FIXTURE`, `DEMO_ARTIFACT_STATES_FIXTURE`,
    `DEMO_INBOUND_MEDIA_FIXTURE`, `DEMO_INBOUND_IMAGE_CARD_FIXTURE`, `DEMO_ASK_QUESTION_FIXTURE`
    and `DEMO_TODO_FIXTURE`.
  - **Demo blocks and helpers** — `DEMO_RICH_CONTENT_BLOCKS`, `DEMO_ARTIFACT_BLOCKS`,
    `DEMO_IMAGE_PDF_BLOCKS`, `isDemoMode`, `demoPostJson`, `demoArtifactBytes`,
    `demoInboundArtifactResource` and `demoSocket`.
  - **The preview gate** — the stable `DEMO_IDENTITY`, and the build-flag plus query check that
    keeps fake auth and relay behaviour inside local preview mode.

## Do-not

- **Don't import fixtures into a production authority path without the double gate.** `isDemoMode` must remain false unless both the build flag and explicit client opt-in are present.
- **Don't call the real relay from demo helpers.** `demoPostJson`, `demoArtifactBytes`, `demoInboundArtifactResource`, and `demoSocket` are in-memory preview behavior.
- **Don't use demo identity as enrollment proof.** `DEMO_IDENTITY` is a local preview identity, not a device credential.
- **Don't make fixture data look like persisted runtime state.** Keep demo resources and responses tab-local; production cache and host snapshots remain the authority boundaries.
- **Don't add only happy-path data.** Preserve the fixture states that exercise redaction, unavailable resources, media lifecycle, question outcomes, todo projections, and artifact readers.
