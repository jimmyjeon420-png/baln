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
  STRONG_BUY: { bg: 'rgba(76,175,80,0.2)', text: '#4CAF50', label: '강력 매수' },
  BUY: { bg: 'rgba(102,187,106,0.2)', text: '#66BB6A', label: '매수' },
  HOLD: { bg: 'rgba(255,183,77,0.2)', text: '#FFB74D', label: '보유' },
  SELL: { bg: 'rgba(239,83,80,0.2)', text: '#EF5350', label: '매도' },
  STRONG_SELL: { bg: 'rgba(207,102,121,0.2)', text: '#CF6679', label: '강력 매도' },
};

// ── 뉴스 sentiment → 점수 변환 ──
function sentimentToScore(sentiment: string): number {
  switch (sentiment) {
    case 'POSITIVE': return 80;
    case 'NEUTRAL': return 50;
    case 'NEGATIVE': return 20;
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

// ── financial.metrics에서 특정 지표 추출 ──
function extractMetricValue(
  metrics: Array<{ label: string; value: string }>,
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

  const { sections } = result;
  const rec = RECOMMENDATION_COLORS[result.recommendation] ?? RECOMMENDATION_COLORS.HOLD;

  // ── 뉴스 점수 (ScoreRadar용) ──
  const newsScore = sentimentToScore(sections.news.sentiment);

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
    const roe = extractMetricValue(sections.financial.metrics, ['roe', '자기자본이익률']);
    const debtRatio = extractMetricValue(sections.financial.metrics, ['부채비율', 'debt']);
    const keyMetrics = { roe, roic: 0, debtRatio };

    // cashFlowSummary: financial.highlights에서 현금흐름 관련 추출
    const cashFlowHighlight = sections.financial.highlights.find((h) =>
      h.includes('현금') || h.includes('cash') || h.includes('영업활동'),
    );
    const cashFlowSummary = cashFlowHighlight ?? '상세 정보는 실적 발표 후 제공됩니다';

    return { yearlyData, keyMetrics, cashFlowSummary };
  }, [result.quarterlyData, sections.financial.metrics, sections.financial.highlights]);

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
            <Text style={[styles.scoreNumber, { color: getScoreColor(result.overallScore) }]}>
              {result.overallScore}
            </Text>
            <Text style={[styles.scoreUnit, { color: colors.textTertiary }]}>점</Text>
          </View>
          <View style={styles.scoreLabels}>
            <Text style={[styles.scoreLabelMain, { color: colors.textPrimary }]}>종합 점수</Text>
            <Text style={[styles.scoreLabelSub, { color: colors.textTertiary }]}>
              재무 {sections.financial.score} · 기술 {sections.technical.score} · 뉴스 {newsScore}
            </Text>
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
            financialScore={sections.financial.score}
            technicalScore={sections.technical.score}
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
          {sections.financial.score}점
        </Text>

        {/* 하이라이트 */}
        <View style={styles.highlightList}>
          {sections.financial.highlights.map((h, i) => (
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
          {sections.technical.score}점
        </Text>

        {/* 하이라이트 */}
        <View style={styles.highlightList}>
          {sections.technical.highlights.map((h, i) => (
            <View key={i} style={styles.highlightRow}>
              <Ionicons name="ellipse" size={6} color={colors.primary} style={styles.bulletIcon} />
              <Text style={[styles.highlightText, { color: colors.textSecondary }]}>{h}</Text>
            </View>
          ))}
        </View>

        {/* 시그널 테이블 */}
        {sections.technical.signals.length > 0 && (
          <View style={[styles.signalTable, { borderColor: colors.border }]}>
            {/* 테이블 헤더 */}
            <View style={[styles.signalHeaderRow, { backgroundColor: colors.surfaceLight }]}>
              <Text style={[styles.signalHeaderCell, styles.signalCol1, { color: colors.textTertiary }]}>지표</Text>
              <Text style={[styles.signalHeaderCell, styles.signalCol2, { color: colors.textTertiary }]}>신호</Text>
              <Text style={[styles.signalHeaderCell, styles.signalCol3, { color: colors.textTertiary }]}>값</Text>
            </View>
            {/* 테이블 바디 */}
            {sections.technical.signals.map((sig, i) => (
              <View
                key={i}
                style={[
                  styles.signalRow,
                  { borderBottomColor: colors.border },
                  i === sections.technical.signals.length - 1 && styles.signalRowLast,
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
          5. 뉴스 타임라인
         ═══════════════════════════════════════ */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          뉴스 분석
        </Text>
        <NewsTimeline
          sentiment={sections.news.sentiment}
          highlights={sections.news.highlights}
          recentNews={sections.news.recentNews}
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
          summary={sections.aiOpinion.summary}
          bullCase={sections.aiOpinion.bullCase}
          bearCase={sections.aiOpinion.bearCase}
          targetPrice={sections.aiOpinion.targetPrice}
          timeHorizon={sections.aiOpinion.timeHorizon}
        />
      </View>

      {/* ═══════════════════════════════════════
          7. 면책 문구
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

// ── 유틸: 큰 숫자 포맷 (억/조) ──
function formatLargeNumber(value: number): string {
  if (value >= 1_0000_0000_0000) {
    return `${(value / 1_0000_0000_0000).toFixed(1)}조`;
  }
  if (value >= 1_0000_0000) {
    return `${(value / 1_0000_0000).toFixed(0)}억`;
  }
  if (value >= 1_0000) {
    return `${(value / 1_0000).toFixed(0)}만`;
  }
  return value.toLocaleString();
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
    fontSize: 24,
    fontWeight: '800',
  },
  tickerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tickerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  recBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  recText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // ── 종합 점수 ──
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scoreCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 32,
  },
  scoreUnit: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: -2,
  },
  scoreLabels: {
    gap: 4,
  },
  scoreLabelMain: {
    fontSize: 16,
    fontWeight: '700',
  },
  scoreLabelSub: {
    fontSize: 13,
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
    fontSize: 11,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
  },

  // ── 섹션 카드 ──
  sectionCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionScore: {
    fontSize: 14,
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
    fontSize: 14,
    lineHeight: 20,
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
    fontSize: 11,
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
    fontSize: 13,
  },
  signalCol1: { flex: 2 },
  signalCol2: { flex: 1.5, fontWeight: '600' },
  signalCol3: { flex: 1.5, textAlign: 'right' },

  // ── 면책 ──
  disclaimerBox: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  disclaimerText: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
});
