/**
 * useNewsPortfolioMatch — 뉴스 태그와 내 포트폴리오 교차 매칭 훅
 *
 * 역할: "내 보유자산과 관련된 뉴스인지" 판별하는 부서
 * - news.tags[]와 portfolio tickers[] 교집합 계산
 * - 관련 자산의 비중(%) 계산
 * - "이 뉴스는 당신의 BTC, ETH에 영향을 줄 수 있습니다" 메시지 생성
 */

import { useMemo } from 'react';
import { useSharedPortfolio } from './useSharedPortfolio';

export interface MatchedAsset {
  name: string;
  ticker: string;
  weight: number; // 0~100 (%)
}

export interface NewsPortfolioMatch {
  matchedAssets: MatchedAsset[];
  totalExposure: number; // 관련 자산 합산 비중 (%)
  hasMatch: boolean;
}

export interface PortfolioMatchAsset {
  ticker?: string | null;
  name?: string | null;
  currentValue?: number | null;
}

const TAG_ALIAS_MAP: Record<string, string[]> = {
  BTC: ['비트코인', 'bitcoin'],
  ETH: ['이더리움', 'ethereum'],
  SOL: ['솔라나', 'solana'],
  XRP: ['리플'],
  NVDA: ['엔비디아', 'nvidia'],
  TSLA: ['테슬라', 'tesla'],
  AAPL: ['애플', 'apple'],
  MSFT: ['마이크로소프트', 'microsoft'],
  AMZN: ['아마존', 'amazon'],
  GOOGL: ['구글', '알파벳'],
  META: ['메타', '페이스북'],
  SPY: ['s&p500', 's&p 500'],
  QQQ: ['나스닥100', 'nasdaq100'],
  '005930': ['삼성전자'],
  '000660': ['sk하이닉스', '하이닉스'],
};

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9가-힣]/g, '');
}

function normalizeTicker(value: string): string {
  return value.replace(/\.KS$/i, '').toUpperCase();
}

function buildExpandedTagSet(newsTags: string[]): Set<string> {
  const expanded = new Set<string>();

  for (const tag of newsTags || []) {
    if (!tag) continue;
    const normalizedTag = normalizeToken(tag);
    if (normalizedTag) expanded.add(normalizedTag);

    const ticker = normalizeTicker(tag);
    if (ticker) {
      expanded.add(normalizeToken(ticker));
      const aliases = TAG_ALIAS_MAP[ticker] || [];
      for (const alias of aliases) {
        const normalizedAlias = normalizeToken(alias);
        if (normalizedAlias) expanded.add(normalizedAlias);
      }
    }
  }

  return expanded;
}

export function computeNewsPortfolioMatch(
  newsTags: string[],
  assets: PortfolioMatchAsset[],
  liquidTotal: number
): NewsPortfolioMatch {
  if (!newsTags || newsTags.length === 0 || assets.length === 0) {
    return { matchedAssets: [], totalExposure: 0, hasMatch: false };
  }

  const tagSet = buildExpandedTagSet(newsTags);
  const matched: MatchedAsset[] = [];

  for (const asset of assets) {
    const rawTicker = asset.ticker || '';
    if (rawTicker.startsWith('RE_')) continue;

    const ticker = normalizeTicker(rawTicker);
    const normalizedTicker = normalizeToken(ticker);
    const normalizedName = normalizeToken(asset.name || '');
    const aliasList = TAG_ALIAS_MAP[ticker] || [];
    const normalizedAliases = aliasList.map(normalizeToken).filter(Boolean);

    const matchCandidates = [normalizedTicker, normalizedName, ...normalizedAliases].filter(Boolean);
    const isMatch = matchCandidates.some((candidate) => {
      if (tagSet.has(candidate)) return true;
      // 부분 매칭은 오탐 방지를 위해 3글자 이상만 허용
      if (candidate.length < 3) return false;
      for (const tag of tagSet) {
        if (tag.length < 3) continue;
        if (tag.includes(candidate) || candidate.includes(tag)) return true;
      }
      return false;
    });

    if (isMatch) {
      const value = asset.currentValue || 0;
      const weight = liquidTotal > 0 ? (value / liquidTotal) * 100 : 0;
      matched.push({
        name: asset.name || asset.ticker || '알 수 없음',
        ticker: asset.ticker || '',
        weight: Math.round(weight * 10) / 10,
      });
    }
  }

  matched.sort((a, b) => b.weight - a.weight);
  const totalExposure = matched.reduce((sum, m) => sum + m.weight, 0);

  return {
    matchedAssets: matched,
    totalExposure: Math.round(totalExposure * 10) / 10,
    hasMatch: matched.length > 0,
  };
}

/**
 * 뉴스 태그와 포트폴리오 티커 매칭
 * ticker 완전 일치 + 한국어 종목명 포함 검사
 */
export function useNewsPortfolioMatch(newsTags: string[]): NewsPortfolioMatch {
  const { assets, liquidTotal } = useSharedPortfolio();

  return useMemo(() => {
    return computeNewsPortfolioMatch(newsTags, assets, liquidTotal);
  }, [newsTags, assets, liquidTotal]);
}
