/**
 * 라운드테이블 회의실 화면
 *
 * 역할: "회의실" — 거장들의 토론을 실시간으로 보여주고, 사용자가 질문
 * - 상단: 참석자 아바타 (idle 애니메이션)
 * - 중앙: 턴별 메시지 (타자기 효과)
 * - 하단: 사용자 질문 입력
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useRoundtable } from '../../src/hooks/useRoundtable';
import { RoundtableRoom } from '../../src/components/roundtable/RoundtableRoom';
import { getSessionById } from '../../src/services/roundtableService';
import { useLocale } from '../../src/context/LocaleContext';

export default function RoundtableSessionScreen() {
  const router = useRouter();
  const { sessionId, new: isNewSession } = useLocalSearchParams<{ sessionId: string; new?: string }>();
  const { colors } = useTheme();
  const { t } = useLocale();
  const {
    session,
    currentTurnIndex,
    isPlaying,
    isAskingQuestion,
    advanceToNextTurn,
    askQuestion,
    loadSession,
    error,
  } = useRoundtable();

  const [loading, setLoading] = useState(false);

  // 세션 로드 (히스토리에서 진입 or 새 세션 생성 직후)
  useEffect(() => {
    if (session && session.id === sessionId) return;

    async function load() {
      if (!sessionId) return;
      setLoading(true);
      const loaded = await getSessionById(sessionId);
      if (loaded) {
        // 새 세션이면 처음부터 재생, 히스토리면 마지막 턴 표시
        loadSession(loaded, isNewSession === 'true');
      }
      setLoading(false);
    }
    load();
  }, [sessionId, session, loadSession, isNewSession]);

  const handleAskQuestion = useCallback(async (question: string) => {
    await askQuestion(question);
  }, [askQuestion]);

  // 로딩 중
  if (loading || (!session && !error)) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {t('roundtable.title')}
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {t('roundtable.loading')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // 에러
  if (error && !session) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {t('roundtable.title')}
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryText}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) return null;

  const topicLabel = session.topicSummary || session.topic;
  const shortTopic = topicLabel.length > 20 ? topicLabel.substring(0, 20) + '...' : topicLabel;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {shortTopic}
        </Text>
        <Text style={[styles.turnCount, { color: colors.textTertiary }]}>
          {Math.min(currentTurnIndex + 1, session.turns.length)}/{session.turns.length}턴
        </Text>
      </View>

      {/* 회의실 */}
      <RoundtableRoom
        session={session}
        currentTurnIndex={currentTurnIndex}
        isPlaying={isPlaying}
        isAskingQuestion={isAskingQuestion}
        onTypewriterComplete={advanceToNextTurn}
        onAskQuestion={handleAskQuestion}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
  },
  turnCount: {
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
  },
  errorText: {
    color: '#CF6679',
    fontSize: 15,
    textAlign: 'center',
    marginHorizontal: 32,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
