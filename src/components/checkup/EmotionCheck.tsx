/**
 * EmotionCheck - 오늘의 투자 감정 (메모 포함)
 *
 * 코스톨라니: "투자 심리 관리" — 매일 감정을 터치로 기록.
 * 자기 감정을 인식하는 것만으로도 충동적 투자 결정을 줄일 수 있다.
 * Wave 3: 메모 입력 추가 (최대 30자)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../context/LocaleContext';

interface EmotionCheckProps {
  todayEmotion: string | null;
  onSelect: (emotion: string) => void;
  memo: string;
  onMemoChange: (memo: string) => void;
  onSave: () => void;
  /** 감정 기록 보상으로 받은 크레딧 (표시용) */
  rewardCredits?: number;
}

const EMOTION_KEYS = ['anxious', 'worried', 'neutral', 'calm', 'confident'] as const;
const EMOTION_EMOJIS: Record<string, string> = {
  anxious: '😰', worried: '😟', neutral: '😐', calm: '😊', confident: '🤑',
};

export default function EmotionCheck({
  todayEmotion,
  onSelect,
  memo,
  onMemoChange,
  onSave,
  rewardCredits = 0,
}: EmotionCheckProps) {
  const { colors } = useTheme();
  const { t } = useLocale();
  const isChecked = todayEmotion !== null && memo.length > 0;

  return (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={s.headerRow}>
        <Text style={[s.cardTitle, { color: colors.textPrimary }]}>{t('emotion_check.title')}</Text>
        {isChecked && (
          <View style={[s.checkedBadge, { backgroundColor: `${colors.primary}1F` }]}>
            <Text style={[s.checkedText, { color: colors.primaryDark ?? colors.primary }]}>{t('emotion_check.recorded')}</Text>
          </View>
        )}
      </View>

      {/* 이모지 버튼 */}
      <View style={s.emotionRow}>
        {EMOTION_KEYS.map((key) => {
          const isSelected = todayEmotion === key;
          return (
            <TouchableOpacity
              key={key}
              style={[
                s.emotionButton,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                isSelected && { backgroundColor: `${colors.primary}1F`, borderColor: `${colors.primary}4D` },
              ]}
              onPress={() => onSelect(key)}
              activeOpacity={0.7}
            >
              <Text style={[s.emotionEmoji, isSelected && s.emotionEmojiSelected]}>
                {EMOTION_EMOJIS[key]}
              </Text>
              <Text style={[
                s.emotionLabel,
                { color: colors.textSecondary },
                isSelected && { color: colors.primaryDark ?? colors.primary, fontWeight: '700' as const },
              ]}>
                {t(`emotion_check.${key}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 메모 입력 (감정 선택 시에만 표시) */}
      {todayEmotion && (
        <View style={[s.memoSection, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Text style={[s.memoLabel, { color: colors.textPrimary }]}>{t('emotion_check.memo_prompt')}</Text>
          <TextInput
            style={[s.memoInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
            placeholder={t('emotion_check.memo_placeholder')}
            placeholderTextColor={colors.textTertiary}
            maxLength={30}
            value={memo}
            onChangeText={onMemoChange}
            multiline
            numberOfLines={2}
          />
          <View style={s.memoFooter}>
            <Text style={[s.charCount, { color: colors.textTertiary }]}>{memo.length}/30</Text>
            <TouchableOpacity
              style={[
                s.saveButton,
                { backgroundColor: colors.primary },
                !todayEmotion && { backgroundColor: colors.disabled },
              ]}
              onPress={onSave}
              disabled={!todayEmotion}
              activeOpacity={0.7}
            >
              <Text style={[s.saveButtonText, !todayEmotion ? { color: colors.disabledText } : { color: '#FFFFFF' }]}>{t('emotion_check.save_button', { credits: '5' })}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 보상 토스트 */}
      {rewardCredits > 0 && (
        <View style={[s.rewardToast, { backgroundColor: `${colors.primary}1F`, borderColor: `${colors.primary}33` }]}>
          <Text style={[s.rewardToastText, { color: colors.primary }]}>
            {t('emotion_check.reward_toast', { credits: String(rewardCredits), amount: String(rewardCredits * 100) })}
          </Text>
        </View>
      )}

      {/* 선택된 감정 피드백 */}
      {isChecked && todayEmotion && (
        <View style={[s.feedbackRow, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Text style={[s.feedbackText, { color: colors.textSecondary }]}>
            {EMOTION_EMOJIS[todayEmotion]} {t(`emotion_check.feedback_${todayEmotion}`)}
          </Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    // backgroundColor: '#141414', // Now dynamic
    borderRadius: 16,
    borderWidth: 1,
    // borderColor: '#2A2A2A', // Now dynamic
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
    fontSize: 17,
    fontWeight: '700',
    // color: '#FFFFFF', // Now dynamic
  },
  checkedBadge: {
    // backgroundColor: 동적 적용
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  checkedText: {
    fontSize: 13,
    // color: 동적 적용 (colors.primaryDark)
    fontWeight: '600',
  },
  emotionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  emotionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    // backgroundColor & borderColor: 동적 적용
  },
  emotionEmoji: {
    fontSize: 25,
    marginBottom: 4,
  },
  emotionEmojiSelected: {
    fontSize: 29,
  },
  emotionLabel: {
    fontSize: 13,
    // color: '#808080', // Now dynamic
    fontWeight: '500',
    lineHeight: 18,
  },
  // emotionLabelSelected removed — applied dynamically inline
  feedbackRow: {
    marginTop: 14,
    // backgroundColor: 동적 적용 (colors.surfaceElevated)
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    // borderColor: 동적 적용 (colors.border)
  },
  feedbackText: {
    fontSize: 14,
    // color: '#B0B0B0', // Now dynamic
    lineHeight: 21,
  },
  // 메모 섹션
  memoSection: {
    marginTop: 16,
    // backgroundColor: 동적 적용 (colors.surfaceElevated)
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    // borderColor: 동적 적용 (colors.border)
  },
  memoLabel: {
    fontSize: 14,
    fontWeight: '600',
    // color: '#FFFFFF', // Now dynamic
    marginBottom: 8,
  },
  memoInput: {
    fontSize: 15,
    // color: '#FFFFFF', // Now dynamic
    // backgroundColor: '#0A0A0A', // Now dynamic
    borderRadius: 8,
    padding: 12,
    minHeight: 60,
    textAlignVertical: 'top',
    borderWidth: 1,
    // borderColor: '#2A2A2A', // Now dynamic
  },
  memoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  charCount: {
    fontSize: 13,
    // color: '#757575', // Now dynamic
  },
  saveButton: {
    // backgroundColor: 동적 적용 (colors.primary / colors.disabled)
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    // color: '#FFFFFF', // Now dynamic
  },
  rewardToast: {
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  rewardToastText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
