/**
 * @jest-environment node
 */
import { localDateIn } from '@/server/local-date';
import { handlePlan } from '@/server/plan-handler';
import { CredentialsUnavailableError } from '@/tramites/errors';
import type { Plan } from '@/tramites/plan';
import type { Fact, PlanProposer } from '@/tramites/ports';

function post(body: unknown): Request {
  return new Request('http://laptop/api/plan', { method: 'POST', body: JSON.stringify(body) });
}

const FACTS: Fact[] = [
  { kind: 'fecha', text: 'Pague antes del 30 de noviembre.', sourceQuote: 'vence el día 30 de noviembre de 2026' },
  {
    kind: 'lugar',
    text: 'Vaya a la Tesorería Municipal.',
    sourceQuote: 'Deberá presentarse en la Tesorería Municipal con este aviso',
    box: { x: 0.05, y: 0.4, width: 0.9, height: 0.1 },
  },
];

const PROPOSAL: Plan = {
  checklist: [
    { text: 'Lleve este aviso.', sourceQuote: 'con este aviso' },
    { text: 'Lleve su acta de nacimiento.', sourceQuote: 'acta de nacimiento' },
  ],
  reminder: {
    dueDate: '2026-11-30',
    title: 'pago del predial',
    place: 'Tesorería Municipal',
    sourceQuote: 'vence el día 30 de noviembre de 2026',
  },
};

function proposing(answer: () => Promise<Plan>): PlanProposer {
  return { propose: answer };
}

function composeWith(proposer: PlanProposer, today = '2026-11-21') {
  return jest.fn(() => ({ proposer, today }));
}

describe('POST /api/plan (S1-S3)', () => {
  it('returns 200 with the traceable plan', async () => {
    const response = await handlePlan(post({ facts: FACTS }), composeWith(proposing(async () => PROPOSAL)));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      plan: { checklist: [PROPOSAL.checklist[0]], reminder: PROPOSAL.reminder },
    });
  });

  it('drops a reminder due before the injected today (S3)', async () => {
    const response = await handlePlan(post({ facts: FACTS }), composeWith(proposing(async () => PROPOSAL), '2026-12-01'));

    expect((await response.json()).plan.reminder).toBeNull();
  });

  it.each([
    ['no facts key', {}],
    ['an empty list', { facts: [] }],
    ['more than 7 facts', { facts: Array.from({ length: 8 }, () => FACTS[0]) }],
    ['a fact without sourceQuote', { facts: [{ kind: 'fecha', text: 'x' }] }],
    ['a box outside 0..1', { facts: [{ ...FACTS[0], box: { x: 2, y: 0, width: 1, height: 1 } }] }],
  ])('rejects %s with 400 invalid-request', async (_name, body) => {
    const compose = composeWith(proposing(async () => PROPOSAL));

    const response = await handlePlan(post(body), compose);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, reason: 'invalid-request' });
    expect(compose).not.toHaveBeenCalled();
  });

  it('rejects a declared Content-Length above 64 KB before reading the body', async () => {
    const compose = composeWith(proposing(async () => PROPOSAL));
    const request = new Request('http://laptop/api/plan', {
      method: 'POST',
      headers: { 'Content-Length': String(64 * 1024 + 1) },
      body: JSON.stringify({ facts: FACTS }),
    });

    const response = await handlePlan(request, compose);

    expect(response.status).toBe(400);
    expect(request.bodyUsed).toBe(false);
    expect(compose).not.toHaveBeenCalled();
  });

  it('returns 503 adc-missing without credentials', async () => {
    const response = await handlePlan(
      post({ facts: FACTS }),
      composeWith(
        proposing(async () => {
          throw new CredentialsUnavailableError();
        }),
      ),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, reason: 'adc-missing', fix: 'gcloud auth application-default login' });
  });

  it('returns 502 upstream-failed when Gemini fails for another reason', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await handlePlan(
      post({ facts: FACTS }),
      composeWith(
        proposing(async () => {
          throw new Error('boom');
        }),
      ),
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ ok: false, reason: 'upstream-failed' });
  });

  it('returns 500 config-missing when the server configuration is invalid', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await handlePlan(post({ facts: FACTS }), () => {
      throw new Error('GOOGLE_CLOUD_PROJECT missing');
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, reason: 'config-missing' });
  });
});

describe('POST /api/plan category (context-categories S5)', () => {
  function recordingProposer(): PlanProposer & { categories: unknown[] } {
    const categories: unknown[] = [];
    return {
      categories,
      propose: async (_facts, category) => {
        categories.push(category);
        return PROPOSAL;
      },
    };
  }

  it('passes the category of the paper to the proposer', async () => {
    const proposer = recordingProposer();

    const response = await handlePlan(post({ facts: FACTS, category: 'salud' }), composeWith(proposer));

    expect(response.status).toBe(200);
    expect(proposer.categories).toEqual(['salud']);
  });

  it('uses otro when the category is absent', async () => {
    const proposer = recordingProposer();

    await handlePlan(post({ facts: FACTS }), composeWith(proposer));

    expect(proposer.categories).toEqual(['otro']);
  });

  it('rejects an unknown category with 400 invalid-request', async () => {
    const proposer = recordingProposer();
    const compose = composeWith(proposer);

    const response = await handlePlan(post({ facts: FACTS, category: 'banco' }), compose);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, reason: 'invalid-request' });
    expect(compose).not.toHaveBeenCalled();
  });
});

describe('localDateIn (S3 clock)', () => {
  it('returns the calendar date in Mérida, not in UTC', () => {
    expect(localDateIn('America/Merida', new Date('2026-11-30T03:00:00Z'))).toBe('2026-11-29');
    expect(localDateIn('America/Merida', new Date('2026-11-30T12:00:00Z'))).toBe('2026-11-30');
  });
});
