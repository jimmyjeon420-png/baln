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
import { SIZES } from '../../styles/theme';
import { useTheme } from '../../hooks/useTheme';
import supabase, { getCurrentUser } from '../../services/supabase';

type ReportReason = 'spam' | 'abuse' | 'leading' | 'other';

const REPORT_REASONS: { key: ReportReason; label: string; icon: string }[] = [
  { key: 'spam', label: '스팸 / 광고', icon: 'megaphone' },
  { key: 'abuse', label: '욕설 / 비방', icon: 'alert-circle' },
  { key: 'leading', label: '리딩방 / 불법 유도', icon: 'warning' },
  { key: 'other', label: '기타', icon: 'ellipsis-horizontal' },
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
      Alert.alert('알림', '신고 사유를 선택해주세요.');
      return;
    }

    if (reason === 'other' && !description.trim()) {
      Alert.alert('알림', '기타 사유를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      // community_reports 테이블에 저장
      const { error } = await supabase.from('community_reports').insert({
        reporter_id: user.id,
        target_type: targetType,
        target_id: targetId,
        reason,
        description: description.trim() || null,
      });

      if (error) throw error;

      Alert.alert('신고 완료', '신고가 접수되었습니다. 검토 후 조치하겠습니다.', [
        {
          text: '확인',
          onPress: () => {
            handleClose();
            onSuccess?.();
          },
        },
      ]);
    } catch (error) {
      console.error('Report error:', error);
      Alert.alert('오류', '신고 접수에 실패했습니다. 다시 시도해주세요.');
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
            <Text style={[styles.title, { color: colors.textPrimary }]}>신고하기</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
            {/* 안내 */}
            <View style={[styles.infoBox, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="information-circle" size={18} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.textPrimary }]}>
                허위 신고 시 이용에 제한이 있을 수 있습니다.
              </Text>
            </View>

            {/* 신고 사유 선택 */}
            <Text style={[styles.label, { color: colors.textPrimary }]}>신고 사유</Text>
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
                      name={item.icon as any}
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
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 상세 설명 */}
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              상세 설명 {reason === 'other' && <Text style={{ color: colors.error }}>*</Text>}
            </Text>
            <TextInput
              style={[styles.descriptionInput, { backgroundColor: colors.surface, color: colors.textPrimary }]}
              placeholder="구체적인 신고 사유를 입력해주세요 (선택사항)"
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
                <Text style={styles.submitButtonText}>신고하기</Text>
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
