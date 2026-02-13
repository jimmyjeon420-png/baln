/**
 * AI 버핏과 티타임 1:1 채팅 — 메시지당 크레딧, 포트폴리오 컨텍스트 자동 주입
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ChatBubble from '../../src/components/ChatBubble';
import { ChatSkeletonLoader } from '../../src/components/MarketplaceSkeletonLoader';
import CreditBadge from '../../src/components/CreditBadge';
import { useAICFOChat } from '../../src/hooks/useAIMarketplace';
import { useMyCredits } from '../../src/hooks/useCredits';
import { getDiscountedCost } from '../../src/services/creditService';
import { useHaptics } from '../../src/hooks/useHaptics';
import supabase, { getCurrentUser } from '../../src/services/supabase';
import type { UserTier } from '../../src/types/database';
import type { CFOChatInput } from '../../src/types/marketplace';
import { useTheme } from '../../src/hooks/useTheme';

export default function AICFOChatScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { mediumTap } = useHaptics();
  const scrollRef = useRef<ScrollView>(null);

  const [userTier, setUserTier] = useState<UserTier>('SILVER');
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');

  // 세션 ID: 날짜 기반 (하루 하나의 세션)
  const sessionId = `cfo-${new Date().toISOString().slice(0, 10)}`;

  const { sendMessage, messages } = useAICFOChat(sessionId);
  const { data: credits } = useMyCredits();

  const { discountedCost } = getDiscountedCost('ai_cfo_chat', userTier);
  const hasEnoughCredits = (credits?.balance ?? 0) >= discountedCost;

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        try {
          const user = await getCurrentUser();
          if (!user) return;

          const [profileRes, portfolioRes] = await Promise.all([
            supabase.from('profiles').select('tier, total_assets').eq('id', user.id).single(),
            supabase.from('portfolios').select('*').eq('user_id', user.id),
          ]);

          if (profileRes.data?.tier) setUserTier(profileRes.data.tier as UserTier);
          if (portfolioRes.data) setPortfolio(portfolioRes.data);
        } catch (err) {
          if (__DEV__) console.warn('[AICFOChat] 데이터 로드 실패:', err);
        }
      };
      load();
    }, [])
  );

  // 새 메시지 시 자동 스크롤
  useEffect(() => {
    if (messages.data) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.data]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    if (!hasEnoughCredits) {
      Alert.alert(
        '크레딧 부족',
        `메시지 전송에 ${discountedCost} 크레딧이 필요합니다.`,
        [
          { text: '취소', style: 'cancel' },
          { text: '충전하기', onPress: () => router.push('/marketplace/credits') },
        ]
      );
      return;
    }

    mediumTap();
    const text = inputText.trim();
    setInputText('');

    const totalAssets = portfolio.reduce((s: number, p: any) => s + (p.current_value || 0), 0);
    const topHoldings = portfolio
      .sort((a: any, b: any) => (b.current_value || 0) - (a.current_value || 0))
      .slice(0, 5)
      .map((p: any) => ({
        ticker: p.ticker || p.name,
        name: p.name,
        allocation: totalAssets > 0
          ? Math.round(((p.current_value || 0) / totalAssets) * 100)
          : 0,
      }));

    const input: CFOChatInput = {
      sessionId,
      message: text,
      portfolioContext: {
        totalAssets,
        tier: userTier,
        topHoldings,
      },
    };

    try {
      await sendMessage.mutateAsync({ input, userTier });
    } catch (err: any) {
      Alert.alert('전송 실패', err.message || 'AI 응답 생성에 실패했습니다.');
    }
  };

  const chatMessages = messages.data || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>AI 버핏 티타임</Text>
          <Text style={styles.headerSubtitle}>
            메시지당 {discountedCost} 크레딧
          </Text>
        </View>
        <CreditBadge size="small" />
      </View>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* 메시지 목록 */}
        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageContent}
        >
          {/* 환영 메시지 */}
          {chatMessages.length === 0 && !messages.isLoading && (
            <View style={styles.welcomeContainer}>
              <Ionicons name="sparkles" size={40} color="#7C4DFF" />
              <Text style={styles.welcomeTitle}>AI 버핏에게 물어보세요</Text>
              <Text style={styles.welcomeDesc}>
                포트폴리오 맞춤 재무 상담을 제공합니다.{'\n'}
                투자 전략, 리스크 관리, 자산 배분 등{'\n'}
                무엇이든 질문하세요.
              </Text>

              {/* 추천 질문 */}
              <View style={styles.suggestedQuestions}>
                {[
                  '내 포트폴리오 리스크가 높은가요?',
                  '지금 리밸런싱해야 할까요?',
                  '세금 절약 방법을 알려주세요',
                ].map((q, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.suggestionChip}
                    onPress={() => {
                      mediumTap();
                      setInputText(q);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestionText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {messages.isLoading && <ChatSkeletonLoader />}

          {chatMessages.map((msg: any) => (
            <ChatBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              timestamp={msg.created_at}
              creditsCharged={msg.credits_charged}
            />
          ))}

          {/* AI 응답 대기 중 */}
          {sendMessage.isPending && (
            <View style={styles.typingIndicator}>
              <View style={styles.typingAvatar}>
                <Ionicons name="sparkles" size={12} color="#7C4DFF" />
              </View>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color="#7C4DFF" />
                <Text style={styles.typingText}>AI 버핏이 답변 중...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* 입력창 */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="재무 질문을 입력하세요..."
            placeholderTextColor="#555"
            multiline
            maxLength={500}
            editable={!sendMessage.isPending}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || sendMessage.isPending) && styles.sendDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || sendMessage.isPending}
            activeOpacity={0.7}
          >
            <Ionicons name="send" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#2A2A2A',
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  headerSubtitle: { color: '#888', fontSize: 11, marginTop: 2 },
  chatContainer: { flex: 1 },
  messageList: { flex: 1 },
  messageContent: { paddingVertical: 16 },
  welcomeContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  welcomeTitle: { color: '#FFF', fontSize: 20, fontWeight: '700', marginTop: 12 },
  welcomeDesc: { color: '#888', fontSize: 14, textAlign: 'center', lineHeight: 22, marginTop: 8 },
  suggestedQuestions: { gap: 8, marginTop: 24, width: '100%' },
  suggestionChip: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  suggestionText: { color: '#CCC', fontSize: 14, textAlign: 'center' },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  typingAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#7C4DFF20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#252525',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  typingText: { color: '#888', fontSize: 13 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#2A2A2A',
    backgroundColor: '#1A1A1A',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#252525',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#FFF',
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#333',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7C4DFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.3 },
});
