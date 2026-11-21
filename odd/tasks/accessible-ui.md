---
status: in-progress
owner: Dean-koro
---

# Accessible oral-first interface

Branch `feat/accessible-ui`, delivered by one PR to `main`. Runner: `npm test` (jest-expo, `@testing-library/react-native`). Art direction: "Voz primero" (`src/theme.ts`).

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

- **S7 (cards, issue #4 step 3):** "After `POST /api/read`, call `fetchEasyRead(facts)` and render one `FactCard` per `EasyReadCard`. If it fails, keep the objective 3 facts in Spanish."
- **S8 (Maya on the card):** "`SpanishText(plainSpanish)` always on top; `MayaText(maya)` plus `MACHINE_TRANSLATION_LABEL` when the saved language (`loadLanguage()`) is Maaya t'aan, `maya` is not null and `mayaStatus` is `machine-unreviewed`. Drop the duplicated `CardFact` type and label constant." The read screen follows a language change made in `/idioma` without a restart.
- **S9 (two voices):** "`PlayButton` gets `onPress` + `status` and is driven by `useCardVoice()`: `speakSpanish(plainSpanish)` and `playMaya(maya)`; `MACHINE_VOICE_LABEL` ("Voz automática, sin revisar") next to the Maya button; show `loading`, and `voice-unavailable` in plain words; never autoplay." Plain words for the failure: "No se pudo oír en maya. Escuche en español." One `useCardVoice()` per screen, so only one voice plays at a time across cards (PR #3 review, W1). The picker's Maya sample uses the Maya voice.
- **S10 (confirmation sheet):** "La hoja de confirmación del agente, que lea la propuesta en voz alta y muestre la lista y la fecha en grande con los botones "Sí, recuérdeme" y "No, gracias"." From issue #4: "`fetchPlan(facts)` → read the proposal aloud; show the checklist and the reminder date and place; one big "Sí, recuérdeme" and one "No, gracias" → `useReminder().schedule(plan, 'yes' | 'no')`; show `useReminder().message` when permission is denied." From the objective 7 contract: "With `reminder: null`, show the checklist only and no "Sí, recuérdeme" button. Never call `schedule(plan, 'yes')` without the tap." Assumption (audience rule "Audio plays only from a large "Escuchar" button, never by itself"): the proposal is read aloud from its own "Escuchar" button, not automatically. "Sí, recuérdeme" is disabled while the reminder is `asking` (PR #5 review, W2).

## Tasks

- [x] T1 (S1, S2), inline: `PlayButton` "Escuchar"; role, label, language and 48 dp pinned for every button.
- [x] T2 (S3), inline: `SpanishText` (`es-MX`) and `MayaText` (`yua`, labeled "Traducción automática, sin revisar").
- [x] T3 (S4), inline: `/idioma` picker (Español, Maaya t'aan, each with a sample), remembered choice, "Cambiar idioma" on the read screen, no `TextInput` anywhere.
- [x] T4 (S5), inline: `FactCard` with icon, sentence, "Escuchar" and "¿De dónde salió?"; used by the read screen.
- [ ] T5 (S6), inline (guard done; device check pending): guard against `allowFontScaling={false}`; 200% font scale checked on one Android and one iOS phone (device, pending).

- [x] T6 (S8, S9), inline: `PlayButton` takes `status`, `onPress` and `onStop`; `FactCard` takes `EasyReadCard`, the language and screen voice controls; the picker samples use `useCardVoice()`.
- [x] T7 (S7, S8), inline: the read screen calls `fetchEasyRead`, falls back to Spanish facts and follows the saved language.
- [x] T8 (S10), inline: `ConfirmationSheet` with `fetchPlan`, "Escuchar", the checklist, the date and place in large type, "Sí, recuérdeme" and "No, gracias".
- [ ] T9 (step 4), inline: phone checklist in `odd/phone-checks.md`; results go into each objective's Log.

Route: every task inline; no Writer trigger (one dependent behavior chain, units under ~100 lines each).

## Log

- **L1 (user, verbatim):** "Lee AGENTS.md (sobre todo "Parallel work") y odd/objectives.md. Reclama el objetivo 6, "Accessible oral-first interface" (odd/tasks/accessible-ui.md): pon status in-progress y owner Dean-koro, haz commit y push a main. Luego crea la rama feat/accessible-ui. La dirección de arte ya está elegida: "Voz primero" (está en el Log de team-setup.md). Sigue ODD con tests primero, deja el Log actualizado y entrega por pull request a main. No empieces otros objetivos."
- **L2 (claim):** `5daa91a chore(odd): claim accessible-ui` pushed to `main`. Note: the Log of `team-setup.md` is empty; "Voz primero" is recorded in the header of `src/theme.ts` and in commit c9da445. That unblocks S6.
- **L3 (scope decisions):**
  - The picker does not gate the first screen ("Nothing before value"): Español is the default, and a visible "Cambiar idioma" button opens `/idioma`. The choice is remembered with `expo-sqlite/kv-store` (included in Expo Go, https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/).
  - Maya fact text does not exist yet (objective 4). This objective ships `MayaText` (S3) for objective 4 to use. The Maya sample in the picker speaks only the language's name.
  - The "Escuchar" button uses `expo-speech` with `es-MX`. Objective 5 (voice) can swap the voice source later.
  - The box in "¿De dónde salió?" is not shown: the app client (`src/screens/read/api-client.ts`, objective 3) drops `box`. The quote is shown.
  - Card icons use `expo-symbols` at 48 dp. ARASAAC pictograms and the agent confirmation sheet are left for objectives 8 and 7.
  - `src/screens/read/read-screen.tsx` (objective 3) changes only so it uses the new `FactCard` and shows "Cambiar idioma". Its reviewed tests stay untouched and green.
- **L4 (RED):** ecb8f57. 6 new suites fail because their modules are missing; the 66 earlier tests stay green. `src/__tests__/oral-first.test.ts` (no `TextInput`, no `allowFontScaling={false}`) passes from the start, because it guards rules the code already keeps. `expo-sqlite` was added with `npx expo install` (`package.json`, `app.json` plugin).
- **L5 (GREEN):** `PlayButton`, `SpanishText`/`MayaText`, `FactCard` (icon by kind prefix, 48 dp `theme.size.pictogram`), `language-store` (Zod enum, Spanish fallback on an unknown value or a read error), `/idioma` picker (filled option with a check icon, so color is not the only signal; `accessibilityState.selected`). The read screen uses `FactCard` and a "Cambiar idioma" button. It uses `router.push`, because `<Link asChild>` sets `role="link"` and overrides the button role. 95/95 tests, `tsc --noEmit`, `expo lint` and `expo-doctor` (20/20) all clean. Existing read-screen tests were not edited.
- **L6 (pending device checks):** S3: how VoiceOver and TalkBack pronounce `yua` text. S6: 200% system font on one Android and one iOS phone with no clipping (read screen, fact cards, `/idioma`). S4: the choice survives an app restart in Expo Go. T5 stays open until then.
- **Handoff:** objective 4 renders Maya with `MayaText` next to `SpanishText`. Objective 5 can replace `speakAloud` in `src/components/play-button.tsx`. To show the box in "¿De dónde salió?", objective 3's client must keep `box` and pass the photo URI.
- **L7 (independent verifier, item 5):** no blockers. S1, S2, S4, S5 met; S3 met in code; S6 partial (device). Dependency check passed: `expo-sqlite` 58.0.18 for SDK 58, in Expo Go, and `getItemSync`/`setItemSync` are in `build/Storage.d.ts`. Follow-ups taken: each language option is tagged in its own language (`es-MX`, `yua`), and a failed save still goes back. New regression tests are in `language-screen-follow-ups.test.tsx` (RED 3 failing, then GREEN). 99/99 tests, tsc and lint clean. Left as notes: the saved language is not used yet (objective 4), and `Speech.stop()` is not awaited before `speak`.
- **L8 (native review):** the user granted review of 5daa91a..ba21901 (lenses risk, readability, reliability; lineage `review-8874202ab27021af`). The result was approved and acknowledged (authority burned). PR: https://github.com/carrapido/tramites-lectura-facil/pull/2. Non-blocking findings, left as later work:
  - R3-choose-back-without-stack: if `/idioma` is opened with no screen behind it, `router.back()` has nowhere to go. Use the `BackButton` fallback, which replaces with `/`.
  - R3-failed-save-choice-lost: the comment says the choice lasts until the app closes, but nothing keeps it in memory. R2-misleading-save-failure-comment flags the same comment.
  - R3-speech-stop-race: `Speech.stop()` is not awaited before `speak`.
  - R2-speechTag-misnamed: `speechTag` is an accessibility language tag; rename it.
  - R2-duplicated-fact-type: `CardFact` repeats `ReadFact`.
  - R2-dead-test-conditional: `buttons.test.tsx:35` has a conditional that is never needed.
  - R3-cambiar-idioma-press-untested: no test presses "Cambiar idioma" and checks the route.
  - R3-saved-language-unused: the saved language is not used yet (objective 4).
- **Next step:** the team reviews PR #2. Then run the device checks in L6 and close T5. Status stays in-progress until then.
- **L9 (user, 2026-11-21, verbatim excerpt):** "Rebasea mi PR #2 sobre main actualizado (integrando los cambios de app.json y package.json, incluyendo expo-sqlite), resuelve los 3 arreglos pendientes en PR #2 (el valor fijo de borde que debe moverse a theme.ts y los otros dos ajustes indicados en el review/issue #4), ejecuta `npm ci && npm test` para confirmar que toda la suite pasa en verde y avisa cuando esté listo para aprobación e integración."
- **L10 (rebase and review fixes):**
  - PRs #1, #3 and #5 were reviewed and merged into `main` with merge commits. #3 and #5 conflicted only in their own claim front-matter, and the branch version was kept.
  - `feat/accessible-ui` was rebased on `134adc6`, and `app.json` keeps both `"expo-audio"` and `"expo-sqlite"`.
  - Fix 1: after a choice, `/idioma` goes back, or replaces with `/` when nothing is behind it.
  - Fix 2: `theme.border` has `hairline: 1` and `strong: 2`, and no app source hard-codes a `borderWidth` any more. This also covers `secondary-button`, `fact-card` and `home-screen`.
  - Fix 3: the `app.json` conflict.
  - Also fixed: the save-failure comment, which was flagged as misleading.
  - RED: 3 failing. GREEN: `npm ci && npm test` passes 234/234, and `tsc --noEmit` and `expo lint` are clean.
- **L11 (user, 2026-11-21, verbatim excerpt):** "Crea una rama nueva desde main actualizado para la integración (por ejemplo `feat/integrate-reading-screen`) y, siguiendo ODD con tests primero, conecta la pantalla de lectura (`FactCard` y el botón "Escuchar") con todo lo que ya está hecho: Tarjetas en español y Maya (`fetchEasyRead`) y el guardado de idioma ("Maaya t'aan"). El botón "Escuchar" con las dos voces (`useCardVoice`). La hoja de confirmación del agente, que lea la propuesta en voz alta y muestre la lista y la fecha en grande con los botones "Sí, recuérdeme" y "No, gracias". Prepara y guía la lista de verificación para las pruebas manuales en el teléfono [...]. No toques los archivos del objetivo 8 (pitch / demo en vivo)."
- **L12 (route):** `feat/integrate-reading-screen` is stacked on `feat/accessible-ui`, because `FactCard`, `PlayButton` and the language store exist only in PR #2 until it merges. Its PR targets `feat/accessible-ui` and is retargeted to `main` after #2. The `PlayButton` and `FactCard` tests change, because S9 and S8 change their props. That is a spec change requested in issue #4, not an edit to make a RED test pass.
- **L13 (T6, T7):**
  - RED: two commits, the first with 14 failures and the second with 5.
  - GREEN: 252/252, and `tsc` and `expo lint` are clean.
  - `useScreenVoice` (`src/screens/voice/use-screen-voice.ts`) wraps one `useCardVoice()` per screen, keyed per button. Only the last button pressed shows "Parar".
  - The language store keeps a choice in memory only when the phone could not store it, and notifies `useLanguage()` subscribers.
  - `jest.setup.ts` stubs `expo-audio`, which cannot load under Jest (`package.json` `jest.setupFiles`).
  - The objective 3 read-screen tests got `stop` in their `expo-speech` mocks, because the screen voice stops speech on unmount. No assertion changed; objective 3 is already GREEN.
  - Two of my own new tests had wrong doubles (a storage that never returns what it saved, and a speech mock set before the photo). Both doubles were fixed; no expectation was weakened.
- **L14 (T8):**
  - RED: 2 suites failing. GREEN: 267/267, and `tsc` and `expo lint` are clean.
  - `src/screens/read/confirmation-sheet.tsx`:
    - `PlanSheet` calls `useReminder()` and is remounted for each photo.
    - The sheet shows the proposal sentence, "Escuchar" (key `plan`, which reads the proposal, items, date, place and "¿Quiere que le recuerde?"), and each checklist item with "¿De dónde salió?".
    - The date is in title type, for example "30 de noviembre de 2026". The place is shown too.
    - "Sí, recuérdeme" is an `ActionButton` that is disabled while `asking`. "No, gracias" is next to it.
    - After an answer, "Listo. Le avisaremos un día antes y el mismo día." or "Está bien. No guardamos ningún aviso."
  - `fetchPlan(facts)` starts with `fetchEasyRead`, and the sheet appears after the cards. A failure says "No pudimos preparar la lista. Sus tarjetas siguen aquí."
  - `SourceQuote` moved to `src/components/source-quote.tsx`.
