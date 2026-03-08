/**
 * geminiDeepDive.ts — AI 종목 딥다이브 분석
 *
 * gemini.ts에서 분리된 딥다이브 모듈.
 */

import * as Sentry from '@sentry/react-native';
import { getPromptLanguageInstruction, getFinanceTermGuide } from '../utils/promptLanguage';
import { invokeGeminiProxy } from './geminiProxy';
import {
  API_KEY,
  model,
  modelWithSearch,
  callGeminiSafe,
  parseGeminiJson,
  clampNumber,
  toFiniteNumber,
  roundTo,
  sentimentToNumericScore,
  recommendationFromScore,
  isGeminiCredentialError,
  normalizeDeepDiveRecommendation,
  parseKoreanMarketCap,
  inferMarketCapKRW,
  relativeDiff,
  formatKrwCompact,
  normalizeMetricStatus,
  upsertMetric,
  getCurrentDisplayLanguage,
  getCurrencySymbol,
  type DeepDiveRecommendation,
  type DeepDiveSentiment,
} from './geminiCore';

import type {
  DeepDiveInput,
  DeepDiveResult,
} from '../types/marketplace';

// ============================================================================
// Proxy 타입 및 헬퍼
// ============================================================================

interface ProxyDeepDiveResponse {
  name?: string;
  ticker?: string;
  currentPrice?: number;
  change?: number;
  overview?: string;
  marketCap?: number | string;
  per?: number;
  pbr?: number;
  recommendation?: string;
  reason?: string;
  generatedAt?: string;
}

async function generateDeepDiveViaProxy(input: DeepDiveInput): Promise<DeepDiveResult> {
  const proxy = await invokeGeminiProxy<ProxyDeepDiveResponse>(
    'deep-dive',
    {
      ticker: input.ticker,
      currentPrice: input.currentPrice ?? input.fundamentals?.currentPrice,
    },
    30000,
  );
  const recommendation = normalizeDeepDiveRecommendation(proxy.recommendation);
  const sentiment: DeepDiveSentiment =
    recommendation === 'VERY_POSITIVE' ? 'VERY_POSITIVE' :
    recommendation === 'POSITIVE' ? 'POSITIVE' :
    recommendation === 'NEGATIVE' ? 'NEGATIVE' :
    recommendation === 'VERY_NEGATIVE' ? 'VERY_NEGATIVE' :
    'NEUTRAL';

  const financialScore =
    recommendation === 'VERY_POSITIVE' ? 78 :
    recommendation === 'POSITIVE' ? 66 :
    recommendation === 'NEGATIVE' ? 34 :
    recommendation === 'VERY_NEGATIVE' ? 22 :
    50;

  const change = toFiniteNumber(proxy.change);
  const technicalScore = change == null
    ? 50
    : clampNumber(roundTo(50 + (change * 1.8), 1), 20, 85);
  const qualityScore = 50;

  const marketCap = inferMarketCapKRW(input.fundamentals) ?? parseKoreanMarketCap(proxy.marketCap) ?? undefined;
  const per = toFiniteNumber(proxy.per) ?? input.fundamentals?.forwardPE ?? input.fundamentals?.trailingPE ?? undefined;
  const pbr = toFiniteNumber(proxy.pbr) ?? input.fundamentals?.priceToBook ?? undefined;

  const overview = typeof proxy.overview === 'string' && proxy.overview.trim().length > 0
    ? proxy.overview.trim()
    : `${input.name}(${input.ticker})에 대한 서버 프록시 분석 결과입니다.`;

  const reason = typeof proxy.reason === 'string' && proxy.reason.trim().length > 0
    ? proxy.reason.trim()
    : '프록시 응답 기반으로 주요 포인트를 요약했습니다.';

  const overallScore = roundTo(
    (financialScore * 0.55) +
    (technicalScore * 0.15) +
    (sentimentToNumericScore(sentiment) * 0.15) +
    (qualityScore * 0.15),
    2,
  );

  const rawResult: DeepDiveResult = {
    ticker: proxy.ticker || input.ticker,
    name: proxy.name || input.name,
    overallScore,
    recommendation,
    sections: {
      financial: {
        title: '재무 분석',
        score: financialScore,
        highlights: [
          `${input.name}의 핵심 재무 지표를 프록시 경로에서 수집해 반영했습니다.`,
          per != null ? `PER ${per.toFixed(2)}배 기준 상대 밸류에이션을 확인했습니다.` : 'PER 데이터는 추가 확인이 필요합니다.',
          pbr != null ? `PBR ${pbr.toFixed(2)}배 수준을 기준으로 자산가치를 점검했습니다.` : 'PBR 데이터는 추가 확인이 필요합니다.',
        ],
        metrics: [
          { label: 'PER', value: per != null ? `${per.toFixed(2)}배` : '-', status: per != null ? (per <= 15 ? 'good' : per <= 30 ? 'neutral' : 'bad') : 'neutral' },
          { label: 'PBR', value: pbr != null ? `${pbr.toFixed(2)}배` : '-', status: pbr != null ? (pbr <= 1 ? 'good' : pbr <= 3 ? 'neutral' : 'bad') : 'neutral' },
          { label: '시가총액', value: marketCap != null ? formatKrwCompact(marketCap) : (String(proxy.marketCap || '-')), status: 'neutral' },
        ],
      },
      technical: {
        title: '기술적 분석',
        score: technicalScore,
        highlights: [
          change != null ? `전일 대비 ${change >= 0 ? '+' : ''}${change.toFixed(2)}% 흐름을 반영했습니다.` : '단기 가격 변동 데이터가 제한적입니다.',
          '과도한 신호 해석을 피하고 중립 기준으로 변동성을 평가했습니다.',
          '세부 보조지표는 다음 업데이트에서 보강됩니다.',
        ],
        signals: [
          { indicator: '모멘텀', signal: change != null ? (change >= 3 ? '상승' : change <= -3 ? '하락' : '중립') : '중립', value: change != null ? `${change.toFixed(2)}%` : '-' },
        ],
      },
      news: {
        title: '뉴스 분석',
        sentiment,
        highlights: [
          '최신 이슈를 프록시 경로로 재검증해 반영했습니다.',
          '뉴스 기반 의견은 신뢰도 검증 로직을 통과한 데이터만 사용합니다.',
        ],
        recentNews: [],
      },
      quality: {
        title: '투자 품질',
        score: qualityScore,
        highlights: [
          overview,
          '경영/산업 품질 평가는 보수적 중립 기준으로 설정했습니다.',
        ],
        metrics: [
          { label: '경영 안정성', value: '중립', status: 'neutral', detail: '프록시 요약 기반 초기 추정' },
          { label: '산업 경쟁력', value: '중립', status: 'neutral', detail: '추가 실적 데이터 수집 필요' },
        ],
      },
      aiOpinion: {
        title: 'AI 종합 의견',
        summary: reason,
        bullCase: ['실적/가이던스 개선 시 추가 상향 가능성이 있습니다.'],
        bearCase: ['밸류에이션 부담 또는 거시 변수 악화 시 변동성이 확대될 수 있습니다.'],
        targetPrice: '-',
        timeHorizon: '3-12개월',
      },
    },
    generatedAt: proxy.generatedAt || new Date().toISOString(),
    marketCap,
    per: per ?? undefined,
    pbr: pbr ?? undefined,
    dataSources: [
      {
        name: 'Supabase gemini-proxy',
        detail: '프로덕션 프록시 경로로 생성된 딥다이브 요약',
        date: new Date().toISOString().split('T')[0],
      },
      {
        name: 'Google Search',
        detail: '프록시 내부 보조 데이터 조회',
        date: new Date().toISOString().split('T')[0],
      },
    ],
  };

  return sanitizeDeepDiveResult(rawResult, input);
}

