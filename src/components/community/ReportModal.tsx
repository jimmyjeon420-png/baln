/**
 * ReportModal - 신고 모달
 *
 * 기능:
 * - 신고 사유 선택 (스팸/욕설/리딩방/기타)
 * - 상세 설명 입력
 * - DB 저장 (community_reports)
 * - 신고 완료 토스트
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../context/LocaleContext';
import supabase, { getCurrentUser } from '../../services/supabase';
import { getLocaleCode } from '../../utils/formatters';

const REPORT_SLA_HOURS = 24;

type ReportReason = 'spam' | 'abuse' | 'leading' | 'other';

const REPORT_REASONS: { key: ReportReason; labelKey: string; icon: string }[] = [
  { key: 'spam', labelKey: 'community.report.spam', icon: 'megaphone' },
  { key: 'abuse', labelKey: 'community.report.abuse', icon: 'alert-circle' },
  { key: 'leading', labelKey: 'community.report.leading', icon: 'warning' },
  { key: 'other', labelKey: 'community.report.other', icon: 'ellipsis-horizontal' },
];

interface ReportModalProps {
  visible: boolean;
  targetType: 'post' | 'comment';
  targetId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ReportModal({
  visible,
  targetType,
  targetId,
  onClose,
  onSuccess,
}: ReportModalProps) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 초기화
  const handleClose = () => {
    setReason(null);
    setDescription('');
    onClose();
  };

  // 신고 제출
  const handleSubmit = async () => {
    if (!reason) {
      Alert.alert(t('common.notice'), t('community.report.selectReason'));
      return;
    }

    if (reason === 'other' && !description.trim()) {
      Alert.alert(t('common.notice'), t('community.report.enterOtherReason'));
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await getCurrentUser();
      if (!user) throw new Error(t('community.report.loginRequired'));

      // 동일 대상 중복 신고 방지 (pending 상태)
      const { data: existing } = await supabase
        .from('community_reports')
        .select('id, created_at')
        .eq('reporter_id', user.id)
        .eq('target_type', targetType)
        .eq('target_id', targetId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existing) {
        const dueAt = new Date(existing.created_at);
        dueAt.setHours(dueAt.getHours() + REPORT_SLA_HOURS);
        Alert.alert(
          t('community.report.alreadyReportedTitle'),
          t('community.report.alreadyReportedMsg', { dueAt: dueAt.toLocaleString(getLocaleCode()) }),
        );
        return;
      }

      // community_reports 테이블에 저장
      const { error } = await supabase.from('community_reports').insert({
        reporter_id: user.id,
        target_type: targetType,
        target_id: targetId,
        reason,
        description: description.trim() || null,
      });

      if (error) throw error;

      const dueAt = new Date();
      dueAt.setHours(dueAt.getHours() + REPORT_SLA_HOURS);

      Alert.alert(t('community.report.completeTitle'), t('community.report.completeMsg', { hours: REPORT_SLA_HOURS, dueAt: dueAt.toLocaleString(getLocaleCode()) }), [
        {
          text: t('common.confirm'),
          onPress: () => {
            handleClose();
            onSuccess?.();
          },
        },
      ]);
    } catch (error) {
      console.error('Report error:', error);
      Alert.alert(t('common.error'), t('community.report.submitError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* 헤더 */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{t('community.report.title')}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
            {/* 안내 */}
            <View style={[styles.infoBox, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="information-circle" size={18} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.textPrimary }]}>
                {t('community.report.infoText')}
              </Text>
            </View>

            {/* 신고 사유 선택 */}
            <Text style={[styles.label, { color: colors.textPrimary }]}>{t('community.report.reasonLabel')}</Text>
            <View style={styles.reasonGrid}>
              {REPORT_REASONS.map((item) => {
                const isSelected = reason === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.reasonButton,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      isSelected && { backgroundColor: colors.primary + '15', borderColor: colors.primary },
                    ]}
                    onPress={() => setReason(item.key)}
                  >
                    <Ionicons
                      name={item.icon as unknown as React.ComponentProps<typeof Ionicons>['name']}
                      size={22}
                      color={isSelected ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.reasonLabel,
                        { color: colors.textSecondary },
                        isSelected && { color: colors.primary, fontWeight: '700' },
                      ]}
                    >
                      {t(item.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 상세 설명 */}
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {t('community.report.descriptionLabel')} {reason === 'other' && <Text style={{ color: colors.error }}>*</Text>}
            </Text>
            <TextInput
              style={[styles.descriptionInput, { backgroundColor: colors.surface, color: colors.textPrimary }]}
              placeholder={t('community.report.descriptionPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={500}
              value={description}
              onChangeText={setDescription}
              textAlignVertical="top"
            />
            <Text style={[styles.charCount, { color: colors.textSecondary }]}>{description.length} / 500</Text>
          </ScrollView>

          {/* 제출 버튼 */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary }, !reason && { backgroundColor: colors.surface }]}
              onPress={handleSubmit}
              disabled={!reason || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Text style={styles.submitButtonText}>{t('community.report.submit')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    padding: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  reasonButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  descriptionInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 100,
    lineHeight: 21,
  },
  charCount: {
    fontSize: 13,
    textAlign: 'right',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
});
