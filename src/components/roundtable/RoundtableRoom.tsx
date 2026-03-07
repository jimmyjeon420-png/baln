/**
 * RoundtableRoom — 회의실 메인 레이아웃
 *
 * 역할: 라운드테이블 토론의 전체 UI를 조합
 * - 상단: 참석자 아바타 줄 (ParticipantRow)
 * - 중앙: 현재/과거 턴 메시지 (FlatList)
 * - 하단: 사용자 질문 입력 (UserQuestionInput)
 */

import React, { useRef, useEffect } from 'react';
import { View, FlatList, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { ParticipantRow } from './ParticipantRow';
import { TurnMessage } from './TurnMessage';
import { UserQuestionInput } from './UserQuestionInput';
import type { RoundtableSession, RoundtableTurn, UserQuestion } from '../../types/roundtable';
import { useLocale } from '../../context/LocaleContext';

interface RoundtableRoomProps {
  session: RoundtableSession;
  currentTurnIndex: number;
  isPlaying: boolean;
  isAskingQuestion: boolean;
  onTypewriterComplete: () => void;
  onAskQuestion: (question: string) => void;
}

type ListItem =
  | { type: 'turn'; turn: RoundtableTurn; index: number }
  | { type: 'conclusion' }
  | { type: 'user_question'; question: UserQuestion; qIndex: number }
  | { type: 'user_response'; turn: RoundtableTurn; qIndex: number; rIndex: number };

export function RoundtableRoom({
  session,
  currentTurnIndex,
  isPlaying,
  isAskingQuestion,
  onTypewriterComplete,
  onAskQuestion,
}: RoundtableRoomProps) {
  const flatListRef = useRef<FlatList>(null);
  const { t } = useLocale();
  const activeSpeaker = isPlaying && currentTurnIndex >= 0 && currentTurnIndex < session.turns.length
    ? session.turns[currentTurnIndex].speaker
    : undefined;

  // 리스트 데이터 구성
  const listData: ListItem[] = [];

  // 표시할 턴 (currentTurnIndex까지만)
  const visibleTurns = session.turns.slice(0, currentTurnIndex + 1);
  visibleTurns.forEach((turn, index) => {
    listData.push({ type: 'turn', turn, index });
  });

  // 결론 (모든 턴 재생 완료 후)
  if (!isPlaying && currentTurnIndex >= session.turns.length - 1 && session.conclusion) {
    listData.push({ type: 'conclusion' });
  }

  // 사용자 질문 + 답변
  session.userQuestions.forEach((uq, qIndex) => {
    listData.push({ type: 'user_question', question: uq, qIndex });
    uq.responses.forEach((turn, rIndex) => {
      listData.push({ type: 'user_response', turn, qIndex, rIndex });
    });
  });

  // 새 턴이 추가되면 스크롤
  useEffect(() => {
    if (listData.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [listData.length]);

  const renderItem = ({ item }: { item: ListItem }) => {
    switch (item.type) {
      case 'turn':
        return (
          <TurnMessage
            turn={item.turn}
            isCurrent={item.index === currentTurnIndex && isPlaying}
            onTypewriterComplete={item.index === currentTurnIndex ? onTypewriterComplete : undefined}
          />
        );

      case 'conclusion':
        return (
          <View style={styles.conclusionCard}>
            <Text style={styles.conclusionTitle}>{t('roundtable.conclusion')}</Text>
            <Text style={styles.conclusionText}>{session.conclusion}</Text>
          </View>
        );

      case 'user_question':
        return (
          <View style={styles.userQuestionCard}>
            <Text style={styles.userQuestionLabel}>{t('roundtable.ask_more')}</Text>
            <Text style={styles.userQuestionText}>{item.question.question}</Text>
          </View>
        );

      case 'user_response':
        return (
          <TurnMessage
            turn={item.turn}
            isCurrent={false}
            onTypewriterComplete={undefined}
          />
        );

      default:
        return null;
    }
  };

  const keyExtractor = (_: ListItem, index: number) => `item-${index}`;

  const showQuestionInput = !isPlaying && currentTurnIndex >= session.turns.length - 1;

  return (
    <View style={styles.container}>
      {/* 참석자 아바타 줄 */}
      <ParticipantRow
        participantIds={session.participants}
        activeSpeaker={activeSpeaker}
      />

      {/* 주제 요약 */}
      <View style={styles.topicBar}>
        <Text style={styles.topicText}>{session.topicSummary}</Text>
      </View>

      {/* 턴 메시지 리스트 */}
      <FlatList
        ref={flatListRef}
        data={listData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* 질문 로딩 */}
      {isAskingQuestion && (
        <View style={styles.askingIndicator}>
          <ActivityIndicator size="small" color="#4CAF50" />
          <Text style={styles.askingText}>{t('roundtable.loading')}</Text>
        </View>
      )}

      {/* 사용자 질문 입력 */}
      {showQuestionInput && (
        <UserQuestionInput
          onSubmit={onAskQuestion}
          isLoading={isAskingQuestion}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  topicBar: {
    backgroundColor: '#1E1E2E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  topicText: {
    fontSize: 13,
    color: '#9E9E9E',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 8,
  },
  conclusionCard: {
    backgroundColor: '#1E2E1E',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#4CAF5030',
  },
  conclusionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 8,
  },
  conclusionText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
  },
  userQuestionCard: {
    backgroundColor: '#1A2A3A',
    borderRadius: 16,
    padding: 14,
    marginVertical: 8,
    alignSelf: 'flex-end',
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: '#1565C030',
  },
  userQuestionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64B5F6',
    marginBottom: 4,
  },
  userQuestionText: {
    fontSize: 15,
    color: '#E0E0E0',
    lineHeight: 20,
  },
  askingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  askingText: {
    fontSize: 13,
    color: '#9E9E9E',
  },
});
