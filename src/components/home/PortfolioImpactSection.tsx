/**
 * PortfolioImpactSection - 내 포트폴리오 영향도 섹션
 *
 * 역할: 오늘 맥락이 내 자산에 미친 영향을 시각화
 * 비유: 건강검진 결과처럼 "당신에게는 이렇게 영향을 줬습니다" 보여주는 섹션
 *
 * [개선 - 2026-02-14]
 * - isCalculating 상태 지원: "영향도 계산 중" 표시
 * - 30초 타임아웃: 30초 후에도 계산 중이면 폴백 메시지 표시
 * - 재시도 버튼: 사용자가 직접 다시 시도할 수 있는 경로
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

interface PortfolioImpactData {
  /** 수익률 변화 (%) */
  percentChange: number;
  /** 건강 점수 변화 */
  healthScoreChange: number;
  /** 영향도 메시지 */
  message: string;
  /** 영향도 계산 중 여부 (null 필드 존재) */
  isCalculating?: boolean;
}

interface PortfolioImpactSectionProps {
  /** 포트폴리오 영향도 데이터 */
  data: PortfolioImpactData;
  /** 재시도 콜백 (pull-to-refresh와 동일) */
  onRetry?: () => void;
}

/** 타임아웃 시간 (30초) */
const CALCULATING_TIMEOUT_MS = 30_000;

/**
 * 포트폴리오 영향도 섹션 컴포넌트
 *
 * @example
 * ```tsx
 * <PortfolioImpactSection
 *   data={{
 *     percentChange: -1.2,
 *     healthScoreChange: 0,
 *     message: '당신의 포트폴리오는 -1.2% 영향, 건강 점수 변동 없음',
 *     isCalculating: false,
 *   }}
 *   onRetry={() => refetch()}
 * />
 * ```
 */
