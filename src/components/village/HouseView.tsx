/**
 * HouseView — 마을 씬 내 유저 집 외관 컴포넌트
 *
 * 역할: 마을 탭에서 유저의 집을 이모지 기반으로 보여주는 카드
 * 비유: 동물의숲 마을 지도에서 내 집 건물 — 레벨에 따라 텐트→저택 변화
 *
 * 특징:
 * - 번영도 연동 자동 레벨 표시
 * - 탭하면 인테리어 모달(HouseInteriorModal) 오픈
 * - 집 레벨에 따라 크기/스타일 변화 (이모지 + 후광 효과)
 *
 * 사용처: village.tsx 마을 씬 내부
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import type { HouseLevel } from '../../data/houseConfig';
import { useLocale } from '../../context/LocaleContext';

// ============================================================================
// 타입
// ============================================================================

interface HouseViewProps {
  /** 현재 집 레벨 정보 */
  houseLevel: HouseLevel;
  /** 배치된 가구 수 */
  placedCount: number;
  /** 최대 가구 슬롯 */
  maxSlots: number;
  /** 집 업그레이드 알림 표시 여부 */
  showUpgradeBadge?: boolean;
  /** 탭 시 인테리어 모달 열기 */
  onPress: () => void;
}

// ============================================================================
// 레벨별 스타일 매핑
// ============================================================================

const LEVEL_STYLES: Record<number, { size: number; glowColor: string; bgColor: string }> = {
  1: { size: 48, glowColor: '#8D6E6340', bgColor: '#2A2A2A' },
  2: { size: 56, glowColor: '#A0845E50', bgColor: '#2D2518' },
  3: { size: 64, glowColor: '#4CAF5040', bgColor: '#1A2E1A' },
  4: { size: 72, glowColor: '#FF572240', bgColor: '#2E1A1A' },
  5: { size: 80, glowColor: '#FFD70060', bgColor: '#2E2A10' },
};

// ============================================================================
// 메인 컴포넌트
// ============================================================================

function HouseView({
  houseLevel,
  placedCount,
  maxSlots,
  showUpgradeBadge = false,
  onPress,
}: HouseViewProps) {
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const { t, language } = useLocale();
  const isKo = language === 'ko';

  const levelStyle = LEVEL_STYLES[houseLevel.level] || LEVEL_STYLES[1];

  // 입장 바운스 애니메이션
  useEffect(() => {
    Animated.spring(bounceAnim, {
      toValue: 1,
      friction: 4,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [bounceAnim, houseLevel.level]);

  // 레벨 5일 때 금빛 글로우 반복
  useEffect(() => {
    if (houseLevel.level >= 5) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.8,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.4,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [glowAnim, houseLevel.level]);

  const houseName = isKo ? houseLevel.nameKo : houseLevel.nameEn;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.houseCard,
          {
            backgroundColor: levelStyle.bgColor,
            transform: [{ scale: bounceAnim }],
          },
        ]}
      >
        {/* 후광 효과 */}
        <Animated.View
          style={[
            styles.glow,
            {
              backgroundColor: levelStyle.glowColor,
              opacity: glowAnim,
            },
          ]}
        />

        {/* 집 이모지 */}
        <Text style={[styles.houseEmoji, { fontSize: levelStyle.size }]}>
          {houseLevel.emoji}
        </Text>

        {/* 업그레이드 배지 */}
        {showUpgradeBadge && (
          <View style={styles.upgradeBadge}>
            <Text style={styles.upgradeBadgeText}>UP!</Text>
          </View>
        )}

        {/* 집 이름 라벨 */}
        <Text style={styles.houseName}>
          {houseName}
        </Text>

        {/* 레벨 + 가구 정보 */}
        <View style={styles.infoRow}>
          <Text style={styles.levelBadge}>
            Lv.{houseLevel.level}
          </Text>
          <Text style={styles.furnitureCount}>
            {t('house.furniture_status', { placed: placedCount, max: maxSlots })}
          </Text>
        </View>

        {/* 탭 힌트 */}
        <Text style={styles.tapHint}>
          {t('house.tap_to_decorate')}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default HouseView;

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
  },
  houseCard: {
    width: 160,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  houseEmoji: {
    marginBottom: 8,
  },
  upgradeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF5722',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  upgradeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  houseName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  levelBadge: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '700',
  },
  furnitureCount: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
  },
  tapHint: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 10,
    marginTop: 4,
  },
});
