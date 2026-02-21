/**
 * MilestoneCelebration.tsx - 스트릭 마일스톤 축하 오버레이
 *
 * 역할: "축하 연출" -- 7일, 30일, 90일, 365일 스트릭 달성 시 축하 화면 표시
 *
 * 비즈니스 로직:
 * - 7일: "일주일 전사" 뱃지 획득
 * - 30일: "한 달 마스터" 뱃지 획득
 * - 90일: "철인" 뱃지 획득
 * - 365일: "레전드" 뱃지 획득
 *
 * 사용처:
 * - 홈 탭에서 스트릭 마일스톤 도달 시 표시
 * - useStreak 훅의 isMilestone과 연동
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Share,
  Platform,
} from 'react-native';
import { DARK_COLORS } from '../../styles/colors';

// ============================================================================
// 타입 정의
// ============================================================================

interface MilestoneCelebrationProps {
  /** 달성 마일스톤 (7, 30, 90, 365) */
  milestone: number;
  /** 모달 표시 여부 */
  visible: boolean;
  /** 모달 닫기 콜백 */
  onClose: () => void;
}

// ============================================================================
// 마일스톤 데이터
// ============================================================================

interface MilestoneInfo {
  badge: string;
  badgeName: string;
  title: string;
  subtitle: string;
  confetti: string[];
}

const MILESTONES: Record<number, MilestoneInfo> = {
  7: {
    badge: '\uD83D\uDD25', // fire
    badgeName: '\uD83D\uDD25 일주일 전사',
    title: '7일 연속 달성!',
    subtitle: '꾸준함의 시작, 일주일 전사 뱃지를 획득했어요',
    confetti: ['\uD83D\uDD25', '\u2B50', '\u2728', '\uD83C\uDF89', '\uD83D\uDCAA'],
  },
  30: {
    badge: '\uD83D\uDCAA', // flexed biceps
    badgeName: '\uD83D\uDCAA 한 달 마스터',
    title: '30일 연속 달성!',
    subtitle: '한 달을 함께한 당신, 투자 습관이 자리잡았어요',
    confetti: ['\uD83D\uDCAA', '\uD83D\uDC8E', '\u2B50', '\uD83C\uDF89', '\uD83C\uDFC6'],
  },
  90: {
    badge: '\uD83D\uDCAA', // flexed biceps
    badgeName: '\uD83D\uDCAA 철인',
    title: '90일 연속 달성!',
    subtitle: '3개월을 버틴 당신은 진정한 철인입니다',
    confetti: ['\uD83D\uDCAA', '\uD83C\uDFC6', '\uD83D\uDC8E', '\uD83D\uDE80', '\u2B50'],
  },
  365: {
    badge: '\uD83C\uDFC6', // trophy
    badgeName: '\uD83C\uDFC6 레전드',
    title: '365일 연속 달성!',
    subtitle: '1년을 함께한 전설의 투자자, 레전드 뱃지 획득!',
    confetti: ['\uD83C\uDFC6', '\uD83D\uDC51', '\uD83D\uDE80', '\uD83C\uDF1F', '\uD83D\uDC8E'],
  },
};

/** 마일스톤이 아닌 일수에 대한 기본 데이터 */
function getDefaultMilestone(milestone: number): MilestoneInfo {
  return {
    badge: '\u2728', // sparkles
    badgeName: `\u2728 ${milestone}일 달성`,
    title: `${milestone}일 연속 달성!`,
    subtitle: '꾸준한 투자 습관을 만들어가고 있어요',
    confetti: ['\u2728', '\u2B50', '\uD83C\uDF89', '\uD83D\uDD25', '\uD83D\uDCAA'],
  };
}

// ============================================================================
// Confetti 장식 컴포넌트
// ============================================================================

