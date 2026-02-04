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
  return {
    id: row.id,
    name: row.name,
    currentValue: Number(row.current_value),
    targetAllocation: Number(row.target_allocation),
    createdAt: new Date(row.created_at).getTime(),
    assetType: (row.asset_type === 'liquid' ? AssetType.LIQUID : AssetType.ILLIQUID),

    // 주식 관련 필드
    ticker: row.ticker ?? undefined,
    quantity: row.quantity ? Number(row.quantity) : undefined,
    avgPrice: row.avg_price ? Number(row.avg_price) : undefined,
    currentPrice: row.current_price ? Number(row.current_price) : undefined,

    // Tax 관련
    costBasis: row.cost_basis ? Number(row.cost_basis) : undefined,
    purchaseDate: row.purchase_date ? new Date(row.purchase_date).getTime() : undefined,
    customTaxRate: row.custom_tax_rate ? Number(row.custom_tax_rate) : undefined,

    // 메타데이터
    currency: row.currency,
    notes: row.notes ?? undefined,
  };
};

/**
 * Asset → Supabase Insert 객체 변환
 * @param asset Asset 객체
 * @param userId 사용자 ID (auth.uid())
 * @returns Supabase Insert 객체
 */
export const transformAssetToDbRow = (asset: Omit<Asset, 'id' | 'createdAt'>, userId: string): PortfolioInsert => {
  // current_value 계산: quantity * current_price가 있으면 사용, 없으면 asset.currentValue 사용
  let currentValue = asset.currentValue;
  if (asset.quantity && asset.currentPrice) {
    currentValue = asset.quantity * asset.currentPrice;
  }

  // cost_basis 계산: quantity * avgPrice가 있으면 사용, 없으면 asset.costBasis 사용
  let costBasis = asset.costBasis;
  if (asset.quantity && asset.avgPrice) {
    costBasis = asset.quantity * asset.avgPrice;
  }

  return {
    user_id: userId,
    name: asset.name,
    current_value: currentValue,
    target_allocation: asset.targetAllocation,
    asset_type: asset.assetType === AssetType.LIQUID ? 'liquid' : 'illiquid',

    // 주식 관련 필드
    ticker: asset.ticker ?? null,
    quantity: asset.quantity ? Number(asset.quantity) : null,
    avg_price: asset.avgPrice ? Number(asset.avgPrice) : null,
    current_price: asset.currentPrice ? Number(asset.currentPrice) : null,

    // Tax 관련
    cost_basis: costBasis,
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
