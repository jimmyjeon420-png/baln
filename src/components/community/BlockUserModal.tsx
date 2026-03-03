/**
 * BlockUserModal - 사용자 차단 모달
 *
 * Apple Guideline 1.2 준수:
 * - 사용자 차단 메커니즘
 * - 차단 시 개발자에게 알림 (community_reports 자동 등록)
 * - 차단된 사용자 콘텐츠 즉시 피드에서 제거
 * - 24시간 내 운영팀 검토 명시
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useBlockUser } from '../../hooks/useUserBlocks';
import { t } from '../../locales';

const BLOCK_REASONS = [
  { key: 'harassment', labelKey: 'community.detail.block_reason_harassment', icon: 'alert-circle' as const },
  { key: 'spam', labelKey: 'community.detail.block_reason_spam', icon: 'megaphone' as const },
  { key: 'scam', labelKey: 'community.detail.block_reason_scam', icon: 'warning' as const },
  { key: 'other', labelKey: 'community.detail.block_reason_other', icon: 'ellipsis-horizontal' as const },
];

interface BlockUserModalProps {
  visible: boolean;
  targetUserId: string;
  targetType?: 'post' | 'comment';
  targetId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BlockUserModal({
  visible,
  targetUserId,
  targetType,
  targetId,
  onClose,
  onSuccess,
}: BlockUserModalProps) {
  const { colors } = useTheme();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const blockUser = useBlockUser();

  const handleClose = () => {
    setSelectedReason(null);
    onClose();
  };

  const handleBlock = async () => {
    if (!selectedReason) {
      Alert.alert(t('common.notice'), t('community.detail.block_reason_required'));
      return;
    }

    try {
      await blockUser.mutateAsync({
        blockedUserId: targetUserId,
        reason: selectedReason,
        targetType,
        targetId,
      });

      Alert.alert(
        t('community.detail.block_success_title'),
        t('community.detail.block_success_message'),
        [
          {
            text: t('common.ok'),
            onPress: () => {
              handleClose();
              onSuccess?.();
            },
          },
        ],
      );
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : '';
      if (errMsg.includes('already')) {
        Alert.alert(t('common.notice'), t('community.detail.block_already'));
        handleClose();
      } else {
        Alert.alert(t('common.error'), t('community.detail.block_failed'));
      }
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* 헤더 */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t('community.detail.block_user_title')}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* 경고 안내 */}
            <View style={[styles.warningBox, { backgroundColor: colors.error + '15' }]}>
              <Ionicons name="shield" size={20} color={colors.error} />
              <Text style={[styles.warningText, { color: colors.textPrimary }]}>
                {t('community.detail.block_user_warning')}
              </Text>
            </View>

            {/* 사유 선택 */}
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              {t('community.detail.block_reason_label')}
            </Text>
            <View style={styles.reasonGrid}>
              {BLOCK_REASONS.map((item) => {
                const isSelected = selectedReason === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.reasonButton,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      isSelected && { backgroundColor: colors.error + '15', borderColor: colors.error },
                    ]}
                    onPress={() => setSelectedReason(item.key)}
                  >
                    <Ionicons
                      name={item.icon}
                      size={22}
                      color={isSelected ? colors.error : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.reasonLabel,
                        { color: colors.textSecondary },
                        isSelected && { color: colors.error, fontWeight: '700' },
                      ]}
                    >
                      {t(item.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 안내 문구 */}
            <View style={[styles.infoBox, { backgroundColor: colors.surface }]}>
              <Ionicons name="information-circle" size={16} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {t('community.detail.block_auto_report_notice')}
              </Text>
            </View>
          </View>

          {/* 차단 버튼 */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.blockButton,
                { backgroundColor: colors.error },
                !selectedReason && { opacity: 0.5 },
              ]}
              onPress={handleBlock}
              disabled={!selectedReason || blockUser.isPending}
            >
              {blockUser.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.blockButtonText}>
                  {t('community.detail.block_confirm')}
                </Text>
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
    padding: 20,
    gap: 16,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    padding: 14,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 10,
    padding: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  blockButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  blockButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
