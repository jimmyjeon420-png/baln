/**
 * TurnMessage — 개별 턴 말풍선
 *
 * 역할: 각 거장의 발언을 아바타 + 말풍선으로 표시
 * - 현재 턴: 타자기 효과 (TypewriterText)
 * - 지난 턴: 전체 텍스트 즉시 표시
 * - 센티먼트 배지 표시
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CharacterAvatar } from '../character/CharacterAvatar';
import { TypewriterText } from './TypewriterText';
import { GURU_CHARACTER_CONFIGS } from '../../data/guruCharacterConfig';
import { sentimentToExpression, getGuruDisplayName } from '../../services/characterService';
import { useLocale } from '../../context/LocaleContext';
import type { RoundtableTurn } from '../../types/roundtable';

const SENTIMENT_COLORS: Record<string, string> = {
  BULLISH: '#4CAF50',
  BEARISH: '#CF6679',
  NEUTRAL: '#9E9E9E',
  CAUTIOUS: '#FFB74D',
};

interface TurnMessageProps {
  turn: RoundtableTurn;
  /** 현재 재생 중인 턴인지 (타자기 효과 적용) */
  isCurrent: boolean;
  /** 타자기 완료 콜백 */
  onTypewriterComplete?: () => void;
}

export function TurnMessage({ turn, isCurrent, onTypewriterComplete }: TurnMessageProps) {
  const { t } = useLocale();
  const config = GURU_CHARACTER_CONFIGS[turn.speaker];
  const sentimentKey = turn.sentiment?.toLowerCase() as 'bullish' | 'bearish' | 'neutral' | 'cautious';
  const sentimentColor = SENTIMENT_COLORS[turn.sentiment] ?? SENTIMENT_COLORS.NEUTRAL;
  const sentimentText = t(`roundtable.sentiment.${sentimentKey}`);
  const accentColor = config?.accentColor || '#4CAF50';

  // 표정 전환: 타자기 진행 중 → 'neutral' (생각 중), 완료 후 → 실제 sentiment 표정
  const [isTyping, setIsTyping] = useState(isCurrent);
  const currentExpression = isCurrent && isTyping
    ? ('neutral' as const)
    : sentimentToExpression(turn.sentiment);

  const handleTypewriterComplete = () => {
    setIsTyping(false);
    onTypewriterComplete?.();
  };

  return (
    <View style={styles.container}>
      {/* 아바타 — 발언 시 thinking → sentiment 전환 */}
      <View style={styles.avatarSection}>
        <CharacterAvatar
          guruId={turn.speaker}
          size="sm"
          expression={currentExpression}
          animated={isCurrent}
          fallbackEmoji={config?.emoji}
        />
      </View>

      {/* 말풍선 */}
      <View style={styles.bubbleSection}>
        {/* 이름 + 센티먼트 배지 */}
        <View style={styles.nameRow}>
          <Text style={[styles.guruName, { color: accentColor }]}>
            {getGuruDisplayName(turn.speaker)}
          </Text>
          <View style={[styles.sentimentBadge, { backgroundColor: sentimentColor + '20' }]}>
            <Text style={[styles.sentimentText, { color: sentimentColor }]}>
              {sentimentText}
            </Text>
          </View>
        </View>

        {/* 메시지 (현재 턴: 타자기, 이전 턴: 즉시) */}
        <View style={[styles.bubble, { borderColor: accentColor + '30' }]}>
          {isCurrent ? (
            <TypewriterText
              text={turn.message}
              speed={25}
              onComplete={handleTypewriterComplete}
            />
          ) : (
            <Text style={styles.messageText}>{turn.message}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 16,
  },
  avatarSection: {
    paddingTop: 22,
  },
  bubbleSection: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  guruName: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sentimentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sentimentText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bubble: {
    backgroundColor: '#252525',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 14,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 15,
    color: '#D1D5DB',
    lineHeight: 22,
  },
});
