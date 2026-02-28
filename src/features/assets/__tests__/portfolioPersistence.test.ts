import { savePortfolioAsset } from '../portfolioPersistence';

function createQuery(response: any, calls: any[]) {
  const query = {
    update(payload: any) {
      calls.push({ type: 'update', payload });
      return query;
    },
    insert(payload: any) {
      calls.push({ type: 'insert', payload });
      return query;
    },
    select(value: string) {
      calls.push({ type: 'select', value });
      return query;
    },
    eq(field: string, value: any) {
      calls.push({ type: 'eq', field, value });
      return query;
    },
    limit(value: number) {
      calls.push({ type: 'limit', value });
      return query;
    },
    then(resolve: (value: any) => unknown, reject?: (reason?: any) => unknown) {
      return Promise.resolve(response).then(resolve, reject);
    },
  };

  return query;
}

function createClient(responses: any[]) {
  const calls: any[] = [];
  return {
    calls,
    client: {
      from(table: 'portfolios') {
        calls.push({ type: 'from', table });
        const response = responses.shift();
        if (!response) {
          throw new Error('No mock response configured');
        }
        return createQuery(response, calls);
      },
    },
  };
}

const baseInput = {
  userId: 'user-1',
  ticker: 'NVDA',
  name: '엔비디아',
  quantity: 2,
  avgPrice: 1000,
  currentValue: 2500,
  currency: 'KRW' as const,
};

describe('portfolioPersistence', () => {
  it('updates existing asset by id before any lookup', async () => {
    const { client, calls } = createClient([
      { data: [{ id: 'existing-row' }], error: null },
    ]);

    const result = await savePortfolioAsset(client as any, { ...baseInput, existingId: 'existing-row' }, 'timeout');

    expect(result).toEqual({ id: 'existing-row' });
    expect(calls.some((call) => call.type === 'insert')).toBe(false);
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'update' }),
        expect.objectContaining({ type: 'eq', field: 'id', value: 'existing-row' }),
      ]),
    );
  });

  it('falls back to ticker lookup and update when existingId is absent', async () => {
    const { client, calls } = createClient([
      { data: [{ id: 'ticker-row' }], error: null },
      { data: [{ id: 'ticker-row' }], error: null },
    ]);

    const result = await savePortfolioAsset(client as any, baseInput, 'timeout');

    expect(result).toEqual({ id: 'ticker-row' });
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'eq', field: 'ticker', value: 'NVDA' }),
        expect.objectContaining({ type: 'update' }),
      ]),
    );
    expect(calls.some((call) => call.type === 'insert')).toBe(false);
  });

  it('inserts a new asset when no existing row is found', async () => {
    const { client, calls } = createClient([
      { data: [], error: null },
      { data: [{ id: 'new-row' }], error: null },
    ]);

    const result = await savePortfolioAsset(client as any, baseInput, 'timeout');

    expect(result).toEqual({ id: 'new-row' });
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'insert', payload: expect.objectContaining({ user_id: 'user-1', ticker: 'NVDA' }) }),
      ]),
    );
  });

  it('throws lookup errors instead of pretending save succeeded', async () => {
    const { client } = createClient([
      { data: null, error: { message: 'lookup failed' } },
    ]);

    await expect(savePortfolioAsset(client as any, baseInput, 'timeout')).rejects.toEqual(
      expect.objectContaining({ message: 'lookup failed' }),
    );
  });
});
