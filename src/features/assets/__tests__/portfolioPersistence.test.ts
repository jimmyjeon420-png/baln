/* eslint-disable @typescript-eslint/no-explicit-any */

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
      {
        data: [{
          id: 'existing-row',
          user_id: 'user-1',
          ticker: 'NVDA',
          name: '엔비디아',
          quantity: 2,
          avg_price: 1000,
          current_value: 2500,
        }],
        error: null,
      },
    ]);

    const result = await savePortfolioAsset(client as any, { ...baseInput, existingId: 'existing-row' }, 'timeout');

    expect(result).toEqual(expect.objectContaining({ id: 'existing-row' }));
    expect(calls.some((call) => call.type === 'insert')).toBe(false);
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'update' }),
        expect.objectContaining({ type: 'eq', field: 'id', value: 'existing-row' }),
        expect.objectContaining({ type: 'update', payload: expect.objectContaining({ current_price: 1250 }) }),
      ]),
    );
  });

  it('falls back to ticker lookup and update when existingId is absent', async () => {
    const { client, calls } = createClient([
      {
        data: [{
          id: 'ticker-row',
          user_id: 'user-1',
          ticker: 'NVDA',
          name: '엔비디아',
          quantity: 2,
          avg_price: 1000,
          current_value: 2500,
        }],
        error: null,
      },
      {
        data: [{
          id: 'ticker-row',
          user_id: 'user-1',
          ticker: 'NVDA',
          name: '엔비디아',
          quantity: 2,
          avg_price: 1000,
          current_value: 2500,
        }],
        error: null,
      },
    ]);

    const result = await savePortfolioAsset(client as any, baseInput, 'timeout');

    expect(result).toEqual(expect.objectContaining({ id: 'ticker-row' }));
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
      {
        data: [{
          id: 'new-row',
          user_id: 'user-1',
          ticker: 'NVDA',
          name: '엔비디아',
          quantity: 2,
          avg_price: 1000,
          current_value: 2500,
        }],
        error: null,
      },
    ]);

    const result = await savePortfolioAsset(client as any, baseInput, 'timeout');

    expect(result).toEqual(expect.objectContaining({ id: 'new-row' }));
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

  it('re-reads inserted rows when mutation response does not include the saved payload', async () => {
    const { client } = createClient([
      { data: [], error: null },
      { data: [{ id: 'new-row' }], error: null },
      {
        data: [{
          id: 'new-row',
          user_id: 'user-1',
          ticker: 'NVDA',
          name: '엔비디아',
          quantity: 2,
          avg_price: 1000,
          current_value: 2500,
        }],
        error: null,
      },
    ]);

    const result = await savePortfolioAsset(client as any, baseInput, 'timeout');

    expect(result).toEqual(
      expect.objectContaining({
        id: 'new-row',
        ticker: 'NVDA',
        name: '엔비디아',
      }),
    );
  });

  it('fails when the persisted row does not match the requested values', async () => {
    const { client } = createClient([
      { data: [], error: null },
      { data: [{ id: 'new-row' }], error: null },
      {
        data: [{
          id: 'new-row',
          user_id: 'user-1',
          ticker: 'NVDA',
          name: '엔비디아',
          quantity: 1,
          avg_price: 900,
          current_value: 900,
        }],
        error: null,
      },
    ]);

    await expect(savePortfolioAsset(client as any, baseInput, 'timeout')).rejects.toThrow(
      '자산 저장 후 검증에 실패했습니다. 잠시 후 다시 시도해주세요.',
    );
  });

  it('rejects negative input values instead of silently coercing them', async () => {
    const { client } = createClient([]);

    await expect(
      savePortfolioAsset(
        client as any,
        { ...baseInput, quantity: -1 },
        'timeout',
      ),
    ).rejects.toThrow('보유 수량 값은 음수일 수 없습니다.');
  });
});
