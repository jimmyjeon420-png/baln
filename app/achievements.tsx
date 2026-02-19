/**
 * achievements.tsx - 나의 성취 & 감정 기록 화면
 *
 * 이승건 원칙: "가장 궁금한 것을 전면에"
 * → 오늘의 투자 감정 기록이 메인 컨텐츠
 * → 배지는 아래에 보조 역할
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAchievements } from '../src/hooks/useAchievements';
import { useStreak } from '../src/hooks/useStreak';
import { useMyPredictionStats } from '../src/hooks/usePredictions';
import { useTheme } from '../src/hooks/useTheme';
import { useEmotionCheck } from '../src/hooks/useEmotionCheck';
import { ACHIEVEMENT_REWARDS } from '../src/services/rewardService';
import type { AchievementWithStatus } from '../src/services/achievementService';

// ============================================================================
// 감정 상수
// ============================================================================

const EMOTIONS = [
  { key: 'anxious',   emoji: '😰', label: '불안',  color: '#FF5252', bgColor: '#FF525220' },
  { key: 'worried',   emoji: '😟', label: '걱정',  color: '#FF8A65', bgColor: '#FF8A6520' },
  { key: 'neutral',   emoji: '😐', label: '보통',  color: '#90A4AE', bgColor: '#90A4AE20' },
  { key: 'calm',      emoji: '😊', label: '안심',  color: '#4CAF50', bgColor: '#4CAF5020' },
  { key: 'confident', emoji: '🤑', label: '확신',  color: '#2196F3', bgColor: '#2196F320' },
];

function getEmotionFeedback(key: string): string {
  switch (key) {
    case 'anxious':   return '불안할 땐 매매를 쉬어가는 것도 전략이에요';
    case 'worried':   return '걱정될 때는 원칙을 다시 확인해보세요';
    case 'neutral':   return '차분한 마음이 좋은 결정을 만들어요';
    case 'calm':      return '안정된 마음으로 투자하고 계시네요';
    case 'confident': return '확신이 있을 때도 분산투자는 유지하세요';
    default: return '';
  }
}

function getTodayLabel(): string {
  const d = new Date();
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${weekdays[d.getDay()]}요일`;
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function AchievementsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const {
    achievements,
    unlockedCount,
    totalCount,
    newlyUnlocked,
    rewardCreditsEarned,
    clearNewlyUnlocked,
    checkAchievements,
  } = useAchievements();

  const { currentStreak } = useStreak();
  const { data: predictionStats } = useMyPredictionStats();

  const {
    todayEmotion,
    todayMemo,
    nasdaqClose,
    btcClose,
    setEmotion,
    setMemo,
    setNasdaqClose,
    setBtcClose,
    saveEmotionWithMemo,
    isChecked: todayIsChecked,
    rewardCredits,
  } = useEmotionCheck();

  const [isSaving, setIsSaving] = useState(false);
  const [showMarketInputs, setShowMarketInputs] = useState(false);

  // 축하 토스트 상태
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastOpacity] = useState(new Animated.Value(0));
  const [savedAnim] = useState(new Animated.Value(0));

  // 화면 진입 시 자동 해금 체크
  useEffect(() => {
    const autoCheck = async () => {
      await checkAchievements({
        currentStreak,
        predictionAccuracy: predictionStats?.accuracy_rate,
        predictionStreak: predictionStats?.current_streak,
        correctVotes: predictionStats?.correct_votes,
      });
    };
    if (currentStreak > 0 || predictionStats) {
      autoCheck();
    }
  }, [currentStreak, predictionStats]);

  // 새로 해금 시 토스트 표시
  useEffect(() => {
    if (newlyUnlocked.length > 0) {
      const newBadge = achievements.find(a => a.id === newlyUnlocked[0]);
      if (newBadge) {
        const reward = ACHIEVEMENT_REWARDS[newBadge.id] || 0;
        const rewardText = reward > 0 ? ` +${reward}C` : '';
        showToast(`${newBadge.emoji} ${newBadge.title} 배지 획득!${rewardText}`);
        triggerHaptic();
      }
      clearNewlyUnlocked();
    }
  }, [newlyUnlocked]);

  // 감정 저장 후 애니메이션
  useEffect(() => {
    if (rewardCredits > 0) {
      showToast(`감정 기록 완료! +${rewardCredits}C (₩${rewardCredits * 100})`);
      Animated.sequence([
        Animated.timing(savedAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.delay(1500),
        Animated.timing(savedAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [rewardCredits]);

  const showToast = (message: string) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(toastOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start(() => setToastMessage(null));
  };

  const triggerHaptic = async () => {
    try {
      const Haptics = require('expo-haptics');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { /* 무시 */ }
  };

  const handleSave = async () => {
    if (!todayEmotion || isSaving) return;
    setIsSaving(true);
    await saveEmotionWithMemo();
    setIsSaving(false);
  };

  const selectedEmotion = EMOTIONS.find(e => e.key === todayEmotion);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>나의 성취</Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>

          {/* ================================================================
              섹션 1: 오늘의 투자 감정 (메인 컨텐츠)
          ================================================================ */}
          <View style={[styles.emotionSection, { backgroundColor: colors.surface }]}>
            {/* 섹션 헤더 */}
            <View style={styles.emotionSectionHeader}>
              <View>
                <Text style={[styles.emotionSectionTitle, { color: colors.textPrimary }]}>
                  오늘의 투자 감정
                </Text>
                <Text style={[styles.emotionSectionDate, { color: colors.textTertiary }]}>
                  {getTodayLabel()}
                </Text>
              </View>
              {/* 히스토리 보기 링크 */}
              <TouchableOpacity
                style={styles.historyLink}
                onPress={() => router.push('/journal/emotion-history')}
              >
                <Text style={[styles.historyLinkText, { color: colors.primary }]}>히스토리</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {todayIsChecked && selectedEmotion ? (
              /* ── 이미 기록한 경우: 기록 결과 표시 ── */
              <View style={styles.checkedContainer}>
                <View style={[styles.checkedEmojiBubble, { backgroundColor: selectedEmotion.bgColor }]}>
                  <Text style={styles.checkedEmoji}>{selectedEmotion.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.checkedTopRow}>
                    <Text style={[styles.checkedLabel, { color: selectedEmotion.color }]}>
                      {selectedEmotion.label}
                    </Text>
                    <View style={styles.checkedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                      <Text style={styles.checkedBadgeText}>기록 완료</Text>
                    </View>
                  </View>
                  <Text style={[styles.checkedFeedback, { color: colors.textSecondary }]}>
                    {getEmotionFeedback(selectedEmotion.key)}
                  </Text>
                  {todayMemo ? (
                    <Text style={[styles.checkedMemo, { color: colors.textTertiary }]} numberOfLines={2}>
                      "{todayMemo}"
                    </Text>
                  ) : null}
                  {/* 종가 표시 */}
                  {(nasdaqClose !== undefined || btcClose !== undefined) && (
                    <View style={styles.checkedMarket}>
                      {nasdaqClose !== undefined && (
                        <Text style={styles.checkedMarketText}>
                          나스닥 {nasdaqClose.toLocaleString()}
                        </Text>
                      )}
                      {btcClose !== undefined && (
                        <Text style={styles.checkedMarketText}>
                          BTC ${btcClose.toLocaleString()}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
            ) : (
              /* ── 미기록: 감정 선택 + 입력 폼 ── */
              <View style={styles.inputArea}>
                {/* 보상 안내 */}
                <View style={styles.rewardHint}>
                  <Text style={styles.rewardHintText}>기록하면 +5C (₩500) 적립</Text>
                </View>

                {/* 감정 이모지 선택 */}
                <View style={styles.emotionRow}>
                  {EMOTIONS.map(e => (
                    <TouchableOpacity
                      key={e.key}
                      style={[
                        styles.emotionBtn,
                        todayEmotion === e.key && {
                          backgroundColor: e.bgColor,
                          borderColor: e.color,
                          borderWidth: 2,
                        },
                      ]}
                      onPress={() => setEmotion(e.key)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.emotionBtnEmoji}>{e.emoji}</Text>
                      <Text style={[
                        styles.emotionBtnLabel,
                        { color: todayEmotion === e.key ? e.color : colors.textSecondary },
                      ]}>
                        {e.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* 감정 선택 후 추가 입력 */}
                {todayEmotion && (
                  <View style={styles.detailInputs}>
                    {/* 감정 피드백 문구 */}
                    <Text style={[styles.feedbackText, { color: selectedEmotion?.color }]}>
                      {getEmotionFeedback(todayEmotion)}
                    </Text>

                    {/* 메모 입력 */}
                    <TextInput
                      style={[styles.memoInput, { color: colors.textPrimary, borderColor: colors.surfaceLight }]}
                      placeholder="오늘 투자 한 줄 일기 (선택)"
                      placeholderTextColor={colors.textTertiary}
                      value={todayMemo}
                      onChangeText={setMemo}
                      multiline
                      maxLength={100}
                    />

                    {/* 시장 종가 입력 토글 */}
                    <TouchableOpacity
                      style={styles.marketToggle}
                      onPress={() => setShowMarketInputs(v => !v)}
                    >
                      <Ionicons
                        name={showMarketInputs ? 'chevron-up' : 'chevron-down'}
                        size={14}
                        color={colors.textTertiary}
                      />
                      <Text style={[styles.marketToggleText, { color: colors.textTertiary }]}>
                        나스닥·BTC 종가 기록 (선택)
                      </Text>
                    </TouchableOpacity>

                    {showMarketInputs && (
                      <View style={styles.marketInputRow}>
                        <View style={styles.marketInputItem}>
                          <Text style={[styles.marketInputLabel, { color: colors.textTertiary }]}>
                            나스닥
                          </Text>
                          <TextInput
                            style={[styles.marketInput, { color: colors.textPrimary, borderColor: colors.surfaceLight }]}
                            placeholder="예: 19200"
                            placeholderTextColor={colors.textTertiary}
                            keyboardType="numeric"
                            value={nasdaqClose !== undefined ? String(nasdaqClose) : ''}
                            onChangeText={v => {
                              const n = v.replace(/[^0-9.]/g, '');
                              setNasdaqClose(n ? parseFloat(n) : undefined);
                            }}
                          />
                        </View>
                        <View style={styles.marketInputItem}>
                          <Text style={[styles.marketInputLabel, { color: colors.textTertiary }]}>
                            BTC ($)
                          </Text>
                          <TextInput
                            style={[styles.marketInput, { color: colors.textPrimary, borderColor: colors.surfaceLight }]}
                            placeholder="예: 95000"
                            placeholderTextColor={colors.textTertiary}
                            keyboardType="numeric"
                            value={btcClose !== undefined ? String(btcClose) : ''}
                            onChangeText={v => {
                              const n = v.replace(/[^0-9.]/g, '');
                              setBtcClose(n ? parseFloat(n) : undefined);
                            }}
                          />
                        </View>
                      </View>
                    )}

                    {/* 저장 버튼 */}
                    <TouchableOpacity
                      style={[styles.saveBtn, { backgroundColor: selectedEmotion?.color || colors.primary }]}
                      onPress={handleSave}
                      disabled={isSaving}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.saveBtnText}>
                        {isSaving ? '저장 중...' : '기록 저장하기'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* ================================================================
              섹션 2: 나의 배지
          ================================================================ */}
          <View style={styles.badgeSectionHeader}>
            <Text style={[styles.badgeSectionTitle, { color: colors.textPrimary }]}>나의 배지</Text>
            <Text style={[styles.badgeSectionCount, { color: colors.primary }]}>
              {unlockedCount}/{totalCount}
            </Text>
          </View>

          {/* 배지 그리드 (3열) */}
          <View style={styles.badgeGrid}>
            {achievements.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </View>

          {/* 배지 보상 안내 */}
          <View style={styles.rewardInfoCard}>
            <Ionicons name="diamond" size={18} color="#7C4DFF" />
            <View style={{ flex: 1 }}>
              <Text style={styles.rewardInfoTitle}>배지 보상</Text>
              <Text style={styles.rewardInfoDesc}>
                배지를 해금하면 크레딧을 받아요! 모두 모으면 총 128C (₩12,800)
              </Text>
            </View>
          </View>

          {/* 안내 문구 */}
          <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textTertiary} />
            <Text style={[styles.infoText, { color: colors.textTertiary }]}>
              배지는 앱 사용 활동에 따라 자동으로 해금됩니다.{'\n'}
              매일 방문하고, 예측에 참여하면 배지를 모을 수 있어요!
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 축하 토스트 */}
      {toastMessage && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// ============================================================================
// 배지 카드 컴포넌트
// ============================================================================

function BadgeCard({ badge }: { badge: AchievementWithStatus }) {
  const { colors } = useTheme();
  const isUnlocked = badge.isUnlocked;
  const reward = ACHIEVEMENT_REWARDS[badge.id] || 0;

  return (
    <View style={[styles.badgeCard, { backgroundColor: colors.surface }, !isUnlocked && styles.badgeCardLocked]}>
      {reward > 0 && (
        <View style={[styles.rewardBadge, isUnlocked && styles.rewardBadgeClaimed]}>
          <Text style={[styles.rewardBadgeText, isUnlocked && styles.rewardBadgeTextClaimed]}>
            {isUnlocked ? '✓' : `+${reward}C`}
          </Text>
        </View>
      )}
      <View style={styles.badgeEmojiContainer}>
        {isUnlocked ? (
          <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
        ) : (
          <View style={styles.lockIcon}>
            <Ionicons name="lock-closed" size={24} color="#555555" />
          </View>
        )}
      </View>
      <Text style={[styles.badgeTitle, { color: colors.textPrimary }, !isUnlocked && styles.badgeTitleLocked]}>
        {badge.title}
      </Text>
      <Text style={[styles.badgeDesc, !isUnlocked && styles.badgeDescLocked]} numberOfLines={2}>
        {isUnlocked ? badge.description : '???'}
      </Text>
      {isUnlocked && badge.unlockedDate && (
        <Text style={styles.badgeDate}>{badge.unlockedDate}</Text>
      )}
    </View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: { marginRight: 8, padding: 4 },
  title: { flex: 1, fontSize: 20, fontWeight: 'bold' },
  content: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },

  // ── 감정 섹션 ──
  emotionSection: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
  },
  emotionSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  emotionSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  emotionSectionDate: {
    fontSize: 13,
  },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingTop: 2,
  },
  historyLinkText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ── 이미 기록한 경우 ──
  checkedContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  checkedEmojiBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedEmoji: { fontSize: 36 },
  checkedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  checkedLabel: {
    fontSize: 20,
    fontWeight: '800',
  },
  checkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#4CAF5020',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  checkedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4CAF50',
  },
  checkedFeedback: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  checkedMemo: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
    marginBottom: 8,
  },
  checkedMarket: {
    flexDirection: 'row',
    gap: 12,
  },
  checkedMarketText: {
    fontSize: 11,
    color: '#888888',
    fontWeight: '600',
  },

  // ── 미기록: 입력 폼 ──
  inputArea: {},
  rewardHint: {
    alignSelf: 'flex-start',
    backgroundColor: '#4CAF5018',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 14,
  },
  rewardHintText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4CAF50',
  },
  emotionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  emotionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    marginHorizontal: 2,
    backgroundColor: '#FFFFFF08',
    borderWidth: 1,
    borderColor: '#FFFFFF10',
  },
  emotionBtnEmoji: { fontSize: 28, marginBottom: 4 },
  emotionBtnLabel: { fontSize: 11, fontWeight: '600' },
  detailInputs: { gap: 12 },
  feedbackText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  memoInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  marketToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  marketToggleText: { fontSize: 12 },
  marketInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  marketInputItem: { flex: 1 },
  marketInputLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  marketInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ── 배지 섹션 ──
  badgeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  badgeSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  badgeSectionCount: {
    fontSize: 14,
    fontWeight: '700',
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  badgeCard: {
    width: '30.5%',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    position: 'relative' as const,
  },
  badgeCardLocked: {
    opacity: 0.35,
    borderColor: '#1E1E1E',
  },
  rewardBadge: {
    position: 'absolute' as const,
    top: -6,
    right: -4,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 1,
  },
  rewardBadgeClaimed: { backgroundColor: '#333' },
  rewardBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  rewardBadgeTextClaimed: { color: '#4CAF50' },
  badgeEmojiContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeEmoji: { fontSize: 28 },
  lockIcon: { justifyContent: 'center', alignItems: 'center' },
  badgeTitle: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeTitleLocked: { color: '#666666' },
  badgeDesc: {
    fontSize: 10,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 14,
  },
  badgeDescLocked: { color: '#444444' },
  badgeDate: {
    fontSize: 9,
    color: '#4CAF50',
    marginTop: 6,
    fontWeight: '600',
  },
  rewardInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(124, 77, 255, 0.08)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(124, 77, 255, 0.2)',
  },
  rewardInfoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B39DDB',
    marginBottom: 2,
  },
  rewardInfoDesc: {
    fontSize: 12,
    color: '#888888',
    lineHeight: 18,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    padding: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  toast: {
    position: 'absolute',
    top: 100,
    left: 24,
    right: 24,
    backgroundColor: '#4CAF50',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  toastText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
});
