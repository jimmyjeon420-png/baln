/**
 * GuruScheduleCard -- 구루 일과표 시각화
 *
 * 역할: 구루 상세 시트에서 "오늘의 일과" 타임라인을 3구간으로 표시
 *       guruScheduleConfig.ts 데이터를 읽어 아침/오후/저녁 활동을 보여줌
 * 비유: "NPC 일과표 게시판" -- 동물의숲에서 주민이 언제 어디 있는지 알려주는 안내판
 *
 * 사용처:
 * - GuruDetailSheet 내부에서 구루별 하루 일과 표시
 * - 현재 시간대를 하이라이트로 강조
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GURU_SCHEDULES } from '../../data/guruScheduleConfig';
import type { GuruActivity } from '../../types/village';
import type { ThemeColors } from '../../styles/colors';
import { useLocale } from '../../context/LocaleContext';

// ============================================================================
// 타입
// ============================================================================

interface GuruScheduleCardProps {
  /** 표시할 구루 ID */
  guruId: string;
  /** 테마 색상 */
  colors: ThemeColors;
}

// ============================================================================
// 활동 표시 매핑 -- 아이콘/한국어/영어
// ============================================================================

const ACTIVITY_DISPLAY: Record<string, { emoji: string; ko: string; en: string }> = {
  reading: { emoji: '\uD83D\uDCD6', ko: '독서', en: 'Reading' },
  meditating: { emoji: '\uD83E\uDDD8', ko: '명상', en: 'Meditating' },
  walking: { emoji: '\uD83D\uDEB6', ko: '산책', en: 'Walking' },
  fishing: { emoji: '\uD83C\uDFA3', ko: '낚시', en: 'Fishing' },
  gardening: { emoji: '\uD83C\uDF31', ko: '정원 가꾸기', en: 'Gardening' },
  cooking: { emoji: '\uD83C\uDF73', ko: '요리', en: 'Cooking' },
  painting: { emoji: '\uD83C\uDFA8', ko: '그림 그리기', en: 'Painting' },
  stargazing: { emoji: '\uD83C\uDF1F', ko: '별 보기', en: 'Stargazing' },
  exercising: { emoji: '\uD83D\uDCAA', ko: '운동', en: 'Exercising' },
  napping: { emoji: '\uD83D\uDE34', ko: '낮잠', en: 'Napping' },
  dancing: { emoji: '\uD83D\uDC83', ko: '춤추기', en: 'Dancing' },
  singing: { emoji: '\uD83C\uDFB5', ko: '노래 부르기', en: 'Singing' },
  writing: { emoji: '\u270D\uFE0F', ko: '글쓰기', en: 'Writing' },
  chess: { emoji: '\u265F\uFE0F', ko: '체스', en: 'Chess' },
  tea_ceremony: { emoji: '\uD83C\uDF75', ko: '차 마시기', en: 'Tea Ceremony' },
  debugging: { emoji: '\uD83D\uDD0D', ko: '데이터 분석', en: 'Data Analysis' },
  birdwatching: { emoji: '\uD83D\uDC26', ko: '새 관찰', en: 'Birdwatching' },
  yoga: { emoji: '\uD83E\uDDD8\u200D\u2642\uFE0F', ko: '요가', en: 'Yoga' },
  photography: { emoji: '\uD83D\uDCF8', ko: '사진 찍기', en: 'Photography' },
  surfing: { emoji: '\uD83C\uDFC4', ko: '서핑', en: 'Surfing' },
};

// ============================================================================
// 시간대 슬롯 정의 (3구간으로 통합)
// ============================================================================

interface TimeSlotDisplay {
  id: 'morning' | 'afternoon' | 'evening';
  emoji: string;
  labelKo: string;
  labelEn: string;
  hourRange: string;
  /** guruScheduleConfig의 TimeSlot 매핑 키들 */
  scheduleKeys: string[];
}

const TIME_SLOTS: TimeSlotDisplay[] = [
  {
    id: 'morning',
    emoji: '\uD83C\uDF05', // 일출
    labelKo: '아침',
    labelEn: 'Morning',
    hourRange: '06-12',
    scheduleKeys: ['morning', 'midday'],
  },
  {
    id: 'afternoon',
    emoji: '\u2600\uFE0F', // 해
    labelKo: '오후',
    labelEn: 'Afternoon',
    hourRange: '12-18',
    scheduleKeys: ['afternoon'],
  },
  {
    id: 'evening',
    emoji: '\uD83C\uDF19', // 달
    labelKo: '저녁',
    labelEn: 'Evening',
    hourRange: '18-24',
    scheduleKeys: ['evening', 'night'],
  },
];