// ============================================================================
// 신뢰도 검증 / 보정 (sanitize)
// ============================================================================

function sanitizeDeepDiveResult(raw: DeepDiveResult, input: DeepDiveInput): DeepDiveResult {
  const nowIso = new Date().toISOString();
  const checks: string[] = [];
  let reliabilityScore = 100;

  const sections = raw.sections ?? ({} as DeepDiveResult['sections']);
  const financialRaw = sections.financial ?? {
    title: '재무 분석',
    score: 50,
    highlights: [],
    metrics: [],
  };
  const technicalRaw = sections.technical ?? {
    title: '기술적 분석',
    score: 50,
    highlights: [],
    signals: [],
  };
  const newsRaw = sections.news ?? {
    title: '뉴스 분석',
    sentiment: 'NEUTRAL' as DeepDiveSentiment,
    highlights: [],
    recentNews: [],
  };
  const qualityRaw = sections.quality ?? {
    title: '투자 품질',
    score: 50,
    highlights: [],
    metrics: [],
  };

  const financialScore = clampNumber(toFiniteNumber(financialRaw.score) ?? 50, 0, 100);
  const technicalScore = clampNumber(toFiniteNumber(technicalRaw.score) ?? 50, 0, 100);
  const qualityScore = clampNumber(toFiniteNumber(qualityRaw.score) ?? 50, 0, 100);
  const newsScore = clampNumber(sentimentToNumericScore(newsRaw.sentiment), 0, 100);

  let overallScore = clampNumber(toFiniteNumber(raw.overallScore) ?? 50, 0, 100);
  const recomputedOverall = roundTo(
    financialScore * 0.55 + technicalScore * 0.15 + newsScore * 0.15 + qualityScore * 0.15,
    2,
  );
  if (Math.abs(overallScore - recomputedOverall) >= 3) {
    overallScore = recomputedOverall;
    reliabilityScore -= 8;
    checks.push(`종합 점수를 세부 점수 기반 공식으로 재계산 (${recomputedOverall}점).`);
  } else {
    overallScore = roundTo(overallScore, 2);
  }

  let recommendation: DeepDiveRecommendation = raw.recommendation ?? 'NEUTRAL';
  const expectedRecommendation = recommendationFromScore(overallScore);
  if (recommendation !== expectedRecommendation) {
    recommendation = expectedRecommendation;
    reliabilityScore -= 6;
    checks.push('추천 등급을 점수 기준과 일치하도록 보정했습니다.');
  }

  let marketCap = toFiniteNumber(raw.marketCap);
  let per = toFiniteNumber(raw.per);
  let pbr = toFiniteNumber(raw.pbr);

  const factMarketCap = inferMarketCapKRW(input.fundamentals);
  const factPer = input.fundamentals?.forwardPE ?? input.fundamentals?.trailingPE ?? null;
  const factPbr = input.fundamentals?.priceToBook ?? null;

  if (!input.fundamentals) {
    reliabilityScore -= 20;
    checks.push('재무 API 데이터가 없어 검색 기반 검증으로 처리했습니다.');
  }

  if (factMarketCap != null && factMarketCap > 0) {
    if (marketCap == null || relativeDiff(marketCap, factMarketCap) > 0.2) {
      marketCap = Math.round(factMarketCap);
      reliabilityScore -= 12;
      checks.push('시가총액을 API 팩트 데이터로 교정했습니다.');
    }
  }

  if (factPer != null && Number.isFinite(factPer) && factPer > 0) {
    if (per == null || relativeDiff(per, factPer) > 0.15) {
      per = roundTo(factPer, 2);
      reliabilityScore -= 10;
      checks.push('PER를 API 팩트 데이터 기준으로 교정했습니다.');
    }
  }

  if (factPbr != null && Number.isFinite(factPbr) && factPbr > 0) {
    if (pbr == null || relativeDiff(pbr, factPbr) > 0.15) {
      pbr = roundTo(factPbr, 2);
      reliabilityScore -= 10;
      checks.push('PBR을 API 팩트 데이터 기준으로 교정했습니다.');
    }
  }

  if (per != null) {
    if (!Number.isFinite(per) || per < -100 || per > 300) {
      per = factPer != null ? roundTo(factPer, 2) : null;
      reliabilityScore -= 8;
      checks.push('비정상 PER 범위를 감지해 값을 정리했습니다.');
    } else {
      per = roundTo(per, 2);
    }
  }

  if (pbr != null) {
    if (!Number.isFinite(pbr) || pbr < 0 || pbr > 50) {
      pbr = factPbr != null ? roundTo(factPbr, 2) : null;
      reliabilityScore -= 8;
      checks.push('비정상 PBR 범위를 감지해 값을 정리했습니다.');
    } else {
      pbr = roundTo(pbr, 2);
    }
  }

  if (marketCap != null) {
    if (!Number.isFinite(marketCap) || marketCap <= 0) {
      marketCap = factMarketCap != null ? Math.round(factMarketCap) : null;
      reliabilityScore -= 8;
      checks.push('비정상 시가총액을 감지해 값을 정리했습니다.');
    } else {
      marketCap = Math.round(marketCap);
    }
  }

  const financialMetrics = (Array.isArray(financialRaw.metrics) ? financialRaw.metrics : []).map((metric) => ({
    label: metric?.label ?? '',
    value: metric?.value ?? '',
    status: normalizeMetricStatus(metric?.status),
  })).filter((metric) => metric.label.length > 0);

  let mergedMetrics = [...financialMetrics];
  if (per != null) {
    mergedMetrics = upsertMetric(
      mergedMetrics,
      'PER',
      `${per.toFixed(2)}배`,
      per <= 0 ? 'neutral' : per <= 15 ? 'good' : per <= 30 ? 'neutral' : 'bad',
    );
  }
  if (pbr != null) {
    mergedMetrics = upsertMetric(
      mergedMetrics,
      'PBR',
      `${pbr.toFixed(2)}배`,
      pbr <= 1 ? 'good' : pbr <= 3 ? 'neutral' : 'bad',
    );
  }
  if (marketCap != null) {
    mergedMetrics = upsertMetric(mergedMetrics, '시가총액', formatKrwCompact(marketCap), 'neutral');
  }

  const generatedAt = raw.generatedAt && !Number.isNaN(new Date(raw.generatedAt).getTime())
    ? raw.generatedAt
    : nowIso;

  const sourceList = (Array.isArray(raw.dataSources) ? raw.dataSources : [])
    .filter((source) => source?.name && source?.detail)
    .map((source) => ({
      name: String(source.name),
      detail: String(source.detail),
      date: source.date ? String(source.date) : nowIso.split('T')[0],
    }));

  if (input.fundamentals && !sourceList.some((source) => source.name.includes('Yahoo Finance'))) {
    sourceList.unshift({
      name: 'Yahoo Finance API',
      detail: '시가총액·PER·PBR 팩트값 검증',
      date: input.fundamentals.fetchedAt || nowIso,
    });
  }

  if (!sourceList.some((source) => source.name.includes('Google Search'))) {
    sourceList.push({
      name: 'Google Search',
      detail: '뉴스/이벤트 및 보조 지표 확인',
      date: nowIso.split('T')[0],
    });
  }

  if (checks.length === 0) {
    checks.push('점수/추천/핵심 지표의 일관성 검증을 통과했습니다.');
  }

  const normalizedReliabilityScore = clampNumber(Math.round(reliabilityScore), 0, 100);
  const level: 'high' | 'medium' | 'low' =
    normalizedReliabilityScore >= 80 ? 'high' : normalizedReliabilityScore >= 60 ? 'medium' : 'low';
  const summary = level === 'high'
    ? '핵심 재무지표와 점수 일관성 검증이 완료되었습니다.'
    : level === 'medium'
      ? '일부 항목을 자동 보정해 신뢰도를 높였습니다.'
      : '다수 항목이 보정되었습니다. 투자 전 원문 공시/체결가를 재확인하세요.';

  return {
    ...raw,
    overallScore,
    recommendation,
    generatedAt,
    sections: {
      ...sections,
      financial: {
        ...financialRaw,
        score: roundTo(financialScore, 1),
        highlights: Array.isArray(financialRaw.highlights) ? financialRaw.highlights : [],
        metrics: mergedMetrics,
      },
      technical: {
        ...technicalRaw,
        score: roundTo(technicalScore, 1),
        highlights: Array.isArray(technicalRaw.highlights) ? technicalRaw.highlights : [],
        signals: Array.isArray(technicalRaw.signals) ? technicalRaw.signals : [],
      },
      news: {
        ...newsRaw,
        sentiment: (newsRaw.sentiment ?? 'NEUTRAL') as DeepDiveSentiment,
        highlights: Array.isArray(newsRaw.highlights) ? newsRaw.highlights : [],
        recentNews: Array.isArray(newsRaw.recentNews) ? newsRaw.recentNews : [],
      },
      quality: {
        ...qualityRaw,
        score: roundTo(qualityScore, 1),
        highlights: Array.isArray(qualityRaw.highlights) ? qualityRaw.highlights : [],
        metrics: Array.isArray(qualityRaw.metrics) ? qualityRaw.metrics : [],
      },
      aiOpinion: {
        title: sections.aiOpinion?.title ?? 'AI 종합 의견',
        summary: sections.aiOpinion?.summary ?? '',
        bullCase: Array.isArray(sections.aiOpinion?.bullCase) ? sections.aiOpinion?.bullCase : [],
        bearCase: Array.isArray(sections.aiOpinion?.bearCase) ? sections.aiOpinion?.bearCase : [],
        targetPrice: sections.aiOpinion?.targetPrice ?? '-',
        timeHorizon: sections.aiOpinion?.timeHorizon ?? '-',
      },
    },
    marketCap: marketCap ?? undefined,
    per: per ?? undefined,
    pbr: pbr ?? undefined,
    dataSources: sourceList,
    verification: {
      level,
      score: normalizedReliabilityScore,
      summary,
      checks: checks.slice(0, 5),
      checkedAt: nowIso,
    },
  };
}

