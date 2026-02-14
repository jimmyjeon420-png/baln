/**
 * EmotionHistory - 투자 감정 히스토리 + 감정 기록
 *
 * 워렌 버핏: "감정 일기를 쓰면, 공포 때 판 걸 나중에 후회하게 된다. 좋은 교육이다."
 *
 * 기능:
 * - 오늘의 감정 기록 (이모지 5개 + 메모 30자 + 기록하기 버튼)
 * - 이미 기록한 경우 기록된 감정 하이라이트 표시
 * - 기록 후 보상 토스트 (+5C)
 * - 최근 30일 감정 그래프 (가로 스크롤)
 * - 각 날짜 클릭 시 메모 상세 보기
 * - "한 달 전 당신은..." 리마인더
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useEmotionHistory } from '../../src/hooks/useEmotionHistory';
import { useEmotionCheck } from '../../src/hooks/useEmotionCheck';
import { useTheme } from '../../src/hooks/useTheme';
import { SIZES } from '../../src/styles/theme';
import type { EmotionEntry } from '../../src/hooks/useEmotionCheck';

// 감정 이모지 매핑
const EMOTION_MAP: Record<string, { emoji: string; label: string }> = {
  anxious: { emoji: '😰', label: '불안' },
  worried: { emoji: '😟', label: '걱정' },
  neutral: { emoji: '😐', label: '보통' },
  calm: { emoji: '😊', label: '안심' },
  confident: { emoji: '🤑', label: '확신' },
};

// 감정별 짧은 피드백
function getEmotionFeedback(key: string): string {
  switch (key) {
    case 'anxious': return '불안할 땐 매매를 쉬어가는 것도 전략이에요';
    case 'worried': return '걱정될 때는 원칙을 다시 확인해보세요';
    case 'neutral': return '차분한 마음이 좋은 결정을 만들어요';
    case 'calm': return '안정된 마음으로 투자하고 계시네요';
    case 'confident': return '확신이 있을 때도 분산투자는 유지하세요';
    default: return '';
  }
}

export default function EmotionHistoryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { last30Days, reminderText, isLoading, refresh } = useEmotionHistory();
  const {
    todayEmotion,
    todayMemo,
    setEmotion,
    setMemo,
    saveEmotionWithMemo,
    isChecked: todayIsChecked,
    rewardCredits,
  } = useEmotionCheck();
  const [selectedDay, setSelectedDay] = useState<EmotionEntry | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  // isSaved: 오늘 감정이 실제로 저장된 상태인지 추적
  // - useEmotionCheck의 isChecked는 todayEmotion !== null 이라 선택만 해도 true
  // - isSaved는 초기 로드 시 이미 기록되어 있거나, 이 화면에서 저장 완료 시만 true
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 보상 토스트 애니메이션
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // 초기 로드: todayEmotion과 todayMemo가 동시에 존재하면 이미 저장된 것
  // useEmotionCheck 훅이 AsyncStorage에서 로드 완료하면 todayEmotion이 설정됨
  useEffect(() => {
    if (todayIsChecked && todayEmotion && !isSaving) {
      // 이미 저장된 감정이 있으면 saved 상태로 설정
      setIsSaved(true);
    }
  }, [todayIsChecked, todayEmotion, isSaving]);

  // 보상 토스트 애니메이션
  useEffect(() => {
    if (rewardCredits > 0) {
      Animated.sequence([
        Animated.timing(toastOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2400),
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [rewardCredits, toastOpacity]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // 감정 저장 핸들러
  const handleSave = async () => {
    if (!todayEmotion) return;
    setIsSaving(true);
    try {
      await saveEmotionWithMemo();
      setIsSaved(true);
      refresh(); // 히스토리 새로고침
    } finally {
      setIsSaving(false);
    }
  };

  // 다시 기록하기 (이미 기록된 감정을 수정)
  const handleReRecord = () => {
    setIsSaved(false);
  };

  // 날짜 포맷 (MM/DD)
  const formatDate = (dateStr: string) => {
    const [, month, day] = dateStr.split('-');
    return `${month}/${day}`;
  };

  // 요일 가져오기
  const getWeekday = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return weekdays[date.getDay()];
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 헤더 */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>
          투자 감정 히스토리
        </Text>
        <View style={s.headerRight} />
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* ===== 오늘의 감정 기록 섹션 (항상 표시) ===== */}
        <View style={[s.todayInputCard, { backgroundColor: colors.surface, borderColor: `${colors.primary}33` }]}>
          {/* 카드 헤더 */}
          <View style={s.todayInputHeader}>
            <Ionicons name="heart" size={18} color={colors.primary} />
            <Text style={[s.todayInputTitle, { color: colors.textPrimary }]}>
              {isSaved ? '오늘의 투자 감정' : '오늘의 투자 감정을 기록하세요'}
            </Text>
            {isSaved ? (
              <View style={[s.todayRewardBadge, { backgroundColor: `${colors.primary}1F` }]}>
                <Text style={[s.todayRewardText, { color: colors.primary }]}>기록됨</Text>
              </View>
            ) : (
              <View style={[s.todayRewardBadge, { backgroundColor: `${colors.primary}1F` }]}>
                <Text style={[s.todayRewardText, { color: colors.primary }]}>+5C</Text>
              </View>
            )}
          </View>

          {/* --- 이미 기록된 상태: 하이라이트 요약 --- */}
          {isSaved && todayEmotion ? (
            <View>
              {/* 기록된 이모지 하이라이트 표시 */}
              <View style={s.todayEmotionRow}>
                {Object.entries(EMOTION_MAP).map(([key, { emoji, label }]) => {
                  const isRecorded = todayEmotion === key;
                  return (
                    <View
                      key={key}
                      style={[
                        s.todayEmotionBtn,
                        { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                        isRecorded && {
                          backgroundColor: `${colors.primary}1F`,
                          borderColor: colors.primary,
                          borderWidth: 2,
                        },
                        !isRecorded && { opacity: 0.4 },
                      ]}
                    >
                      <Text style={[s.todayEmotionEmoji, isRecorded && { fontSize: 28 }]}>{emoji}</Text>
                      <Text style={[
                        s.todayEmotionLabel,
                        { color: colors.textSecondary },
                        isRecorded && { color: colors.primary, fontWeight: '700' as const },
                      ]}>{label}</Text>
                    </View>
                  );
                })}
              </View>

              {/* 기록된 메모 표시 */}
              {todayMemo ? (
                <View style={[s.savedMemoBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Ionicons name="chatbubble-outline" size={14} color={colors.textTertiary} />
                  <Text style={[s.savedMemoText, { color: colors.textSecondary }]}>
                    {todayMemo}
                  </Text>
                </View>
              ) : null}

              {/* 감정 피드백 */}
              <View style={[s.feedbackBox, { backgroundColor: `${colors.primary}0D` }]}>
                <Text style={[s.feedbackText, { color: colors.textSecondary }]}>
                  {EMOTION_MAP[todayEmotion]?.emoji} {getEmotionFeedback(todayEmotion)}
                </Text>
              </View>

              {/* 다시 기록하기 버튼 */}
              <TouchableOpacity
                style={s.reRecordBtn}
                onPress={handleReRecord}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={14} color={colors.textTertiary} />
                <Text style={[s.reRecordText, { color: colors.textTertiary }]}>
                  다시 기록하기
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* --- 미기록 상태: 감정 선택 + 메모 + 저장 --- */
            <View>
              {/* 이모지 선택 */}
              <View style={s.todayEmotionRow}>
                {Object.entries(EMOTION_MAP).map(([key, { emoji, label }]) => {
                  const isSelected = todayEmotion === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        s.todayEmotionBtn,
                        { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                        isSelected && { backgroundColor: `${colors.primary}1F`, borderColor: `${colors.primary}4D` },
                      ]}
                      onPress={() => setEmotion(key)}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.todayEmotionEmoji, isSelected && { fontSize: 28 }]}>{emoji}</Text>
                      <Text style={[
                        s.todayEmotionLabel,
                        { color: colors.textSecondary },
                        isSelected && { color: colors.primary, fontWeight: '700' as const },
                      ]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 메모 + 저장 (감정 선택 시) */}
              {todayEmotion && (
                <View style={s.todayMemoSection}>
                  <TextInput
                    style={[s.todayMemoInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder="오늘 왜 이런 감정이었나요? (30자)"
                    placeholderTextColor={colors.textTertiary}
                    maxLength={30}
                    value={todayMemo}
                    onChangeText={setMemo}
                  />
                  <TouchableOpacity
                    style={[
                      s.todaySaveBtn,
                      { backgroundColor: colors.primary },
                      isSaving && { opacity: 0.6 },
                    ]}
                    onPress={handleSave}
                    activeOpacity={0.7}
                    disabled={isSaving}
                  >
                    <Text style={s.todaySaveBtnText}>
                      {isSaving ? '저장 중...' : '기록하기 +5C'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* 보상 토스트 (애니메이션) */}
        {rewardCredits > 0 && (
          <Animated.View
            style={[
              s.rewardToast,
              { backgroundColor: `${colors.primary}1F`, borderColor: `${colors.primary}33`, opacity: toastOpacity },
            ]}
          >
            <Text style={[s.rewardToastText, { color: colors.primary }]}>
              감정 기록 보상 +{rewardCredits}C 적립!
            </Text>
          </Animated.View>
        )}

        {/* 리마인더 카드 */}
        {reminderText && (
          <View style={[s.reminderCard, { backgroundColor: colors.surface }]}>
            <Text style={[s.reminderText, { color: colors.textPrimary }]}>
              {reminderText}
            </Text>
          </View>
        )}

        {/* 설명 */}
        <View style={s.introSection}>
          <Text style={[s.introTitle, { color: colors.textPrimary }]}>
            내 투자 감정 기록
          </Text>
          <Text style={[s.introDescription, { color: colors.textSecondary }]}>
            매일 감정을 기록하면 패닉셀과 FOMO 매수를 방지할 수 있어요.
            감정의 패턴을 인식하는 것이 첫 번째 단계입니다.
          </Text>
        </View>

        {/* 30일 그래프 */}
        <View style={s.graphSection}>
          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>
            최근 30일
          </Text>

          {last30Days.length === 0 ? (
            <View style={[s.emptyCard, { backgroundColor: colors.surface }]}>
              <Text style={[s.emptyText, { color: colors.textSecondary }]}>
                아직 기록된 감정이 없어요.
                {'\n'}
                분석 탭에서 감정을 기록해보세요!
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.graphScroll}
            >
              {last30Days.map((entry, index) => {
                const isSelected = selectedDay?.date === entry.date;
                const emotionData = EMOTION_MAP[entry.emotion] || EMOTION_MAP.neutral;

                return (
                  <TouchableOpacity
                    key={`${entry.date}-${index}`}
                    style={[
                      s.dayCard,
                      { backgroundColor: colors.surface },
                      isSelected && { borderColor: colors.primary, borderWidth: 2 },
                    ]}
                    onPress={() => setSelectedDay(entry)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.dayEmoji}>{emotionData.emoji}</Text>
                    <Text style={[s.dayDate, { color: colors.textSecondary }]}>
                      {formatDate(entry.date)}
                    </Text>
                    <Text style={[s.dayWeekday, { color: colors.textTertiary }]}>
                      {getWeekday(entry.date)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* 선택한 날짜 상세 */}
        {selectedDay && (
          <View style={s.detailSection}>
            <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>
              상세 내용
            </Text>
            <View style={[s.detailCard, { backgroundColor: colors.surface }]}>
              <View style={s.detailHeader}>
                <Text style={s.detailEmoji}>
                  {EMOTION_MAP[selectedDay.emotion]?.emoji || '😐'}
                </Text>
                <View style={s.detailInfo}>
                  <Text style={[s.detailLabel, { color: colors.textPrimary }]}>
                    {EMOTION_MAP[selectedDay.emotion]?.label || '보통'}
                  </Text>
                  <Text style={[s.detailDate, { color: colors.textSecondary }]}>
                    {selectedDay.date} ({getWeekday(selectedDay.date)})
                  </Text>
                </View>
              </View>

              {selectedDay.memo && (
                <View style={[s.memoBox, { backgroundColor: colors.surfaceLight }]}>
                  <Text style={[s.memoLabel, { color: colors.textTertiary }]}>
                    메모
                  </Text>
                  <Text style={[s.memoText, { color: colors.textPrimary }]}>
                    {selectedDay.memo}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* 워렌 버핏 명언 */}
        <View style={[s.quoteCard, { backgroundColor: colors.surface }]}>
          <Text style={[s.quoteIcon, { color: colors.primary }]}>💭</Text>
          <Text style={[s.quoteText, { color: colors.textSecondary }]}>
            "감정 일기를 쓰면, 공포 때 판 걸 나중에 후회하게 된다. 좋은 교육이다."
          </Text>
          <Text style={[s.quoteAuthor, { color: colors.textTertiary }]}>
            — 워렌 버핏
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.xl,
    paddingVertical: SIZES.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: SIZES.fLg,
    fontWeight: '700',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SIZES.xl,
    paddingBottom: 120,
  },

  // 오늘 감정 입력 카드
  todayInputCard: {
    borderRadius: SIZES.card.borderRadius,
    padding: SIZES.card.padding,
    marginBottom: SIZES.xxl,
    borderWidth: 1,
  },
  todayInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  todayInputTitle: {
    flex: 1,
    fontSize: SIZES.fBase,
    fontWeight: '700',
  },
  todayRewardBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  todayRewardText: {
    fontSize: 12,
    fontWeight: '800',
  },
  todayEmotionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  todayEmotionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  todayEmotionEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  todayEmotionLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  todayMemoSection: {
    marginTop: 14,
    gap: 10,
  },
  todayMemoInput: {
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
  },
  todaySaveBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  todaySaveBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // 기록 완료 상태 스타일
  savedMemoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  savedMemoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  feedbackBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
  },
  feedbackText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  reRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
    paddingVertical: 6,
  },
  reRecordText: {
    fontSize: 12,
    fontWeight: '500',
  },

  rewardToast: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: SIZES.xxl,
    borderWidth: 1,
  },
  rewardToastText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // 리마인더 카드
  reminderCard: {
    borderRadius: SIZES.card.borderRadius,
    padding: SIZES.card.padding,
    marginBottom: SIZES.xxl,
  },
  reminderText: {
    fontSize: SIZES.fBase,
    lineHeight: 24,
  },

  // 인트로
  introSection: {
    marginBottom: SIZES.xxl,
  },
  introTitle: {
    fontSize: SIZES.fXl,
    fontWeight: '700',
    marginBottom: SIZES.sm,
  },
  introDescription: {
    fontSize: SIZES.fSm,
    lineHeight: 20,
  },

  // 그래프 섹션
  graphSection: {
    marginBottom: SIZES.xxl,
  },
  sectionTitle: {
    fontSize: SIZES.fLg,
    fontWeight: '600',
    marginBottom: SIZES.md,
  },
  graphScroll: {
    paddingVertical: SIZES.sm,
  },
  dayCard: {
    width: 80,
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.sm,
    borderRadius: 12,
    marginRight: SIZES.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayEmoji: {
    fontSize: 32,
    marginBottom: SIZES.xs,
  },
  dayDate: {
    fontSize: SIZES.fSm,
    fontWeight: '600',
    marginBottom: 2,
  },
  dayWeekday: {
    fontSize: SIZES.fTiny,
  },

  // 빈 상태
  emptyCard: {
    borderRadius: SIZES.card.borderRadius,
    padding: SIZES.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: SIZES.fSm,
    textAlign: 'center',
    lineHeight: 20,
  },

  // 상세 섹션
  detailSection: {
    marginBottom: SIZES.xxl,
  },
  detailCard: {
    borderRadius: SIZES.card.borderRadius,
    padding: SIZES.card.padding,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  detailEmoji: {
    fontSize: 48,
    marginRight: SIZES.md,
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    fontSize: SIZES.fXl,
    fontWeight: '700',
    marginBottom: 4,
  },
  detailDate: {
    fontSize: SIZES.fSm,
  },
  memoBox: {
    borderRadius: 8,
    padding: SIZES.md,
    marginTop: SIZES.sm,
  },
  memoLabel: {
    fontSize: SIZES.fXs,
    fontWeight: '600',
    marginBottom: SIZES.xs,
    textTransform: 'uppercase',
  },
  memoText: {
    fontSize: SIZES.fBase,
    lineHeight: 22,
  },

  // 명언 카드
  quoteCard: {
    borderRadius: SIZES.card.borderRadius,
    padding: SIZES.card.padding,
    alignItems: 'center',
    marginBottom: SIZES.xxl,
  },
  quoteIcon: {
    fontSize: 32,
    marginBottom: SIZES.md,
  },
  quoteText: {
    fontSize: SIZES.fSm,
    lineHeight: 22,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: SIZES.sm,
  },
  quoteAuthor: {
    fontSize: SIZES.fXs,
    textAlign: 'center',
  },
});
