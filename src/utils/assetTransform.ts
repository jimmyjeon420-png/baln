/**
 * Asset 타입과 Supabase DB Row 간의 변환 유틸리티
 * Web과 App 간 데이터 일관성을 유지
 */

import { Asset, AssetType } from '../types/asset';
import { Database } from '../types/database';

type PortfolioRow = Database['public']['Tables']['portfolios']['Row'];
type PortfolioInsert = Database['public']['Tables']['portfolios']['Insert'];

/**
 * Supabase DB Row → Asset 타입 변환
 * @param row Supabase portfolios 테이블 Row
 * @returns Asset 객체
 */
export const transformDbRowToAsset = (row: PortfolioRow): Asset => {
  // NaN 방어: Number()가 NaN을 반환하면 0 또는 undefined로 대체
  const safeNumber = (val: unknown): number => {
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
  };
  const safeOptionalNumber = (val: unknown): number | undefined => {
    if (val === null || val === undefined) return undefined;
    const n = Number(val);
    return Number.isFinite(n) ? n : undefined;
  };

  return {
    id: row.id,
    name: row.name,
    currentValue: safeNumber(row.current_value),
    targetAllocation: safeNumber(row.target_allocation),
    createdAt: new Date(row.created_at).getTime(),
    assetType: (row.asset_type === 'liquid' ? AssetType.LIQUID : AssetType.ILLIQUID),

    // 주식 관련 필드 (NaN 방어 적용)
    ticker: row.ticker ?? undefined,
    quantity: safeOptionalNumber(row.quantity),
    avgPrice: safeOptionalNumber(row.avg_price),
    currentPrice: safeOptionalNumber(row.current_price),

    // Tax 관련
    costBasis: safeOptionalNumber(row.cost_basis),
    purchaseDate: row.purchase_date ? new Date(row.purchase_date).getTime() : undefined,
    customTaxRate: safeOptionalNumber(row.custom_tax_rate),

    // 부동산 레버리지
    debtAmount: safeOptionalNumber(row.debt_amount),

    // 메타데이터
    currency: row.currency,
    notes: row.notes ?? undefined,
  };
};

/**
 * 통화 정밀도 보정 함수 (부동소수점 오류 방지)
 * CRITICAL: 19.2조원 오류 방지를 위한 수학적 안전장치
 * @param value 숫자 값
 * @param decimals 소수점 자릿수 (기본 2 - 원화 기준)
 * @returns 반올림된 숫자
 */
const roundCurrency = (value: number | undefined | null, decimals: number = 2): number | null => {
  if (value === undefined || value === null || !Number.isFinite(value)) return null;
  // 부동소수점 오류 방지: 10^decimals 곱한 후 반올림, 다시 나누기
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
};

/**
 * Asset → Supabase Insert 객체 변환
 * @param asset Asset 객체
 * @param userId 사용자 ID (auth.uid())
 * @returns Supabase Insert 객체
 *
 * CRITICAL: 수학적 정밀도 보장
 * - 모든 금액은 roundCurrency()로 처리
 * - NaN, Infinity 값 자동 필터링
 * - 19.2조원 오류 방지
 */
export const transformAssetToDbRow = (asset: Omit<Asset, 'id' | 'createdAt'>, userId: string): PortfolioInsert => {
  // current_value 계산: quantity * current_price가 있으면 사용, 없으면 asset.currentValue 사용
  let currentValue = asset.currentValue;
  if (asset.quantity && asset.currentPrice && asset.quantity > 0 && asset.currentPrice > 0) {
    currentValue = asset.quantity * asset.currentPrice;
  }

  // cost_basis 계산: quantity * avgPrice가 있으면 사용, 없으면 asset.costBasis 사용
  let costBasis = asset.costBasis;
  if (asset.quantity && asset.avgPrice && asset.quantity > 0 && asset.avgPrice > 0) {
    costBasis = asset.quantity * asset.avgPrice;
  }

  // 이상값 검증 (음수, NaN, Infinity 방지)
  const safeCurrentValue = roundCurrency(currentValue) ?? 0;
  const safeCostBasis = roundCurrency(costBasis);

  // CRITICAL: 비정상적으로 큰 값 감지 (100조원 초과 = 오류로 간주)
  const MAX_REASONABLE_VALUE = 100_000_000_000_000; // 100조 KRW
  if (safeCurrentValue > MAX_REASONABLE_VALUE) {
    console.error(`[CRITICAL] 비정상 자산 가치 감지: ${safeCurrentValue}원 - 자동 보정 필요`);
    throw new Error(`비정상적인 자산 가치가 감지되었습니다: ${safeCurrentValue.toLocaleString()}원. 입력 데이터를 확인해주세요.`);
  }

  return {
    user_id: userId,
    name: asset.name,
    current_value: safeCurrentValue,
    target_allocation: asset.targetAllocation,
    asset_type: asset.assetType === AssetType.LIQUID ? 'liquid' : 'illiquid',

    // 주식 관련 필드 (소수점 8자리까지 허용 - 소수점 주식 지원)
    ticker: asset.ticker ?? null,
    quantity: asset.quantity ? roundCurrency(asset.quantity, 8) : null,
    avg_price: asset.avgPrice ? roundCurrency(asset.avgPrice, 2) : null,
    current_price: asset.currentPrice ? roundCurrency(asset.currentPrice, 2) : null,

    // Tax 관련
    cost_basis: safeCostBasis,
    purchase_date: asset.purchaseDate ? new Date(asset.purchaseDate).toISOString() : null,
    custom_tax_rate: asset.customTaxRate,

    // 메타데이터 - 기본값 KRW (화면 표시 통화 기준)
    currency: (asset.currency as 'KRW' | 'USD' | 'EUR' | 'JPY') || 'KRW',
    display_currency: 'KRW', // 항상 KRW (외부 환율 변환 금지)
    notes: asset.notes ?? null,
  };
};

/**
 * 여러 DB Row들을 Asset 배열로 변환
 * @param rows Supabase portfolios 테이블 Rows
 * @returns Asset 배열
 */
export const transformDbRowsToAssets = (rows: PortfolioRow[]): Asset[] => {
  return rows.map(transformDbRowToAsset);
};