// ============================================================================
// 메인 generateDeepDive 함수
// ============================================================================

export const generateDeepDive = async (
  input: DeepDiveInput
): Promise<DeepDiveResult> => {
  // 언어 설정
  const isKo = getCurrentDisplayLanguage() === 'ko';

  // 팩트 데이터가 있으면 프롬프트에 주입
  const fundamentals = input.fundamentals;
  const hasFundamentals = fundamentals != null && fundamentals.marketCap != null;

  // 환율 정보
  const exchangeRate = fundamentals?.exchangeRate;
  const isUSD = fundamentals?.currency !== 'KRW' && fundamentals?.currency != null;

  // KRW 금액 포맷 헬퍼
  const fmtKRW = (v: number): string => {
    const abs = Math.abs(v);
    if (abs >= 1e12) return `약 ${(v / 1e12).toFixed(1)}조원`;
    if (abs >= 1e8) return `약 ${(v / 1e8).toFixed(0)}억원`;
    return `${getCurrencySymbol()}${v.toLocaleString()}`;
  };

  // --- 팩트 데이터 섹션 (API 조회 성공 시) ---
  const factDataSection = hasFundamentals ? (isKo ? `
[★★★ 실제 API 조회 데이터 — 이 숫자를 그대로 사용하세요 ★★★]
아래 데이터는 Yahoo Finance API에서 실시간 조회한 팩트 데이터입니다.
이 숫자들을 임의로 변경하거나 추측하지 마세요. 그대로 metrics에 반영하세요.
${isUSD && exchangeRate ? `\n[적용 환율] 1 USD = ${exchangeRate.toFixed(2)} KRW (실시간 조회)` : ''}
${isUSD ? '\n[★ 원화 표기 규칙] 미국 주식이므로 모든 금액(시가총액, 매출, 영업이익, 순이익 등)을 원화(₩)로 환산하여 표시하세요.' : ''}

시가총액: ${fundamentals?.marketCapKRW != null ? fmtKRW(fundamentals?.marketCapKRW) : fundamentals?.marketCap?.toLocaleString() ?? '' + '원'}${isUSD && fundamentals?.marketCap ? ` ($${(fundamentals?.marketCap / 1e9).toFixed(1)}B)` : ''}
${fundamentals?.currentPrice != null ? (isUSD && exchangeRate ? `현재 주가: ${getCurrencySymbol()}${Math.round(fundamentals?.currentPrice * exchangeRate).toLocaleString()} ($${fundamentals?.currentPrice.toLocaleString()})` : `현재 주가: ${getCurrencySymbol()}${fundamentals?.currentPrice.toLocaleString()}`) : ''}
${fundamentals?.trailingPE != null ? `PER (Trailing): ${fundamentals?.trailingPE.toFixed(2)}` : 'PER: 데이터 없음 — Google Search로 조회하세요'}
${fundamentals?.forwardPE != null ? `PER (Forward): ${fundamentals?.forwardPE.toFixed(2)}` : ''}
${fundamentals?.priceToBook != null ? `PBR: ${fundamentals?.priceToBook.toFixed(2)}` : 'PBR: 데이터 없음 — Google Search로 조회하세요'}
${fundamentals?.returnOnEquity != null ? `ROE: ${(fundamentals?.returnOnEquity * 100).toFixed(2)}%` : ''}
${fundamentals?.operatingMargins != null ? `영업이익률: ${(fundamentals?.operatingMargins * 100).toFixed(2)}%` : ''}
${fundamentals?.profitMargins != null ? `순이익률: ${(fundamentals?.profitMargins * 100).toFixed(2)}%` : ''}
${fundamentals?.revenueGrowth != null ? `매출성장률(YoY): ${(fundamentals?.revenueGrowth * 100).toFixed(2)}%` : ''}
${fundamentals?.debtToEquity != null ? `부채비율: ${fundamentals?.debtToEquity.toFixed(2)}%` : ''}
${fundamentals?.quarterlyEarnings && fundamentals?.quarterlyEarnings.length > 0
    ? '\n분기별 실적 (API 조회, 원화 환산):\n' + fundamentals?.quarterlyEarnings.map(q => {
        const revDisplay = q.revenueKRW != null ? fmtKRW(q.revenueKRW) : (q.revenue != null ? `$${q.revenue.toLocaleString()}` : 'N/A');
        const earnDisplay = q.earningsKRW != null ? fmtKRW(q.earningsKRW) : (q.earnings != null ? `$${q.earnings.toLocaleString()}` : 'N/A');
        return `- ${q.quarter}: 매출 ${revDisplay}, 순이익 ${earnDisplay}`;
      }).join('\n')
    : ''}

[중요] 위 데이터를 financial.metrics에 그대로 사용하고, marketCap/per/pbr 필드에도 그대로 넣으세요.
없는 항목만 Google Search로 보완하세요.
${isUSD ? `[중요] marketCap 필드에는 원화 환산값(숫자)을 넣으세요. quarterlyData의 매출/영업이익/순이익도 모두 원화(₩)로 환산하세요. 환율: ${exchangeRate?.toFixed(2) || '1450'}원.` : ''}
` : `
[★★★ Actual API data — use these numbers as-is ★★★]
The following data was retrieved in real-time from the Yahoo Finance API.
Do not modify or estimate these numbers. Use them directly in the metrics fields.
${isUSD && exchangeRate ? `\n[Exchange Rate Applied] 1 USD = ${exchangeRate.toFixed(2)} KRW (real-time)` : ''}
${isUSD ? '\n[★ KRW Conversion Rule] This is a US-listed stock; convert all monetary amounts (market cap, revenue, operating income, net income, etc.) to KRW (₩).' : ''}

Market Cap: ${fundamentals?.marketCapKRW != null ? fmtKRW(fundamentals?.marketCapKRW) : fundamentals?.marketCap?.toLocaleString() ?? '' + ' KRW'}${isUSD && fundamentals?.marketCap ? ` ($${(fundamentals?.marketCap / 1e9).toFixed(1)}B)` : ''}
${fundamentals?.currentPrice != null ? (isUSD && exchangeRate ? `Current Price: ${getCurrencySymbol()}${Math.round(fundamentals?.currentPrice * exchangeRate).toLocaleString()} ($${fundamentals?.currentPrice.toLocaleString()})` : `Current Price: ${getCurrencySymbol()}${fundamentals?.currentPrice.toLocaleString()}`) : ''}
${fundamentals?.trailingPE != null ? `P/E Ratio (Trailing): ${fundamentals?.trailingPE.toFixed(2)}` : 'P/E Ratio: No data — look up via Google Search'}
${fundamentals?.forwardPE != null ? `P/E Ratio (Forward): ${fundamentals?.forwardPE.toFixed(2)}` : ''}
${fundamentals?.priceToBook != null ? `P/B Ratio: ${fundamentals?.priceToBook.toFixed(2)}` : 'P/B Ratio: No data — look up via Google Search'}
${fundamentals?.returnOnEquity != null ? `ROE: ${(fundamentals?.returnOnEquity * 100).toFixed(2)}%` : ''}
${fundamentals?.operatingMargins != null ? `Operating Margin: ${(fundamentals?.operatingMargins * 100).toFixed(2)}%` : ''}
${fundamentals?.profitMargins != null ? `Net Profit Margin: ${(fundamentals?.profitMargins * 100).toFixed(2)}%` : ''}
${fundamentals?.revenueGrowth != null ? `Revenue Growth (YoY): ${(fundamentals?.revenueGrowth * 100).toFixed(2)}%` : ''}
${fundamentals?.debtToEquity != null ? `Debt-to-Equity Ratio: ${fundamentals?.debtToEquity.toFixed(2)}%` : ''}
${fundamentals?.quarterlyEarnings && fundamentals?.quarterlyEarnings.length > 0
    ? '\nQuarterly Earnings (API data, KRW-converted):\n' + fundamentals?.quarterlyEarnings.map(q => {
        const revDisplay = q.revenueKRW != null ? fmtKRW(q.revenueKRW) : (q.revenue != null ? `$${q.revenue.toLocaleString()}` : 'N/A');
        const earnDisplay = q.earningsKRW != null ? fmtKRW(q.earningsKRW) : (q.earnings != null ? `$${q.earnings.toLocaleString()}` : 'N/A');
        return `- ${q.quarter}: Revenue ${revDisplay}, Net Income ${earnDisplay}`;
      }).join('\n')
    : ''}

[IMPORTANT] Use the above data directly in financial.metrics and in the marketCap/per/pbr fields.
Only supplement missing data via Google Search.
${isUSD ? `[IMPORTANT] The marketCap field must contain the KRW-converted value (number only). Also convert all revenue/operating income/net income in quarterlyData to KRW (₩). Exchange rate: ${exchangeRate?.toFixed(2) || '1450'}.` : ''}
`) : (isKo ? `
[★★★ 데이터 정확성 — 최우선 원칙 ★★★]
API 데이터 조회에 실패하여 Google Search를 활용합니다.

1. **시가총액**: 반드시 Google Search로 "${input.ticker} market cap"을 검색하여 최신 USD 시가총액을 확인하세요.
   - 참고: Tesla ~$1.1T, Samsung Electronics ~$350B, Apple ~$3.4T, NVIDIA ~$3.2T
   - USD → KRW 환산 시 실시간 환율 적용 (없으면 1,450원)
   - 테슬라가 2조원이 될 수 없습니다 (실제 ~1,600조원). 반드시 검증하세요.
   - **모든 금액은 원화(₩)로 환산하여 표시하세요**

2. **PER/PBR**: "${input.ticker} PE ratio PBR" 검색하여 실제 값 사용

3. **분기 실적**: "${input.name} quarterly earnings 2024" 검색하여 실제 발표 실적 사용
   - 가짜 숫자를 만들지 마세요.
   - **매출, 영업이익, 순이익은 원화(₩)로 환산하여 표시**
` : `
[★★★ Data Accuracy — Top Priority ★★★]
API data retrieval failed. Use Google Search to obtain real data.

1. **Market Cap**: Search Google for "${input.ticker} market cap" to find the latest USD market cap.
   - Reference: Tesla ~$1.1T, Samsung Electronics ~$350B, Apple ~$3.4T, NVIDIA ~$3.2T
   - Apply real-time exchange rate for USD → KRW conversion (default: 1,450 KRW)
   - Tesla cannot be worth 2 trillion KRW (actual ~1,600 trillion KRW). Always verify.
   - **Express all amounts in KRW (₩)**

2. **P/E and P/B Ratios**: Search "${input.ticker} PE ratio PBR" for actual values.

3. **Quarterly Earnings**: Search "${input.name} quarterly earnings 2024" for actual reported results.
   - Do not fabricate numbers.
   - **Convert revenue, operating income, and net income to KRW (₩)**
`);
  /* eslint-enable @typescript-eslint/no-non-null-assertion */

  const prompt = (isKo ? `
당신은 CFA 자격을 보유한 골드만삭스 수석 애널리스트입니다.
${hasFundamentals
    ? '아래 제공된 실제 API 데이터를 기반으로 분석 리포트를 작성하세요. 기술적 분석과 뉴스는 Google Search를 활용하세요.'
    : 'Google Search를 활용하여 **실시간 데이터**를 조회한 후 분석 리포트를 작성하세요.'}

[분석 대상]
- 종목: ${input.name} (${input.ticker})
${input.currentPrice ? `- 현재가: ${getCurrencySymbol()}${input.currentPrice.toLocaleString()}` : ''}
${input.avgPrice ? `- 평균 매수가: ${getCurrencySymbol()}${input.avgPrice.toLocaleString()}` : ''}
${input.quantity ? `- 보유 수량: ${input.quantity}주` : ''}` : `
You are a senior Goldman Sachs analyst with a CFA designation.
${hasFundamentals
    ? 'Write an analysis report based on the actual API data provided below. Use Google Search for technical analysis and news.'
    : 'Use Google Search to retrieve **real-time data** before writing the analysis report.'}

[Subject of Analysis]
- Stock: ${input.name} (${input.ticker})
${input.currentPrice ? `- Current Price: ${getCurrencySymbol()}${input.currentPrice.toLocaleString()}` : ''}
${input.avgPrice ? `- Average Buy Price: ${getCurrencySymbol()}${input.avgPrice.toLocaleString()}` : ''}
${input.quantity ? `- Shares Held: ${input.quantity}` : ''}`) + `

${factDataSection}

` + (isKo ? `
[★ 점수 산정 기준 — 4인 전문가 라운드테이블 합의 (Goldman Sachs PM + Cathie Wood + Buffett + Dalio)]

overallScore, financial.score, technical.score, quality.score는 반드시 아래 기준에 따라 종목별로 다르게 산출하세요.
각 항목의 계산 과정을 내부적으로 수행한 후 최종 점수만 출력하세요.

■ financial.score (재무 점수, 0-100):
  기본 40점에서 시작:

  [밸류에이션 — 최대 ±20점]
  - PER: ★업종 평균을 반드시 Google Search로 확인 후, Forward PER(없으면 Trailing PER)을 업종 평균과 비교
    → Forward PER < 업종 평균 × 0.7: 저평가(+15)
    → Forward PER 업종 평균 × 0.7~1.3: 적정(+5)
    → Forward PER 업종 평균 × 1.3~2.0: 고평가(-5)
    → Forward PER > 업종 평균 × 2.0: 초고평가(-10)
    ※ 적자기업(PER 음수/N/A): 매출성장률 30%+ → 중립(0), 그 외 → (-15)
  - PBR: ★업종 유형에 따라 다른 기준 적용
    → 자산집약 업종(금융/제조/유틸리티/건설): PBR<1(+10) / 1~2(+5) / 2~3(0) / 3+(-5)
    → 자산경량 업종(SW/플랫폼/SaaS/바이오/콘텐츠): PBR<5(+5) / 5~15(0) / 15~30(-3) / 30+(-5)

  [수익성 — 최대 ±25점]
  - ROE (★3년 평균 우선, 없으면 최근 실적):
    → 20%+(+15) / 15~20%(+10) / 10~15%(+5) / 5~10%(0) / 5%미만(-10)
  - 영업이익률: ★업종 평균 대비 판단 (Google Search로 확인)
    → 업종 평균의 1.5배 이상(+10) / 업종 평균 이상(+5) / 업종 평균 미만(0) / 적자(-10)
    ※ 확인 불가 시: 20%+(+10) / 10~20%(+5) / 0~10%(0) / 적자(-10)
  - 잉여현금흐름(FCF): Google Search로 최근 연간 FCF 확인
    → FCF 양수 + 증가 추세(+10) / FCF 양수(+5) / FCF 음수(-5) / FCF 음수 + 악화(-10)

  [성장성 — 최대 ±20점]
  - 매출성장률 YoY: ★가속/감속 반드시 구분
    → 30%+ AND 가속(전년보다 성장률 상승)(+15) / 30%+ AND 감속(+10)
    → 20~30%(+8) / 10~20%(+5) / 0~10%(0)
    → 마이너스 AND 일시적(업황 사이클)(-5) / 마이너스 AND 구조적(-10)

  [안정성 — 최대 ±15점]
  - 부채비율: 50%미만(+8) / 50~100%(+3) / 100~200%(0) / 200%초과(-7)
  - 이익 안정성: 최근 4분기 영업이익 모두 흑자(+5) / 혼합(0) / 연속 적자(-5)
    ※ 고성장 적자기업(매출성장 30%+): 적자 패널티 면제(0)

■ technical.score (기술 보조 점수, 0-100):
  기본 50점에서 시작:
  - 이동평균(20/60/120일): 정배열(+15) / 역배열(-15) / 혼합(0)
  - 현재가 vs 120일 이평: 120일선 위 10%+(+5) / 위(+3) / 아래(-3) / 아래 20%+(-5)
  - RSI(14일): 40~60(+5) / 60~70(+8) / 30~40(-3) / 70+(과매수 -8) / 30미만(역발상 +10)
  - MACD: 골든크로스(+7) / 데드크로스(-7) / 중립(0)
  - 거래량: 20일 평균 대비 200%+(+5) / 50%미만(-5) / 보통(0)
  - 볼린저밴드: 하단 접근(+5) / 상단 돌파(-3) / 중앙(+2)

■ quality.score (투자 품질 점수, 0-100):
  기본 50점에서 시작:
  - 경쟁우위(Moat): 브랜드파워/네트워크효과/전환비용/원가우위/규모의경제 중
    → 2개 이상 보유(+20) / 1개 보유(+10) / 판별 불가(0) / 진입장벽 낮음(-10)
  - 경영진 신뢰도: 주주환원(배당/자사주) + CEO 실행력
    → 우수(+10) / 보통(0) / 우려(-10)
  - 산업 성장성: 해당 업종의 향후 3~5년 전망
    → 고성장 산업(+10) / 성숙 산업(0) / 쇠퇴 산업(-10)

■ overallScore (종합 점수):
  = financial.score × 0.55 + technical.score × 0.15 + news_score × 0.15 + quality.score × 0.15

  ※ news_score 산정 (5단계):
    - VERY_POSITIVE(90): 실적 서프라이즈, M&A, 대형 수주 등 구조적 호재
    - POSITIVE(70): 목표가 상향, 업종 호재
    - NEUTRAL(50): 특이사항 없음
    - NEGATIVE(30): 실적 미달, 업종 악재
    - VERY_NEGATIVE(10): 회계 이슈, 대형 소송, 규제 충격 등 구조적 악재

■ recommendation (분석 의견 — 투자 자문이 아닌 분석 등급):
  78+: VERY_POSITIVE / 63~77: POSITIVE / 42~62: NEUTRAL / 28~41: NEGATIVE / 27 이하: VERY_NEGATIVE

[필수 분석 항목]
1. 재무 분석 (financial): PER, PBR, ROE, 매출성장률, 영업이익률, 부채비율 + 시가총액 + 최근 4분기 매출/영업이익/순이익
2. 기술적 분석 (technical): RSI, MACD, 이동평균선(20/60/120일), 볼린저밴드, 거래량 추이
3. 뉴스/이벤트 분석 (news): 최근 주요 뉴스 3개 이상 + 센티먼트
4. AI 종합 의견 (aiOpinion): 매수/매도 의견, 목표가, 강세/약세 시나리오
5. 분기별 실적 (quarterlyData): 최근 4분기 매출/영업이익/순이익 (실제 실적 발표 기준)
6. 최신 분기 상세 (quarterDetail): 사업부별 매출 비중, 주요 비용, 워터폴 흐름
7. 밸류에이션 (marketCap, per, pbr): 시가총액(원), PER, PBR 숫자값
8. 데이터 출처 (dataSources): 사용한 데이터의 출처 목록

[출력 형식] 반드시 아래 JSON 구조로 반환:
{
  "ticker": "${input.ticker}",
  "name": "${input.name}",
  "overallScore": <0-100>,
  "recommendation": "<VERY_POSITIVE|POSITIVE|NEUTRAL|NEGATIVE|VERY_NEGATIVE>",
  "sections": {
    "financial": { "title": "재무 분석", "score": <0-100>, "highlights": ["재무 분석 내용 3개 이상"], "metrics": [{"label": "PER", "value": "<실제값>", "status": "<good|neutral|bad>"}] },
    "technical": { "title": "기술적 분석", "score": <0-100>, "highlights": ["기술적 분석 내용 3개 이상"], "signals": [{"indicator": "RSI", "signal": "<과매수|중립|과매도>", "value": "<실제값>"}] },
    "news": { "title": "뉴스 분석", "sentiment": "<VERY_POSITIVE|POSITIVE|NEUTRAL|NEGATIVE|VERY_NEGATIVE>", "highlights": ["뉴스 기반 분석 3개 이상"], "recentNews": [{"title": "<뉴스 제목>", "impact": "<긍정적|중립|부정적>", "date": "<YYYY-MM-DD>"}] },
    "quality": { "title": "투자 품질", "score": <0-100>, "highlights": ["경쟁우위/경영진/산업 분석 3개 이상"], "metrics": [{"label": "경쟁우위(Moat)", "value": "<강력|보통|약함>", "status": "<good|neutral|bad>", "detail": "<설명>"}] },
    "aiOpinion": { "title": "AI 종합 의견", "summary": "<요약 2-3문장>", "bullCase": ["강세 시나리오 2개 이상"], "bearCase": ["약세 시나리오 2개 이상"], "targetPrice": "<목표 주가>", "timeHorizon": "<투자 기간>" }
  },
  "generatedAt": "${new Date().toISOString()}",
  "quarterlyData": [{"quarter": "2024 Q1", "revenue": <매출액(원)>, "operatingIncome": <영업이익(원)>, "netIncome": <순이익(원)>}],
  "quarterDetail": { "quarter": "<최근 분기>", "revenueSegments": [{"name": "<사업부명>", "amount": <금액>, "percentage": <비중%>, "color": "#6366F1", "growth": <성장률%>}], "costItems": [{"name": "매출원가", "amount": <금액>, "percentage": <비중%>}], "waterfall": [{"label": "매출", "amount": <금액>, "type": "revenue"}], "operatingMargin": <영업이익률(%)>, "netMargin": <순이익률(%)>, "keyTakeaway": "<분기 핵심 포인트>" },
  "marketCap": <시가총액(원, 숫자만)>,
  "per": <PER(숫자만)>,
  "pbr": <PBR(숫자만)>,
  "dataSources": [
    ${hasFundamentals ? '{"name": "Yahoo Finance API", "detail": "시가총액, PER, PBR, ROE, 영업이익률, 매출성장률, 부채비율, 분기실적' + (isUSD && exchangeRate ? ` (환율 ${exchangeRate.toFixed(2)}원 적용)` : '') + '", "date": "' + (fundamentals?.fetchedAt || new Date().toISOString()) + '"},' : ''}
    {"name": "Google Search", "detail": "기술적 분석, 뉴스, 사업부별 상세", "date": "${new Date().toISOString().split('T')[0]}"}
  ]
}

★★★ 절대 규칙 ★★★
1. 유효한 JSON만 반환. 마크다운 코드블록이나 설명 텍스트 없이 JSON만 출력.
2. overallScore, financial.score, technical.score는 반드시 종목별로 실제 데이터 기반으로 다르게 산출.
3. 예시 숫자(75, 80, 65)를 그대로 사용하면 안 됨. 실제 계산 결과를 넣으세요.
4. recommendation은 overallScore 기준에 따라 결정 (분석 의견이며 투자 권유가 아님).
5. ${getPromptLanguageInstruction()} ${getFinanceTermGuide()}
6. quarterlyData는 실제 실적 발표 기준으로 작성. 사업보고서/분기보고서 기반 데이터 사용.
7. quarterDetail.revenueSegments의 color 필드에는 "#6366F1", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#3B82F6" 중에서 순서대로 배정.
8. marketCap, per, pbr, revenue, operatingIncome, netIncome 등 JSON 숫자 필드는 반드시 숫자만 입력.
9. dataSources에 사용한 데이터 출처를 반드시 2개 이상 명시하세요.
10. 시가총액 검증: 미국 대형주(TSLA, AAPL, NVDA 등)는 최소 수백조원 이상이어야 합니다.
11. 원화 환산 규칙: ${isUSD && exchangeRate ? `환율 ${exchangeRate.toFixed(2)}원 적용.` : '실시간 환율 적용.'} JSON 숫자 필드에는 ₩ 기호를 붙이지 마세요.
${hasFundamentals ? '12. API 제공 데이터(시가총액, PER, PBR, ROE 등)는 반드시 그대로 사용하세요. 임의로 수정하지 마세요.' : ''}
` : `
[★ Scoring Criteria — 4-Expert Roundtable (Goldman Sachs PM + Cathie Wood + Buffett + Dalio)]

Calculate overallScore, financial.score, technical.score, quality.score based on these criteria. Each stock receives different scores based on actual data.

■ financial.score (0-100, start at 40):
  [Valuation — max ±20 pts]
  - P/E: Use Forward P/E vs industry avg (Google Search for industry avg)
  - P/B: Asset-heavy sectors: <1(+10)/1~2(+5)/2~3(0)/3+(-5); Asset-light: <5(+5)/5~15(0)/15~30(-3)/30+(-5)

  [Profitability — max ±25 pts]
  - ROE (3-yr avg preferred): 20%+(+15)/15~20%(+10)/10~15%(+5)/5~10%(0)/<5%(-10)
  - Operating Margin vs industry avg
  - FCF: positive+growing(+10)/positive(+5)/negative(-5)/negative+worsening(-10)

  [Growth — max ±20 pts]
  - Revenue YoY: 30%+ accelerating(+15)/30%+ decelerating(+10)/20~30%(+8)/10~20%(+5)/0~10%(0)

  [Stability — max ±15 pts]
  - Debt/Equity: <50%(+8)/50~100%(+3)/100~200%(0)/>200%(-7)
  - Earnings stability

■ technical.score (0-100, start at 50)
■ quality.score (0-100, start at 50)
■ overallScore = financial×0.55 + technical×0.15 + news_score×0.15 + quality×0.15
■ recommendation: 78+: VERY_POSITIVE / 63~77: POSITIVE / 42~62: NEUTRAL / 28~41: NEGATIVE / ≤27: VERY_NEGATIVE

[Output Format] Return valid JSON only with ticker, name, overallScore, recommendation, sections, generatedAt, quarterlyData, quarterDetail, marketCap, per, pbr, dataSources.

★★★ Absolute Rules ★★★
1. Return valid JSON only. No markdown or explanatory text.
2. Scores must differ per stock based on actual data.
3. Do not use example numbers (75, 80, 65). Use actual calculated results.
4. recommendation must match overallScore threshold.
5. ${getPromptLanguageInstruction()} ${getFinanceTermGuide()}
6-12. [Same rules as Korean version]
${hasFundamentals ? '12. Use API-provided data as-is. Do not modify.' : ''}
`);

  // 프로덕션(TestFlight)은 프록시 "강제": 클라이언트 API 키 직접 호출 금지
  const shouldPreferProxy = !__DEV__;
  if (shouldPreferProxy) {
    let lastProxyError: unknown = null;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        if (__DEV__) console.log(`[DeepDive] 프록시 강제 경로 실행 (${attempt}/2)`);
        return await generateDeepDiveViaProxy(input);
      } catch (proxyErr) {
        lastProxyError = proxyErr;
        console.warn(
          `[DeepDive] 프록시 강제 경로 실패 (${attempt}/2):`,
          String((proxyErr as Error)?.message || proxyErr).substring(0, 120),
        );
      }
    }

    Sentry.captureException(lastProxyError, {
      tags: { service: 'gemini', type: 'proxy_required_failed' },
      extra: { feature: 'deep_dive', stage: 'proxy_required' },
    });

    throw new Error('딥다이브 서버 분석이 일시적으로 지연되고 있습니다. 잠시 후 다시 시도해주세요.');
  }

  // Google Search 모델 → 실패 시 일반 모델 폴백 (2단계 시도)
  let text: string;
  try {
    try {
      // 1차: Google Search 그라운딩 활성화 모델 (60초)
      if (__DEV__) console.log('[DeepDive] 1차 시도: Google Search 모델');
      text = await callGeminiSafe(modelWithSearch, prompt, { timeoutMs: 60000, maxRetries: 0 });
    } catch (searchErr: unknown) {
      console.warn('[DeepDive] Google Search 모델 실패:', (searchErr instanceof Error ? searchErr.message : String(searchErr)).substring(0, 100));
      if (__DEV__) console.log('[DeepDive] 2차 시도: 일반 모델 (Google Search 없이)');
      // 2차: 일반 모델 폴백 (Google Search 없이, 60초)
      text = await callGeminiSafe(model, prompt, { timeoutMs: 60000, maxRetries: 1 });
    }
  } catch (directErr: unknown) {
    // 직접 호출이 키 만료/권한 문제면 프록시 재시도
    const directMessage = String(directErr instanceof Error ? directErr.message : directErr || '');
    const shouldFallbackToProxy = shouldPreferProxy || isGeminiCredentialError(directMessage) || !API_KEY;

    if (shouldFallbackToProxy) {
      try {
        if (__DEV__) console.log('[DeepDive] 직접 호출 실패 → 프록시 재시도');
        return await generateDeepDiveViaProxy(input);
      } catch (proxyRetryErr: unknown) {
        console.warn('[DeepDive] 프록시 재시도 실패:', (proxyRetryErr instanceof Error ? proxyRetryErr.message : String(proxyRetryErr)).substring(0, 120));
        Sentry.captureException(proxyRetryErr, {
          tags: { service: 'gemini', type: 'proxy_retry_failed' },
          extra: {
            feature: 'deep_dive',
            directMessage: directMessage.substring(0, 200),
          },
        });
      }
    }

    throw directErr;
  }

  try {
    if (__DEV__) {
      if (__DEV__) console.log('[DeepDive] Gemini 원본 응답 길이:', text.length);
      if (__DEV__) console.log('[DeepDive] 응답 앞 200자:', text.substring(0, 200));
    }

    // JSON 정제 및 파싱 + 신뢰도 검증/보정
    const parsed = parseGeminiJson<DeepDiveResult>(text);
    return sanitizeDeepDiveResult(parsed, input);
  } catch (parseErr) {
    console.warn('[DeepDive] JSON 파싱 실패:', parseErr);
    throw new Error('AI 응답 형식 오류 — 재시도해주세요');
  }
};
