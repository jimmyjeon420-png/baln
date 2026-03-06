/**
 * ShareableCard - 인스타그램 스토리 공유용 프리미엄 카드
 * "baln.logic" 브랜딩 + 티어 배지 + 투자 날씨 이모지
 * 공유 성공 시 3크레딧 보상 지급 (1일 1회)
 *
 * 네이티브: react-native-view-shot → expo-sharing
 * 웹: html-to-image → Web Share API / 이미지 다운로드
 */

import React, { useRef, useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useHaptics } from '../hooks/useHaptics';
import { useShareReward } from '../hooks/useRewards';
import { getCommunityTierLabel } from '../hooks/useGatherings';
import { UserTier } from '../types/database';
import { MorningBriefingResult } from '../services/gemini';
import { REWARD_AMOUNTS } from '../services/rewardService';
import { formatLocalDateFull } from '../utils/formatters';
import { useLocale } from '../context/LocaleContext';

interface ShareableCardProps {
  tier: UserTier;
  totalAssets: number;
  morningBriefing: MorningBriefingResult | null;
  panicShieldIndex?: number;
}

// 티어별 그라데이션 스타일
const TIER_GRADIENT: Record<UserTier, { bg: string; accent: string; text: string }> = {
  SILVER: { bg: '#1A1F2C', accent: '#C0C0C0', text: '#E0E0E0' },
  GOLD: { bg: '#1A1F2C', accent: '#FFD700', text: '#FFE082' },
  PLATINUM: { bg: '#1A1F2C', accent: '#E5E4E2', text: '#F5F5F5' },
  DIAMOND: { bg: '#0A1628', accent: '#B9F2FF', text: '#E0F7FA' },
};

