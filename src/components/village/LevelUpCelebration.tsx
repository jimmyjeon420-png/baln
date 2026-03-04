/**
 * LevelUpCelebration -- 번영도 레벨업 전체화면 축하 연출
 *
 * 역할: 마을 번영도가 레벨업 하면 전체화면 오버레이로 축하 연출
 *       구루 이모지 모임 + 금빛 폭죽 + 해금 레벨 이름 표시
 * 비유: "동물의숲 마을 평가 축하 이벤트" -- 마을이 업그레이드되면 주민 모두 박수
 *
 * 사용처:
 * - useVillageProsperity에서 레벨업 감지 시 visible=true로 전달
 * - 8초 후 자동 닫힘 또는 "확인" 버튼으로 닫기
 */

import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { GURU_CHARACTER_CONFIGS } from '../../data/guruCharacterConfig';
import { t } from '../../locales';
import type { ThemeColors } from '../../styles/colors';

// ============================================================================
// 타입
// ============================================================================

interface LevelUpCelebrationProps {
  /** 표시 여부 */
  visible: boolean;
  /** 도달한 새 레벨 (1~10) */
  newLevel: number;
  /** 닫기 콜백 */
  onDismiss: () => void;
  /** 테마 색상 */
  colors: ThemeColors;
  /** @deprecated Use t() from locales instead. Kept for backward compatibility. */
  locale?: string;
}

// ============================================================================
// 레벨 이름 매핑 — i18n keys
// ============================================================================

// Translation keys follow the pattern:
// village.level_up.level_{N}_name  — level name
// village.level_up.level_{N}_unlock — unlock description

// ============================================================================
// 메인 컴포넌트
// ============================================================================

function LevelUpCelebration({
  visible,
  newLevel,
  onDismiss,
  colors,
}: LevelUpCelebrationProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 구루 이모지 배열 (축하 행렬)
  const guruEmojis = useMemo(() => {
    return Object.values(GURU_CHARACTER_CONFIGS)
      .slice(0, 5)
      .map((c) => c.emoji);
  }, []);

  // 입장 애니메이션 + 자동 닫기
  useEffect(() => {
    if (visible) {
      // 스프링 스케일 입장
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 60,
        useNativeDriver: true,
      }).start();

      // 금빛 글로우 반복
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.6,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      ).start();

      // 8초 자동 닫기
      autoDismissRef.current = setTimeout(() => {
        onDismiss();
      }, 8000);
    } else {
      scaleAnim.setValue(0);
      glowAnim.setValue(0);
      if (autoDismissRef.current) {
        clearTimeout(autoDismissRef.current);
      }
    }

    return () => {
      if (autoDismissRef.current) {
        clearTimeout(autoDismissRef.current);
      }
    };
  }, [visible, scaleAnim, glowAnim, onDismiss]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* 축하 이모지 */}
          <Animated.Text style={[styles.celebrationEmoji, { opacity: glowAnim }]}>
            {'\uD83C\uDF8A'}
          </Animated.Text>

          {/* 레벨업 타이틀 */}
          <Text style={styles.levelUpTitle}>
            {t('village.level_up.title')}
          </Text>

          {/* 레벨 숫자 */}
          <Animated.Text style={[styles.levelNumber, { opacity: glowAnim }]}>
            Lv.{newLevel}
          </Animated.Text>

          {/* 레벨 이름 */}
          <Text style={[styles.levelName, { color: colors.textPrimary }]}>
            {t('village.level_up.level_' + newLevel + '_name')}
          </Text>

          {/* 해금 설명 */}
          <Text style={[styles.unlockText, { color: colors.textSecondary }]}>
            {t('village.level_up.level_' + newLevel + '_unlock')}
          </Text>

          {/* 구루 이모지 행렬 */}
          <View style={styles.guruRow}>
            {guruEmojis.map((emoji, idx) => (
              <Text key={idx} style={styles.guruEmoji}>
                {emoji}
              </Text>
            ))}
          </View>

          {/* 확인 버튼 */}
          <TouchableOpacity
            style={[styles.dismissButton, { backgroundColor: colors.primary }]}
            onPress={onDismiss}
            activeOpacity={0.8}
          >
            <Text style={styles.dismissButtonText}>
              {t('common.ok')}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default LevelUpCelebration;

// ============================================================================
// 스타일
// ============================================================================

const GOLD = '#FFD700';

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 300,
  },
  card: {
    width: '80%',
    maxWidth: 340,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: GOLD + '60',
  },
  celebrationEmoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  levelUpTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: GOLD,
    marginBottom: 8,
  },
  levelNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: GOLD,
    marginBottom: 4,
  },
  levelName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  unlockText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  guruRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  guruEmoji: {
    fontSize: 28,
  },
  dismissButton: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dismissButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
