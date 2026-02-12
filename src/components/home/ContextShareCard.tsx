/**
 * ContextShareCard.tsx - 맥락 카드 인스타그램 스토리 공유 전용 컴포넌트
 *
 * 역할: 맥락 카드 내용을 1080x1920 인스타 스토리 포맷으로 변환
 * 비유: "오늘의 시장 뉴스레터"를 예쁜 이미지로 포장
 *
 * 레이아웃:
 * - 상단: baln.logic 로고 + 날짜
 * - 센티먼트 배지 (calm/caution/alert)
 * - 헤드라인 (2줄)
 * - 거시경제 체인 (화살표 연결)
 * - 역사적 맥락 요약
 * - 하단: "baln.app에서 전체 분석 보기" CTA
 *
 * 기술:
 * - react-native-view-shot: 네이티브 캡처
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useHaptics } from '../../hooks/useHaptics';
import { useShareReward } from '../../hooks/useRewards';
import {
  ContextCardData,
  SENTIMENT_COLORS,
  SENTIMENT_ICONS,
  SENTIMENT_LABELS,
} from '../../types/contextCard';
import { REWARD_AMOUNTS } from '../../services/rewardService';

interface ContextShareCardProps {
  /** 맥락 카드 데이터 */
  data: ContextCardData;
  /** 모달 표시 여부 */
  visible: boolean;
  /** 모달 닫기 핸들러 */
  onClose: () => void;
}

