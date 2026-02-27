/**
 * CafeAmbiance — 라운지 탭 "구루 카페" 분위기 헤더
 *
 * 역할: "카페 간판 + 오늘의 분위기" — 라운지 탭 최상단에서
 *       시간대별 톤을 반영하고, 매일 다른 구루 명언을 보여줌
 *
 * 비유: 스타벅스 앞에 걸린 칠판 메뉴처럼
 *       오늘의 분위기와 구루의 한 줄 명언이 적혀 있음
 *
 * 사용처:
 * - app/(tabs)/lounge.tsx 라운지 탭 최상단 헤더
 */

import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GURU_CHARACTER_CONFIGS } from '../../data/guruCharacterConfig';
import { getGuruDisplayName } from '../../services/characterService';

/** 현재 시간 기반 시간대 자동 감지 (KST) */
function detectTimeOfDay(): 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night' {
  const kstHour = new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCHours();
  if (kstHour >= 5 && kstHour < 7) return 'dawn';
  if (kstHour >= 7 && kstHour < 12) return 'morning';
  if (kstHour >= 12 && kstHour < 17) return 'afternoon';
  if (kstHour >= 17 && kstHour < 21) return 'evening';
  return 'night';
}

// =============================================================================
// 타입 정의
// =============================================================================

interface CafeAmbianceProps {
  /** 테마 색상 */
  colors: any;
  /** 로케일 (ko/en) */
  locale: string;
  /** 현재 시간대 (분위기 톤 결정) */
  timeOfDay?: 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night';
}

// =============================================================================
// 시간대별 분위기 설정
// =============================================================================

interface TimeOfDayConfig {
  tintColor: string;
  greetingKo: string;
  greetingEn: string;
}

const TIME_CONFIG: Record<string, TimeOfDayConfig> = {
  dawn:      { tintColor: '#FFF8E1' + '40', greetingKo: '이른 아침 커피 한 잔...', greetingEn: 'Early morning coffee...' },
  morning:   { tintColor: '#E8F5E9' + '30', greetingKo: '좋은 아침이야!', greetingEn: 'Good morning!' },
  afternoon: { tintColor: '#F5F5F5' + '20', greetingKo: '오후의 여유를 즐겨봐', greetingEn: 'Enjoy the afternoon calm' },
  evening:   { tintColor: '#FFF3E0' + '40', greetingKo: '오늘 하루 수고했어', greetingEn: 'Good work today' },
  night:     { tintColor: '#1A237E' + '30', greetingKo: '밤의 카페는 특별하지', greetingEn: 'The night cafe is special' },
};

// =============================================================================
// 구루 명언 (10명, 각 1줄)
// =============================================================================

const GURU_QUOTES: Record<string, { ko: string; en: string }> = {
  buffett:       { ko: '남들이 두려워할 때 탐욕을 부려라', en: 'Be greedy when others are fearful' },
  dalio:         { ko: '고통 + 반성 = 성장', en: 'Pain + Reflection = Progress' },
  cathie_wood:   { ko: '혁신은 기다려주지 않는다', en: 'Innovation doesn\'t wait' },
  druckenmiller: { ko: '확신이 있으면 크게 베팅하라', en: 'When you have conviction, go big' },
  saylor:        { ko: '비트코인은 디지털 에너지다', en: 'Bitcoin is digital energy' },
  dimon:         { ko: '리스크 관리가 모든 것의 기본이다', en: 'Risk management is fundamental' },
  musk:          { ko: '불가능해 보이면 올바른 길이다', en: 'If it seems impossible, you\'re on the right track' },
  lynch:         { ko: '자기가 아는 것에 투자하라', en: 'Invest in what you know' },
  marks:         { ko: '2차적 사고가 중요하다', en: 'Second-level thinking matters' },
  rogers:        { ko: '변화를 읽는 자가 부를 얻는다', en: 'Those who read change gain wealth' },
};

// 구루 ID 순서 (날짜 기반 선택용)
const GURU_ORDER = [
  'buffett', 'dalio', 'cathie_wood', 'druckenmiller', 'saylor',
  'dimon', 'musk', 'lynch', 'marks', 'rogers',
];

// =============================================================================
// 메인 컴포넌트
// =============================================================================

function CafeAmbiance({
  colors,
  locale,
  timeOfDay,
}: CafeAmbianceProps): React.ReactElement {
  const isKo = locale === 'ko';

  // 시간대 자동 감지 (prop 없으면 현재 시각 기반)
  const [autoTime, setAutoTime] = useState(detectTimeOfDay);
  useEffect(() => {
    // 1분마다 시간대 갱신 (시간대 경계 대응)
    const interval = setInterval(() => setAutoTime(detectTimeOfDay()), 60000);
    return () => clearInterval(interval);
  }, []);
  const resolvedTime = timeOfDay ?? autoTime;
  const config = TIME_CONFIG[resolvedTime] ?? TIME_CONFIG.morning;

  // 오늘의 구루 명언 (날짜 기반 결정론적 선택)
  const todayQuote = useMemo(() => {
    const dayIndex = new Date().getDate() % 10;
    const guruId = GURU_ORDER[dayIndex];
    const guruConfig = GURU_CHARACTER_CONFIGS[guruId];
    const quote = GURU_QUOTES[guruId];

    return {
      emoji: guruConfig?.emoji ?? '',
      name: getGuruDisplayName(guruId),
      text: quote ? (isKo ? quote.ko : quote.en) : '',
    };
  }, [isKo]);

  return (
    <View style={[styles.container, { backgroundColor: config.tintColor }]}>
      {/* 카페 간판 */}
      <Text style={[styles.signText, { color: colors.textPrimary }]}>
        {isKo ? '☕ 구루 카페' : '☕ Guru Cafe'}
      </Text>

      {/* 시간대별 인사 */}
      <Text style={[styles.greeting, { color: colors.textSecondary }]}>
        {isKo ? config.greetingKo : config.greetingEn}
      </Text>

      {/* 오늘의 구루 명언 */}
      <View style={[styles.quoteContainer, { backgroundColor: colors.surface + '80' }]}>
        <Text
          style={[styles.quoteText, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {todayQuote.emoji} {todayQuote.name}: &ldquo;{todayQuote.text}&rdquo;
        </Text>
      </View>
    </View>
  );
}

// =============================================================================
// 스타일
// =============================================================================

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  signText: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  greeting: {
    fontSize: 13,
    marginBottom: 12,
  },
  quoteContainer: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  quoteText: {
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});

export default CafeAmbiance;
