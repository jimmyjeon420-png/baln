// ============================================================================
// 온보딩 플로우 (3장 슬라이드)
// 타겟: 5,000만원 모은 투자 입문자 (20~40대)
// 목표: "자기만의 투자 기준 형성" 메시지 전달
// ============================================================================

import React, { useState, useRef } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// 온보딩 슬라이드 데이터
// ============================================================================

interface OnboardingSlide {
  id: number;
  emoji: string;
  title: string;
  description: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: 1,
    emoji: '📊',
    title: '시장이 흔들릴 때,\n당신의 기준이 됩니다',
    description: '매일 5분, 시장이 왜 움직이는지\n맥락을 읽으세요',
  },
  {
    id: 2,
    emoji: '🎯',
    title: '예측하고,\n복기하고, 성장하세요',
    description: '투자 예측 게임으로 시장 감각을 키우세요.\n맞추면 크레딧 보상!',
  },
  {
    id: 3,
    emoji: '🔥',
    title: '오늘부터 시작하세요',
    description: '매일 접속하면 연속 기록이 쌓여요.\n패닉셀 없는 투자자가 되어보세요',
  },
];

// ============================================================================
// 온보딩 메인 컴포넌트
// ============================================================================

export default function OnboardingScreen() {
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // 스크롤 이벤트 핸들러 (현재 페이지 추적)
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentPage(page);
  };

  // 온보딩 완료 처리
  const handleComplete = async () => {
    try {
      // AsyncStorage에 온보딩 완료 플래그 저장
      await AsyncStorage.setItem('@baln:onboarding_completed', 'true');
      // 홈 화면으로 이동 (replace로 뒤로가기 방지)
      router.replace('/(tabs)');
    } catch (error) {
      console.error('[Onboarding] 완료 저장 실패:', error);
      // 에러 발생해도 홈으로 이동
      router.replace('/(tabs)');
    }
  };

  // 건너뛰기 (온보딩 완료와 동일)
  const handleSkip = () => {
    handleComplete();
  };

  return (
    <View style={styles.container}>
      {/* 우상단 건너뛰기 버튼 (마지막 슬라이드에서는 숨김) */}
      {currentPage < SLIDES.length - 1 && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>건너뛰기</Text>
        </TouchableOpacity>
      )}

      {/* 슬라이드 ScrollView */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {SLIDES.map((slide) => (
          <View key={slide.id} style={styles.slide}>
            {/* 이모지 아이콘 */}
            <Text style={styles.emoji}>{slide.emoji}</Text>

            {/* 제목 */}
            <Text style={styles.title}>{slide.title}</Text>

            {/* 설명 */}
            <Text style={styles.description}>{slide.description}</Text>
          </View>
        ))}
      </ScrollView>

      {/* 하단 영역 (인디케이터 + 버튼) */}
      <View style={styles.footer}>
        {/* 페이지 인디케이터 (3개 점) */}
        <View style={styles.indicatorContainer}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === currentPage && styles.indicatorActive,
              ]}
            />
          ))}
        </View>

        {/* 마지막 슬라이드에만 "시작하기" 버튼 표시 */}
        {currentPage === SLIDES.length - 1 && (
          <TouchableOpacity style={styles.startButton} onPress={handleComplete}>
            <Text style={styles.startButtonText}>시작하기</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// 스타일 (다크 모드 기반)
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emoji: {
    fontSize: 100,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 38,
  },
  description: {
    fontSize: 16,
    color: '#B0B0B0',
    textAlign: 'center',
    lineHeight: 24,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  skipText: {
    fontSize: 16,
    color: '#B0B0B0',
  },
  footer: {
    paddingBottom: 60,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3A3A3A',
    marginHorizontal: 4,
  },
  indicatorActive: {
    backgroundColor: '#4CAF50',
    width: 24,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 60,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
