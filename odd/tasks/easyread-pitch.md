---
status: in-progress
owner: carrapido
---

# Easy-read pitch and live demo

## Goal

A 5-minute pitch with a live demo on a phone that cannot be sunk by the event Wi-Fi or a Google outage, and that never overclaims.

## Scope

Pitch script with timings, demo runbook (pre-flight, roles, fallbacks, reset), a record-and-replay demo mode on the laptop server, and a warm-up script.

## Out of scope

Slides design, video production, EAS builds, new product features.

## Specs

- **S1:** `docs/pitch.md` is a spoken script in Spanish for 5 minutes, with timed sections (problem 45 s, live demo 2 min 30 s, how it works 45 s, close 60 s) and marked cuts that bring it to 3 minutes. Every number or claim cites its source; anything unverified is removed, not guessed.
- **S2:** the script states the limits honestly: Maya text and voice are machine output "sin revisar", the app is not legal advice, the demo notice is fictitious, and the team has no native Maya speaker yet.
- **S3:** `docs/demo-runbook.md` lists the pre-flight checks at T-60 and T-15 minutes, who holds the phone and who talks, the exact commands, the network fallbacks in order (same Wi-Fi, phone hotspot, `npx expo start --tunnel`, replay mode), and how to reset the phone between runs.
- **S4:** with `DEMO_RECORD=1`, the laptop server saves what each Google adapter returns for the fictitious notice (notice reading, Maya translations, Maya audio, agent plan) under `fixtures/demo/`; the recordings hold only fictitious data and are committed.
- **S5:** with `DEMO_REPLAY=1`, the server answers `/api/read`, `/api/easy-read`, `/api/voice` and `/api/plan` from those recordings without calling Google, through the same domain rules (traceability, 15 words, "Sí" confirmation); JSON responses carry `"replayed": true` and the voice response the header `X-Demo-Replay: 1`, so the app can show "Respuesta grabada". A request the recordings do not cover returns 404 `{ ok: false, reason: "not-recorded" }`, never invented data. Neither variable starts with `EXPO_PUBLIC_`.
- **S6:** `npm run demo:warmup` checks the dev server, calls the four routes once with the fixture and prints one line per route with status and time, exiting non-zero if any fails.
- **S7:** a full rehearsal on the laptop: record once live, then replay with the network to Google unused, and the four routes answer the same content.

## Log

- **L1 (user decisions):** pitch length "5 minutos"; fallback "Respuestas pregrabadas, etiquetadas". Specs S1–S7 are the agent's draft from those decisions and the team prompt (live pitch 2026-11-21 12:00 UTC-5; harm mitigations stay visible).
