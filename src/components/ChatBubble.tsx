/**
 * ChatBubble - AI 버핏과 티타임 채팅 말풍선 컴포넌트
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  creditsCharged?: number;
}

export default function ChatBubble({
  role,
  content,
  timestamp,
  creditsCharged,
}: ChatBubbleProps) {
  const isUser = role === 'user';

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      {/* AI 아바타 */}
      {!isUser && (
        <View style={styles.avatar}>
          <Ionicons name="sparkles" size={16} color="#7C4DFF" />
        </View>
      )}

      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {!isUser && (
          <Text style={styles.aiLabel}>AI 버핏</Text>
        )}
        <Text style={[styles.content, isUser ? styles.userContent : styles.assistantContent]}>
          {content}
        </Text>
        <View style={styles.footer}>
          {timestamp && (
            <Text style={styles.timestamp}>
              {new Date(timestamp).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          )}
          {isUser && creditsCharged && creditsCharged > 0 ? (
            <View style={styles.creditTag}>
              <Ionicons name="diamond" size={10} color="#7C4DFF" />
              <Text style={styles.creditText}>{creditsCharged}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  assistantContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#7C4DFF20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  bubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#7C4DFF',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#252525',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#333',
  },
  aiLabel: {
    color: '#7C4DFF',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
  },
  userContent: {
    color: '#FFF',
  },
  assistantContent: {
    color: '#DDD',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  timestamp: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
  },
  creditTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  creditText: {
    color: '#7C4DFF',
    fontSize: 10,
    fontWeight: '600',
  },
});
