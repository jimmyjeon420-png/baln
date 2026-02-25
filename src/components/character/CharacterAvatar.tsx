/**
 * CharacterAvatar — 메인 아바타 렌더러
 *
 * 역할: guruId + size + expression을 받아 적절한 SVG 캐릭터를 렌더링
 * 비유: "캐릭터 자동 배치기" — 구루 ID만 주면 알아서 맞는 캐릭터를 보여줌
 *
 * animated=true 시 idle 애니메이션 적용 (숨쉬기, 깜빡임, 흔들림)
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import type { CharacterExpression, CharacterSize } from '../../types/character';
import { CHARACTER_SIZE_MAP } from '../../types/character';
import { GURU_CHARACTER_CONFIGS } from '../../data/guruCharacterConfig';
import { sentimentToExpression } from '../../services/characterService';
import { useIdleAnimation } from './animations/useIdleAnimation';

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
}: {
  guruId: string;
  pixelSize: number;
  resolvedExpression: CharacterExpression;
  fallbackEmoji?: string;
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

/** animated=true 버전 (idle 애니메이션 적용) */
function AnimatedAvatar({
  guruId,
  pixelSize,
  resolvedExpression,
  fallbackEmoji,
}: {
  guruId: string;
  pixelSize: number;
  resolvedExpression: CharacterExpression;
  fallbackEmoji?: string;
}) {
  const config = GURU_CHARACTER_CONFIGS[guruId];
  const SvgComponent = CHARACTER_COMPONENTS[guruId];
  const { breathingStyle, swayStyle, blinkPhaseRef } = useIdleAnimation();

  if (SvgComponent && config) {
    return (
      <Animated.View
        style={[
          styles.container,
          { width: pixelSize, height: pixelSize },
          breathingStyle,
          swayStyle,
        ]}
      >
        <SvgComponent
          size={pixelSize}
          expression={resolvedExpression}
          accentColor={config.accentColor}
          blinkPhase={blinkPhaseRef.current}
        />
      </Animated.View>
    );
  }

  // 폴백: 이모지 렌더링 (애니메이션 적용)
  const emoji = fallbackEmoji || config?.emoji || '👤';
  const bgColor = config?.accentColor || '#2A2A2A';
  const emojiSize = pixelSize * 0.52;

  return (
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
      ]}
    >
      <Text style={{ fontSize: emojiSize }}>{emoji}</Text>
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
      />
    );
  }

  return (
    <StaticAvatar
      guruId={guruId}
      pixelSize={pixelSize}
      resolvedExpression={resolvedExpression}
      fallbackEmoji={fallbackEmoji}
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
