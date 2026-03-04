/**
 * EmotionHistory — 투자 감정 기록 + 월별 히트맵 캘린더
 *
 * 이승건 원칙:
 * 1. 감정 기록 최상단 (결론 먼저)
 * 2. 나스닥·BTC 종가 직접 입력 (자동화 금지 — 마찰이 교육)
 * 3. 월별 컬러 히트맵 → 패턴 발견 → 패닉셀 방지의 실체 증거
 * 4. "내가 불안했던 날의 나스닥은 얼마였나?" → 자기 기준 형성
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useEmotionHistory } from '../../src/hooks/useEmotionHistory';
import { useEmotionCheck, type EmotionEntry } from '../../src/hooks/useEmotionCheck';
import { useTheme } from '../../src/hooks/useTheme';
import { useLocale } from '../../src/context/LocaleContext';
import { SIZES } from '../../src/styles/theme';

// ============================================================================
// 상수
// ============================================================================

const EMOTION_MAP: Record<string, { emoji: string; tKey: string }> = {
  anxious:   { emoji: '😰', tKey: 'emotionHistory.emotion.anxious' },
  worried:   { emoji: '😟', tKey: 'emotionHistory.emotion.worried' },
  neutral:   { emoji: '😐', tKey: 'emotionHistory.emotion.neutral' },
  calm:      { emoji: '😊', tKey: 'emotionHistory.emotion.calm' },
  confident: { emoji: '🤑', tKey: 'emotionHistory.emotion.confident' },
};

// 감정별 컬러 (히트맵용)
const EMOTION_COLORS: Record<string, string> = {
  anxious:   '#FF5252',
  worried:   '#FF8A65',
  neutral:   '#90A4AE',
  calm:      '#4CAF50',
  confident: '#2196F3',
};

const WEEKDAY_KEYS = [
  'emotionHistory.weekday.sun',
  'emotionHistory.weekday.mon',
  'emotionHistory.weekday.tue',
  'emotionHistory.weekday.wed',
  'emotionHistory.weekday.thu',
  'emotionHistory.weekday.fri',
  'emotionHistory.weekday.sat',
];

// ============================================================================
// 유틸
// ============================================================================

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getWeekday(dateStr: string, t: (key: string) => string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return t(WEEKDAY_KEYS[new Date(year, month - 1, day).getDay()]);
}

const EMOTION_FEEDBACK_KEYS: Record<string, string> = {
  anxious:   'emotionHistory.feedback.anxious',
  worried:   'emotionHistory.feedback.worried',
  neutral:   'emotionHistory.feedback.neutral',
  calm:      'emotionHistory.feedback.calm',
  confident: 'emotionHistory.feedback.confident',
};

function getEmotionFeedback(key: string, t: (k: string) => string): string {
  const tKey = EMOTION_FEEDBACK_KEYS[key];
  return tKey ? t(tKey) : '';
}

/** 월별 달력 그리드 생성. null = 빈 칸, string = 'YYYY-MM-DD' */
function getMonthGrid(year: number, month: number): (string | null)[][] {
  const firstWeekday = new Date(year, month - 1, 1).getDay(); // 0=일
  const lastDate = new Date(year, month, 0).getDate();
  const grid: (string | null)[][] = [];
  let week: (string | null)[] = Array(firstWeekday).fill(null);
  for (let d = 1; d <= lastDate; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    week.push(dateStr);
    if (week.length === 7) { grid.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    grid.push(week);
  }
  return grid;
}

// ============================================================================
// 메인 화면
// ============================================================================

export default function EmotionHistoryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLocale();
  const { history, reminderText, refresh } = useEmotionHistory();
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

  const [selectedDay, setSelectedDay] = useState<EmotionEntry | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 월 네비게이션 (현재 달 기준)
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);

  // history → date 맵
  const historyMap = React.useMemo(() => {
    const map: Record<string, EmotionEntry> = {};
    history.forEach(e => { map[e.date] = e; });
    return map;
  }, [history]);

  // 보상 토스트
  const toastOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (todayIsChecked && todayEmotion && !isSaving) setIsSaved(true);
  }, [todayIsChecked, todayEmotion, isSaving]);

  useEffect(() => {
    if (rewardCredits > 0) {
      Animated.sequence([
        Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(2400),
        Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [rewardCredits, toastOpacity]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleSave = async () => {
    if (!todayEmotion) return;
    setIsSaving(true);
    try {
      await saveEmotionWithMemo();
      setIsSaved(true);
      refresh();
    } finally {
      setIsSaving(false);
    }
  };

  // 월 네비게이션
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth() + 1;

  const goPrevMonth = () => {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); }
    else setViewMonth(m => m - 1);
  };

  const goNextMonth = () => {
    if (isCurrentMonth) return;
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); }
    else setViewMonth(m => m + 1);
  };

  const monthGrid = getMonthGrid(viewYear, viewMonth);
  const today = getTodayString();
  const todayEntry = historyMap[today];

  // 이번 달 통계
  const monthEntries = Object.values(historyMap).filter(e => {
    const [y, m] = e.date.split('-').map(Number);
    return y === viewYear && m === viewMonth;
  });
  const emotionCounts: Record<string, number> = {};
  monthEntries.forEach(e => { emotionCounts[e.emotion] = (emotionCounts[e.emotion] || 0) + 1; });
  const topEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 헤더 */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>{t('emotionHistory.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >

          {/* ═══════════════════════════════════════════════
              1. 오늘의 감정 기록 카드 (최상단)
          ═══════════════════════════════════════════════ */}
          <View style={[s.todayCard, { backgroundColor: colors.surface, borderColor: `${colors.primary}40` }]}>
            <View style={s.cardHeader}>
              <Ionicons name="heart" size={17} color={colors.primary} />
              <Text style={[s.cardTitle, { color: colors.textPrimary }]}>
                {isSaved ? t('emotionHistory.todayEmotion') : t('emotionHistory.recordToday')}
              </Text>
              <View style={[s.badge, { backgroundColor: `${colors.primary}1F` }]}>
                <Text style={[s.badgeText, { color: colors.primary }]}>
                  {isSaved ? t('emotionHistory.recorded') : t('emotionHistory.rewardBadge')}
                </Text>
              </View>
            </View>

            {/* ── 이미 기록된 상태 ── */}
            {isSaved && todayEmotion ? (
              <View>
                <View style={s.emotionRow}>
                  {Object.entries(EMOTION_MAP).map(([key, { emoji, tKey }]) => (
                    <View
                      key={key}
                      style={[
                        s.emotionBtn,
                        { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                        todayEmotion === key && {
                          backgroundColor: `${EMOTION_COLORS[key]}20`,
                          borderColor: EMOTION_COLORS[key],
                          borderWidth: 2,
                        },
                        todayEmotion !== key && { opacity: 0.3 },
                      ]}
                    >
                      <Text style={[s.emotionEmoji, todayEmotion === key && { fontSize: 29 }]}>{emoji}</Text>
                      <Text style={[
                        s.emotionLabel,
                        { color: todayEmotion === key ? EMOTION_COLORS[key] : colors.textSecondary },
                        todayEmotion === key && { fontWeight: '700' as const },
                      ]}>{t(tKey)}</Text>
                    </View>
                  ))}
                </View>

                {todayMemo ? (
                  <View style={[s.savedMemo, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Ionicons name="chatbubble-outline" size={13} color={colors.textTertiary} />
                    <Text style={[s.savedMemoText, { color: colors.textSecondary }]}>{todayMemo}</Text>
                  </View>
                ) : null}

                {/* 저장된 나스닥/BTC */}
                {(todayEntry?.nasdaqClose || todayEntry?.btcClose) ? (
                  <View style={[s.priceRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    {todayEntry?.nasdaqClose ? (
                      <View style={s.priceChip}>
                        <Text style={[s.priceChipLabel, { color: colors.textTertiary }]}>{t('emotionHistory.nasdaq')}</Text>
                        <Text style={[s.priceChipValue, { color: colors.textPrimary }]}>
                          {todayEntry.nasdaqClose.toLocaleString()}
                        </Text>
                      </View>
                    ) : null}
                    {todayEntry?.btcClose ? (
                      <View style={s.priceChip}>
                        <Text style={[s.priceChipLabel, { color: colors.textTertiary }]}>BTC</Text>
                        <Text style={[s.priceChipValue, { color: '#F7931A' }]}>
                          ${todayEntry.btcClose.toLocaleString()}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                <View style={[s.feedbackBox, { backgroundColor: `${EMOTION_COLORS[todayEmotion]}10` }]}>
                  <Text style={[s.feedbackText, { color: colors.textSecondary }]}>
                    {EMOTION_MAP[todayEmotion]?.emoji} {getEmotionFeedback(todayEmotion, t)}
                  </Text>
                </View>

                <TouchableOpacity style={s.reRecordBtn} onPress={() => setIsSaved(false)} activeOpacity={0.7}>
                  <Ionicons name="refresh-outline" size={13} color={colors.textTertiary} />
                  <Text style={[s.reRecordText, { color: colors.textTertiary }]}>{t('emotionHistory.reRecord')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* ── 미기록 상태: 입력 폼 ── */
              <View>
                <View style={s.emotionRow}>
                  {Object.entries(EMOTION_MAP).map(([key, { emoji, tKey }]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        s.emotionBtn,
                        { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                        todayEmotion === key && {
                          backgroundColor: `${EMOTION_COLORS[key]}20`,
                          borderColor: EMOTION_COLORS[key],
                        },
                      ]}
                      onPress={() => setEmotion(key)}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.emotionEmoji, todayEmotion === key && { fontSize: 29 }]}>{emoji}</Text>
                      <Text style={[
                        s.emotionLabel,
                        { color: todayEmotion === key ? EMOTION_COLORS[key] : colors.textSecondary },
                        todayEmotion === key && { fontWeight: '700' as const },
                      ]}>{t(tKey)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {todayEmotion ? (
                  <View style={s.inputSection}>
                    {/* 메모 */}
                    <TextInput
                      style={[s.memoInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                      placeholder={t('emotionHistory.memoPlaceholder')}
                      placeholderTextColor={colors.textTertiary}
                      maxLength={30}
                      value={todayMemo}
                      onChangeText={setMemo}
                    />

                    {/* 나스닥 / BTC 종가 입력 */}
                    <View style={s.priceInputRow}>
                      <View style={s.priceInputWrap}>
                        <View style={s.priceInputLabelRow}>
                          <Text style={[s.priceInputLabel, { color: colors.textTertiary }]}>{t('emotionHistory.nasdaqClose')}</Text>
                          <Text style={[s.priceOptional, { color: colors.textTertiary }]}>{t('emotionHistory.optional')}</Text>
                        </View>
                        <TextInput
                          style={[s.priceInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                          placeholder="예: 19420"
                          placeholderTextColor={colors.textTertiary}
                          keyboardType="numeric"
                          value={nasdaqClose !== undefined ? String(nasdaqClose) : ''}
                          onChangeText={v => {
                            const n = v.replace(/[^0-9]/g, '');
                            setNasdaqClose(n ? Number(n) : undefined);
                          }}
                        />
                      </View>
                      <View style={s.priceInputWrap}>
                        <View style={s.priceInputLabelRow}>
                          <Text style={[s.priceInputLabel, { color: '#F7931A' }]}>BTC $</Text>
                          <Text style={[s.priceOptional, { color: colors.textTertiary }]}>{t('emotionHistory.optional')}</Text>
                        </View>
                        <TextInput
                          style={[s.priceInput, { backgroundColor: colors.background, color: '#F7931A', borderColor: colors.border }]}
                          placeholder="예: 97500"
                          placeholderTextColor={colors.textTertiary}
                          keyboardType="numeric"
                          value={btcClose !== undefined ? String(btcClose) : ''}
                          onChangeText={v => {
                            const n = v.replace(/[^0-9]/g, '');
                            setBtcClose(n ? Number(n) : undefined);
                          }}
                        />
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[s.saveBtn, { backgroundColor: colors.primary }, isSaving && { opacity: 0.6 }]}
                      onPress={handleSave}
                      activeOpacity={0.7}
                      disabled={isSaving}
                    >
                      <Text style={s.saveBtnText}>{isSaving ? t('emotionHistory.saving') : t('emotionHistory.saveBtn')}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={[s.emotionHint, { color: colors.textTertiary }]}>
                    {t('emotionHistory.selectHint')}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* 보상 토스트 */}
          {rewardCredits > 0 && (
            <Animated.View style={[s.rewardToast, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30`, opacity: toastOpacity }]}>
              <Ionicons name="gift" size={14} color={colors.primary} />
              <Text style={[s.rewardToastText, { color: colors.primary }]}>
                {t('emotionHistory.rewardToast').replace('{{credits}}', String(rewardCredits))}
              </Text>
            </Animated.View>
          )}

          {/* ═══════════════════════════════════════════════
              2. 월별 캘린더 히트맵
          ═══════════════════════════════════════════════ */}
          <View style={[s.calendarCard, { backgroundColor: colors.surface }]}>
            {/* 월 네비게이션 */}
            <View style={s.monthNav}>
              <TouchableOpacity onPress={goPrevMonth} style={s.monthNavBtn} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={[s.monthLabel, { color: colors.textPrimary }]}>
                {t('emotionHistory.monthLabel').replace('{{year}}', String(viewYear)).replace('{{month}}', String(viewMonth))}
              </Text>
              <TouchableOpacity
                onPress={goNextMonth}
                style={[s.monthNavBtn, isCurrentMonth && { opacity: 0.25 }]}
                activeOpacity={0.7}
                disabled={isCurrentMonth}
              >
                <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* 감정 범례 */}
            <View style={s.legend}>
              {Object.entries(EMOTION_MAP).map(([key, { emoji, tKey }]) => (
                <View key={key} style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: EMOTION_COLORS[key] }]} />
                  <Text style={[s.legendText, { color: colors.textTertiary }]}>{emoji} {t(tKey)}</Text>
                </View>
              ))}
            </View>

            {/* 요일 헤더 */}
            <View style={s.weekdayRow}>
              {WEEKDAY_KEYS.map((wKey, i) => (
                <Text
                  key={wKey}
                  style={[
                    s.weekdayText,
                    { color: colors.textTertiary },
                    i === 0 && { color: '#FF5252' },
                    i === 6 && { color: '#2196F3' },
                  ]}
                >{t(wKey)}</Text>
              ))}
            </View>

            {/* 달력 그리드 */}
            {monthGrid.map((week, wi) => (
              <View key={wi} style={s.weekRow}>
                {week.map((dateStr, di) => {
                  if (!dateStr) return <View key={di} style={s.dayCell} />;
                  const entry = historyMap[dateStr];
                  const isToday = dateStr === today;
                  const isSelected = selectedDay?.date === dateStr;
                  const color = entry ? EMOTION_COLORS[entry.emotion] : null;
                  const dayNum = Number(dateStr.split('-')[2]);

                  return (
                    <TouchableOpacity
                      key={di}
                      style={[
                        s.dayCell,
                        !color && { borderWidth: 1, borderColor: colors.border + '60' },
                        color && { backgroundColor: color + '28' },
                        isToday && { borderWidth: 2, borderColor: colors.primary },
                        isSelected && { borderWidth: 2, borderColor: color ?? colors.primary, backgroundColor: (color ?? colors.primary) + '40' },
                      ]}
                      onPress={() => entry ? setSelectedDay(isSelected ? null : entry) : null}
                      activeOpacity={entry ? 0.7 : 1}
                    >
                      <Text style={[s.dayCellNum, { color: isToday ? colors.primary : colors.textTertiary }, isToday && { fontWeight: '700' as const }]}>
                        {dayNum}
                      </Text>
                      {entry ? (
                        <Text style={s.dayCellEmoji}>{EMOTION_MAP[entry.emotion]?.emoji ?? '😐'}</Text>
                      ) : null}
                      {/* BTC 기록 있으면 작은 점 */}
                      {entry?.btcClose ? (
                        <View style={[s.btcDot, { backgroundColor: '#F7931A' }]} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            {/* 이번 달 통계 요약 */}
            <View style={[s.monthStatBox, { backgroundColor: colors.background }]}>
              {monthEntries.length === 0 ? (
                <Text style={[s.monthStatText, { color: colors.textTertiary }]}>
                  {t('emotionHistory.noRecordsThisMonth')}
                </Text>
              ) : (
                <Text style={[s.monthStatText, { color: colors.textSecondary }]}>
                  {t('emotionHistory.monthStat').replace('{{month}}', String(viewMonth)).replace('{{days}}', String(monthEntries.length))}
                  {topEmotion ? ` · ${t('emotionHistory.topEmotion')}: ${EMOTION_MAP[topEmotion[0]]?.emoji} ${t(EMOTION_MAP[topEmotion[0]]?.tKey)} (${topEmotion[1]}${t('emotionHistory.daysUnit')})` : ''}
                </Text>
              )}
            </View>
          </View>

          {/* ═══════════════════════════════════════════════
              3. 선택 날짜 상세
          ═══════════════════════════════════════════════ */}
          {selectedDay ? (
            <View style={[s.detailCard, { backgroundColor: colors.surface }]}>
              <View style={s.detailHeader}>
                <View style={[s.detailEmojiBg, { backgroundColor: `${EMOTION_COLORS[selectedDay.emotion]}20` }]}>
                  <Text style={s.detailEmoji}>{EMOTION_MAP[selectedDay.emotion]?.emoji ?? '😐'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.detailLabel, { color: EMOTION_COLORS[selectedDay.emotion] }]}>
                    {t(EMOTION_MAP[selectedDay.emotion]?.tKey)}
                  </Text>
                  <Text style={[s.detailDate, { color: colors.textSecondary }]}>
                    {selectedDay.date} ({getWeekday(selectedDay.date, t)})
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedDay(null)} style={{ padding: 6 }}>
                  <Ionicons name="close" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>

              <Text style={[s.detailFeedback, { color: colors.textSecondary }]}>
                {getEmotionFeedback(selectedDay.emotion, t)}
              </Text>

              {selectedDay.memo ? (
                <View style={[s.detailMemo, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Ionicons name="chatbubble-outline" size={13} color={colors.textTertiary} />
                  <Text style={[s.detailMemoText, { color: colors.textSecondary }]}>{selectedDay.memo}</Text>
                </View>
              ) : null}

              {/* 나스닥 / BTC 종가 */}
              {(selectedDay.nasdaqClose || selectedDay.btcClose) ? (
                <View style={[s.priceRow, { backgroundColor: colors.background, borderColor: colors.border, marginTop: 10 }]}>
                  {selectedDay.nasdaqClose ? (
                    <View style={s.priceChip}>
                      <Text style={[s.priceChipLabel, { color: colors.textTertiary }]}>{t('emotionHistory.nasdaqClose')}</Text>
                      <Text style={[s.priceChipValue, { color: colors.textPrimary }]}>
                        {selectedDay.nasdaqClose.toLocaleString()}
                      </Text>
                    </View>
                  ) : null}
                  {selectedDay.btcClose ? (
                    <View style={s.priceChip}>
                      <Text style={[s.priceChipLabel, { color: '#F7931A' }]}>{t('emotionHistory.btcClose')}</Text>
                      <Text style={[s.priceChipValue, { color: '#F7931A' }]}>
                        ${selectedDay.btcClose.toLocaleString()}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                <Text style={[s.noPriceText, { color: colors.textTertiary }]}>
                  {t('emotionHistory.noMarketData')}
                </Text>
              )}
            </View>
          ) : null}

          {/* ═══════════════════════════════════════════════
              4. 리마인더 카드
          ═══════════════════════════════════════════════ */}
          {reminderText ? (
            <View style={[s.reminderCard, { backgroundColor: colors.surface }]}>
              <Text style={[s.reminderText, { color: colors.textPrimary }]}>{reminderText}</Text>
            </View>
          ) : null}

          {/* ═══════════════════════════════════════════════
              5. 명언
          ═══════════════════════════════════════════════ */}
          <View style={[s.quoteCard, { backgroundColor: colors.surface }]}>
            <Text style={[s.quoteIcon, { color: colors.primary }]}>💭</Text>
            <Text style={[s.quoteText, { color: colors.textSecondary }]}>
              {t('emotionHistory.quoteText')}
            </Text>
            <Text style={[s.quoteAuthor, { color: colors.textTertiary }]}>{t('emotionHistory.quoteAuthor')}</Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.xl,
    paddingVertical: SIZES.md,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: SIZES.fLg, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 120 },

  // ─── 오늘 기록 카드 ───
  todayCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 13, fontWeight: '800' },

  emotionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 5,
  },
  emotionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  emotionEmoji: { fontSize: 23, marginBottom: 4 },
  emotionLabel: { fontSize: 11, fontWeight: '500' },

  savedMemo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  savedMemoText: { flex: 1, fontSize: 14, lineHeight: 19 },

  feedbackBox: { marginTop: 10, padding: 11, borderRadius: 10 },
  feedbackText: { fontSize: 14, lineHeight: 19, textAlign: 'center' },

  reRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 10,
    paddingVertical: 4,
  },
  reRecordText: { fontSize: 13 },

  inputSection: { marginTop: 12, gap: 10 },
  memoInput: {
    borderRadius: 10,
    padding: 11,
    fontSize: 15,
    borderWidth: 1,
  },
  emotionHint: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
  },

  // 나스닥/BTC 입력
  priceInputRow: { flexDirection: 'row', gap: 10 },
  priceInputWrap: { flex: 1 },
  priceInputLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 5 },
  priceInputLabel: { fontSize: 13, fontWeight: '600' },
  priceOptional: { fontSize: 11 },
  priceInput: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 15,
    fontWeight: '600',
    borderWidth: 1,
  },

  saveBtn: { paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // 나스닥/BTC 표시
  priceRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  priceChip: { flex: 1, alignItems: 'center', gap: 3 },
  priceChipLabel: { fontSize: 12, fontWeight: '500' },
  priceChipValue: { fontSize: 16, fontWeight: '800' },

  // 보상 토스트
  rewardToast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
  },
  rewardToastText: { fontSize: 15, fontWeight: '700' },

  // ─── 월별 캘린더 히트맵 ───
  calendarCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },

  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  monthNavBtn: { padding: 4 },
  monthLabel: { fontSize: 18, fontWeight: '700' },

  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12 },

  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
  },

  weekRow: { flexDirection: 'row', marginBottom: 4 },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellNum: { fontSize: 11, lineHeight: 14 },
  dayCellEmoji: { fontSize: 15 },
  btcDot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },

  monthStatBox: {
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  monthStatText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // ─── 선택 날짜 상세 ───
  detailCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  detailEmojiBg: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  detailEmoji: { fontSize: 27 },
  detailLabel: { fontSize: 18, fontWeight: '700' },
  detailDate: { fontSize: 13, marginTop: 2 },
  detailFeedback: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  detailMemo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 2,
  },
  detailMemoText: { flex: 1, fontSize: 14, lineHeight: 19 },
  noPriceText: { fontSize: 13, marginTop: 8, textAlign: 'center' },

  // ─── 리마인더 ───
  reminderCard: { borderRadius: 14, padding: 16, marginBottom: 14 },
  reminderText: { fontSize: 15, lineHeight: 23 },

  // ─── 명언 ───
  quoteCard: {
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  quoteIcon: { fontSize: 29, marginBottom: 10 },
  quoteText: { fontSize: 14, lineHeight: 22, textAlign: 'center', fontStyle: 'italic', marginBottom: 6 },
  quoteAuthor: { fontSize: 12, textAlign: 'center' },
});
