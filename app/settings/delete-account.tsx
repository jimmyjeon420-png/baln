// @ts-nocheck
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
  Platform,
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
        title: 'baln 계정 데이터',
      });
    } catch (err) {
      Alert.alert(
        '내보내기 실패',
        '데이터를 내보내는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
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
      '정말로 삭제하시겠습니까?',
      '이 작업은 되돌릴 수 없습니다.\n모든 데이터가 영구적으로 삭제됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제합니다',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await deleteUserAccount(user.id);

              if (result.success) {
                // 삭제 성공 → AuthContext가 세션 변경 감지 → 자동으로 로그인 화면 이동
                Alert.alert(
                  '계정이 삭제되었습니다',
                  '그동안 baln을 이용해 주셔서 감사합니다.',
                  [
                    {
                      text: '확인',
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
                  '삭제 실패',
                  result.error || '계정 삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
                );
              }
            } catch (err) {
              Alert.alert(
                '오류 발생',
                '계정 삭제 중 예기치 않은 오류가 발생했습니다.'
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
        <Text style={styles.headerTitle}>계정 삭제</Text>
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
              계정을 삭제하면{'\n'}다음 데이터가 영구 삭제됩니다
            </Text>

            {/* 삭제 항목 리스트 */}
            <View style={styles.lossCard}>
              <LossItem
                icon="wallet-outline"
                label="보유 크레딧"
                value={
                  dataSummary
                    ? `${dataSummary.creditBalance}C`
                    : '로딩 중...'
                }
              />
              <LossItem
                icon="briefcase-outline"
                label="포트폴리오"
                value={
                  dataSummary
                    ? `${dataSummary.portfolioCount}개 자산`
                    : '로딩 중...'
                }
              />
              <LossItem
                icon="flame-outline"
                label="연속 기록"
                value={
                  dataSummary
                    ? `${dataSummary.streakDays}일 스트릭`
                    : '로딩 중...'
                }
              />
              <LossItem
                icon="stats-chart-outline"
                label="예측 기록"
                value={
                  dataSummary
                    ? `${dataSummary.predictionCount}회 투표`
                    : '로딩 중...'
                }
              />
              <LossItem
                icon="chatbubble-outline"
                label="커뮤니티 글/댓글"
                value={
                  dataSummary
                    ? `글 ${dataSummary.postCount}개, 댓글 ${dataSummary.commentCount}개`
                    : '로딩 중...'
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
                    삭제 전 데이터 내보내기 (JSON)
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.exportHint}>
              개인정보보호법에 따라 삭제 전 데이터를 다운로드할 수 있습니다
            </Text>

            {/* 다음 단계 */}
            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => setStep(2)}
            >
              <Text style={styles.nextButtonText}>계속 진행</Text>
            </TouchableOpacity>

            {/* 돌아가기 */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelButtonText}>
                아니요, 계정을 유지할게요
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
            <Text style={styles.stepTitle}>본인 확인</Text>
            <Text style={styles.stepDescription}>
              계정 삭제를 진행하려면{'\n'}
              가입하신 이메일 주소를 다시 입력해주세요.
            </Text>

            {/* 현재 이메일 표시 */}
            <View style={styles.currentEmailBox}>
              <Text style={styles.currentEmailLabel}>현재 계정</Text>
              <Text style={styles.currentEmailValue}>
                {user?.email || '알 수 없음'}
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
              placeholder="이메일 주소 입력"
              placeholderTextColor="#666666"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {emailInput.length > 0 && !emailMatches && (
              <Text style={styles.emailMismatch}>
                이메일이 일치하지 않습니다
              </Text>
            )}
            {emailMatches && (
              <Text style={styles.emailMatchText}>이메일이 확인되었습니다</Text>
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
                다음
              </Text>
            </TouchableOpacity>

            {/* 이전 단계 */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setStep(1)}
            >
              <Text style={styles.cancelButtonText}>이전으로</Text>
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
            <Text style={styles.stepTitle}>최종 확인</Text>
            <Text style={styles.stepDescription}>
              아래 버튼을 누르면 계정과 모든 데이터가{'\n'}
              <Text style={styles.boldText}>영구적으로 삭제</Text>되며,{'\n'}
              이 작업은 되돌릴 수 없습니다.
            </Text>

            {/* 요약 박스 */}
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>삭제 대상</Text>
              <Text style={styles.summaryItem}>
                {'>'} 계정: {user?.email}
              </Text>
              <Text style={styles.summaryItem}>
                {'>'} 포트폴리오, AI 분석 결과
              </Text>
              <Text style={styles.summaryItem}>
                {'>'} 크레딧, 예측 기록, 스트릭
              </Text>
              <Text style={styles.summaryItem}>
                {'>'} 커뮤니티 글, 댓글, 좋아요
              </Text>
              <Text style={styles.summaryItem}>
                {'>'} 알림 설정, 앱 내 모든 데이터
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
                    계정 영구 삭제
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
                계정을 유지하겠습니다
              </Text>
            </TouchableOpacity>

            {/* 이전 단계 */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setStep(2)}
            >
              <Text style={styles.cancelButtonText}>이전으로</Text>
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
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.lossItem}>
      <View style={styles.lossItemLeft}>
        <Ionicons name={icon as any} size={20} color="#CF6679" />
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
