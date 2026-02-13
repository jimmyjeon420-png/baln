/**
 * 관리자용 신고 처리 화면
 *
 * 기능:
 * - 신고 목록 표시 (필터링: 전체/대기/승인/거부) + 건수 배지
 * - 요약 배너 (총 건수, 대기 건수, 처리율)
 * - 24시간 초과 대기 긴급 표시
 * - 신고 상세 정보 모달
 * - 액션: 콘텐츠 삭제 / 신고 승인 / 신고 거부
 *
 * 진입점: profile.tsx 개발 모드 메뉴 (추후 관리자 인증 추가)
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useReports, useUpdateReportStatus, useDeleteReportedContent } from '../../src/hooks/useReports';
import { ReportWithContent, ReportStatus, REPORT_REASON_LABELS } from '../../src/types/community';
import { COLORS } from '../../src/styles/theme';

type FilterStatus = 'all' | ReportStatus;

export default function AdminReportsScreen() {
  const router = useRouter();

  // 상태
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedReport, setSelectedReport] = useState<ReportWithContent | null>(null);

  // 쿼리 — 항상 전체 데이터를 가져온 뒤 클라이언트에서 필터링
  const { data: allReports, isLoading, error, refetch } = useReports();

  // 뮤테이션
  const updateStatusMutation = useUpdateReportStatus();
  const deleteContentMutation = useDeleteReportedContent();

  // ================================================================
  // 클라이언트 사이드 필터링 + 상태별 건수 계산
  // ================================================================

  const statusCounts = useMemo(() => {
    const reports = allReports ?? [];
    return {
      all: reports.length,
      pending: reports.filter((r) => r.status === 'pending').length,
      resolved: reports.filter((r) => r.status === 'resolved').length,
      rejected: reports.filter((r) => r.status === 'rejected').length,
    };
  }, [allReports]);

  const filteredReports = useMemo(() => {
    const reports = allReports ?? [];
    if (filterStatus === 'all') return reports;
    return reports.filter((r) => r.status === filterStatus);
  }, [allReports, filterStatus]);

  // 요약 배너 데이터
  const summaryRate = useMemo(() => {
    const total = statusCounts.all;
    if (total === 0) return 0;
    return Math.round(((statusCounts.resolved + statusCounts.rejected) / total) * 100);
  }, [statusCounts]);

  // 필터 버튼
  const filters: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'pending', label: '대기' },
    { key: 'resolved', label: '승인' },
    { key: 'rejected', label: '거부' },
  ];

  // ================================================================
  // 액션 핸들러
  // ================================================================

  // 콘텐츠 삭제
  const handleDeleteContent = () => {
    if (!selectedReport) return;

    Alert.alert(
      '콘텐츠 삭제',
      '신고된 콘텐츠를 삭제하고 신고를 승인하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteContentMutation.mutateAsync({
                reportId: selectedReport.id,
                targetType: selectedReport.target_type,
                targetId: selectedReport.target_id,
              });
              setSelectedReport(null);
              Alert.alert('완료', '콘텐츠가 삭제되었습니다.');
            } catch (err) {
              Alert.alert('오류', '삭제 중 오류가 발생했습니다.');
            }
          },
        },
      ]
    );
  };

  // 신고 승인 (콘텐츠 유지)
  const handleApproveReport = async () => {
    if (!selectedReport) return;

    try {
      await updateStatusMutation.mutateAsync({
        reportId: selectedReport.id,
        status: 'resolved',
      });
      setSelectedReport(null);
      Alert.alert('완료', '신고가 승인되었습니다.');
    } catch (err) {
      Alert.alert('오류', '처리 중 오류가 발생했습니다.');
    }
  };

  // 신고 거부
  const handleRejectReport = async () => {
    if (!selectedReport) return;

    try {
      await updateStatusMutation.mutateAsync({
        reportId: selectedReport.id,
        status: 'rejected',
      });
      setSelectedReport(null);
      Alert.alert('완료', '신고가 거부되었습니다.');
    } catch (err) {
      Alert.alert('오류', '처리 중 오류가 발생했습니다.');
    }
  };

  // ================================================================
  // 긴급도 판별 (24시간 초과 대기)
  // ================================================================

  const isUrgent = (item: ReportWithContent): boolean => {
    if (item.status !== 'pending') return false;
    return Date.now() - new Date(item.created_at).getTime() > 86400000;
  };

  // ================================================================
  // 렌더링 헬퍼
  // ================================================================

  // 상태 뱃지
  const renderStatusBadge = (status: ReportStatus) => {
    const config: Record<ReportStatus, { label: string; color: string }> = {
      pending: { label: '대기', color: COLORS.warning },
      resolved: { label: '승인', color: COLORS.primary },
      rejected: { label: '거부', color: COLORS.textSecondary },
    };
    const { label, color } = config[status];

    return (
      <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
        <Text style={[styles.statusBadgeText, { color }]}>{label}</Text>
      </View>
    );
  };

  // 신고 아이템
  const renderReportItem = ({ item }: { item: ReportWithContent }) => {
    const targetContent = item.target_content as any;
    const contentPreview = targetContent?.content?.substring(0, 50) || '(삭제된 콘텐츠)';
    const urgent = isUrgent(item);

    return (
      <TouchableOpacity style={styles.reportItem} onPress={() => setSelectedReport(item)}>
        <View style={styles.reportHeader}>
          <View style={styles.reportHeaderLeft}>
            <Ionicons
              name={item.target_type === 'post' ? 'document-text' : 'chatbox'}
              size={16}
              color={COLORS.textSecondary}
            />
            <Text style={styles.reportReason}>{REPORT_REASON_LABELS[item.reason]}</Text>
            {/* 긴급 표시: 24시간 초과 대기 */}
            {urgent && (
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentBadgeText}>!!</Text>
              </View>
            )}
          </View>
          {renderStatusBadge(item.status)}
        </View>

        <Text style={styles.contentPreview} numberOfLines={2}>
          {contentPreview}
        </Text>

        <View style={styles.reportFooter}>
          <Text style={styles.reportFooterText}>
            신고자: {item.reporter_display_tag}
          </Text>
          {item.duplicate_count && item.duplicate_count > 1 && (
            <Text style={styles.duplicateCount}>중복 신고 {item.duplicate_count}건</Text>
          )}
        </View>

        <Text style={styles.reportDate}>
          {new Date(item.created_at).toLocaleString('ko-KR')}
        </Text>
      </TouchableOpacity>
    );
  };

  // ================================================================
  // 메인 UI
  // ================================================================

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>신고 관리</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 필터 칩 + 건수 배지 */}
      <View style={styles.filterContainer}>
        {filters.map((filter) => {
          const count = statusCounts[filter.key];
          const isPending = filter.key === 'pending';
          const hasPendingItems = isPending && count > 0;

          return (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                filterStatus === filter.key && styles.filterChipActive,
              ]}
              onPress={() => setFilterStatus(filter.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterStatus === filter.key && styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
              {count > 0 && (
                <View
                  style={[
                    styles.filterCountBadge,
                    hasPendingItems && styles.filterCountBadgeUrgent,
                    filterStatus === filter.key && !hasPendingItems && styles.filterCountBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterCountText,
                      (hasPendingItems || filterStatus === filter.key) && styles.filterCountTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 요약 배너 */}
      {!isLoading && !error && statusCounts.all > 0 && (
        <View style={styles.summaryBanner}>
          <Text style={styles.summaryText}>
            총 {statusCounts.all}건 | 대기 {statusCounts.pending}건 | 처리율 {summaryRate}%
          </Text>
        </View>
      )}

      {/* 신고 목록 */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>데이터를 불러올 수 없습니다.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredReports}
          renderItem={renderReportItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle" size={64} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>신고가 없습니다.</Text>
            </View>
          }
        />
      )}

      {/* 상세 모달 */}
      <Modal
        visible={!!selectedReport}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedReport(null)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          {/* 모달 헤더 */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedReport(null)}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>신고 상세</Text>
            <View style={{ width: 24 }} />
          </View>

          {selectedReport && (
            <ScrollView contentContainerStyle={styles.modalContent}>
              {/* 신고 정보 */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>신고 정보</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>사유:</Text>
                  <Text style={styles.infoValue}>{REPORT_REASON_LABELS[selectedReport.reason]}</Text>
                </View>
                {selectedReport.description && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>상세:</Text>
                    <Text style={styles.infoValue}>{selectedReport.description}</Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>신고자:</Text>
                  <Text style={styles.infoValue}>{selectedReport.reporter_display_tag}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>일시:</Text>
                  <Text style={styles.infoValue}>
                    {new Date(selectedReport.created_at).toLocaleString('ko-KR')}
                  </Text>
                </View>
                {selectedReport.duplicate_count && selectedReport.duplicate_count > 1 && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>중복:</Text>
                    <Text style={styles.infoValue}>{selectedReport.duplicate_count}건</Text>
                  </View>
                )}
              </View>

              {/* 대상 콘텐츠 */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>신고 대상</Text>
                {selectedReport.target_content ? (
                  <View style={styles.contentBox}>
                    <Text style={styles.contentText}>
                      {(selectedReport.target_content as any).content}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.infoValue}>(콘텐츠가 삭제되었습니다)</Text>
                )}
              </View>

              {/* 액션 버튼 */}
              {selectedReport.status === 'pending' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={handleDeleteContent}
                    disabled={deleteContentMutation.isPending}
                  >
                    {deleteContentMutation.isPending ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.actionButtonText}>콘텐츠 삭제</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={handleRejectReport}
                    disabled={updateStatusMutation.isPending}
                  >
                    {updateStatusMutation.isPending ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.actionButtonText}>신고 거부</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={handleApproveReport}
                    disabled={updateStatusMutation.isPending}
                  >
                    {updateStatusMutation.isPending ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.actionButtonText}>신고 승인</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  filterCountBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  filterCountBadgeUrgent: {
    backgroundColor: COLORS.error,
  },
  filterCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  filterCountTextActive: {
    color: '#FFF',
  },

  // 요약 배너
  summaryBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  listContent: {
    padding: 16,
  },
  reportItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportReason: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  // 긴급 뱃지 (24시간 초과 대기)
  urgentBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  urgentBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFF',
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  contentPreview: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reportFooterText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  duplicateCount: {
    fontSize: 12,
    color: COLORS.error,
    fontWeight: '600',
  },
  reportDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
  },

  // 모달
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalContent: {
    padding: 16,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    width: 60,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    flex: 1,
  },
  contentBox: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  contentText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: COLORS.error,
  },
  rejectButton: {
    backgroundColor: COLORS.textSecondary,
  },
  approveButton: {
    backgroundColor: COLORS.primary,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
