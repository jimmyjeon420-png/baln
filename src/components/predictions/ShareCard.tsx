/**
 * ShareCard.tsx - 투자 예측 적중률 공유 카드 (인스타그램)
 *
 * 역할: "소셜 마케팅 부서 - 공유 카드 디자이너"
 * - 1080x1080 인스타그램 정사각형 카드
 * - 그라데이션 배경 (#4CAF50 → #2196F3)
 * - react-native-view-shot으로 PNG 캡처
 * - expo-sharing으로 네이티브 공유 시트
 *
 * Props:
 * - accuracyRate: 적중률 (%)
 * - totalVotes: 총 투표 수
 * - currentStreak: 연속 적중 횟수
 * - onShare?: 공유 완료 콜백
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useTrackEvent } from '../../hooks/useAnalytics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_SIZE = Math.min(SCREEN_WIDTH - 32, 400); // 화면 크기 대응

interface ShareCardProps {
  accuracyRate: number;
  totalVotes: number;
  currentStreak: number;
  onShare?: () => void;
}

export default function ShareCard({
  accuracyRate,
  totalVotes,
  currentStreak,
  onShare,
}: ShareCardProps) {
  const viewShotRef = useRef<ViewShot>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const track = useTrackEvent();

  // 공유하기 버튼 클릭 → 모달 열기
  const handleOpenModal = () => {
    setIsVisible(true);
  };

  // 공유 실행 (이미지 캡처 + Share Sheet)
  const handleShare = async () => {
    if (!viewShotRef.current) {
      Alert.alert('오류', '공유 카드를 준비하는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    setIsCapturing(true);

    try {
      // 1. ViewShot으로 PNG 캡처 (1080x1080 인스타그램 정사각형)
      const uri = await viewShotRef.current.capture?.();

      if (!uri) {
        throw new Error('이미지 캡처에 실패했습니다.');
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
        dialogTitle: '내 투자 예측 적중률 공유',
        UTI: 'public.png',
      });

      // 4. 공유 성공 콜백
      track('share_card', { source: 'prediction_share', accuracyRate, totalVotes, currentStreak });
      onShare?.();
      setIsVisible(false);

      // 성공 메시지
      Alert.alert('공유 완료', '투자 예측 적중률을 공유했습니다!');
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('공유 실패', '이미지 공유 중 오류가 발생했습니다.');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <>
      {/* 공유하기 버튼 (predictions.tsx에서 렌더링) */}
      <TouchableOpacity
        style={styles.shareButton}
        onPress={handleOpenModal}
        disabled={totalVotes < 5} // 최소 5회 투표 필요
      >
        <LinearGradient
          colors={['#4CAF50', '#2196F3']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.shareButtonGradient}
        >
          <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
          <Text style={styles.shareButtonText}>인스타그램 공유</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* 공유 카드 모달 */}
      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* 닫기 버튼 */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsVisible(false)}
            >
              <Ionicons name="close-circle" size={32} color="#FFFFFF" />
            </TouchableOpacity>

            {/* 공유 카드 (ViewShot으로 캡처) */}
            <ViewShot
              ref={viewShotRef}
              options={{
                format: 'png',
                quality: 1.0,
                width: 1080,
                height: 1080,
              }}
              style={styles.viewShot}
            >
              <LinearGradient
                colors={['#4CAF50', '#2196F3']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                {/* 상단: baln 로고 */}
                <View style={styles.cardHeader}>
                  <Text style={styles.logoText}>bal<Text style={{ color: '#4CAF50' }}>n</Text></Text>
                  <Text style={styles.logoSubtext}>.logic</Text>
                </View>

                {/* 중앙: 적중률 대형 숫자 */}
                <View style={styles.cardCenter}>
                  <Text style={styles.cardTitle}>내 투자 예측 적중률</Text>
                  <View style={styles.accuracyContainer}>
                    <Text style={styles.accuracyNumber}>{accuracyRate}</Text>
                    <Text style={styles.accuracyPercent}>%</Text>
                  </View>

                  {/* 통계 그리드 */}
                  <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                      <Text style={styles.statValue}>{totalVotes}회</Text>
                      <Text style={styles.statLabel}>총 투표</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                      <Text style={styles.statValue}>🔥 {currentStreak}회</Text>
                      <Text style={styles.statLabel}>연속 적중</Text>
                    </View>
                  </View>
                </View>

                {/* 하단: 워터마크 */}
                <View style={styles.cardFooter}>
                  <Text style={styles.watermark}>bal<Text style={{ color: '#4CAF50' }}>n</Text>.app</Text>
                  <View style={styles.divider} />
                  <Text style={styles.watermark}>
                    <Text style={styles.watermarkBrand}>bal<Text style={{ color: '#4CAF50' }}>n</Text></Text>
                    <Text style={styles.watermarkLogic}>.logic</Text>
                  </Text>
                </View>
              </LinearGradient>
            </ViewShot>

            {/* 공유 실행 버튼 */}
            <TouchableOpacity
              style={styles.shareActionButton}
              onPress={handleShare}
              disabled={isCapturing}
            >
              {isCapturing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="logo-instagram" size={24} color="#FFFFFF" />
                  <Text style={styles.shareActionText}>공유하기</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.modalHint}>
              인스타그램 스토리나 피드에 공유해보세요!
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  // 공유하기 버튼 (predictions.tsx에 배치)
  shareButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 16,
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // 모달 오버레이
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },

  // ViewShot 공유 카드 (1080x1080)
  viewShot: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardGradient: {
    flex: 1,
    padding: 40,
    justifyContent: 'space-between',
  },

  // 카드 헤더 (baln 로고)
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoText: {
    fontSize: 33,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  logoSubtext: {
    fontSize: 29,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.8,
  },

  // 카드 중앙 (적중률)
  cardCenter: {
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 21,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 20,
  },
  accuracyContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 30,
  },
  accuracyNumber: {
    fontSize: 96,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -4,
  },
  accuracyPercent: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    opacity: 0.9,
  },

  // 통계 그리드
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 20,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 25,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.7,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#FFFFFF',
    opacity: 0.3,
  },

  // 카드 푸터 (워터마크)
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  watermark: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.7,
  },
  watermarkBrand: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  watermarkLogic: {
    color: '#4CAF50',
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: '#FFFFFF',
    opacity: 0.5,
  },

  // 공유 실행 버튼
  shareActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E1306C', // 인스타그램 핑크
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 24,
    minWidth: 200,
  },
  shareActionText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalHint: {
    fontSize: 14,
    color: '#888888',
    marginTop: 12,
    textAlign: 'center',
  },
});
