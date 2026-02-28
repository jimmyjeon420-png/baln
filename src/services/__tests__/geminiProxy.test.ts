jest.mock('../../utils/promptLanguage', () => ({
  getLangParam: jest.fn(() => 'ko'),
}));

const { invokeGeminiProxy } = require('../geminiProxy');

function createClient(sequence: Array<{ data: any; error: any }>) {
  const invoke = jest.fn(async () => {
    const next = sequence.shift();
    if (!next) {
      throw new Error('No mock response configured');
    }
    return next;
  });

  return {
    client: {
      functions: {
        invoke,
      },
    },
    invoke,
  };
}

describe('geminiProxy', () => {
  it('returns envelope data on success', async () => {
    const { client, invoke } = createClient([
      { data: { success: true, data: { report: 'ok' } }, error: null },
    ]);

    await expect(
      invokeGeminiProxy('deep-dive', { ticker: 'NVDA' }, 1000, { client: client as any, lang: 'ko' }),
    ).resolves.toEqual({ report: 'ok' });

    expect(invoke).toHaveBeenCalledWith('gemini-proxy', {
      body: { type: 'deep-dive', data: { ticker: 'NVDA' }, lang: 'ko' },
    });
  });

  it('retries transient invoke errors and succeeds', async () => {
    const { client, invoke } = createClient([
      { data: null, error: { message: 'Failed to send a request to the Edge Function' } },
      { data: { success: true, data: { report: 'recovered' } }, error: null },
    ]);

    await expect(
      invokeGeminiProxy('deep-dive', { ticker: 'TSLA' }, 1000, { client: client as any, lang: 'ko', maxTransientRetries: 1 }),
    ).resolves.toEqual({ report: 'recovered' });

    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it('throws on non-success envelopes instead of treating them as valid responses', async () => {
    const { client } = createClient([
      { data: { success: false, error: 'upstream degraded' }, error: null },
    ]);

    await expect(
      invokeGeminiProxy('deep-dive', { ticker: 'GOOGL' }, 1000, { client: client as any, lang: 'ko', maxTransientRetries: 0 }),
    ).rejects.toThrow('gemini-proxy 응답 오류: upstream degraded');
  });

  it('throws immediately on non-transient invoke errors', async () => {
    const { client, invoke } = createClient([
      { data: null, error: { message: '401 Unauthorized' } },
    ]);

    await expect(
      invokeGeminiProxy('deep-dive', { ticker: 'BRK-B' }, 1000, { client: client as any, lang: 'ko', maxTransientRetries: 1 }),
    ).rejects.toThrow('gemini-proxy 오류: 401 Unauthorized');

    expect(invoke).toHaveBeenCalledTimes(1);
  });
});
