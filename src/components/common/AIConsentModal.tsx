/**
 * AI 데이터 공유 동의 모달
 *
 * Apple App Store 가이드라인 5.1.1(i) / 5.1.2(i) 준수:
 * - 어떤 데이터가 전송되는지 명시
 * - 누구에게 전송되는지 명시
 * - 사용자 동의를 받은 후에만 데이터 전송
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../hooks/useTheme';
import { SIZES } from '../../styles/theme';

const AI_CONSENT_KEY = '@baln/ai_data_consent';

/** 동의 상태 확인 */
export async function hasAIConsent(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(AI_CONSENT_KEY);
    return value === 'granted';
  } catch {
    return false;
  }
}

/** 동의 저장 */
export async function grantAIConsent(): Promise<void> {
  await AsyncStorage.setItem(AI_CONSENT_KEY, 'granted');
}

/** 동의 철회 */
export async function revokeAIConsent(): Promise<void> {
  await AsyncStorage.removeItem(AI_CONSENT_KEY);
}

interface AIConsentModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function AIConsentModal({ visible, onAccept, onDecline }: AIConsentModalProps) {
  const { colors } = useTheme();

  const handleAccept = async () => {
    await grantAIConsent();
    onAccept();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.surface }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* 헤더 아이콘 */}
            <View style={styles.iconContainer}>
              <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
              </View>
            </View>

            {/* 제목 */}
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              AI 분석 데이터 공유 안내
            </Text>

            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              맞춤형 투자 분석을 위해 아래 데이터가 외부 AI 서비스에 전송됩니다.
            </Text>

            {/* 전송 데이터 */}
            <View style={[styles.infoBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>
                전송되는 데이터
              </Text>
              <View style={styles.infoRow}>
                <Ionicons name="pie-chart-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  포트폴리오 종목 및 비중 (종목 코드, 수량, 비율)
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="trending-up-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  시장 데이터 (주가, 환율, 지수)
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="analytics-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  건강 점수 및 리스크 팩터
                </Text>
              </View>
            </View>

            {/* 전송 대상 */}
            <View style={[styles.infoBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>
                전송 대상
              </Text>
              <View style={styles.infoRow}>
                <Ionicons name="business-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  Google LLC (Gemini AI) — 미국 소재
                </Text>
              </View>
            </View>

            {/* 안전 보장 */}
            <View style={[styles.infoBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>
                개인정보 보호
              </Text>
              <View style={styles.infoRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  이름, 계좌번호 등 개인 식별 정보는 전송되지 않습니다
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  모든 데이터는 TLS 1.3으로 암호화 전송됩니다
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  설정에서 언제든지 동의를 철회할 수 있습니다
                </Text>
              </View>
            </View>

            {/* 개인정보처리방침 링크 안내 */}
            <Text style={[styles.policyNote, { color: colors.textTertiary }]}>
              자세한 내용은 설정 {'>'} 개인정보처리방침에서 확인하세요.
            </Text>
          </ScrollView>

          {/* 버튼 */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.declineButton, { borderColor: colors.border }]}
              onPress={onDecline}
            >
              <Text style={[styles.declineButtonText, { color: colors.textSecondary }]}>
                동의하지 않음
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.acceptButton, { backgroundColor: colors.primary }]}
              onPress={handleAccept}
            >
              <Text style={styles.acceptButtonText}>
                동의하고 시작
              </Text>
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    borderRadius: 20,
    padding: 24,
    maxHeight: '85%',
    width: '100%',
    maxWidth: 400,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: SIZES.fSm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  infoBox: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: SIZES.fSm,
    fontWeight: '600',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  policyNote: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  declineButtonText: {
    fontSize: SIZES.fSm,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: SIZES.fSm,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
