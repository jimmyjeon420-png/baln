/**
 * 맥락 카드 (Context Card) - 메인 컴포넌트
 *
 * 역할: 시장 변동의 "왜"를 5겹 레이어 아코디언으로 시각화
 * 비유: 일기예보처럼 "오늘 시장이 왜 이렇게 움직였는지" 5분 안에 이해시키는 카드
 *
 * 5겹 레이어 구조:
 * 1. 역사적 맥락 — "2008년에도 이런 패턴이 있었고, 6개월 후 회복했습니다" (무료)
 * 2. 거시경제 체인 — "미국 CPI 발표 → 금리 인상 우려 → 기술주 하락" (무료)
 * 3. 정치 맥락 — "트럼프 관세 발표 — 역사적 사례와 영향 제한적" (무료)
 * 4. 기관 행동 — "외국인 3일 연속 순매도 중 (리밸런싱 시즌)" (Premium)
 * 5. 내 포트폴리오 영향 — "포트폴리오 -1.2%, 건강 점수 변동 없음" (Premium)
 *
 * 무료 사용자: 1~3번 레이어 열람 가능, 4~5번은 Premium 잠금
 *
 * 두 가지 사용 방식 지원:
 * 1. 새 방식 (플랫 Props): historicalContext, macroChain 등 개별 전달
 * 2. 레거시 방식 (data Prop): ContextCardData 객체로 한번에 전달
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { ContextLayerCard } from './ContextLayerCard';
import type { ContextCardData } from '../../types/contextCard';

// ============================================================================
// Android LayoutAnimation 활성화
// ============================================================================

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ============================================================================
// Props 인터페이스
// ============================================================================

/** 새 방식: 플랫 Props */
interface ContextCardFlatProps {
  /** 역사적 맥락 텍스트 */
  historicalContext: string;
  /** 거시경제 인과 체인 (단계별 배열) */
  macroChain: string[];
  /** 정치 맥락 텍스트 (신규) */
  politicalContext?: string;
  /** 기관 행동 텍스트 */
  institutionalAction: string;
  /** 포트폴리오 영향 */
  portfolioImpact: {
    changePercent: number;
    healthScoreChange: string;
  };
  /** 사용자 Premium 여부 */
  isPremium: boolean;
  /** 카드 날짜 (YYYY-MM-DD 형식) */
  date: string;
  /** Premium 구매 버튼 핸들러 */
  onPressPremium?: () => void;
  /** 업데이트 시점 라벨 (예: "오전 6:03 업데이트") */
  updateTimeLabel?: string;
  /** 시간대 아이콘 이름 (Ionicons) */
  timeSlotIcon?: string;
  data?: never;
  onClose?: never;
}

/** 레거시 방식: data 객체 Props (index.tsx 하위 호환) */
interface ContextCardLegacyProps {
  /** 맥락 카드 데이터 객체 */
  data: ContextCardData;
  /** 사용자 Premium 여부 */
  isPremium?: boolean;
  /** Premium 구매 버튼 핸들러 */
  onPressPremium?: () => void;
  /** 닫기 버튼 핸들러 (모달에서 사용) */
  onClose?: () => void;
  /** 업데이트 시점 라벨 */
  updateTimeLabel?: string;
  /** 시간대 아이콘 이름 */
  timeSlotIcon?: string;
  historicalContext?: never;
  macroChain?: never;
  politicalContext?: never;
  institutionalAction?: never;
  portfolioImpact?: never;
  date?: never;
}

export type ContextCardProps = ContextCardFlatProps | ContextCardLegacyProps;

// ============================================================================
// 유틸 함수
// ============================================================================

/** 날짜 포맷: "2026-02-12" → "2월 12일" */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

// ============================================================================
// 내부 데이터 구조 (정규화)
// ============================================================================

interface NormalizedData {
  historicalContext: string;
  macroChain: string[];
  politicalContext: string;
  institutionalAction: string;
  portfolioImpact: { changePercent: number; healthScoreChange: string };
  isPremium: boolean;
  date: string;
  onPressPremium?: () => void;
  onClose?: () => void;
  updateTimeLabel?: string;
  timeSlotIcon?: string;
}

