/**
 * AI CFO 채팅 - 실시간 대화형 투자 조언
 *
 * 역할: ChatGPT 스타일 대화형 AI 재무 상담
 * 사용자 흐름: 질문 입력 → AI 응답 → 추가 질문
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import supabase from '../../src/services/supabase';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

const QUICK_QUESTIONS = [
  '지금 삼성전자 사도 될까요?',
  '비트코인 투자 어떻게 생각하세요?',
  '포트폴리오 리밸런싱이 필요한가요?',
  '배당주 추천해주세요',
];

export default function CFOChatScreen() {
  const { colors } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // 환영 메시지
    const welcomeMessage: Message = {
      id: 'welcome',
      role: 'assistant',
      text: '안녕하세요! 저는 AI 워렌 버핏입니다. 투자 관련 질문이 있으시면 편하게 물어보세요. 📊',
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, []);

  const handleSend = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: messageText,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // 실제 Gemini API 호출 (Edge Function 사용)
      console.log('[AI 워렌 버핏] 질문:', messageText);
      const { data, error } = await supabase.functions.invoke('gemini-proxy', {
        body: {
          type: 'cfo-chat',
          data: {
            question: messageText,
            conversationHistory: messages.slice(-10), // 최근 10개 대화만 전달 (컨텍스트)
          },
        },
      });

      if (error) {
        throw new Error(`AI 응답 실패: ${error.message}`);
      }

      const aiResponse = data?.data?.answer || '죄송합니다. 응답을 생성하지 못했습니다.';
      console.log('[AI 워렌 버핏] 응답:', aiResponse);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: aiResponse,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (err: any) {
      console.error('[AI 워렌 버핏] 에러:', err);
      Alert.alert('오류', err.message || '알 수 없는 오류가 발생했습니다');

      // 에러 메시지도 대화에 추가
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    handleSend(question);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[s.messageContainer, isUser ? s.userMessageContainer : s.aiMessageContainer]}>
        <View
          style={[
            s.messageBubble,
            isUser
              ? { backgroundColor: '#7C4DFF' }
              : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
          ]}
        >
          <Text style={[s.messageText, { color: isUser ? '#FFFFFF' : colors.textPrimary }]}>
            {item.text}
          </Text>
          <Text
            style={[s.timestamp, { color: isUser ? 'rgba(255,255,255,0.7)' : colors.textTertiary }]}
          >
            {item.timestamp.toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'AI 워렌 버핏',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 8, padding: 8 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[s.container, { backgroundColor: colors.background }]}
        keyboardVerticalOffset={100}
      >
        {/* 메시지 리스트 */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={s.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />

        {/* 로딩 인디케이터 */}
        {isLoading && (
          <View style={s.loadingContainer}>
            <ActivityIndicator size="small" color="#7C4DFF" />
            <Text style={[s.loadingText, { color: colors.textSecondary }]}>AI가 생각 중...</Text>
          </View>
        )}

        {/* 퀵 질문 (메시지가 환영 메시지만 있을 때) */}
        {messages.length === 1 && (
          <View style={s.quickQuestionsContainer}>
            <Text style={[s.quickQuestionsTitle, { color: colors.textSecondary }]}>
              빠른 질문:
            </Text>
            <View style={s.quickQuestions}>
              {QUICK_QUESTIONS.map((q, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleQuickQuestion(q)}
                  style={[s.quickQuestionButton, { backgroundColor: colors.surface }]}
                  activeOpacity={0.7}
                >
                  <Text style={[s.quickQuestionText, { color: colors.textPrimary }]}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* 입력창 */}
        <View style={[s.inputContainer, { backgroundColor: colors.surface }]}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="AI 워렌 버핏에게 물어보세요..."
            placeholderTextColor={colors.textTertiary}
            style={[s.input, { color: colors.textPrimary }]}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isLoading}
            style={[
              s.sendButton,
              { backgroundColor: !inputText.trim() || isLoading ? colors.disabled : '#7C4DFF' },
            ]}
            activeOpacity={0.7}
          >
            <Ionicons name="send" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  aiMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 11,
    textAlign: 'right',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 13,
  },
  quickQuestionsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  quickQuestionsTitle: {
    fontSize: 13,
    marginBottom: 8,
  },
  quickQuestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickQuestionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  quickQuestionText: {
    fontSize: 13,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
