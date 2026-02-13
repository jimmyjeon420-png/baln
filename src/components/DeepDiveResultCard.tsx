/**
 * DeepDiveResultCard - 종목 딥다이브 분석 결과 카드
 * 4섹션: 재무/기술/뉴스/AI 의견 + 종합 점수
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DeepDiveResult } from '../types/marketplace';

interface Props {
  result: DeepDiveResult;
}

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const color = score >= 70 ? '#4CAF50' : score >= 40 ? '#FFA726' : '#CF6679';
  return (
    <View style={gaugeStyles.container}>
      <View style={gaugeStyles.barBg}>
        <View style={[gaugeStyles.barFill, { width: `${score}%`, backgroundColor: color }]} />
      </View>
      <View style={gaugeStyles.labelRow}>
        <Text style={gaugeStyles.label}>{label}</Text>
        <Text style={[gaugeStyles.score, { color }]}>{score}/100</Text>
      </View>
    </View>
  );
}

function SectionCard({
  title,
  icon,
  iconColor,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={sectionStyles.card}>
      <TouchableOpacity
        style={sectionStyles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Ionicons name={icon} size={18} color={iconColor} />
        <Text style={sectionStyles.title}>{title}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="#666"
        />
      </TouchableOpacity>
      {expanded && <View style={sectionStyles.content}>{children}</View>}
    </View>
  );
}

export default function DeepDiveResultCard({ result }: Props) {
  // null 안전 접근: AI 응답이 부분적일 수 있으므로 모든 중첩 배열/객체에 기본값 적용
  const sections = result.sections ?? {} as any;
  const financial = sections.financial ?? { score: 0, title: '재무 분석', highlights: [], metrics: [] };
  const technical = sections.technical ?? { score: 0, title: '기술적 분석', highlights: [], signals: [] };
  const news = sections.news ?? { title: '뉴스 분석', sentiment: 'NEUTRAL', recentNews: [] };
  const aiOpinion = sections.aiOpinion ?? { title: 'AI 종합 의견', summary: '', bullCase: [], bearCase: [], targetPrice: '-', timeHorizon: '-' };

  const recColor = {
    VERY_POSITIVE: '#4CAF50',
    POSITIVE: '#81C784',
    NEUTRAL: '#FFA726',
    NEGATIVE: '#EF5350',
    VERY_NEGATIVE: '#CF6679',
  }[result.recommendation] ?? '#FFA726';

  const recLabel = {
    VERY_POSITIVE: '매우 긍정적',
    POSITIVE: '긍정적',
    NEUTRAL: '중립',
    NEGATIVE: '부정적',
    VERY_NEGATIVE: '매우 부정적',
  }[result.recommendation] ?? '중립';

  return (
    <View style={styles.container}>
      {/* 종합 점수 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.ticker}>{result.ticker}</Text>
          <Text style={styles.name}>{result.name}</Text>
        </View>
        <View style={styles.scoreContainer}>
          <Text style={styles.overallScore}>{result.overallScore}</Text>
          <Text style={styles.scoreLabel}>종합 점수</Text>
          <View style={[styles.recBadge, { backgroundColor: recColor }]}>
            <Text style={styles.recText}>{recLabel}</Text>
          </View>
        </View>
      </View>

      {/* 점수 게이지 */}
      <View style={styles.gaugeSection}>
        <ScoreGauge score={financial.score ?? 0} label="재무" />
        <ScoreGauge score={technical.score ?? 0} label="기술" />
      </View>

      {/* 재무 분석 */}
      <SectionCard title={financial.title || '재무 분석'} icon="bar-chart" iconColor="#4FC3F7">
        {(financial.highlights ?? []).map((h: string, i: number) => (
          <Text key={i} style={styles.highlight}>- {h}</Text>
        ))}
        {(financial.metrics ?? []).map((m: any, i: number) => (
          <View key={i} style={styles.metricRow}>
            <Text style={styles.metricLabel}>{m.label}</Text>
            <Text style={[
              styles.metricValue,
              { color: m.status === 'good' ? '#4CAF50' : m.status === 'bad' ? '#CF6679' : '#888' },
            ]}>
              {m.value}
            </Text>
          </View>
        ))}
      </SectionCard>

      {/* 기술적 분석 */}
      <SectionCard title={technical.title || '기술적 분석'} icon="trending-up" iconColor="#FFA726">
        {(technical.highlights ?? []).map((h: string, i: number) => (
          <Text key={i} style={styles.highlight}>- {h}</Text>
        ))}
        {(technical.signals ?? []).map((s: any, i: number) => (
          <View key={i} style={styles.metricRow}>
            <Text style={styles.metricLabel}>{s.indicator}</Text>
            <Text style={styles.metricValue}>{s.signal} ({s.value})</Text>
          </View>
        ))}
      </SectionCard>

      {/* 뉴스 분석 */}
      <SectionCard title={news.title || '뉴스 분석'} icon="newspaper" iconColor="#7C4DFF">
        <View style={[
          styles.sentimentBadge,
          { backgroundColor:
            (news.sentiment === 'VERY_POSITIVE' || news.sentiment === 'POSITIVE') ? '#4CAF5020'
            : (news.sentiment === 'VERY_NEGATIVE' || news.sentiment === 'NEGATIVE') ? '#CF667920'
            : '#FFA72620' },
        ]}>
          <Text style={[
            styles.sentimentText,
            { color:
              (news.sentiment === 'VERY_POSITIVE' || news.sentiment === 'POSITIVE') ? '#4CAF50'
              : (news.sentiment === 'VERY_NEGATIVE' || news.sentiment === 'NEGATIVE') ? '#CF6679'
              : '#FFA726' },
          ]}>
            {news.sentiment === 'VERY_POSITIVE' ? '매우 긍정적'
              : news.sentiment === 'POSITIVE' ? '긍정적'
              : news.sentiment === 'NEGATIVE' ? '부정적'
              : news.sentiment === 'VERY_NEGATIVE' ? '매우 부정적'
              : '중립'}
          </Text>
        </View>
        {(news.recentNews ?? []).map((n: any, i: number) => (
          <View key={i} style={styles.newsItem}>
            <Text style={styles.newsTitle}>{n.title}</Text>
            <Text style={styles.newsImpact}>{n.impact} | {n.date}</Text>
          </View>
        ))}
      </SectionCard>

      {/* AI 종합 의견 */}
      <SectionCard title={aiOpinion.title || 'AI 종합 의견'} icon="sparkles" iconColor="#4CAF50">
        <Text style={styles.summary}>{aiOpinion.summary || ''}</Text>
        <Text style={styles.subHeader}>강세 시나리오</Text>
        {(aiOpinion.bullCase ?? []).map((b: string, i: number) => (
          <Text key={i} style={[styles.highlight, { color: '#4CAF50' }]}>+ {b}</Text>
        ))}
        <Text style={styles.subHeader}>약세 시나리오</Text>
        {(aiOpinion.bearCase ?? []).map((b: string, i: number) => (
          <Text key={i} style={[styles.highlight, { color: '#CF6679' }]}>- {b}</Text>
        ))}
        <View style={styles.targetRow}>
          <Text style={styles.targetLabel}>목표가: {aiOpinion.targetPrice ?? '-'}</Text>
          <Text style={styles.targetLabel}>기간: {aiOpinion.timeHorizon ?? '-'}</Text>
        </View>
      </SectionCard>

      {/* 면책 */}
      <Text style={styles.disclaimer}>
        본 분석은 AI가 생성한 참고 자료이며, 투자 권유가 아닙니다.
      </Text>
    </View>
  );
}

