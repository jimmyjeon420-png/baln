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
  const recColor = {
    STRONG_BUY: '#4CAF50',
    BUY: '#81C784',
    HOLD: '#FFA726',
    SELL: '#EF5350',
    STRONG_SELL: '#CF6679',
  }[result.recommendation];

  const recLabel = {
    STRONG_BUY: '적극 매수',
    BUY: '매수',
    HOLD: '보유',
    SELL: '매도',
    STRONG_SELL: '적극 매도',
  }[result.recommendation];

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
        <ScoreGauge score={result.sections.financial.score} label="재무" />
        <ScoreGauge score={result.sections.technical.score} label="기술" />
      </View>

      {/* 재무 분석 */}
      <SectionCard title={result.sections.financial.title} icon="bar-chart" iconColor="#4FC3F7">
        {result.sections.financial.highlights.map((h, i) => (
          <Text key={i} style={styles.highlight}>- {h}</Text>
        ))}
        {result.sections.financial.metrics.map((m, i) => (
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
      <SectionCard title={result.sections.technical.title} icon="trending-up" iconColor="#FFA726">
        {result.sections.technical.highlights.map((h, i) => (
          <Text key={i} style={styles.highlight}>- {h}</Text>
        ))}
        {result.sections.technical.signals.map((s, i) => (
          <View key={i} style={styles.metricRow}>
            <Text style={styles.metricLabel}>{s.indicator}</Text>
            <Text style={styles.metricValue}>{s.signal} ({s.value})</Text>
          </View>
        ))}
      </SectionCard>

      {/* 뉴스 분석 */}
      <SectionCard title={result.sections.news.title} icon="newspaper" iconColor="#7C4DFF">
        <View style={[
          styles.sentimentBadge,
          { backgroundColor: result.sections.news.sentiment === 'POSITIVE' ? '#4CAF5020' : result.sections.news.sentiment === 'NEGATIVE' ? '#CF667920' : '#FFA72620' },
        ]}>
          <Text style={[
            styles.sentimentText,
            { color: result.sections.news.sentiment === 'POSITIVE' ? '#4CAF50' : result.sections.news.sentiment === 'NEGATIVE' ? '#CF6679' : '#FFA726' },
          ]}>
            {result.sections.news.sentiment === 'POSITIVE' ? '긍정적' : result.sections.news.sentiment === 'NEGATIVE' ? '부정적' : '중립'}
          </Text>
        </View>
        {result.sections.news.recentNews.map((n, i) => (
          <View key={i} style={styles.newsItem}>
            <Text style={styles.newsTitle}>{n.title}</Text>
            <Text style={styles.newsImpact}>{n.impact} | {n.date}</Text>
          </View>
        ))}
      </SectionCard>

      {/* AI 종합 의견 */}
      <SectionCard title={result.sections.aiOpinion.title} icon="sparkles" iconColor="#4CAF50">
        <Text style={styles.summary}>{result.sections.aiOpinion.summary}</Text>
        <Text style={styles.subHeader}>강세 시나리오</Text>
        {result.sections.aiOpinion.bullCase.map((b, i) => (
          <Text key={i} style={[styles.highlight, { color: '#4CAF50' }]}>+ {b}</Text>
        ))}
        <Text style={styles.subHeader}>약세 시나리오</Text>
        {result.sections.aiOpinion.bearCase.map((b, i) => (
          <Text key={i} style={[styles.highlight, { color: '#CF6679' }]}>- {b}</Text>
        ))}
        <View style={styles.targetRow}>
          <Text style={styles.targetLabel}>목표가: {result.sections.aiOpinion.targetPrice}</Text>
          <Text style={styles.targetLabel}>기간: {result.sections.aiOpinion.timeHorizon}</Text>
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
