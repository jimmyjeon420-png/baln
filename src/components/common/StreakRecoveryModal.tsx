/**
 * StreakRecoveryModal.tsx - 스트릭 복구 모달
 *
 * 역할: "스트릭 복원 창구" -- 스트릭이 끊겼을 때 크레딧으로 복구할 수 있는 모달
 *
 * 비즈니스 로직:
 * - 1일 경과: 3C (₩300) -- "아직 늦지 않았어요!"
 * - 2일 경과: 5C (₩500) -- "조금 서두르세요"
 * - 3일 경과: 8C (₩800) -- "마지막 기회!"
 * - 4일+ 경과: 복구 불가 -- "새로운 시작도 멋져요"
 *
 * 사용처:
 * - 홈 탭에서 스트릭 끊김 감지 시 자동 표시
 * - useStreakRecovery 훅과 연동
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DARK_COLORS } from '../../styles/colors';
import { formatCredits } from '../../utils/formatters';
import { useLocale } from '../../context/LocaleContext';

// ============================================================================
// 타입 정의
// ============================================================================

interface StreakRecoveryModalProps {
  /** 모달 표시 여부 */
  visible: boolean;
  /** 모달 닫기 콜백 */
  onClose: () => void;
  /** 놓친 일수 (1~3: 복구 가능, 4+: 불가) */
  daysMissed: number;
  /** 끊기기 전 스트릭 일수 */
  previousStreak: number;
  /** 복구 실행 콜백 (크레딧 비용 전달) */
  onRecover: (cost: number) => Promise<void>;
}

// ============================================================================
// 복구 비용 티어
// ============================================================================

const RECOVERY_COSTS: Record<number, number> = {
  1: 3,  // 1일 경과 = 3크레딧
  2: 5,  // 2일 경과 = 5크레딧
  3: 8,  // 3일 경과 = 8크레딧
};

const RECOVERY_EMOJI: Record<number, string> = {
  1: '⏰',
  2: '⚡',
  3: '🚨',
};

// ============================================================================
// 컴포넌트
// ============================================================================

export default function StreakRecoveryModal({
  visible,
  onClose,
  daysMissed,
  previousStreak,
  onRecover,
}: StreakRecoveryModalProps) {
  const [isRecovering, setIsRecovering] = useState(false);
  const { t } = useLocale();

  const canRecover = daysMissed >= 1 && daysMissed <= 3;
  const cost = RECOVERY_COSTS[daysMissed] ?? 0;
  const recoveryEmoji = RECOVERY_EMOJI[daysMissed] ?? '⏰';
  const recoveryTitle = t(`streak.recovery_title_${daysMissed}` as unknown as Parameters<typeof t>[0]) || t('streak.recovery_title_1');
  const recoverySubtitle = t(`streak.recovery_subtitle_${daysMissed}` as unknown as Parameters<typeof t>[0]) || '';

  const handleRecover = async () => {
    if (!canRecover || isRecovering) return;

    setIsRecovering(true);
    try {
      await onRecover(cost);
      onClose();
    } catch (error) {
      console.warn('[StreakRecoveryModal] 복구 실패:', error);
    } finally {
      setIsRecovering(false);
    }
  };

  // 복구 불가능한 경우 (4일 이상 경과)
  if (daysMissed >= 4) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.card}>
            {/* 헤더 */}
            <Text style={styles.emoji}>🌱</Text>
            <Text style={styles.title}>{t('streak.recovery_expired_title')}</Text>
            <Text style={styles.subtitle}>
              {previousStreak > 0
                ? t('streak.recovery_expired_subtitle_with_streak', { count: previousStreak })
                : t('streak.recovery_expired_subtitle_new')}
            </Text>

            {/* 경과 일수 표시 */}
            <View style={styles.infoBox}>
              <Ionicons name="time-outline" size={18} color={DARK_COLORS.textTertiary} />
              <Text style={styles.infoText}>
                {t('streak.recovery_days_elapsed', { count: daysMissed })}
              </Text>
            </View>

            {/* 확인 버튼 */}
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>{t('streak.recovery_new_start')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // 복구 가능한 경우 (1~3일 경과)
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* 이모지 & 제목 */}
          <Text style={styles.emoji}>{recoveryEmoji}</Text>
          <Text style={styles.title}>{recoveryTitle}</Text>
          <Text style={styles.subtitle}>{recoverySubtitle}</Text>

          {/* 스트릭 정보 카드 */}
          <View style={styles.streakInfoCard}>
            <View style={styles.streakInfoRow}>
              <Ionicons name="flame" size={20} color={DARK_COLORS.streak.active} />
              <Text style={styles.streakInfoLabel}>{t('streak.recovery_broken_streak')}</Text>
              <Text style={styles.streakInfoValue}>{t('streak.days', { count: previousStreak })}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.streakInfoRow}>
              <Ionicons name="time-outline" size={20} color={DARK_COLORS.textTertiary} />
              <Text style={styles.streakInfoLabel}>{t('streak.recovery_days_missed')}</Text>
              <Text style={styles.streakInfoValue}>{t('streak.days', { count: daysMissed })}</Text>
            </View>
          </View>

          {/* 복구 비용 */}
          <View style={styles.costBox}>
            <Text style={styles.costLabel}>{t('streak.recovery_cost')}</Text>
            <Text style={styles.costValue}>{formatCredits(cost)}</Text>
          </View>

          {/* 복구 버튼 */}
          <TouchableOpacity
            style={[styles.primaryButton, isRecovering && styles.primaryButtonDisabled]}
            onPress={handleRecover}
            disabled={isRecovering}
            activeOpacity={0.8}
          >
            {isRecovering ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="refresh" size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>
                  {t('streak.recovery_btn', { cost: formatCredits(cost, false) })}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* 포기 버튼 */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onClose}
            disabled={isRecovering}
          >
            <Text style={styles.secondaryButtonText}>{t('streak.recovery_give_up')}</Text>
          </TouchableOpacity>
        </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 21,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: DARK_COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 21,
  },
  streakInfoCard: {
    width: '100%',
    backgroundColor: DARK_COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  streakInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  streakInfoLabel: {
    flex: 1,
    fontSize: 15,
    color: DARK_COLORS.textSecondary,
  },
  streakInfoValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: DARK_COLORS.border,
    marginVertical: 12,
  },
  costBox: {
    width: '100%',
    backgroundColor: DARK_COLORS.streak.background,
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  costLabel: {
    fontSize: 15,
    color: DARK_COLORS.textSecondary,
  },
  costValue: {
    fontSize: 17,
    fontWeight: '700',
    color: DARK_COLORS.streak.active,
  },
  infoBox: {
    width: '100%',
    backgroundColor: DARK_COLORS.background,
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: DARK_COLORS.textTertiary,
    lineHeight: 19,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    color: DARK_COLORS.textTertiary,
  },
});
