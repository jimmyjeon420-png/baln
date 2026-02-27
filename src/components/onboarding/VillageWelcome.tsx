/**
 * VillageWelcome — 마을 세계관 온보딩 오버레이
 *
 * 역할: "마을 입장 안내원" — 첫 방문 유저에게 아바타 선택, 멘토 구루 선택을 안내
 * 비유: 동물의숲 처음 시작 시 "너구리가 섬에 온 걸 환영해요!" 화면
 *
 * 4단계:
 * 1. 환영 메시지 + 마을 일러스트
 * 2. 아바타 동물 선택 (12종)
 * 3. 멘토 구루 선택 (10명)
 * 4. "마을 탐험 시작!" 완료
 *
 * 데이터: AsyncStorage 저장 (VILLAGE_ONBOARDING_COMPLETE, USER_AVATAR, MENTOR_GURU)
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GURU_CHARACTER_CONFIGS } from '../../data/guruCharacterConfig';
import { getGuruDisplayName } from '../../services/characterService';
import { t, getCurrentLanguage } from '../../locales';

// ============================================================================
// Constants
// ============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STORAGE_KEYS = {
  ONBOARDING_COMPLETE: '@baln:village_onboarding_complete',
  USER_AVATAR: '@baln:user_avatar',
  MENTOR_GURU: '@baln:mentor_guru',
};

const AVATAR_ANIMALS = [
  { id: 'rabbit', emoji: '🐰', nameKo: '토끼', nameEn: 'Rabbit' },
  { id: 'cat', emoji: '🐱', nameKo: '고양이', nameEn: 'Cat' },
  { id: 'dog', emoji: '🐶', nameKo: '강아지', nameEn: 'Dog' },
  { id: 'bear', emoji: '🐻', nameKo: '곰', nameEn: 'Bear' },
  { id: 'fox', emoji: '🦊', nameKo: '여우', nameEn: 'Fox' },
  { id: 'owl', emoji: '🦉', nameKo: '올빼미', nameEn: 'Owl' },
  { id: 'deer', emoji: '🦌', nameKo: '사슴', nameEn: 'Deer' },
  { id: 'penguin', emoji: '🐧', nameKo: '펭귄', nameEn: 'Penguin' },
  { id: 'koala', emoji: '🐨', nameKo: '코알라', nameEn: 'Koala' },
  { id: 'panda', emoji: '🐼', nameKo: '판다', nameEn: 'Panda' },
  { id: 'hamster', emoji: '🐹', nameKo: '햄스터', nameEn: 'Hamster' },
  { id: 'raccoon', emoji: '🦝', nameKo: '너구리', nameEn: 'Raccoon' },
] as const;

const COLOR_CHOICES = [
  { id: 'sky', hex: '#87CEEB', nameKo: '하늘', nameEn: 'Sky' },
  { id: 'coral', hex: '#FF7F7F', nameKo: '산호', nameEn: 'Coral' },
  { id: 'mint', hex: '#98FF98', nameKo: '민트', nameEn: 'Mint' },
  { id: 'lavender', hex: '#E6E6FA', nameKo: '라벤더', nameEn: 'Lavender' },
  { id: 'gold', hex: '#FFD700', nameKo: '골드', nameEn: 'Gold' },
  { id: 'peach', hex: '#FFDAB9', nameKo: '피치', nameEn: 'Peach' },
  { id: 'ice', hex: '#D0F0FF', nameKo: '아이스', nameEn: 'Ice' },
  { id: 'rose', hex: '#FFB6C1', nameKo: '로즈', nameEn: 'Rose' },
] as const;

const GURU_LIST = Object.values(GURU_CHARACTER_CONFIGS);

const STEPS = 4;

// ============================================================================
// i18n — translation keys under 'village.welcome.*'
// ============================================================================

// ============================================================================
// Props
// ============================================================================

interface VillageWelcomeProps {
  locale?: string;
  onComplete: () => void;
  colors: {
    background: string;
    surface: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    primary: string;
    border: string;
  };
}

// ============================================================================
// Component
// ============================================================================

export function VillageWelcome({ onComplete, colors }: VillageWelcomeProps) {
  const isKo = getCurrentLanguage() === 'ko';

  const [step, setStep] = useState(0);
  const [selectedAnimal, setSelectedAnimal] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('sky');
  const [selectedGuru, setSelectedGuru] = useState<string | null>(null);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateToStep = useCallback((nextStep: number) => {
    const direction = nextStep > step ? 1 : -1;
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: direction * -SCREEN_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: direction * SCREEN_WIDTH,
        duration: 0,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    setStep(nextStep);
  }, [step, slideAnim]);

  const handleNext = useCallback(async () => {
    if (step < STEPS - 1) {
      animateToStep(step + 1);
    } else {
      // Save selections
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
        if (selectedAnimal) {
          await AsyncStorage.setItem(
            STORAGE_KEYS.USER_AVATAR,
            JSON.stringify({ animal: selectedAnimal, color: selectedColor }),
          );
        }
        if (selectedGuru) {
          await AsyncStorage.setItem(STORAGE_KEYS.MENTOR_GURU, selectedGuru);
        }
      } catch {
        // Best effort
      }
      onComplete();
    }
  }, [step, selectedAnimal, selectedColor, selectedGuru, onComplete, animateToStep]);

  const canProceed =
    step === 0 ||
    (step === 1 && selectedAnimal !== null) ||
    (step === 2 && selectedGuru !== null) ||
    step === 3;

  // --- Step renderers ---

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.sceneText]}>{t('village.welcome.step1_scene')}</Text>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('village.welcome.step1_title')}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('village.welcome.step1_subtitle')}</Text>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('village.welcome.step2_title')}</Text>
      <View style={styles.animalGrid}>
        {AVATAR_ANIMALS.map(a => (
          <TouchableOpacity
            key={a.id}
            style={[
              styles.animalCell,
              { borderColor: selectedAnimal === a.id ? colors.primary : colors.border },
              selectedAnimal === a.id && { backgroundColor: colors.primary + '20' },
            ]}
            onPress={() => setSelectedAnimal(a.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.animalEmoji}>{a.emoji}</Text>
            <Text style={[styles.animalName, { color: colors.textSecondary }]}>
              {t('village.welcome.animal_' + a.id)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.colorTitle, { color: colors.textSecondary }]}>{t('village.welcome.step2_color_title')}</Text>
      <View style={styles.colorRow}>
        {COLOR_CHOICES.map(c => (
          <TouchableOpacity
            key={c.id}
            style={[
              styles.colorCircle,
              { backgroundColor: c.hex },
              selectedColor === c.id && styles.colorSelected,
            ]}
            onPress={() => setSelectedColor(c.id)}
            activeOpacity={0.7}
          />
        ))}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('village.welcome.step3_title')}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('village.welcome.step3_subtitle')}</Text>
      <ScrollView style={styles.guruScroll} showsVerticalScrollIndicator={false}>
        {GURU_LIST.map(g => (
          <TouchableOpacity
            key={g.guruId}
            style={[
              styles.guruRow,
              { borderColor: selectedGuru === g.guruId ? colors.primary : colors.border },
              selectedGuru === g.guruId && { backgroundColor: colors.primary + '20' },
            ]}
            onPress={() => setSelectedGuru(g.guruId)}
            activeOpacity={0.7}
          >
            <Text style={styles.guruEmoji}>{g.emoji}</Text>
            <View style={styles.guruInfo}>
              <Text style={[styles.guruName, { color: colors.textPrimary }]}>
                {getGuruDisplayName(g.guruId)}
              </Text>
              <Text style={[styles.guruDesc, { color: colors.textTertiary }]}>
                {isKo ? g.characterConcept : g.characterConceptEn}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );

  const renderStep4 = () => {
    const avatarAnimal = AVATAR_ANIMALS.find(a => a.id === selectedAnimal);
    const mentorGuru = selectedGuru ? GURU_CHARACTER_CONFIGS[selectedGuru] : null;
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.completionEmoji}>
          {avatarAnimal?.emoji ?? '🎉'} + {mentorGuru?.emoji ?? '🎓'}
        </Text>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('village.welcome.step4_title')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('village.welcome.step4_subtitle')}</Text>
      </View>
    );
  };

  const stepRenderers = [renderStep1, renderStep2, renderStep3, renderStep4];

  return (
    <View style={[styles.overlay, { backgroundColor: colors.background }]}>
      {/* Progress dots */}
      <View style={styles.dotsRow}>
        {Array.from({ length: STEPS }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i <= step ? colors.primary : colors.border,
              },
            ]}
          />
        ))}
      </View>

      {/* Animated step content */}
      <Animated.View style={[styles.content, { transform: [{ translateX: slideAnim }] }]}>
        {stepRenderers[step]()}
      </Animated.View>

      {/* Next / Start button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            { backgroundColor: canProceed ? colors.primary : colors.border },
          ]}
          onPress={handleNext}
          disabled={!canProceed}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            {step === STEPS - 1 ? t('village.welcome.start') : t('village.welcome.next')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  sceneText: {
    fontSize: 20,
    letterSpacing: 2,
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  animalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  animalCell: {
    width: 72,
    height: 80,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  animalEmoji: {
    fontSize: 28,
  },
  animalName: {
    fontSize: 11,
    fontWeight: '600',
  },
  colorTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSelected: {
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
    }),
  },
  guruScroll: {
    flex: 1,
    width: '100%',
    marginTop: 8,
  },
  guruRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 14,
  },
  guruEmoji: {
    fontSize: 32,
  },
  guruInfo: {
    flex: 1,
    gap: 3,
  },
  guruName: {
    fontSize: 16,
    fontWeight: '700',
  },
  guruDesc: {
    fontSize: 12,
  },
  completionEmoji: {
    fontSize: 48,
    marginBottom: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 16,
  },
  nextButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
