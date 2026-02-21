/**
 * PredictionShareCard.tsx - 예측 결과 공유 카드 (이미지 캡처 + 네이티브 공유)
 *
 * 역할: "예측 성적표 인증샷" -- SNS 공유용 비주얼 카드
 *
 * 기능:
 * - react-native-view-shot으로 카드 영역을 PNG 이미지로 캡처
 * - expo-sharing으로 네이티브 공유 시트 열기
 * - 예측 종목, 방향(상승/하락), 결과(적중/빗나감), baln 로고 포함
 * - 다크모드 지원 (useTheme)
 *
 * 사용처: 예측 결과 복기 후 "공유하기" 버튼 -> 이 카드 캡처 -> SNS 공유
 * 보상: 공유 시 5크레딧 지급 (rewardService 연동)
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// Props
// ============================================================================

interface PredictionShareCardProps {
  /** 예측 질문 */
  question: string;
  /** 내 답변 */
  myVote: 'YES' | 'NO';
  /** 정답 */
  correctAnswer: 'YES' | 'NO';
  /** 내 적중률 */
  accuracyRate: number;
  /** 연속 적중 수 */
  currentStreak: number;
  /** 총 투표 수 */
  totalVotes: number;
  /** 카테고리 (주식/코인/거시경제/이벤트) */
  category?: string;
  /** 공유 완료 콜백 */
  onShareComplete?: () => void;
}

// ============================================================================
// 카테고리 라벨
// ============================================================================

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  stocks: { label: '주식', color: '#2196F3' },
  crypto: { label: '코인', color: '#F7931A' },
  macro: { label: '거시경제', color: '#9C27B0' },
  event: { label: '이벤트', color: '#FF9800' },
};

// ============================================================================
// 컴포넌트
// ============================================================================

