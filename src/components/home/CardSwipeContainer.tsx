/**
 * CardSwipeContainer.tsx - 카드 수평 스와이프 컨테이너
 *
 * 역할: "카드 네비게이션 컨트롤러"
 * - 카드를 수평으로 배치
 * - Instagram Stories 스타일 스와이프
 * - 페이지 인디케이터 + 카드 라벨
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
  LayoutChangeEvent,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { selection } from '../../services/hapticService';
import { useLocale } from '../../context/LocaleContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// Props 인터페이스
// ============================================================================

interface CardSwipeContainerProps {
  /** 카드 컴포넌트 배열 */
  children: React.ReactNode[];
  /** 카드 라벨 */
  labels?: string[];
  /** ⚙️ 설정 버튼 탭 콜백 (deprecated) */
  onSettingsPress?: () => void;
  /** 초기 카드 인덱스 */
  initialIndex?: number;
  /** 카드 전환 콜백 */
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
  labels: labelsProp,
  onSettingsPress,
  initialIndex = 0,
  onCardChange,
  onRefresh,
  refreshing,
}: CardSwipeContainerProps) {
  const [currentPage, setCurrentPage] = useState(initialIndex);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const { colors } = useTheme();
  const { t } = useLocale();
  const labels = labelsProp ?? [t('card_swipe.label_assets'), t('card_swipe.label_market'), t('card_swipe.label_predictions')];
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const hintOpacity = useRef(new Animated.Value(1)).current;
  const hintTranslateX = useRef(new Animated.Value(0)).current;

  // 스와이프 힌트 애니메이션 (첫 페이지에서만 3초간 표시)
  useEffect(() => {
    if (currentPage === 0 && showSwipeHint) {
      const shake = Animated.loop(
        Animated.sequence([
          Animated.timing(hintTranslateX, { toValue: -8, duration: 400, useNativeDriver: true }),
          Animated.timing(hintTranslateX, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
        { iterations: 3 }
      );
      shake.start();

      const timeout = setTimeout(() => {
        Animated.timing(hintOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => setShowSwipeHint(false));
      }, 3000);

      return () => {
        clearTimeout(timeout);
        shake.stop();
      };
    } else if (currentPage !== 0) {
      setShowSwipeHint(false);
    }
  }, [currentPage, showSwipeHint, hintTranslateX, hintOpacity]);

  const childArray = Array.isArray(children) ? children : [];
  const childCount = childArray.length;

  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (childCount <= 0) return;
    const offsetX = e.nativeEvent.contentOffset.x;
    const page = Math.min(Math.max(Math.round(offsetX / SCREEN_WIDTH), 0), childCount - 1);
    if (page !== currentPage && page >= 0) {
      setCurrentPage(page);
      selection();
      onCardChange?.(page);
    }
  }, [childCount, currentPage, onCardChange]);

  const handleTabPress = useCallback((index: number) => {
    if (index === currentPage || index < 0 || index >= childCount) return;
    scrollViewRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
    setCurrentPage(index);
    selection();
    onCardChange?.(index);
  }, [currentPage, childCount, onCardChange]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 수평 스와이프 영역 — flex: 1로 남은 공간 전부 차지 */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        onLayout={(e: LayoutChangeEvent) => setScrollViewHeight(e.nativeEvent.layout.height)}
        scrollEventThrottle={16}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {childArray.map((child, index) => (
          <View key={index} style={[styles.cardWrapper, scrollViewHeight > 0 && { height: scrollViewHeight }]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
              contentContainerStyle={styles.cardScrollContent}
            >
              {child}
            </ScrollView>
          </View>
        ))}
      </ScrollView>

      {/* 스와이프 힌트 */}
      {showSwipeHint && currentPage === 0 && (
        <Animated.View
          style={[
            styles.swipeHint,
            { opacity: hintOpacity, transform: [{ translateX: hintTranslateX }] },
          ]}
        >
          <Text style={styles.swipeHintText}>{t('card_swipe.hint')}</Text>
        </Animated.View>
      )}

      {/* 탭 네비게이터 — ScrollView 바로 아래 (flow 레이아웃) */}
      <View style={styles.bottomNav}>
        {labels.map((label, index) => (
          <TouchableOpacity
            key={index}
            style={styles.navItem}
            onPress={() => handleTabPress(index)}
            activeOpacity={0.6}
          >
            <Text
              style={[
                styles.label,
                { color: colors.textTertiary },
                index === currentPage && [styles.labelActive, { color: colors.textPrimary }],
              ]}
            >
              {label}
            </Text>
            <View
              style={[
                styles.indicator,
                { backgroundColor: colors.border },
                index === currentPage && [styles.indicatorActive, { backgroundColor: colors.primary }],
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* 페이지 카운터 */}
      <Text style={[styles.pageCounterText, { color: colors.textTertiary }]}>
        {currentPage + 1} / {childCount}
      </Text>
    </View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  cardScrollContent: {
    paddingBottom: 24,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
    paddingTop: 6,
    paddingBottom: 2,
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  indicator: {
    width: 6,
    height: 4,
    borderRadius: 2,
  },
  indicatorActive: {
    width: 24,
    height: 4,
    borderRadius: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  labelActive: {
    fontWeight: '700',
  },
  pageCounterText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1,
    textAlign: 'center',
    paddingVertical: 4,
  },
  swipeHint: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  swipeHintText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
