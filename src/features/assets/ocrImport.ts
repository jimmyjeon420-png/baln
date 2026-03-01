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

function roundToPrecision(value: number, digits: number = 12): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function parseOcrNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== 'string') return 0;

  const trimmed = value.trim();
  if (!trimmed) return 0;
  const unitMultiplier = trimmed.includes('억원')
    ? 100_000_000
    : trimmed.includes('만원')
      ? 10_000
      : trimmed.includes('천원')
        ? 1_000
        : 1;

  const normalized = trimmed
    .replace(/,/g, '')
    .replace(/[₩$€£]/g, '')
    .replace(/억원|만원|천원|원|주|shares?|share|usd|krw/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const matched = normalized.match(/[+-]?\d+(?:\.\d+)?/);
  if (!matched) return 0;

  const num = Number.parseFloat(matched[0]);
  return Number.isFinite(num) ? num * unitMultiplier : 0;
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
  const normalizedAssets = rawAssets
    .map((asset) => normalizeParsedAsset((asset ?? {}) as RawParsedAsset))
    .filter((asset): asset is ParsedAsset => asset !== null);

  const mergedByTicker = new Map<string, ParsedAsset>();

  for (const asset of normalizedAssets) {
    const existing = mergedByTicker.get(asset.ticker);
    if (!existing) {
      mergedByTicker.set(asset.ticker, { ...asset });
      continue;
    }

    existing.quantity = roundToPrecision(existing.quantity + asset.quantity);
    existing.totalCostKRW += asset.totalCostKRW;
    existing.currentValueKRW = (existing.currentValueKRW ?? 0) + (asset.currentValueKRW ?? 0);
  }

  return Array.from(mergedByTicker.values()).map((asset) => ({
    ...asset,
    currentValueKRW: asset.currentValueKRW && asset.currentValueKRW > 0 ? asset.currentValueKRW : undefined,
  }));
}