function ConfettiDecoration({ confetti }: { confetti: string[] }) {
  // 정적 위치의 이모지 장식 (외부 라이브러리 없이)
  const positions = [
    { top: 20, left: 30 },
    { top: 40, right: 25 },
    { top: 80, left: 15 },
    { top: 60, right: 40 },
    { top: 110, left: 50 },
    { top: 10, right: 60 },
    { top: 90, left: 70 },
    { top: 130, right: 15 },
    { top: 50, left: 45 },
    { top: 100, right: 55 },
  ];

  return (
    <View style={confettiStyles.container} pointerEvents="none">
      {positions.map((pos, i) => (
        <Text
          key={i}
          style={[
            confettiStyles.emoji,
            {
              top: pos.top,
              ...(pos.left !== undefined ? { left: pos.left } : {}),
              ...(pos.right !== undefined ? { right: pos.right } : {}),
              opacity: 0.4 + (i % 3) * 0.2,
              fontSize: 17 + (i % 3) * 6,
            },
          ]}
        >
          {confetti[i % confetti.length]}
        </Text>
      ))}
    </View>
  );
}

const confettiStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  emoji: {
    position: 'absolute',
    fontSize: 21,
  },
});

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function MilestoneCelebration({
  milestone,
  visible,
  onClose,
}: MilestoneCelebrationProps) {
  const data = MILESTONES[milestone] ?? getDefaultMilestone(milestone);

  // 애니메이션 값
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;

  // 모달이 열릴 때 애니메이션 실행
  useEffect(() => {
    if (visible) {
      // 카드 등장 애니메이션
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 60,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // 뱃지 바운스 (지연 후)
      setTimeout(() => {
        Animated.spring(badgeScale, {
          toValue: 1,
          tension: 100,
          friction: 5,
          useNativeDriver: true,
        }).start();
      }, 400);
    } else {
      // 닫힐 때 리셋
      scaleAnim.setValue(0.5);
      opacityAnim.setValue(0);
      badgeScale.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim, badgeScale]);

  // 공유하기
  const handleShare = async () => {
    try {
      const message = Platform.select({
        ios: `baln 앱에서 ${milestone}일 연속 투자 습관을 달성했어요! ${data.badgeName} 뱃지 획득! #baln #투자습관`,
        default: `baln 앱에서 ${milestone}일 연속 투자 습관을 달성했어요! ${data.badgeName} 뱃지 획득! #baln #투자습관`,
      });

      await Share.share({
        message: message ?? '',
      });
    } catch (error) {
      console.warn('[MilestoneCelebration] 공유 실패:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Confetti 장식 */}
          <ConfettiDecoration confetti={data.confetti} />

          {/* 뱃지 (바운스 애니메이션) */}
          <Animated.View
            style={[
              styles.badgeContainer,
              { transform: [{ scale: badgeScale }] },
            ]}
          >
            <Text style={styles.badgeEmoji}>{data.badge}</Text>
          </Animated.View>

          {/* 축하 텍스트 */}
          <Text style={styles.title}>{data.title}</Text>
          <Text style={styles.subtitle}>{data.subtitle}</Text>

          {/* 뱃지 획득 카드 */}
          <View style={styles.badgeCard}>
            <View style={styles.badgeCardHeader}>
              <Text style={styles.badgeCardLabel}>뱃지 획득!</Text>
            </View>
            <Text style={styles.badgeCardName}>{data.badgeName}</Text>
            <Text style={styles.badgeCardDesc}>
              {milestone}일 연속 출석 달성
            </Text>
          </View>

          {/* 액션 버튼 */}
          <View style={styles.buttonRow}>
            {/* 공유하기 버튼 */}
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShare}
              activeOpacity={0.8}
            >
              <Text style={styles.shareButtonText}>공유하기</Text>
            </TouchableOpacity>

            {/* 확인 버튼 */}
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmButtonText}>확인</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    overflow: 'hidden',
    // 그린 글로우 보더
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  badgeContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: DARK_COLORS.streak.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 20,
    // 그린 글로우 효과
    shadowColor: DARK_COLORS.streak.active,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  badgeEmoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: DARK_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  badgeCard: {
    width: '100%',
    backgroundColor: DARK_COLORS.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: DARK_COLORS.border,
  },
  badgeCardHeader: {
    backgroundColor: DARK_COLORS.streak.background,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  badgeCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: DARK_COLORS.streak.active,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  badgeCardName: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  badgeCardDesc: {
    fontSize: 14,
    color: DARK_COLORS.textTertiary,
  },
  buttonRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flex: 1,
    backgroundColor: DARK_COLORS.surface,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DARK_COLORS.border,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: DARK_COLORS.textSecondary,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
