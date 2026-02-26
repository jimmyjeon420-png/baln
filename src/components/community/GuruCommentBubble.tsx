import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GURU_CHARACTER_CONFIGS } from '../../data/guruCharacterConfig';
import type { GuruCharacterConfig } from '../../types/character';
import { t } from '../../locales';

interface GuruCommentBubbleProps {
  guruId: string;
  content: string;
  contentEn?: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'CAUTIOUS';
  createdAt: string;
}

const SENTIMENT_CONFIG: Record<
  GuruCommentBubbleProps['sentiment'],
  { label: string; color: string; dot: string }
> = {
  BULLISH: { label: 'Bullish', color: '#4CAF50', dot: '🟢' },
  BEARISH: { label: 'Bearish', color: '#F44336', dot: '🔴' },
  NEUTRAL: { label: 'Neutral', color: '#9E9E9E', dot: '⚪' },
  CAUTIOUS: { label: 'Cautious', color: '#FFC107', dot: '🟡' },
};

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMin = Math.floor((now - then) / 60000);

  if (diffMin < 1) return t('common.justNow') ?? '방금';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d`;
}

export default function GuruCommentBubble({
  guruId,
  content,
  contentEn,
  sentiment,
  createdAt,
}: GuruCommentBubbleProps) {
  const guruConfig: GuruCharacterConfig | undefined = GURU_CHARACTER_CONFIGS[guruId];

  const emoji = guruConfig?.emoji ?? '🤖';
  const guruName = guruConfig?.guruName ?? guruId;
  const accentColor = guruConfig?.accentColor ?? '#4CAF50';

  const sentimentInfo = SENTIMENT_CONFIG[sentiment];

  return (
    <View style={styles.container}>
      {/* Avatar */}
      <View style={[styles.avatarCircle, { backgroundColor: accentColor }]}>
        <Text style={styles.avatarEmoji}>{emoji}</Text>
      </View>

      {/* Bubble */}
      <View style={styles.bubbleWrapper}>
        {/* Header row: name + sentiment badge + time */}
        <View style={styles.headerRow}>
          <Text style={styles.guruName}>{guruName}</Text>
          <View style={[styles.sentimentBadge, { backgroundColor: sentimentInfo.color + '22' }]}>
            <Text style={styles.sentimentDot}>{sentimentInfo.dot}</Text>
            <Text style={[styles.sentimentLabel, { color: sentimentInfo.color }]}>
              {sentimentInfo.label}
            </Text>
          </View>
          <Text style={styles.timeText}>{formatRelativeTime(createdAt)}</Text>
        </View>

        {/* Speech bubble */}
        <View style={styles.speechBubble}>
          <Text style={styles.contentText}>{content}</Text>
          {contentEn ? (
            <Text style={styles.contentEnText}>{contentEn}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  avatarEmoji: {
    fontSize: 16,
  },
  bubbleWrapper: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  guruName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  sentimentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  sentimentDot: {
    fontSize: 8,
  },
  sentimentLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  timeText: {
    color: '#888888',
    fontSize: 11,
    marginLeft: 'auto',
  },
  speechBubble: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    borderTopLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  contentText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  contentEnText: {
    color: '#AAAAAA',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
});
