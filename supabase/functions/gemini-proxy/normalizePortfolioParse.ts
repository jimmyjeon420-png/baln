type GenericRecord = Record<string, unknown>;

const ARRAY_KEYS = [
  'assets',
  'holdings',
  'positions',
  'stocks',
  'items',
  'portfolio',
  'securities',
  'results',
];

const NESTED_KEYS = [
  'data',
  'result',
  'response',
  'payload',
  'portfolio',
  'body',
];

const NAME_KEYS = [
  'name',
  'assetName',
  'stockName',
  'symbolName',
  'itemName',
  'securityName',
  'title',
  '종목명',
  '자산명',
];

const TICKER_KEYS = [
  'ticker',
  'symbol',
  'code',
  'stockCode',
  'securityCode',
  '종목코드',
  '티커',
];

const QUANTITY_KEYS = [
  'quantity',
  'qty',
  'shares',
  'units',
  'holdingQuantity',
  'holdingQty',
  'shareCount',
  'ownedShares',
  'amount',
  '보유수량',
  '수량',
];

const TOTAL_COST_KEYS = [
  'totalCostKRW',
  'totalCost',
  'purchaseAmountKRW',
  'purchaseAmount',
  'buyAmount',
  'costBasis',
  'purchaseCost',
  'investedAmount',
  'bookValue',
  '매수금액',
  '원금',
];

const CURRENT_VALUE_KEYS = [
  'currentValueKRW',
  'currentValue',
  'evaluationAmountKRW',
  'evaluationAmount',
  'valuationAmount',
  'assetValue',
  'marketValueKRW',
  'marketValue',
  'valuation',
  '평가금액',
  '현재가치',
];

const PROFIT_KEYS = [
  'profitLossKRW',
  'profitLoss',
  'pnl',
  'gainLoss',
  'profit',
  'evaluationProfit',
  'profitAmount',
  'gainAmount',
  'unrealizedPnL',
  '평가손익',
  '손익',
];

const TEXT_RESPONSE_KEYS = [
  'text',
  'rawText',
  'responseText',
  'content',
  'output',
  'message',
];

const NAME_EXCLUDE_TERMS = [
  '내 투자',
  '나스닥',
  '환율',
  '평가금액',
  '평가금액 높은 순',
  '현재가',
  '평가금',
  '보유자산',
  '투자손익',
  '거래내역',
  '미체결',
  '자동주문',
  '증권',
  '관심',
  '발견',
  '피드',
  '오늘',
  '어제',
];

function isRecord(value: unknown): value is GenericRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function stripCodeFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function tryParseJsonLikeString(text: string): unknown | null {
  const stripped = stripCodeFences(text);
  if (!stripped) return null;

  const candidates = new Set<string>([stripped]);
  const objectMatch = stripped.match(/\{[\s\S]*\}/);
  const arrayMatch = stripped.match(/\[[\s\S]*\]/);
  if (objectMatch?.[0]) candidates.add(objectMatch[0]);
  if (arrayMatch?.[0]) candidates.add(arrayMatch[0]);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // noop
    }
  }

  return null;
}

function unwrapStructuredPayload(input: unknown, depth = 0): unknown {
  if (depth > 5) return input;

  if (typeof input === 'string') {
    const parsed = tryParseJsonLikeString(input);
    return parsed == null ? input : unwrapStructuredPayload(parsed, depth + 1);
  }

  if (Array.isArray(input)) {
    return input.map((item) => unwrapStructuredPayload(item, depth + 1));
  }

  if (!isRecord(input)) {
    return input;
  }

  const normalized: GenericRecord = {};
  for (const [key, value] of Object.entries(input)) {
    normalized[key] = unwrapStructuredPayload(value, depth + 1);
  }

  return normalized;
}

function looksLikeAssetRecord(value: GenericRecord): boolean {
  return [
    ...NAME_KEYS,
    ...TICKER_KEYS,
    ...QUANTITY_KEYS,
    ...TOTAL_COST_KEYS,
    ...CURRENT_VALUE_KEYS,
    ...PROFIT_KEYS,
  ].some((key) => value[key] != null);
}

function firstDefined(record: GenericRecord, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] != null && record[key] !== '') {
      return record[key];
    }
  }
  return undefined;
}

function withFallbackName(row: GenericRecord, fallbackName: string): GenericRecord {
  if (firstDefined(row, NAME_KEYS) != null) {
    return row;
  }

  return {
    ...row,
    name: fallbackName,
  };
}

