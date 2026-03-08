/**
 * UserQuestionInput — 사용자 질문 입력
 *
 * 역할: 라운드테이블 하단에 질문 입력 + 전송 버튼
 * - 전송 시 Gemini 추가 호출 → 각 구루 1문장 답변
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocale } from '../../context/LocaleContext';

interface UserQuestionInputProps {
  /** 질문 전송 콜백 */
  onSubmit: (question: string) => void;
  /** 전송 중 */
  isLoading: boolean;
  /** 비활성화 (토론 생성 중 등) */
  disabled?: boolean;
}

export function UserQuestionInput({ onSubmit, isLoading, disabled = false }: UserQuestionInputProps) {
  const [text, setText] = useState('');
  const { t } = useLocale();

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || isLoading || disabled) return;
    onSubmit(trimmed);
    setText('');
  }, [text, isLoading, disabled, onSubmit]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={t('roundtable.question_placeholder')}
          placeholderTextColor="#666"
          multiline
          maxLength={200}
          editable={!isLoading && !disabled}
          returnKeyType="send"
          onSubmitEditing={handleSubmit}
          blurOnSubmit
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!text.trim() || isLoading || disabled) && styles.sendButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!text.trim() || isLoading || disabled}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={18} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  input: {
    flex: 1,
    backgroundColor: '#252525',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#E0E0E0',
    maxHeight: 80,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#333',
  },
});
