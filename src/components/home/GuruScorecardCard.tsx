/**
 * GuruScorecardCard — 구루 월간 예측 성적표
 *
 * 역할: "마을 성적 게시판" — 10명 구루의 이번 달 예측 적중률 표시
 * 비유: 학교 게시판에 붙어있는 반별 성적표 (🥇🥈🥉 하이라이트)
 *
 * 기능:
 * - 시뮬레이션 데이터 (현재 월 기반 deterministic)
 * - 각 구루: 이모지 + 이름 + 적중률 % + 바 차트
 * - 상위 3명 메달 표시
 * - "이번 달 예측왕" 하이라이트
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { GURU_CHARACTER_CONFIGS } from '../../data/guruCharacterConfig';
import { getGuruDisplayName } from '../../services/characterService';

// ============================================================================
// i18n
// ============================================================================

const TEXT = {
  ko: {
    title: '이번 달 구루 성적표',
    champion: (name: string, pct: number) => `이번 달 예측왕: ${name} (${pct}%)`,
  },
  en: {
    title: 'Guru Monthly Scorecard',
    champion: (name: string, pct: number) => `Prediction King: ${name} (${pct}%)`,
  },
};

const MEDALS = ['🥇', '🥈', '🥉'];

// ============================================================================
// Props
// ============================================================================

interface GuruScorecardCardProps {
  locale?: string;
  colors: {
    surface: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    primary: string;
    border: string;
  };
}

// ============================================================================
// Simulated accuracy (deterministic from month)
// ============================================================================

function generateMonthlyAccuracies(): { guruId: string; accuracy: number }[] {
  const now = new Date();
  const seed = now.getFullYear() * 100 + (now.getMonth() + 1);

  const guruIds = Object.keys(GURU_CHARACTER_CONFIGS);
  const results = guruIds.map((guruId, i) => {
    // Deterministic pseudo-random based on seed + guru index
    const hash = ((seed * 31 + i * 17) % 100);
    const accuracy = 45 + (hash % 35); // 45~79%
    return { guruId, accuracy };
  });

  // Sort by accuracy descending
  results.sort((a, b) => b.accuracy - a.accuracy);
  return results;
}

// ============================================================================
// Component
// ============================================================================

export function GuruScorecardCard({ locale = 'ko', colors }: GuruScorecardCardProps) {
  const isKo = locale === 'ko';
  const t = isKo ? TEXT.ko : TEXT.en;

  const scorecards = useMemo(() => generateMonthlyAccuracies(), []);

  const champion = scorecards[0];
  const championConfig = GURU_CHARACTER_CONFIGS[champion.guruId];
  const championName = getGuruDisplayName(champion.guruId);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t.title}</Text>

      <Text style={[styles.champion, { color: colors.primary }]}>
        {t.champion(championName, champion.accuracy)}
      </Text>

      <View style={styles.list}>
        {scorecards.map((item, index) => {
          const config = GURU_CHARACTER_CONFIGS[item.guruId];
          const name = getGuruDisplayName(item.guruId);
          const medal = index < 3 ? MEDALS[index] : '';
          const barWidth = `${item.accuracy}%` as const;

          return (
            <View key={item.guruId} style={styles.row}>
              <Text style={styles.medal}>{medal}</Text>
              <Text style={styles.emoji}>{config.emoji}</Text>
              <Text
                style={[styles.name, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {name}
              </Text>
              <View style={[styles.barBg, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: index < 3 ? colors.primary : colors.textTertiary,
                      width: barWidth,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.pct, { color: colors.textSecondary }]}>
                {item.accuracy}%
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  champion: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  list: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  medal: {
    fontSize: 14,
    width: 20,
    textAlign: 'center',
  },
  emoji: {
    fontSize: 16,
    width: 22,
    textAlign: 'center',
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
    width: 68,
  },
  barBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  pct: {
    fontSize: 12,
    fontWeight: '600',
    width: 36,
    textAlign: 'right',
  },
});
