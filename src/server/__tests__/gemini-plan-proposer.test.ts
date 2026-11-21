/**
 * @jest-environment node
 */
import { FunctionCallingConfigMode, type FunctionCall } from '@google/genai';

import { GeminiPlanProposer, type FunctionCallingClient, type FunctionCallingRequest } from '@/server/gemini-plan-proposer';
import { CredentialsUnavailableError } from '@/tramites/errors';
import type { Fact } from '@/tramites/ports';

const FACTS: Fact[] = [
  { kind: 'fecha', text: 'Pague antes del 30 de noviembre.', sourceQuote: 'vence el día 30 de noviembre de 2026' },
];

const CHECKLIST_CALL: FunctionCall = {
  name: 'create_checklist',
  args: { items: [{ text: 'Lleve este aviso.', sourceQuote: 'con este aviso' }] },
};

const REMINDER_CALL: FunctionCall = {
  name: 'schedule_reminder',
  args: {
    dueDate: '2026-11-30',
    title: 'pago del predial',
    place: 'Tesorería Municipal',
    sourceQuote: 'vence el día 30 de noviembre de 2026',
  },
};

function clientAnswering(functionCalls: FunctionCall[] | undefined): FunctionCallingClient & { requests: FunctionCallingRequest[] } {
  const requests: FunctionCallingRequest[] = [];
  return {
    requests,
    generateContent: async (request) => {
      requests.push(request);
      return { functionCalls };
    },
  };
}

describe('GeminiPlanProposer (S1)', () => {
  it('declares the two tools, forces function calls and sends the facts', async () => {
    const client = clientAnswering([CHECKLIST_CALL, REMINDER_CALL]);

    await new GeminiPlanProposer(client).propose(FACTS);

    const [request] = client.requests;
    expect(request.model).toBe('gemini-3.8-flash');
    expect(request.config.tools.flatMap((tool) => tool.functionDeclarations?.map((declaration) => declaration.name))).toEqual([
      'create_checklist',
      'schedule_reminder',
    ]);
    expect(request.config.toolConfig.functionCallingConfig?.mode).toBe(FunctionCallingConfigMode.ANY);
    expect(JSON.stringify(request.contents)).toContain('vence el día 30 de noviembre de 2026');
  });

  it('tells Gemini to restate only what each source quote says, with "vigente" as the counter-example (L4)', async () => {
    const client = clientAnswering([CHECKLIST_CALL, REMINDER_CALL]);

    await new GeminiPlanProposer(client).propose(FACTS);

    const { systemInstruction } = client.requests[0].config;
    expect(systemInstruction).toContain('solo dice lo que dice su "sourceQuote"');
    expect(systemInstruction).toContain('No agregues requisitos, adjetivos, documentos, montos ni fechas');
    expect(systemInstruction).toContain('"vigente"');
  });

  it('turns both function calls into a plan', async () => {
    const plan = await new GeminiPlanProposer(clientAnswering([CHECKLIST_CALL, REMINDER_CALL])).propose(FACTS);

    expect(plan).toEqual({
      checklist: [{ text: 'Lleve este aviso.', sourceQuote: 'con este aviso' }],
      reminder: {
        dueDate: '2026-11-30',
        title: 'pago del predial',
        place: 'Tesorería Municipal',
        sourceQuote: 'vence el día 30 de noviembre de 2026',
      },
    });
  });

  it('ignores unknown calls, omits an empty place and returns an empty checklist without create_checklist', async () => {
    const reminder = { ...REMINDER_CALL, args: { ...REMINDER_CALL.args, place: '' } };

    const plan = await new GeminiPlanProposer(clientAnswering([{ name: 'pay_tax', args: {} }, reminder])).propose(FACTS);

    expect(plan).toEqual({
      checklist: [],
      reminder: { dueDate: '2026-11-30', title: 'pago del predial', sourceQuote: 'vence el día 30 de noviembre de 2026' },
    });
  });

  it('returns an empty plan when Gemini calls no function', async () => {
    expect(await new GeminiPlanProposer(clientAnswering(undefined)).propose(FACTS)).toEqual({ checklist: [], reminder: null });
  });

  it('rejects malformed function arguments', async () => {
    const client = clientAnswering([{ name: 'create_checklist', args: { items: [{ text: 'Sin cita.' }] } }]);

    await expect(new GeminiPlanProposer(client).propose(FACTS)).rejects.toThrow();
  });

  it('maps missing ADC to CredentialsUnavailableError', async () => {
    const client: FunctionCallingClient = {
      generateContent: async () => {
        throw new Error('Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication');
      },
    };

    await expect(new GeminiPlanProposer(client).propose(FACTS)).rejects.toBeInstanceOf(CredentialsUnavailableError);
  });
});

describe('GeminiPlanProposer for any paper (context-categories S5)', () => {
  async function instructionFor(category: Parameters<GeminiPlanProposer['propose']>[1]): Promise<string> {
    const client = clientAnswering([CHECKLIST_CALL]);
    await new GeminiPlanProposer(client).propose(FACTS, category);
    return client.requests[0].config.systemInstruction;
  }

  it('names the category of the paper in the instruction', async () => {
    expect(await instructionFor('reunion')).toContain('"reunion" (Reunión)');
    expect(await instructionFor('salud')).toContain('"salud" (Salud)');
  });

  it('proposes a reminder only for a date and a checklist only for things to bring or do', async () => {
    const instruction = await instructionFor('nota');

    expect(instruction).toContain(`Solo si el papel tiene una fecha, llama también a schedule_reminder`);
    expect(instruction).toContain('Si el papel no pide llevar ni hacer nada, llama a create_checklist con "items" vacío.');
    expect(instruction).toContain('"vigente"');
  });

  it('does not frame the paper or its tools as a trámite', async () => {
    const client = clientAnswering([CHECKLIST_CALL]);
    await new GeminiPlanProposer(client).propose(FACTS, 'otro');

    const { systemInstruction, tools } = client.requests[0].config;
    expect(systemInstruction).not.toMatch(/trámite|aviso oficial/);
    expect(JSON.stringify(tools)).not.toMatch(/trámite|aviso/);
  });
});
