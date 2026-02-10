/**
 * EmotionCheck - 오늘의 투자 감정
 *
 * 코스톨라니: "투자 심리 관리" — 매일 감정을 터치로 기록.
 * 자기 감정을 인식하는 것만으로도 충동적 투자 결정을 줄일 수 있다.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface EmotionCheckProps {
  todayEmotion: string | null;
  onSelect: (emotion: string) => void;
}

const EMOTIONS = [
  { key: 'anxious', emoji: '😰', label: '불안' },
  { key: 'worried', emoji: '😟', label: '걱정' },
  { key: 'neutral', emoji: '😐', label: '보통' },
  { key: 'calm', emoji: '😊', label: '안심' },
  { key: 'confident', emoji: '🤑', label: '확신' },
] as const;

export default function EmotionCheck({ todayEmotion, onSelect }: EmotionCheckProps) {
  const isChecked = todayEmotion !== null;
  const selectedItem = EMOTIONS.find(e => e.key === todayEmotion);

  return (
    <View style={s.card}>
      <View style={s.headerRow}>
        <Text style={s.cardTitle}>오늘의 투자 감정</Text>
        {isChecked && (
          <View style={s.checkedBadge}>
            <Text style={s.checkedText}>기록됨 ✓</Text>
          </View>
        )}
      </View>

      {/* 이모지 버튼 */}
      <View style={s.emotionRow}>
        {EMOTIONS.map((item) => {
          const isSelected = todayEmotion === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[
                s.emotionButton,
                isSelected && s.emotionButtonSelected,
              ]}
              onPress={() => onSelect(item.key)}
              activeOpacity={0.7}
            >
              <Text style={[s.emotionEmoji, isSelected && s.emotionEmojiSelected]}>
                {item.emoji}
              </Text>
              <Text style={[s.emotionLabel, isSelected && s.emotionLabelSelected]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 선택된 감정 피드백 */}
      {isChecked && selectedItem && (
        <View style={s.feedbackRow}>
          <Text style={s.feedbackText}>
            {selectedItem.emoji} {getFeedback(selectedItem.key)}
          </Text>
        </View>
      )}
    </View>
  );
}

function getFeedback(key: string): string {
  switch (key) {
    case 'anxious': return '불안할 땐 매매를 쉬어가는 것도 전략이에요';
    case 'worried': return '걱정될 때는 원칙을 다시 확인해보세요';
    case 'neutral': return '차분한 마음이 좋은 결정을 만들어요';
    case 'calm': return '안정된 마음으로 투자하고 계시네요';
    case 'confident': return '확신이 있을 때도 분산투자는 유지하세요';
    default: return '';
  }
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#141414',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 24,
    marginHorizontal: 16,
    marginTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  checkedBadge: {
    backgroundColor: 'rgba(76,175,80,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  checkedText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  emotionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  emotionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
  },
  emotionButtonSelected: {
    backgroundColor: 'rgba(76,175,80,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.3)',
  },
  emotionEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  emotionEmojiSelected: {
    fontSize: 28,
  },
  emotionLabel: {
    fontSize: 11,
    color: '#808080',
    fontWeight: '500',
  },
  emotionLabelSelected: {
    color: '#4CAF50',
    fontWeight: '700',
  },
  feedbackRow: {
    marginTop: 14,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
  },
  feedbackText: {
    fontSize: 13,
    color: '#B0B0B0',
    lineHeight: 20,
  },
});
