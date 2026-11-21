# Lectura fácil para cualquier papel

An inclusion tool for quick, concise reading: a phone photo of any paper (an official notice, a meeting invitation, a prescription, a note) is classified by its context (`tramite`, `reunion`, `salud`, `nota`, `otro`) and becomes short fact cards in plain Spanish and Yucatec Maya, with voice. Hackathon project. Specs and progress live in [`odd/`](odd/objectives.md).

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

## Read a paper

Any paper works: an official notice, a meeting or event invitation, a prescription or medical appointment, a school or community note, or anything else.

1. Run `npx expo start` and open the app in Expo Go.
2. Tap "Tome una foto de su papel". The phone says why it needs the camera, then asks for permission.
3. Photograph a fictitious paper (try `fixtures/aviso-ficticio.jpg`). The laptop sends it to Gemini through `POST /api/read`.
4. Each card shows one short fact. "¿De dónde salió?" reveals the literal quote of the paper. Facts without a literal quote are never shown.

`POST /api/read` contract:

- Request: `{ "imageBase64": string, "mimeType": "image/jpeg" | "image/png" }`, about 4 MB of image at most. Anything else returns 400 `invalid-request`.
- Response: `{ "ok": true, "category": Category, "facts": Fact[], "replayed"?: true }`, with 1 to 7 traceable facts `{ kind, text, sourceQuote, box? }`. `replayed` appears only in demo replay.
- `category` is one of `tramite`, `reunion`, `salud`, `nota`, `otro`, chosen by Gemini from the paper's context. Anything else, or no value, becomes `otro`. The list, Spanish names and notices live in `src/tramites/category.ts`.
- An unreadable photo returns 422 `unreadable`.

"Ver conexión" opens the diagnostics screen (`/diagnostico`).

## Easy-read cards

`POST /api/easy-read` turns the facts from `POST /api/read` into cards in plain Spanish and Yucatec Maya.

- Request: `{ "facts": Fact[] }`, 1 to 7 facts `{ kind, text, sourceQuote, box? }`. Anything else returns 400 `invalid-request`.
- Response: `{ "ok": true, "cards": [{ kind, plainSpanish, maya, mayaStatus, sourceQuote, box? }] }`.
- A fact text above 15 words is rewritten once by Gemini. Maya comes from one Cloud Translation call (es → yua) for all cards.
- `mayaStatus` is `machine-unreviewed`, or `unavailable` with `maya: null` when Translation fails; plain Spanish is always delivered.
- Missing ADC returns 503 `adc-missing`; a bad environment returns 500 `config-missing`.
- The app calls it through `fetchEasyRead(facts)` in `src/screens/easy-read-client.ts`.
- Label rule: every Maya sentence is shown under its Spanish, with the label "Traducción automática, sin revisar" (`MACHINE_TRANSLATION_LABEL` in `src/tramites/easy-read.ts`).

## Card voice

Plain Spanish is spoken by the phone (`expo-speech`, `es-MX`, offline). Yucatec Maya comes from the laptop.

- `GET /api/voice?text=<maya>`: `text` is trimmed, 1 to 300 characters; anything else returns 400 `invalid-request`.
- Success: 200 `audio/wav` with `Cache-Control: private, max-age=86400`. Missing ADC returns 503 `adc-missing`, a bad environment 500 `config-missing`, other Gemini failures 502 `upstream-failed`.
- Model `gemini-3.8-flash-lite-tts` on location `global`, voice `Kore`. Headerless PCM from older models gets a WAV header on the server.
- Cache: by SHA-256 of the text, in memory and in `.cache/voice/<sha256>.wav` (git-ignored). A dev-server restart reuses it; the same text is never paid twice.
- Cost: about $0.009 per minute of audio (L2 in `odd/tasks/voice-output.md`). Yucatec Maya is not an officially supported TTS language: pronunciation is an experiment.
- The app calls `useCardVoice()` in `src/screens/voice/use-card-voice.ts`. Nothing plays without a tap; one voice at a time.
- Label rule: every Maya play button shows "Voz automática, sin revisar" (`MACHINE_VOICE_LABEL`).

## Agentic checklist and reminder

`POST /api/plan` turns the facts from `POST /api/read` into a proposal for any kind of paper: what to bring or do, and when to go. Nothing happens on the phone until the person taps "Sí".

