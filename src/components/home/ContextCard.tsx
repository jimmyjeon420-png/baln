/**
 * 맥락 카드 (Context Card) UI 컴포넌트
 *
 * 역할: 시장 변동의 "왜"를 4겹 레이어로 시각화
 * 비유: 일기예보처럼 "오늘 날씨가 왜 이런지" 설명하는 카드
 *
 * 4겹 구조:
 * 1. 역사적 맥락 (무료)
 * 2. 거시경제 체인 (무료)
 * 3. 기관 행동 (Premium)
 * 4. 포트폴리오 영향 (Premium)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import {
  ContextCardData,
  SENTIMENT_COLORS,
  SENTIMENT_ICONS,
  SENTIMENT_LABELS,
} from '../../types/contextCard';
import ContextShareCard from './ContextShareCard';
import { useTheme } from '../../hooks/useTheme';

// Mock 데이터 (props 없을 때 사용)
const MOCK_DATA: ContextCardData = {
  date: '2026-02-08',
  headline: '미국 CPI 예상 상회, 금리 인상 우려 확산',
  historicalContext:
    '2022년 6월에도 비슷한 인플레이션 우려가 있었고, 당시 S&P500은 -5.8% 하락 후 3개월 내 +8.2% 반등했습니다.',
  macroChain: [
    '미국 CPI 3.2% 발표 (예상 3.0%)',
    '금리 인상 우려 확산',
    '나스닥 기술주 -2.1% 하락',
    '삼성전자 외국인 매도세',
  ],
  institutionalBehavior:
    '외국인 투자자 3일 연속 순매도 중 (총 -1,200억원). 패닉 매도가 아닌 분기말 리밸런싱 시즌으로 분석됩니다.',
  portfolioImpact: {
    percentChange: -1.2,
    healthScoreChange: 0,
    message:
      '당신의 포트폴리오는 어제 대비 -1.2% 영향을 받았으나, 건강 점수는 A등급을 유지 중입니다.',
  },
  sentiment: 'caution',
  isPremiumContent: true,
};

interface ContextCardProps {
  /** 맥락 카드 데이터 (없으면 Mock 사용) */
  data?: ContextCardData;
  /** 사용자 Premium 여부 */
  isPremium?: boolean;
  /** Premium 구매 버튼 클릭 핸들러 */
  onPressPremium?: () => void;
  /** 닫기 버튼 핸들러 (모달에서 사용) */
  onClose?: () => void;
}