export default function ContextShareCard({
  data,
  visible,
  onClose,
}: ContextShareCardProps) {
  const viewShotRef = useRef<ViewShot>(null);
  const webCaptureRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const [rewardMessage, setRewardMessage] = useState<string | null>(null);
  const { heavyTap, success, error: errorHaptic } = useHaptics();
  const { rewarded, claimReward } = useShareReward();

  const sentimentColor = SENTIMENT_COLORS[data.sentiment];
  const sentimentIcon = SENTIMENT_ICONS[data.sentiment];
  const sentimentLabel = SENTIMENT_LABELS[data.sentiment];

  // 날짜 포맷 (2026-02-08 → 2026년 2월 8일)
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  /** 공유 성공 후 크레딧 보상 지급 */
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

  /** 웹 전용: html-to-image로 캡처 */
  const handleWebShare = useCallback(async () => {
    const { toPng } = await import('html-to-image');

    const element = webCaptureRef.current as unknown as HTMLElement;
    if (!element) throw new Error('캡처 영역을 찾을 수 없습니다.');

    const dataUrl = await toPng(element, {
      quality: 1.0,
      pixelRatio: 2,
    });

    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const fileName = `baln_context_${data.date}.png`;

    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ title: 'baln.logic 맥락 카드', files: [file] });
        return;
      }
    }

    // Web Share API 미지원 시 다운로드
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [data.date]);

  /** 네이티브 전용: ViewShot 캡처 → expo-sharing */
  const handleNativeShare = useCallback(async () => {
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
  }, []);

  /** 카드 캡처 → 공유 → 보상 지급 */
  const handleShare = useCallback(async () => {
    heavyTap();
    setSharing(true);

    try {
      if (Platform.OS === 'web') {
        await handleWebShare();
      } else {
        await handleNativeShare();
      }
      success();

      // 공유 성공 → 크레딧 보상 지급
      await handleRewardAfterShare();
    } catch (err) {
      console.error('Share error:', err);
      errorHaptic();
      Alert.alert('공유 실패', '카드 공유 중 오류가 발생했습니다.');
    } finally {
      setSharing(false);
    }
  }, [heavyTap, success, errorHaptic, handleWebShare, handleNativeShare, handleRewardAfterShare]);

  // 거시경제 체인 최대 4개만 표시
  const displayChain = data.macroChain.slice(0, 4);

  // 역사적 맥락 2줄로 제한
  const historicalSummary =
    data.historicalContext.length > 100
      ? data.historicalContext.slice(0, 100) + '...'
      : data.historicalContext;

  // 카드 콘텐츠 (캡처 대상 영역)
  const cardContent = (
    <View style={styles.captureArea}>
      {/* 배경 그라데이션 효과 */}
      <View style={[styles.backgroundGlow, { backgroundColor: sentimentColor, opacity: 0.05 }]} />

      {/* 상단: baln.logic 로고 + 날짜 */}
      <View style={styles.topRow}>
        <View style={styles.logoArea}>
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
        <Ionicons name={sentimentIcon} size={18} color={sentimentColor} />
        <Text style={[styles.sentimentLabel, { color: sentimentColor }]}>
          {sentimentLabel}
        </Text>
      </View>

      {/* 헤드라인 */}
      <Text style={styles.headline} numberOfLines={2}>
        {data.headline}
      </Text>

      {/* 구분선 */}
      <View style={styles.divider} />

      {/* 거시경제 체인 */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Ionicons name="git-network-outline" size={18} color="#2196F3" />
          <Text style={styles.sectionTitle}>거시경제 체인</Text>
        </View>
        <View style={styles.chainContainer}>
          {displayChain.map((step, index) => (
            <View key={index}>
              <View style={styles.chainStep}>
                <View style={styles.chainDot} />
                <Text style={styles.chainText} numberOfLines={2}>
                  {step}
                </Text>
              </View>
              {index < displayChain.length - 1 && (
                <View style={styles.chainArrow}>
                  <Ionicons name="arrow-down" size={16} color="#616161" />
                </View>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* 역사적 맥락 요약 */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Ionicons name="time-outline" size={18} color="#4CAF50" />
          <Text style={styles.sectionTitle}>역사적 맥락</Text>
        </View>
        <Text style={styles.historicalText} numberOfLines={3}>
          {historicalSummary}
        </Text>
      </View>

      {/* 하단 CTA */}
      <View style={styles.ctaContainer}>
        <View style={styles.ctaBox}>
          <Ionicons name="open-outline" size={16} color="#4CAF50" />
          <Text style={styles.ctaText}>bal<Text style={{ color: '#4CAF50' }}>n</Text>.app에서 전체 분석 보기</Text>
        </View>
      </View>

      {/* 워터마크: baln.logic 브랜딩 */}
      <View style={styles.watermarkRow}>
        <View style={styles.watermarkLine} />
        <Text style={styles.watermarkBaln}>bal<Text style={{ color: '#4CAF50' }}>n</Text></Text>
        <Text style={styles.watermarkDot}>.logic</Text>
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
          <TouchableOpacity
            onPress={() => {
              onClose();
            }}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color="#888888" />
          </TouchableOpacity>
        </View>

        {/* 캡처 영역 */}
        <View style={styles.previewContainer}>
          {Platform.OS === 'web' ? (
            <View ref={webCaptureRef}>{cardContent}</View>
          ) : (
            <ViewShot
              ref={viewShotRef}
              options={{ format: 'png', quality: 1.0 }}
            >
              {cardContent}
            </ViewShot>
          )}
        </View>

        {/* 보상 토스트 메시지 */}
        {rewardMessage && (
          <View style={styles.rewardToast}>
            <Ionicons name="gift" size={14} color="#4CAF50" />
            <Text style={styles.rewardToastText}>{rewardMessage}</Text>
          </View>
        )}

        {/* 공유 버튼 + 보상 힌트 */}
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
                <Ionicons
                  name={Platform.OS === 'web' ? 'download-outline' : 'share-social'}
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.shareButtonText}>
                  {Platform.OS === 'web' ? '이미지 저장' : '인스타그램 공유'}
                </Text>
                {/* 보상 힌트 (아직 오늘 보상 안 받았으면 표시) */}
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

const styles = StyleSheet.create({
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
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  // ─── 캡처 영역 (1080x1920 비율) ───
  captureArea: {
    width: 320,
    aspectRatio: 9 / 16, // 인스타 스토리 비율
    backgroundColor: '#1A1F2C',
    borderRadius: 20,
    padding: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  backgroundGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    borderRadius: 20,
  },

  // ─── 상단: 로고 + 날짜 ───
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    zIndex: 10,
  },
  logoArea: {},
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoBaln: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  logoDot: {
    fontSize: 22,
    fontWeight: '900',
    color: '#4CAF50',
    letterSpacing: 1,
  },
  logoSubtext: {
    fontSize: 8,
    color: '#666666',
    letterSpacing: 2,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  dateText: {
    fontSize: 10,
    color: '#888888',
  },

  // ─── 센티먼트 배지 ───
  sentimentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 16,
    zIndex: 10,
  },
  sentimentLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },

  // ─── 헤드라인 ───
  headline: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: 16,
    zIndex: 10,
  },

  // ─── 구분선 ───
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
  },

  // ─── 섹션 공통 ───
  sectionContainer: {
    marginBottom: 16,
    zIndex: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E0E0E0',
    marginLeft: 6,
  },

  // ─── 거시경제 체인 ───
  chainContainer: {
    paddingLeft: 4,
  },
  chainStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  chainDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2196F3',
    marginRight: 8,
    marginTop: 6,
  },
  chainText: {
    fontSize: 12,
    color: '#BDBDBD',
    flex: 1,
    lineHeight: 18,
  },
  chainArrow: {
    marginLeft: 3,
    marginBottom: 4,
  },

  // ─── 역사적 맥락 ───
  historicalText: {
    fontSize: 12,
    color: '#BDBDBD',
    lineHeight: 18,
    paddingLeft: 4,
  },

  // ─── 하단 CTA ───
  ctaContainer: {
    marginTop: 'auto',
    paddingTop: 16,
    zIndex: 10,
  },
  ctaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 6,
  },

  // ─── 워터마크: baln.logic 브랜딩 ───
  watermarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
    zIndex: 10,
  },
  watermarkLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  watermarkBaln: {
    fontSize: 10,
    fontWeight: '700',
    color: '#555555',
    letterSpacing: 1,
  },
  watermarkDot: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3A7D3E',
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
  // 보상 힌트 배지 (공유 버튼 옆 "+3" 표시)
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
