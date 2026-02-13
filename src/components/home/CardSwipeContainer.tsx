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

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  RefreshControl,
  Animated,
} from 'react-native';
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
  const insets = useSafeAreaInsets();
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const hintOpacity = useRef(new Animated.Value(1)).current;
  const hintTranslateX = useRef(new Animated.Value(0)).current;

  // 스와이프 힌트 애니메이션 (첫 페이지에서만 3초간 표시)
  useEffect(() => {
    if (currentPage === 0 && showSwipeHint) {
      // 좌우 흔들기 애니메이션
      const shake = Animated.loop(
        Animated.sequence([
          Animated.timing(hintTranslateX, { toValue: -8, duration: 400, useNativeDriver: true }),
          Animated.timing(hintTranslateX, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
        { iterations: 3 }
      );
      shake.start();

      // 3초 후 페이드아웃
      const timeout = setTimeout(() => {
        Animated.timing(hintOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => setShowSwipeHint(false));
      }, 3000);

      return () => clearTimeout(timeout);
    } else if (currentPage !== 0) {
      setShowSwipeHint(false);
    }
  }, [currentPage]);

  // children 개수 기반 동적 처리
  const childCount = Array.isArray(children) ? children.length : 0;

  // 스크롤 종료 시 페이지 추적 (범위 가드 추가)
  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const page = Math.min(Math.max(Math.round(offsetX / SCREEN_WIDTH), 0), childCount - 1);
    if (page !== currentPage && page >= 0) {
      setCurrentPage(page);
      selection(); // 햅틱 피드백
      onCardChange?.(page);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
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

      {/* 스와이프 힌트 (첫 페이지에서만, 3초 후 사라짐) */}
      {showSwipeHint && currentPage === 0 && (
        <Animated.View
          style={[
            styles.swipeHint,
            { opacity: hintOpacity, transform: [{ translateX: hintTranslateX }] },
          ]}
        >
          <Text style={styles.swipeHintText}>스와이프하여 더 보기 →</Text>
        </Animated.View>
      )}

      {/* 카드 아래: 탭 형태 네비게이터 (선택 + 인디케이터) */}
      <View style={styles.bottomNav}>
        {labels.map((label, index) => (
          <View key={index} style={styles.navItem}>
            <Text
              style={[
                styles.label,
                index === currentPage && styles.labelActive,
              ]}
            >
              {label}
            </Text>
            <View
              style={[
                styles.indicator,
                index === currentPage && styles.indicatorActive,
              ]}
            />
          </View>
        ))}
      </View>

      {/* 페이지 카운터 (1/3 형태) */}
      <View style={styles.pageCounter}>
        <Text style={styles.pageCounterText}>
          {currentPage + 1} / {children.length}
        </Text>
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
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
    paddingTop: 10,
    paddingBottom: 4,
  },
  navItem: {
    alignItems: 'center',
    gap: 6,
  },
  indicator: {
    width: 6,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#3A3A3A',
  },
  indicatorActive: {
    width: 24,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.primary,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textTertiary,
    letterSpacing: 0.5,
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
    paddingTop: 8,
  },
  swipeHint: {
    position: 'absolute',
    top: 90,
    alignSelf: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  swipeHintText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  pageCounter: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  pageCounterText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textTertiary,
    letterSpacing: 1,
  },
});