export default function PredictionShareCard({
  question,
  myVote,
  correctAnswer,
  accuracyRate,
  currentStreak,
  totalVotes,
  category,
  onShareComplete,
}: PredictionShareCardProps) {
  const { colors, theme } = useTheme();
  const viewShotRef = useRef<ViewShot>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const isCorrect = myVote === correctAnswer;
  const voteDirection = myVote === 'YES' ? '상승' : '하락';
  const resultLabel = isCorrect ? '적중' : '빗나감';
  const categoryInfo = category ? CATEGORY_LABELS[category] : null;

  // 그라데이션 색상 결정 (적중/빗나감)
  const gradientColors: [string, string] = isCorrect
    ? ['#4CAF50', '#2E7D32'] // 초록 그라데이션
    : ['#CF6679', '#B00020']; // 빨간 그라데이션

  // 이미지 캡처 + 네이티브 공유
  const handleShare = async () => {
    if (!viewShotRef.current) {
      Alert.alert('오류', '공유 카드를 준비하는 중입니다.');
      return;
    }

    setIsCapturing(true);

    try {
      // 1. ViewShot으로 PNG 캡처
      const uri = await viewShotRef.current.capture?.();
      if (!uri) {
        throw new Error('이미지 캡처 실패');
      }

      // 2. 공유 가능 여부 확인
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('오류', '이 기기에서는 공유 기능을 사용할 수 없습니다.');
        return;
      }

      // 3. 네이티브 Share Sheet 열기
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: '내 투자 예측 결과 공유',
        UTI: 'public.png',
      });

      // 4. 공유 완료 콜백
      onShareComplete?.();
    } catch (error) {
      console.error('[PredictionShareCard] 공유 실패:', error);
      Alert.alert('공유 실패', '이미지 공유 중 오류가 발생했습니다.');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* 캡처 대상 영역 (ViewShot) */}
      <ViewShot
        ref={viewShotRef}
        options={{
          format: 'png',
          quality: 1.0,
          width: 1080,
          height: 1350,
        }}
        style={styles.viewShot}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          {/* 상단: baln 로고 + 카테고리 */}
          <View style={styles.cardHeader}>
            <View style={styles.logoRow}>
              <Text style={styles.logoText}>
                bal<Text style={{ color: '#A5D6A7' }}>n</Text>
              </Text>
              <Text style={styles.logoSuffix}>.logic</Text>
            </View>
            {categoryInfo && (
              <View style={[styles.categoryBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={styles.categoryText}>{categoryInfo.label}</Text>
              </View>
            )}
          </View>

          {/* 중앙: 결과 + 질문 */}
          <View style={styles.cardCenter}>
            {/* 결과 배지 */}
            <View style={[
              styles.resultBadge,
              { backgroundColor: 'rgba(255,255,255,0.2)' },
            ]}>
              <Text style={styles.resultIcon}>
                {isCorrect ? '\u2705' : '\u274C'}
              </Text>
              <Text style={styles.resultLabel}>{resultLabel}</Text>
            </View>

            {/* 질문 */}
            <Text style={styles.questionText} numberOfLines={3}>
              {question}
            </Text>

            {/* 내 예측 방향 */}
            <View style={styles.directionRow}>
              <Ionicons
                name={myVote === 'YES' ? 'trending-up' : 'trending-down'}
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.directionText}>
                내 예측: {voteDirection}
              </Text>
            </View>
          </View>

          {/* 통계 그리드 */}
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{accuracyRate.toFixed(0)}%</Text>
                <Text style={styles.statLabel}>적중률</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{totalVotes}회</Text>
                <Text style={styles.statLabel}>참여</Text>
              </View>
              {currentStreak > 0 && (
                <>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{currentStreak}연속</Text>
                    <Text style={styles.statLabel}>적중</Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* 하단: 워터마크 + 면책 */}
          <View style={styles.cardFooter}>
            <Text style={styles.watermark}>
              bal<Text style={{ color: '#A5D6A7' }}>n</Text>.app
            </Text>
            <Text style={styles.disclaimer}>
              본 예측은 오락/학습 목적이며 투자 권유가 아닙니다
            </Text>
          </View>
        </LinearGradient>
      </ViewShot>

      {/* 공유 버튼 (캡처 영역 밖) */}
      <TouchableOpacity
        style={[styles.shareButton, { backgroundColor: colors.primary }]}
        onPress={handleShare}
        activeOpacity={0.8}
        disabled={isCapturing}
      >
        {isCapturing ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="share-outline" size={18} color="#FFFFFF" />
            <Text style={styles.shareButtonText}>이미지로 공유하고 5C 받기</Text>
          </>
        )}
      </TouchableOpacity>

      {/* 브랜딩 */}
      <Text style={[styles.branding, { color: colors.textTertiary }]}>
        baln {'\u00B7'} 매일 5분 투자 습관
      </Text>
    </View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const CARD_WIDTH = Math.min(SCREEN_WIDTH - 32, 380);
const CARD_HEIGHT = CARD_WIDTH * 1.25; // 4:5 비율 (인스타 최적)

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginVertical: 12,
  },

  // ViewShot 캡처 영역
  viewShot: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardGradient: {
    flex: 1,
    padding: 28,
    justifyContent: 'space-between',
  },

  // 카드 헤더
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoText: {
    fontSize: 27,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  logoSuffix: {
    fontSize: 23,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.7,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // 카드 중앙
  cardCenter: {
    alignItems: 'center',
    gap: 14,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  resultIcon: {
    fontSize: 23,
  },
  resultLabel: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  questionText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 25,
    paddingHorizontal: 8,
  },
  directionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  directionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // 통계
  statsContainer: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 23,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.7,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  // 카드 푸터
  cardFooter: {
    alignItems: 'center',
    gap: 4,
  },
  watermark: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    opacity: 0.7,
  },
  disclaimer: {
    fontSize: 10,
    color: '#FFFFFF',
    opacity: 0.5,
    textAlign: 'center',
  },

  // 공유 버튼 (캡처 영역 밖)
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 16,
    minWidth: 200,
    justifyContent: 'center',
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  branding: {
    fontSize: 12,
    letterSpacing: 0.5,
    marginTop: 8,
  },
});
