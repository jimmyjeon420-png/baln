import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getPortfolioAdvice } from '../../src/services/gemini';
import supabase, { getCurrentUser } from '../../src/services/supabase';
import { createChatSession, addChatMessage } from '../../src/services/setupDatabase';
import { useTheme } from '../../src/hooks/useTheme';

// 메시지 타입 정의
interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

// 탭 타입 정의
type TabType = 'ai' | 'team';

export default function StrategyScreen() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('ai');
  const [aiMessages, setAiMessages] = useState<Message[]>([]);
  const [teamMessages, setTeamMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // 현재 사용자 정보 로드
  useEffect(() => {
    const loadUser = async () => {
      const user = await getCurrentUser();
      if (user) {
        setCurrentUser({
          id: user.id,
          name: user.email?.split('@')[0] || '익명',
        });
      } else {
        setCurrentUser({
          id: 'guest-' + Date.now(),
          name: '게스트',
        });
      }
    };
    loadUser();
  }, []);

  // AI 채팅 초기 메시지
  useEffect(() => {
    if (activeTab === 'ai' && aiMessages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome-1',
        text: '안녕하세요! 저는 AI 투자 상담사입니다. 🤖\n\n포트폴리오 전략, 리밸런싱, 시장 분석에 대해 질문해 주세요.\n\n예시 질문:\n• "현재 미국 주식 비중을 줄여야 할까요?"\n• "방어적 포트폴리오 전략을 추천해 주세요"\n• "비트코인 비중은 얼마가 적당할까요?"',
        isUser: false,
        timestamp: new Date(),
      };
      setAiMessages([welcomeMessage]);
    }
  }, [activeTab, aiMessages.length]);

  // 팀 채팅 초기 메시지
  useEffect(() => {
    if (activeTab === 'team' && teamMessages.length === 0) {
      const systemMessage: Message = {
        id: 'system-1',
        text: '🏢 전략 회의실에 입장했습니다.\n\n다른 투자자들과 전략을 공유하고 토론해 보세요.\n\n⚠️ 투자 조언이 아닌 정보 공유 목적입니다.',
        isUser: false,
        timestamp: new Date(),
      };
      setTeamMessages([systemMessage]);
    }
  }, [activeTab, teamMessages.length]);

  // 팀 채팅 Realtime 구독
  useEffect(() => {
    if (activeTab !== 'team' || !currentUser) return;

    const channel = supabase
      .channel('team-strategy-room')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_messages',
        },
        (payload) => {
          const newMsg = payload.new as any;
          if (newMsg.user_id === currentUser.id) return;

          const message: Message = {
            id: newMsg.id,
            text: newMsg.content,
            isUser: false,
            timestamp: new Date(newMsg.created_at),
          };
          setTeamMessages((prev) => [...prev, message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab, currentUser]);

  // 스크롤 맨 아래로
  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // AI 메시지 전송
  const sendAiMessage = useCallback(async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setAiMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    scrollToBottom();

    try {
      const response = await getPortfolioAdvice(userMessage.text);

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        isUser: false,
        timestamp: new Date(),
      };

      setAiMessages((prev) => [...prev, aiResponse]);
      scrollToBottom();

      // Supabase에 대화 저장 (로그인 사용자만)
      if (currentUser && !currentUser.id.startsWith('guest-')) {
        try {
          let sid = sessionId;
          if (!sid) {
            const session = await createChatSession(currentUser.id, '전략 상담 - ' + new Date().toLocaleDateString('ko-KR'));
            sid = session?.id;
            setSessionId(sid || null);
          }
          if (sid) {
            await addChatMessage(sid, 'user', userMessage.text);
            await addChatMessage(sid, 'assistant', response);
          }
        } catch (dbError) {
          // DB 저장 실패는 무시 (non-critical)
        }
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        isUser: false,
        timestamp: new Date(),
      };
      setAiMessages((prev) => [...prev, errorMessage]);
      scrollToBottom();
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, currentUser, sessionId]);

  // 팀 메시지 전송
  const sendTeamMessage = useCallback(async () => {
    if (!inputText.trim() || !currentUser) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setTeamMessages((prev) => [...prev, userMessage]);
    setInputText('');
    scrollToBottom();

    try {
      await supabase.from('team_messages').insert({
        content: userMessage.text,
        user_id: currentUser.id,
        user_name: currentUser.name,
        room_id: 'global-strategy',
      });
    } catch (error) {
      // 팀 메시지 전송 실패는 무시 (UI에 이미 표시됨)
    }
  }, [inputText, currentUser]);

  // 메시지 버블 렌더링
  const renderMessage = (message: Message) => (
    <View
      key={message.id}
      style={[
        styles.messageBubble,
        message.isUser
          ? [styles.userBubble, { backgroundColor: colors.primary }]
          : [styles.aiBubble, { backgroundColor: colors.surface }],
      ]}
    >
      <Text style={[styles.messageText, { color: colors.textPrimary }]}>{message.text}</Text>
      <Text style={[styles.messageTime, { color: colors.textSecondary }]}>
        {message.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  const currentMessages = activeTab === 'ai' ? aiMessages : teamMessages;
  const handleSend = activeTab === 'ai' ? sendAiMessage : sendTeamMessage;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>전략 회의실</Text>
      </View>

      {/* 탭 네비게이션 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, { backgroundColor: colors.surface }, activeTab === 'ai' && { backgroundColor: colors.primary + '20', borderWidth: 1, borderColor: colors.primary }]}
          onPress={() => setActiveTab('ai')}
        >
          <Ionicons
            name="sparkles"
            size={18}
            color={activeTab === 'ai' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'ai' && { color: colors.primary }]}>
            AI 상담
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, { backgroundColor: colors.surface }, activeTab === 'team' && { backgroundColor: colors.primary + '20', borderWidth: 1, borderColor: colors.primary }]}
          onPress={() => setActiveTab('team')}
        >
          <Ionicons
            name="people"
            size={18}
            color={activeTab === 'team' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'team' && { color: colors.primary }]}>
            팀 채팅
          </Text>
        </TouchableOpacity>
      </View>

      {/* 채팅 영역 */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {currentMessages.map(renderMessage)}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>AI가 응답 중...</Text>
            </View>
          )}
        </ScrollView>

        {/* 입력 영역 */}
        <View style={[styles.inputContainer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.background, color: colors.textPrimary }]}
            placeholder={activeTab === 'ai' ? '전략에 대해 질문하세요...' : '전략을 공유하세요...'}
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: colors.primary }, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons name="send" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 25,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 23,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
