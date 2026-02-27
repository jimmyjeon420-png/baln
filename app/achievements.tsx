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
import { useLocale } from '../src/context/LocaleContext';
import { ACHIEVEMENT_REWARDS } from '../src/services/rewardService';
import type { AchievementWithStatus } from '../src/services/achievementService';

// ============================================================================
// 감정 상수 (keys only — labels come from t())
// ============================================================================

const EMOTION_KEYS = [
  { key: 'anxious',   emoji: '😰', color: '#FF5252', bgColor: '#FF525220', tKey: 'emotion_anxious',   fbKey: 'feedback_anxious' },
  { key: 'worried',   emoji: '😟', color: '#FF8A65', bgColor: '#FF8A6520', tKey: 'emotion_worried',   fbKey: 'feedback_worried' },
  { key: 'neutral',   emoji: '😐', color: '#90A4AE', bgColor: '#90A4AE20', tKey: 'emotion_neutral',   fbKey: 'feedback_neutral' },
  { key: 'calm',      emoji: '😊', color: '#4CAF50', bgColor: '#4CAF5020', tKey: 'emotion_calm',      fbKey: 'feedback_calm' },
  { key: 'confident', emoji: '🤑', color: '#2196F3', bgColor: '#2196F320', tKey: 'emotion_confident', fbKey: 'feedback_confident' },
];