// ============================================================================
// 현재 시간대 판별
// ============================================================================

function getCurrentDisplaySlot(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

function GuruScheduleCard({ guruId, colors }: GuruScheduleCardProps) {
  const { t, language } = useLocale();
  const isKo = language === 'ko';

  // 현재 시간대
  const currentSlot = useMemo(() => {
    return getCurrentDisplaySlot(new Date().getHours());
  }, []);

  // 구루 일과 데이터 조합
  const scheduleData = useMemo(() => {
    const guruSchedule = GURU_SCHEDULES[guruId];

    return TIME_SLOTS.map((slot) => {
      // 해당 시간대의 첫 번째 매칭되는 스케줄 항목 사용
      let activityKey: GuruActivity = 'walking';
      let locationText = isKo ? '마을' : 'Village';

      if (guruSchedule) {
        for (const key of slot.scheduleKeys) {
          const entry = guruSchedule.schedule[key as keyof typeof guruSchedule.schedule];
          if (entry) {
            activityKey = entry.activity;
            locationText = isKo
              ? entry.location
              : (entry.locationEn || entry.location);
            break;
          }
        }
      }

      const display = ACTIVITY_DISPLAY[activityKey] || {
        emoji: '\uD83D\uDEB6',
        ko: activityKey,
        en: activityKey,
      };

      return {
        slot,
        activityEmoji: display.emoji,
        activityName: isKo ? display.ko : display.en,
        location: locationText,
        isActive: slot.id === currentSlot,
      };
    });
  }, [guruId, isKo, currentSlot]);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {/* 제목 */}
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {t('guruSchedule.title')}
      </Text>

      {/* 타임라인 */}
      <View style={styles.timeline}>
        {scheduleData.map((item, idx) => (
          <View key={item.slot.id} style={styles.slotRow}>
            {/* 왼쪽 액센트 바 */}
            <View
              style={[
                styles.accentBar,
                {
                  backgroundColor: item.isActive
                    ? colors.primary
                    : colors.border,
                },
              ]}
            />

            {/* 시간대 아이콘 + 라벨 */}
            <View style={styles.timeSection}>
              <Text style={styles.slotEmoji}>{item.slot.emoji}</Text>
              <Text style={[styles.slotLabel, { color: colors.textSecondary }]}>
                {isKo ? item.slot.labelKo : item.slot.labelEn}
              </Text>
              <Text style={[styles.slotHours, { color: colors.textTertiary }]}>
                {item.slot.hourRange}
              </Text>
            </View>

            {/* 활동 내용 */}
            <View style={styles.activitySection}>
              <Text
                style={[
                  styles.activityName,
                  {
                    color: item.isActive
                      ? colors.textPrimary
                      : colors.textSecondary,
                    fontWeight: item.isActive ? '700' : '500',
                  },
                ]}
              >
                {item.activityName}
              </Text>
              <Text style={[styles.locationText, { color: colors.textTertiary }]}>
                {item.location}
              </Text>
            </View>

            {/* 오른쪽 활동 이모지 */}
            <Text style={styles.activityEmoji}>{item.activityEmoji}</Text>

            {/* 타임라인 연결선 (마지막 항목 제외) */}
            {idx < scheduleData.length - 1 && (
              <View style={[styles.connector, { backgroundColor: colors.border }]} />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

export default GuruScheduleCard;

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14,
  },
  timeline: {
    gap: 0,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  accentBar: {
    width: 3,
    height: '100%',
    borderRadius: 2,
    marginRight: 10,
    minHeight: 36,
  },
  timeSection: {
    width: 58,
    alignItems: 'center',
    marginRight: 10,
  },
  slotEmoji: {
    fontSize: 16,
    marginBottom: 2,
  },
  slotLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  slotHours: {
    fontSize: 9,
    marginTop: 1,
  },
  activitySection: {
    flex: 1,
    marginRight: 8,
  },
  activityName: {
    fontSize: 14,
  },
  locationText: {
    fontSize: 11,
    marginTop: 2,
  },
  activityEmoji: {
    fontSize: 20,
  },
  connector: {
    position: 'absolute',
    left: 1,
    bottom: -2,
    width: 1,
    height: 4,
  },
});
