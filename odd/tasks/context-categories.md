---
status: in-progress
owner: carrapido
---

# Any paper, read by its context

## Goal

The app is an inclusion tool for quick, concise reading of any paper, not only legal procedures: the person photographs any document and the app tells what kind of paper it is, then gives the same easy-read cards, voices and agent help.

## Scope

Classify each photo into one category, show the category and a notice that depends on it, generalize the reading and agent instructions beyond trámites, and update the pitch, README and demo fixtures.

## Out of scope

Typed or pasted text input (photo only), new categories beyond the list, per-category screens.

## Specs

- **S1:** Input stays photo-only ("Solo foto de cualquier papel"); the app still has no text input anywhere.
- **S2:** `POST /api/read` returns `category`, one of `tramite`, `reunion`, `salud`, `nota`, `otro`, chosen by Gemini from the document's context and validated with Zod; anything else or a missing value becomes `otro`. The domain list and labels live in `src/tramites/category.ts`.
- **S3:** The reading instruction works for any paper (notice, meeting invitation, prescription or medical appointment, school or community note, other), still extracting 3 to 7 facts with literal source quotes; the traceability rule is unchanged.
- **S4:** The read screen shows the category by its Spanish name ("Trámite", "Reunión", "Salud", "Nota", "Otro") with an icon and a word, and replaces the fixed "Esto no es asesoría legal" with the notice for that category: trámite "Esto no es asesoría legal", salud "No sustituye a su médico", reunión, nota and otro "Revise el papel original". Before any reading it shows "Revise el papel original".
- **S5:** The agent works for any category: `POST /api/plan` accepts an optional `category`, the instruction proposes what to bring and when to go only when the paper has a date or requirements, and the reminder text is generic ("Recordatorio" instead of "Recordatorio de su trámite").
- **S6:** The pitch script, README and demo runbook present the app as an inclusion tool for any paper, and a second fictitious fixture (a community meeting invitation) is added with its recordings for replay.
- **S7:** One real smoke call per fixture returns the expected category (`tramite` for the notice, `reunion` for the invitation) with traceable facts.

## Log

- **L1 (user, verbatim):** "no teiene que ser es un ambito legal es una herramienta de inclusividad para que todos tengna una lectura rapida y concisa, se puede poner cualquier texto y va a categorizarlo por su contexto como (tramite, notas, reunion, etc)"
- **L2 (user decisions):** input "Solo foto de cualquier papel"; categories "todas las que sugeriste" (trámite / aviso oficial, reunión / evento, salud / receta / cita médica, nota / mensaje general, plus otro); notice "Aviso según la categoría".
- **L3 (base):** branch `feat/context-categories` starts from `main` plus PRs #9, #10 and #11 merged locally, because they touch the same files; once those merge, this PR's diff shrinks to its own changes.
- **L4 (server RED/GREEN):** S2, S3 and S5 on the server, domain and plan client.
  - RED (failed for the missing behavior before implementation, 30 failing): `POST /api/read category (context-categories S2)` (returns the category; `banco`, a number and `null` become `otro`; " Trámite " becomes `tramite`), `GeminiNoticeReader instruction (context-categories S2, S3)` (five categories explained; "Lee la foto de un papel", not "de un aviso oficial"), `readNotice category (context-categories S2)`, `Notice reading category (context-categories S2)` (recording stores it; an old recording without or with an unknown category replays as `otro`), `POST /api/plan category (context-categories S5)` (passed through, absent → `otro`, unknown → 400), `GeminiPlanProposer for any paper (context-categories S5)` (category named in the instruction; reminder only with a date; empty checklist when nothing to bring or do; no "trámite"/"aviso"), `proposePlan: category (context-categories S5)`, `fetchPlan with the category of the paper (context-categories S5)`, and the notification title.
  - Assertions changed because S2/S5 change the pinned behavior: the `/api/read` success bodies in `read-handler.test.ts` and `demo-replay-handlers.test.ts` now include `category`; `NOTIFICATION_TITLE` is "Recordatorio". Test data gained `category` where the `NoticeReading` type now requires it.
  - GREEN: `npx jest` 56 suites, 390 tests passed; `npx tsc --noEmit` and `npx expo lint` clean.
  - Contract for the UI: `POST /api/read` → `{ ok: true, category, facts, replayed? }` (`category` is a `Category` from `src/tramites/category.ts`); `fetchPlan(facts, category)` sends `{ facts, category }` to `POST /api/plan` (`fetchPlan(facts)` and `fetchPlan(facts, deadlineMs)` still work).
  - Pending: `fixtures/demo/notice-reading.json` has no `category` yet, so replay answers `otro` until it is re-recorded (S6); the read client in `src/screens/read/` must parse `category`; S7 smoke calls.
- **L5 (UI RED/GREEN):** S4 on the read screen, S1 confirmed.
  - RED (failed for the missing behavior before implementation, 15 failing): `readNoticePhoto category (context-categories S2, S4)` (known category passes through; missing, `banco`, `3` and `null` become `otro`; before, the parsed body had no `category`) and `ReadScreen category and notice (context-categories S4)` (before any reading "Revise el papel original" and no legal notice; per category the row `Tipo de papel: <Trámite|Reunión|Salud|Nota|Otro>` as text, not a button, with its notice; legal notice only for `tramite`; salud shows "No sustituye a su médico"; the row sits above the cards; `fetchPlan(facts, category)`).
  - Assertions changed because S2/S4 change the pinned behavior: `api-client-replay.test.ts` success bodies now include `category: 'otro'` (the server answer has none); `read-screen-plan.test.tsx` expects `fetchPlan(FACTS, 'tramite')`. Test data in the read-screen tests gained `category: 'tramite'` because `ReadBody` now requires it. No read-screen test pinned "Esto no es asesoría legal"; the home screen keeps its own notice (out of this task).
  - UI: `src/components/category-row.tsx` (icon + word, `accessibilityLanguage="es-MX"`); icons verified in `sf-symbols-typescript` and `expo-symbols/build/android/symbols.json`: `doc.text`/`description`, `person.3`/`groups`, `cross.case`/`medical_services`, `note.text`/`sticky_note_2`, `doc`/`article`.
  - S1: the `oral-first` guard scans all of `src/` except `__tests__` and `server`, so it covers `src/screens` and `src/components`; still green.
  - GREEN: `npx jest` 58 suites, 405 tests passed; `npx tsc --noEmit` and `npx expo lint` clean.
  - Pending: S6 fixtures and docs, S7 smoke calls, a phone check of the row and notice.
