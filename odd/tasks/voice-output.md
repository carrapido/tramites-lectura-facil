---
status: in-progress
owner: carrapido
---

# Voice for every card

## Goal

Every easy-read card can be heard: plain Spanish with the phone's own voice, Yucatec Maya with Gemini TTS generated on the laptop, only after the person taps "Escuchar".

## Scope

Server route `GET /api/voice` (Gemini TTS through Agent Platform with ADC), an audio cache on the laptop, and a client voice module the UI (objective 6) calls. No screen changes: objective 6 (Dean-koro) owns the screens and the "Escuchar" button.

## Out of scope

Human-recorded audio, Nahuatl or other languages, streaming audio, screens.

## Specs

- **S1:** Spanish is spoken on the phone with `expo-speech` (`language: "es-MX"`), free and without network; Maya is never sent to the phone's voice.
- **S2:** `GET /api/voice?text=<maya>` returns `audio/wav` synthesized by `gemini-3.8-flash-lite-tts` (location `global`, voice `Kore`, slow and clear style). The text is validated with Zod (1 to 300 characters); anything else returns 400 `{ ok: false, reason: "invalid-request" }`. Missing ADC returns 503 `adc-missing`, missing config 500 `config-missing`, other failures 502 `upstream-failed`.
- **S3:** The same text is never paid for twice: audio is cached by the SHA-256 of the text, in memory and in the git-ignored `.cache/voice/` folder, so a dev-server restart reuses it.
- **S4:** The response is always a playable WAV: if Gemini returns headerless 16-bit PCM (24 kHz mono), the server adds the WAV header; a test checks the RIFF header and the data size.
- **S5:** Audio never plays by itself: the client module only plays when its `play` function is called from a tap, stops any other voice first, and respects one voice at a time. Maya audio is labeled "Voz automática, sin revisar" (exported constant for the UI).
- **S6:** The client module `src/screens/voice/` exposes `useCardVoice()` with `speakSpanish(text)`, `playMaya(text)`, `stop()` and a status (`idle`, `loading`, `playing`, `error`), using `expo-audio` (included in Expo Go, https://docs.expo.dev/versions/v58.0.0/sdk/audio/) for Maya; a failed Maya voice gives the reason and never blocks the Spanish voice.
- **S7:** One real smoke call synthesizes one fixture Maya sentence and the WAV plays on a laptop; a second call for the same text is served from the cache without calling Gemini. Whether the Maya pronunciation is understandable is checked by ear and noted in the Log.

## Log

- **L1 (user decision):** Voice option chosen by the user: "Teléfono para español + Gemini TTS para Maya". Specs S1–S7 are the agent's draft from that decision and the team prompt's rules (audio only from a large "Escuchar" button; label machine output).
- **L2 (research):** Gemini 3.8 TTS models are GA on Agent Platform; `gemini-3.8-flash-lite-tts` is the cheapest ($6 per 1M audio output tokens until 2026-12-31, about $0.009 per minute estimated) and works on `global`. Yucatec Maya is not in the supported language list: pronunciation is an experiment. The 3.8 models return a full WAV from `generateContent`; legacy models return headerless PCM. `systemInstruction`, `temperature`, `topP`, `topK` are rejected by 3.8 TTS. Sources: https://docs.cloud.google.com/text-to-speech/docs/gemini-tts, https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/text-to-speech/migration-guide, https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing.
- **L3 (RED):** New tests written from S1–S6 before any implementation: `src/tramites/__tests__/voice.test.ts`, `src/server/__tests__/gemini-voice.test.ts`, `src/server/__tests__/audio-cache.test.ts`, `src/server/__tests__/voice-handler.test.ts`, `src/screens/voice/__tests__/use-card-voice.test.ts`. All 5 suites failed to run: `Could not locate module @/tramites/voice` (and `@/server/gemini-voice`, `@/server/audio-cache`, `@/server/hash`, `@/server/voice-handler`, `@/screens/voice/use-card-voice`), because none existed yet.
- **L4 (GREEN):** Domain `src/tramites/voice.ts` (`getMayaVoice`, `ensureWav`, `MACHINE_VOICE_LABEL`, `MAX_VOICE_TEXT`) with ports `VoiceSynthesizer` and `AudioCache`; server `gemini-voice.ts`, `audio-cache.ts`, `hash.ts`, `voice-handler.ts`, `composeVoice()`, route `src/app/api/voice+api.ts`; client `src/screens/voice/{voice-url,use-card-voice}.ts` with `expo-audio ~58.0.12`. New suites: 5 passed, 40 tests. Full run: 19 suites, 139 tests passed; `npx tsc --noEmit` and `npx expo lint` clean. Voice is set with `speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName: "Kore"` (the 3.6.1 types also allow `voiceConfig.voice`); the slow, clear style goes in the text part's `speechMetadata.style` (typed in 3.6.1). No `systemInstruction`, `temperature`, `topP` or `topK`. `npx expo install expo-audio` also added the `expo-audio` config plugin to `app.json`. Pending: S7 real smoke and the by-ear check.
- **Contract for objective 6:** In a card, call `const voice = useCardVoice()` from `@/screens/voice/use-card-voice`. One big "Escuchar" button (icon + word, about 64 dp) per language: Spanish calls `voice.speakSpanish(card.plainSpanish)`; Maya calls `voice.playMaya(card.maya)` only when `card.maya` is not null. Show `MACHINE_VOICE_LABEL` ("Voz automática, sin revisar") next to the Maya button. Never call them on mount or from an effect: only from a tap. `voice.status` is `idle | loading | playing | error`; while `loading` or `playing` you may show a visible "Parar" button that calls `voice.stop()`. On `error` (`reason: "voice-unavailable"`) say what happened and the next step, for example "No se pudo oír en maya. Escuche en español."; the Spanish button keeps working. Starting one voice stops the other.
- **L5 (S7 real smoke):** `GET /api/voice` with "K'a'abéet a bo'otik u tojol $1,250.00 pesos." → 200 `audio/wav`, 372,508 bytes, RIFF/WAVE header, 1 ch 24 kHz Int16, 7.6 s, in 7.7 s. Second call → identical bytes in 0.48 s from the cache (`.cache/voice/` holds 1 file). `prebuiltVoiceConfig.voiceName` and `speechMetadata.style` were accepted by `gemini-3.8-flash-lite-tts`. `npx expo install expo-audio` also added the `expo-audio` config plugin to `app.json` (kept; it only affects native builds). Pending: listen to the Maya audio and note whether it is understandable (`afplay /tmp/voice1.wav` on the laptop), and play it on a phone in Expo Go.
- **Next objective:** 7, Agentic checklist and reminder (`agentic-checklist.md`). Not started.
