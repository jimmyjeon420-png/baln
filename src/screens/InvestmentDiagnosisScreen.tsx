/**
 * Investment Diagnosis Screen
 * 설문 + 결과 통합 화면
 * Modal 형태로 App.tsx에서 호출됨
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocale } from '../context/LocaleContext';
import { Asset } from '../types/asset';
import {
  InterestRateTrend,
} from '../types/kostolany';
import { DiagnosisResult } from '../types/coaching';
import { useDiagnosis } from '../hooks/useDiagnosis';
import { COLORS, SIZES, SHADOWS, TYPOGRAPHY } from '../styles/theme';
import EggCycleChart from '../components/EggCycleChart';
import OneLineCoach from '../components/OneLineCoach';
import MarketDriversList from '../components/MarketDriversList';

interface InvestmentDiagnosisScreenProps {
  assets: Asset[];
  onClose: () => void;
}

type DiagnosisStep = 'SURVEY' | 'RESULTS';

const InvestmentDiagnosisScreen: React.FC<InvestmentDiagnosisScreenProps> = ({
  assets,
  onClose,
}) => {
  // Diagnosis Hook
  const {
    isLoading,
    isProcessing,
    currentAnswers,
    latestResult,
    setAnswers,
    runDiagnosis,
    canRunDiagnosis,
    clearAnswers,
  } = useDiagnosis();
  const { t } = useLocale();

  // 화면 단계
  const [step, setStep] = useState<DiagnosisStep>('SURVEY');
  const [result, setResult] = useState<DiagnosisResult | null>(latestResult);

  /**
   * 진단 실행
   */
  const handleRunDiagnosis = async () => {
    if (!canRunDiagnosis) {
      Alert.alert(t('common.error'), t('diagnosis.selectInterestRate'));
      return;
    }

    try {
      const diagnosisResult = await runDiagnosis(assets);
      setResult(diagnosisResult);
      setStep('RESULTS');
    } catch (error) {
      Alert.alert(t('diagnosis.failed'), t('diagnosis.errorMessage'));
    }
  };

  /**
   * 설문 단계
   */
  const renderSurvey = () => {
    return (
      <ScrollView style={styles.surveyContainer} showsVerticalScrollIndicator={false}>
        <Text style={[TYPOGRAPHY.headingMedium, { color: COLORS.textPrimary, marginBottom: SIZES.lg }]}>
          📊 투자 진단
        </Text>

        <Text
          style={[
            TYPOGRAPHY.bodyMedium,
            { color: COLORS.textSecondary, marginBottom: SIZES.lg },
          ]}
        >
          Kostolany의 Egg 이론으로 현재 시장 단계를 분석합니다.
        </Text>

        {/* 필수: 금리 추세 */}
        <View style={styles.questionSection}>
          <Text
            style={[
              TYPOGRAPHY.labelMedium,
              { color: COLORS.textPrimary, marginBottom: SIZES.md },
            ]}
          >
            1. 현재 금리 추세는? *
          </Text>

          <Text
            style={[
              TYPOGRAPHY.bodySmall,
              { color: COLORS.textSecondary, marginBottom: SIZES.md },
            ]}
          >
            금리 추세는 Egg 단계 분석의 핵심입니다. 현재 상황을 선택하세요.
          </Text>

          <View style={styles.optionContainer}>
            {[
              {
                value: InterestRateTrend.PEAK,
                label: '🔴 고점 (상승 정점)',
                description: '금리가 오랫동안 높은 상태',
              },
              {
                value: InterestRateTrend.FALLING,
                label: '📉 하락 중',
                description: '금리가 내려가는 중',
              },
              {
                value: InterestRateTrend.BOTTOM,
                label: '🟢 저점 (하락 정점)',
                description: '금리가 오랫동안 낮은 상태',
              },
              {
                value: InterestRateTrend.RISING,
                label: '📈 상승 중',
                description: '금리가 올라가는 중',
              },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor:
                      currentAnswers.interestRateTrend === option.value
                        ? COLORS.primary + '30'
                        : COLORS.surface,
                    borderColor:
                      currentAnswers.interestRateTrend === option.value
                        ? COLORS.primary
                        : COLORS.border,
                  },
                ]}
                onPress={() =>
                  setAnswers({
                    interestRateTrend: option.value as InterestRateTrend,
                  })
                }
              >
                <Text
                  style={[
                    TYPOGRAPHY.labelMedium,
                    {
                      color:
                        currentAnswers.interestRateTrend === option.value
                          ? COLORS.primary
                          : COLORS.textPrimary,
                    },
                  ]}
                >
                  {option.label}
                </Text>
                <Text
                  style={[
                    TYPOGRAPHY.bodySmall,
                    { color: COLORS.textTertiary, marginTop: SIZES.xs },
                  ]}
                >
                  {option.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 선택사항: 추가 설문 (향후 확장용) */}
        <View style={[styles.questionSection, { opacity: 0.6 }]}>
          <Text
            style={[
              TYPOGRAPHY.labelMedium,
              { color: COLORS.textTertiary, marginBottom: SIZES.md },
            ]}
          >
            2. 거시 경제 전망 (선택사항)
          </Text>
          <Text
            style={[
              TYPOGRAPHY.bodySmall,
              { color: COLORS.textTertiary },
            ]}
          >
            추가 설문은 향후 업데이트에서 제공됩니다.
          </Text>
        </View>

        {/* 버튼 영역 */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: COLORS.primary,
                opacity: canRunDiagnosis ? 1 : 0.5,
              },
            ]}
            onPress={handleRunDiagnosis}
            disabled={!canRunDiagnosis || isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color={COLORS.textPrimary} />
            ) : (
              <Text
                style={[
                  TYPOGRAPHY.labelMedium,
                  { color: COLORS.textPrimary },
                ]}
              >
                진단 실행 →
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1 },
            ]}
            onPress={onClose}
          >
            <Text style={[TYPOGRAPHY.labelMedium, { color: COLORS.textSecondary }]}>
              닫기
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  /**
   * 결과 단계
   */
  const renderResults = () => {
    if (!result) {
      return (
        <View style={styles.resultContainer}>
          <Text style={[TYPOGRAPHY.headingMedium, { color: COLORS.error }]}>
            오류: 결과를 찾을 수 없습니다
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.resultContainer} showsVerticalScrollIndicator={false}>
        {/* Egg 차트 */}
        <EggCycleChart
          analysis={result.eggAnalysis}
          containerStyle={{ marginBottom: SIZES.lg }}
        />

        {/* 코칭 메시지 */}
        <View style={{ marginBottom: SIZES.lg }}>
          <OneLineCoach message={result.coachingMessage} showDetailed={true} />
        </View>

        {/* 시장 드라이버 */}
        <MarketDriversList drivers={result.marketDrivers} />

        {/* 포트폴리오 스냅샷 */}
        {result.portfolioSnapshot && (
          <View
            style={[
              styles.snapshotBox,
              {
                backgroundColor: COLORS.surfaceLight,
                borderColor: COLORS.border,
                marginTop: SIZES.lg,
              },
            ]}
          >
            <Text
              style={[
                TYPOGRAPHY.labelMedium,
                { color: COLORS.textPrimary, marginBottom: SIZES.md },
              ]}
            >
              📈 포트폴리오 현황
            </Text>

            <View style={styles.snapshotRow}>
              <Text style={[TYPOGRAPHY.bodySmall, { color: COLORS.textSecondary }]}>
                자산 수:
              </Text>
              <Text
                style={[
                  TYPOGRAPHY.labelSmall,
                  { color: COLORS.textPrimary, marginLeft: 'auto' },
                ]}
              >
                {result.portfolioSnapshot.assetCount}개
              </Text>
            </View>

            {result.portfolioSnapshot.cryptoAllocation > 0 && (
              <View style={styles.snapshotRow}>
                <Text style={[TYPOGRAPHY.bodySmall, { color: COLORS.textSecondary }]}>
                  암호화폐:
                </Text>
                <Text
                  style={[
                    TYPOGRAPHY.labelSmall,
                    { color: COLORS.textPrimary, marginLeft: 'auto' },
                  ]}
                >
                  {(result.portfolioSnapshot.cryptoAllocation / result.portfolioSnapshot.totalValue * 100).toFixed(1)}%
                </Text>
              </View>
            )}

            {result.portfolioSnapshot.cashAllocation > 0 && (
              <View style={styles.snapshotRow}>
                <Text style={[TYPOGRAPHY.bodySmall, { color: COLORS.textSecondary }]}>
                  현금:
                </Text>
                <Text
                  style={[
                    TYPOGRAPHY.labelSmall,
                    { color: COLORS.textPrimary, marginLeft: 'auto' },
                  ]}
                >
                  {(result.portfolioSnapshot.cashAllocation / result.portfolioSnapshot.totalValue * 100).toFixed(1)}%
                </Text>
              </View>
            )}
          </View>
        )}

        {/* 버튼 영역 */}
        <View style={[styles.buttonContainer, { marginTop: SIZES.lg }]}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: COLORS.primary }]}
            onPress={() => {
              clearAnswers();
              setStep('SURVEY');
            }}
          >
            <Text style={[TYPOGRAPHY.labelMedium, { color: COLORS.textPrimary }]}>
              다시 진단하기
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: COLORS.surface,
                borderColor: COLORS.border,
                borderWidth: 1,
              },
            ]}
            onPress={onClose}
          >
            <Text style={[TYPOGRAPHY.labelMedium, { color: COLORS.textSecondary }]}>
              닫기
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[TYPOGRAPHY.bodyMedium, { color: COLORS.textSecondary, marginTop: SIZES.lg }]}>
          데이터 로드 중...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {step === 'SURVEY' ? renderSurvey() : renderResults()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: SIZES.lg,
  },
  surveyContainer: {
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.lg,
  },
  resultContainer: {
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.lg,
  },
  questionSection: {
    marginBottom: SIZES.xl,
  },
  optionContainer: {
    gap: SIZES.md,
  },
  optionButton: {
    borderRadius: SIZES.rMd,
    borderWidth: 2,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    ...SHADOWS.small,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SIZES.md,
    marginBottom: SIZES.lg,
  },
  button: {
    flex: 1,
    borderRadius: SIZES.rMd,
    paddingVertical: SIZES.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  snapshotBox: {
    borderRadius: SIZES.rMd,
    borderWidth: 1,
    padding: SIZES.md,
  },
  snapshotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SIZES.xs,
  },
});

export default InvestmentDiagnosisScreen;
