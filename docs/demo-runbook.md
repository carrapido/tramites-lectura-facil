# Demo runbook (live pitch, 2026-11-21 12:00 UTC-5)

Script: `docs/pitch.md`. Spec: `odd/tasks/easyread-pitch.md`.

## Roles

- **Presenter (P):** talks, never touches the phone.
- **Operator (O):** holds the phone, mirrors it to the projector, runs the laptop.
- One laptop runs the server; only that laptop's credentials are used.

## Readiness gate (decide at T-60)

The full demo needs issue #4 step 3 (cards in both languages, "Escuchar" with both voices, confirmation sheet) merged into `main`.

| State at T-60 | Demo to run |
|---|---|
| #4 step 3 merged and checked on the demo phone | Full script in `docs/pitch.md` |
| Not merged | Objective 3 screen (photo → fact cards → "¿De dónde salió?"), then O plays one recorded Maya voice from the laptop (`afplay fixtures/demo/voice/<file>.wav`). P drops the agent part (3-minute cut). |

## T-60 minutes

1. `git pull && npm ci && npm test` on the demo laptop. Everything green.
2. Credentials: `gcloud auth application-default print-access-token >/dev/null && echo ok`, and `.env.local` holds `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION` and `GOOGLE_CLOUD_QUOTA_PROJECT` (without the quota project, Translation answers `PERMISSION_DENIED`).
3. Live check: `npm start` (or `npx expo start`), then `npm run demo:warmup`. Expect five `OK` lines.
4. If the recordings in `fixtures/demo/` are missing or stale: stop the server, run `npm run demo:record`, then `npm run demo:warmup`, then play every card's Maya voice once in the app. Commit the new recordings only if they hold fictitious data.
5. Replay check: stop the server, run `npm run demo:replay`, then `npm run demo:warmup`. Expect five `OK … replayed` lines.
6. Print `fixtures/aviso-ficticio.jpg` (category `tramite`) and `fixtures/invitacion-ficticia.jpg` (category `reunion`) on paper, about letter size, and test a photo of each under the stage light. Replay mode answers with the notice for any photo, so the invitation beat in the script is live-only.
7. Screen mirroring: iPhone with QuickTime (cable, File → New Movie Recording → choose the phone); Android with `scrcpy` over USB. Test it on the projector.

## T-15 minutes

- Phone: charged above 80%, brightness high, Do Not Disturb on but allowing Expo Go notifications, volume at maximum, silent switch off (iPhone speech is muted in silent mode).
- Expo Go open on the app, language set to Español, notification permission not yet granted (so the "Sí" step shows the prompt), no previous reminders scheduled.
- Laptop: server running in the mode you chose, sleep disabled (`caffeinate -d` on macOS), on power.
- Network decision, in this order:
  1. Phone and laptop on the same event Wi-Fi: open `/diagnostico` and see "conectado".
  2. Not connected: turn on the phone's hotspot, connect the laptop to it, restart the server.
  3. Still not connected: `npx expo start --tunnel` (add `DEMO_REPLAY=1` in front if Google is also unreachable).
  4. No route to Google at all: `npm run demo:replay`. The app shows "Respuesta grabada"; the presenter says so out loud.

## Reset between rehearsals

- Language: "Cambiar idioma" → "Español".
- Reminders: cancel them from the app (`cancelAll`), or remove Expo Go notifications in the phone settings.
- Reload: shake the phone → Reload, or press `r` in the server terminal.

## Never on stage

- A real CURP, INE or personal document.
- Saying the Maya is reviewed, that the app is official, or that it gives legal advice.
- `--tunnel` without need: it exposes the laptop's paid Google routes to anyone with the URL.
