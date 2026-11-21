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
