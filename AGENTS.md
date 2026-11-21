This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Project rules (easy-read trámites)

Feature documents live in `odd/` (ODD). Read `odd/objectives.md` and the current `odd/tasks/<feature>.md` until `## Log` before any work. SDD (`/sdd-*`) is retired.

### Audience rules: zero friction, inclusive

Sources: Nielsen's 10 heuristics (https://www.nngroup.com/articles/ten-usability-heuristics/), WCAG 2.2 applied to native apps (https://www.w3.org/TR/WCAG22/).

- Nothing before value. No account, login, onboarding carousel, tutorial or text input.
- Ask for camera permission only when the person taps the photo button, with a one-sentence spoken reason first.
- One primary action per screen. Each action is a single tap on a button that shows an icon and a word.
- Never require a swipe, long press, double tap or pinch. Back is always visible.
- Targets: at least 48×48 dp, about 64 dp for primary actions, at least 8 dp between targets (https://developer.android.com/guide/topics/ui/accessibility/apps).
- Body text at least 20 sp, system font, scales with the system setting. Never set `allowFontScaling={false}`.
- No timing: no toasts that vanish, no auto-advance. Audio plays only from a large "Escuchar" button, never by itself. Respect reduce-motion.
- Copy: sentences of 15 words or fewer, concrete verbs, "usted". "Tome una foto de su papel", not "Escanear documento".
- Errors say what happened and the next step: "No se ve bien la foto. Tome otra con más luz."
- Languages by their own names: "Español" and "Maaya t'aan", each with an audio sample. The choice is remembered and changed with a visible "Cambiar idioma" button.
- No stereotypes: no grecas, papel picado or embroidery patterns standing in for "indigenous", unless the team chooses it with community input.
- Pictograms from ARASAAC, with attribution (https://arasaac.org/terms-of-use).
- Not an official app: no gob.mx guinda-and-gold palette, seals or logos.
- Harm mitigations that always stay:
  - Plain Spanish is always shown beside the Maya.
  - Every Maya sentence is labeled "Traducción automática, sin revisar".
  - Every fact keeps its source quote.
  - Show the notice "Esto no es asesoría legal".
  - Fictitious documents only; never a real CURP or INE.
  - The agent acts only after a big "Sí" confirmation.

### Visual rules (unslop overrides)

unslop (Damir Sokolovsky, CC BY 4.0, https://github.com/heydamir/unslop) lives in `.agents/skills/unslop`. Where it conflicts with the rules above, the rules above win:

- dp/sp, 4 dp grid. Icons in buttons at least 24 dp, always next to a word; card pictograms at least 48 dp; one line set (`expo-symbols` from the template).
- Weights 400–600, 600 for button labels. Body contrast at least 7:1; color is never the only signal.
- Phone portrait, one column. No exclamation marks, greeting headlines, hype words or "con IA". No chat bubbles, shimmer skeletons, glassmorphism or blur.
- Colors, spacing, type sizes and radii live only in `src/theme.ts`; a unit test enforces 7:1 body contrast.

### Engineering rules

- **Tests first.** Write tests from the specs and show them RED before implementation. After the team reviews RED tests, do not edit those files until GREEN; if one looks wrong, stop and report. New regression tests are allowed.
- **Readable code.** Stepdown order (entry point first, callees below). One level of abstraction per function, intention-revealing names, module helpers as function declarations. No `any`, chained `as`, `!`, `@ts-ignore` or disabled lint rules.
- **Quality.** SonarQube-clean (low cognitive complexity, no duplication). No `@deprecated` APIs. Zod 4 at boundaries: request bodies, Gemini output, environment.
- **Hexagonal layout.** `src/tramites/` holds domain and ports only (no `@google/*`, `expo*`, `react-native`, `src/server/`; enforced by `src/__tests__/architecture.test.ts`). Adapters and composition live in `src/server/`, server-only. Routes in `src/app/` stay thin.
- **Citations.** Cite the official doc page for every API or setting you introduce: in code comments only where the reason is not obvious, always in your report. Use version-pinned Expo pages (`https://docs.expo.dev/versions/v58.0.0/...`).
- **Commits.** Conventional Commits. No Co-Authored-By, "Generated with" or other AI attribution. Never commit secrets or `.env*.local`.
- **Communication.** Speak to the team in Mexican Spanish with "tú". Code, comments, docs and commits in English. One question at a time.
