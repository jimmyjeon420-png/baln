/**
 * CafeTableList — 카페 테이블 목록 (토픽별 대화 공간)
 *
 * 역할: "카페 테이블 배치도" — 4개의 주제별 테이블이 있고,
 *       각 테이블에 몇 명이 앉아있는지 보여줌
 * 비유: 카페에 들어서면 보이는 테이블들 — "시장 이야기", "종목 토론" 등
 *       테이블에 앉으면 해당 주제 게시글만 볼 수 있음
 *
 * 사용처:
 * - app/(tabs)/lounge.tsx 라운지 탭 커뮤니티 섹션 상단
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../context/LocaleContext';
import { CAFE_TABLES, type CafeTable } from '../../data/cafeConfig';

// =============================================================================
// 타입
// =============================================================================

interface CafeTableListProps {
  /** 테이블별 참여자 수 { tableId: count } (선택적) */
  participantCounts?: Record<string, number>;
  /** 테이블 탭 콜백 (카테고리 필터로 연결) */
  onSelectTable: (table: CafeTable) => void;
  /** 현재 선택된 테이블 ID (하이라이트용) */
  selectedTableId?: string | null;
}

// =============================================================================
// 개별 테이블 카드
// =============================================================================

interface TableCardProps {
  table: CafeTable;
  participantCount: number;
  isSelected: boolean;
  isKo: boolean;
  onPress: () => void;
  colors: any;
}

function TableCard({ table, participantCount, isSelected, isKo, onPress, colors }: TableCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.tableCard,
        {
          backgroundColor: isSelected
            ? colors.primary + '15'
            : colors.surface,
          borderColor: isSelected
            ? colors.primary
            : colors.border,
        },
      ]}
    >
      {/* 테이블 이모지 */}
      <Text style={styles.tableEmoji}>{table.emoji}</Text>

      {/* 테이블 이름 */}
      <Text
        style={[
          styles.tableName,
          {
            color: isSelected
              ? colors.primary
              : colors.textPrimary,
          },
        ]}
        numberOfLines={1}
      >
        {isKo ? table.nameKo : table.nameEn}
      </Text>

      {/* 참여자 수 */}
      <View style={[styles.countBadge, { backgroundColor: colors.background }]}>
        <Text style={[styles.countText, { color: colors.textSecondary }]}>
          {participantCount > 0 ? participantCount : '-'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// =============================================================================
// 메인 컴포넌트
// =============================================================================

function CafeTableList({
  participantCounts = {},
  onSelectTable,
  selectedTableId,
}: CafeTableListProps): React.ReactElement {
  const { colors } = useTheme();
  const { language } = useLocale();
  const isKo = language === 'ko';

  return (
    <View style={styles.container}>
      {/* 섹션 헤더 */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {isKo ? '테이블에 앉기' : 'Pick a Table'}
      </Text>

      {/* 가로 스크롤 테이블 목록 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        contentContainerStyle={styles.scrollContent}
      >
        {CAFE_TABLES.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            participantCount={participantCounts[table.id] ?? 0}
            isSelected={selectedTableId === table.id}
            isKo={isKo}
            onPress={() => onSelectTable(table)}
            colors={colors}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// =============================================================================
// 스타일
// =============================================================================

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 10,
  },
  tableCard: {
    width: 100,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 6,
  },
  tableEmoji: {
    fontSize: 24,
  },
  tableName: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 28,
    alignItems: 'center',
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default CafeTableList;
