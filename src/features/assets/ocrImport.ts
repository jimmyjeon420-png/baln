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
  assetName?: unknown;
  stockName?: unknown;
  ticker?: unknown;
  symbol?: unknown;
  code?: unknown;
  quantity?: unknown;
  qty?: unknown;
  shares?: unknown;
  units?: unknown;
  holdingQuantity?: unknown;
  holdingQty?: unknown;
  shareCount?: unknown;
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
  valuationAmount?: unknown;
  marketValue?: unknown;
  valuation?: unknown;
  profitLossKRW?: unknown;
  profitLoss?: unknown;
  pnl?: unknown;
  gainLoss?: unknown;
  profit?: unknown;
  evaluationProfit?: unknown;
}

type RawAssetCollection = RawParsedAsset[] | Record<string, unknown> | null | undefined;

const ASSET_ARRAY_KEYS = [
  'assets',
  'holdings',
  'positions',
  'stocks',
  'items',
  'portfolio',
  'securities',
  'results',
];

const NESTED_PAYLOAD_KEYS = [
  'data',
  'result',
  'response',
  'payload',
  'portfolio',
  'body',
  'text',
  'rawText',
  'content',
];

function roundToPrecision(value: number, digits: number = 12): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function looksLikeAssetRecord(value: Record<string, unknown>): boolean {
  return [
    value.name,
    value.assetName,
    value.stockName,
    value.ticker,
    value.symbol,
    value.code,
    value.quantity,
    value.qty,
    value.shares,
    value.units,
    value.holdingQuantity,
    value.holdingQty,
    value.shareCount,
    value.currentValueKRW,
    value.currentValue,
    value.evaluationAmountKRW,
    value.evaluationAmount,
    value.valuationAmount,
    value.marketValue,
    value.valuation,
    value.totalCostKRW,
    value.totalCost,
    value.purchaseAmountKRW,
    value.purchaseAmount,
    value.buyAmount,
    value.costBasis,
    value.profitLossKRW,
    value.profitLoss,
    value.pnl,
    value.gainLoss,
    value.profit,
    value.evaluationProfit,
  ].some((field) => field != null && field !== '');
}

function withFallbackName(value: Record<string, unknown>, fallbackName: string): RawParsedAsset {
  if (typeof value.name === 'string' && value.name.trim()) return value as RawParsedAsset;
  if (typeof value.assetName === 'string' && value.assetName.trim()) return value as RawParsedAsset;
  if (typeof value.stockName === 'string' && value.stockName.trim()) return value as RawParsedAsset;
  return {
    ...value,
    name: fallbackName,
  };
}

function tryParseJson(text: string): unknown | null {
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  if (!stripped) return null;
  for (const candidate of [stripped, stripped.match(/\{[\s\S]*\}/)?.[0], stripped.match(/\[[\s\S]*\]/)?.[0]]) {
    if (!candidate) continue;
    try { return JSON.parse(candidate); } catch { /* noop */ }
  }
  return null;
}

