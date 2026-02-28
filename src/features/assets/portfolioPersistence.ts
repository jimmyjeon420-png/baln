export interface SavePortfolioAssetInput {
  userId: string;
  ticker: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentValue: number;
  currency: 'KRW' | 'USD';
  existingId?: string | null;
}

export interface PortfolioPersistenceClient {
  from: (table: 'portfolios') => any;
}

interface PortfolioRowId {
  id: string;
}

interface PortfolioMutationResult {
  data: PortfolioRowId[] | null;
  error: { message?: string } | null;
}

export function withTimeout<T>(promise: PromiseLike<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    ),
  ]);
}

/**
 * 자산 저장 안정화 로직
 * - update(existingId) 우선
 * - 실패 시 동일 ticker 조회 후 update
 * - 그래도 없으면 insert
 */
export async function savePortfolioAsset(
  client: PortfolioPersistenceClient,
  input: SavePortfolioAssetInput,
  timeoutMessage: string,
) {
  const basePayload = {
    ticker: input.ticker.trim(),
    name: input.name.trim(),
    quantity: input.quantity,
    avg_price: input.avgPrice,
    current_price: input.avgPrice,
    current_value: input.currentValue,
    target_allocation: 0,
    asset_type: 'liquid' as const,
    currency: input.currency,
  };

  const updateById = async (id: string) => {
    const result = await withTimeout<PortfolioMutationResult>(
      client
        .from('portfolios')
        .update(basePayload)
        .eq('id', id)
        .eq('user_id', input.userId)
        .select('id'),
      15000,
      timeoutMessage,
    );
    const { data, error } = result;

    if (error) throw error;
    return data?.[0] ?? null;
  };

  if (input.existingId) {
    const updated = await updateById(input.existingId);
    if (updated) return updated;
  }

  const lookupResult = await withTimeout<PortfolioMutationResult>(
    client
      .from('portfolios')
      .select('id')
      .eq('user_id', input.userId)
      .eq('ticker', basePayload.ticker)
      .limit(1),
    10000,
    timeoutMessage,
  );
  const { data: byTicker, error: tickerLookupError } = lookupResult;

  if (tickerLookupError) throw tickerLookupError;

  const targetId = byTicker?.[0]?.id;
  if (targetId) {
    const updated = await updateById(targetId);
    if (updated) return updated;
  }

  const insertResult = await withTimeout<PortfolioMutationResult>(
    client
      .from('portfolios')
      .insert({
        user_id: input.userId,
        ...basePayload,
      })
      .select('id'),
    15000,
    timeoutMessage,
  );
  const { data, error } = insertResult;

  if (error) throw error;
  return data?.[0] ?? null;
}
