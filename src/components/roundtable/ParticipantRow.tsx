/**
 * ParticipantRow — 참석자 아바타 줄
 *
 * 역할: 라운드테이블 상단에 3~5명 아바타를 가로 배치
 * - 현재 발언자: speakingAnimation 활성 + 테두리 glow
 * - 대기자: idleAnimation만
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { CharacterAvatar } from '../character/CharacterAvatar';
import { useSpeakingAnimation } from '../character/animations/useSpeakingAnimation';
import { GURU_CHARACTER_CONFIGS } from '../../data/guruCharacterConfig';
import { getGuruDisplayName } from '../../services/characterService';

interface ParticipantRowProps {
  /** 참석자 guruId 배열 */
  participantIds: string[];
  /** 현재 발언자 guruId (없으면 아무도 발언하지 않는 상태) */
  activeSpeaker?: string;
}

function ParticipantAvatar({
  guruId,
  isActive,
}: {
  guruId: string;
  isActive: boolean;
}) {
  const config = GURU_CHARACTER_CONFIGS[guruId];
  const { speakingStyle, glowOpacity, startSpeaking, stopSpeaking } = useSpeakingAnimation();

  React.useEffect(() => {
    if (isActive) {
      startSpeaking();
    } else {
      stopSpeaking();
    }
  }, [isActive, startSpeaking, stopSpeaking]);

  const accentColor = config?.accentColor || '#4CAF50';

  return (
    <View style={styles.participantItem}>
      <Animated.View style={[styles.avatarWrapper, isActive && speakingStyle]}>
        {/* glow 효과 (발언 중일 때) */}
        {isActive && (
          <Animated.View
            style={[
              styles.glowRing,
              {
                borderColor: accentColor,
                opacity: glowOpacity,
              },
            ]}
          />
        )}
        <View style={isActive ? [styles.activeBorder, { borderColor: accentColor }] : undefined}>
          <CharacterAvatar
            guruId={guruId}
            size="sm"
            animated
            expression={isActive ? 'bullish' : 'neutral'}
            fallbackEmoji={config?.emoji}
          />
        </View>
      </Animated.View>
      <Text style={[styles.name, isActive && { color: accentColor, fontWeight: '700' }]} numberOfLines={1}>
        {getGuruDisplayName(guruId)}
      </Text>
    </View>
  );
}

export function ParticipantRow({ participantIds, activeSpeaker }: ParticipantRowProps) {
  return (
    <View style={styles.container}>
      {participantIds.map(id => (
        <ParticipantAvatar
          key={id}
          guruId={id}
          isActive={id === activeSpeaker}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  participantItem: {
    alignItems: 'center',
    gap: 4,
    minWidth: 52,
  },
  avatarWrapper: {
    position: 'relative',
  },
  activeBorder: {
    borderWidth: 2,
    borderRadius: 24,
    padding: 2,
  },
  glowRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 28,
    borderWidth: 2,
  },
  name: {
    fontSize: 11,
    color: '#9E9E9E',
    textAlign: 'center',
    maxWidth: 56,
  },
});
