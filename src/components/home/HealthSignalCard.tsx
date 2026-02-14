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

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';


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
  assetSignals: {
    name: string;
    signal: 'green' | 'yellow' | 'red';
  }[];

  /** 자산 등록 여부 */
  hasAssets: boolean;

  /** 로딩 상태 */
  isLoading: boolean;

  /** 자산 추가 버튼 콜백 */
  onAddAssets?: () => void;

  /** 6팩터 상세 데이터 (optional) */
  healthFactors?: {
    label: string;
    score: number;
    weight: number; // 0~100 (가중치 %)
  }[];

  /** 총 자산 금액 (원, optional) */
  totalAssets?: number;

  /** 전일 대비 수익률 (%, optional) */
  dailyChangeRate?: number | null;
}

// ============================================================================
// 신호등 색상 매핑 (시맨틱 컬러 - 테마 불변)
// ============================================================================

function getSignalColor(score: number | null, fallbackColor: string): string {
  if (score === null) return fallbackColor;
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
// 금액 포맷 유틸 (억/만 단위)
// ============================================================================

function formatAssetAmount(amount: number): string {
  if (amount >= 100000000) {
    // 1억 이상: "1.2억"
    const eok = amount / 100000000;
    return eok >= 10 ? `${Math.round(eok)}억` : `${eok.toFixed(1)}억`;
  }
  if (amount >= 10000) {
    // 1만 이상: "5,000만"
    const man = Math.round(amount / 10000);
    return `${man.toLocaleString()}만`;
  }
  return `${amount.toLocaleString()}`;
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

const HealthSignalCard = React.memo(({
  healthScore,
  healthGrade,
  gradeLabel,
  assetSignals,
  hasAssets,
  isLoading,
  onAddAssets,
  healthFactors,
  totalAssets,
  dailyChangeRate,
}: HealthSignalCardProps) => {
  const [showDetail, setShowDetail] = useState(false);
  const { colors } = useTheme();
  const signalColor = getSignalColor(healthScore, colors.textSecondary);
  const signalEmoji = getSignalEmoji(healthScore);

  // ──────────────────────────────────────────────────────────────────────
  // 로딩 상태
  // ──────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>{formatDate()}</Text>
          <Text style={[styles.cardLogo, { color: colors.textSecondary }]}>bal<Text style={{ color: '#4CAF50' }}>n</Text></Text>
        </View>
        <View style={styles.centerArea}>
          <ActivityIndicator size="large" color={colors.textSecondary} />
          <Text style={[styles.loadingText, { marginTop: 16, color: colors.textSecondary }]}>
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
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>{formatDate()}</Text>
          <Text style={[styles.cardLogo, { color: colors.textSecondary }]}>bal<Text style={{ color: '#4CAF50' }}>n</Text></Text>
        </View>
        <View style={styles.centerArea}>
          <Text style={styles.emptyEmoji}>❤️</Text>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>내 투자 건강이 궁금하다면</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>자산을 하트해주세요</Text>
          {onAddAssets && (
            <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={onAddAssets}>
              <Text style={[styles.addButtonText, { color: colors.textPrimary }]}>자산 추가하기</Text>
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
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* 상단: 날짜 + baln 로고 */}
      <View style={styles.headerRow}>
        <Text style={[styles.dateText, { color: colors.textSecondary }]}>{formatDate()}</Text>
        <Text style={[styles.cardLogo, { color: colors.textSecondary }]}>bal<Text style={{ color: '#4CAF50' }}>n</Text></Text>
      </View>

      {/* 중앙: 거대 신호등 */}
      <TouchableOpacity style={styles.centerArea} onPress={() => setShowDetail(true)} activeOpacity={0.7}>
        <Text style={styles.signalEmoji}>{signalEmoji}</Text>
        <Text style={[styles.gradeLabel, { color: signalColor }]}>
          {gradeLabel} ({healthGrade}등급)
        </Text>
        <View style={styles.scoreRow}>
          <Text style={[styles.scoreNumber, { color: signalColor }]}>
            {healthScore}
          </Text>
          <Text style={[styles.scoreDivider, { color: colors.textSecondary }]}>/</Text>
          <Text style={[styles.scoreMax, { color: colors.textSecondary }]}>100</Text>
        </View>
      </TouchableOpacity>

      {/* 총 자산 요약 한 줄 (Pulse) */}
      {totalAssets != null && totalAssets > 0 && (
        <View style={[styles.assetPulseRow, { backgroundColor: colors.surfaceLight }]}>
          <Text style={[styles.assetPulseText, { color: colors.textPrimary }]}>
            총 자산 {formatAssetAmount(totalAssets)}
          </Text>
          {dailyChangeRate != null && (
            <>
              <Text style={[styles.assetPulseDivider, { color: colors.textTertiary }]}> | </Text>
              <Text
                style={[
                  styles.assetPulseChange,
                  { color: dailyChangeRate >= 0 ? '#4CAF50' : '#CF6679' },
                ]}
              >
                어제 대비 {dailyChangeRate >= 0 ? '+' : ''}{dailyChangeRate.toFixed(1)}%
              </Text>
            </>
          )}
        </View>
      )}

      {/* 하단: 관심자산 미니 신호등 + 자산 추가 */}
      <View style={styles.assetsArea}>
        {assetSignals.length > 0 && (
          <View style={styles.assetsList}>
            {assetSignals.slice(0, 5).map((asset, index) => (
              <View key={index} style={[styles.assetChip, { backgroundColor: colors.surfaceLight }]}>
                <Text style={[styles.assetName, { color: colors.textPrimary }]}>{asset.name}</Text>
                <Text style={styles.assetSignal}>
                  {getMiniSignalEmoji(asset.signal)}
                </Text>
              </View>
            ))}
          </View>
        )}
        {onAddAssets && (
          <TouchableOpacity style={[styles.addAssetChip, { backgroundColor: colors.primary }]} onPress={onAddAssets}>
            <Text style={[styles.addAssetChipIcon, { color: colors.textPrimary }]}>+</Text>
            <Text style={[styles.addAssetChipText, { color: colors.textPrimary }]}>자산 추가</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 스와이프 힌트 */}
      <Text style={[styles.swipeHint, { color: colors.textSecondary }]}>스와이프하여 다음 카드 →</Text>

      {/* 상세 모달 */}
      <Modal
        visible={showDetail}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetail(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>건강 점수 상세</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              6팩터 기반 복합 점수입니다
            </Text>
            <View style={styles.modalScoreBox}>
              <Text style={[styles.modalScore, { color: colors.textPrimary }]}>{healthScore}</Text>
              <Text style={[styles.modalGrade, { color: colors.textSecondary }]}>{gradeLabel} ({healthGrade}등급)</Text>
            </View>

            {/* 6팩터 상세 */}
            {healthFactors && healthFactors.length > 0 && (
              <View style={[styles.factorsContainer, { borderTopColor: colors.border }]}>
                <Text style={[styles.factorsTitle, { color: colors.textPrimary }]}>6팩터 상세</Text>
                {healthFactors.map((factor, index) => (
                  <View key={index} style={styles.factorRow}>
                    <View style={styles.factorLeft}>
                      <Text style={[styles.factorLabel, { color: colors.textPrimary }]}>{factor.label}</Text>
                      <Text style={[styles.factorWeight, { color: colors.textSecondary }]}>가중치 {factor.weight}%</Text>
                    </View>
                    <Text style={[
                      styles.factorScore,
                      { color: factor.score >= 70 ? '#4CAF50' : factor.score >= 50 ? '#FFB74D' : '#CF6679' }
                    ]}>
                      {factor.score}점
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.modalCloseButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowDetail(false)}
            >
              <Text style={[styles.modalCloseText, { color: colors.textPrimary }]}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}, (prevProps, nextProps) => {
  // 성능 최적화: props 비교 함수 (변경 없으면 리렌더링 스킵)
  // JSON.stringify 대신 배열 길이 + 요소별 비교로 성능 개선
  if (
    prevProps.healthScore !== nextProps.healthScore ||
    prevProps.healthGrade !== nextProps.healthGrade ||
    prevProps.gradeLabel !== nextProps.gradeLabel ||
    prevProps.hasAssets !== nextProps.hasAssets ||
    prevProps.isLoading !== nextProps.isLoading ||
    prevProps.totalAssets !== nextProps.totalAssets ||
    prevProps.dailyChangeRate !== nextProps.dailyChangeRate
  ) {
    return false;
  }

  // assetSignals 얕은 비교
  const prevSignals = prevProps.assetSignals;
  const nextSignals = nextProps.assetSignals;
  if (prevSignals.length !== nextSignals.length) return false;
  for (let i = 0; i < prevSignals.length; i++) {
    if (prevSignals[i].name !== nextSignals[i].name || prevSignals[i].signal !== nextSignals[i].signal) {
      return false;
    }
  }

  // healthFactors 얕은 비교
  const prevFactors = prevProps.healthFactors;
  const nextFactors = nextProps.healthFactors;
  if (prevFactors?.length !== nextFactors?.length) return false;
  if (prevFactors && nextFactors) {
    for (let i = 0; i < prevFactors.length; i++) {
      if (
        prevFactors[i].label !== nextFactors[i].label ||
        prevFactors[i].score !== nextFactors[i].score ||
        prevFactors[i].weight !== nextFactors[i].weight
      ) {
        return false;
      }
    }
  }

  return true;
});

export default HealthSignalCard;

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  card: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 24,
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 14,
  },
  cardLogo: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signalEmoji: {
    fontSize: 88,
    marginBottom: 16,
  },
  gradeLabel: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 10,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreNumber: {
    fontSize: 56,
    fontWeight: '800',
    lineHeight: 64,
  },
  scoreDivider: {
    fontSize: 28,
    fontWeight: '300',
    marginHorizontal: 4,
  },
  scoreMax: {
    fontSize: 28,
    fontWeight: '300',
  },
  loadingText: {
    fontSize: 16,
  },
  emptyEmoji: {
    fontSize: 72,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    marginBottom: 32,
  },
  addButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // 총 자산 Pulse 행
  assetPulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  assetPulseText: {
    fontSize: 14,
    fontWeight: '600',
  },
  assetPulseDivider: {
    fontSize: 14,
  },
  assetPulseChange: {
    fontSize: 14,
    fontWeight: '600',
  },
  assetsArea: {
    marginTop: 12,
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
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  assetName: {
    fontSize: 14,
    fontWeight: '500',
  },
  assetSignal: {
    fontSize: 16,
  },
  addAssetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 6,
    marginTop: 12,
  },
  addAssetChipIcon: {
    fontSize: 18,
    fontWeight: '700',
  },
  addAssetChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  swipeHint: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  modalScoreBox: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 20,
  },
  modalScore: {
    fontSize: 48,
    fontWeight: '800',
  },
  modalGrade: {
    fontSize: 16,
    marginTop: 8,
  },
  modalCloseButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
  },
  factorsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  factorsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  factorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  factorLeft: {
    flex: 1,
  },
  factorLabel: {
    fontSize: 14,
    marginBottom: 2,
  },
  factorWeight: {
    fontSize: 12,
  },
  factorScore: {
    fontSize: 18,
    fontWeight: '700',
  },
});