export default function ContextCard({
  data = MOCK_DATA,
  isPremium = false,
  onPressPremium,
  onClose,
}: ContextCardProps) {
  const { colors, shadows } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const rotation = useSharedValue(0);

  // 토글 핸들러
  const handleToggle = () => {
    setExpanded(!expanded);
    rotation.value = withTiming(expanded ? 0 : 180, { duration: 300 });
  };

  // 공유 버튼 핸들러
  const handleShare = () => {
    setShareModalVisible(true);
  };

  // 화살표 회전 애니메이션
  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const sentimentColor = SENTIMENT_COLORS[data.sentiment];
  const sentimentIcon = SENTIMENT_ICONS[data.sentiment];
  const sentimentLabel = SENTIMENT_LABELS[data.sentiment];

  // 날짜 포맷 (2026-02-08 → 2월 8일)
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }, shadows.md]}>
      {/* 닫기 버튼 (모달 전용) */}
      {onClose && (
        <View style={styles.closeButtonContainer}>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.surface + 'E6' }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={28} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Sentiment 색상 바 */}
      <View style={[styles.sentimentBar, { backgroundColor: sentimentColor }]} />

      {/* 카드 본체 */}
      <View style={styles.card}>
        {/* 헤더 - 헤드라인 + 공유 + 토글 */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerLeft}
            onPress={handleToggle}
            activeOpacity={0.7}
          >
            <View style={styles.sentimentBadge}>
              <Ionicons name={sentimentIcon} size={16} color={sentimentColor} />
              <Text style={[styles.sentimentText, { color: sentimentColor }]}>
                {sentimentLabel}
              </Text>
            </View>
            <Text style={[styles.headline, { color: colors.textPrimary }]}>{data.headline}</Text>
            <Text style={[styles.date, { color: colors.textTertiary }]}>{formatDate(data.date)}</Text>
          </TouchableOpacity>

          {/* 우측: 공유 버튼 + 토글 버튼 */}
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Ionicons name="share-outline" size={22} color="#4CAF50" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={handleToggle}
              activeOpacity={0.7}
            >
              <Animated.View style={animatedIconStyle}>
                <Ionicons name="chevron-down" size={24} color="#9E9E9E" />
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 펼쳐진 내용 - 4겹 레이어 */}
        {expanded && (
          <View style={styles.content}>
            {/* 1번 레이어: 역사적 맥락 (무료) */}
            <LayerSection
              icon="time-outline"
              title="역사적 맥락"
              color="#4CAF50"
              colors={colors}
            >
              <Text style={[styles.layerText, { color: colors.textSecondary }]}>{data.historicalContext}</Text>
            </LayerSection>

            {/* 2번 레이어: 거시경제 체인 (무료) */}
            <LayerSection
              icon="git-network-outline"
              title="거시경제 체인"
              color="#2196F3"
              colors={colors}
            >
              <View style={styles.chainContainer}>
                {data.macroChain.map((step, index) => (
                  <View key={index}>
                    <View style={styles.chainStep}>
                      <View style={styles.chainDot} />
                      <Text style={[styles.chainText, { color: colors.textSecondary }]}>{step}</Text>
                    </View>
                    {index < data.macroChain.length - 1 && (
                      <View style={styles.chainArrow}>
                        <Ionicons
                          name="arrow-down"
                          size={20}
                          color="#616161"
                        />
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </LayerSection>

            {/* 3번 레이어: 기관 행동 (Premium) */}
            <LayerSection
              icon="business-outline"
              title="기관 행동"
              color="#FF9800"
              isPremiumLocked={data.isPremiumContent && !isPremium}
              onPressPremium={onPressPremium}
              colors={colors}
            >
              <Text style={[styles.layerText, { color: colors.textSecondary }]}>{data.institutionalBehavior}</Text>
            </LayerSection>

            {/* 4번 레이어: 포트폴리오 영향 (Premium) */}
            <LayerSection
              icon="trending-down-outline"
              title="내 포트폴리오 영향"
              color="#9C27B0"
              isPremiumLocked={data.isPremiumContent && !isPremium}
              onPressPremium={onPressPremium}
              colors={colors}
            >
              <View style={styles.impactContainer}>
                <View style={styles.impactRow}>
                  <Text style={[styles.impactLabel, { color: colors.textTertiary }]}>변동률</Text>
                  <Text
                    style={[
                      styles.impactValue,
                      {
                        color:
                          data.portfolioImpact.percentChange >= 0
                            ? colors.success
                            : colors.error,
                      },
                    ]}
                  >
                    {data.portfolioImpact.percentChange > 0 ? '+' : ''}
                    {data.portfolioImpact.percentChange.toFixed(1)}%
                  </Text>
                </View>
                <View style={styles.impactRow}>
                  <Text style={[styles.impactLabel, { color: colors.textTertiary }]}>건강 점수</Text>
                  <Text style={[styles.impactValue, { color: colors.textSecondary }]}>
                    {data.portfolioImpact.healthScoreChange === 0
                      ? '변동 없음'
                      : `${data.portfolioImpact.healthScoreChange > 0 ? '+' : ''}${data.portfolioImpact.healthScoreChange}`}
                  </Text>
                </View>
                <Text style={[styles.impactMessage, { color: colors.textSecondary }]}>
                  {data.portfolioImpact.message}
                </Text>
              </View>
            </LayerSection>
          </View>
        )}
      </View>

      {/* 공유 모달 */}
      <ContextShareCard
        data={data}
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
      />
    </View>
  );
}

/**
 * 레이어 섹션 컴포넌트 (각 레이어의 공통 레이아웃)
 */
interface LayerSectionProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  color: string;
  children: React.ReactNode;
  isPremiumLocked?: boolean;
  onPressPremium?: () => void;
  colors: any; // ThemeColors
}

function LayerSection({
  icon,
  title,
  color,
  children,
  isPremiumLocked = false,
  onPressPremium,
  colors,
}: LayerSectionProps) {
  return (
    <View style={styles.layer}>
      {/* 레이어 헤더 */}
      <View style={styles.layerHeader}>
        <Ionicons name={icon} size={20} color={color} />
        <Text style={[styles.layerTitle, { color: colors.textPrimary }]}>{title}</Text>
        {isPremiumLocked && (
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={12} color="#FFC107" />
          </View>
        )}
      </View>

      {/* 레이어 내용 */}
      {isPremiumLocked ? (
        <Pressable
          style={styles.premiumOverlay}
          onPress={onPressPremium}
        >
          <View style={styles.blurredContent}>
            <Text style={[styles.blurredText, { color: colors.textTertiary }]}>
              {typeof children === 'string' ? children : '프리미엄 콘텐츠'}
            </Text>
          </View>
          <View style={styles.premiumCTA}>
            <Ionicons name="star" size={16} color="#FFC107" />
            <Text style={styles.premiumCTAText}>Premium으로 전체 보기</Text>
          </View>
        </Pressable>
      ) : (
        <View style={styles.layerContent}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    // backgroundColor는 동적으로 적용됨
  },
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
    // backgroundColor는 동적으로 적용됨
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentimentBar: {
    height: 4,
  },
  card: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    marginRight: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareButton: {
    padding: 4,
  },
  toggleButton: {
    padding: 4,
  },
  sentimentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sentimentText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  headline: {
    fontSize: 17,
    fontWeight: '700',
    // color는 동적으로 적용됨
    marginBottom: 6,
    lineHeight: 24,
  },
  date: {
    fontSize: 13,
    // color는 동적으로 적용됨
  },
  content: {
    marginTop: 20,
  },
  layer: {
    marginBottom: 20,
  },
  layerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  layerTitle: {
    fontSize: 15,
    fontWeight: '600',
    // color는 동적으로 적용됨
    marginLeft: 8,
    flex: 1,
  },
  lockBadge: {
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    borderRadius: 12,
    padding: 4,
  },
  layerContent: {
    paddingLeft: 28,
  },
  layerText: {
    fontSize: 14,
    // color는 동적으로 적용됨
    lineHeight: 22,
  },
  chainContainer: {
    paddingLeft: 28,
  },
  chainStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  chainDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196F3',
    marginRight: 12,
  },
  chainText: {
    fontSize: 14,
    // color는 동적으로 적용됨
    flex: 1,
    lineHeight: 20,
  },
  chainArrow: {
    marginLeft: 4,
    marginBottom: 8,
  },
  impactContainer: {
    paddingLeft: 28,
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingRight: 16,
  },
  impactLabel: {
    fontSize: 14,
    // color는 동적으로 적용됨
  },
  impactValue: {
    fontSize: 16,
    fontWeight: '600',
    // color는 동적으로 적용됨
  },
  impactMessage: {
    fontSize: 14,
    // color는 동적으로 적용됨
    lineHeight: 22,
    marginTop: 8,
  },
  premiumOverlay: {
    position: 'relative',
    paddingLeft: 28,
  },
  blurredContent: {
    opacity: 0.3,
    marginBottom: 12,
  },
  blurredText: {
    fontSize: 14,
    // color는 동적으로 적용됨
    lineHeight: 22,
  },
  premiumCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  premiumCTAText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFC107',
    marginLeft: 6,
  },
});
