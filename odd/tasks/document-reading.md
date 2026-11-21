---
status: in-progress
---

# Document reading with traceable facts

## Goal

A phone photo of a fictitious Mexican notice becomes 3 to 7 short facts, each with the literal source quote it came from.

## Out of scope

Translation and voice (objectives 4 and 5).

## Specs

- **S1:** `POST /api/read` recibe una foto en JPEG o PNG (base64, máximo ~4 MB, validado con Zod). Devuelve 400 con la razón si no es válida.
- **S2:** Gemini 3.8 Flash (multimodal, Agent Platform) transcribe el aviso y extrae de 3 a 7 hechos. Cada hecho trae `{ kind, text, sourceQuote, box? }`; la salida se valida con Zod y, si no cumple, la ruta responde 502.
- **S3 (trazabilidad):** cada `sourceQuote` debe aparecer literalmente en la transcripción. Los hechos sin cita verificable se descartan, nunca se muestran. Esta regla vive en el dominio (`src/tramites/`) y tiene un test.
- **S4:** una foto ilegible devuelve `{ ok: false, reason: "unreadable" }`, y la app dice "No se ve bien la foto. Tome otra con más luz."
- **S5:** un aviso ficticio de prueba (sin CURP ni INE reales) queda en `fixtures/`, con un test de extremo a extremo con un Gemini falso y una sola llamada real de smoke.
- **S6:** la cámara usa `expo-image-picker`, que funciona en Expo Go. El permiso se pide solo al tocar "Tome una foto de su papel", después de una frase hablada que explica para qué.

## Log

- **L1 (user, verbatim):** "Continuar con el borrador dado" — specs S1–S6 above are the agent's draft, approved by the user as written.
- **L2 (RED):** c16de79 — 3 suites failing (modules missing), 27 prior tests green.
- **L3 (GREEN):** worker implemented domain `readNotice`, `GeminiNoticeReader`, `POST /api/read`, `ReadScreen` (index route; diagnostics moved to `/diagnostico`). 44/44 tests, tsc and lint clean.
- **L4 (S5 real smoke):** first call failed `Error: Request timed out` (ETIMEDOUT): Expo server fetch (`fetch-nodeshim`) has a 30 s socket timeout and Gemini 3 with image + default thinking exceeded it. Fix: `thinkingConfig: { thinkingLevel: LOW }`. Then 200 in 10.9 s with 5 facts, every `sourceQuote` literal in the notice.
- **L5 (pending):** S6 on a real phone in Expo Go (spoken reason, permission, camera, HEIC on iPhone returns JPEG base64). Status stays in-progress until then.
- **L6 (review follow-ups, user verbatim: "corrige los 5"):** RED 15 new tests failing, GREEN 63/63, tsc and lint clean.
  1. `scripts/setup.sh` stops with exit 1 and a fix command when no project resolves, before writing; an env file with an empty project is regenerated. Closes R3-setup-empty-project, R4-setup-empty-project-sticky.
  2. `ReadScreen` runs one photo flow at a time (button disabled, extra taps dropped); camera or permission failures show "No pudimos abrir la cámara. Intente otra vez."; speech resolves on done, stop, error or an 8 s fallback. Closes R3-takephoto-unguarded, R4-take-photo-unguarded.
  3. Camera quality 0.5 and photos wider than 1600 px are resized to JPEG with `expo-image-manipulator` (in Expo Go). 400 `invalid-request` says "La foto es muy grande o no sirve. Tome otra más de cerca."; a non-JSON or off-schema answer is `bad-response`, not Wi-Fi. `POST /api/read` rejects a `Content-Length` above the cap before reading the body. Closes R3-photo-size-misreported, R4-misleading-retry-message, R1-002.
  4. The read request aborts after 45 s (`READ_DEADLINE_MS`) with reason `timeout` and "La laptop tardó mucho. Revise la red y tome la foto otra vez." Closes R4-read-fetch-no-timeout.
  5. A composition failure in `/api/read` returns 500 `config-missing` through the shared `composeOrNull` (also used by smoke); the app says "Falta configurar la laptop. Avise a quien la atiende." Closes R3-compose-failure-mapped-502.
  - Left open: R1-001 (no auth on the API; demo only, avoid `--tunnel` unless needed), R3-duplicate-fact-keys, R3-min-facts-unenforced.
- **Next:** phone checks only (odd/phone-checks.md).
- **L7 (user, verbatim):** "cuando no recnozca un texto que simplemente lo dgia y que no diga simplemente no se ve bien la foto pon algo tipo "no puedo saber si es realmente un texto, lo que me estas mostrando en un texto [objeto que se identifica o concepto como]""
- **S4 amended (from L7):** the reading tells apart three cases. (a) Text that can be read → facts as today. (b) Text that is there but cannot be read (blurry, dark, cut) → `{ ok: false, reason: "unreadable" }` and "No se ve bien la foto. Tome otra con más luz." as today. (c) No text at all → `{ ok: false, reason: "no-text", seen: "<what the photo shows, a short Spanish phrase such as 'una taza de café'>" }` and the app says "No puedo saber si es un texto. Lo que me muestra parece ser: <seen>. Tome una foto de un papel con letras." If Gemini gives no description, the app says "No puedo saber si es un texto. Tome una foto de un papel con letras."
