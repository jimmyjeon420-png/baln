/**
 * StreakBanner.tsx - 연속 기록 배너
 *
 * 역할: "출석 현황판" — 사용자의 연속 방문 기록을 보여주는 컴팩트한 배너
 *
 * 디자인:
 * - 높이 40px, 컴팩트한 가로 배너
 * - 7일 마일스톤마다 특별 배경 그라데이션
 * - 터치하면 상세 모달 (longestStreak, 마일스톤 목록)
 *
 * 스트릭 보호 (Streak Freeze):
 * - 프리즈 보유 수 표시 (배너에 방패 아이콘)
 * - 모달 내 프리즈 구매 버튼 (3C)
 * - 미접속 후 복귀 시 프리즈 자동 소모 → 스트릭 유지
 *
 * 비즈니스 효과:
 * - 연속 기록 시각화 → 매일 방문 동기 부여
 * - 손실 회피 심리 → "127일을 잃기 싫어서" 매일 접속
 * - 프리즈 구매 → 크레딧 순환 경제 활성화
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useStreak } from '../../hooks/useStreak';
import { useStreakFreeze } from '../../hooks/useStreakFreeze';
import { useHaptics } from '../../hooks/useHaptics';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../context/LocaleContext';

export default function StreakBanner() {
  const { currentStreak, longestStreak, streakMessage, isNewStreak, isLoading } = useStreak();
  const {
    hasActiveFreeze,
    freezeCount,
    lastUsedDate,
    isLoading: freezeLoading,
    purchaseFreeze,
    useFreeze,
  } = useStreakFreeze();
  const { mediumTap, lightTap } = useHaptics();
  const { colors } = useTheme();
  const { t } = useLocale();
  const [showModal, setShowModal] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [freezeUsedToast, setFreezeUsedToast] = useState(false);

  // ─── 프리즈 자동 적용 로직 ───
  // isNewStreak === true이면 어제 미접속 → 스트릭이 리셋되려 하는 상황
  // 이때 프리즈가 있으면 자동 소모하여 스트릭을 보호
  // ref를 사용하여 useFreeze 변경 시 불필요한 재실행 방지 (메모리 누수/무한 루프 방지)
  const useFreezeRef = React.useRef(useFreeze);
  useFreezeRef.current = useFreeze;

  const autoFreezeRan = React.useRef(false);

  useEffect(() => {
    if (autoFreezeRan.current || !isNewStreak || freezeLoading) return;

    if (hasActiveFreeze) {
      autoFreezeRan.current = true;
      (async () => {
        const result = await useFreezeRef.current();
        if (result.success && result.freezeUsed) {
          setFreezeUsedToast(true);
          setTimeout(() => setFreezeUsedToast(false), 3000);
        }
      })();
    }
  }, [isNewStreak, freezeLoading, hasActiveFreeze]);

  // ─── 프리즈 구매 핸들러 ───
  const handlePurchaseFreeze = async () => {
    lightTap();
    setIsPurchasing(true);
    try {
      const result = await purchaseFreeze();
      if (result.success) {
        mediumTap();
        Alert.alert(
          t('streak_banner.purchase_success_title'),
          t('streak_banner.purchase_success_body', { count: result.newFreezeCount, credits: result.newCreditBalance }),
        );
      } else {
        Alert.alert(
          t('streak_banner.purchase_fail_title'),
          result.errorMessage || t('streak_banner.purchase_fail_body'),
        );
      }
    } catch {
      Alert.alert(t('streak_banner.error_title'), t('streak_banner.error_body'));
    } finally {
      setIsPurchasing(false);
    }
  };

  // 로딩 중이면 표시 안 함
  if (isLoading || currentStreak === 0) {
    return null;
  }

  // 마일스톤 여부 (7일 마다)
  const isMilestone = currentStreak >= 7 && currentStreak % 7 === 0;

  // 배경 색상 (마일스톤이면 그라데이션)
  const gradientColors = isMilestone
    ? [colors.primary + '40', colors.primary + '0D'] as const
    : [colors.primary + '26', colors.primary + '00'] as const;

  return (
    <>
      {/* 프리즈 사용 토스트 */}
      {freezeUsedToast && (
        <View style={[styles.freezeToast, { backgroundColor: '#1565C0' }]}>
          <Text style={styles.freezeToastText}>
            {'\u{1F6E1}\uFE0F'} {t('streak_banner.freeze_used_toast')}
          </Text>
        </View>
      )}

      {/* 배너 */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          mediumTap();
          setShowModal(true);
        }}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.banner, { borderColor: colors.primary + '33' }]}
        >
          <View style={styles.left}>
            <Text style={styles.emoji}>{streakMessage.emoji}</Text>
            <Text style={[styles.text, { color: colors.textSecondary }]}>
              <Text style={[styles.number, { color: colors.primary }]}>{t('streak_banner.days', { count: currentStreak })}</Text> {t('streak_banner.consecutive_visits')}
            </Text>
            {/* 프리즈 보유 수 표시 */}
            {freezeCount > 0 && (
              <View style={styles.freezeBadge}>
                <Text style={styles.freezeBadgeText}>
                  {'\u{1F6E1}\uFE0F'} {freezeCount}
                </Text>
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </LinearGradient>
      </TouchableOpacity>

      {/* 상세 모달 */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.textPrimary + '0F' }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('streak_banner.modal_title')}</Text>
            <TouchableOpacity
              onPress={() => {
                mediumTap();
                setShowModal(false);
              }}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* 현재 스트릭 */}
            <LinearGradient
              colors={[colors.primary + '33', colors.primary + '0D']}
              style={[styles.currentCard, { borderColor: colors.primary + '33' }]}
            >
              <Text style={styles.currentEmoji}>{streakMessage.emoji}</Text>
              <Text style={[styles.currentNumber, { color: colors.primary }]}>{t('streak_banner.days', { count: currentStreak })}</Text>
              <Text style={[styles.currentLabel, { color: colors.textSecondary }]}>{t('streak_banner.consecutive_visits')}</Text>
              <Text style={[styles.currentMessage, { color: colors.textTertiary }]}>{streakMessage.message}</Text>
            </LinearGradient>

            {/* 스트릭 보호 섹션 */}
            <View style={[styles.freezeSection, { backgroundColor: '#1565C0' + '14', borderColor: '#1565C0' + '33' }]}>
              <View style={styles.freezeHeader}>
                <View style={styles.freezeTitleRow}>
                  <Text style={styles.freezeIcon}>{'\u{1F6E1}\uFE0F'}</Text>
                  <Text style={[styles.freezeTitle, { color: colors.textPrimary }]}>{t('streak_banner.freeze_title')}</Text>
                </View>
                <Text style={[styles.freezeCountLabel, { color: '#1565C0' }]}>
                  {t('streak_banner.freeze_count', { count: freezeCount })}
                </Text>
              </View>
              <Text style={[styles.freezeDesc, { color: colors.textTertiary }]}>
                {t('streak_banner.freeze_desc')}
              </Text>
              {lastUsedDate && (
                <Text style={[styles.freezeLastUsed, { color: colors.textTertiary }]}>
                  {t('streak_banner.freeze_last_used', { date: lastUsedDate })}
                </Text>
              )}
              <TouchableOpacity
                style={[
                  styles.freezePurchaseButton,
                  { backgroundColor: '#1565C0' + '1A', borderColor: '#1565C0' + '40' },
                  isPurchasing && { opacity: 0.5 },
                ]}
                onPress={handlePurchaseFreeze}
                disabled={isPurchasing}
                activeOpacity={0.7}
              >
                {isPurchasing ? (
                  <ActivityIndicator size="small" color="#1565C0" />
                ) : (
                  <Text style={[styles.freezePurchaseText, { color: '#1565C0' }]}>
                    {t('streak_banner.freeze_purchase_button')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* 역대 최장 기록 */}
            {longestStreak > currentStreak && (
              <View style={[styles.longestCard, { backgroundColor: colors.premium.gold + '14', borderColor: colors.premium.gold + '33' }]}>
                <View style={styles.longestRow}>
                  <Text style={[styles.longestLabel, { color: colors.textSecondary }]}>{t('streak_banner.longest_record')}</Text>
                  <Text style={[styles.longestNumber, { color: colors.premium.gold }]}>🏆 {t('streak_banner.days', { count: longestStreak })}</Text>
                </View>
                <Text style={[styles.longestHint, { color: colors.textTertiary }]}>
                  {t('streak_banner.longest_hint', { remaining: longestStreak - currentStreak })}
                </Text>
              </View>
            )}

            {longestStreak === currentStreak && currentStreak > 1 && (
              <View style={[styles.longestCard, { backgroundColor: colors.premium.gold + '14', borderColor: colors.premium.gold + '33' }]}>
                <View style={styles.longestRow}>
                  <Text style={[styles.longestLabel, { color: colors.textSecondary }]}>{t('streak_banner.longest_record')}</Text>
                  <Text style={[styles.longestNumber, { color: colors.premium.gold }]}>🏆 {t('streak_banner.days', { count: longestStreak })}</Text>
                </View>
                <Text style={[styles.longestHint, { color: colors.textTertiary }]}>{t('streak_banner.longest_hint_breaking')}</Text>
              </View>
            )}

            {/* 마일스톤 목록 */}
            <View style={styles.milestonesSection}>
              <Text style={[styles.milestonesTitle, { color: colors.textPrimary }]}>{t('streak_banner.milestones_title')}</Text>
              <View style={styles.milestonesList}>
                <MilestoneItem
                  emoji="🌱"
                  days={1}
                  label={t('streak_banner.milestone_first_visit')}
                  achieved={currentStreak >= 1}
                  colors={colors}
                />
                <MilestoneItem
                  emoji="✨"
                  days={3}
                  label={t('streak_banner.milestone_habit_start')}
                  achieved={currentStreak >= 3}
                  colors={colors}
                />
                <MilestoneItem
                  emoji="🔥"
                  days={7}
                  label={t('streak_banner.milestone_one_week')}
                  achieved={currentStreak >= 7}
                  colors={colors}
                />
                <MilestoneItem
                  emoji="💎"
                  days={30}
                  label={t('streak_banner.milestone_one_month')}
                  achieved={currentStreak >= 30}
                  colors={colors}
                />
                <MilestoneItem
                  emoji="🏆"
                  days={100}
                  label={t('streak_banner.milestone_true_investor')}
                  achieved={currentStreak >= 100}
                  colors={colors}
                />
              </View>
            </View>

            {/* 하단 설명 */}
            <View style={[styles.infoBox, { backgroundColor: colors.primary + '0F', borderColor: colors.primary + '1A' }]}>
              <Text style={[styles.infoText, { color: colors.textTertiary }]}>
                {t('streak_banner.info_text')}
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

// 마일스톤 아이템 컴포넌트
function MilestoneItem({
  emoji,
  days,
  label,
  achieved,
  colors,
}: {
  emoji: string;
  days: number;
  label: string;
  achieved: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={[
      styles.milestoneItem,
      { backgroundColor: colors.surface + '08', borderColor: colors.textPrimary + '0D' },
      achieved && { backgroundColor: colors.primary + '14', borderColor: colors.primary + '33' },
    ]}>
      <Text style={[styles.milestoneEmoji, !achieved && styles.milestoneDisabled]}>
        {emoji}
      </Text>
      <View style={styles.milestoneText}>
        <Text style={[styles.milestoneLabel, { color: colors.textPrimary }, !achieved && styles.milestoneDisabled]}>
          {label}
        </Text>
        <Text style={[styles.milestoneDays, { color: colors.textTertiary }, !achieved && styles.milestoneDisabled]}>
          {days}d
        </Text>
      </View>
      {achieved && (
        <View style={styles.milestoneCheck}>
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // ─── 프리즈 사용 토스트 ───
  freezeToast: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
    alignItems: 'center',
  },
  freezeToastText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // ─── 배너 ───
  banner: {
    height: 40,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    marginBottom: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emoji: {
    fontSize: 19,
  },
  text: {
    fontSize: 15,
    fontWeight: '500',
  },
  number: {
    fontSize: 17,
    fontWeight: '700',
  },

  // ─── 프리즈 배지 (배너 내) ───
  freezeBadge: {
    marginLeft: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#1565C0' + '26',
  },
  freezeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64B5F6',
  },

  // ─── 모달 ───
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // ─── 현재 스트릭 카드 ───
  currentCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  currentEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  currentNumber: {
    fontSize: 42,
    fontWeight: '900',
  },
  currentLabel: {
    fontSize: 15,
    marginTop: 4,
    fontWeight: '500',
  },
  currentMessage: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },

  // ─── 스트릭 보호 섹션 ───
  freezeSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  freezeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  freezeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  freezeIcon: {
    fontSize: 19,
  },
  freezeTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  freezeCountLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  freezeDesc: {
    fontSize: 13,
    marginBottom: 4,
    lineHeight: 19,
  },
  freezeLastUsed: {
    fontSize: 12,
    marginBottom: 10,
  },
  freezePurchaseButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 4,
  },
  freezePurchaseText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // ─── 역대 최장 기록 ───
  longestCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  longestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  longestLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  longestNumber: {
    fontSize: 19,
    fontWeight: '700',
  },
  longestHint: {
    fontSize: 13,
  },

  // ─── 마일스톤 섹션 ───
  milestonesSection: {
    marginBottom: 24,
  },
  milestonesTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  milestonesList: {
    gap: 10,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  milestoneEmoji: {
    fontSize: 25,
  },
  milestoneDisabled: {
    opacity: 0.3,
  },
  milestoneText: {
    flex: 1,
  },
  milestoneLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  milestoneDays: {
    fontSize: 13,
    marginTop: 2,
  },
  milestoneCheck: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── 하단 안내 ───
  infoBox: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
});