export default function ShareableCard({
  tier,
  totalAssets: _totalAssets,
  morningBriefing,
  panicShieldIndex,
}: ShareableCardProps) {
  const { t } = useLocale();
  const viewShotRef = useRef<ViewShot>(null);
  const webCaptureRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const [rewardMessage, setRewardMessage] = useState<string | null>(null);
  const { heavyTap, success, error: errorHaptic } = useHaptics();
  const { rewarded, claimReward } = useShareReward();

  const tierStyle = TIER_GRADIENT[tier];
  const weatherEmoji = morningBriefing?.cfoWeather?.emoji || '📊';
  const sentiment = morningBriefing?.macroSummary?.marketSentiment || 'NEUTRAL';

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

  /** 웹 전용: html-to-image로 캡처 → Web Share API 또는 다운로드 */
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
    const fileName = `baln_logic_${new Date().toISOString().split('T')[0]}.png`;

    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ title: 'baln.logic AI 처방전', files: [file] });
        return;
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  /** 네이티브 전용: ViewShot 캡처 → expo-sharing */
  const handleNativeShare = useCallback(async () => {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert(t('share.unavailableTitle'), t('share.unavailableMsg'));
      return;
    }

    if (!viewShotRef.current?.capture) {
      throw new Error('캡처 컴포넌트를 찾을 수 없습니다.');
    }

    const uri = await viewShotRef.current.capture();
    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: 'baln.logic 처방전 공유',
      UTI: 'public.png',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 카드 캡처 → 공유 → 보상 지급 */
  const handleShare = useCallback(async () => {
    if (!morningBriefing) {
      Alert.alert(t('share.waitTitle'), t('share.waitMsg'));
      return;
    }

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
      Alert.alert(t('share.failTitle'), t('share.failMsg'));
    } finally {
      setSharing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [morningBriefing, heavyTap, success, errorHaptic, handleWebShare, handleNativeShare, handleRewardAfterShare]);

  // 카드 콘텐츠 (캡처 대상 영역)
  const cardContent = (
    <>
      {/* 상단: baln.logic 로고 + 날짜 */}
      <View style={styles.topRow}>
        <View style={styles.logoArea}>
          <View style={styles.logoRow}>
            <Text style={styles.logoBaln}>bal<Text style={{ color: '#4CAF50' }}>n</Text></Text>
            <Text style={styles.logoDot}>.logic</Text>
          </View>
          <Text style={styles.logoSubtext}>AI Portfolio Optimizer</Text>
        </View>
        <Text style={styles.dateText}>
          {formatLocalDateFull(new Date())}
        </Text>
      </View>

      {/* 중앙: 투자 날씨 + 감성 */}
      <View style={styles.centerSection}>
        <Text style={styles.weatherEmoji}>{weatherEmoji}</Text>
        <Text style={[styles.statusText, { color: tierStyle.text }]}>
          {morningBriefing?.cfoWeather?.status || t('share.analyzing')}
        </Text>
        <View style={[
          styles.sentimentPill,
          {
            backgroundColor: sentiment === 'BULLISH'
              ? 'rgba(76, 175, 80, 0.3)'
              : sentiment === 'BEARISH'
              ? 'rgba(207, 102, 121, 0.3)'
              : 'rgba(255, 215, 0, 0.3)',
          },
        ]}>
          <Text style={[
            styles.sentimentText,
            {
              color: sentiment === 'BULLISH'
                ? '#4CAF50'
                : sentiment === 'BEARISH'
                ? '#CF6679'
                : '#FFD700',
            },
          ]}>
            {sentiment}
          </Text>
        </View>
      </View>

      {/* 하이라이트 */}
      {morningBriefing?.macroSummary?.highlights?.slice(0, 2).map((h, i) => (
        <Text key={i} style={styles.highlightText} numberOfLines={1}>
          {h}
        </Text>
      ))}

      {/* 하단: 티어 배지 + Panic Shield */}
      <View style={styles.bottomRow}>
        <View style={[styles.tierBadge, { borderColor: tierStyle.accent }]}>
          <Ionicons
            name={tier === 'DIAMOND' ? 'diamond' : tier === 'PLATINUM' ? 'star' : tier === 'GOLD' ? 'trophy' : 'medal'}
            size={12}
            color={tierStyle.accent}
          />
          <Text style={[styles.tierText, { color: tierStyle.accent }]}>
            {getCommunityTierLabel(tier)}
          </Text>
        </View>

        {panicShieldIndex !== undefined && (
          <View style={styles.shieldBadge}>
            <Ionicons name="shield-checkmark" size={12} color="#4CAF50" />
            <Text style={styles.shieldText}>
              Safety {panicShieldIndex}
            </Text>
          </View>
        )}
      </View>

      {/* 워터마크: baln.logic 브랜딩 */}
      <View style={styles.watermarkRow}>
        <View style={styles.watermarkLine} />
        <Text style={styles.watermarkBaln}>bal<Text style={{ color: '#4CAF50' }}>n</Text></Text>
        <Text style={styles.watermarkDot}>.logic</Text>
        <View style={styles.watermarkLine} />
      </View>
    </>
  );

  return (
    <View>
      {/* 캡처 영역 */}
      {Platform.OS === 'web' ? (
        <View
          ref={webCaptureRef}
          style={[styles.captureArea, { backgroundColor: tierStyle.bg }]}
        >
          {cardContent}
        </View>
      ) : (
        <ViewShot
          ref={viewShotRef}
          options={{ format: 'png', quality: 1.0 }}
          style={[styles.captureArea, { backgroundColor: tierStyle.bg }]}
        >
          {cardContent}
        </ViewShot>
      )}

      {/* 보상 토스트 메시지 */}
      {rewardMessage && (
        <View style={styles.rewardToast}>
          <Ionicons name="gift" size={14} color="#4CAF50" />
          <Text style={styles.rewardToastText}>{rewardMessage}</Text>
        </View>
      )}

      {/* 공유 버튼 + 보상 힌트 */}
      <TouchableOpacity
        style={[styles.shareButton, !morningBriefing && styles.shareButtonDisabled]}
        onPress={handleShare}
        disabled={sharing || !morningBriefing}
        activeOpacity={0.7}
      >
        <Ionicons
          name={Platform.OS === 'web' ? 'download-outline' : 'share-social'}
          size={18}
          color={morningBriefing ? '#FFFFFF' : '#666666'}
        />
        <Text style={[
          styles.shareButtonText,
          !morningBriefing && styles.shareButtonTextDisabled,
        ]}>
          {sharing
            ? t('share.capturing')
            : Platform.OS === 'web'
            ? t('share.saveImage')
            : t('share.shareInstagram')}
        </Text>
        {/* 보상 힌트 (아직 오늘 보상 안 받았으면 표시) */}
        {morningBriefing && !rewarded && (
          <View style={styles.rewardHint}>
            <Text style={styles.rewardHintText}>+{REWARD_AMOUNTS.shareCard}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  captureArea: {
    borderRadius: 20,
    padding: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  logoArea: {},
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoBaln: {
    fontSize: 27,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  logoDot: {
    fontSize: 27,
    fontWeight: '900',
    color: '#4CAF50',
    letterSpacing: 1,
  },
  logoSubtext: {
    fontSize: 10,
    color: '#666666',
    letterSpacing: 2,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  dateText: {
    fontSize: 12,
    color: '#888888',
  },
  centerSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  weatherEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
  },
  sentimentPill: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sentimentText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  highlightText: {
    fontSize: 13,
    color: '#AAAAAA',
    lineHeight: 21,
    marginBottom: 4,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#4CAF50',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '700',
  },
  shieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shieldText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  // 워터마크: baln.logic 브랜딩 (라인 + 텍스트)
  watermarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  watermarkLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  watermarkBaln: {
    fontSize: 13,
    fontWeight: '700',
    color: '#555555',
    letterSpacing: 1,
  },
  watermarkDot: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3A7D3E',
    letterSpacing: 1,
  },
  // 보상 토스트
  rewardToast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderRadius: 20,
  },
  rewardToastText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
  },
  // 공유 버튼
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
  },
  shareButtonDisabled: {
    backgroundColor: '#2A2A2A',
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  shareButtonTextDisabled: {
    color: '#666666',
  },
  // 보상 힌트 배지 (공유 버튼 옆 "+3" 표시)
  rewardHint: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  rewardHintText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1A1A1A',
  },
});
