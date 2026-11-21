---
status: in-progress
owner: carrapido
---

# Field feedback from the first phone test

## Goal

Fix what the team lead found testing on a phone: no visible progress while the app works, the camera opening on the front side, and a Spanish voice that sounds like an English voice reading Spanish.

## Out of scope

Text input, new screens, voice changes for Maya beyond sharing the route.

## Specs

- **S1 (loading):** while the app reads the photo, prepares the cards or prepares the agent's list, it shows a large loading animation with the words of each step ("Leyendo su papel.", "Preparando su lista."), announced to screen readers. When the system "reduce motion" setting is on, it shows a still icon instead of an animation. No shimmer skeletons, no blur.
- **S2 (camera):** the camera opens with the rear camera (`cameraType: back` in `expo-image-picker`), so nobody has to switch sides.
- **S3 (Spanish voice):** every Spanish sentence the app speaks (cards, the agent's proposal, the camera and notification permission reasons, the language sample) uses a real Spanish voice: Gemini TTS on the laptop through `GET /api/voice?text=…&lang=es`, cached on disk like the Maya voice. Maya keeps `lang=yua` (the default for old callers).
- **S4 (fallback):** if the laptop voice fails or takes longer than a short deadline, the phone speaks with `expo-speech` using an installed Spanish voice chosen explicitly (`es-MX`, then `es-US`, `es-419`, then any `es-*`), never the default voice; if the phone has no Spanish voice, it shows the sentence on screen instead of speaking it with another language's voice.
- **S5:** audio still plays only after a tap, one voice at a time; the Maya label "Voz automática, sin revisar" stays on Maya only.

## Log

- **L1 (user, verbatim):** "agrega un animacion de cargando y la parte de la camara se inicia de camara frontal y no la trasera la amyoria de gente mayor no va a saber como cambiar el lado de la camara. tambien la voz en español simplemente es un tts de ingles hablando en español y se escucha raro, cambialo a un tts de espñol"
- **L2 (decision):** Spanish moves from the phone's voice to Gemini TTS (Spanish is in its supported language list), with an explicit Spanish phone voice as fallback. This supersedes objective 5 S1 ("Spanish is spoken on the phone with expo-speech").
