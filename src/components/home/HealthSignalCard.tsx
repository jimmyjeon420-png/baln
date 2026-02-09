/**
 * HealthSignalCard.tsx - 건강 신호등 카드
 *
 * 역할: "투자 건강 신호등 디스플레이"
 * - 가격 대신 건강 점수로 표시
 * - 🟢🟡🔴 3색 신호등 중심 UI
 * - 개별 자산별 미니 신호등 표시
 *
 * Anti-Toss 원칙:
 * - Gateway: 30초 안에 건강 상태 파악
 * - Heart/Like: 가격 표시 없음, 건강 점수만
 * - One Page One Card: 스크롤 없이 한눈에
 * - 보험 BM: 신호등은 무료, 상세 분석은 프리미엄
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { COLORS, SIZES } from '../../styles/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================================================
// Props 인터페이스
// ============================================================================

interface HealthSignalCardProps {
  /** 종합 건강 점수 (0~100, null이면 로딩/미등록) */
  healthScore: number | null;

  /** 건강 등급 ('S'|'A'|'B'|'C'|'D', null이면 미등록) */
  healthGrade: string | null;

  /** 등급 라벨 ('최적'|'양호'|'보통'|'주의'|'개선필요', null이면 미등록) */
  gradeLabel: string | null;

  /** 관심자산별 개별 신호등 (최대 5개) */
  assetSignals: Array<{
    name: string;
    signal: 'green' | 'yellow' | 'red';
  }>;

  /** 자산 등록 여부 */
  hasAssets: boolean;

  /** 로딩 상태 */
  isLoading: boolean;

  /** 자산 추가 버튼 콜백 */
  onAddAssets?: () => void;
}

// ============================================================================
// 신호등 색상 매핑
// ============================================================================

function getSignalColor(score: number | null): string {
  if (score === null) return COLORS.textSecondary;
  if (score >= 75) return '#4CAF50'; // 🟢 초록
  if (score >= 50) return '#FFB74D'; // 🟡 노랑
  return '#CF6679'; // 🔴 빨강
}

function getSignalEmoji(score: number | null): string {
  if (score === null) return '⚪';
  if (score >= 75) return '🟢';
  if (score >= 50) return '🟡';
  return '🔴';
}

function getMiniSignalEmoji(signal: 'green' | 'yellow' | 'red'): string {
  const map = { green: '🟢', yellow: '🟡', red: '🔴' };
  return map[signal];
}

// ============================================================================
// 날짜 포맷 유틸
// ============================================================================

function formatDate(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const weekday = weekdays[now.getDay()];
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${month}월 ${day}일 ${weekday} · ${hours}:${minutes}`;
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function HealthSignalCard({
  healthScore,
  healthGrade,
  gradeLabel,
  assetSignals,
  hasAssets,
  isLoading,
  onAddAssets,
}: HealthSignalCardProps) {
  const signalColor = getSignalColor(healthScore);
  const signalEmoji = getSignalEmoji(healthScore);

  // ──────────────────────────────────────────────────────────────────────
  // 로딩 상태
  // ──────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.card}>
        <Text style={styles.dateText}>{formatDate()}</Text>
        <View style={styles.centerArea}>
          <ActivityIndicator size="large" color={COLORS.textSecondary} />
          <Text style={[styles.loadingText, { marginTop: 16 }]}>
            건강 점수를 계산하고 있어요
          </Text>
        </View>
      </View>
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // Empty 상태 (자산 미등록)
  // ──────────────────────────────────────────────────────────────────────
  if (!hasAssets || healthScore === null) {
    return (
      <View style={styles.card}>
        <Text style={styles.dateText}>{formatDate()}</Text>
        <View style={styles.centerArea}>
          <Text style={styles.emptyEmoji}>❤️</Text>
          <Text style={styles.emptyTitle}>내 투자 건강이 궁금하다면</Text>
          <Text style={styles.emptySubtitle}>자산을 하트해주세요</Text>
          {onAddAssets && (
            <TouchableOpacity style={styles.addButton} onPress={onAddAssets}>
              <Text style={styles.addButtonText}>자산 추가하기</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // 데이터 상태 (건강 점수 표시)
  // ──────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.card}>
      {/* 상단: 날짜 */}
      <Text style={styles.dateText}>{formatDate()}</Text>

      {/* 중앙: 거대 신호등 */}
      <View style={styles.centerArea}>
        <Text style={styles.signalEmoji}>{signalEmoji}</Text>
        <Text style={[styles.gradeLabel, { color: signalColor }]}>
          {gradeLabel} ({healthGrade}등급)
        </Text>
        <View style={styles.scoreRow}>
          <Text style={[styles.scoreNumber, { color: signalColor }]}>
            {healthScore}
          </Text>
          <Text style={styles.scoreDivider}>/</Text>
          <Text style={styles.scoreMax}>100</Text>
        </View>
      </View>

      {/* 하단: 관심자산 미니 신호등 */}
      {assetSignals.length > 0 && (
        <View style={styles.assetsArea}>
          <View style={styles.assetsList}>
            {assetSignals.slice(0, 5).map((asset, index) => (
              <View key={index} style={styles.assetChip}>
                <Text style={styles.assetName}>{asset.name}</Text>
                <Text style={styles.assetSignal}>
                  {getMiniSignalEmoji(asset.signal)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const CARD_HEIGHT = SCREEN_HEIGHT * 0.75;

const styles = StyleSheet.create({
  card: {
    height: CARD_HEIGHT,
    marginHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signalEmoji: {
    fontSize: 100,
    marginBottom: 20,
  },
  gradeLabel: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreNumber: {
    fontSize: 64,
    fontWeight: '800',
    lineHeight: 72,
  },
  scoreDivider: {
    fontSize: 32,
    fontWeight: '300',
    color: COLORS.textSecondary,
    marginHorizontal: 4,
  },
  scoreMax: {
    fontSize: 32,
    fontWeight: '300',
    color: COLORS.textSecondary,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 32,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  assetsArea: {
    marginTop: 20,
  },
  assetsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  assetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  assetName: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  assetSignal: {
    fontSize: 16,
  },
});
