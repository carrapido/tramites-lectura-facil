---
status: in-progress
---

# Repository and walking skeleton

## Goal

One repository every teammate (macOS and Linux, separate Claude accounts) clones and runs in 15 minutes: an Expo app opened in Expo Go whose API routes call Gemini and Cloud Translation on the laptop, with tests running.

## Scope

`npx create-expo-app@latest` on Expo SDK 58 with Expo Router; Node 24; Jest through `jest-expo` 58 and `@testing-library/react-native` 14; Zod 4 at boundaries; packages added with `npx expo install`. Layout: `src/app/` routes only (API routes under `src/app/api/`), `src/screens/`, `src/components/`, `src/tramites/` (domain and ports), `src/server/` (adapters and composition, server-only). Committed CLAUDE.md and `.claude/settings.json`; `.gitattributes` with LF; `.env.example`.

## Out of scope

CI beyond lint and test; EAS builds and EAS Hosting (stretch: ADC does not exist on EAS Hosting, it would need a service account key).

## Specs

- **S1:** A fresh clone, `npm ci` and `npm test` pass on macOS and on Linux with Node 24.
- **S2:** `src/tramites/` imports nothing from `@google/*`, `expo*`, `react-native` or `src/server/`; an architecture test fails otherwise.
- **S3:** `.env.example` lists `GOOGLE_CLOUD_PROJECT` and `GOOGLE_CLOUD_LOCATION`; `.env*.local` is git-ignored; no variable that holds Google configuration starts with `EXPO_PUBLIC_`, because Expo inlines those into the app bundle.
- **S4:** `GET /api/health` returns 200 with `{ "ok": true }` without calling any external service, and the app shows "conectado" in Expo Go on a phone on the same network as the laptop.
- **S5:** The README gives the fallback when the event Wi-Fi blocks phone-to-laptop traffic: `npx expo start --tunnel`, or the phone's hotspot.
- **S6:** `GET /api/smoke` calls Gemini through Agent Platform with Application Default Credentials and Cloud Translation `translateText` (es → yua), and returns both results to the app in Expo Go on a phone. Fallback if `@google-cloud/translate` (a gRPC client) fails inside the Metro server bundle: call Translation v3 over REST with a token from `google-auth-library`, already proven with curl; last resort, a small Express server on the laptop.

## Log