/** Props를 정규화된 내부 구조로 변환 */
function normalizeProps(props: ContextCardProps): NormalizedData {
  if (props.data) {
    // 레거시 모드: data 객체에서 추출
    const d = props.data;
    return {
      historicalContext: d.historicalContext,
      macroChain: d.macroChain,
      politicalContext: d.politicalContext ?? '',
      institutionalAction: d.institutionalBehavior,
      portfolioImpact: {
        changePercent: d.portfolioImpact.percentChange,
        healthScoreChange:
          d.portfolioImpact.healthScoreChange === 0
            ? '변동 없음'
            : `${d.portfolioImpact.healthScoreChange > 0 ? '+' : ''}${d.portfolioImpact.healthScoreChange}`,
      },
      isPremium: props.isPremium ?? false,
      date: d.date,
      onPressPremium: props.onPressPremium,
      onClose: props.onClose,
      updateTimeLabel: (props as any).updateTimeLabel,
      timeSlotIcon: (props as any).timeSlotIcon,
    };
  }

  // 새 방식: 플랫 Props
  return {
    historicalContext: props.historicalContext,
    macroChain: props.macroChain,
    politicalContext: props.politicalContext ?? '',
    institutionalAction: props.institutionalAction,
    portfolioImpact: props.portfolioImpact,
    isPremium: props.isPremium,
    date: props.date,
    onPressPremium: props.onPressPremium,
    updateTimeLabel: props.updateTimeLabel,
    timeSlotIcon: props.timeSlotIcon,
  };
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function ContextCard(props: ContextCardProps) {
  const { colors, shadows } = useTheme();
  const {
    historicalContext,
    macroChain,
    politicalContext,
    institutionalAction,
    portfolioImpact,
    isPremium,
    date,
    onPressPremium,
    onClose,
    updateTimeLabel,
    timeSlotIcon,
  } = normalizeProps(props);

  return (
    <View style={[s.container, { backgroundColor: colors.surface }, shadows.md]}>
      {/* 닫기 버튼 (모달에서 사용, 레거시 호환) */}
      {onClose && (
        <View style={s.closeButtonContainer}>
          <TouchableOpacity
            style={[s.closeButton, { backgroundColor: colors.surface + 'E6' }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={28} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* 카드 헤더 */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Ionicons name="newspaper-outline" size={20} color={colors.primary} />
          <Text style={[s.headerTitle, { color: colors.textPrimary }]}>
            오늘의 맥락
          </Text>
        </View>
        <View style={s.headerRight}>
          {updateTimeLabel && (
            <View style={[s.updateBadge, { backgroundColor: colors.primary + '15' }]}>
              {timeSlotIcon && (
                <Ionicons name={timeSlotIcon as any} size={12} color={colors.primary} />
              )}
              <Text style={[s.updateBadgeText, { color: colors.primary }]}>
                {updateTimeLabel}
              </Text>
            </View>
          )}
          <Text style={[s.headerDate, { color: colors.textTertiary }]}>
            {formatDate(date)}
          </Text>
        </View>
      </View>

      {/* 5겹 레이어 */}
      <View style={s.layers}>
        {/* 1번 레이어: 역사적 맥락 (무료 — 기본 펼침) */}
        <ContextLayerCard
          icon="time-outline"
          title="역사적 맥락"
          color={colors.primary}
          initiallyExpanded
        >
          <Text style={[s.layerText, { color: colors.textSecondary }]}>
            {historicalContext}
          </Text>
        </ContextLayerCard>

        {/* 2번 레이어: 거시경제 체인 (무료) */}
        <ContextLayerCard
          icon="git-network-outline"
          title="거시경제 체인"
          color={colors.info}
        >
          <View style={s.chainContainer}>
            {macroChain.map((step, index) => (
              <View key={index}>
                <View style={s.chainStep}>
                  <View style={[s.chainDot, { backgroundColor: colors.info }]} />
                  <Text style={[s.chainText, { color: colors.textSecondary }]}>
                    {step}
                  </Text>
                </View>
                {index < macroChain.length - 1 && (
                  <View style={s.chainArrow}>
                    <Ionicons
                      name="arrow-down"
                      size={16}
                      color={colors.textQuaternary}
                    />
                  </View>
                )}
              </View>
            ))}
          </View>
        </ContextLayerCard>

        {/* 3번 레이어: 정치 맥락 (무료 — 역사로 감싼 안심 톤) */}
        <ContextLayerCard
          icon="flag-outline"
          title="정치 맥락"
          color="#7E57C2"
        >
          <Text style={[s.layerText, { color: colors.textSecondary }]}>
            {politicalContext || '역사적으로 정치 이벤트는 단기 변동을 만들었지만, 장기 투자 관점에서 영향은 제한적이었습니다.'}
          </Text>
        </ContextLayerCard>

        {/* 4번 레이어: 기관 행동 (Premium) */}
        <ContextLayerCard
          icon="business-outline"
          title="기관 행동"
          color={colors.warning}
          isLocked={!isPremium}
          onPressPremium={onPressPremium}
        >
          <Text style={[s.layerText, { color: colors.textSecondary }]}>
            {institutionalAction}
          </Text>
        </ContextLayerCard>

        {/* 5번 레이어: 내 포트폴리오 영향 (Premium) */}
        <ContextLayerCard
          icon="pie-chart-outline"
          title="내 포트폴리오 영향"
          color={colors.premium.purple}
          isLocked={!isPremium}
          onPressPremium={onPressPremium}
        >
          <View style={s.impactContainer}>
            <View style={s.impactRow}>
              <Text style={[s.impactLabel, { color: colors.textTertiary }]}>
                변동률
              </Text>
              <Text
                style={[
                  s.impactValue,
                  {
                    color:
                      portfolioImpact.changePercent >= 0
                        ? colors.success
                        : colors.error,
                  },
                ]}
              >
                {portfolioImpact.changePercent > 0 ? '+' : ''}
                {portfolioImpact.changePercent.toFixed(1)}%
              </Text>
            </View>
            <View style={s.impactRow}>
              <Text style={[s.impactLabel, { color: colors.textTertiary }]}>
                건강 점수
              </Text>
              <Text style={[s.impactValue, { color: colors.textSecondary }]}>
                {portfolioImpact.healthScoreChange}
              </Text>
            </View>
          </View>
        </ContextLayerCard>
      </View>
    </View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const s = StyleSheet.create({
  // 컨테이너
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },

  // 닫기 버튼 (모달용)
  closeButtonContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 100,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerDate: {
    fontSize: 13,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  updateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  updateBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // 레이어 컨테이너
  layers: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },

  // 레이어 내부 텍스트
  layerText: {
    fontSize: 14,
    lineHeight: 22,
  },

  // 거시경제 체인
  chainContainer: {},
  chainStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  chainDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  chainText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  chainArrow: {
    marginLeft: 0,
    marginBottom: 6,
    alignItems: 'center',
    width: 8,
  },

  // 포트폴리오 영향
  impactContainer: {
    gap: 8,
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  impactLabel: {
    fontSize: 14,
  },
  impactValue: {
    fontSize: 16,
    fontWeight: '600',
  },
});
