/**
 * AI 버핏과 티타임 - 실시간 대화형 투자 조언
 *
 * 역할: ChatGPT 스타일 대화형 AI 재무 상담
 * 사용자 흐름: 질문 입력 → AI 응답 → 추가 질문
 *
 * [수정 2026-02-13] 에러 처리 개선:
 * - API 호출 먼저 → 성공 시에만 크레딧 차감 (순서 변경)
 * - 로컬 폴백 응답 (네트워크/서버 에러 시 캐릭터별 안내)
 * - 에러 메시지를 대화 버블로 표시 (빨간 테두리 + 다시 시도 버튼)
 * - 네트워크 에러와 서버 에러 구분 안내
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
  // 에러 상태 (에러 버블 표시용)
  isError?: boolean;
  // 다시 시도할 원본 질문 (에러 시 재시도용)
  retryQuestion?: string;
}

// ============================================================================
// 로컬 폴백 응답 (서버 응답 실패 시 사용)
// ============================================================================

const LOCAL_FALLBACK_DEBATE = {
  warren: '허허, 자네. 지금 시장을 분석 중이라네. 체리콜라 한 잔 마시면서 잠시 기다려 주시게. 좋은 투자는 인내심에서 시작된다네.',
  dalio: '원칙 제1조: 인내심을 가지십시오. 시스템이 잠시 정비 중입니다. 이런 일시적 중단은 장기 성과에 영향을 주지 않습니다.',
  wood: 'Oh no! 기술적인 이슈가 있네요. 하지만 걱정 마세요, 곧 돌아올게요! Innovation은 멈추지 않으니까요!',
  summary: 'AI 분석 서버가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해주세요. 크레딧은 차감되지 않았습니다.',
};

/** 에러 종류를 판별하여 사용자 친화적 메시지 반환 */
function classifyError(err: any): { type: 'network' | 'server' | 'unknown'; message: string } {
  const msg = err?.message || '';

  // 네트워크 관련 에러
  if (
    msg.includes('network') ||
    msg.includes('Network') ||
    msg.includes('fetch') ||
    msg.includes('timeout') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('Failed to fetch') ||
    msg.includes('인터넷')
  ) {
    return {
      type: 'network',
      message: '인터넷 연결을 확인해주세요. Wi-Fi 또는 모바일 데이터가 켜져 있는지 확인 후 다시 시도해주세요.',
    };
  }

  // 서버 에러 (5xx, Gemini 관련)
  if (
    msg.includes('500') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('Gemini') ||
    msg.includes('AI 응답 실패') ||
    msg.includes('Edge Function')
  ) {
    return {
      type: 'server',
      message: 'AI 서버가 일시적으로 바쁩니다. 보통 1-2분 내에 복구됩니다. 잠시 후 다시 시도해주세요.',
    };
  }

  return {
    type: 'unknown',
    message: '일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
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
      console.error('[AI 버핏과 티타임] 공유 실패:', err);
    }
  }, [claimReward]);

  useEffect(() => {
    // 환영 메시지
    const welcomeMessage: Message = {
      id: 'welcome',
      role: 'assistant',
      text: '안녕하세요, 자네! 워렌 버핏이라고 하네. 체리콜라 한 잔 하면서 투자 이야기 나눠보겠나? 오늘은 달리오와 캐시도 함께 있으니, 편하게 물어보시게.',
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, []);

  /** 다시 시도 핸들러: 에러 메시지를 제거하고 해당 질문을 재전송 */
  const handleRetry = useCallback((errorMsgId: string, question: string) => {
    // 에러 메시지를 목록에서 제거
    setMessages(prev => prev.filter(m => m.id !== errorMsgId));
    // 원본 질문으로 재시도 (사용자 메시지는 이미 있으므로 직접 API만 호출)
    handleSend(question);
  }, []);

  const handleSend = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText) return;

    // 크레딧 잔액 확인
    const balance = credits?.balance ?? 0;
    if (balance < chatCost) {
      Alert.alert(
        '크레딧 부족',
        `질문 1회에 ${chatCost}크레딧(\u20A9${chatCost * 100})이 필요합니다.\n현재 잔액: ${balance}크레딧\n\n출석(+2C), 퀴즈 적중(+3C), 공유(+5C)로 모아보세요!`,
        [{ text: '확인' }]
      );
      return;
    }

    // 이미 같은 질문의 사용자 메시지가 마지막에 있으면 추가하지 않음 (재시도 시)
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    const isRetry = lastUserMsg?.text === messageText;

    if (!isRetry) {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        text: messageText,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
    }
    setInputText('');
    setIsLoading(true);

    try {
      // ============================================================
      // [핵심 변경] API 호출을 먼저 → 성공 시에만 크레딧 차감
      // 기존: 크레딧 차감 → API 호출 (실패하면 크레딧 날아감)
      // 변경: API 호출 → 성공 확인 → 크레딧 차감
      // ============================================================

      // 1단계: Gemini API 호출 (Edge Function 사용)
      if (__DEV__) console.log('[AI 버핏과 티타임] 질문:', messageText);
      const { data, error } = await supabase.functions.invoke('gemini-proxy', {
        body: {
          type: 'cfo-chat',
          data: {
            question: messageText,
            conversationHistory: messages.slice(-10), // 최근 10개 대화만 전달
          },
        },
      });

      // Edge Function 레벨 에러 (네트워크, 5xx 등)
      if (error) {
        throw new Error(`AI 응답 실패: ${error.message}`);
      }

      // Edge Function이 200을 반환했지만 내부 success:false인 경우
      if (data && data.success === false) {
        throw new Error(data.error || 'AI 서버에서 응답 생성에 실패했습니다.');
      }

      // 토론 형식 응답 파싱
      const debateData = data?.data;
      if (__DEV__) console.log('[AI 버핏과 티타임] 응답 수신 완료');

      // 응답 유효성 검사
      const hasValidDebate =
        debateData?.warren && debateData.warren.length > 0 &&
        debateData?.dalio && debateData.dalio.length > 0 &&
        debateData?.wood && debateData.wood.length > 0 &&
        debateData?.summary && debateData.summary.length > 0;

      if (!hasValidDebate && !debateData?.answer) {
        throw new Error('AI 응답이 불완전합니다. 다시 시도해주세요.');
      }

      // 2단계: API 성공 확인 후 크레딧 차감
      try {
        const spendResult = await spendCreditsMutation.mutateAsync({
          amount: chatCost,
          featureType: 'ai_cfo_chat',
        });

        if (!spendResult.success) {
          // 크레딧 차감 실패해도 응답은 보여줌 (사용자 경험 우선)
          console.warn('[AI 버핏과 티타임] 크레딧 차감 실패 (응답은 표시):', spendResult.errorMessage);
        }
      } catch (creditErr) {
        // 크레딧 차감 에러도 무시하고 응답은 보여줌
        console.warn('[AI 버핏과 티타임] 크레딧 차감 예외 (응답은 표시):', creditErr);
      }

      // 3단계: 응답 표시
      if (hasValidDebate) {
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
        // 폴백: 단일 답변 (warren만 있는 경우 등)
        const fallbackText = debateData?.answer || debateData?.warren || '응답을 처리하는 중 문제가 발생했습니다.';
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: fallbackText,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (err: any) {
      console.error('[AI 버핏과 티타임] 에러:', err);

      // 에러 분류 (네트워크 vs 서버 vs 기타)
      const classified = classifyError(err);

      // 에러 메시지를 대화 버블로 표시 (Alert 대신 인라인)
      // 폴백 토론 형식으로 에러 안내 + 다시 시도 버튼
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: '',
        timestamp: new Date(),
        isError: true,
        retryQuestion: messageText,
        debate: {
          ...LOCAL_FALLBACK_DEBATE,
          // summary에 구체적 에러 유형별 안내 추가
          summary: classified.type === 'network'
            ? `${LOCAL_FALLBACK_DEBATE.summary}\n\n[네트워크 오류] ${classified.message}`
            : classified.type === 'server'
              ? `${LOCAL_FALLBACK_DEBATE.summary}\n\n[서버 오류] ${classified.message}`
              : `${LOCAL_FALLBACK_DEBATE.summary}\n\n${classified.message}`,
        },
      };
      setMessages(prev => [...prev, errorMessage]);

      // 크레딧은 차감되지 않음 (API 호출이 먼저이므로 실패 시 차감 안 됨)
      // → 사용자에게 별도 안내 불필요
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    handleSend(question);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';

    // 토론 형식 렌더링 (에러 폴백 포함)
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
            style={[
              { backgroundColor: '#1A1A2E', padding: 16, borderRadius: 20 },
              // 에러 시 빨간 테두리 표시
              item.isError && { borderWidth: 2, borderColor: '#FF5252' },
            ]}
          >
          {/* 에러 배너 (에러 시만 표시) */}
          {item.isError && (
            <View style={s.errorBanner}>
              <Ionicons name="warning-outline" size={16} color="#FF5252" />
              <Text style={s.errorBannerText}>
                응답 생성 실패 - 크레딧이 차감되지 않았습니다
              </Text>
            </View>
          )}

          {/* baln 브랜딩 (강화) */}
          <View style={s.shareBrandRow}>
            <Text style={s.shareBrandText}>bal<Text style={{ color: '#4CAF50' }}>n</Text>.logic</Text>
            <Text style={s.shareBrandSub}>AI 버핏과 티타임</Text>
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
            <Text style={[s.investorName, { color: '#1976D2' }]}>워렌 버핏</Text>
            <Text style={[s.debateText, { color: '#2D2D2D' }]}>{item.debate.warren}</Text>
          </View>

          {/* 레이 달리오 */}
          <View style={[s.debateCard, { backgroundColor: '#F3E5F5', borderLeftColor: '#9C27B0' }]}>
            <Text style={[s.investorName, { color: '#7B1FA2' }]}>레이 달리오</Text>
            <Text style={[s.debateText, { color: '#2D2D2D' }]}>{item.debate.dalio}</Text>
          </View>

          {/* 캐시 우드 */}
          <View style={[s.debateCard, { backgroundColor: '#FCE4EC', borderLeftColor: '#E91E63' }]}>
            <Text style={[s.investorName, { color: '#C2185B' }]}>캐시 우드</Text>
            <Text style={[s.debateText, { color: '#2D2D2D' }]}>{item.debate.wood}</Text>
          </View>

          {/* 워렌 버핏 최종 정리 */}
          <View style={[s.summaryCard, { backgroundColor: '#FFF9C4', borderColor: '#FBC02D' }]}>
            <Text style={[s.summaryTitle, { color: '#F57F17' }]}>워렌의 한마디</Text>
            <Text style={[s.summaryText, { color: '#2D2D2D' }]}>{item.debate.summary}</Text>
          </View>

          {/* 바이럴 CTA (에러가 아닐 때만) */}
          {!item.isError && (
            <View style={s.captureCTA}>
              <Text style={s.captureCTAText}>{'나도 버핏과 대화하기 → baln.app'}</Text>
            </View>
          )}
          </ViewShot>

          {/* 다시 시도 버튼 (에러 시만 표시) */}
          {item.isError && item.retryQuestion && (
            <TouchableOpacity
              style={s.retryButton}
              onPress={() => handleRetry(item.id, item.retryQuestion!)}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={s.retryButtonText}>다시 시도</Text>
            </TouchableOpacity>
          )}

          {/* 공유 버튼 (에러가 아닐 때만) */}
          {!item.isError && (
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
          )}

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
              : item.isError
                ? { backgroundColor: colors.surface, borderWidth: 2, borderColor: '#FF5252' }
                : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
          ]}
        >
          {/* 에러 아이콘 (에러 메시지일 때) */}
          {item.isError && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Ionicons name="warning-outline" size={14} color="#FF5252" />
              <Text style={{ color: '#FF5252', fontSize: 12, fontWeight: '600' }}>오류 발생</Text>
            </View>
          )}
          <Text style={[s.messageText, { color: isUser ? '#FFFFFF' : colors.textPrimary }]}>
            {item.text}
          </Text>
          {/* 다시 시도 버튼 (에러 + 텍스트 메시지일 때) */}
          {item.isError && item.retryQuestion && (
            <TouchableOpacity
              style={[s.retryButton, { marginTop: 8 }]}
              onPress={() => handleRetry(item.id, item.retryQuestion!)}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={14} color="#FFFFFF" />
              <Text style={[s.retryButtonText, { fontSize: 12 }]}>다시 시도</Text>
            </TouchableOpacity>
          )}
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
  // ============================================================================
  // 에러 UI 스타일
  // ============================================================================
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.3)',
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#FF5252',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#7C4DFF',
    borderRadius: 20,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
