---
status: in-progress
owner: carrapido
---

# Plain Spanish and Yucatec Maya text

## Goal

Turn the traceable facts from objective 3 into easy-read cards: one plain Spanish sentence and its Yucatec Maya machine translation, each card keeping its source quote.

## Scope

Domain rule in `src/tramites/`, server route `POST /api/easy-read`, a typed client function the UI (objective 6) calls. No UI changes here: objective 6 (Dean-koro) owns the screens.

## Out of scope

Voice (objective 5), screens and card layout (objective 6), human review of Maya.

## Specs

- **S1:** `POST /api/easy-read` accepts `{ facts: Fact[] }` with 1 to 7 facts in the objective 3 shape, validated with Zod; anything else returns 400 `{ ok: false, reason: "invalid-request" }`.
- **S2:** Each card keeps `kind`, `sourceQuote` and `box` unchanged from its fact, and holds `plainSpanish` and `maya`. Maya comes from Cloud Translation `translateText` es → yua with `mimeType: "text/plain"`, all cards in a single call.
- **S3:** `plainSpanish` has 15 words or fewer. A fact text above 15 words is rewritten once by `PlainLanguageWriter`; the domain rule and its test live in `src/tramites/`.
- **S4:** Maya is never presented as reviewed: every card carries `mayaStatus: "machine-unreviewed"`, and the domain exports the label "Traducción automática, sin revisar" for the UI.
- **S5:** Plain Spanish is always delivered. If Translation fails for a reason other than missing credentials, the route still returns 200 with every card's `maya: null` and `mayaStatus: "unavailable"`. Missing ADC returns 503 `adc-missing` as in objective 2.
- **S6:** A client function `fetchEasyRead(facts)` in `src/screens/easy-read-client.ts` returns the cards or a failure reason (`invalid-request`, `adc-missing`, `config-missing`, `timeout`, `unreachable`, `bad-response`), with a deadline, for objective 6 to use.
- **S7:** One real smoke call with the objective 3 fixture facts returns Maya for every card.

## Log

- **L1 (user, verbatim):** "Dean comenzo ya el objetivo 6, trabaja en en el 4". Specs S1–S7 are the agent's draft, derived from the team prompt's standing rules (sections 1, 7) and objective 3's contract; the team can amend them.
