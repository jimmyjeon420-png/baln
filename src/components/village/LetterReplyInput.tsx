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

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { sendReply, getRemainingReplies } from '../../services/letterReplyService';
import { useLocale } from '../../context/LocaleContext';

// ============================================================================
// Props
// ============================================================================

interface LetterReplyInputProps {
  guruId: string;
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
  isPremium = false,
  colors,
}: LetterReplyInputProps) {
  const { t } = useLocale();

  const [message, setMessage] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);
  const [sent, setSent] = useState(false);
  const sentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup sent timer on unmount
  useEffect(() => () => {
    if (sentTimerRef.current) clearTimeout(sentTimerRef.current);
  }, []);

  // Load remaining on mount
  React.useEffect(() => {
    let isMounted = true;
    getRemainingReplies(isPremium)
      .then(val => { if (isMounted) setRemaining(val); })
      .catch(() => { if (isMounted) setRemaining(2); });
    return () => { isMounted = false; };
  }, [isPremium]);

  const handleSend = useCallback(async () => {
    if (!message.trim()) return;

    const left = await getRemainingReplies(isPremium);
    if (!isPremium && left <= 0) {
      Alert.alert('', t('letterReply.noReplies'));
      return;
    }

    await sendReply(guruId, message.trim());
    setMessage('');
    setSent(true);
    setRemaining(prev => (prev !== null && !isPremium ? prev - 1 : prev));

    if (sentTimerRef.current) clearTimeout(sentTimerRef.current);
    sentTimerRef.current = setTimeout(() => setSent(false), 3000);
  }, [message, guruId, isPremium, t]);

  const canSend = message.trim().length > 0 && (isPremium || (remaining !== null && remaining > 0));

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {sent ? (
        <Text style={[styles.sentText, { color: colors.primary }]}>{t('letterReply.sent')}</Text>
      ) : (
        <>
          <TextInput
            style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
            placeholder={t('letterReply.placeholder')}
            placeholderTextColor={colors.textTertiary}
            value={message}
            onChangeText={text => setMessage(text.slice(0, 200))}
            multiline
            maxLength={200}
          />
          <View style={styles.bottomRow}>
            <View style={styles.infoCol}>
              <Text style={[styles.charCount, { color: colors.textTertiary }]}>
                {`${message.length}/200`}
              </Text>
              {remaining !== null && !isPremium && (
                <Text style={[styles.remainingText, { color: colors.textTertiary }]}>
                  {t('letterReply.remaining', { count: remaining })}
                </Text>
              )}
              {isPremium && (
                <Text style={[styles.remainingText, { color: colors.primary }]}>
                  {t('letterReply.premiumHint')}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: canSend ? colors.primary : colors.border }]}
              onPress={handleSend}
              disabled={!canSend}
              activeOpacity={0.7}
            >
              <Text style={styles.sendButtonText}>{t('letterReply.send')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.hint, { color: colors.textTertiary }]}>{t('letterReply.hint')}</Text>
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
