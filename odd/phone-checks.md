# Phone checks (manual, issue #4 step 4)

Nobody can automate these. Run them on a real phone in Expo Go, against your own laptop, from `main`. Write what you saw, with phone model and OS version, in the Log named on each check.

## Before you start

1. Laptop: `gcloud auth application-default login`, then `npm run setup` (it runs `npm ci` and `npm test`).
2. Laptop: `npx expo start`. Phone: same Wi-Fi as the laptop, then scan the QR code with Expo Go. If the event Wi-Fi blocks phone-to-laptop traffic, use `npx expo start --tunnel` or the phone's hotspot (README).
3. Have `fixtures/aviso-ficticio.jpg` printed or open on another screen. It is fictitious and has no real CURP or INE.
4. Use Android and iOS if you have both: S6 asks for one of each.

## 1. Connection: "conectado"

- [ ] On the read screen, tap "Ver conexión". Expected: "conectado". Then tap "Volver".
- [ ] Optional: tap "Probar Google". Expected: a Gemini answer and a Maya translation.

Log: `odd/tasks/team-setup.md` (S4, S6).

## 2. Camera and cards

- [ ] Tap "Tome una foto de su papel". Expected: the phone says "Necesitamos la cámara para leer su papel." first, and only then asks for the camera permission.
- [ ] Expected: the rear camera opens by default.
- [ ] While the photo is sent, expected: the photo button shows busy with its loading symbol.
- [ ] Take the photo of the fixture. Expected: "Leyendo.", then 3 to 7 cards in plain Spanish, each with an icon, "Escuchar" and "¿De dónde salió?".
- [ ] Expected: "Preparando sus tarjetas." with a spinner before the cards. With reduce motion on, a still hourglass shows instead of the spinner.
- [ ] With `fixtures/aviso-ficticio.jpg`, expected: the category row "Tipo de papel: …" with its notice ("Esto no es asesoría legal"). With `fixtures/invitacion-ficticia.jpg`, expected: the category row "Tipo de papel: …" with "Revise el papel original".
- [ ] Tap any button. Expected: visible press feedback. With reduce motion on, no scale animation.
- [ ] Tap "¿De dónde salió?" on one card. Expected: the literal quote from the notice.
- [ ] iPhone only: the photo is HEIC by default and must still work.

Log: `odd/tasks/document-reading.md` (S6) and `odd/tasks/indigenous-output.md`.

## 3. The two voices and the language

- [ ] Tap "Escuchar" on a card. Expected: busy "Preparando la voz." with a spinner, then the laptop's Gemini Spanish voice, then the button turns into "Parar".
- [ ] Turn the laptop's Wi-Fi off and tap "Escuchar" on a card. Expected: a phone Spanish voice speaks (es-MX, es-US or es-419), never an English-accented one.
- [ ] Tap "Cambiar idioma", then "Maaya t'aan". Expected: you are back on the read screen and every card that has Maya shows it under the Spanish, with "Traducción automática, sin revisar".
- [ ] Tap "Escuchar" under the Maya. Expected: "Preparando la voz.", then the laptop's Maya voice, with "Voz automática, sin revisar" next to the button. The first time takes about 8 s; the second time it comes from the cache.
- [ ] While the Maya plays, tap "Escuchar" on another card. Expected: the Maya stops and only one voice plays.
- [ ] Turn the laptop's Wi-Fi off and tap a Maya "Escuchar". Expected: "No se pudo oír en maya. Escuche en español." The Spanish button still works.
- [ ] Close Expo Go completely and open the app again. Expected: Maaya t'aan is still chosen (the picker shows the check).
- [ ] In "Cambiar idioma", tap "Escuchar Maaya t'aan". Expected: the Maya voice, not the Spanish one.

Log: `odd/tasks/voice-output.md` (S7) and `odd/tasks/accessible-ui.md` (S4).

## 4. Confirmation sheet and notifications

The fixture's due date is 2026-11-30, so the reminders are set for 2026-11-29 at 10:00 and 2026-11-30 at 08:00.

- [ ] After the cards, expected: "Preparando su lista.", then the sheet with the checklist, "30 de noviembre de 2026" in large type, the place, "Sí, recuérdeme" and "No, gracias". Nothing is scheduled yet.
- [ ] Tap "Escuchar" on the sheet. Expected: the proposal, the items, the date and place, and "¿Quiere que le recuerde?".
- [ ] Tap "Sí, recuérdeme". Expected: the phone says "Para avisarle antes de la fecha, necesitamos permiso.", then the notification permission prompt; allow it. Then "Listo. Le avisaremos un día antes y el mismo día."
- [ ] Check that two notifications fire: set the phone's date and time to 2026-11-29 09:59 and wait, then to 2026-11-30 07:59. Put the date back to automatic afterwards.
- [ ] Take the photo again and tap "Sí, recuérdeme" again. Expected: exactly 2 pending reminders (fixed ids replace the old ones).
- [ ] With the app open when a reminder fires. Expected: the reminder banner shows.
- [ ] Deny the permission (reinstall Expo Go or reset its permissions) and tap "Sí, recuérdeme". Expected: the button shows busy while the phone asks, then "No podemos avisarle. Active las notificaciones en Ajustes."
- [ ] Tap "No, gracias". Expected: "Está bien. No guardamos ningún aviso." Nothing is scheduled.

Log: `odd/tasks/agentic-checklist.md` (S5, L5).

## 5. TalkBack or VoiceOver, and 200% font

- [ ] Turn on TalkBack (Android) or VoiceOver (iOS) and move through the read screen. Expected: every button is announced as a button, with its word ("Tome una foto de su papel", "Escuchar", "Escuchar en maya", "¿De dónde salió?", "Sí, recuérdeme", "No, gracias", "Cambiar idioma").
- [ ] Listen to a Maya sentence with the screen reader. Note how it pronounces `yua` text on iOS (VoiceOver) and on Android (TalkBack). The app's own "Escuchar en maya" button stays the reliable path.
- [ ] Set the system font to the largest size (about 200%; on Android also Display size). Check the read screen, the cards, the sheet and "Cambiar idioma". Expected: no clipped or overlapping text, and every button still reachable by scrolling.

Log: `odd/tasks/accessible-ui.md` (S3, S6, T5).