function getTodayLabel(t: (key: string) => string): string {
  const d = new Date();
  const weekdayKeys = [
    'achievements.weekday_sun',
    'achievements.weekday_mon',
    'achievements.weekday_tue',
    'achievements.weekday_wed',
    'achievements.weekday_thu',
    'achievements.weekday_fri',
    'achievements.weekday_sat',
  ];
  const weekday = t(weekdayKeys[d.getDay()]);
  // Use locale-appropriate date format
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' }) + ' ' + weekday;
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function AchievementsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLocale();
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
        const rewardText = reward > 0 ? ` +${reward}개` : '';
        showToast(`${newBadge.emoji} ${newBadge.title} ${t('achievements.badge_section_title')}!${rewardText}`);
        triggerHaptic();
      }
      clearNewlyUnlocked();
    }
  }, [newlyUnlocked]);

  // 감정 저장 후 애니메이션
  useEffect(() => {
    if (rewardCredits > 0) {
      showToast(
        t('achievements.toast_emotion_saved')
          .replace('{{credits}}', String(rewardCredits))
          .replace('{{krw}}', String(rewardCredits * 100))
      );
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

  const selectedEmotionDef = EMOTION_KEYS.find(e => e.key === todayEmotion);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('achievements.title')}</Text>
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
                  {t('achievements.emotion_section_title')}
                </Text>
                <Text style={[styles.emotionSectionDate, { color: colors.textTertiary }]}>
                  {getTodayLabel(t)}
                </Text>
              </View>
              {/* 히스토리 보기 링크 */}
              <TouchableOpacity
                style={styles.historyLink}
                onPress={() => router.push('/journal/emotion-history')}
              >
                <Text style={[styles.historyLinkText, { color: colors.primary }]}>{t('achievements.history_link')}</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {todayIsChecked && selectedEmotionDef ? (
              /* ── 이미 기록한 경우: 기록 결과 표시 ── */
              <View style={styles.checkedContainer}>
                <View style={[styles.checkedEmojiBubble, { backgroundColor: selectedEmotionDef.bgColor }]}>
                  <Text style={styles.checkedEmoji}>{selectedEmotionDef.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.checkedTopRow}>
                    <Text style={[styles.checkedLabel, { color: selectedEmotionDef.color }]}>
                      {t(`achievements.${selectedEmotionDef.tKey}`)}
                    </Text>
                    <View style={styles.checkedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                      <Text style={styles.checkedBadgeText}>{t('achievements.emotion_recorded')}</Text>
                    </View>
                  </View>
                  <Text style={[styles.checkedFeedback, { color: colors.textSecondary }]}>
                    {t(`achievements.${selectedEmotionDef.fbKey}`)}
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
                          {t('achievements.nasdaq_label')} {nasdaqClose.toLocaleString()}
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
                  <Text style={styles.rewardHintText}>{t('achievements.reward_hint')}</Text>
                </View>

                {/* 감정 이모지 선택 */}
                <View style={styles.emotionRow}>
                  {EMOTION_KEYS.map(e => (
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
                        {t(`achievements.${e.tKey}`)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* 감정 선택 후 추가 입력 */}
                {todayEmotion && selectedEmotionDef && (
                  <View style={styles.detailInputs}>
                    {/* 감정 피드백 문구 */}
                    <Text style={[styles.feedbackText, { color: selectedEmotionDef.color }]}>
                      {t(`achievements.${selectedEmotionDef.fbKey}`)}
                    </Text>

                    {/* 메모 입력 */}
                    <TextInput
                      style={[styles.memoInput, { color: colors.textPrimary, borderColor: colors.surfaceLight }]}
                      placeholder={t('achievements.memo_placeholder')}
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
                        {t('achievements.market_toggle')}
                      </Text>
                    </TouchableOpacity>

                    {showMarketInputs && (
                      <View style={styles.marketInputRow}>
                        <View style={styles.marketInputItem}>
                          <Text style={[styles.marketInputLabel, { color: colors.textTertiary }]}>
                            {t('achievements.nasdaq_label')}
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
                            {t('achievements.btc_label')}
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
                      style={[styles.saveBtn, { backgroundColor: selectedEmotionDef.color || colors.primary }]}
                      onPress={handleSave}
                      disabled={isSaving}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.saveBtnText}>
                        {isSaving ? t('achievements.saving_btn') : t('achievements.save_btn')}
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
            <Text style={[styles.badgeSectionTitle, { color: colors.textPrimary }]}>{t('achievements.badge_section_title')}</Text>
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
            <Text style={{ fontSize: 36 }}>🌰</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.rewardInfoTitle}>{t('achievements.reward_info_title')}</Text>
              <Text style={styles.rewardInfoDesc}>
                {t('achievements.reward_info_desc')}
              </Text>
            </View>
          </View>

          {/* 안내 문구 */}
          <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textTertiary} />
            <Text style={[styles.infoText, { color: colors.textTertiary }]}>
              {t('achievements.info_text')}
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
            {isUnlocked ? '✓' : `+${reward}개`}
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
  title: { flex: 1, fontSize: 21, fontWeight: 'bold' },
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
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 2,
  },
  emotionSectionDate: {
    fontSize: 14,
  },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingTop: 2,
  },
  historyLinkText: {
    fontSize: 14,
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
    fontSize: 21,
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
    fontSize: 12,
    fontWeight: '700',
    color: '#4CAF50',
  },
  checkedFeedback: {
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 6,
  },
  checkedMemo: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 17,
    marginBottom: 8,
  },
  checkedMarket: {
    flexDirection: 'row',
    gap: 12,
  },
  checkedMarketText: {
    fontSize: 12,
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
    fontSize: 13,
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
  emotionBtnEmoji: { fontSize: 29, marginBottom: 4 },
  emotionBtnLabel: { fontSize: 12, fontWeight: '600' },
  detailInputs: { gap: 12 },
  feedbackText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  memoInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  marketToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  marketToggleText: { fontSize: 13 },
  marketInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  marketInputItem: { flex: 1 },
  marketInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  marketInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 15,
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: {
    fontSize: 16,
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
    fontSize: 17,
    fontWeight: '800',
  },
  badgeSectionCount: {
    fontSize: 15,
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
    fontSize: 10,
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
  badgeEmoji: { fontSize: 29 },
  lockIcon: { justifyContent: 'center', alignItems: 'center' },
  badgeTitle: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeTitleLocked: { color: '#666666' },
  badgeDesc: {
    fontSize: 11,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 15,
  },
  badgeDescLocked: { color: '#444444' },
  badgeDate: {
    fontSize: 10,
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
    fontSize: 15,
    fontWeight: '700',
    color: '#B39DDB',
    marginBottom: 2,
  },
  rewardInfoDesc: {
    fontSize: 13,
    color: '#888888',
    lineHeight: 19,
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
    fontSize: 13,
    lineHeight: 19,
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
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
});