const gaugeStyles = StyleSheet.create({
  container: { flex: 1 },
  barBg: { height: 6, backgroundColor: '#333', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  label: { color: '#888', fontSize: 11 },
  score: { fontSize: 11, fontWeight: '700' },
});

const sectionStyles = StyleSheet.create({
  card: {
    backgroundColor: '#252525',
    borderRadius: 12,
    marginTop: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 8,
  },
  title: { flex: 1, color: '#FFF', fontSize: 14, fontWeight: '600' },
  content: { padding: 14, paddingTop: 0 },
});

const styles = StyleSheet.create({
  container: { gap: 2 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  ticker: { color: '#FFF', fontSize: 24, fontWeight: '800' },
  name: { color: '#888', fontSize: 14, marginTop: 2 },
  scoreContainer: { alignItems: 'center' },
  overallScore: { color: '#FFF', fontSize: 36, fontWeight: '800' },
  scoreLabel: { color: '#888', fontSize: 11 },
  recBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 4 },
  recText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  gaugeSection: { flexDirection: 'row', gap: 12, marginTop: 12 },
  highlight: { color: '#CCC', fontSize: 13, lineHeight: 20, marginBottom: 2 },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: '#333' },
  metricLabel: { color: '#888', fontSize: 13 },
  metricValue: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  sentimentBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
  sentimentText: { fontSize: 12, fontWeight: '700' },
  newsItem: { marginBottom: 8 },
  newsTitle: { color: '#CCC', fontSize: 13, fontWeight: '600' },
  newsImpact: { color: '#666', fontSize: 11, marginTop: 2 },
  summary: { color: '#CCC', fontSize: 13, lineHeight: 20, marginBottom: 10 },
  subHeader: { color: '#FFF', fontSize: 13, fontWeight: '700', marginTop: 8, marginBottom: 4 },
  targetRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: '#333' },
  targetLabel: { color: '#888', fontSize: 12 },
  disclaimer: { color: '#555', fontSize: 10, textAlign: 'center', marginTop: 12 },
});
