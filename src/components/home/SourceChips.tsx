import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { SIZES } from '../../styles/theme';

// ============================================================================
// SourceChips — AI 분석 출처 칩 목록
//
// Morning Briefing 카드 하단에 표시되는 데이터 출처 레이블
// "이 분석은 어떤 데이터를 기반으로 했는가"를 사용자에게 투명하게 공개
// (달리오: "맥락을 제공하면 공포가 이해로 바뀐다")
// ============================================================================

interface SourceChipsProps {
  sources: string[];
}

const SourceChips = ({ sources }: SourceChipsProps) => {
  const { colors } = useTheme();

  if (!sources || sources.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textTertiary }]}>
        출처
      </Text>
      <View style={styles.chipRow}>
        {sources.map((src, idx) => (
          <View
            key={`src-${idx}`}
            style={[
              styles.chip,
              { backgroundColor: colors.surfaceLight, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.chipText, { color: colors.textTertiary }]}>
              {src}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default React.memo(SourceChips);

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginTop: SIZES.md,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: SIZES.xs,
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.xs,
  },
  chip: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    lineHeight: 16,
  },
});
