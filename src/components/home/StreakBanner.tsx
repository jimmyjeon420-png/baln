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
 * 비즈니스 효과:
 * - 연속 기록 시각화 → 매일 방문 동기 부여
 * - 손실 회피 심리 → "127일을 잃기 싫어서" 매일 접속
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useStreak } from '../../hooks/useStreak';
import { useHaptics } from '../../hooks/useHaptics';
import { useTheme } from '../../hooks/useTheme';

export default function StreakBanner() {
  const { currentStreak, longestStreak, streakMessage, isLoading } = useStreak();
  const { mediumTap } = useHaptics();
  const { colors } = useTheme();
  const [showModal, setShowModal] = useState(false);

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
                하루라도 건너뛰면 1일부터 다시 시작됩니다.
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
