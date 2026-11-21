---
status: in-progress
owner: Dean-koro
---

# Accessible oral-first interface

## Goal

A native app usable without reading: audio first, one idea per card, large targets, the source of every fact one tap away, and full support for TalkBack and VoiceOver.

## Scope

Language picker, photo capture, fact cards, "¿De dónde salió?" view, confirmation sheet for the agent; WCAG 2.2 AA applied to native apps; React Native accessibility props; ARASAAC pictograms for the demo with attribution.

## Out of scope

Accounts, login, form filling, web build.

## Specs

- **S1:** Every interactive element has `accessibilityRole` and an `accessibilityLabel` in the language of its text; component tests query by role and label with `@testing-library/react-native`.
- **S2:** Every interactive element measures at least 48×48 dp (style `minWidth`/`minHeight`, or `hitSlop` for icons), checked in component tests.
- **S3:** Maya text sets `accessibilityLanguage="yua"` and Spanish text `accessibilityLanguage="es-MX"` (iOS only, per https://reactnative.dev/docs/accessibility). How VoiceOver and TalkBack pronounce Maya is checked on a device and noted here; the app's own play button is the reliable path.
- **S4:** The language picker shows one large option per language with an audio sample button; the app has no text input anywhere.
- **S5:** Each fact card shows an icon, one sentence, a play button and "¿De dónde salió?", which reveals the source quote (and the box when available).
- **S6:** Text scales with the system font size up to 200% without clipping, checked on one Android and one iOS phone; body text contrast is at least 7:1. Blocker: the team's art direction before any visual work.

## Log
