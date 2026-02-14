/**
 * ContextShareCard.tsx - 맥락 카드 인스타그램 스토리 공유 전용 컴포넌트
 *
 * 역할: 맥락 카드 4겹 레이어 전체를 1080x1920 인스타 스토리 포맷으로 변환
 * 비유: "오늘의 시장 뉴스레터"를 예쁜 이미지로 포장
 *
 * 레이아웃:
 * - 상단: baln.logic 로고 + 날짜 + 센티먼트 배지
 * - 헤드라인
 * - Layer 1: 역사적 맥락
 * - Layer 2: 거시경제 체인 (화살표 연결)
 * - Layer 3: 기관 행동
 * - Layer 4: 포트폴리오 영향
 * - 하단: "baln.app에서 전체 분석 보기" CTA + 워터마크
 *
 * 기술:
 * - react-native-view-shot: 네이티브 캡처 (1080x1920)
 * - expo-sharing: 공유 기능
 * - 공유 성공 시 3크레딧 보상 (useShareReward)
 */

import React, { useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useHaptics } from '../../hooks/useHaptics';
import { useShareReward } from '../../hooks/useRewards';
import { useTrackEvent } from '../../hooks/useAnalytics';
import {
  ContextCardData,
  SENTIMENT_COLORS,
  SENTIMENT_ICONS,
  SENTIMENT_LABELS,
} from '../../types/contextCard';
import { REWARD_AMOUNTS } from '../../services/rewardService';

// ============================================================================
// 레이어 색상 (ContextBriefCard와 동일)
// ============================================================================

const LAYER_COLORS = {
  historical: '#4CAF50',
  macro: '#29B6F6',
  institutional: '#FF9800',
  portfolio: '#7C4DFF',
} as const;

interface ContextShareCardProps {
  data: ContextCardData;
  visible: boolean;
  onClose: () => void;
}

