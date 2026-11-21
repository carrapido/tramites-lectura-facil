---
status: done
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
- **S5:** with `DEMO_REPLAY=1`, the server answers `/api/read`, `/api/easy-read`, `/api/voice` and `/api/plan` from those recordings without calling Google, through the same domain rules (traceability, 15 words, "Sí" confirmation); JSON responses carry `"replayed": true` and the voice response the header `X-Demo-Replay: 1`, so the app can show "Respuesta grabada". A request the recordings do not cover returns 404 `{ ok: false, reason: "not-recorded" }`, never invented data; the one exception is a Maya translation that was not recorded, which degrades to `maya: null`, `mayaStatus: "unavailable"` with the Spanish still delivered (objective 4 S5). Neither variable starts with `EXPO_PUBLIC_`.
- **S6:** `npm run demo:warmup` checks the dev server, calls the four routes once with the fixture and prints one line per route with status and time, exiting non-zero if any fails.
- **S7:** a full rehearsal on the laptop: record once live, then replay with the network to Google unused, and the four routes answer the same content.

## Log

- **L1 (user decisions):** pitch length "5 minutos"; fallback "Respuestas pregrabadas, etiquetadas". Specs S1–S7 are the agent's draft from those decisions and the team prompt (live pitch 2026-11-21 12:00 UTC-5; harm mitigations stay visible).
- **L2 (RED, S4–S6):** new tests in `src/server/__tests__/demo-{mode,recordings,replay-handlers,composition,warmup}.test.ts`, `src/__tests__/demo-mode.test.ts`, `src/screens/__tests__/demo-label.test.ts`, plus new `it` cases in `src/screens/__tests__/easy-read-client.test.ts` and `src/screens/plan/__tests__/plan-client.test.ts`. Against minimal stubs: 9 suites, 77 tests, 49 failed (assertions: 502 instead of 404 `not-recorded`, missing `replayed`, empty recordings folder, empty warm-up lines), 28 passed (pre-existing client cases and guards that already hold, such as no `EXPO_PUBLIC_DEMO` in `src/` and `fixtures/demo/` not git-ignored).
- **L3 (GREEN, S4–S6):** `npx jest` 32 suites, 254 tests passed; `npx tsc --noEmit` and `npx expo lint` clean. Server: `src/server/demo-mode.ts` (Zod-read `DEMO_RECORD`/`DEMO_REPLAY`, replay wins with a warning), `demo-recordings.ts` (store under `fixtures/demo/`, Zod on read, atomic sorted writes, one write at a time), `demo-recording.ts` (recording decorators), `demo-replay.ts` (replay adapters, `NotRecordedError` from `not-recorded-error.ts`), `composition.ts` (`byDemoMode` picks real/recording/replay in one place; replay builds no Google client and needs no ADC; demo modes use a memory-only voice cache so `.cache/voice` never hides a voice). `googleFailureResponse` maps `NotRecordedError` to 404 `not-recorded` for every route. Routes pass `isReplay()`; `/api/read`, `/api/easy-read`, `/api/plan` add `replayed: true`, `/api/voice` adds `X-Demo-Replay: 1`. Warm-up: `scripts/demo-warmup.ts` (`npm run demo:warmup`, Node 24 type stripping). Known gap: in replay an unrecorded Maya translation degrades to `mayaStatus: "unavailable"` (200), not 404, because `toEasyReadCards` swallows translator errors other than missing credentials; making it 404 needs a domain change in `src/tramites/easy-read.ts`.
- **Contract for objective 6 (accessible UI, Dean):** show `REPLAY_LABEL` ("Respuesta grabada", `src/screens/demo-label.ts`) visibly on any screen that shows a response with `replayed: true`, or a voice whose response has `X-Demo-Replay: 1` (`isReplayedVoice(headers)`). `fetchEasyRead` and `fetchPlan` already pass `replayed` through and map `not-recorded` as a reason. `src/screens/read/api-client.ts` (UI-owned, not edited here) must also pass `replayed` through its Zod schema.
- **L4 (S5 amended):** in replay, an unrecorded Maya translation degrades to `mayaStatus: "unavailable"` (Spanish still delivered) instead of 404, because objective 4's domain rule always delivers Spanish and never fails a card on a translation error. No data is invented either way. S5 text updated.
- **L5 (S7 rehearsal on the laptop):** record: `npm run demo:record` + `npm run demo:warmup` → 5 `OK` (read 10.4 s, easy-read 1.8 s, voice 3.3 s, plan 4.5 s), then the remaining 4 card voices → `fixtures/demo/` = `notice-reading.json`, `translations.json`, `plan.json`, 5 `voice/*.wav` (2.3 MB, fictitious notice only). Replay: `npm run demo:replay` without `GOOGLE_CLOUD_QUOTA_PROJECT` + `npm run demo:warmup` → 5 `OK … replayed`; 5 facts as recorded; 5 cards `machine-unreviewed`; voice header `X-Demo-Replay: 1`; an unrecorded voice text → 404 `not-recorded`; no Google host or credential error in the server log.
- **L6 (docs):** `docs/pitch.md` (Spanish, 5 min, timed, 3-minute cuts, 4 INEGI sources quoted verbatim, honest limits) and `docs/demo-runbook.md` (roles, readiness gate on issue #4 step 3, T-60 and T-15 checks, network ladder, reset, never-on-stage list). Statistics researched on INEGI pages; ENDUTIH has no 60+ group, so the script uses the 75+ figure; no ENADIS figure about trámites exists, so none is claimed.
- **L7 (pending, humans):** a timed rehearsal out loud with the phone mirrored; the full demo depends on issue #4 step 3 (Dean-koro) being merged, otherwise the runbook's reduced demo applies; `src/screens/read/api-client.ts` must pass `replayed` through and the UI must show "Respuesta grabada" (contract above, for Dean).
- **L8:** the UI shows 'Respuesta grabada' (fix/replay-label). `src/screens/read/api-client.ts` keeps `replayed`; the read screen shows `REPLAY_LABEL` above the cards when the read, easy-read or plan answer is replayed, and `not-recorded` says "Esta parte no está grabada. Use el modo en vivo." The voice header (`X-Demo-Replay`) is not shown in the UI yet.
