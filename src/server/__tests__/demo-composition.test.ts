/**
 * @jest-environment node
 */
interface Modules {
  composition: typeof import('@/server/composition');
  replay: typeof import('@/server/demo-replay');
  recording: typeof import('@/server/demo-recording');
}

const GOOGLE_VARIABLES = ['GOOGLE_CLOUD_PROJECT', 'GOOGLE_CLOUD_LOCATION', 'DEMO_RECORD', 'DEMO_REPLAY'];
const saved = Object.fromEntries(GOOGLE_VARIABLES.map((name) => [name, process.env[name]]));

function throwingConstructor(name: string) {
  return jest.fn(() => {
    throw new Error(`${name} must not be constructed`);
  });
}

/** Loads a fresh composition root with the given environment and Google clients that may not be built. */
function loadModules(env: Record<string, string>, googleAllowed: boolean): Modules {
  for (const name of GOOGLE_VARIABLES) delete process.env[name];
  Object.assign(process.env, env);
  let modules: Modules | null = null;
  jest.isolateModules(() => {
    if (!googleAllowed) {
      jest.doMock('@google/genai', () => ({ ...jest.requireActual('@google/genai'), GoogleGenAI: throwingConstructor('GoogleGenAI') }));
      jest.doMock('@google-cloud/translate', () => ({ TranslationServiceClient: throwingConstructor('TranslationServiceClient') }));
    } else {
      jest.dontMock('@google/genai');
      jest.doMock('@google-cloud/translate', () => ({ TranslationServiceClient: jest.fn(() => ({ translateText: jest.fn() })) }));
    }
    modules = {
      composition: jest.requireActual<Modules['composition']>('@/server/composition'),
      replay: jest.requireActual<Modules['replay']>('@/server/demo-replay'),
      recording: jest.requireActual<Modules['recording']>('@/server/demo-recording'),
    };
  });
  if (!modules) throw new Error('modules not loaded');
  return modules;
}

afterEach(() => {
  jest.restoreAllMocks();
  jest.resetModules();
  for (const name of GOOGLE_VARIABLES) {
    if (saved[name] === undefined) delete process.env[name];
    else process.env[name] = saved[name];
  }
});

describe('composition per demo mode (S4, S5)', () => {
  it('replay builds every dependency without Google clients or Google variables', async () => {
    const { composition, replay } = loadModules({ DEMO_REPLAY: '1' }, false);
    const { ReplayNoticeReader, ReplayPlanProposer, ReplayTranslator, ReplayVoiceSynthesizer, ReplayWriter } = replay;

    expect(composition.isReplay()).toBe(true);
    expect(composition.composeNoticeReader()).toBeInstanceOf(ReplayNoticeReader);
    expect(composition.composeEasyRead().writer).toBeInstanceOf(ReplayWriter);
    expect(composition.composeEasyRead().translator).toBeInstanceOf(ReplayTranslator);
    expect(composition.composeSmokeDependencies().translator).toBeInstanceOf(ReplayTranslator);
    expect(composition.composePlan().proposer).toBeInstanceOf(ReplayPlanProposer);
    expect(composition.composeVoice().synthesizer).toBeInstanceOf(ReplayVoiceSynthesizer);
  });

  it('record wraps the real adapters with recording decorators', async () => {
    const { composition, recording } = loadModules(
      { DEMO_RECORD: '1', GOOGLE_CLOUD_PROJECT: 'demo-project', GOOGLE_CLOUD_LOCATION: 'us-central1' },
      true,
    );

    expect(composition.isReplay()).toBe(false);
    expect(composition.composeNoticeReader()).toBeInstanceOf(recording.RecordingNoticeReader);
    expect(composition.composeEasyRead().writer).toBeInstanceOf(recording.RecordingWriter);
    expect(composition.composeEasyRead().translator).toBeInstanceOf(recording.RecordingTranslator);
    expect(composition.composePlan().proposer).toBeInstanceOf(recording.RecordingPlanProposer);
    expect(composition.composeVoice().synthesizer).toBeInstanceOf(recording.RecordingVoiceSynthesizer);
  });

  it('live mode still needs the Google variables', async () => {
    const { composition } = loadModules({}, true);

    expect(composition.isReplay()).toBe(false);
    expect(() => composition.composeNoticeReader()).toThrow();
  });
});
