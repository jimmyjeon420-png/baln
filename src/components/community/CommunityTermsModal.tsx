/**
 * CommunityTermsModal - 커뮤니티 이용약관 동의 모달 (EULA Gate)
 *
 * Apple Guideline 1.2 준수:
 * - UGC 이용 전 약관 동의 필수
 * - 부적절한 콘텐츠/악성 사용자에 대한 무관용 원칙 명시
 * - 신고/차단 메커니즘 안내
 * - 24시간 내 운영팀 조치 명시
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase, { getCurrentUser } from '../../services/supabase';
import { t } from '../../locales';

const COMMUNITY_TERMS_KEY = '@baln:community_terms_accepted';

/** 커뮤니티 약관 동의 여부 확인 */
export async function hasCommunityTermsAccepted(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(COMMUNITY_TERMS_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

/** 커뮤니티 약관 동의 저장 */
export async function setCommunityTermsAccepted(): Promise<void> {
  try {
    await AsyncStorage.setItem(COMMUNITY_TERMS_KEY, 'true');
    // Supabase에도 기록 (best-effort)
    const user = await getCurrentUser();
    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({ community_terms_accepted_at: new Date().toISOString() })
          .eq('id', user.id);
      } catch {
        // best-effort
      }
    }
  } catch {
    // AsyncStorage 실패 시 무시
  }
}

interface CommunityTermsModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function CommunityTermsModal({
  visible,
  onAccept,
  onDecline,
}: CommunityTermsModalProps) {
  const { colors } = useTheme();

  const handleAccept = async () => {
    await setCommunityTermsAccepted();
    onAccept();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDecline}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* 헤더 */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t('community.terms.title')}
            </Text>
            <TouchableOpacity onPress={onDecline} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
            {/* 소개 */}
            <Text style={[styles.intro, { color: colors.textPrimary }]}>
              {t('community.terms.intro')}
            </Text>

            {/* 핵심 규칙 */}
            <View style={[styles.ruleCard, { backgroundColor: colors.surface }]}>
              <View style={styles.ruleHeader}>
                <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
                <Text style={[styles.ruleTitle, { color: colors.textPrimary }]}>
                  {t('community.terms.safe_community_title')}
                </Text>
              </View>
              <Text style={[styles.ruleText, { color: colors.textSecondary }]}>
                {t('community.terms.safe_community_desc')}
              </Text>
            </View>

            {/* 무관용 원칙 */}
            <View style={[styles.ruleCard, { backgroundColor: colors.error + '10' }]}>
              <View style={styles.ruleHeader}>
                <Ionicons name="ban" size={20} color={colors.error} />
                <Text style={[styles.ruleTitle, { color: colors.textPrimary }]}>
                  {t('community.terms.zero_tolerance_title')}
                </Text>
              </View>
              <Text style={[styles.ruleText, { color: colors.textSecondary }]}>
                {t('community.terms.zero_tolerance_desc')}
              </Text>
            </View>

            {/* 신고/차단 */}
            <View style={[styles.ruleCard, { backgroundColor: colors.surface }]}>
              <View style={styles.ruleHeader}>
                <Ionicons name="flag" size={20} color={colors.warning || '#FF9800'} />
                <Text style={[styles.ruleTitle, { color: colors.textPrimary }]}>
                  {t('community.terms.report_block_title')}
                </Text>
              </View>
              <Text style={[styles.ruleText, { color: colors.textSecondary }]}>
                {t('community.terms.report_block_desc')}
              </Text>
            </View>

            {/* 운영 정책 */}
            <View style={[styles.ruleCard, { backgroundColor: colors.surface }]}>
              <View style={styles.ruleHeader}>
                <Ionicons name="eye" size={20} color={colors.primary} />
                <Text style={[styles.ruleTitle, { color: colors.textPrimary }]}>
                  {t('community.terms.moderation_title')}
                </Text>
              </View>
              <Text style={[styles.ruleText, { color: colors.textSecondary }]}>
                {t('community.terms.moderation_desc')}
              </Text>
            </View>

            {/* 면책 */}
            <Text style={[styles.disclaimer, { color: colors.textTertiary }]}>
              {t('community.terms.disclaimer')}
            </Text>
          </ScrollView>

          {/* 버튼 */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.declineButton, { backgroundColor: colors.surface }]}
              onPress={onDecline}
            >
              <Text style={[styles.declineText, { color: colors.textSecondary }]}>
                {t('community.terms.decline')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.acceptButton, { backgroundColor: colors.primary }]}
              onPress={handleAccept}
            >
              <Text style={styles.acceptText}>{t('community.terms.accept')}</Text>
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
    maxHeight: '90%',
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
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 20,
    gap: 16,
    paddingBottom: 8,
  },
  intro: {
    fontSize: 15,
    lineHeight: 22,
  },
  ruleCard: {
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  ruleText: {
    fontSize: 14,
    lineHeight: 21,
  },
  disclaimer: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  declineButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  declineText: {
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  acceptText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
});
