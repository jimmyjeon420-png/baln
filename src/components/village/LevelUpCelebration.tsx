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
  colors: any;
  /** 로케일 (ko/en) */
  locale: string;
}

// ============================================================================
// 레벨 이름 매핑
// ============================================================================

interface LevelInfo {
  ko: string;
  en: string;
  unlockKo: string;
  unlockEn: string;
}

const LEVEL_NAMES: Record<number, LevelInfo> = {
  1: {
    ko: '황무지',
    en: 'Barren Land',
    unlockKo: '마을이 시작되었습니다!',
    unlockEn: 'The village has begun!',
  },
  2: {
    ko: '작은 마을',
    en: 'Small Town',
    unlockKo: '첫 번째 건물이 세워졌습니다.',
    unlockEn: 'The first building has been erected.',
  },
  3: {
    ko: '성장하는 마을',
    en: 'Growing Village',
    unlockKo: '구루들이 더 많은 이야기를 합니다.',
    unlockEn: 'Gurus share more stories.',
  },
  4: {
    ko: '번영한 마을',
    en: 'Thriving Village',
    unlockKo: '브랜드 상점이 열렸습니다!',
    unlockEn: 'Brand shops have opened!',
  },
  5: {
    ko: '전설의 마을 입구',
    en: 'Legendary Entrance',
    unlockKo: '마을 신문이 발간됩니다.',
    unlockEn: 'The village newspaper launches.',
  },
  6: {
    ko: '지혜의 거리',
    en: 'Wisdom Street',
    unlockKo: '구루 편지 시스템이 해금됩니다.',
    unlockEn: 'Guru letter system unlocked.',
  },
  7: {
    ko: '금빛 시장',
    en: 'Golden Market',
    unlockKo: '특별 이벤트가 열립니다!',
    unlockEn: 'Special events are now available!',
  },
  8: {
    ko: '투자의 탑',
    en: 'Tower of Investment',
    unlockKo: '라운드테이블 특별 주제가 해금됩니다.',
    unlockEn: 'Special roundtable topics unlocked.',
  },
  9: {
    ko: '하늘의 정원',
    en: 'Sky Garden',
    unlockKo: '구루 특별 대화가 해금됩니다.',
    unlockEn: 'Special guru dialogues unlocked.',
  },
  10: {
    ko: '전설의 마을',
    en: 'Legendary Village',
    unlockKo: '모든 콘텐츠가 해금되었습니다!',
    unlockEn: 'All content has been unlocked!',
  },
};

// ============================================================================
// 메인 컴포넌트
// ============================================================================

function LevelUpCelebration({
  visible,
  newLevel,
  onDismiss,
  colors,
  locale,
}: LevelUpCelebrationProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const isKo = locale === 'ko';
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 구루 이모지 배열 (축하 행렬)
  const guruEmojis = useMemo(() => {
    return Object.values(GURU_CHARACTER_CONFIGS)
      .slice(0, 5)
      .map((c) => c.emoji);
  }, []);

  // 레벨 정보
  const levelInfo = LEVEL_NAMES[newLevel] || LEVEL_NAMES[1];

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
            {isKo ? '마을 레벨 UP!' : 'Village Level UP!'}
          </Text>

          {/* 레벨 숫자 */}
          <Animated.Text style={[styles.levelNumber, { opacity: glowAnim }]}>
            Lv.{newLevel}
          </Animated.Text>

          {/* 레벨 이름 */}
          <Text style={[styles.levelName, { color: colors.textPrimary }]}>
            {isKo ? levelInfo.ko : levelInfo.en}
          </Text>

          {/* 해금 설명 */}
          <Text style={[styles.unlockText, { color: colors.textSecondary }]}>
            {isKo ? levelInfo.unlockKo : levelInfo.unlockEn}
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
              {isKo ? '확인' : 'OK'}
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