export function PortfolioImpactSection({ data, onRetry }: PortfolioImpactSectionProps) {
  const { colors } = useTheme();
  const [timedOut, setTimedOut] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 30초 타임아웃: isCalculating이 true인 채 30초 지나면 폴백 표시
  useEffect(() => {
    if (data.isCalculating) {
      setTimedOut(false);
      timeoutRef.current = setTimeout(() => {
        setTimedOut(true);
      }, CALCULATING_TIMEOUT_MS);
    } else {
      setTimedOut(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [data.isCalculating]);

  // ── 상태 1: 계산 중 + 타임아웃 발생 → 폴백 메시지 ──
  if (data.isCalculating && timedOut) {
    return (
      <View style={[s.container, { backgroundColor: 'rgba(255, 152, 0, 0.08)' }]}>
        <View style={s.headerRow}>
          <Ionicons name="analytics-outline" size={18} color="#FF9800" />
          <Text style={[s.headerText, { color: colors.textSecondary }]}>
            오늘 맥락이 내 자산에 미친 영향
          </Text>
        </View>

        <View style={[s.fallbackBox, { backgroundColor: colors.surface }]}>
          <Ionicons name="time-outline" size={32} color="#FF9800" />
          <Text style={[s.fallbackTitle, { color: colors.textPrimary }]}>
            영향도 데이터를 가져올 수 없습니다
          </Text>
          <Text style={[s.fallbackDesc, { color: colors.textSecondary }]}>
            서버에서 영향도 계산이 아직 완료되지 않았습니다.{'\n'}내일 아침 다시 확인해주세요.
          </Text>

          {onRetry && (
            <TouchableOpacity
              style={[s.retryButton, { borderColor: '#FF9800' }]}
              onPress={onRetry}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={16} color="#FF9800" />
              <Text style={[s.retryText, { color: '#FF9800' }]}>다시 시도</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // ── 상태 2: 계산 중 (타임아웃 전) → 로딩 UI ──
  if (data.isCalculating) {
    return (
      <View style={[s.container, { backgroundColor: 'rgba(33, 150, 243, 0.08)' }]}>
        <View style={s.headerRow}>
          <Ionicons name="analytics-outline" size={18} color="#2196F3" />
          <Text style={[s.headerText, { color: colors.textSecondary }]}>
            오늘 맥락이 내 자산에 미친 영향
          </Text>
        </View>

        <View style={[s.calculatingBox, { backgroundColor: colors.surface }]}>
          <ActivityIndicator size="small" color="#2196F3" />
          <Text style={[s.calculatingText, { color: colors.textSecondary }]}>
            영향도 계산 중...
          </Text>
        </View>
      </View>
    );
  }

  // ── 상태 3: 정상 데이터 표시 ──

  // 수익률 변화 색상
  const changeColor = data.percentChange >= 0 ? colors.buy : colors.sell;
  const changeBgColor = data.percentChange >= 0
    ? 'rgba(76, 175, 80, 0.1)'
    : 'rgba(207, 102, 121, 0.1)';

  // 원화 환산 (임시: -1.2% → -120,000원)
  const krwImpact = (data.percentChange * 1000000).toFixed(0);
  const formattedKRW = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(Number(krwImpact));

  return (
    <View style={[s.container, { backgroundColor: 'rgba(33, 150, 243, 0.1)' }]}>
      {/* 제목 */}
      <View style={s.headerRow}>
        <Ionicons name="analytics-outline" size={18} color="#2196F3" />
        <Text style={[s.headerText, { color: colors.textSecondary }]}>
          오늘 맥락이 내 자산에 미친 영향
        </Text>
      </View>

      {/* 수익률 변화 */}
      <View style={[s.changeBox, { backgroundColor: changeBgColor }]}>
        <Text style={[s.changeValue, { color: changeColor }]}>
          {data.percentChange > 0 ? '+' : ''}
          {data.percentChange.toFixed(1)}%
        </Text>
        <Text style={[s.changeLabel, { color: colors.textSecondary }]}>
          {data.percentChange >= 0 ? '예상 수익' : '예상 손실'}: {formattedKRW}
        </Text>
      </View>

      {/* 건강 점수 변화 */}
      <View style={[s.healthBox, { backgroundColor: colors.surface }]}>
        <Text style={[s.healthLabel, { color: colors.textSecondary }]}>건강 점수</Text>
        <View style={s.healthValueRow}>
          {data.healthScoreChange === 0 ? (
            <>
              <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
              <Text style={[s.healthValue, { color: colors.textPrimary }]}>
                변동 없음
              </Text>
            </>
          ) : (
            <>
              <Ionicons
                name={data.healthScoreChange > 0 ? 'arrow-up-circle' : 'arrow-down-circle'}
                size={18}
                color={data.healthScoreChange > 0 ? '#4CAF50' : '#CF6679'}
              />
              <Text style={[s.healthValue, {
                color: data.healthScoreChange > 0 ? colors.buy : colors.sell
              }]}>
                {data.healthScoreChange > 0 ? '+' : ''}
                {data.healthScoreChange}
              </Text>
            </>
          )}
        </View>
      </View>

      {/* AI 조언 메시지 */}
      <View style={s.adviceRow}>
        <Ionicons name="bulb-outline" size={16} color="#FFC107" style={s.adviceIcon} />
        <Text style={[s.adviceText, { color: colors.textSecondary }]}>
          {data.message}
        </Text>
      </View>
    </View>
  );
}

/**
 * 기본 export (호환성)
 */
export default PortfolioImpactSection;

// ============================================================================
// 스타일
// ============================================================================

const s = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    fontSize: 14,
    marginLeft: 8,
  },
  changeBox: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  changeValue: {
    fontSize: 29,
    fontWeight: '700',
  },
  changeLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  healthBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  healthLabel: {
    fontSize: 14,
  },
  healthValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthValue: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  adviceRow: {
    flexDirection: 'row',
  },
  adviceIcon: {
    marginTop: 4,
  },
  adviceText: {
    fontSize: 14,
    lineHeight: 21,
    marginLeft: 8,
    flex: 1,
  },
  // 계산 중 상태
  calculatingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 20,
    gap: 12,
  },
  calculatingText: {
    fontSize: 15,
    fontWeight: '500',
  },
  // 타임아웃 폴백 상태
  fallbackBox: {
    alignItems: 'center',
    borderRadius: 12,
    padding: 24,
    gap: 8,
  },
  fallbackTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  fallbackDesc: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
