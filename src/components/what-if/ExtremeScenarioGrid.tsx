/**
 * ExtremeScenarioGrid.tsx - 극한 시나리오 선택 그리드
 *
 * 역할: 5개 극한 시나리오를 2열 그리드로 표시
 * - 각 카드: 이모지 + 제목 + 부제 + 카테고리 뱃지
 * - 탭 → onSelect 콜백
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import {
  EXTREME_SCENARIOS,
  CATEGORY_COLORS,
  type ExtremeScenario,
} from '../../data/whatIfScenarios';

// ============================================================================
// 타입
// ============================================================================

export interface ExtremeScenarioGridProps {
  selectedId: string | null;
  onSelect: (scenario: ExtremeScenario) => void;
  disabled?: boolean;
}

// ============================================================================
// 컴포넌트
// ============================================================================

export const ExtremeScenarioGrid: React.FC<ExtremeScenarioGridProps> = ({
  selectedId,
  onSelect,
  disabled,
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        시나리오를 선택하세요
      </Text>
      <Text style={[styles.sectionDesc, { color: colors.textTertiary }]}>
        시나리오 열람은 무료, 내 포트폴리오 시뮬레이션은 2C
      </Text>

      <View style={styles.grid}>
        {EXTREME_SCENARIOS.map((scenario) => {
          const isSelected = selectedId === scenario.id;
          const catColor = CATEGORY_COLORS[scenario.category];

          return (
            <TouchableOpacity
              key={scenario.id}
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
              onPress={() => onSelect(scenario)}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <Text style={styles.emoji}>{scenario.emoji}</Text>
              <Text
                style={[styles.cardTitle, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {scenario.title}
              </Text>
              <Text
                style={[styles.cardSubtitle, { color: colors.textTertiary }]}
                numberOfLines={2}
              >
                {scenario.subtitle}
              </Text>
              <View style={[styles.categoryBadge, { backgroundColor: catColor + '20' }]}>
                <Text style={[styles.categoryText, { color: catColor }]}>
                  {scenario.categoryLabel}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 14,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '47%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  emoji: {
    fontSize: 36,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 17,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ExtremeScenarioGrid;
