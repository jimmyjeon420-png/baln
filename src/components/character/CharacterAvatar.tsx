/**
 * CharacterAvatar — 메인 아바타 렌더러
 *
 * 역할: guruId + size + expression을 받아 적절한 SVG 캐릭터를 렌더링
 * 비유: "캐릭터 자동 배치기" — 구루 ID만 주면 알아서 맞는 캐릭터를 보여줌
 *
 * animated=true 시 idle 애니메이션 적용 (숨쉬기, 깜빡임, 흔들림)
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { CHARACTER_SIZE_MAP, type CharacterExpression, type CharacterSize } from '../../types/character';
import { GURU_CHARACTER_CONFIGS } from '../../data/guruCharacterConfig';
import { sentimentToExpression } from '../../services/characterService';
import { useIdleAnimation } from './animations/useIdleAnimation';
import { useActivityAnimation } from './animations/useActivityAnimation';
import { useWanderAnimation } from './animations/useWanderAnimation';
import { useSignatureMove } from './animations/useSignatureMove';
import { ClothingOverlay } from './layers/ClothingOverlay';
import { AccessoryOverlay, AccessoryType } from './layers/AccessoryOverlay';
import { MoodParticles } from './layers/MoodParticles';
import type { ClothingLevel, GuruMood, GuruActivity } from '../../types/village';

// SVG 캐릭터 컴포넌트 임포트 (주토피아 × 동물의숲 10종)
import { BuffettCharacter } from './characters/BuffettCharacter';
import { DalioCharacter } from './characters/DalioCharacter';
import { CathieWoodCharacter } from './characters/CathieWoodCharacter';
import { DruckenmillerCharacter } from './characters/DruckenmillerCharacter';
import { SaylorCharacter } from './characters/SaylorCharacter';
import { DimonCharacter } from './characters/DimonCharacter';
import { MuskCharacter } from './characters/MuskCharacter';
import { LynchCharacter } from './characters/LynchCharacter';
import { MarksCharacter } from './characters/MarksCharacter';
import { RogersCharacter } from './characters/RogersCharacter';

interface CharacterAvatarProps {
  /** 구루 ID (buffett, dalio, cathie_wood 등) */
  guruId: string;
  /** 렌더링 크기 */
  size?: CharacterSize;
  /** 표정 (직접 지정) */
  expression?: CharacterExpression;
  /** 센티먼트 문자열 (BULLISH/BEARISH 등 → 자동 변환) */
  sentiment?: string;
  /** 이모지 폴백 오버라이드 */
  fallbackEmoji?: string;
  /** idle 애니메이션 활성화 (라운드테이블 등에서 사용) */
  animated?: boolean;
  /** 의상 레이어 (기온 기반) */
  clothingLevel?: ClothingLevel;
  /** 구루 감정 상태 (파티클 이펙트용) */
  mood?: GuruMood;
  /** 구루 현재 활동 (파티클 이펙트용) */
  activity?: GuruActivity;
  /** 장식 아이템 목록 */
  accessories?: AccessoryType[];
  /** 감정 파티클 이펙트 표시 여부 (기본값 false) */
  showParticles?: boolean;
}

/** guruId → SVG 컴포넌트 매핑 (주토피아 동물 10종) */
const CHARACTER_COMPONENTS: Record<string, React.FC<{ size: number; expression: CharacterExpression; accentColor: string; blinkPhase?: number }>> = {
  buffett: BuffettCharacter,         // 🦉 올빼미
  dalio: DalioCharacter,             // 🐬 돌고래
  cathie_wood: CathieWoodCharacter,  // 🦊 여우
  druckenmiller: DruckenmillerCharacter, // 🦅 독수리
  saylor: SaylorCharacter,           // 🐺 늑대
  dimon: DimonCharacter,             // 🦁 사자
  musk: MuskCharacter,               // 🦎 카멜레온
  lynch: LynchCharacter,             // 🐻 곰
  marks: MarksCharacter,             // 🐢 거북이
  rogers: RogersCharacter,           // 🐯 호랑이
};

