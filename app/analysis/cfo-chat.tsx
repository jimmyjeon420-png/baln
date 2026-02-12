/**
 * AI CFO 채팅 - 실시간 대화형 투자 조언
 *
 * 역할: ChatGPT 스타일 대화형 AI 재무 상담
 * 사용자 흐름: 질문 입력 → AI 응답 → 추가 질문
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { HeaderBar } from '../../src/components/common/HeaderBar';
import { useTheme } from '../../src/hooks/useTheme';
import { useMyCredits, useSpendCredits } from '../../src/hooks/useCredits';
import { useShareReward } from '../../src/hooks/useRewards';
import { FEATURE_COSTS } from '../../src/types/marketplace';
import { REWARD_AMOUNTS } from '../../src/services/rewardService';
import supabase from '../../src/services/supabase';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  // 토론 형식 (3명 투자자 + 정리)
  debate?: {
    warren: string;
    dalio: string;
    wood: string;
    summary: string;
  };
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
  const { data: credits } = useMyCredits();
  const spendCreditsMutation = useSpendCredits();
  const chatCost = FEATURE_COSTS.ai_cfo_chat; // 1크레딧
  const { rewarded, claimReward } = useShareReward();
  const [shareRewardMsg, setShareRewardMsg] = useState<string | null>(null);
  const debateRefs = useRef<Record<string, ViewShot | null>>({});

  const handleShareDebate = useCallback(async (msgId: string) => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('공유 불가', '이 기기에서는 공유 기능을 사용할 수 없습니다.');
        return;
      }
      const ref = debateRefs.current[msgId];
      if (!ref?.capture) return;
      const uri = await ref.capture();
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'AI 버핏과 티타임 공유',
        UTI: 'public.png',
      });
      const result = await claimReward();
      if (result.success) {
        setShareRewardMsg(`+${result.creditsEarned} 크레딧 획득!`);
        setTimeout(() => setShareRewardMsg(null), 3000);
      }
    } catch (err) {
      console.error('[CFO Share] 공유 실패:', err);
    }
  }, [claimReward]);

  useEffect(() => {
    // 환영 메시지
    const welcomeMessage: Message = {
      id: 'welcome',
      role: 'assistant',
      text: '안녕하세요, 자네! 워렌 버핏이라고 하네. 체리콜라 한 잔 하면서 투자 이야기 나눠보겠나? 오늘은 달리오와 캐시도 함께 있으니, 편하게 물어보시게. 🍒',
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, []);

  const handleSend = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText) return;

    // 크레딧 잔액 확인
    const balance = credits?.balance ?? 0;
    if (balance < chatCost) {
      Alert.alert(
        '크레딧 부족',
        `질문 1회에 ${chatCost}크레딧(₩${chatCost * 100})이 필요합니다.\n현재 잔액: ${balance}크레딧\n\n출석(+2C), 퀴즈 적중(+3C), 공유(+5C)로 모아보세요!`,
        [{ text: '확인' }]
      );
      return;
    }

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
      // 크레딧 차감 실행
      const spendResult = await spendCreditsMutation.mutateAsync({
        amount: chatCost,
        featureType: 'ai_cfo_chat',
      });

      if (!spendResult.success) {
        throw new Error(spendResult.errorMessage || '크레딧 차감에 실패했습니다.');
      }

      // Gemini API 호출 (Edge Function 사용)
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

      // 토론 형식 응답 파싱
      const debateData = data?.data;
      console.log('[AI 워렌 버핏] 응답:', debateData);

      if (debateData?.warren && debateData?.dalio && debateData?.wood && debateData?.summary) {
        // 토론 형식 메시지
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: '', // debate 필드 사용
          timestamp: new Date(),
          debate: {
            warren: debateData.warren,
            dalio: debateData.dalio,
            wood: debateData.wood,
            summary: debateData.summary,
          },
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        // 폴백: 단일 답변
        const fallbackText = debateData?.answer || '죄송합니다. 응답을 생성하지 못했습니다.';
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: fallbackText,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);
      }
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

    // 토론 형식 렌더링
    if (!isUser && item.debate) {
      // 사용자 질문 찾기 (캡처에 포함)
      const prevMsg = messages.find((m, idx) => {
        const nextIdx = messages.indexOf(item);
        return m.role === 'user' && idx === nextIdx - 1;
      });

      return (
        <View style={[s.messageContainer, s.aiMessageContainer]}>
          <ViewShot
            ref={(ref) => { debateRefs.current[item.id] = ref; }}
            options={{ format: 'png', quality: 1.0 }}
            style={{ backgroundColor: '#1A1A2E', padding: 16, borderRadius: 20 }}
          >
          {/* baln 브랜딩 (강화) */}
          <View style={s.shareBrandRow}>
            <Text style={s.shareBrandText}>bal<Text style={{ color: '#4CAF50' }}>n</Text>.logic</Text>
            <Text style={s.shareBrandSub}>AI 버핏과 티타임 ☕</Text>
          </View>

          {/* 사용자 질문 (캡처에 포함) */}
          {prevMsg && (
            <View style={s.captureQuestion}>
              <Text style={s.captureQuestionLabel}>Q.</Text>
              <Text style={s.captureQuestionText}>{prevMsg.text}</Text>
            </View>
          )}

          {/* 워렌 버핏 */}
          <View style={[s.debateCard, { backgroundColor: '#E3F2FD', borderLeftColor: '#2196F3' }]}>
            <Text style={[s.investorName, { color: '#1976D2' }]}>🦉 워렌 버핏</Text>
            <Text style={[s.debateText, { color: '#2D2D2D' }]}>{item.debate.warren}</Text>
          </View>

          {/* 레이 달리오 */}
          <View style={[s.debateCard, { backgroundColor: '#F3E5F5', borderLeftColor: '#9C27B0' }]}>
            <Text style={[s.investorName, { color: '#7B1FA2' }]}>🌊 레이 달리오</Text>
            <Text style={[s.debateText, { color: '#2D2D2D' }]}>{item.debate.dalio}</Text>
          </View>

          {/* 캐시 우드 */}
          <View style={[s.debateCard, { backgroundColor: '#FCE4EC', borderLeftColor: '#E91E63' }]}>
            <Text style={[s.investorName, { color: '#C2185B' }]}>🚀 캐시 우드</Text>
            <Text style={[s.debateText, { color: '#2D2D2D' }]}>{item.debate.wood}</Text>
          </View>

          {/* 워렌 버핏 최종 정리 */}
          <View style={[s.summaryCard, { backgroundColor: '#FFF9C4', borderColor: '#FBC02D' }]}>
            <Text style={[s.summaryTitle, { color: '#F57F17' }]}>🦉 워렌의 한마디</Text>
            <Text style={[s.summaryText, { color: '#2D2D2D' }]}>{item.debate.summary}</Text>
          </View>

          {/* 바이럴 CTA */}
          <View style={s.captureCTA}>
            <Text style={s.captureCTAText}>나도 버핏과 대화하기 → baln.app</Text>
          </View>
          </ViewShot>

          {/* 공유 버튼 */}
          <TouchableOpacity
            style={s.shareDebateButton}
            onPress={() => handleShareDebate(item.id)}
            activeOpacity={0.7}
          >
            <Ionicons name="share-social" size={14} color="#4CAF50" />
            <Text style={s.shareDebateText}>인스타 공유</Text>
            {!rewarded && (
              <View style={s.shareRewardBadge}>
                <Text style={s.shareRewardBadgeText}>+{REWARD_AMOUNTS.shareCard}C</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={[s.timestamp, { color: colors.textTertiary, marginTop: 8 }]}>
            {item.timestamp.toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      );
    }

    // 일반 메시지 렌더링 (사용자 또는 폴백)
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <HeaderBar
        title="AI 버핏과 티타임"
        rightElement={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="diamond" size={14} color="#7C4DFF" />
            <Text style={{ color: '#7C4DFF', fontSize: 14, fontWeight: '600' }}>
              {credits?.balance ?? 0}
            </Text>
          </View>
        }
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[s.container, { backgroundColor: colors.background }]}
        keyboardVerticalOffset={100}
      >
        {/* 투자 면책 안내 */}
        <View style={s.disclaimerBanner}>
          <Ionicons name="information-circle-outline" size={14} color="#888" />
          <Text style={s.disclaimerText}>
            본 정보는 투자 참고용이며, 투자 권유가 아닙니다. 투자 판단의 책임은 본인에게 있습니다.
          </Text>
        </View>

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

        {/* 공유 보상 토스트 */}
        {shareRewardMsg && (
          <View style={s.rewardToast}>
            <Ionicons name="gift" size={14} color="#4CAF50" />
            <Text style={s.rewardToastText}>{shareRewardMsg}</Text>
          </View>
        )}

        {/* 입력창 */}
        <View style={[s.inputContainer, { backgroundColor: colors.surface }]}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="버핏에게 질문하기 (1크레딧)..."
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
    </SafeAreaView>
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
  debateCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  investorName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  debateText: {
    fontSize: 14,
    lineHeight: 20,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
    marginTop: 6,
    borderWidth: 2,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  shareBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingLeft: 4,
  },
  shareBrandText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  shareBrandSub: {
    fontSize: 12,
    color: '#AAAAAA',
    fontWeight: '500',
  },
  captureQuestion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(124, 77, 255, 0.15)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(124, 77, 255, 0.3)',
  },
  captureQuestionLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#7C4DFF',
  },
  captureQuestionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    lineHeight: 20,
  },
  captureCTA: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  captureCTAText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#AAAAAA',
    letterSpacing: 0.3,
  },
  shareDebateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
    borderRadius: 16,
  },
  shareDebateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  shareRewardBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  shareRewardBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  rewardToast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  rewardToastText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4CAF50',
  },
  disclaimerBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    gap: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: '#888888',
    lineHeight: 16,
  },
});
