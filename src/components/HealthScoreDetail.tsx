/**
 * 건강 점수 상세 진단서 컴포넌트
 * ─────────────────────────────────
 * PanicShieldCard 패턴 기반
 * 6팩터별 점수 + 프로그레스 바 + 토글 설명
 *
 * UX 개선 (2026-02-09):
 * - SVG 막대 그래프 추가 (70점 기준선)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import type { HealthScoreResult } from '../services/rebalanceScore';

// Android 레이아웃 애니메이션 활성화
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface HealthScoreDetailProps {
  result: HealthScoreResult;
}

/** 바 색상 결정 (점수 기반) */
const getBarColor = (score: number): string => {
  if (score >= 70) return '#4CAF50';
  if (score >= 40) return '#FFC107';
  return '#CF6679';
};

/** 팩터 가중치 → 퍼센트 문자열 */
const formatWeight = (weight: number): string => `${Math.round(weight * 100)}%`;

export default function HealthScoreDetail({ result }: HealthScoreDetailProps) {
  const [showGuide, setShowGuide] = useState(false);

  const toggleGuide = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowGuide(!showGuide);
  };

  // 등급별 컨테이너 틴트
  const containerBg = result.gradeBgColor.replace(/[\d.]+\)$/, '0.08)');

  return (
    <View style={[styles.container, { backgroundColor: containerBg }]}>
      {/* ====== 헤더: 아이콘 + 제목 + 등급 배지 + 점수 ====== */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>🏥</Text>
          <Text style={styles.title}>건강 점수</Text>
          <View style={[styles.gradeBadge, { backgroundColor: result.gradeColor }]}>
            <Text style={styles.gradeText}>{result.grade}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.totalScore, { color: result.gradeColor }]}>
            {result.totalScore}
          </Text>
          <Text style={styles.totalScoreLabel}>/100</Text>
        </View>
      </View>

      {/* ====== 코멘트 바 ====== */}
      <View style={styles.commentBar}>
        <Text style={[styles.commentText, { color: result.gradeColor }]}>
          {result.summary}
        </Text>
      </View>

      {/* ====== SVG 막대 그래프 (펼치기 전 표시) ====== */}
      {!showGuide && (
        <View style={styles.chartContainer}>
          <Svg width="100%" height="260">
            {/* 70점 기준선 (점선) */}
            <Line
              x1="0"
              y1={260 - (70 * 2.4)}
              x2="100%"
              y2={260 - (70 * 2.4)}
              stroke="#666"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
            <SvgText
              x="4"
              y={260 - (70 * 2.4) - 4}
              fontSize="10"
              fill="#888"
            >
              70점 (기준)
            </SvgText>

            {/* 6개 막대 */}
            {result.factors.map((factor, idx) => {
              const barColor = getBarColor(factor.score);
              const barWidth = 40;
              const spacing = 12;
              const x = idx * (barWidth + spacing) + 10;
              const barHeight = Math.max(5, factor.score * 2.4); // 100점 → 240px
              const y = 260 - barHeight;

              return (
                <React.Fragment key={idx}>
                  {/* 막대 */}
                  <Rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill={barColor}
                    rx="4"
                  />
                  {/* 점수 라벨 */}
                  <SvgText
                    x={x + barWidth / 2}
                    y={y - 6}
                    fontSize="12"
                    fill={barColor}
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {factor.score}
                  </SvgText>
                  {/* 아이콘 라벨 */}
                  <SvgText
                    x={x + barWidth / 2}
                    y={255}
                    fontSize="16"
                    textAnchor="middle"
                  >
                    {factor.icon}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </Svg>
        </View>
      )}

      {/* ====== 6개 팩터 프로그레스 바 (펼친 후 표시) ====== */}
      {showGuide && (
        <View style={styles.factorsContainer}>
          {result.factors.map((factor, idx) => {
            const barColor = getBarColor(factor.score);
            return (
              <View key={idx} style={styles.factorRow}>
                <View style={styles.factorLabelRow}>
                  <Text style={styles.factorIcon}>{factor.icon}</Text>
                  <Text style={styles.factorLabel}>{factor.label}</Text>
                  <Text style={[styles.factorScore, { color: barColor }]}>
                    {factor.score}
                  </Text>
                </View>
                <View style={styles.barBg}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${Math.max(2, factor.score)}%`, backgroundColor: barColor },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ====== 토글: "이 점수는 무엇인가요?" ====== */}
      <TouchableOpacity
        style={styles.guideToggle}
        onPress={toggleGuide}
        activeOpacity={0.7}
      >
        <Ionicons name="help-circle-outline" size={16} color="#888888" />
        <Text style={styles.guideToggleText}>
          이 점수는 무엇인가요?
        </Text>
        <Ionicons
          name={showGuide ? 'chevron-up' : 'chevron-down'}
          size={14}
          color="#888888"
        />
      </TouchableOpacity>

      {/* ====== 펼침: 팩터별 설명 ====== */}
      {showGuide && (
        <View style={styles.guideContainer}>
          <Text style={styles.guideIntro}>
            6가지 관점에서 포트폴리오 건강 상태를 진단합니다.
            브릿지워터 Risk Parity 철학을 기반으로 설계되었습니다.
          </Text>
          {result.factors.map((factor, idx) => (
            <View key={idx} style={styles.guideItem}>
              <View style={styles.guideItemHeader}>
                <Text style={styles.guideItemIcon}>{factor.icon}</Text>
                <Text style={styles.guideItemLabel}>{factor.label}</Text>
                <Text style={styles.guideItemWeight}>
                  가중치 {formatWeight(factor.weight)}
                </Text>
              </View>
              <Text style={styles.guideItemComment}>{factor.comment}</Text>
            </View>
          ))}
          <View style={styles.guideFooter}>
            <Text style={styles.guideFooterText}>
              {'\u2022'} Bridgewater All Weather 전략 — Ray Dalio (1996){'\n'}
              {'\u2022'} HHI 집중도 — 미 DOJ/FTC 기업결합 심사 기준{'\n'}
              {'\u2022'} Tax-Loss Harvesting — Wealthfront/Betterment 실무
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// 스타일 (PanicShieldCard 동일 패턴)
// ============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    backgroundColor: '#1E1E1E',
  },

  // 헤더
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    fontSize: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  gradeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  gradeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  totalScore: {
    fontSize: 32,
    fontWeight: '800',
  },
  totalScoreLabel: {
    fontSize: 14,
    color: '#888888',
    marginLeft: 2,
  },

  // 코멘트 바
  commentBar: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 18,
  },
  commentText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  // SVG 차트 컨테이너
  chartContainer: {
    marginBottom: 16,
    paddingVertical: 8,
  },

  // 팩터 목록
  factorsContainer: {
    gap: 10,
    marginBottom: 12,
  },
  factorRow: {},
  factorLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  factorIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  factorLabel: {
    flex: 1,
    fontSize: 12,
    color: '#CCCCCC',
  },
  factorScore: {
    fontSize: 12,
    fontWeight: '700',
    width: 28,
    textAlign: 'right',
  },
  barBg: {
    height: 6,
    backgroundColor: '#333333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },

  // 가이드 토글
  guideToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  guideToggleText: {
    fontSize: 12,
    color: '#888888',
  },

  // 가이드 컨테이너
  guideContainer: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  guideIntro: {
    fontSize: 12,
    color: '#999999',
    lineHeight: 20,
    marginBottom: 14,
  },
  guideItem: {
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  guideItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  guideItemIcon: {
    fontSize: 13,
  },
  guideItemLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CCCCCC',
    flex: 1,
  },
  guideItemWeight: {
    fontSize: 11,
    color: '#777777',
    fontWeight: '600',
  },
  guideItemComment: {
    fontSize: 11,
    color: '#999999',
    lineHeight: 17,
    paddingLeft: 22,
  },
  guideFooter: {
    marginTop: 4,
  },
  guideFooterText: {
    fontSize: 11,
    color: '#666666',
    lineHeight: 18,
  },
});
