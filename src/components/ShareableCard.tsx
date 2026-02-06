/**
 * ShareableCard - 인스타그램 스토리 공유용 프리미엄 카드
 * BALN 로고 + 티어 배지 + CFO 날씨 이모지
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
import { TIER_LABELS } from '../hooks/useGatherings';
import { UserTier } from '../types/database';
import { MorningBriefingResult } from '../services/gemini';

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
  totalAssets,
  morningBriefing,
  panicShieldIndex,
}: ShareableCardProps) {
  const viewShotRef = useRef<ViewShot>(null);
  // 웹 캡처용 ref (DOM 엘리먼트 직접 접근)
  const webCaptureRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const { heavyTap, success, error: errorHaptic } = useHaptics();

  const tierStyle = TIER_GRADIENT[tier];
  const weatherEmoji = morningBriefing?.cfoWeather?.emoji || '📊';
  const sentiment = morningBriefing?.macroSummary?.marketSentiment || 'NEUTRAL';

  /** 웹 전용: html-to-image로 캡처 → Web Share API 또는 다운로드 */
  const handleWebShare = useCallback(async () => {
    // html-to-image 동적 로드 (네이티브 빌드에 영향 안 줌)
    const { toPng } = await import('html-to-image');

    // React Native Web에서 View ref = DOM 엘리먼트
    const element = webCaptureRef.current as unknown as HTMLElement;
    if (!element) throw new Error('캡처 영역을 찾을 수 없습니다.');

    // DOM → PNG data URL 변환 (고해상도 2x)
    const dataUrl = await toPng(element, {
      quality: 1.0,
      pixelRatio: 2,
    });

    // data URL → Blob 변환
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const fileName = `BALN_처방전_${new Date().toISOString().split('T')[0]}.png`;

    // Web Share API 지원 시 (모바일 웹 등)
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ title: 'BALN AI 처방전', files: [file] });
        return;
      }
    }

    // 폴백: 이미지 다운로드 (데스크톱 웹)
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
      Alert.alert('공유 불가', '이 기기에서는 공유 기능을 사용할 수 없습니다.');
      return;
    }

    if (!viewShotRef.current?.capture) {
      throw new Error('캡처 컴포넌트를 찾을 수 없습니다.');
    }

    const uri = await viewShotRef.current.capture();
    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: 'BALN 처방전 공유',
      UTI: 'public.png',
    });
  }, []);

  /** 카드 캡처 → 공유 (플랫폼별 분기) */
  const handleShare = useCallback(async () => {
    if (!morningBriefing) {
      Alert.alert('잠시만요', '분석이 완료된 후 공유할 수 있습니다.');
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
    } catch (err) {
      console.error('Share error:', err);
      errorHaptic();
      Alert.alert('공유 실패', '카드 공유 중 오류가 발생했습니다.');
    } finally {
      setSharing(false);
    }
  }, [morningBriefing, heavyTap, success, errorHaptic, handleWebShare, handleNativeShare]);

  // 카드 콘텐츠 (캡처 대상 영역)
  const cardContent = (
    <>
      {/* 상단: 로고 + 날짜 */}
      <View style={styles.topRow}>
        <View style={styles.logoArea}>
          <Text style={[styles.logoText, { color: '#4CAF50' }]}>BALN</Text>
          <Text style={styles.logoSubtext}>Smart Rebalancer</Text>
        </View>
        <Text style={styles.dateText}>
          {new Date().toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      {/* 중앙: CFO 날씨 + 감성 */}
      <View style={styles.centerSection}>
        <Text style={styles.weatherEmoji}>{weatherEmoji}</Text>
        <Text style={[styles.statusText, { color: tierStyle.text }]}>
          {morningBriefing?.cfoWeather?.status || '분석 중...'}
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
            {TIER_LABELS[tier]}
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

      {/* 워터마크 */}
      <Text style={styles.watermark}>baln.app</Text>
    </>
  );

  return (
    <View>
      {/* 캡처 영역: 웹은 View ref, 네이티브는 ViewShot ref 사용 */}
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

      {/* 공유 버튼 */}
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
            ? '캡처 중...'
            : Platform.OS === 'web'
            ? '처방전 이미지 저장'
            : '인스타그램 공유'}
        </Text>
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
  logoText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 3,
  },
  logoSubtext: {
    fontSize: 10,
    color: '#666666',
    letterSpacing: 1,
    marginTop: 2,
  },
  dateText: {
    fontSize: 11,
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  sentimentPill: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sentimentText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  highlightText: {
    fontSize: 12,
    color: '#AAAAAA',
    lineHeight: 20,
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
    fontSize: 11,
    fontWeight: '700',
  },
  shieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shieldText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
  },
  watermark: {
    textAlign: 'center',
    fontSize: 10,
    color: '#444444',
    marginTop: 16,
    letterSpacing: 2,
  },
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
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  shareButtonTextDisabled: {
    color: '#666666',
  },
});
