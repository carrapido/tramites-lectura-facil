# Trámites en lectura fácil

A phone photo of a Mexican government notice becomes short fact cards in plain Spanish and Yucatec Maya, with voice. Hackathon project. Specs and progress live in [`odd/`](odd/objectives.md).

## Run it in 15 minutes (macOS or Linux)

1. Node 24 (`nvm use` reads `.nvmrc`) and the Expo Go app on your phone.
2. Google credentials on the laptop, no API keys:
   ```sh
   gcloud auth application-default login
   ```
   https://cloud.google.com/docs/authentication/provide-credentials-adc
3. Install and test:
   ```sh
   npm ci
   npm test
   ```
4. Configure: `cp .env.example .env.local`, set your project, and add `GOOGLE_CLOUD_QUOTA_PROJECT=<same project>`. User ADC has no quota project, and Translation answers `PERMISSION_DENIED` without it (https://cloud.google.com/docs/authentication/adc-troubleshooting/user-creds). `.env.local` is git-ignored; never prefix these variables with `EXPO_PUBLIC_` (Expo inlines those into the app bundle, https://docs.expo.dev/guides/environment-variables/).
5. Start the dev server and scan the QR code with Expo Go:
   ```sh
   npx expo start
   ```
   The screen shows "conectado" when the phone reaches `GET /api/health` on the laptop. "Probar Google" calls `GET /api/smoke` (Gemini + Cloud Translation).

## Read a notice

1. Run `npx expo start` and open the app in Expo Go.
2. Tap "Tome una foto de su papel". The phone says why it needs the camera, then asks for permission.
3. Photograph a fictitious notice (try `fixtures/aviso-ficticio.jpg`). The laptop sends it to Gemini through `POST /api/read`.
4. Each card shows one short fact. "¿De dónde salió?" reveals the literal quote of the notice. Facts without a literal quote are never shown.

"Ver conexión" opens the diagnostics screen (`/diagnostico`).

## When the event Wi-Fi blocks phone-to-laptop traffic

- Tunnel: `npx expo start --tunnel` (https://docs.expo.dev/versions/v58.0.0/more/expo-cli/).
- Or turn on the phone's hotspot, connect the laptop to it and run `npx expo start` again.

## Layout

- `src/app/`: routes only. API routes (`+api.ts`) under `src/app/api/` run on the laptop dev server.
- `src/screens/`, `src/components/`: UI.
- `src/tramites/`: domain and ports. No Google, Expo or React Native imports (an architecture test enforces it).
- `src/server/`: Google adapters and composition, server-only.

## How Expo maps to what you know

- `+api.ts` files compare to Next.js route handlers: export `GET(request)` and return a `Response`.
- Expo Router compares to the Next.js App Router: files in `src/app/` are screens, `_layout.tsx` is a layout.
- Metro is the bundler (like webpack/Turbopack); it also bundles the API routes for the dev server.
- Expo Go is a prebuilt native runtime from the store that downloads and runs our JS bundle. Only native modules bundled in Expo Go work.

## Credits

unslop skill in `.agents/skills/unslop` by Damir Sokolovsky, CC BY 4.0 (https://github.com/heydamir/unslop).

## Teammate setup

`npm run setup` checks Node 24 and gcloud ADC, writes a git-ignored local env file from your gcloud project, then runs `npm ci` and `npm test`.
