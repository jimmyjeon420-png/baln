/**
 * CardSwipeContainer.tsx - 3카드 수평 스와이프 컨테이너
 *
 * 역할: "카드 네비게이션 컨트롤러"
 * - 3개 카드를 수평으로 배치
 * - Instagram Stories 스타일 스와이프
 * - 페이지 인디케이터 + 카드 라벨
 * - 상단 헤더 (baln + ⚙️ 설정)
 *
 * Anti-Toss 원칙:
 * - Gateway: 스와이프 3번이면 모든 정보 확인
 * - 빼기 전략: ScrollView 수직 스크롤 제거, 탭바 제거
 * - One Page One Card: 한 화면에 카드 1장만
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../styles/theme';
import { selection } from '../../services/hapticService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// Props 인터페이스
// ============================================================================

interface CardSwipeContainerProps {
  /** 카드 컴포넌트 배열 (정확히 3개) */
  children: React.ReactNode[];

  /** 카드 라벨 (하단 인디케이터 아래 텍스트) */
  labels?: string[]; // default: ['건강', '맥락', '예측']

  /** ⚙️ 설정 버튼 탭 콜백 */
  onSettingsPress?: () => void;

  /** 초기 카드 인덱스 (기본 0) */
  initialIndex?: number;

  /** 카드 전환 콜백 (analytics 등) */
  onCardChange?: (index: number) => void;

  /** Pull-to-refresh 콜백 */
  onRefresh?: () => Promise<void>;

  /** 새로고침 중 여부 */
  refreshing?: boolean;
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function CardSwipeContainer({
  children,
  labels = ['건강', '맥락', '예측'],
  onSettingsPress,
  initialIndex = 0,
  onCardChange,
}: CardSwipeContainerProps) {
  const insets = useSafeAreaInsets();
  const [currentPage, setCurrentPage] = useState(initialIndex);

  // 스크롤 종료 시 페이지 추적
  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / SCREEN_WIDTH);
    if (page !== currentPage) {
      setCurrentPage(page);
      selection(); // 햅틱 피드백
      onCardChange?.(page);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 상단 헤더 */}
      <View style={styles.header}>
        {/* 좌측: baln 로고 */}
        <Text style={styles.logo} accessibilityRole="header">baln</Text>

        {/* 우측: ⚙️ 설정 아이콘 */}
        {onSettingsPress && (
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={onSettingsPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="설정"
            accessibilityHint="설정 화면으로 이동합니다"
          >
            <Ionicons
              name="settings-outline"
              size={24}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* 수평 스와이프 영역 */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={SCREEN_WIDTH}
        snapToAlignment="center"
      >
        {children.map((child, index) => (
          <View key={index} style={styles.cardWrapper}>
            {child}
          </View>
        ))}
      </ScrollView>

      {/* 하단: 페이지 인디케이터 + 카드 라벨 */}
      <View style={styles.footer}>
        {/* 페이지 인디케이터 (● ○ ○) */}
        <View style={styles.indicatorContainer}>
          {children.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === currentPage && styles.indicatorActive,
              ]}
            />
          ))}
        </View>

        {/* 카드 라벨 */}
        <View style={styles.labelsContainer}>
          {labels.map((label, index) => (
            <Text
              key={index}
              style={[
                styles.label,
                index === currentPage && styles.labelActive,
              ]}
            >
              {label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  logo: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  settingsButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    // ScrollView 내부 컨텐츠는 각 카드가 SCREEN_WIDTH 차지
  },
  cardWrapper: {
    width: SCREEN_WIDTH,
    justifyContent: 'center',
  },
  footer: {
    paddingBottom: 20,
    gap: 12,
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3A3A3A',
  },
  indicatorActive: {
    width: 24,
    backgroundColor: COLORS.textPrimary,
  },
  labelsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textTertiary,
  },
  labelActive: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});
