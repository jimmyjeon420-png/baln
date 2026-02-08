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

export default function StreakBanner() {
  const { currentStreak, longestStreak, streakMessage, isLoading } = useStreak();
  const { mediumTap } = useHaptics();
  const [showModal, setShowModal] = useState(false);

  // 로딩 중이면 표시 안 함
  if (isLoading || currentStreak === 0) {
    return null;
  }

  // 마일스톤 여부 (7일 마다)
  const isMilestone = currentStreak >= 7 && currentStreak % 7 === 0;

  // 배경 색상 (마일스톤이면 그라데이션)
  const gradientColors = isMilestone
    ? ['rgba(76, 175, 80, 0.25)', 'rgba(76, 175, 80, 0.05)']
    : ['rgba(76, 175, 80, 0.15)', 'rgba(76, 175, 80, 0)'];

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
          style={styles.banner}
        >
          <View style={styles.left}>
            <Text style={styles.emoji}>{streakMessage.emoji}</Text>
            <Text style={styles.text}>
              <Text style={styles.number}>{currentStreak}일</Text> 연속 방문 중
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#4CAF50" />
        </LinearGradient>
      </TouchableOpacity>

      {/* 상세 모달 */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>연속 기록</Text>
            <TouchableOpacity
              onPress={() => {
                mediumTap();
                setShowModal(false);
              }}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#888888" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* 현재 스트릭 */}
            <LinearGradient
              colors={['rgba(76, 175, 80, 0.2)', 'rgba(76, 175, 80, 0.05)']}
              style={styles.currentCard}
            >
              <Text style={styles.currentEmoji}>{streakMessage.emoji}</Text>
              <Text style={styles.currentNumber}>{currentStreak}일</Text>
              <Text style={styles.currentLabel}>연속 방문 중</Text>
              <Text style={styles.currentMessage}>{streakMessage.message}</Text>
            </LinearGradient>

            {/* 역대 최장 기록 */}
            {longestStreak > currentStreak && (
              <View style={styles.longestCard}>
                <View style={styles.longestRow}>
                  <Text style={styles.longestLabel}>역대 최장 기록</Text>
                  <Text style={styles.longestNumber}>🏆 {longestStreak}일</Text>
                </View>
                <Text style={styles.longestHint}>
                  {longestStreak - currentStreak}일만 더 가면 자기 기록 경신!
                </Text>
              </View>
            )}

            {longestStreak === currentStreak && currentStreak > 1 && (
              <View style={styles.longestCard}>
                <View style={styles.longestRow}>
                  <Text style={styles.longestLabel}>역대 최장 기록</Text>
                  <Text style={styles.longestNumber}>🏆 {longestStreak}일</Text>
                </View>
                <Text style={styles.longestHint}>자기 기록 갱신 중!</Text>
              </View>
            )}

            {/* 마일스톤 목록 */}
            <View style={styles.milestonesSection}>
              <Text style={styles.milestonesTitle}>마일스톤</Text>
              <View style={styles.milestonesList}>
                <MilestoneItem
                  emoji="🌱"
                  days={1}
                  label="첫 방문"
                  achieved={currentStreak >= 1}
                />
                <MilestoneItem
                  emoji="✨"
                  days={3}
                  label="습관 시작"
                  achieved={currentStreak >= 3}
                />
                <MilestoneItem
                  emoji="🔥"
                  days={7}
                  label="1주 연속"
                  achieved={currentStreak >= 7}
                />
                <MilestoneItem
                  emoji="💎"
                  days={30}
                  label="1개월 연속"
                  achieved={currentStreak >= 30}
                />
                <MilestoneItem
                  emoji="🏆"
                  days={100}
                  label="진정한 투자자"
                  achieved={currentStreak >= 100}
                />
              </View>
            </View>

            {/* 하단 설명 */}
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
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
}: {
  emoji: string;
  days: number;
  label: string;
  achieved: boolean;
}) {
  return (
    <View style={[styles.milestoneItem, achieved && styles.milestoneAchieved]}>
      <Text style={[styles.milestoneEmoji, !achieved && styles.milestoneDisabled]}>
        {emoji}
      </Text>
      <View style={styles.milestoneText}>
        <Text style={[styles.milestoneLabel, !achieved && styles.milestoneDisabled]}>
          {label}
        </Text>
        <Text style={[styles.milestoneDays, !achieved && styles.milestoneDisabled]}>
          {days}일
        </Text>
      </View>
      {achieved && (
        <View style={styles.milestoneCheck}>
          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
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
    borderColor: 'rgba(76, 175, 80, 0.2)',
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
    color: '#CCCCCC',
    fontWeight: '500',
  },
  number: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '700',
  },

  // ─── 모달 ───
  modalContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
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
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  currentEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  currentNumber: {
    fontSize: 42,
    fontWeight: '900',
    color: '#4CAF50',
  },
  currentLabel: {
    fontSize: 14,
    color: '#CCCCCC',
    marginTop: 4,
    fontWeight: '500',
  },
  currentMessage: {
    fontSize: 13,
    color: '#888888',
    marginTop: 12,
    textAlign: 'center',
  },

  // ─── 역대 최장 기록 ───
  longestCard: {
    backgroundColor: 'rgba(255, 193, 7, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.2)',
  },
  longestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  longestLabel: {
    fontSize: 13,
    color: '#CCCCCC',
    fontWeight: '600',
  },
  longestNumber: {
    fontSize: 18,
    color: '#FFC107',
    fontWeight: '700',
  },
  longestHint: {
    fontSize: 12,
    color: '#888888',
  },

  // ─── 마일스톤 섹션 ───
  milestonesSection: {
    marginBottom: 24,
  },
  milestonesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  milestonesList: {
    gap: 10,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  milestoneAchieved: {
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    borderColor: 'rgba(76, 175, 80, 0.2)',
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
    color: '#FFFFFF',
  },
  milestoneDays: {
    fontSize: 12,
    color: '#888888',
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
    backgroundColor: 'rgba(76, 175, 80, 0.06)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.1)',
  },
  infoText: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 18,
  },
});
