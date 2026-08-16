<!-- SPECKIT_TEMPLATE_SOURCE: spec-core + level2-verify + level3-arch | v2.2 -->
<!-- SPECKIT_LEVEL: 3 -->

# Phase 3 — Keyboard and thumb navigation, accessibility, visual, and iPhone/PWA release hardening

## Summary

This phase hardens the completed ask-question card for keyboard, touch, screen-reader, responsive, visual, internationalization, reduced-motion, installed-PWA, and release-boundary behavior. It preserves the established host-authoritative mutation state machine while adding card-local navigation, semantic announcements, responsive safeguards, and final boundary verification. The release remains ink-on-parchment and content-free outside authorized volatile render and host handoff paths.

## Problem & Goal

A functionally correct card can still fail on a phone or assistive technology if focus is stolen, touch targets are too small, translated text clips, the virtual keyboard obscures the form, or state is communicated only through color. The installed PWA and service-worker boundaries also require an explicit review so question content cannot enter caches, notifications, or authority paths.

The goal is to make the card dependable at a true 390px viewport and under keyboard, touch-only, screen-reader, RTL, large-text, browser-zoom, dark-theme, and reduced-motion conditions without changing the non-optimistic mutation contract or expanding phone authority.

## Scope

### In scope

- Card-local roving focus with Home, End, Up, Down, Tab, Shift+Tab, Enter, Space, IME-aware Return, and focus restoration.
- Helpful initial focus that never interrupts active typing or unrelated controls.
- Semantic roles, labels, descriptions, `aria-pressed`, live regions, safe errors, and final answered announcements.
- Minimum 44px touch targets, responsive spacing, logical CSS properties, natural wrapping, and virtual-keyboard-safe scrolling.
- WCAG AA contrast in light and dark themes using only bone/parchment, carbon ink, and clay tokens.
- Selected-row communication through carbon ink, text, and glyph rather than color alone.
- Large text, browser zoom, long translations, RTL, reduced motion, installed-PWA, cache, push, and extension-boundary checks.
- Final protocol, relay, web, accessibility, visual, device, and security verification.

### Out of scope

- New answer authority, ticket semantics, host lifecycle rules, or extension mutation paths.
- A modal, page-level focus trap, route change, full-screen scrim, or bottom-sheet interaction.
- New colors, font families, durable question storage, content-bearing push, or phone-owned plan-mode authority.
- Replacing the ordinary session composer or changing unrelated transcript behavior.
- Optimistic acceptance, automatic retry, or reuse of consumed tickets.

## User-facing behavior + states

The card remains an inline transcript section with the same `presented`, `selecting`, `submitting`, `answered-immutable`, `error`, `expired`, and `superseded` meanings established in Phase 2. Keyboard focus moves only among declared answer stops; touch can complete the answer without hidden gestures, hover, drag, or long press.

Arrival may focus the first option only when the operator is not typing or using an unrelated control. Option buttons expose their selected state through `aria-pressed`, the card and option collection are labelled, and polite live regions announce arrival, submission, errors, and the final answered state without exposing tickets, digests, revisions, or diagnostics.

Prompt, labels, descriptions, input, errors, and status wrap under large text, browser zoom, long translations, and RTL. The virtual keyboard keeps the focused field and submit action visible. Reduced motion removes progress and collapse movement while preserving status, focus, and completion feedback.

Light and dark themes retain the existing parchment, carbon, clay, Inter, and Source Serif 4 contracts. Selected rows use carbon ink and explicit text or glyphs; the card never introduces accent colors or uses color as the sole state signal.

## Acceptance criteria

- The declared option/input/submit keyboard sequence works without unexpectedly leaving the card, and IME composition prevents unintended Return submission.
- Touch targets are at least 44px and remain usable at a true 390px viewport.
- Initial focus is helpful and never steals focus from active typing or unrelated controls.
- `aria-pressed`, labels, descriptions, status, errors, and live announcements expose the complete safe state without secrets.
- Light and dark themes use only bone/parchment, carbon ink, and clay accent tokens with WCAG AA contrast.
- Selected rows use carbon ink, text, and glyphs rather than clay fill or color alone.
- Large text, browser zoom, long translations, and RTL layouts do not clip content or reorder answer meaning.
- Reduced motion removes movement while preserving status, focus, and completion feedback.
- The virtual keyboard never obscures the focused field or submit action.
- The PWA remains read-only by default, uses content-free push, cannot mint authority or enable `--full-access`, and all final protocol, relay, web, accessibility, visual, and device gates pass.
