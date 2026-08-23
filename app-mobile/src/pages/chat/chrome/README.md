# Chat chrome — composer & controls

The interactive controls that frame the conversation: the message composer, the command palette, the runtime/mode strip, and the plan-mode flow. This is the most **focus- and accessibility-sensitive** sub-area in the app — several of these were hand-built to keep keyboard, IME, and screen-reader behaviour exactly right.

## What lives here

- **Composer:** `SessionComposer` (the textarea + send), `ComposerCommandAutocomplete` (slash-command autocomplete that keeps focus in the textarea), `ComposerTools`.
- **Command palette:** `CommandPalette`, `CommandOption`.
- **Runtime & mode:** `RuntimeStrip` (host-backed readout + controls), `RuntimeModeAnnouncer` (live-region announcements), `PlanModeButton`, `PlanModeMenu`, `ModelEffortSheet`, `EffortRadioGroup`.
- **Plan flow:** `PlanReadyCard`, `PlanReviewSheet`, `LeavePlanSheet`.
- **Header & todos:** `SessionHeader`, `TodoPanel`.
- **Logic:** `plan-mode-presentation.ts`.

## Why it's shaped this way

- **Focus is a contract, not a detail.** The composer autocomplete deliberately does *not* steal focus (virtual focus via `aria-activedescendant`); `LeavePlanSheet` restores focus explicitly on close. Breaking these breaks screen-reader and IME use on a phone.
- **Sheets hide the background from assistive tech.** Anything opening over the chat must keep background controls out of the accessibility tree — the a11y parity work that was hard-won here.

Structure and the focus/a11y do-nots are in `CODE.md`.
