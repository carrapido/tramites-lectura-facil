---
status: in-progress
owner: carrapido
---

# Agentic checklist and reminder

## Goal

From the facts of a notice, Gemini proposes what to bring and when to go; the person hears the proposal and nothing happens on the phone until they tap a big "Sí".

## Scope

Server route `POST /api/plan` (Gemini function calling through Agent Platform with ADC), domain rules for traceability and confirmation, and a client module that schedules local phone notifications with `expo-notifications`. The confirmation sheet itself is objective 6 (Dean-koro); this objective delivers its contract.

## Out of scope

Calendar events, push notifications, accounts, filling forms, paying, any action without the person's "Sí". Screens.

## Specs

- **S1:** `POST /api/plan` accepts `{ facts: Fact[] }` (1 to 7, objective 3 shape, Zod) and returns `{ ok: true, plan }`, where Gemini 3.8 Flash proposes the plan only through two declared tools: `create_checklist(items)` and `schedule_reminder(dueDate, title, place)`. Invalid body returns 400 `invalid-request`; missing ADC 503 `adc-missing`; missing config 500 `config-missing`; other failures 502 `upstream-failed`.
- **S2 (traceability):** every checklist item (1 to 6, each 15 words or fewer, plain Spanish with "usted") and the reminder carry a `sourceQuote` that appears literally in the facts' source quotes; anything without a traceable quote is dropped, never shown.
- **S3:** the reminder's `dueDate` is a real calendar date (`YYYY-MM-DD`) that is today or later by the injected clock; otherwise the plan has `reminder: null` and keeps the checklist.
- **S4 (the agent acts only after "Sí"):** the domain's `executePlan(plan, answer)` calls the reminder port only when `answer` is `"yes"`; any other answer schedules nothing. A test proves no notification is scheduled before or without "Sí".
- **S5:** after "Sí", the phone asks for notification permission with a one-sentence spoken reason first, then schedules two local notifications: the day before at 10:00 and the due day at 08:00, local time, skipping any moment already past. Denied permission shows "No podemos avisarle. Active las notificaciones en Ajustes." and schedules nothing.
- **S6:** notification text is plain Spanish, 15 words or fewer per sentence, for example "Mañana vence su pago del predial. Lleve este aviso y su identificación."; the content never includes a CURP, INE number or any personal data beyond what the notice already shows.
- **S7:** client module `src/screens/plan/` exposes `fetchPlan(facts)` and `useReminder()` (`schedule(plan)`, `cancelAll()`, status) for objective 6's confirmation sheet; one real smoke call with the objective 3 fixture facts returns a traceable checklist and the reminder for 2026-11-30.

## Log

- **L1 (user decisions):** reminder: "Notificación local del teléfono"; agent: "Gemini propone, la persona confirma". Specs S1–S7 are the agent's draft from those decisions and the team prompt's rule "The agent acts only after a big 'Sí' confirmation."
