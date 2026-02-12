/**
 * StreakMilestone.tsx — 마일스톤 달성 축하 모달
 *
 * [비유] "트로피 수여식"
 * - 7일/30일/90일/365일 달성 시 팝업
 * - 불꽃 파티클 애니메이션 (confetti 느낌)
 * - 획득 뱃지 표시 + 크레딧 보상 표시
 * - SNS 공유 버튼
 *
 * useTheme() 훅으로 다크/라이트 모드 대응
 * 크레딧 표시: "5C (₩500)" 형식 (원화 병기)
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { formatCredits } from '../../utils/formatters';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PARTICLE_COUNT = 12;

// ── Props ──
interface StreakMilestoneProps {
  visible: boolean;
  milestone: number;
  badgeEmoji: string;
  badgeName: string;
  creditReward: number;
  onClose: () => void;
  onShare?: () => void;
}

// ── 파티클 1개 ──
function Particle({ delay, color }: { delay: number; color: string }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  const startX = (Math.random() - 0.5) * SCREEN_WIDTH * 0.8;

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -(150 + Math.random() * 200),
          duration: 1200 + Math.random() * 600,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: startX,
          duration: 1200 + Math.random() * 600,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.delay(600),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1 + Math.random() * 0.5,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]);

    anim.start();
    return () => anim.stop();
  }, [delay, startX, translateY, translateX, opacity, scale]);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          backgroundColor: color,
          opacity,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    />
  );
}

// ── 메인 컴포넌트 ──
export default function StreakMilestone({
  visible,
  milestone,
  badgeEmoji,
  badgeName,
  creditReward,
  onClose,
  onShare,
}: StreakMilestoneProps) {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const badgeBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0);
      badgeBounce.setValue(0);

      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 60,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(badgeBounce, {
          toValue: 1,
          tension: 80,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scaleAnim, badgeBounce]);

  // 마일스톤별 메시지
  const getMessage = () => {
    if (milestone >= 365) return '당신은 진정한 투자자입니다!';
    if (milestone >= 90) return '대단해요! 습관이 체화되었습니다';
    if (milestone >= 30) return '훌륭해요! 한 달을 함께 했습니다';
    if (milestone >= 7) return '좋은 습관의 시작입니다!';
    return '축하합니다!';
  };

  const particleColors = [
    colors.streak.active,
    colors.streak.glow,
    colors.primary,
    colors.warning,
    '#FF6B6B',
    '#64B5F6',
  ];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* 파티클 애니메이션 */}
        <View style={styles.particleContainer}>
          {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
            <Particle
              key={i}
              delay={i * 80}
              color={particleColors[i % particleColors.length]}
            />
          ))}
        </View>

        <Animated.View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* 닫기 버튼 */}
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.surfaceLight }]}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={18} color={colors.textTertiary} />
          </TouchableOpacity>

          {/* 축하 타이틀 */}
          <Text style={[styles.congrats, { color: colors.streak.active }]}>
            {'\uD83C\uDF89'} 마일스톤 달성!
          </Text>

          {/* 뱃지 ── 바운스 애니메이션 */}
          <Animated.View
            style={[
              styles.badgeCircle,
              { backgroundColor: colors.streak.background, borderColor: colors.streak.active },
              {
                transform: [
                  {
                    scale: badgeBounce.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.badgeEmoji}>{badgeEmoji}</Text>
          </Animated.View>

          {/* 뱃지 이름 + 일수 */}
          <Text style={[styles.badgeName, { color: colors.textPrimary }]}>
            {badgeName}
          </Text>
          <Text style={[styles.milestoneDay, { color: colors.textSecondary }]}>
            {milestone}일 연속 출석 달성
          </Text>

          {/* 메시지 */}
          <Text style={[styles.message, { color: colors.textTertiary }]}>
            {getMessage()}
          </Text>

          {/* 크레딧 보상 */}
          {creditReward > 0 && (
            <View style={[styles.rewardBox, { backgroundColor: colors.streak.background }]}>
              <Text style={[styles.rewardLabel, { color: colors.textSecondary }]}>
                보상 획득
              </Text>
              <Text style={[styles.rewardValue, { color: colors.streak.active }]}>
                +{formatCredits(creditReward)}
              </Text>
            </View>
          )}

          {/* 액션 버튼 */}
          <View style={styles.buttonRow}>
            {onShare && (
              <TouchableOpacity
                style={[styles.shareButton, { borderColor: colors.border }]}
                onPress={onShare}
                activeOpacity={0.7}
              >
                <Ionicons name="share-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.shareText, { color: colors.textSecondary }]}>
                  공유하기
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: colors.primary }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.confirmText, { color: colors.background }]}>
                확인
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ══════════════════════════════════════════
// 스타일
// ══════════════════════════════════════════

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },

  // ── 파티클 ──
  particleContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // ── 카드 ──
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
  },

  // ── 닫기 ──
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── 축하 ──
  congrats: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },

  // ── 뱃지 ──
  badgeCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: 16,
  },
  badgeEmoji: {
    fontSize: 48,
  },
  badgeName: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  milestoneDay: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },

  // ── 보상 ──
  rewardBox: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 20,
    gap: 4,
  },
  rewardLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  rewardValue: {
    fontSize: 22,
    fontWeight: '900',
  },

  // ── 버튼 ──
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  shareText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
