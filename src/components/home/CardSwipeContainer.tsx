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
  ScrollView,
  StyleSheet,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  RefreshControl,
} from 'react-native';
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

  /** ⚙️ 설정 버튼 탭 콜백 (deprecated - 제거됨) */
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
  onRefresh,
  refreshing,
}: CardSwipeContainerProps) {
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
    <View style={styles.container}>
      {/* 카드 위: 페이지 인디케이터 + 라벨 (스와이프 유도) */}
      <View style={styles.topNav}>
        {labels.map((label, index) => (
          <View key={index} style={styles.navItem}>
            <View
              style={[
                styles.indicator,
                index === currentPage && styles.indicatorActive,
              ]}
            />
            <Text
              style={[
                styles.label,
                index === currentPage && styles.labelActive,
              ]}
            >
              {label}
            </Text>
          </View>
        ))}
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
        removeClippedSubviews={true}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing || false}
              onRefresh={onRefresh}
              tintColor={COLORS.textSecondary}
              colors={[COLORS.primary]}
            />
          ) : undefined
        }
      >
        {children.map((child, index) => (
          <View key={index} style={styles.cardWrapper}>
            {child}
          </View>
        ))}
      </ScrollView>
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
  topNav: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    paddingTop: 2,
    paddingBottom: 6,
  },
  navItem: {
    alignItems: 'center',
    gap: 3,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3A3A3A',
  },
  indicatorActive: {
    width: 20,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.textPrimary,
  },
  label: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textTertiary,
  },
  labelActive: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
  },
  cardWrapper: {
    width: SCREEN_WIDTH,
    paddingTop: 4,
  },
});