- Request: `{ "facts": Fact[], "category"?: Category }`, 1 to 7 facts, the same shape as `POST /api/easy-read`. `category` is the one `POST /api/read` returned; without it the laptop uses `otro`. Anything else returns 400 `invalid-request`.
- Response: `{ "ok": true, "plan": { "checklist": [{ text, sourceQuote }], "reminder": { dueDate, title, place?, sourceQuote } | null } }`.
- Gemini (`gemini-3.8-flash`) answers only through two declared tools, `create_checklist` and `schedule_reminder` (function calling mode `ANY`). The instruction names the category; it proposes a reminder only when the paper has a date, and checklist items only when the paper asks to bring or do something.
- Traceability: every item and the reminder keep a `sourceQuote` found literally in the facts' quotes; the rest is dropped. At most 6 items, 15 words or fewer each.
- The reminder's `dueDate` must be a real date, today or later in Mexico's `America/Merida` time zone; otherwise `reminder` is `null` and the checklist stays.
- Missing ADC returns 503 `adc-missing`, a bad environment 500 `config-missing`, other Gemini failures 502 `upstream-failed`.
- The app calls `fetchPlan(facts, category)` in `src/screens/plan/plan-client.ts` and `useReminder()` in `src/screens/plan/use-reminder.ts`.
- The "Sí" rule: `useReminder().schedule(plan, 'yes')` is the only path to a notification. Any other answer schedules nothing (`executePlan` in `src/tramites/plan.ts`).
- After "Sí", the phone says "Para avisarle antes de la fecha, necesitamos permiso.", then asks for notification permission. Denied shows "No podemos avisarle. Active las notificaciones en Ajustes."
- Two local notifications titled "Recordatorio" (`expo-notifications`, they work in Expo Go): the day before at 10:00 and the due day at 08:00, phone time. Moments already past are skipped. Push notifications are not used.

## When the event Wi-Fi blocks phone-to-laptop traffic

- Tunnel: `npx expo start --tunnel` (https://docs.expo.dev/versions/v58.0.0/more/expo-cli/).
- Or turn on the phone's hotspot, connect the laptop to it and run `npx expo start` again.

## Demo mode

A live pitch must survive bad Wi-Fi or a Google outage. The laptop server can record Google's answers for the fictitious notice once, then replay them.

1. Record: `npm run demo:record` (`DEMO_RECORD=1 expo start`). Read `fixtures/aviso-ficticio.jpg`, open its cards, play each Maya voice and open the plan. Each Google answer is saved under `fixtures/demo/`: `notice-reading.json`, `translations.json`, `plain-spanish.json`, `plan.json` and `voice/<sha256>.wav`. Only fictitious data; the folder is committed.
2. Replay: `npm run demo:replay` (`DEMO_REPLAY=1 expo start`). `/api/read`, `/api/easy-read`, `/api/voice` and `/api/plan` answer from `fixtures/demo/` without Google clients or ADC. The domain rules still run: traceability, 15 words, the "Sí" confirmation.
3. Warm-up: `npm run demo:warmup` (or `npm run demo:warmup -- http://<laptop-ip>:8081`, or `DEMO_BASE_URL`). It checks `/api/health`, calls the four routes once with the fixture and prints `OK|FAIL <route> <status> <ms>ms [replayed]`. It exits 1 if any route fails.

- Label rule: replayed JSON answers carry `"replayed": true` and the replayed voice the header `X-Demo-Replay: 1`. The app shows "Respuesta grabada" (`REPLAY_LABEL` in `src/screens/demo-label.ts`) next to them.
- A request the recordings do not cover returns 404 `{ "ok": false, "reason": "not-recorded" }`. The server never invents an answer.
- With both variables on, replay wins and the server logs a warning. Neither variable starts with `EXPO_PUBLIC_`, so they never reach the app.
- Replay serves the one recorded notice reading for any photo. In replay a Maya translation that was never recorded shows as unavailable, like a Translation failure.

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

`npm run setup` checks Node 24 and gcloud ADC, writes a git-ignored local env file from your gcloud project, then runs `npm ci` and `npm test`. With no project it stops before writing: run `gcloud config set project <id>` or `export GOOGLE_CLOUD_PROJECT=<id>`. A local env file with an empty project is regenerated; a filled one is never overwritten.
