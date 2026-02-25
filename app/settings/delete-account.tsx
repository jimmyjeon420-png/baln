/**
 * 계정 삭제 확인 화면
 *
 * Apple App Store 필수 요건: 계정 삭제 기능
 * 이 화면이 없으면 앱스토어 심사에서 거절됩니다.
 *
 * 3단계 확인 프로세스:
 * 1단계: 삭제 시 잃게 되는 것 안내 (크레딧, 예측 기록, 스트릭 등)
 * 2단계: 이메일 재입력 확인 (본인 확인)
 * 3단계: 최종 "계정 삭제" 빨간 버튼
 *
 * + 데이터 내보내기(JSON) 옵션 포함 (GDPR/개인정보보호법 대응)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import {
  deleteUserAccount,
  exportUserData,
  getUserDataSummary,
} from '../../src/services/accountDeletion';
import { useTheme } from '../../src/hooks/useTheme';
import { useLocale } from '../../src/context/LocaleContext';

// ============================================================================
// 상수
// ============================================================================

/** 3단계 프로세스 */
type Step = 1 | 2 | 3;

// ============================================================================
// 컴포넌트
// ============================================================================

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useLocale();

  // 상태
  const [step, setStep] = useState<Step>(1);
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dataSummary, setDataSummary] = useState<{
    portfolioCount: number;
    predictionCount: number;
    postCount: number;
    commentCount: number;
    creditBalance: number;
    streakDays: number;
  } | null>(null);

  // 데이터 요약 로드
  useEffect(() => {
    if (user?.id) {
      getUserDataSummary(user.id)
        .then(setDataSummary)
        .catch(() => setDataSummary(null));
    }
  }, [user?.id]);

  // 이메일 일치 여부
  const emailMatches = emailInput.trim().toLowerCase() === (user?.email || '').toLowerCase();

  // ============================================================================
  // 핸들러
  // ============================================================================

  /** 데이터 내보내기 (JSON) */
  const handleExport = async () => {
    if (!user?.id || !user?.email) return;

    setExporting(true);
    try {
      const data = await exportUserData(user.id, user.email);
      const jsonString = JSON.stringify(data, null, 2);

      // 공유 시트로 JSON 데이터 전달
      await Share.share({
        message: jsonString,
        title: t('settings.delete_account.share_title'),
      });
    } catch (err) {
      Alert.alert(
        t('settings.delete_account.export_fail_title'),
        t('settings.delete_account.export_fail_desc')
      );
      console.error('[데이터 내보내기 실패]', err);
    } finally {
      setExporting(false);
    }
  };

  /** 계정 삭제 실행 */
  const handleDelete = async () => {
    if (!user?.id || !emailMatches) return;

    // 최종 확인 Alert
    Alert.alert(
      t('settings.delete_account.confirm'),
      t('settings.delete_account.warning'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.delete_account.confirm_delete_button'),
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await deleteUserAccount(user.id);

              if (result.success) {
                // 삭제 성공 → AuthContext가 세션 변경 감지 → 자동으로 로그인 화면 이동
                Alert.alert(
                  t('settings.delete_account.success_title'),
                  t('settings.delete_account.success_desc'),
                  [
                    {
                      text: t('common.confirm'),
                      onPress: () => {
                        // signOut으로 인해 AuthContext가 세션 null 감지 → 로그인 화면 자동 이동
                        // 만약 자동 이동이 안 되면 수동으로 라우팅
                        try {
                          router.replace('/');
                        } catch {
                          // 이미 로그인 화면으로 이동된 경우 무시
                        }
                      },
                    },
                  ]
                );
              } else {
                Alert.alert(
                  t('settings.delete_account.fail_title'),
                  result.error || t('settings.delete_account.fail_desc')
                );
              }
            } catch (err) {
              Alert.alert(
                t('settings.delete_account.error_title'),
                t('settings.delete_account.error_desc')
              );
              console.error('[계정 삭제 실패]', err);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // ============================================================================
  // 렌더링
  // ============================================================================

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#4CAF50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.delete_account.title')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 단계 표시 */}
        <View style={styles.stepIndicator}>
          {[1, 2, 3].map((s) => (
            <View key={s} style={styles.stepRow}>
              <View
                style={[
                  styles.stepCircle,
                  step >= s && styles.stepCircleActive,
                ]}
              >
                <Text
                  style={[
                    styles.stepNumber,
                    step >= s && styles.stepNumberActive,
                  ]}
                >
                  {s}
                </Text>
              </View>
              {s < 3 && (
                <View
                  style={[
                    styles.stepLine,
                    step > s && styles.stepLineActive,
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        {/* ===== 1단계: 삭제 시 잃게 되는 것 안내 ===== */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <Ionicons
              name="warning-outline"
              size={48}
              color="#CF6679"
              style={styles.warningIcon}
            />
            <Text style={styles.stepTitle}>
              {t('settings.delete_account.lose_title')}
            </Text>

            {/* 삭제 항목 리스트 */}
            <View style={styles.lossCard}>
              <LossItem
                icon="wallet-outline"
                label={t('settings.delete_account.lose_credit')}
                value={
                  dataSummary
                    ? `${dataSummary.creditBalance}C`
                    : t('settings.delete_account.loading')
                }
              />
              <LossItem
                icon="briefcase-outline"
                label={t('settings.delete_account.lose_portfolio')}
                value={
                  dataSummary
                    ? `${dataSummary.portfolioCount}개 자산`
                    : t('settings.delete_account.loading')
                }
              />
              <LossItem
                icon="flame-outline"
                label={t('settings.delete_account.lose_streak')}
                value={
                  dataSummary
                    ? t('settings.delete_account.lose_value_streak', { days: dataSummary.streakDays })
                    : t('settings.delete_account.loading')
                }
              />
              <LossItem
                icon="stats-chart-outline"
                label={t('settings.delete_account.lose_prediction')}
                value={
                  dataSummary
                    ? t('settings.delete_account.lose_value_prediction', { count: dataSummary.predictionCount })
                    : t('settings.delete_account.loading')
                }
              />
              <LossItem
                icon="chatbubble-outline"
                label={t('settings.delete_account.lose_community')}
                value={
                  dataSummary
                    ? t('settings.delete_account.lose_value_community', { posts: dataSummary.postCount, comments: dataSummary.commentCount })
                    : t('settings.delete_account.loading')
                }
              />
            </View>

            {/* 데이터 내보내기 안내 */}
            <TouchableOpacity
              style={styles.exportButton}
              onPress={handleExport}
              disabled={exporting}
            >
              {exporting ? (
                <ActivityIndicator color="#4CAF50" size="small" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={20} color="#4CAF50" />
                  <Text style={styles.exportButtonText}>
                    {t('settings.delete_account.export_button')}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.exportHint}>
              {t('settings.delete_account.export_hint')}
            </Text>

            {/* 다음 단계 */}
            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => setStep(2)}
            >
              <Text style={styles.nextButtonText}>{t('settings.delete_account.proceed_button')}</Text>
            </TouchableOpacity>

            {/* 돌아가기 */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelButtonText}>
                {t('settings.delete_account.keep_account')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ===== 2단계: 이메일 재입력 확인 ===== */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <Ionicons
              name="mail-outline"
              size={48}
              color="#CF6679"
              style={styles.warningIcon}
            />
            <Text style={styles.stepTitle}>{t('settings.delete_account.verify_title')}</Text>
            <Text style={styles.stepDescription}>
              {t('settings.delete_account.verify_desc')}
            </Text>

            {/* 현재 이메일 표시 */}
            <View style={styles.currentEmailBox}>
              <Text style={styles.currentEmailLabel}>{t('settings.delete_account.current_account_label')}</Text>
              <Text style={styles.currentEmailValue}>
                {user?.email || t('settings.delete_account.email_unknown')}
              </Text>
            </View>

            {/* 이메일 입력 */}
            <TextInput
              style={[
                styles.emailInput,
                emailMatches && styles.emailInputMatch,
              ]}
              value={emailInput}
              onChangeText={setEmailInput}
              placeholder={t('settings.delete_account.reason_placeholder')}
              placeholderTextColor="#666666"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {emailInput.length > 0 && !emailMatches && (
              <Text style={styles.emailMismatch}>
                {t('settings.delete_account.email_mismatch')}
              </Text>
            )}
            {emailMatches && (
              <Text style={styles.emailMatchText}>{t('settings.delete_account.email_match')}</Text>
            )}

            {/* 다음 단계 */}
            <TouchableOpacity
              style={[
                styles.nextButton,
                !emailMatches && styles.nextButtonDisabled,
              ]}
              onPress={() => setStep(3)}
              disabled={!emailMatches}
            >
              <Text
                style={[
                  styles.nextButtonText,
                  !emailMatches && styles.nextButtonTextDisabled,
                ]}
              >
                {t('settings.delete_account.next_button')}
              </Text>
            </TouchableOpacity>

            {/* 이전 단계 */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setStep(1)}
            >
              <Text style={styles.cancelButtonText}>{t('settings.delete_account.back_button')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ===== 3단계: 최종 삭제 확인 ===== */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color="#CF6679"
              style={styles.warningIcon}
            />
            <Text style={styles.stepTitle}>{t('settings.delete_account.final_title')}</Text>
            <Text style={styles.stepDescription}>
              {t('settings.delete_account.final_desc')}
            </Text>

            {/* 요약 박스 */}
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>{t('settings.delete_account.summary_title')}</Text>
              <Text style={styles.summaryItem}>
                {'>'} {t('settings.delete_account.current_account_label')}: {user?.email}
              </Text>
              <Text style={styles.summaryItem}>
                {'>'} {t('settings.delete_account.summary_portfolio')}
              </Text>
              <Text style={styles.summaryItem}>
                {'>'} {t('settings.delete_account.summary_credits')}
              </Text>
              <Text style={styles.summaryItem}>
                {'>'} {t('settings.delete_account.summary_community')}
              </Text>
              <Text style={styles.summaryItem}>
                {'>'} {t('settings.delete_account.summary_settings')}
              </Text>
            </View>

            {/* 최종 삭제 버튼 */}
            <TouchableOpacity
              style={[styles.deleteButton, loading && styles.deleteButtonLoading]}
              onPress={handleDelete}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.deleteButtonText}>
                    {t('settings.delete_account.delete_button')}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* 돌아가기 */}
            <TouchableOpacity
              style={styles.keepButton}
              onPress={() => router.back()}
            >
              <Text style={styles.keepButtonText}>
                {t('settings.delete_account.keep_button')}
              </Text>
            </TouchableOpacity>

            {/* 이전 단계 */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setStep(2)}
            >
              <Text style={styles.cancelButtonText}>{t('settings.delete_account.back_button')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// 하위 컴포넌트
// ============================================================================

/** 삭제 시 잃게 되는 항목 한 줄 */
function LossItem({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.lossItem}>
      <View style={styles.lossItemLeft}>
        <Ionicons name={icon} size={20} color="#CF6679" />
        <Text style={styles.lossItemLabel}>{label}</Text>
      </View>
      <Text style={styles.lossItemValue}>{value}</Text>
    </View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // 단계 표시
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#CF6679',
  },
  stepNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#666666',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#2A2A2A',
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: '#CF6679',
  },

  // 단계 콘텐츠
  stepContent: {
    alignItems: 'center',
  },
  warningIcon: {
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 23,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 33,
  },
  stepDescription: {
    fontSize: 16,
    color: '#AAAAAA',
    textAlign: 'center',
    lineHeight: 25,
    marginBottom: 24,
  },
  boldText: {
    fontWeight: '700',
    color: '#CF6679',
  },

  // 삭제 항목 카드
  lossCard: {
    width: '100%',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  lossItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  lossItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lossItemLabel: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  lossItemValue: {
    fontSize: 15,
    color: '#CF6679',
    fontWeight: '600',
  },

  // 데이터 내보내기
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
    marginBottom: 8,
    width: '100%',
    justifyContent: 'center',
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  exportHint: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
  },

  // 다음 버튼
  nextButton: {
    width: '100%',
    backgroundColor: '#CF6679',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  nextButtonDisabled: {
    backgroundColor: '#333333',
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nextButtonTextDisabled: {
    color: '#666666',
  },

  // 취소 버튼
  cancelButton: {
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },

  // 이메일 입력 (2단계)
  currentEmailBox: {
    width: '100%',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  currentEmailLabel: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 4,
  },
  currentEmailValue: {
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emailInput: {
    width: '100%',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    fontSize: 17,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333333',
    marginBottom: 8,
  },
  emailInputMatch: {
    borderColor: '#4CAF50',
  },
  emailMismatch: {
    fontSize: 14,
    color: '#CF6679',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  emailMatchText: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },

  // 요약 박스 (3단계)
  summaryBox: {
    width: '100%',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#CF6679',
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#CF6679',
    marginBottom: 12,
  },
  summaryItem: {
    fontSize: 15,
    color: '#AAAAAA',
    lineHeight: 25,
  },

  // 삭제 버튼 (3단계)
  deleteButton: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#B00020',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  deleteButtonLoading: {
    opacity: 0.6,
  },
  deleteButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // 유지 버튼 (3단계)
  keepButton: {
    width: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  keepButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#121212',
  },
});