function collectAssetRows(input: unknown): GenericRecord[] {
  if (typeof input === 'string') {
    const parsed = tryParseJsonLikeString(input);
    return parsed == null ? [] : collectAssetRows(parsed);
  }

  if (Array.isArray(input)) {
    return input.filter(isRecord);
  }

  if (!isRecord(input)) {
    return [];
  }

  for (const key of ARRAY_KEYS) {
    const candidate = input[key];
    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord);
    }
    if (isRecord(candidate)) {
      const objectRows = Object.entries(candidate)
        .filter(([, value]) => isRecord(value) && looksLikeAssetRecord(value))
        .map(([entryKey, value]) => withFallbackName(value as GenericRecord, entryKey));
      if (objectRows.length > 0) {
        return objectRows;
      }
    }
  }

  for (const key of NESTED_KEYS) {
    const candidate = input[key];
    const nestedRows = collectAssetRows(candidate);
    if (nestedRows.length > 0) {
      return nestedRows;
    }
  }

  if (looksLikeAssetRecord(input)) {
    return [input];
  }

  const directRows = Object.entries(input)
    .filter(([, value]) => isRecord(value) && looksLikeAssetRecord(value))
    .map(([entryKey, value]) => withFallbackName(value as GenericRecord, entryKey));
  if (directRows.length > 0) {
    return directRows;
  }

  return [];
}

function normalizeAssetRow(row: GenericRecord): GenericRecord {
  const normalized: GenericRecord = {};

  const name = firstDefined(row, NAME_KEYS);
  const ticker = firstDefined(row, TICKER_KEYS);
  const quantity = firstDefined(row, QUANTITY_KEYS);
  const totalCostKRW = firstDefined(row, TOTAL_COST_KEYS);
  const currentValueKRW = firstDefined(row, CURRENT_VALUE_KEYS);
  const profitLossKRW = firstDefined(row, PROFIT_KEYS);

  if (name != null) normalized.name = name;
  if (ticker != null) normalized.ticker = ticker;
  if (quantity != null) normalized.quantity = quantity;
  if (totalCostKRW != null) normalized.totalCostKRW = totalCostKRW;
  if (currentValueKRW != null) normalized.currentValueKRW = currentValueKRW;
  if (profitLossKRW != null) normalized.profitLossKRW = profitLossKRW;

  return normalized;
}

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function sanitizeAssetName(line: string): string {
  return normalizeSpace(
    line
      .replace(/^[-*•\d.)\s]+/, '')
      .replace(/[|/]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
  );
}

function isLikelyAssetName(line: string): boolean {
  const rawNormalized = normalizeSpace(line);
  const normalized = sanitizeAssetName(line);
  if (!normalized || normalized.length > 50) return false;
  if (!/[A-Za-z가-힣]/.test(normalized)) return false;
  if (/[₩$€£]/.test(normalized)) return false;
  if (/\d[\d,]*(?:\.\d+)?\s*원/.test(rawNormalized)) return false;
  if (/[+-]\d[\d,]*(?:\.\d+)?/.test(rawNormalized)) return false;
  if (/\d[\d,]*(?:\.\d+)?\s*(?:주|shares?)/i.test(rawNormalized)) return false;
  if (/^(?:주|shares?)$/i.test(normalized)) return false;

  return !NAME_EXCLUDE_TERMS.some((term) => normalized.includes(term));
}

function extractQuantityToken(text: string): string | undefined {
  const matched = text.match(/([+-]?\d[\d,]*(?:\.\d+)?)\s*(?:주|shares?)/i);
  return matched?.[0] ? normalizeSpace(matched[0]) : undefined;
}

function isBareQuantityLine(line: string): boolean {
  const normalized = normalizeSpace(line);
  if (!normalized) return false;
  if (/[A-Za-z가-힣]/.test(normalized)) return false;
  if (/[₩$€£%]/.test(normalized)) return false;
  if (/^[+-]/.test(normalized)) return false;
  if (/[(),]/.test(normalized) && !/^\d{1,3}(?:,\d{3})+$/.test(normalized)) return false;

  const plain = normalized.replace(/,/g, '');
  if (!/^\d+(?:\.\d+)?$/.test(plain)) return false;

  const integerDigits = plain.split('.')[0]?.length ?? 0;
  return integerDigits <= 4;
}

function extractBareQuantity(lines: string[]): string | undefined {
  const candidate = lines.find((line) => isBareQuantityLine(line));
  if (!candidate) return undefined;

  const normalized = normalizeSpace(candidate).replace(/,/g, '');
  return `${normalized}주`;
}

function isBareMoneyLine(line: string): boolean {
  const normalized = normalizeSpace(line);
  if (!normalized) return false;
  if (/[A-Za-z가-힣]/.test(normalized)) return false;
  if (/%/.test(normalized)) return false;
  if (/^[+-]/.test(normalized)) return false;

  const withoutCurrency = normalized.replace(/[₩$€£\s]/g, '');
  const plain = withoutCurrency.replace(/,/g, '');
  if (!/^\d+(?:\.\d+)?$/.test(plain)) return false;

  if (normalized.includes(',')) {
    return /^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(withoutCurrency);
  }

  const integerDigits = plain.split('.')[0]?.length ?? 0;
  return integerDigits >= 5;
}

