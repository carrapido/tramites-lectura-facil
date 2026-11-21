---
status: done
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
- **L2 (RED):** T1 tests written from S1–S6 and run before implementation. Failing: `src/tramites/__tests__/easy-read.test.ts`, `src/server/__tests__/easy-read-handler.test.ts` and `src/screens/__tests__/easy-read-client.test.ts` (suites failed to run: `@/tramites/easy-read`, `@/server/easy-read-handler`, `@/screens/easy-read-client` did not exist); `src/server/__tests__/cloud-translator-batch.test.ts` › "translates every text in one plain-text translateText call", "rejects an answer with a different number of translations", "maps missing ADC to CredentialsUnavailableError" (`translateAll is not a function`). "keeps translate working for a single text" passed as a preserve check.
- **L3 (GREEN):** `npx jest` 14 suites, 99 tests passed (36 new); `npx tsc --noEmit` and `npx expo lint` clean. Translation batching uses a new `BatchTranslator` port (`translateAll`), implemented by `CloudTranslator`; `translate` now delegates to it. Request-body helpers moved from `read-handler.ts` to `src/server/request-body.ts` and are shared. Pending: S7 real smoke with the objective 3 fixture facts.
- **Contract for objective 6:**
  - `POST /api/easy-read` body `{ facts: Fact[] }` (1–7 facts from `POST /api/read`). 200 `{ ok: true, cards: EasyReadCard[] }`; 400 `invalid-request`; 503 `adc-missing`; 500 `config-missing`; 502 `upstream-failed`.
  - `EasyReadCard = { kind, plainSpanish, maya: string | null, mayaStatus: 'machine-unreviewed' | 'unavailable', sourceQuote, box? }`, exported from `src/tramites/easy-read.ts`.
  - Client: `fetchEasyRead(facts, deadlineMs = 20000)` in `src/screens/easy-read-client.ts` returns `{ ok: true, cards }` or `{ ok: false, reason }` with reason `invalid-request | adc-missing | config-missing | timeout | unreachable | bad-response` (any other server reason, including `upstream-failed`, becomes `bad-response`).
  - UI rules: show `plainSpanish` above `maya`; show `MACHINE_TRANSLATION_LABEL` ("Traducción automática, sin revisar") under every non-null `maya`; when `mayaStatus` is `unavailable`, hide Maya and keep the Spanish. Keep the `sourceQuote` reachable from every card.
- **L4 (S7 real smoke):** `POST /api/easy-read` with 3 fixture facts → 200 in 5.6 s, one Translation call, every card `mayaStatus: "machine-unreviewed"`, e.g. "K'a'abéet a bo'otik u tojol $1,250.00 pesos." Metro needs a dev-server restart to pick up a new `+api.ts` file.
- **L5 (outcome):** S1–S7 pass; 99/99 tests, tsc and lint clean. Open: Fact Zod schema and client fetch/deadline pattern are duplicated with objective 3 files owned by the UI branch (consolidate after objective 6 merges); a rewrite still above 15 words is accepted as is.
- **L6 (slice):** one commit of 779 authored lines, past the ~400-line slice; kept whole because domain, adapter, route and client are one behavior and about half the lines are tests. Delivered as one PR.
- **L7 (dedupe):** behavior-preserving refactor of the L5 duplication. `MAX_PLAIN_WORDS` and `countWords` now live once in `src/tramites/text-rules.ts`; `easy-read.ts` imports them and re-exports `MAX_PLAIN_WORDS`, `plan.ts` imports them directly (no more `plan` → `easy-read` dependency). `GeminiNoticeReader` validates facts with `factSchema` from `src/server/fact-schema.ts` (same fields and box bounds; the reader keeps `.max(7)` without `.min(1)`). New preserve test `src/tramites/__tests__/text-rules.test.ts` (5 tests, green on first run, not RED). `npx jest` 50 suites/332 tests before → 51/337 after, all passed; `npx tsc --noEmit` and `npx expo lint` clean. Remaining copies, out of this surface: Fact/box Zod shapes in `src/screens/easy-read-client.ts` and `src/screens/read/api-client.ts`; checklist/reminder shapes in `src/screens/plan/plan-client.ts`, `src/server/demo-recordings.ts` and `src/server/gemini-plan-proposer.ts`; the "15 palabras o menos" prompt phrase in `gemini-notice-reader.ts`, `gemini-plan-proposer.ts` and `gemini-writer.ts`.
- **Next:** phone checks only (odd/phone-checks.md).
