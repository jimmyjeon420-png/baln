/**
 * DeepDiveReport.tsx — 딥다이브 통합 리포트
 *
 * [비유] "종목 건강검진 결과서"
 * DeepDiveResult 전체를 받아서 풀 리포트를 한 화면에 렌더링하는 메인 컴포넌트.
 *
 * 섹션 구성 (위→아래):
 * 1. 헤더 — 종목명 + 티커 뱃지 + 종합 점수 + 추천 뱃지
 * 2. 점수 레이더 — ScoreRadar (재무/기술/뉴스 3축)
 * 3. 재무 분석 — FinancialAnalysis (분기 차트 + 실적 분해 + 지표)
 * 4. 기술적 분석 — 시그널 테이블 + 하이라이트
 * 5. 뉴스 타임라인 — NewsTimeline
 * 6. AI 종합 의견 — AIOpinionCard
 * 7. 면책 문구
 *
 * useTheme() 훅으로 다크/라이트 모드 대응
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import type { DeepDiveResult } from '../../types/marketplace';

// 기존 컴포넌트 import
import ScoreRadar from './ScoreRadar';
import { FinancialAnalysis } from './FinancialAnalysis';
import NewsTimeline from './NewsTimeline';
import AIOpinionCard from './AIOpinionCard';

// ── Props ──
interface DeepDiveReportProps {
  result: DeepDiveResult;
}

// ── 추천 뱃지 색상 매핑 ──
const RECOMMENDATION_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  VERY_POSITIVE: { bg: 'rgba(76,175,80,0.2)', text: '#4CAF50', label: '매우 긍정적' },
  POSITIVE: { bg: 'rgba(102,187,106,0.2)', text: '#66BB6A', label: '긍정적' },
  NEUTRAL: { bg: 'rgba(255,183,77,0.2)', text: '#FFB74D', label: '중립' },
  NEGATIVE: { bg: 'rgba(239,83,80,0.2)', text: '#EF5350', label: '부정적' },
  VERY_NEGATIVE: { bg: 'rgba(207,102,121,0.2)', text: '#CF6679', label: '매우 부정적' },
};

// ── 뉴스 sentiment → 점수 변환 (5단계) ──
function sentimentToScore(sentiment: string): number {
  switch (sentiment) {
    case 'VERY_POSITIVE': return 90;
    case 'POSITIVE': return 70;
    case 'NEUTRAL': return 50;
    case 'NEGATIVE': return 30;
    case 'VERY_NEGATIVE': return 10;
    default: return 50;
  }
}

// ── 종합 점수 등급 색상 ──
function getScoreColor(score: number): string {
  if (score >= 80) return '#4CAF50';
  if (score >= 60) return '#66BB6A';
  if (score >= 40) return '#FFB74D';
  if (score >= 20) return '#EF5350';
  return '#CF6679';
}

function normalizeScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(Math.max(score, 0), 100);
}

function formatScoreDisplay(score: number): { circle: string; precise: string } {
  const normalized = normalizeScore(score);
  return {
    circle: String(Math.round(normalized)),
    precise: normalized.toFixed(2).replace(/\.00$/, ''),
  };
}

function reliabilityLabel(level: 'high' | 'medium' | 'low' | undefined): string {
  if (level === 'high') return '검증 높음';
  if (level === 'medium') return '검증 보통';
  return '검증 필요';
}

function reliabilityColor(level: 'high' | 'medium' | 'low' | undefined): string {
  if (level === 'high') return '#4CAF50';
  if (level === 'medium') return '#FFB74D';
  return '#EF5350';
}

// ── financial.metrics에서 특정 지표 추출 ──
function extractMetricValue(
  metrics: { label: string; value: string }[],
  keywords: string[],
): number {
  for (const m of metrics) {
    const labelLower = m.label.toLowerCase();
    if (keywords.some((k) => labelLower.includes(k))) {
      const num = parseFloat(m.value.replace(/[^0-9.\-]/g, ''));
      return isNaN(num) ? 0 : num;
    }
  }
  return 0;
}

// ── 메인 컴포넌트 ──
export default function DeepDiveReport({ result }: DeepDiveReportProps) {
  const { colors } = useTheme();
  const scoreDisplay = formatScoreDisplay(result.overallScore);

  // null 안전: AI 응답이 부분적일 수 있으므로 기본값 적용
  const sections = result.sections ?? {} as any;
  const financial = sections.financial ?? { score: 0, title: '재무 분석', highlights: [], metrics: [] };
  const technical = sections.technical ?? { score: 0, title: '기술적 분석', highlights: [], signals: [] };
  const news = sections.news ?? { title: '뉴스 분석', sentiment: 'NEUTRAL', recentNews: [] };
  const quality = (sections.quality ?? { title: '퀄리티 분석', score: 0, highlights: [], metrics: [] }) as { title: string; score: number; highlights: string[]; metrics?: { label: string; value: string; status: 'good' | 'neutral' | 'bad'; detail?: string }[] };
  const rec = RECOMMENDATION_COLORS[result.recommendation] ?? RECOMMENDATION_COLORS.NEUTRAL;

  // ── 뉴스 점수 (ScoreRadar용) ──
  const newsScore = sentimentToScore(news.sentiment);

  // ── 재무 분석 Props 계산 ──
  const financialProps = useMemo(() => {
    // yearlyData: quarterlyData에서 연도별 합산
    const yearlyData = (() => {
      if (!result.quarterlyData || result.quarterlyData.length === 0) return [];
      const yearMap: Record<string, { revenue: number; operatingIncome: number; netIncome: number }> = {};
      for (const q of result.quarterlyData) {
        // quarter 형식: "Q1 2025" → 연도 추출
        const match = q.quarter.match(/(\d{4})/);
        const year = match ? match[1] : 'N/A';
        if (!yearMap[year]) {
          yearMap[year] = { revenue: 0, operatingIncome: 0, netIncome: 0 };
        }
        yearMap[year].revenue += q.revenue;
        yearMap[year].operatingIncome += q.operatingIncome;
        yearMap[year].netIncome += q.netIncome;
      }
      return Object.entries(yearMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([year, data]) => ({ year, ...data }));
    })();

    // keyMetrics: financial.metrics에서 ROE, 부채비율 추출
    const roe = extractMetricValue(financial.metrics ?? [], ['roe', '자기자본이익률']);
    const debtRatio = extractMetricValue(financial.metrics ?? [], ['부채비율', 'debt']);
    const keyMetrics = { roe, roic: 0, debtRatio };

    // cashFlowSummary: financial.highlights에서 현금흐름 관련 추출
    const cashFlowHighlight = (financial.highlights ?? []).find((h: string) =>
      h.includes('현금') || h.includes('cash') || h.includes('영업활동'),
    );
    const cashFlowSummary = cashFlowHighlight ?? '상세 정보는 실적 발표 후 제공됩니다';

    return { yearlyData, keyMetrics, cashFlowSummary };
  }, [result.quarterlyData, financial.metrics, financial.highlights]);

  return (
    <View style={styles.wrapper}>
      {/* ═══════════════════════════════════════
          1. 헤더 섹션 — 종목명 + 점수 + 추천
         ═══════════════════════════════════════ */}
      <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* 상단: 종목명 + 티커 */}
        <View style={styles.headerTop}>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.stockName, { color: colors.textPrimary }]}>
              {result.name}
            </Text>
            <View style={[styles.tickerBadge, { backgroundColor: colors.surfaceLight }]}>
              <Text style={[styles.tickerText, { color: colors.textSecondary }]}>
                {result.ticker}
              </Text>
            </View>
          </View>

          {/* 추천 뱃지 */}
          <View style={[styles.recBadge, { backgroundColor: rec.bg }]}>
            <Text style={[styles.recText, { color: rec.text }]}>{rec.label}</Text>
          </View>
        </View>

        {/* 종합 점수 */}
        <View style={styles.scoreRow}>
          <View style={[styles.scoreCircle, { borderColor: getScoreColor(result.overallScore) }]}>
            <Text
              style={[styles.scoreNumber, { color: getScoreColor(result.overallScore) }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {scoreDisplay.circle}
            </Text>
            <Text style={[styles.scoreUnit, { color: colors.textTertiary }]}>점</Text>
          </View>
          <View style={styles.scoreLabels}>
            <Text style={[styles.scoreLabelMain, { color: colors.textPrimary }]}>종합 점수</Text>
            <Text style={[styles.scoreLabelSub, { color: colors.textTertiary }]}>
              재무 {financial.score ?? 0} · 품질 {quality?.score ?? '-'} · 기술 {technical.score ?? 0} · 뉴스 {newsScore}
            </Text>
            <Text style={[styles.scoreLabelPrecise, { color: colors.textSecondary }]}>
              정밀 점수 {scoreDisplay.precise}점
            </Text>
            {result.verification && (
              <View style={[styles.verificationBadge, { backgroundColor: `${reliabilityColor(result.verification.level)}22` }]}>
                <Text style={[styles.verificationBadgeText, { color: reliabilityColor(result.verification.level) }]}>
                  {reliabilityLabel(result.verification.level)} · {result.verification.score}점
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 시가총액 / PER / PBR */}
        {(result.marketCap || result.per || result.pbr) && (
          <View style={[styles.metricsRow, { borderTopColor: colors.border }]}>
            {result.marketCap != null && (
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>시가총액</Text>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                  {formatLargeNumber(result.marketCap)}
                </Text>
              </View>
            )}
            {result.per != null && (
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>PER</Text>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                  {result.per.toFixed(1)}배
                </Text>
              </View>
            )}
            {result.pbr != null && (
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>PBR</Text>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                  {result.pbr.toFixed(2)}배
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* ═══════════════════════════════════════
          2. 점수 레이더
         ═══════════════════════════════════════ */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          점수 분석
        </Text>
        <View style={styles.radarCenter}>
          <ScoreRadar
            financialScore={financial.score ?? 0}
            technicalScore={technical.score ?? 0}
            newsScore={newsScore}
          />
        </View>
      </View>

      {/* ═══════════════════════════════════════
          3. 재무 분석
         ═══════════════════════════════════════ */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          재무 분석
        </Text>
        <Text style={[styles.sectionScore, { color: colors.primary }]}>
          {financial.score ?? 0}점
        </Text>

        {/* 하이라이트 */}
        <View style={styles.highlightList}>
          {(financial.highlights ?? []).map((h: string, i: number) => (
            <View key={i} style={styles.highlightRow}>
              <Ionicons name="ellipse" size={6} color={colors.primary} style={styles.bulletIcon} />
              <Text style={[styles.highlightText, { color: colors.textSecondary }]}>{h}</Text>
            </View>
          ))}
        </View>

        {/* FinancialAnalysis 컴포넌트 */}
        <FinancialAnalysis
          yearlyData={financialProps.yearlyData}
          keyMetrics={financialProps.keyMetrics}
          cashFlowSummary={financialProps.cashFlowSummary}
          marketCap={result.marketCap}
          per={result.per}
          pbr={result.pbr}
          quarterlyData={result.quarterlyData}
          quarterDetail={result.quarterDetail}
        />
      </View>

      {/* ═══════════════════════════════════════
          4. 기술적 분석
         ═══════════════════════════════════════ */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          기술적 분석
        </Text>
        <Text style={[styles.sectionScore, { color: colors.primary }]}>
          {technical.score ?? 0}점
        </Text>

        {/* 하이라이트 */}
        <View style={styles.highlightList}>
          {(technical.highlights ?? []).map((h: string, i: number) => (
            <View key={i} style={styles.highlightRow}>
              <Ionicons name="ellipse" size={6} color={colors.primary} style={styles.bulletIcon} />
              <Text style={[styles.highlightText, { color: colors.textSecondary }]}>{h}</Text>
            </View>
          ))}
        </View>

        {/* 시그널 테이블 */}
        {(technical.signals ?? []).length > 0 && (
          <View style={[styles.signalTable, { borderColor: colors.border }]}>
            {/* 테이블 헤더 */}
            <View style={[styles.signalHeaderRow, { backgroundColor: colors.surfaceLight }]}>
              <Text style={[styles.signalHeaderCell, styles.signalCol1, { color: colors.textTertiary }]}>지표</Text>
              <Text style={[styles.signalHeaderCell, styles.signalCol2, { color: colors.textTertiary }]}>신호</Text>
              <Text style={[styles.signalHeaderCell, styles.signalCol3, { color: colors.textTertiary }]}>값</Text>
            </View>
            {/* 테이블 바디 */}
            {(technical.signals ?? []).map((sig: any, i: number) => (
              <View
                key={i}
                style={[
                  styles.signalRow,
                  { borderBottomColor: colors.border },
                  i === (technical.signals ?? []).length - 1 && styles.signalRowLast,
                ]}
              >
                <Text style={[styles.signalCell, styles.signalCol1, { color: colors.textPrimary }]}>
                  {sig.indicator}
                </Text>
                <Text
                  style={[
                    styles.signalCell,
                    styles.signalCol2,
                    { color: getSignalColor(sig.signal) },
                  ]}
                >
                  {sig.signal}
                </Text>
                <Text style={[styles.signalCell, styles.signalCol3, { color: colors.textSecondary }]}>
                  {sig.value}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ═══════════════════════════════════════
          5. 투자 품질 (Moat / 경영진 / 산업)
         ═══════════════════════════════════════ */}
      {quality && quality.highlights && (
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            투자 품질
          </Text>
          <Text style={[styles.sectionScore, { color: colors.primary }]}>
            {quality.score ?? 0}점
          </Text>

          <View style={styles.highlightList}>
            {(quality.highlights ?? []).map((h: string, i: number) => (
              <View key={i} style={styles.highlightRow}>
                <Ionicons name="ellipse" size={6} color={colors.primary} style={styles.bulletIcon} />
                <Text style={[styles.highlightText, { color: colors.textSecondary }]}>{h}</Text>
              </View>
            ))}
          </View>

          {quality.metrics && (
            <View style={[styles.signalTable, { borderColor: colors.border }]}>
              <View style={[styles.signalHeaderRow, { backgroundColor: colors.surfaceLight }]}>
                <Text style={[styles.signalHeaderCell, styles.signalCol1, { color: colors.textTertiary }]}>항목</Text>
                <Text style={[styles.signalHeaderCell, styles.signalCol2, { color: colors.textTertiary }]}>평가</Text>
                <Text style={[styles.signalHeaderCell, styles.signalCol3, { color: colors.textTertiary }]}>상세</Text>
              </View>
              {(quality.metrics ?? []).map((m: any, i: number) => (
                <View
                  key={i}
                  style={[
                    styles.signalRow,
                    { borderBottomColor: colors.border },
                    i === (quality.metrics ?? []).length - 1 && styles.signalRowLast,
                  ]}
                >
                  <Text style={[styles.signalCell, styles.signalCol1, { color: colors.textPrimary }]}>
                    {m.label}
                  </Text>
                  <Text
                    style={[
                      styles.signalCell,
                      styles.signalCol2,
                      { color: m.status === 'good' ? '#4CAF50' : m.status === 'bad' ? '#EF5350' : '#FFB74D' },
                    ]}
                  >
                    {m.value}
                  </Text>
                  <Text style={[styles.signalCell, styles.signalCol3, { color: colors.textSecondary }]}>
                    {m.detail || ''}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* ═══════════════════════════════════════
          6. 뉴스 타임라인
         ═══════════════════════════════════════ */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          뉴스 분석
        </Text>
        <NewsTimeline
          sentiment={news.sentiment ?? 'NEUTRAL'}
          highlights={news.highlights ?? []}
          recentNews={news.recentNews ?? []}
        />
      </View>

      {/* ═══════════════════════════════════════
          6. AI 종합 의견
         ═══════════════════════════════════════ */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          AI 종합 의견
        </Text>
        <AIOpinionCard
          summary={sections.aiOpinion?.summary ?? ''}
          bullCase={sections.aiOpinion?.bullCase ?? []}
          bearCase={sections.aiOpinion?.bearCase ?? []}
          targetPrice={sections.aiOpinion?.targetPrice ?? '-'}
          timeHorizon={sections.aiOpinion?.timeHorizon ?? '-'}
        />
      </View>

      {/* ═══════════════════════════════════════
          7. 데이터 출처
         ═══════════════════════════════════════ */}
      {result.dataSources && result.dataSources.length > 0 && (
        <View style={[styles.sourcesBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sourcesHeader}>
            <Ionicons name="document-text-outline" size={16} color={colors.textTertiary} />
            <Text style={[styles.sourcesTitle, { color: colors.textSecondary }]}>데이터 출처</Text>
          </View>
          {result.dataSources.map((source, idx) => (
            <View key={idx} style={styles.sourceRow}>
              <Text style={[styles.sourceName, { color: colors.textPrimary }]}>
                {source.name}
              </Text>
              <Text style={[styles.sourceDetail, { color: colors.textTertiary }]}>
                {source.detail} ({source.date})
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* ═══════════════════════════════════════
          8. 데이터 검증
         ═══════════════════════════════════════ */}
      {result.verification && (
        <View style={[styles.sourcesBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sourcesHeader}>
            <Ionicons name="shield-checkmark-outline" size={16} color={reliabilityColor(result.verification.level)} />
            <Text style={[styles.sourcesTitle, { color: colors.textSecondary }]}>
              데이터 검증 · {reliabilityLabel(result.verification.level)}
            </Text>
          </View>
          <Text style={[styles.sourceDetail, { color: colors.textSecondary, marginBottom: 8 }]}>
            {result.verification.summary}
          </Text>
          {result.verification.checks.map((check, idx) => (
            <View key={idx} style={styles.highlightRow}>
              <Ionicons name="ellipse" size={6} color={colors.primary} style={styles.bulletIcon} />
              <Text style={[styles.highlightText, { color: colors.textSecondary }]}>{check}</Text>
            </View>
          ))}
          <Text style={[styles.sourceDetail, { color: colors.textTertiary, marginTop: 8 }]}>
            점검 시각: {new Date(result.verification.checkedAt).toLocaleString('ko-KR')}
          </Text>
        </View>
      )}

      {/* ═══════════════════════════════════════
          9. 면책 문구
         ═══════════════════════════════════════ */}
      <View style={[styles.disclaimerBox, { borderColor: colors.border }]}>
        <Text style={[styles.disclaimerText, { color: colors.textQuaternary }]}>
          본 분석은 AI가 생성한 참고 자료이며, 투자 권유가 아닙니다.
          모든 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다.
          분석 시점: {new Date(result.generatedAt).toLocaleString('ko-KR')}
        </Text>
      </View>
    </View>
  );
}

// ── 유틸: 큰 숫자 포맷 (원화 단위: 조원/억원/만원) ──
function formatLargeNumber(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1_0000_0000_0000) {
    return `${sign}약 ${(abs / 1_0000_0000_0000).toFixed(1)}조원`;
  }
  if (abs >= 1_0000_0000) {
    return `${sign}약 ${(abs / 1_0000_0000).toFixed(0)}억원`;
  }
  if (abs >= 1_0000) {
    return `${sign}약 ${(abs / 1_0000).toFixed(0)}만원`;
  }
  return `${sign}${abs.toLocaleString()}원`;
}

// ── 유틸: 시그널 색상 ──
function getSignalColor(signal: string): string {
  const s = signal.toLowerCase();
  if (s.includes('매수') || s.includes('buy') || s.includes('상승') || s.includes('강세')) {
    return '#4CAF50';
  }
  if (s.includes('매도') || s.includes('sell') || s.includes('하락') || s.includes('약세')) {
    return '#EF5350';
  }
  return '#FFB74D';
}

// ══════════════════════════════════════════
// 스타일
// ══════════════════════════════════════════

const styles = StyleSheet.create({
  wrapper: {
    gap: 12,
  },

  // ── 헤더 카드 ──
  headerCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  stockName: {
    fontSize: 25,
    fontWeight: '800',
  },
  tickerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tickerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  recBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  recText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // ── 종합 점수 ──
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scoreCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 31,
    fontWeight: '900',
    lineHeight: 36,
  },
  scoreUnit: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: -3,
  },
  scoreLabels: {
    gap: 4,
    flex: 1,
  },
  scoreLabelMain: {
    fontSize: 17,
    fontWeight: '700',
  },
  scoreLabelSub: {
    fontSize: 14,
    lineHeight: 19,
  },
  scoreLabelPrecise: {
    fontSize: 12,
    fontWeight: '600',
  },
  verificationBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 2,
  },
  verificationBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // ── 시가총액/PER/PBR ──
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metricItem: {
    alignItems: 'center',
    gap: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
  },

  // ── 섹션 카드 ──
  sectionCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionScore: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },

  // ── 레이더 ──
  radarCenter: {
    alignItems: 'center',
    paddingVertical: 8,
  },

  // ── 하이라이트 ──
  highlightList: {
    gap: 8,
    marginBottom: 16,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bulletIcon: {
    marginTop: 5,
    marginRight: 8,
  },
  highlightText: {
    fontSize: 15,
    lineHeight: 21,
    flex: 1,
  },

  // ── 시그널 테이블 ──
  signalTable: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  signalHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  signalHeaderCell: {
    fontSize: 12,
    fontWeight: '600',
  },
  signalRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  signalRowLast: {
    borderBottomWidth: 0,
  },
  signalCell: {
    fontSize: 14,
  },
  signalCol1: { flex: 2 },
  signalCol2: { flex: 1.5, fontWeight: '600' },
  signalCol3: { flex: 1.5, textAlign: 'right' },

  // ── 데이터 출처 ──
  sourcesBox: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  sourcesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sourcesTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  sourceRow: {
    marginBottom: 6,
  },
  sourceName: {
    fontSize: 13,
    fontWeight: '600',
  },
  sourceDetail: {
    fontSize: 12,
    marginTop: 1,
  },

  // ── 면책 ──
  disclaimerBox: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  disclaimerText: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});