function extractMoneyMatches(text: string): { value: string; signed: boolean }[] {
  const matches = Array.from(text.matchAll(/([+-]?\d[\d,]*(?:\.\d+)?)\s*원?/g))
    .map((match) => normalizeSpace(match[1] ?? ''))
    .filter(Boolean)
    .filter((raw) => {
      const plain = raw.replace(/[+-]/g, '').replace(/,/g, '');
      if (!plain || !/^\d+(?:\.\d+)?$/.test(plain)) return false;
      if (!raw.includes(',')) return false;
      return raw.replace(/^[+-]/, '').split('.')[0]?.length >= 5;
    });

  return matches
    .map((match) => ({
      value: `${match}원`,
      signed: match.startsWith('+') || match.startsWith('-'),
    }))
    .filter(({ value }) => value !== '원');
}

function extractProfitLossToken(text: string): string | undefined {
  const matched = text.match(/[+-]\d[\d,]*(?:\.\d+)?(?:\s*\([^)]+%\))?/);
  return matched?.[0] ? normalizeSpace(matched[0]) : undefined;
}

function extractInlineAssetRow(line: string): GenericRecord | null {
  const matched = line.match(
    /^([A-Za-z0-9&().,'\-가-힣 ]+?)\s+([+-]?\d[\d,]*(?:\.\d+)?)(?:\s*(?:주|shares?))?\s+([+-]?\d[\d,]*(?:\.\d+)?)(?:\s*원)?\s+([+-]\d[\d,]*(?:\.\d+)?(?:\s*\([^)]+%\))?)$/i
  );
  if (!matched) return null;

  const [, rawName, quantity, currentValue, profitLoss] = matched;
  const name = sanitizeAssetName(rawName);
  if (!isLikelyAssetName(name)) return null;

  return {
    name,
    quantity,
    currentValueKRW: `${currentValue}원`,
    profitLossKRW: profitLoss,
  };
}

function parseLooseTextAssets(text: string): GenericRecord[] {
  const lines = text
    .replace(/```json|```/gi, '')
    .split(/\r?\n/)
    .map((line) => normalizeSpace(line))
    .filter(Boolean);

  const rows: GenericRecord[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    const inlineRow = extractInlineAssetRow(line);
    if (inlineRow) {
      const key = String(inlineRow.name).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        rows.push(inlineRow);
      }
      continue;
    }

    if (!isLikelyAssetName(line)) continue;

    const name = sanitizeAssetName(line);
    const key = name.toLowerCase();
    if (seen.has(key)) continue;

    const blockLines = [line];
    for (let offset = 1; offset <= 3 && index + offset < lines.length; offset += 1) {
      const candidate = lines[index + offset];
      if (offset > 1 && isLikelyAssetName(candidate)) break;
      blockLines.push(candidate);
      if (
        extractQuantityToken(candidate)
        || extractMoneyMatches(candidate).length > 0
        || /[+-]\d[\d,]*(?:\.\d+)?(?:\s*\([^)]+%\))?/.test(candidate)
      ) {
        continue;
      }
    }

    const blockText = blockLines.join(' ');
    const detailLines = blockLines.slice(1);
    const quantity = extractQuantityToken(blockText) || extractBareQuantity(detailLines);
    const moneyMatches = extractMoneyMatches(blockText);
    const bareMoney = detailLines.find((candidate) => isBareMoneyLine(candidate));
    const currentValue = moneyMatches.find(({ signed }) => !signed)?.value
      || (bareMoney ? `${normalizeSpace(bareMoney)}원` : undefined);
    const profitLoss = extractProfitLossToken(blockText);

    if (!quantity || (!currentValue && !profitLoss)) continue;

    seen.add(key);
    rows.push({
      name,
      quantity,
      ...(currentValue ? { currentValueKRW: currentValue } : {}),
      ...(profitLoss ? { profitLossKRW: profitLoss } : {}),
    });
  }

  return rows;
}

function extractTextResponse(payload: unknown): string | null {
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    return trimmed || null;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const nested = extractTextResponse(item);
      if (nested) return nested;
    }
    return null;
  }

  if (!isRecord(payload)) return null;

  for (const key of TEXT_RESPONSE_KEYS) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  for (const key of NESTED_KEYS) {
    const nested = extractTextResponse(payload[key]);
    if (nested) return nested;
  }

  for (const value of Object.values(payload)) {
    const nested = extractTextResponse(value);
    if (nested) return nested;
  }

  return null;
}

export function normalizeParsedPortfolioScreenshotPayload(payload: unknown): { assets: GenericRecord[] } {
  const normalizedPayload = unwrapStructuredPayload(payload);

  const objectRows = collectAssetRows(normalizedPayload)
    .map(normalizeAssetRow)
    .filter((row) => Object.keys(row).length > 0);

  if (objectRows.length > 0) {
    return { assets: objectRows };
  }

  const textPayload = extractTextResponse(normalizedPayload);
  if (!textPayload) {
    return { assets: [] };
  }

  const textRows = parseLooseTextAssets(textPayload)
    .map(normalizeAssetRow)
    .filter((row) => Object.keys(row).length > 0);

  return { assets: textRows };
}