/** animated=false (정적) 버전 */
function StaticAvatar({
  guruId,
  pixelSize,
  resolvedExpression,
  fallbackEmoji,
  clothingLevel,
  mood,
  activity,
  accessories,
  showParticles,
}: {
  guruId: string;
  pixelSize: number;
  resolvedExpression: CharacterExpression;
  fallbackEmoji?: string;
  clothingLevel?: ClothingLevel;
  mood?: GuruMood;
  activity?: GuruActivity;
  accessories?: AccessoryType[];
  showParticles?: boolean;
}) {
  const config = GURU_CHARACTER_CONFIGS[guruId];
  const SvgComponent = CHARACTER_COMPONENTS[guruId];

  if (SvgComponent && config) {
    return (
      <View style={[styles.container, { width: pixelSize, height: pixelSize }]}>
        <SvgComponent
          size={pixelSize}
          expression={resolvedExpression}
          accentColor={config.accentColor}
        />
        {clothingLevel && (
          <ClothingOverlay
            size={pixelSize}
            clothingLevel={clothingLevel}
            guruId={guruId}
            accentColor={config.accentColor}
          />
        )}
        {accessories && accessories.length > 0 && (
          <AccessoryOverlay
            size={pixelSize}
            accessories={accessories}
            accentColor={config.accentColor}
          />
        )}
        {showParticles && mood && (
          <MoodParticles
            size={pixelSize}
            mood={mood}
            activity={activity}
          />
        )}
      </View>
    );
  }

  // 폴백: 이모지 렌더링
  const emoji = fallbackEmoji || config?.emoji || '👤';
  const bgColor = config?.accentColor || '#2A2A2A';
  const emojiSize = pixelSize * 0.52;

  return (
    <View
      style={[
        styles.emojiFallback,
        {
          width: pixelSize,
          height: pixelSize,
          borderRadius: pixelSize / 2,
          backgroundColor: bgColor + '20',
          borderColor: bgColor + '60',
        },
      ]}
    >
      <Text style={{ fontSize: emojiSize }}>{emoji}</Text>
    </View>
  );
}

