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
          '스트릭 보호 구매 완료',
          `보호권 ${result.newFreezeCount}개 보유 중\n잔여 크레딧: ${result.newCreditBalance}C`,
        );
      } else {
        Alert.alert(
          '구매 실패',
          result.errorMessage || '크레딧이 부족합니다. (필요: 3C)',
        );
      }
    } catch {
      Alert.alert('오류', '구매 중 문제가 발생했습니다.');
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
            {'\u{1F6E1}\uFE0F'} 스트릭 보호가 사용되었습니다!
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
              <Text style={[styles.number, { color: colors.primary }]}>{currentStreak}일</Text> 연속 방문 중
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
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>연속 기록</Text>
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
              <Text style={[styles.currentNumber, { color: colors.primary }]}>{currentStreak}일</Text>
              <Text style={[styles.currentLabel, { color: colors.textSecondary }]}>연속 방문 중</Text>
              <Text style={[styles.currentMessage, { color: colors.textTertiary }]}>{streakMessage.message}</Text>
            </LinearGradient>

            {/* 스트릭 보호 섹션 */}
            <View style={[styles.freezeSection, { backgroundColor: '#1565C0' + '14', borderColor: '#1565C0' + '33' }]}>
              <View style={styles.freezeHeader}>
                <View style={styles.freezeTitleRow}>
                  <Text style={styles.freezeIcon}>{'\u{1F6E1}\uFE0F'}</Text>
                  <Text style={[styles.freezeTitle, { color: colors.textPrimary }]}>스트릭 보호</Text>
                </View>
                <Text style={[styles.freezeCountLabel, { color: '#1565C0' }]}>
                  {freezeCount}개 보유
                </Text>
              </View>
              <Text style={[styles.freezeDesc, { color: colors.textTertiary }]}>
                하루 미접속 시 자동으로 스트릭을 보호합니다.
              </Text>
              {lastUsedDate && (
                <Text style={[styles.freezeLastUsed, { color: colors.textTertiary }]}>
                  마지막 사용: {lastUsedDate}
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
                    보호권 구매  3C ({'\u20A9'}300)
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* 역대 최장 기록 */}
            {longestStreak > currentStreak && (
              <View style={[styles.longestCard, { backgroundColor: colors.premium.gold + '14', borderColor: colors.premium.gold + '33' }]}>
                <View style={styles.longestRow}>
                  <Text style={[styles.longestLabel, { color: colors.textSecondary }]}>역대 최장 기록</Text>
                  <Text style={[styles.longestNumber, { color: colors.premium.gold }]}>🏆 {longestStreak}일</Text>
                </View>
                <Text style={[styles.longestHint, { color: colors.textTertiary }]}>
                  {longestStreak - currentStreak}일만 더 가면 자기 기록 경신!
                </Text>
              </View>
            )}

            {longestStreak === currentStreak && currentStreak > 1 && (
              <View style={[styles.longestCard, { backgroundColor: colors.premium.gold + '14', borderColor: colors.premium.gold + '33' }]}>
                <View style={styles.longestRow}>
                  <Text style={[styles.longestLabel, { color: colors.textSecondary }]}>역대 최장 기록</Text>
                  <Text style={[styles.longestNumber, { color: colors.premium.gold }]}>🏆 {longestStreak}일</Text>
                </View>
                <Text style={[styles.longestHint, { color: colors.textTertiary }]}>자기 기록 갱신 중!</Text>
              </View>
            )}

            {/* 마일스톤 목록 */}
            <View style={styles.milestonesSection}>
              <Text style={[styles.milestonesTitle, { color: colors.textPrimary }]}>마일스톤</Text>
              <View style={styles.milestonesList}>
                <MilestoneItem
                  emoji="🌱"
                  days={1}
                  label="첫 방문"
                  achieved={currentStreak >= 1}
                  colors={colors}
                />
                <MilestoneItem
                  emoji="✨"
                  days={3}
                  label="습관 시작"
                  achieved={currentStreak >= 3}
                  colors={colors}
                />
                <MilestoneItem
                  emoji="🔥"
                  days={7}
                  label="1주 연속"
                  achieved={currentStreak >= 7}
                  colors={colors}
                />
                <MilestoneItem
                  emoji="💎"
                  days={30}
                  label="1개월 연속"
                  achieved={currentStreak >= 30}
                  colors={colors}
                />
                <MilestoneItem
                  emoji="🏆"
                  days={100}
                  label="진정한 투자자"
                  achieved={currentStreak >= 100}
                  colors={colors}
                />
              </View>
            </View>

            {/* 하단 설명 */}
            <View style={[styles.infoBox, { backgroundColor: colors.primary + '0F', borderColor: colors.primary + '1A' }]}>
              <Text style={[styles.infoText, { color: colors.textTertiary }]}>
                매일 앱에 접속하면 연속 기록이 쌓입니다.{'\n'}
                하루라도 건너뛰면 1일부터 다시 시작됩니다.{'\n'}
                {'\u{1F6E1}\uFE0F'} 스트릭 보호권이 있으면 하루를 건너뛰어도 기록이 유지됩니다.
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
          {days}일
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
    fontSize: 14,
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
    fontSize: 18,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
  number: {
    fontSize: 16,
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
    fontSize: 11,
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
    fontSize: 18,
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
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  currentMessage: {
    fontSize: 13,
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
    fontSize: 18,
  },
  freezeTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  freezeCountLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  freezeDesc: {
    fontSize: 12,
    marginBottom: 4,
    lineHeight: 18,
  },
  freezeLastUsed: {
    fontSize: 11,
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
    fontSize: 13,
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
    fontSize: 13,
    fontWeight: '600',
  },
  longestNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  longestHint: {
    fontSize: 12,
  },

  // ─── 마일스톤 섹션 ───
  milestonesSection: {
    marginBottom: 24,
  },
  milestonesTitle: {
    fontSize: 16,
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
    fontSize: 24,
  },
  milestoneDisabled: {
    opacity: 0.3,
  },
  milestoneText: {
    flex: 1,
  },
  milestoneLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  milestoneDays: {
    fontSize: 12,
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
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
