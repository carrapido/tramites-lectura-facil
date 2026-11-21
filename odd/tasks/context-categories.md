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
