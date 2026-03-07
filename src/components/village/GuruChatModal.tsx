/**
 * GuruChatModal — 구루 탭 시 1:1 대화 모달
 *
 * 역할: 동물의숲에서 NPC 말 걸었을 때 뜨는 대화창
 * - 구루 아바타 + 이름 + 직책 표시
 * - 이전 대화 히스토리 (말풍선 형태)
 * - 텍스트 입력 → 구루 답변 (타자기 효과)
 * - 닫기: 바깥 터치 또는 X 버튼
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CharacterAvatar } from '../character/CharacterAvatar';
import { GURU_CHARACTER_CONFIGS } from '../../data/guruCharacterConfig';
import { sentimentToExpression, getGuruDisplayName } from '../../services/characterService';
import type { VillageMessage } from '../../services/villageConversationService';
import { useLocale } from '../../context/LocaleContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface GuruChatModalProps {
  visible: boolean;
  guruId: string | null;
  messages: VillageMessage[];
  isLoading: boolean;
  hasError?: boolean;
  onSend: (question: string) => void;
  onRetry?: () => void;
  onClose: () => void;
}

/** 동물의숲 스타일 대화 말풍선 */
function ChatBubble({ msg, isUser }: { msg: VillageMessage; isUser: boolean }) {
  const config = !isUser ? GURU_CHARACTER_CONFIGS[msg.speaker] : null;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  if (isUser) {
    return (
      <Animated.View
        style={[
          styles.userBubbleRow,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.userBubble}>
          <Text style={styles.userBubbleText}>{msg.message}</Text>
        </View>
      </Animated.View>
    );
  }

  const expression = msg.sentiment
    ? sentimentToExpression(msg.sentiment)
    : 'neutral';

  return (
    <Animated.View
      style={[
        styles.guruBubbleRow,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.guruAvatarWrap}>
        <CharacterAvatar
          guruId={msg.speaker}
          size="sm"
          expression={expression}
          animated
          fallbackEmoji={config?.emoji}
        />
      </View>
      <View style={styles.guruBubbleWrap}>
        <Text style={styles.guruNameInBubble}>
          {getGuruDisplayName(msg.speaker)}
        </Text>
        <View
          style={[
            styles.guruBubble,
            { borderColor: (config?.accentColor || '#5DBB63') + '40' },
          ]}
        >
          <Text style={styles.guruBubbleText}>{msg.message}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

export function GuruChatModal({
  visible,
  guruId,
  messages,
  isLoading,
  hasError,
  onSend,
  onRetry,
  onClose,
}: GuruChatModalProps) {
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const config = guruId ? GURU_CHARACTER_CONFIGS[guruId] : null;
  const { t } = useLocale();

  // 메시지 추가 시 자동 스크롤
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = () => {
    const q = inputText.trim();
    if (!q || isLoading) return;
    setInputText('');
    onSend(q);
  };

  if (!guruId || !config) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.chatContainer}
        >
          {/* 헤더: 구루 프로필 — 동물의숲 NPC 대화 시작 느낌 */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <CharacterAvatar
                guruId={guruId}
                size="md"
                expression="bullish"
                animated
                fallbackEmoji={config.emoji}
              />
              <View style={styles.headerInfo}>
                <Text style={styles.headerName}>{getGuruDisplayName(guruId)}</Text>
                <Text style={styles.headerOrg}>{config.characterConcept}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close-circle" size={28} color="#8E9EB0" />
            </TouchableOpacity>
          </View>

          {/* 환영 메시지 (동물의숲 NPC 인사) */}
          {messages.length === 0 && (
            <View style={styles.welcomeSection}>
              <View style={styles.welcomeBubble}>
                <Text style={styles.welcomeEmoji}>💬</Text>
                <Text style={styles.welcomeText}>
                  {t('village.chat_welcome', { name: getGuruDisplayName(guruId) })}
                </Text>
              </View>
            </View>
          )}

          {/* 대화 히스토리 */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            renderItem={({ item }) => (
              <ChatBubble msg={item} isUser={item.speaker === 'user'} />
            )}
            contentContainerStyle={styles.chatList}
            showsVerticalScrollIndicator={false}
          />

          {/* 로딩 인디케이터 (구루가 생각 중) */}
          {isLoading && (
            <View style={styles.thinkingRow}>
              <View style={styles.thinkingDots}>
                <ThinkingDot delay={0} />
                <ThinkingDot delay={200} />
                <ThinkingDot delay={400} />
              </View>
              <Text style={styles.thinkingText}>
                {getGuruDisplayName(guruId)} {t('village.thinking')}
              </Text>
            </View>
          )}

          {/* 에러 상태: 재시도 버튼 표시 */}
          {hasError && !isLoading && (
            <View style={styles.errorRow}>
              <Ionicons name="cloud-offline-outline" size={18} color="#FF6B6B" />
              <Text style={styles.errorText}>
                {t('village.chat_error')}
              </Text>
              {onRetry && (
                <TouchableOpacity onPress={onRetry} style={styles.retryBtn}>
                  <Ionicons name="refresh" size={16} color="#5DBB63" />
                  <Text style={styles.retryText}>{t('village.chat_retry')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* 입력 영역 */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder={t('village.chat_placeholder')}
              placeholderTextColor="#7A8DA080"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              editable={!isLoading}
              multiline={false}
            />
            <TouchableOpacity
              onPress={handleSend}
              style={[
                styles.sendBtn,
                {
                  backgroundColor:
                    inputText.trim() && !isLoading
                      ? config.accentColor || '#5DBB63'
                      : '#2A405830',
                },
              ]}
              disabled={!inputText.trim() || isLoading}
            >
              <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/** 생각 중 점 애니메이션 (동물의숲 NPC 로딩) */
function ThinkingDot({ delay }: { delay: number }) {
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.3,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  return (
    <Animated.View
      style={[styles.thinkingDot, { opacity: anim }]}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000060',
    justifyContent: 'flex-end',
  },
  chatContainer: {
    backgroundColor: '#0D1B2A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '55%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E304440',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerInfo: {
    gap: 2,
  },
  headerName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F5F0E8',
  },
  headerOrg: {
    fontSize: 12,
    color: '#8E9EB0',
  },
  closeBtn: {
    padding: 4,
  },
  // 환영
  welcomeSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  welcomeBubble: {
    backgroundColor: '#162537',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#1E304460',
  },
  welcomeEmoji: {
    fontSize: 28,
  },
  welcomeText: {
    fontSize: 13,
    color: '#B8C4D0',
    textAlign: 'center',
    lineHeight: 19,
  },
  // 대화 목록
  chatList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  // 사용자 말풍선
  userBubbleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  userBubble: {
    backgroundColor: '#5DBB63',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: SCREEN_WIDTH * 0.65,
  },
  userBubbleText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  // 구루 말풍선
  guruBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  guruAvatarWrap: {
    marginTop: 4,
  },
  guruBubbleWrap: {
    flex: 1,
    gap: 3,
  },
  guruNameInBubble: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E9EB0',
    marginLeft: 4,
  },
  guruBubble: {
    backgroundColor: '#162537',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: SCREEN_WIDTH * 0.65,
    borderWidth: 1,
  },
  guruBubbleText: {
    fontSize: 14,
    color: '#F5F0E8',
    lineHeight: 20,
  },
  // 생각 중
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  thinkingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  thinkingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#5DBB63',
  },
  thinkingText: {
    fontSize: 12,
    color: '#7A8DA0',
    fontStyle: 'italic',
  },
  // 에러 상태
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FF6B6B15',
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#FF6B6B',
    flex: 1,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#5DBB6320',
    borderRadius: 12,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5DBB63',
  },
  // 입력
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#162537',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#F5F0E8',
    borderWidth: 1,
    borderColor: '#1E304460',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
