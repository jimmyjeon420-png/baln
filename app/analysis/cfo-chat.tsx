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
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';

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
      text: '안녕하세요! 저는 당신의 AI CFO입니다. 투자 관련 질문이 있으시면 편하게 물어보세요. 📊',
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

    // TODO: Gemini API 호출
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: getAIResponse(messageText),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1500);
  };

  // Mock AI 응답 (실제로는 Gemini API 호출)
  const getAIResponse = (question: string): string => {
    if (question.includes('삼성전자')) {
      return '현재 삼성전자는 AI 반도체 수요로 실적 개선이 예상됩니다. 다만 단기 변동성이 있을 수 있으니 분할 매수를 권장합니다. 현재 PER 12.5배는 역사적으로 저평가 구간입니다.';
    }
    if (question.includes('비트코인')) {
      return '비트코인은 고위험 자산입니다. 전체 포트폴리오의 5% 이내로 제한하고, 잃어도 괜찮은 금액만 투자하세요. 현재 ETF 승인으로 제도권 진입 중이지만 변동성은 여전히 높습니다.';
    }
    if (question.includes('리밸런싱')) {
      return '당신의 현재 주식 비중이 70%로 높습니다. 시장 급락에 대비해 채권 비중을 25%까지 늘리는 것을 추천합니다. 리밸런싱은 분기별 1회가 적정합니다.';
    }
    return '좋은 질문입니다! 투자는 장기적 관점에서 접근하세요. 더 구체적인 질문을 해주시면 더 정확한 답변을 드릴 수 있습니다.';
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
          title: 'AI CFO',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
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
            placeholder="AI CFO에게 물어보세요..."
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
