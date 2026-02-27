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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { CharacterAvatar } from '../character/CharacterAvatar';
import { GURU_CHARACTER_CONFIGS } from '../../data/guruCharacterConfig';
import { useLocale } from '../../context/LocaleContext';
import { formatDateWithTime, formatCompactAmount, isKoreanLocale } from '../../utils/formatters';


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

  /** 분석 탭으로 이동 콜백 */
  onAnalysisPress?: () => void;

  /** 개별 자산 클릭 콜백 (자산 이름 전달) */
  onAssetPress?: (assetName: string) => void;

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

  /** 선택한 투자 구루 ID (buffett, dalio 등, optional) */
  selectedGuruId?: string | null;
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

function formatDateLocale(weekdayNames: string[]): string {
  return formatDateWithTime(new Date(), weekdayNames);
}

// ============================================================================
// 금액 포맷 유틸 (억/만 단위)
// ============================================================================

function formatAssetAmount(amount: number): string {
  return formatCompactAmount(amount);
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
  onAnalysisPress,
  onAssetPress,
  healthFactors,
  totalAssets,
  dailyChangeRate,
  selectedGuruId,
}: HealthSignalCardProps) => {
  const [showDetail, setShowDetail] = useState(false);
  const { colors } = useTheme();
  const { t } = useLocale();
  const signalColor = getSignalColor(healthScore, colors.textSecondary);
  const signalEmoji = getSignalEmoji(healthScore);

  const weekdayNames = [
    t('health.weekdays.sun'),
    t('health.weekdays.mon'),
    t('health.weekdays.tue'),
    t('health.weekdays.wed'),
    t('health.weekdays.thu'),
    t('health.weekdays.fri'),
    t('health.weekdays.sat'),
  ];

  // ──────────────────────────────────────────────────────────────────────
  // 로딩 상태
  // ──────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>{formatDateLocale(weekdayNames)}</Text>
          <Text style={[styles.cardLogo, { color: colors.textSecondary }]}>bal<Text style={{ color: '#4CAF50' }}>n</Text></Text>
        </View>
        <View style={styles.centerArea}>
          <ActivityIndicator size="large" color={colors.textSecondary} />
          <Text style={[styles.loadingText, { marginTop: 16, color: colors.textSecondary }]}>
            {t('health.loading_text')}
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
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>{formatDateLocale(weekdayNames)}</Text>
          <Text style={[styles.cardLogo, { color: colors.textSecondary }]}>bal<Text style={{ color: '#4CAF50' }}>n</Text></Text>
        </View>
        <View style={styles.centerArea}>
          <Text style={styles.emptyEmoji}>❤️</Text>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('health.empty.title')}</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>{t('health.empty.subtitle')}</Text>
          {onAddAssets && (
            <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={onAddAssets}>
              <Text style={[styles.addButtonText, { color: '#FFFFFF' }]}>{t('health.empty.add_button')}</Text>
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
      {/* 상단: 날짜 + 구루 아바타 + baln 로고 */}
      <View style={styles.headerRow}>
        <Text style={[styles.dateText, { color: colors.textSecondary }]}>{formatDateLocale(weekdayNames)}</Text>
        <View style={styles.headerRight}>
          {selectedGuruId && GURU_CHARACTER_CONFIGS[selectedGuruId] && (
            <View style={styles.guruAvatarMini}>
              <CharacterAvatar
                guruId={selectedGuruId}
                size="sm"
                expression="neutral"
                fallbackEmoji={GURU_CHARACTER_CONFIGS[selectedGuruId]?.emoji}
              />
            </View>
          )}
          <Text style={[styles.cardLogo, { color: colors.textSecondary }]}>bal<Text style={{ color: '#4CAF50' }}>n</Text></Text>
        </View>
      </View>

      {/* 중앙: 거대 신호등 */}
      <TouchableOpacity style={styles.centerArea} onPress={() => setShowDetail(true)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`${t('format.context_health_score')} ${healthScore}${t('format.score_unit')}`}>
        <Text style={styles.signalEmoji}>{signalEmoji}</Text>
        <Text style={[styles.gradeLabel, { color: signalColor }]}>
          {gradeLabel || t('health.grade_analyzing')} {healthGrade ? t('format.grade_suffix', { grade: healthGrade }) : ''}
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
            {t('health.pulse.total_assets')} {formatAssetAmount(totalAssets)}
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
                {t('health.pulse.daily_change_label')} {dailyChangeRate >= 0 ? '+' : ''}{dailyChangeRate.toFixed(1)}%
              </Text>
            </>
          )}
        </View>
      )}

      {/* 분석 탭 CTA (건강 점수 80 미만 시 표시) */}
      {onAnalysisPress && healthScore !== null && healthScore < 80 && (
        <TouchableOpacity
          style={[styles.analysisCTA, { backgroundColor: signalColor + '15' }]}
          onPress={onAnalysisPress}
          activeOpacity={0.7}
        >
          <Ionicons name="analytics-outline" size={16} color={signalColor} />
          <Text style={[styles.analysisCTAText, { color: signalColor }]}>
            {t('health.analysis_cta')}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={signalColor} />
        </TouchableOpacity>
      )}

      {/* 하단: 관심자산 미니 신호등 + 자산 추가 */}
      <View style={styles.assetsArea}>
        {assetSignals.length > 0 && (
          <View style={styles.assetsList}>
            {assetSignals.slice(0, 5).map((asset, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.assetChip, { backgroundColor: colors.surfaceLight }]}
                onPress={() => onAssetPress?.(asset.name)}
                activeOpacity={onAssetPress ? 0.7 : 1}
                disabled={!onAssetPress}
              >
                <Text style={[styles.assetName, { color: colors.textPrimary }]} numberOfLines={1}>{asset.name}</Text>
                <Text style={styles.assetSignal}>
                  {getMiniSignalEmoji(asset.signal)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {onAddAssets && (
          <TouchableOpacity style={[styles.addAssetChip, { backgroundColor: colors.primary }]} onPress={onAddAssets}>
            <Text style={[styles.addAssetChipIcon, { color: '#FFFFFF' }]}>+</Text>
            <Text style={[styles.addAssetChipText, { color: '#FFFFFF' }]}>{t('health.add_asset_chip')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 상세 모달 */}
      <Modal
        visible={showDetail}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetail(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('health.modal.title')}</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                {t('health.modal.subtitle')}
              </Text>
              <View style={styles.modalScoreBox}>
                <Text style={[styles.modalScore, { color: colors.textPrimary }]}>{healthScore}</Text>
                <Text style={[styles.modalGrade, { color: colors.textSecondary }]}>{gradeLabel || t('health.grade_analyzing')} {healthGrade ? t('format.grade_suffix', { grade: healthGrade }) : ''}</Text>
              </View>

              {/* 6팩터 상세 */}
              {healthFactors && healthFactors.length > 0 && (
                <View style={[styles.factorsContainer, { borderTopColor: colors.border }]}>
                  <Text style={[styles.factorsTitle, { color: colors.textPrimary }]}>{t('health.modal.factors_title')}</Text>
                  {healthFactors.map((factor, index) => (
                    <View key={index} style={styles.factorRow}>
                      <View style={styles.factorLeft}>
                        <Text style={[styles.factorLabel, { color: colors.textPrimary }]}>{factor.label}</Text>
                        <Text style={[styles.factorWeight, { color: colors.textSecondary }]}>{t('health.modal.weight_label')} {factor.weight}%</Text>
                      </View>
                      <Text style={[
                        styles.factorScore,
                        { color: factor.score >= 70 ? '#4CAF50' : factor.score >= 50 ? '#FFB74D' : '#CF6679' }
                      ]}>
                        {factor.score}{t('format.score_unit')}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[styles.modalCloseButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowDetail(false)}
              >
                <Text style={[styles.modalCloseText, { color: '#FFFFFF' }]}>{t('health.modal.close_button')}</Text>
              </TouchableOpacity>
            </ScrollView>
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
    prevProps.dailyChangeRate !== nextProps.dailyChangeRate ||
    prevProps.selectedGuruId !== nextProps.selectedGuruId ||
    prevProps.onAnalysisPress !== nextProps.onAnalysisPress ||
    prevProps.onAssetPress !== nextProps.onAssetPress
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guruAvatarMini: {
    transform: [{ scale: 0.6 }],
    marginRight: -8,
  },
  dateText: {
    fontSize: 13,
    flexShrink: 1,
  },
  cardLogo: {
    fontSize: 17,
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
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: '800',
    lineHeight: 56,
  },
  scoreDivider: {
    fontSize: 24,
    fontWeight: '300',
    marginHorizontal: 4,
  },
  scoreMax: {
    fontSize: 24,
    fontWeight: '300',
  },
  loadingText: {
    fontSize: 17,
  },
  emptyEmoji: {
    fontSize: 72,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 23,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 17,
    marginBottom: 32,
  },
  addButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  addButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  // 총 자산 Pulse 행
  assetPulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  assetPulseText: {
    fontSize: 13,
    fontWeight: '600',
  },
  assetPulseDivider: {
    fontSize: 13,
  },
  assetPulseChange: {
    fontSize: 13,
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
    maxWidth: 140,
  },
  assetName: {
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
  },
  assetSignal: {
    fontSize: 15,
  },
  addAssetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 6,
    marginTop: 12,
    minHeight: 44,
  },
  addAssetChipIcon: {
    fontSize: 19,
    fontWeight: '700',
  },
  addAssetChipText: {
    fontSize: 15,
    fontWeight: '600',
  },
  analysisCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  analysisCTAText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxHeight: '80%',
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 15,
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
    fontSize: 17,
    marginTop: 8,
  },
  modalCloseButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
    marginTop: 16,
  },
  modalCloseText: {
    fontSize: 17,
    fontWeight: '600',
  },
  factorsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  factorsTitle: {
    fontSize: 17,
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
    fontSize: 15,
    marginBottom: 2,
  },
  factorWeight: {
    fontSize: 13,
  },
  factorScore: {
    fontSize: 19,
    fontWeight: '700',
  },
});
