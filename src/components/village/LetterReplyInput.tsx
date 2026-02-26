/**
 * LetterReplyInput — 구루 편지 답장 입력 컴포넌트
 *
 * 역할: "마을 우체국 답장 창구" — 구루 편지에 답장을 보내는 UI
 * 비유: 동물의숲에서 주민에게 편지 답장하는 것
 *
 * 기능:
 * - 텍스트 입력 (최대 200자)
 * - "보내기" 버튼
 * - 무료: 주 2회, Premium: 무제한
 * - 답장 큐 저장 → 다음 방문 시 구루 응답 도착
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { sendReply, getRemainingReplies } from '../../services/letterReplyService';

// ============================================================================
// i18n
// ============================================================================

const TEXT = {
  ko: {
    placeholder: '구루에게 답장을 작성하세요...',
    send: '보내기',
    hint: '답장은 다음 방문 시 도착합니다',
    remaining: (n: number) => `이번 주 답장 ${n}회 남음`,
    noReplies: '이번 주 무료 답장을 모두 사용했습니다',
    premiumHint: 'Premium 회원은 무제한',
    sent: '답장을 보냈습니다!',
    charCount: (n: number) => `${n}/200`,
  },
  en: {
    placeholder: 'Write a reply to the guru...',
    send: 'Send',
    hint: 'Reply will arrive on your next visit',
    remaining: (n: number) => `${n} free replies left this week`,
    noReplies: 'No free replies left this week',
    premiumHint: 'Unlimited for Premium',
    sent: 'Reply sent!',
    charCount: (n: number) => `${n}/200`,
  },
};

// ============================================================================
// Props
// ============================================================================

interface LetterReplyInputProps {
  guruId: string;
  locale?: string;
  isPremium?: boolean;
  colors: {
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

export function LetterReplyInput({
  guruId,
  locale = 'ko',
  isPremium = false,
  colors,
}: LetterReplyInputProps) {
  const isKo = locale === 'ko';
  const t = isKo ? TEXT.ko : TEXT.en;

  const [message, setMessage] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);
  const [sent, setSent] = useState(false);

  // Load remaining on mount
  React.useEffect(() => {
    getRemainingReplies(isPremium).then(setRemaining).catch(() => setRemaining(2));
  }, [isPremium]);

  const handleSend = useCallback(async () => {
    if (!message.trim()) return;

    const left = await getRemainingReplies(isPremium);
    if (!isPremium && left <= 0) {
      Alert.alert('', t.noReplies);
      return;
    }

    await sendReply(guruId, message.trim());
    setMessage('');
    setSent(true);
    setRemaining(prev => (prev !== null && !isPremium ? prev - 1 : prev));

    setTimeout(() => setSent(false), 3000);
  }, [message, guruId, isPremium, t.noReplies]);

  const canSend = message.trim().length > 0 && (isPremium || (remaining !== null && remaining > 0));

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {sent ? (
        <Text style={[styles.sentText, { color: colors.primary }]}>{t.sent}</Text>
      ) : (
        <>
          <TextInput
            style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
            placeholder={t.placeholder}
            placeholderTextColor={colors.textTertiary}
            value={message}
            onChangeText={text => setMessage(text.slice(0, 200))}
            multiline
            maxLength={200}
          />
          <View style={styles.bottomRow}>
            <View style={styles.infoCol}>
              <Text style={[styles.charCount, { color: colors.textTertiary }]}>
                {t.charCount(message.length)}
              </Text>
              {remaining !== null && !isPremium && (
                <Text style={[styles.remainingText, { color: colors.textTertiary }]}>
                  {t.remaining(remaining)}
                </Text>
              )}
              {isPremium && (
                <Text style={[styles.remainingText, { color: colors.primary }]}>
                  {t.premiumHint}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: canSend ? colors.primary : colors.border }]}
              onPress={handleSend}
              disabled={!canSend}
              activeOpacity={0.7}
            >
              <Text style={styles.sendButtonText}>{t.send}</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.hint, { color: colors.textTertiary }]}>{t.hint}</Text>
        </>
      )}
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 60,
    maxHeight: 100,
    textAlignVertical: 'top',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  infoCol: {
    gap: 2,
  },
  charCount: {
    fontSize: 11,
  },
  remainingText: {
    fontSize: 11,
    fontWeight: '500',
  },
  sendButton: {
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  hint: {
    fontSize: 11,
    textAlign: 'center',
  },
  sentText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