export default function ContextShareCard({
  data,
  visible,
  onClose,
}: ContextShareCardProps) {
  const viewShotRef = useRef<ViewShot>(null);
  const [sharing, setSharing] = useState(false);
  const [rewardMessage, setRewardMessage] = useState<string | null>(null);
  const { heavyTap, success, error: errorHaptic } = useHaptics();
  const { rewarded, claimReward } = useShareReward();
  const track = useTrackEvent();

  const sentimentColor = SENTIMENT_COLORS[data.sentiment];
  const sentimentIcon = SENTIMENT_ICONS[data.sentiment];
  const sentimentLabel = SENTIMENT_LABELS[data.sentiment];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  const handleRewardAfterShare = useCallback(async () => {
    try {
      const result = await claimReward();
      if (result.success) {
        setRewardMessage(`+${result.creditsEarned} 크레딧 획득!`);
        setTimeout(() => setRewardMessage(null), 3000);
      }
    } catch {
      // 보상 실패해도 공유 자체는 성공이므로 무시
    }
  }, [claimReward]);

  const handleShare = useCallback(async () => {
    heavyTap();
    setSharing(true);

    try {
      if (Platform.OS === 'web') {
        Alert.alert('알림', '웹에서는 이미지 공유가 지원되지 않습니다.');
        return;
      }

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('공유 불가', '이 기기에서는 공유 기능을 사용할 수 없습니다.');
        return;
      }

      if (!viewShotRef.current?.capture) {
        throw new Error('캡처 컴포넌트를 찾을 수 없습니다.');
      }

      const uri = await viewShotRef.current.capture();
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'baln.logic 맥락 카드 공유',
        UTI: 'public.png',
      });

      success();
      track('share_card', { source: 'context_share_modal', sentiment: data.sentiment, date: data.date });
      await handleRewardAfterShare();
    } catch (err) {
      console.warn('[Share] 공유 실패:', err);
      errorHaptic();
      Alert.alert('공유 실패', '카드 공유 중 오류가 발생했습니다.');
    } finally {
      setSharing(false);
    }
  }, [heavyTap, success, errorHaptic, handleRewardAfterShare, track, data.sentiment, data.date]);

  // 거시경제 체인 최대 5개
  const displayChain = data.macroChain.slice(0, 5);

  // 포트폴리오 영향 포맷
  const pct = data.portfolioImpact.percentChange;
  const isPositive = pct >= 0;
  const pctColor = isPositive ? '#4CAF50' : '#FF5252';
  const pctText = `${isPositive ? '+' : ''}${pct.toFixed(1)}%`;

  // ── 캡처 대상: 인스타 스토리 카드 (9:16) ──
  const cardContent = (
    <View style={styles.captureArea}>
      {/* 배경 글로우 */}
      <View style={[styles.backgroundGlow, { backgroundColor: sentimentColor }]} />

      {/* 상단: 로고 + 날짜 */}
      <View style={styles.topRow}>
        <View>
          <View style={styles.logoRow}>
            <Text style={styles.logoBaln}>bal<Text style={{ color: '#4CAF50' }}>n</Text></Text>
            <Text style={styles.logoDot}>.logic</Text>
          </View>
          <Text style={styles.logoSubtext}>AI 맥락 분석</Text>
        </View>
        <Text style={styles.dateText}>{formatDate(data.date)}</Text>
      </View>

      {/* 센티먼트 배지 */}
      <View style={[styles.sentimentBadge, { borderColor: sentimentColor }]}>
        <Ionicons name={sentimentIcon} size={16} color={sentimentColor} />
        <Text style={[styles.sentimentLabel, { color: sentimentColor }]}>{sentimentLabel}</Text>
      </View>

      {/* 헤드라인 */}
      <Text style={styles.headline} numberOfLines={3}>{data.headline}</Text>

      <View style={styles.divider} />

      {/* Layer 1: 역사적 맥락 */}
      <View style={styles.layerSection}>
        <View style={styles.layerHeader}>
          <View style={[styles.layerBadge, { backgroundColor: LAYER_COLORS.historical }]}>
            <Text style={styles.layerNum}>1</Text>
          </View>
          <Ionicons name="time-outline" size={14} color={LAYER_COLORS.historical} />
          <Text style={styles.layerTitle}>역사적 맥락</Text>
        </View>
        <Text style={styles.layerBody} numberOfLines={3}>{data.historicalContext}</Text>
      </View>

      {/* Layer 2: 거시경제 체인 */}
      <View style={styles.layerSection}>
        <View style={styles.layerHeader}>
          <View style={[styles.layerBadge, { backgroundColor: LAYER_COLORS.macro }]}>
            <Text style={styles.layerNum}>2</Text>
          </View>
          <Ionicons name="git-network-outline" size={14} color={LAYER_COLORS.macro} />
          <Text style={styles.layerTitle}>거시경제 체인</Text>
        </View>
        <View style={styles.chainContainer}>
          {displayChain.map((step, index) => (
            <View key={index} style={styles.chainRow}>
              <View style={[
                styles.chainDot,
                { backgroundColor: index === 0 ? LAYER_COLORS.macro : '#888' },
              ]} />
              <Text style={styles.chainText} numberOfLines={1}>{step}</Text>
              {index < displayChain.length - 1 && (
                <Ionicons name="chevron-forward" size={10} color="#616161" style={styles.chainArrow} />
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Layer 3: 기관 행동 */}
      <View style={styles.layerSection}>
        <View style={styles.layerHeader}>
          <View style={[styles.layerBadge, { backgroundColor: LAYER_COLORS.institutional }]}>
            <Text style={styles.layerNum}>3</Text>
          </View>
          <Ionicons name="business-outline" size={14} color={LAYER_COLORS.institutional} />
          <Text style={styles.layerTitle}>기관 행동</Text>
        </View>
        <Text style={styles.layerBody} numberOfLines={3}>{data.institutionalBehavior}</Text>
      </View>

      {/* Layer 4: 포트폴리오 영향 */}
      <View style={styles.layerSection}>
        <View style={styles.layerHeader}>
          <View style={[styles.layerBadge, { backgroundColor: LAYER_COLORS.portfolio }]}>
            <Text style={styles.layerNum}>4</Text>
          </View>
          <Ionicons name="wallet-outline" size={14} color={LAYER_COLORS.portfolio} />
          <Text style={styles.layerTitle}>포트폴리오 영향</Text>
        </View>
        <View style={styles.impactRow}>
          <View style={[styles.impactBox, { borderColor: pctColor }]}>
            <Text style={[styles.impactNumber, { color: pctColor }]}>{pctText}</Text>
            <Text style={styles.impactLabel}>자산 변동</Text>
          </View>
          <Text style={styles.impactMessage} numberOfLines={2}>
            {data.portfolioImpact.message || '영향도 분석 완료'}
          </Text>
        </View>
      </View>

      {/* 하단 CTA */}
      <View style={styles.ctaContainer}>
        <View style={styles.ctaBox}>
          <Ionicons name="open-outline" size={14} color="#4CAF50" />
          <Text style={styles.ctaText}>
            bal<Text style={{ color: '#4CAF50' }}>n</Text>.app에서 전체 분석 보기
          </Text>
        </View>
      </View>

      {/* 워터마크 */}
      <View style={styles.watermarkRow}>
        <View style={styles.watermarkLine} />
        <Text style={styles.watermarkText}>
          bal<Text style={{ color: '#4CAF50' }}>n</Text>
          <Text style={{ color: '#3A7D3E' }}>.logic</Text>
        </Text>
        <View style={styles.watermarkLine} />
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* 모달 헤더 */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>맥락 카드 공유</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#888888" />
          </TouchableOpacity>
        </View>

        {/* 프리뷰 + 캡처 영역 */}
        <ScrollView
          contentContainerStyle={styles.previewScroll}
          showsVerticalScrollIndicator={false}
        >
          <ViewShot
            ref={viewShotRef}
            options={{
              format: 'png',
              quality: 1.0,
              width: 1080,
              height: 1920,
            }}
          >
            {cardContent}
          </ViewShot>
        </ScrollView>

        {/* 보상 토스트 */}
        {rewardMessage && (
          <View style={styles.rewardToast}>
            <Ionicons name="gift" size={14} color="#4CAF50" />
            <Text style={styles.rewardToastText}>{rewardMessage}</Text>
          </View>
        )}

        {/* 공유 버튼 */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
            disabled={sharing}
            activeOpacity={0.7}
          >
            {sharing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="share-social" size={18} color="#FFFFFF" />
                <Text style={styles.shareButtonText}>인스타그램 스토리 공유</Text>
                {!rewarded && (
                  <View style={styles.rewardHint}>
                    <Text style={styles.rewardHintText}>+{REWARD_AMOUNTS.shareCard}</Text>
                  </View>
                )}
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// 스타일 (인스타 스토리 9:16 비율 최적화)
// ============================================================================

const styles = StyleSheet.create({
  // ─── 모달 ───
  modalContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
  },
  previewScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },

  // ─── 캡처 영역 (9:16 인스타 스토리) ───
  captureArea: {
    width: 320,
    aspectRatio: 9 / 16,
    backgroundColor: '#1A1F2C',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 22,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  backgroundGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    opacity: 0.06,
  },

  // ─── 상단: 로고 + 날짜 ───
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoBaln: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  logoDot: {
    fontSize: 20,
    fontWeight: '900',
    color: '#4CAF50',
    letterSpacing: 1,
  },
  logoSubtext: {
    fontSize: 7,
    color: '#666666',
    letterSpacing: 2,
    marginTop: 1,
    textTransform: 'uppercase',
  },
  dateText: {
    fontSize: 9,
    color: '#888888',
    marginTop: 4,
  },

  // ─── 센티먼트 배지 ───
  sentimentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  sentimentLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 5,
  },

  // ─── 헤드라인 ───
  headline: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 22,
    marginBottom: 10,
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },

  // ─── 레이어 공통 ───
  layerSection: {
    marginBottom: 10,
  },
  layerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    gap: 5,
  },
  layerBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  layerNum: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  layerTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E0E0E0',
  },
  layerBody: {
    fontSize: 11,
    color: '#BDBDBD',
    lineHeight: 16,
    paddingLeft: 21,
  },

  // ─── 거시경제 체인 (가로 배치) ───
  chainContainer: {
    paddingLeft: 21,
    gap: 3,
  },
  chainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chainDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 6,
  },
  chainText: {
    fontSize: 10,
    color: '#BDBDBD',
    lineHeight: 15,
    flex: 1,
  },
  chainArrow: {
    marginLeft: 2,
  },

  // ─── 포트폴리오 영향 ───
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 21,
    gap: 10,
  },
  impactBox: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignItems: 'center',
    minWidth: 70,
  },
  impactNumber: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  impactLabel: {
    fontSize: 8,
    color: '#888888',
    marginTop: 1,
  },
  impactMessage: {
    fontSize: 10,
    color: '#BDBDBD',
    lineHeight: 15,
    flex: 1,
  },

  // ─── 하단 CTA ───
  ctaContainer: {
    marginTop: 'auto',
    paddingTop: 8,
  },
  ctaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    gap: 5,
  },
  ctaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50',
  },

  // ─── 워터마크 ───
  watermarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 6,
  },
  watermarkLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  watermarkText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#555555',
    letterSpacing: 1,
  },

  // ─── 보상 토스트 ───
  rewardToast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderRadius: 20,
  },
  rewardToastText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4CAF50',
  },

  // ─── 공유 버튼 ───
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rewardHint: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  rewardHintText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A1A1A',
  },
});
