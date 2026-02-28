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
  user_id?: string;
  ticker?: string;
  name?: string;
  quantity?: number;
  avg_price?: number;
  current_value?: number;
}

interface PortfolioMutationResult {
  data: PortfolioRowId[] | null;
  error: { message?: string } | null;
}

const VERIFICATION_EPSILON = 0.01;
const SAVE_VERIFICATION_ERROR = '자산 저장 후 검증에 실패했습니다. 잠시 후 다시 시도해주세요.';

export function withTimeout<T>(promise: PromiseLike<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    ),
  ]);
}

function normalizePositiveNumber(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

function isCloseEnough(a: number, b: number): boolean {
  return Math.abs(a - b) <= VERIFICATION_EPSILON;
}

function matchesExpectedRow(row: PortfolioRowId | null, input: SavePortfolioAssetInput): row is PortfolioRowId {
  if (!row?.id) return false;

  const quantity = normalizePositiveNumber(row.quantity ?? 0);
  const avgPrice = normalizePositiveNumber(row.avg_price ?? 0);
  const currentValue = normalizePositiveNumber(row.current_value ?? 0);

  return (
    (row.ticker ?? '').trim() === input.ticker.trim()
    && (row.name ?? '').trim() === input.name.trim()
    && isCloseEnough(quantity, normalizePositiveNumber(input.quantity))
    && isCloseEnough(avgPrice, normalizePositiveNumber(input.avgPrice))
    && isCloseEnough(currentValue, normalizePositiveNumber(input.currentValue))
  );
}

async function findSavedRow(
  client: PortfolioPersistenceClient,
  input: SavePortfolioAssetInput,
  timeoutMessage: string,
  options?: { id?: string | null },
): Promise<PortfolioRowId | null> {
  const fields = 'id, user_id, ticker, name, quantity, avg_price, current_value';

  if (options?.id) {
    const result = await withTimeout<PortfolioMutationResult>(
      client
        .from('portfolios')
        .select(fields)
        .eq('id', options.id)
        .eq('user_id', input.userId)
        .limit(1),
      10000,
      timeoutMessage,
    );

    if (result.error) throw result.error;
    const row = result.data?.[0] ?? null;
    if (!row) return null;
    if (!matchesExpectedRow(row, input)) throw new Error(SAVE_VERIFICATION_ERROR);
    return row;
  }

  const result = await withTimeout<PortfolioMutationResult>(
    client
      .from('portfolios')
      .select(fields)
      .eq('user_id', input.userId)
      .eq('ticker', input.ticker.trim())
      .limit(1),
    10000,
    timeoutMessage,
  );

  if (result.error) throw result.error;
  const row = result.data?.[0] ?? null;
  if (!row) return null;
  if (!matchesExpectedRow(row, input)) throw new Error(SAVE_VERIFICATION_ERROR);
  return row;
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
  const sanitizedInput = {
    ...input,
    ticker: input.ticker.trim(),
    name: input.name.trim(),
    quantity: normalizePositiveNumber(input.quantity),
    avgPrice: normalizePositiveNumber(input.avgPrice),
    currentValue: normalizePositiveNumber(input.currentValue),
  };

  const basePayload = {
    ticker: sanitizedInput.ticker,
    name: sanitizedInput.name,
    quantity: sanitizedInput.quantity,
    avg_price: sanitizedInput.avgPrice,
    current_price: sanitizedInput.avgPrice,
    current_value: sanitizedInput.currentValue,
    target_allocation: 0,
    asset_type: 'liquid' as const,
    currency: sanitizedInput.currency,
  };

  const updateById = async (id: string) => {
    const result = await withTimeout<PortfolioMutationResult>(
      client
        .from('portfolios')
        .update(basePayload)
        .eq('id', id)
        .eq('user_id', sanitizedInput.userId)
        .select('id, user_id, ticker, name, quantity, avg_price, current_value'),
      15000,
      timeoutMessage,
    );
    const { data, error } = result;

    if (error) throw error;
    const updated = data?.[0] ?? null;
    if (matchesExpectedRow(updated, sanitizedInput)) return updated;
    return findSavedRow(client, sanitizedInput, timeoutMessage, { id });
  };

  if (sanitizedInput.existingId) {
    const updated = await updateById(sanitizedInput.existingId);
    if (updated) return updated;
  }

  const lookupResult = await withTimeout<PortfolioMutationResult>(
    client
      .from('portfolios')
      .select('id, user_id, ticker, name, quantity, avg_price, current_value')
      .eq('user_id', sanitizedInput.userId)
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
        user_id: sanitizedInput.userId,
        ...basePayload,
      })
      .select('id, user_id, ticker, name, quantity, avg_price, current_value'),
    15000,
    timeoutMessage,
  );
  const { data, error } = insertResult;

  if (error) throw error;
  const inserted = data?.[0] ?? null;
  if (matchesExpectedRow(inserted, sanitizedInput)) return inserted;

  const verified = await findSavedRow(client, sanitizedInput, timeoutMessage);
  if (verified) return verified;

  throw new Error(SAVE_VERIFICATION_ERROR);
}