/** animated=true 버전 (idle + 시그니처 무브 + 감정 크로스페이드 적용) */
function AnimatedAvatar({
  guruId,
  pixelSize,
  resolvedExpression,
  fallbackEmoji,
  clothingLevel,
  mood,
  activity,
  accessories,
  showParticles,
}: {
  guruId: string;
  pixelSize: number;
  resolvedExpression: CharacterExpression;
  fallbackEmoji?: string;
  clothingLevel?: ClothingLevel;
  mood?: GuruMood;
  activity?: GuruActivity;
  accessories?: AccessoryType[];
  showParticles?: boolean;
}) {
  const config = GURU_CHARACTER_CONFIGS[guruId];
  const SvgComponent = CHARACTER_COMPONENTS[guruId];
  const { breathingStyle, swayStyle, blinkPhaseRef } = useIdleAnimation();
  const { activityStyle } = useActivityAnimation({ activity, isActive: true });
  const { wanderStyle } = useWanderAnimation({ enabled: true, activity, guruId });
  const { signatureStyle } = useSignatureMove({ guruId });

  // ── P0-3: 감정 크로스페이드 (이전→새 표정 0.4초 전환) ──────────────
  const prevExpressionRef = useRef<CharacterExpression>(resolvedExpression);
  const crossfadeOpacity = useRef(new Animated.Value(1)).current;
  const showPrev = useRef(false);

  useEffect(() => {
    if (prevExpressionRef.current !== resolvedExpression) {
      // 이전 표정 기억 + 크로스페이드 시작
      showPrev.current = true;
      crossfadeOpacity.setValue(0);
      Animated.timing(crossfadeOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        showPrev.current = false;
        prevExpressionRef.current = resolvedExpression;
      });
    }
  }, [resolvedExpression, crossfadeOpacity]);

  if (SvgComponent && config) {
    return (
      <Animated.View
        style={[
          { width: pixelSize, height: pixelSize },
          wanderStyle,
        ]}
      >
      <Animated.View
        style={[
          styles.container,
          { width: pixelSize, height: pixelSize },
          breathingStyle,
          swayStyle,
          activityStyle,
          signatureStyle,
        ]}
      >
        {/* 이전 표정 (크로스페이드 아웃) */}
        {showPrev.current && prevExpressionRef.current !== resolvedExpression && (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { opacity: Animated.subtract(new Animated.Value(1), crossfadeOpacity) },
            ]}
          >
            <SvgComponent
              size={pixelSize}
              expression={prevExpressionRef.current}
              accentColor={config.accentColor}
              blinkPhase={blinkPhaseRef.current}
            />
          </Animated.View>
        )}
        {/* 현재 표정 (크로스페이드 인) */}
        <Animated.View style={{ opacity: crossfadeOpacity }}>
          <SvgComponent
            size={pixelSize}
            expression={resolvedExpression}
            accentColor={config.accentColor}
            blinkPhase={blinkPhaseRef.current}
          />
        </Animated.View>
        {clothingLevel && (
          <ClothingOverlay
            size={pixelSize}
            clothingLevel={clothingLevel}
            guruId={guruId}
            accentColor={config.accentColor}
          />
        )}
        {accessories && accessories.length > 0 && (
          <AccessoryOverlay
            size={pixelSize}
            accessories={accessories}
            accentColor={config.accentColor}
          />
        )}
        {showParticles && mood && (
          <MoodParticles
            size={pixelSize}
            mood={mood}
            activity={activity}
          />
        )}
      </Animated.View>
      </Animated.View>
    );
  }

  // 폴백: 이모지 렌더링 (애니메이션 적용)
  const emoji = fallbackEmoji || config?.emoji || '👤';
  const bgColor = config?.accentColor || '#2A2A2A';
  const emojiSize = pixelSize * 0.52;

  return (
    <Animated.View style={[wanderStyle]}>
      <Animated.View
        style={[
          styles.emojiFallback,
          {
            width: pixelSize,
            height: pixelSize,
            borderRadius: pixelSize / 2,
            backgroundColor: bgColor + '20',
            borderColor: bgColor + '60',
          },
          breathingStyle,
          swayStyle,
          activityStyle,
          signatureStyle,
        ]}
      >
        <Text style={{ fontSize: emojiSize }}>{emoji}</Text>
      </Animated.View>
    </Animated.View>
  );
}

export function CharacterAvatar({
  guruId,
  size = 'md',
  expression,
  sentiment,
  fallbackEmoji,
  animated = false,
  clothingLevel,
  mood,
  activity,
  accessories,
  showParticles = false,
}: CharacterAvatarProps) {
  const pixelSize = CHARACTER_SIZE_MAP[size];

  // 표정 결정: 직접 지정 > 센티먼트 자동 변환 > 기본 neutral
  const resolvedExpression: CharacterExpression =
    expression || (sentiment ? sentimentToExpression(sentiment) : 'neutral');

  if (animated) {
    return (
      <AnimatedAvatar
        guruId={guruId}
        pixelSize={pixelSize}
        resolvedExpression={resolvedExpression}
        fallbackEmoji={fallbackEmoji}
        clothingLevel={clothingLevel}
        mood={mood}
        activity={activity}
        accessories={accessories}
        showParticles={showParticles}
      />
    );
  }

  return (
    <StaticAvatar
      guruId={guruId}
      pixelSize={pixelSize}
      resolvedExpression={resolvedExpression}
      fallbackEmoji={fallbackEmoji}
      clothingLevel={clothingLevel}
      mood={mood}
      activity={activity}
      accessories={accessories}
      showParticles={showParticles}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  emojiFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
});
