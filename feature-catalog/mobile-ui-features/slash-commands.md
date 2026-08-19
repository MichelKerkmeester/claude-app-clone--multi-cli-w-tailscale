---
title: "Slash Commands"
description: "Typing a leading / in the composer opens a nonmodal autocomplete that inserts a relay-filtered canonical command; Send is the only execution path."
trigger_phrases:
  - "use a slash command"
  - "type a / command"
  - "insert a slash command"
version: 1.0.0.0
---

# Slash Commands (slash-commands)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Typing a leading / in the composer opens a nonmodal autocomplete that inserts a relay-filtered canonical command; Send is the only execution path.

Slash Commands gives the operator a discoverable, keyboard-native way to enter host commands from the remote composer. Typing `/` anchors an inline autocomplete just above the textarea, populated only from the relay-filtered host command catalog. Selecting a result inserts the canonical command text without submitting, and the explicit Send action — the only execution path — revalidates the command against current host, session, and catalog revisions before it is submitted under a one-use ticket.

Current status: shipped.

---

## 2. HOW IT WORKS

### Composer trigger and autocomplete surface

When the operator types a leading `/` in the composer textarea, a nonmodal autocomplete pops open anchored above the textarea. It is populated only from the bounded command catalog projected by the relay handler, which requests the host's commands via `get_commands` and applies the redaction allowlist so that path-like and privileged command names are removed before anything is surfaced. The operator's further keystrokes are satisfied entirely from an in-memory snapshot of that catalog with deterministic ranking — filtering never touches the network.

### Discovery-by-typing, single editing field

Rather than requiring a second editing control, the feature keeps the textarea as the only editing field and preserves focus on it across the whole flow. Virtual focus moves across the result list through `aria-activedescendant`, so arrow-key navigation is screen-reader audible and the on-screen keyboard layout (including the 390px smallest supported keyboard-open viewport) is never displaced by an extra field. Only a single editing surface is ever rendered.

### Insertion and the explicit send boundary

Selecting a result runs an insertion reducer that replaces the leading token with the canonical `/name` plus a trailing space — without submitting, requesting a ticket, or making any host call. Auto-submit is not permitted; the explicit Send action is the sole execution path. On Send, the draft is revalidated against the current host, session, and catalog revisions, and only on a passing revision-consistent check does it go to the relay under a one-use, revision-bound ticket. The send fails closed if any bound revision is stale, honoring the invariant that every ticketed mutation carries a current, one-use credential.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| `apps/pi-remote-web/src/ComposerCommandAutocomplete.tsx` | Component | Inline nonmodal command autocomplete surface |
| `apps/pi-remote-web/src/insertSlashCommand.ts` | Shared | Insertion reducer replacing the leading token with canonical command |
| `apps/pi-remote-web/src/submitSlashDraft.ts` | Shared | Explicit-send path with revision-binding validation before ticketed submit |
| `apps/pi-remote-relay/src/commands/command-service.ts` | Handler | Requests Pi get_commands and projects the bounded filtered catalog |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| `apps/pi-remote-web/tests/ComposerCommandAutocomplete.test.tsx` | component | Slash trigger, filtering, virtual focus, insertion |
| `apps/pi-remote-web/tests/submitSlashDraft.test.ts` | unit | Revision-binding validation and fail-closed send |
| `apps/pi-remote-relay/tests/commands.test.ts` | integration | Relay catalog projection and privileged-name filtering |

---

## 4. SOURCE METADATA

- Group: mobile-ui-features
- Canonical catalog source: `feature-catalog.md`
- Feature file path: `mobile-ui-features/slash-commands.md`
- Current status: shipped

Related references:

- (none in this feature set)
