import { findBestStockMatch } from '../../data/stockList';

export interface ParsedAsset {
  name: string;
  ticker: string;
  quantity: number;
  totalCostKRW: number;
  currentValueKRW?: number;
}

export interface RawParsedAsset {
  name?: unknown;
  ticker?: unknown;
  quantity?: unknown;
  qty?: unknown;
  shares?: unknown;
  units?: unknown;
  holdingQuantity?: unknown;
  amount?: unknown;
  totalCostKRW?: unknown;
  totalCost?: unknown;
  purchaseAmountKRW?: unknown;
  purchaseAmount?: unknown;
  buyAmount?: unknown;
  costBasis?: unknown;
  currentValueKRW?: unknown;
  currentValue?: unknown;
  evaluationAmountKRW?: unknown;
  evaluationAmount?: unknown;
  marketValue?: unknown;
  valuation?: unknown;
  profitLossKRW?: unknown;
  profitLoss?: unknown;
  pnl?: unknown;
  gainLoss?: unknown;
  profit?: unknown;
}

export function parseOcrNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== 'string') return 0;

  const trimmed = value.trim();
  if (!trimmed) return 0;

  const normalized = trimmed
    .replace(/,/g, '')
    .replace(/[₩$€£]/g, '')
    .replace(/원|주|shares?|share|usd|krw/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const matched = normalized.match(/[+-]?\d+(?:\.\d+)?/);
  if (!matched) return 0;

  const num = Number.parseFloat(matched[0]);
  return Number.isFinite(num) ? num : 0;
}

export function normalizeParsedAsset(raw: RawParsedAsset): ParsedAsset | null {
  const rawName = typeof raw.name === 'string' ? raw.name.trim() : '';
  const rawTicker = typeof raw.ticker === 'string' ? raw.ticker.trim() : '';
  const matched = findBestStockMatch(rawName, rawTicker);

  const quantity = parseOcrNumber(raw.quantity ?? raw.qty ?? raw.shares ?? raw.units ?? raw.holdingQuantity ?? raw.amount);
  const currentValueKRW = parseOcrNumber(
    raw.currentValueKRW
      ?? raw.currentValue
      ?? raw.evaluationAmountKRW
      ?? raw.evaluationAmount
      ?? raw.marketValue
      ?? raw.valuation
  );

  let totalCostKRW = parseOcrNumber(
    raw.totalCostKRW
      ?? raw.totalCost
      ?? raw.purchaseAmountKRW
      ?? raw.purchaseAmount
      ?? raw.buyAmount
      ?? raw.costBasis
  );

  const profitLossKRW = parseOcrNumber(raw.profitLossKRW ?? raw.profitLoss ?? raw.pnl ?? raw.gainLoss ?? raw.profit);
  if (totalCostKRW <= 0 && currentValueKRW > 0 && profitLossKRW !== 0) {
    totalCostKRW = Math.max(0, currentValueKRW - profitLossKRW);
  }

  const ticker = matched?.ticker ?? rawTicker;
  const name = matched?.name ?? rawName;

  if (!ticker || !name || quantity <= 0) return null;

  return {
    ticker,
    name,
    quantity,
    totalCostKRW,
    currentValueKRW: currentValueKRW > 0 ? currentValueKRW : undefined,
  };
}

export function normalizeParsedAssets(rawAssets: unknown): ParsedAsset[] {
  if (!Array.isArray(rawAssets)) return [];
  return rawAssets
    .map((asset) => normalizeParsedAsset((asset ?? {}) as RawParsedAsset))
    .filter((asset): asset is ParsedAsset => asset !== null);
}
