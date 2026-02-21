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

/**
 * 뉴스 태그와 포트폴리오 티커 매칭
 * ticker 완전 일치 + 한국어 종목명 포함 검사
 */
export function useNewsPortfolioMatch(newsTags: string[]): NewsPortfolioMatch {
  const { assets, liquidTotal } = useSharedPortfolio();

  return useMemo(() => {
    if (!newsTags || newsTags.length === 0 || assets.length === 0) {
      return { matchedAssets: [], totalExposure: 0, hasMatch: false };
    }

    const tagsLower = newsTags.map(t => t.toLowerCase());

    const matched: MatchedAsset[] = [];
    for (const asset of assets) {
      // 부동산 제외
      if (asset.ticker?.startsWith('RE_')) continue;

      const ticker = (asset.ticker || '').toLowerCase();
      const name = (asset.name || '').toLowerCase();

      const isMatch = tagsLower.some(tag => {
        const tagLower = tag.toLowerCase();
        // 정확한 티커 매칭 (BTC, ETH, NVDA 등)
        if (ticker && ticker === tagLower) return true;
        // 한국어 종목명 포함 (삼성전자, SK하이닉스 등)
        if (name && name.includes(tagLower)) return true;
        if (tagLower && ticker && tagLower.includes(ticker)) return true;
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

    // 비중 높은 순 정렬
    matched.sort((a, b) => b.weight - a.weight);
    const totalExposure = matched.reduce((sum, m) => sum + m.weight, 0);

    return {
      matchedAssets: matched,
      totalExposure: Math.round(totalExposure * 10) / 10,
      hasMatch: matched.length > 0,
    };
  }, [newsTags, assets, liquidTotal]);
}