function parseTextAsAssetRows(text: string): RawParsedAsset[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const rows: RawParsedAsset[] = [];
  const NAME_EXCLUDE = ['내 투자', '평가금액', '보유자산', '투자손익', '증권', '관심', '나스닥', '환율'];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // 이름 후보: 한글/영문 포함, 숫자로만 된 줄 아님, 금액 패턴 아님
    if (!/[A-Za-z가-힣]/.test(line)) continue;
    if (/[₩$€£]/.test(line)) continue;
    if (/^\d[\d,]*(?:\.\d+)?\s*원/.test(line)) continue;
    if (/^[+-]\d/.test(line)) continue;
    if (line.length > 50) continue;
    if (NAME_EXCLUDE.some(t => line.includes(t))) continue;

    // 다음 1~3줄에서 수량/금액/손익 추출
    const details: string[] = [];
    for (let j = 1; j <= 3 && i + j < lines.length; j++) {
      const next = lines[i + j];
      if (/[A-Za-z가-힣]/.test(next) && !/주|shares?/i.test(next)) break;
      details.push(next);
    }
    if (details.length === 0) continue;

    const block = [line, ...details].join(' ');
    const qtyMatch = block.match(/(\d[\d,]*(?:\.\d+)?)\s*(?:주|shares?)/i);
    const moneyMatches = [...block.matchAll(/([+-]?\d[\d,]{4,}(?:\.\d+)?)\s*원?/g)].map(m => m[1]);
    // 수량이 없으면 bare number (4자리 이하) 시도
    let quantity = qtyMatch?.[0];
    if (!quantity) {
      const bareQty = details.find(d => /^\d{1,4}(?:\.\d+)?$/.test(d.replace(/,/g, '')));
      if (bareQty) quantity = `${bareQty.replace(/,/g, '')}주`;
    }
    if (!quantity) continue;

    const unsigned = moneyMatches.filter(m => !m.startsWith('+') && !m.startsWith('-'));
    const signed = moneyMatches.filter(m => m.startsWith('+') || m.startsWith('-'));
    const currentValue = unsigned[0] ? `${unsigned[0]}원` : undefined;
    const profitLoss = signed[0];

    if (!currentValue && !profitLoss) continue;

    rows.push({
      name: line.replace(/^[-*•\d.)\s]+/, '').trim(),
      quantity,
      ...(currentValue ? { currentValueKRW: currentValue } : {}),
      ...(profitLoss ? { profitLossKRW: profitLoss } : {}),
    } as RawParsedAsset);
  }
  return rows;
}

function collectRawAssetRows(input: RawAssetCollection): RawParsedAsset[] {
  if (Array.isArray(input)) {
    return input.filter(isRecord) as RawParsedAsset[];
  }

  if (!isRecord(input)) {
    // 문자열이면 JSON 파싱 시도 → 실패 시 텍스트 기반 추출
    if (typeof input === 'string') {
      const parsed = tryParseJson(input);
      if (parsed != null) return collectRawAssetRows(parsed as RawAssetCollection);
      return parseTextAsAssetRows(input);
    }
    return [];
  }

  for (const key of ASSET_ARRAY_KEYS) {
    const candidate = input[key];
    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord) as RawParsedAsset[];
    }
    if (isRecord(candidate)) {
      const objectRows = Object.entries(candidate)
        .filter(([, value]) => isRecord(value) && looksLikeAssetRecord(value))
        .map(([entryKey, value]) => withFallbackName(value as Record<string, unknown>, entryKey));
      if (objectRows.length > 0) {
        return objectRows;
      }
    }
  }

  for (const key of NESTED_PAYLOAD_KEYS) {
    const nestedRows = collectRawAssetRows(input[key] as RawAssetCollection);
    if (nestedRows.length > 0) {
      return nestedRows;
    }
  }

  const directRows = Object.entries(input)
    .filter(([, value]) => isRecord(value) && looksLikeAssetRecord(value))
    .map(([entryKey, value]) => withFallbackName(value as Record<string, unknown>, entryKey));
  if (directRows.length > 0) {
    return directRows;
  }

  return looksLikeAssetRecord(input) ? [input as RawParsedAsset] : [];
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
  const rawNameCandidate = raw.name ?? raw.assetName ?? raw.stockName;
  const rawTickerCandidate = raw.ticker ?? raw.symbol ?? raw.code;
  const rawName = typeof rawNameCandidate === 'string' ? rawNameCandidate.trim() : '';
  const rawTicker = typeof rawTickerCandidate === 'string' ? rawTickerCandidate.trim() : '';
  const matched = findBestStockMatch(rawName, rawTicker);

  const quantity = parseOcrNumber(
    raw.quantity
      ?? raw.qty
      ?? raw.shares
      ?? raw.units
      ?? raw.holdingQuantity
      ?? raw.holdingQty
      ?? raw.shareCount
      ?? raw.amount
  );
  const currentValueKRW = parseOcrNumber(
    raw.currentValueKRW
      ?? raw.currentValue
      ?? raw.evaluationAmountKRW
      ?? raw.evaluationAmount
      ?? raw.valuationAmount
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

  const profitLossKRW = parseOcrNumber(
    raw.profitLossKRW
      ?? raw.profitLoss
      ?? raw.pnl
      ?? raw.gainLoss
      ?? raw.profit
      ?? raw.evaluationProfit
  );
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
  const normalizedAssets = collectRawAssetRows(rawAssets as RawAssetCollection)
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
