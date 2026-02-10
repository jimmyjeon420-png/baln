/**
 * EmotionHistory - 투자 감정 히스토리
 *
 * 워렌 버핏: "감정 일기를 쓰면, 공포 때 판 걸 나중에 후회하게 된다. 좋은 교육이다."
 *
 * 기능:
 * - 최근 30일 감정 그래프 (가로 스크롤)
 * - 각 날짜 클릭 시 메모 상세 보기
 * - "한 달 전 당신은..." 리마인더
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useEmotionHistory } from '../../src/hooks/useEmotionHistory';
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

export default function EmotionHistoryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { last30Days, reminderText, isLoading, refresh } = useEmotionHistory();
  const [selectedDay, setSelectedDay] = useState<EmotionEntry | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
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
