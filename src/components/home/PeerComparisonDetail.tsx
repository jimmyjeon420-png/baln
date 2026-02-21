/**
 * PeerComparisonDetail — 또래 비교 상세 모달
 *
 * 역할: PeerComparisonCard에서 "더 보기" 시 펼쳐지는 상세 비교 화면
 * 비유: 성적표의 상세 분석 페이지 — 과목별 등수, 개선 방향 제시
 *
 * 표시 내용:
 * 1. 전체 비교 요약 (내 순위 시각화)
 * 2. 각 항목별 상세 수치 + 또래 분포
 * 3. 개선 팁 (약한 항목에 대한 조언)
 *
 * 원칙: 익명 통계만 사용, 개인정보 노출 금지
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

// ============================================================================
// Props 인터페이스
// ============================================================================

export interface PeerComparisonDetailProps {
  /** 모달 표시 여부 */
  visible: boolean;
  /** 모달 닫기 핸들러 */
  onClose: () => void;
  /** 자산 구간 라벨 */
  myBracket: string;
  /** 내 백분위 (상위 몇 %) */
  myPercentile: number;
  /** 비교 항목 상세 데이터 */
  details: PeerComparisonItem[];
}

export interface PeerComparisonItem {
  /** 항목 라벨 (예: "건강 점수") */
  label: string;
  /** 항목 아이콘 */
  icon: keyof typeof Ionicons.glyphMap;
  /** 내 값 (표시용) */
  myValue: string;
  /** 또래 평균 값 (표시용) */
  peerAvgValue: string;
  /** 내가 또래보다 높은지 */
  isBetter: boolean;
  /** 개선 팁 (약한 항목일 때) */
  tip?: string;
}

// ============================================================================
// 서브 컴포넌트: 상세 비교 항목 카드
// ============================================================================

function DetailItem({ item }: { item: PeerComparisonItem }) {
  const { colors } = useTheme();
  const statusColor = item.isBetter ? colors.success : colors.warning;

  return (
    <View style={[s.detailItem, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
      {/* 항목 헤더 */}
      <View style={s.detailHeader}>
        <View style={s.detailLabelRow}>
          <Ionicons name={item.icon} size={20} color={statusColor} />
          <Text style={[s.detailLabel, { color: colors.textPrimary }]}>
            {item.label}
          </Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: statusColor + '15' }]}>
          <Ionicons
            name={item.isBetter ? 'checkmark-circle' : 'alert-circle'}
            size={14}
            color={statusColor}
          />
          <Text style={[s.statusText, { color: statusColor }]}>
            {item.isBetter ? '또래 이상' : '개선 여지'}
          </Text>
        </View>
      </View>

      {/* 수치 비교 */}
      <View style={s.valuesRow}>
        <View style={s.valueBlock}>
          <Text style={[s.valueSmallLabel, { color: colors.textTertiary }]}>나</Text>
          <Text style={[s.valueBig, { color: statusColor }]}>{item.myValue}</Text>
        </View>
        <View style={[s.vsDivider, { backgroundColor: colors.border }]} />
        <View style={s.valueBlock}>
          <Text style={[s.valueSmallLabel, { color: colors.textTertiary }]}>또래 평균</Text>
          <Text style={[s.valueBig, { color: colors.textSecondary }]}>{item.peerAvgValue}</Text>
        </View>
      </View>

      {/* 개선 팁 (약한 항목일 때만) */}
      {!item.isBetter && item.tip && (
        <View style={[s.tipContainer, { backgroundColor: colors.warning + '10' }]}>
          <Ionicons name="bulb-outline" size={14} color={colors.warning} />
          <Text style={[s.tipText, { color: colors.textSecondary }]}>
            {item.tip}
          </Text>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function PeerComparisonDetail({
  visible,
  onClose,
  myBracket,
  myPercentile,
  details,
}: PeerComparisonDetailProps) {
  const { colors } = useTheme();

  const isTopPerformer = myPercentile <= 30;
  const betterCount = details.filter((d) => d.isBetter).length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[s.modalContainer, { backgroundColor: colors.background }]}>
        {/* 모달 헤더 */}
        <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
          <View>
            <Text style={[s.modalTitle, { color: colors.textPrimary }]}>
              또래 비교 상세
            </Text>
            <Text style={[s.modalSubtitle, { color: colors.textTertiary }]}>
              💰 {myBracket} 구간 기준
            </Text>
          </View>
          <TouchableOpacity
            style={[s.closeButton, { backgroundColor: colors.surfaceLight }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 종합 요약 */}
          <View style={[s.summaryCard, { backgroundColor: colors.surface }]}>
            <View style={s.summaryTop}>
              <View style={[s.rankCircle, { borderColor: isTopPerformer ? colors.success : colors.warning }]}>
                <Text style={[s.rankNumber, { color: isTopPerformer ? colors.success : colors.warning }]}>
                  {myPercentile}%
                </Text>
                <Text style={[s.rankLabel, { color: colors.textTertiary }]}>상위</Text>
              </View>
              <View style={s.summaryTextBlock}>
                <Text style={[s.summaryMainText, { color: colors.textPrimary }]}>
                  {betterCount}개 항목에서 또래 이상
                </Text>
                <Text style={[s.summarySubText, { color: colors.textTertiary }]}>
                  {details.length}개 항목 중 {betterCount}개에서 또래 평균을 넘었습니다
                </Text>
              </View>
            </View>
          </View>

          {/* 항목별 상세 */}
          {details.map((item, index) => (
            <DetailItem key={index} item={item} />
          ))}

          {/* 하단 안내 */}
          <Text style={[s.footerDisclaimer, { color: colors.textQuaternary }]}>
            모든 비교 데이터는 익명 통계를 기반으로 하며,{'\n'}
            다른 사용자의 개인정보는 포함되지 않습니다.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const s = StyleSheet.create({
  // 모달 컨테이너
  modalContainer: {
    flex: 1,
  },

  // 모달 헤더
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 스크롤 영역
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // 종합 요약 카드
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rankCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: {
    fontSize: 21,
    fontWeight: '800',
  },
  rankLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: -2,
  },
  summaryTextBlock: {
    flex: 1,
  },
  summaryMainText: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  summarySubText: {
    fontSize: 14,
    lineHeight: 19,
  },

  // 상세 항목 카드
  detailItem: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  detailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // 수치 비교
  valuesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  valueSmallLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  valueBig: {
    fontSize: 23,
    fontWeight: '700',
  },
  vsDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 16,
  },

  // 개선 팁
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 19,
    flex: 1,
  },

  // 하단 고지
  footerDisclaimer: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 8,
    marginBottom: 40,
  },
});
