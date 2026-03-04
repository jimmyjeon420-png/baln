/**
 * VillageTutorialOverlay — 마을 첫 진입 튜토리얼 오버레이
 *
 * 역할: 신규 유저가 마을에 처음 들어왔을 때 8단계 가이드를 보여줌
 * - 구루 캐릭터가 직접 안내 (워렌 버핏 → 달리오 → 린치 → ...)
 * - 각 스텝 완료 시 크레딧 보상
 * - "건너뛰기" 가능
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
} from 'react-native';
import {
  getTutorialState,
  completeStep,
  skipTutorial,
  getNextStep,
  TUTORIAL_STEPS,
  type TutorialStep,
  type TutorialState,
} from '../../services/villageTutorialService';
import { CharacterAvatar } from '../character/CharacterAvatar';
import { GURU_CHARACTER_CONFIGS } from '../../data/guruCharacterConfig';
import { getGuruDisplayName } from '../../services/characterService';
import type { ThemeColors } from '../../styles/colors';

interface VillageTutorialOverlayProps {
  colors: ThemeColors;
  locale: string;
  /** 외부에서 튜토리얼 액션 완료를 알려줄 때 */
  onStepAction?: (action: string) => void;
}

export function VillageTutorialOverlay({
  colors,
  locale,
}: VillageTutorialOverlayProps) {
  const [tutorialState, setTutorialState] = useState<TutorialState | null>(null);
  const [currentStep, setCurrentStep] = useState<TutorialStep | null>(null);
  const [rewardText, setRewardText] = useState<string | null>(null);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const isKo = locale === 'ko';

  // 튜토리얼 상태 로드
  useEffect(() => {
    (async () => {
      const state = await getTutorialState();
      setTutorialState(state);
      if (!state.isComplete && !state.skipped) {
        const next = getNextStep(state.completedSteps);
        setCurrentStep(next);
        // 페이드 인
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }
    })();
  }, [fadeAnim]);

  // 다음 스텝으로 진행
  const handleNext = useCallback(async () => {
    if (!currentStep) return;

    const result = await completeStep(currentStep.id);

    // 보상 표시
    if (result.reward) {
      setRewardText(
        isKo
          ? `+${result.reward.credits}C ${result.reward.message}`
          : `+${result.reward.credits}C ${result.reward.messageEn}`,
      );
      setTimeout(() => setRewardText(null), 2000);
    }

    if (result.nextStep) {
      setCurrentStep(result.nextStep);
    } else {
      // 튜토리얼 완료 → 페이드 아웃
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => setCurrentStep(null));
    }
  }, [currentStep, isKo, fadeAnim]);

  // 건너뛰기
  const handleSkip = useCallback(async () => {
    await skipTutorial();
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setCurrentStep(null));
  }, [fadeAnim]);

  // 이미 완료/건너뛰었으면 표시 안 함
  if (!currentStep || tutorialState?.isComplete || tutorialState?.skipped) {
    return null;
  }

  const _guruConfig = GURU_CHARACTER_CONFIGS[currentStep.guruId];
  const stepCount = TUTORIAL_STEPS.length;
  const stepNumber = currentStep.order;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      {/* 반투명 배경 (탭하면 닫히지 않음) */}
      <View style={styles.dimBackground} />

      {/* 튜토리얼 카드 */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {/* 진행도 바 */}
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.primary,
                width: `${(stepNumber / stepCount) * 100}%`,
              },
            ]}
          />
        </View>

        {/* 구루 아바타 + 안내 */}
        <View style={styles.guruRow}>
          <CharacterAvatar
            guruId={currentStep.guruId}
            size="sm"
            expression="bullish"
            animated
          />
          <View style={styles.guruInfo}>
            <Text style={[styles.guruName, { color: colors.primary }]}>
              {getGuruDisplayName(currentStep.guruId)}
            </Text>
            <Text style={[styles.stepCounter, { color: colors.textTertiary }]}>
              {stepNumber}/{stepCount}
            </Text>
          </View>
        </View>

        {/* 제목 */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {isKo ? currentStep.title : currentStep.titleEn}
        </Text>

        {/* 설명 */}
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {isKo ? currentStep.description : currentStep.descriptionEn}
        </Text>

        {/* 보상 표시 */}
        {rewardText && (
          <View style={[styles.rewardBadge, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.rewardText, { color: colors.primary }]}>
              {rewardText}
            </Text>
          </View>
        )}

        {/* 버튼 */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={[styles.skipText, { color: colors.textTertiary }]}>
              {isKo ? '건너뛰기' : 'Skip'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: colors.primary }]}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextText}>
              {stepNumber === stepCount
                ? (isKo ? '시작하기!' : "Let's go!")
                : (isKo ? '다음' : 'Next')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 300,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },
  dimBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  card: {
    width: '90%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: { elevation: 12 },
    }),
  },
  progressBar: {
    height: 3,
    borderRadius: 2,
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  guruRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  guruInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  guruName: {
    fontSize: 14,
    fontWeight: '700',
  },
  stepCounter: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },
  rewardBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  rewardText: {
    fontSize: 13,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  nextButton: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  nextText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
