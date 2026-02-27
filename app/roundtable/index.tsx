/**
 * 라운드테이블 시작 화면
 *
 * 역할: "회의실 로비" — 주제 선택, 참석자 선택, 토론 시작
 * - 오늘의 추천 주제 (market_context 기반)
 * - 직접 주제 입력
 * - 참석자 토글 선택 (3~5명)
 * - 최근 토론 히스토리
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useRoundtable } from '../../src/hooks/useRoundtable';
import { CharacterAvatar } from '../../src/components/character/CharacterAvatar';
import { GURU_CHARACTER_CONFIGS } from '../../src/data/guruCharacterConfig';
import { isFreePeriod } from '../../src/config/freePeriod';
import { useLocale } from '../../src/context/LocaleContext';
import { getLocaleCode } from '../../src/utils/formatters';

const ALL_GURUS = Object.values(GURU_CHARACTER_CONFIGS);

export default function RoundtableIndexScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLocale();

  // 추천 주제 (시장 상황에 따라 교체 가능) — t()를 써야 하므로 컴포넌트 안에서 정의
  const SUGGESTED_TOPICS = useMemo(() => [
    t('roundtable.suggested_topics.topic_1'),
    t('roundtable.suggested_topics.topic_2'),
    t('roundtable.suggested_topics.topic_3'),
    t('roundtable.suggested_topics.topic_4'),
  ], [t]);
  const {
    startRoundtable,
    isGenerating,
    recentSessions,
    error,
    session,
  } = useRoundtable();

  const [topic, setTopic] = useState('');
  const [selectedGurus, setSelectedGurus] = useState<string[]>(['buffett', 'dalio', 'cathie_wood']);

  const isFree = isFreePeriod();

  const toggleGuru = useCallback((guruId: string) => {
    setSelectedGurus(prev => {
      if (prev.includes(guruId)) {
        if (prev.length <= 3) {
          Alert.alert(t('roundtable.alert_title'), t('roundtable.min_participants_alert'));
          return prev;
        }
        return prev.filter(id => id !== guruId);
      }
      if (prev.length >= 5) {
        Alert.alert(t('roundtable.alert_title'), t('roundtable.max_participants_alert'));
        return prev;
      }
      return [...prev, guruId];
    });
  }, []);

  const handleStart = useCallback(async () => {
    const finalTopic = topic.trim() || SUGGESTED_TOPICS[Math.floor(Math.random() * SUGGESTED_TOPICS.length)];

    try {
      await startRoundtable(finalTopic, selectedGurus);
      // 세션이 생성되면 자동으로 useRoundtable.session이 업데이트되므로
      // 라우터를 통해 세션 화면으로 이동
    } catch {
      // 에러는 useRoundtable에서 처리
    }
  }, [topic, selectedGurus, startRoundtable]);

  const handleSelectTopic = useCallback((t: string) => {
    setTopic(t);
  }, []);

  // 최근 세션이 생성되면 즉시 해당 화면으로 이동
  React.useEffect(() => {
    if (session && !isGenerating) {
      router.push(`/roundtable/${session.id}?new=true`);
    }
  }, [session, isGenerating, router]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {t('roundtable.title')}
        </Text>
        <View style={styles.creditBadge}>
          <Text style={styles.creditText}>{isFree ? t('roundtable.free_badge') : '2개'}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 추천 주제 */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('roundtable.section_suggested_topics')}
        </Text>
        <View style={styles.topicChips}>
          {SUGGESTED_TOPICS.map((t, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.topicChip,
                { backgroundColor: colors.surface, borderColor: topic === t ? '#4CAF50' : colors.border },
              ]}
              onPress={() => handleSelectTopic(t)}
            >
              <Text style={[styles.topicChipText, { color: topic === t ? '#4CAF50' : colors.textSecondary }]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 직접 입력 */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 24 }]}>
          {t('roundtable.section_custom_topic')}
        </Text>
        <TextInput
          style={[styles.topicInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
          value={topic}
          onChangeText={setTopic}
          placeholder={t('roundtable.question_placeholder')}
          placeholderTextColor={colors.textTertiary}
          maxLength={100}
          multiline={false}
        />

        {/* 참석자 선택 */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 24 }]}>
          {t('roundtable.participants')} ({selectedGurus.length}/5)
        </Text>
        <View style={styles.guruGrid}>
          {ALL_GURUS.map(guru => {
            const isSelected = selectedGurus.includes(guru.guruId);
            return (
              <TouchableOpacity
                key={guru.guruId}
                style={[
                  styles.guruCard,
                  {
                    backgroundColor: isSelected ? guru.accentColor + '15' : colors.surface,
                    borderColor: isSelected ? guru.accentColor : colors.border,
                  },
                ]}
                onPress={() => toggleGuru(guru.guruId)}
                activeOpacity={0.7}
              >
                <CharacterAvatar
                  guruId={guru.guruId}
                  size="sm"
                  expression={isSelected ? 'bullish' : 'neutral'}
                  fallbackEmoji={guru.emoji}
                />
                <Text style={[styles.guruCardName, { color: isSelected ? guru.accentColor : colors.textSecondary }]} numberOfLines={1}>
                  {guru.guruName}
                </Text>
                {isSelected && (
                  <View style={[styles.checkmark, { backgroundColor: guru.accentColor }]}>
                    <Ionicons name="checkmark" size={10} color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 에러 */}
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {/* 토론 시작 버튼 */}
        <TouchableOpacity
          style={[styles.startButton, isGenerating && styles.startButtonDisabled]}
          onPress={handleStart}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <View style={styles.startButtonContent}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.startButtonText}>{t('roundtable.loading')}</Text>
            </View>
          ) : (
            <View style={styles.startButtonContent}>
              <Ionicons name="mic" size={20} color="#FFFFFF" />
              <Text style={styles.startButtonText}>{t('roundtable.start')}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* 최근 히스토리 */}
        {recentSessions.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 32 }]}>
              {t('roundtable.section_recent')}
            </Text>
            {recentSessions.slice(0, 5).map(s => {
              const dateStr = new Date(s.createdAt).toLocaleDateString(getLocaleCode(), {
                month: 'short', day: 'numeric',
              });
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => router.push(`/roundtable/${s.id}`)}
                >
                  <View style={styles.historyInfo}>
                    <Text style={[styles.historyTopic, { color: colors.textPrimary }]} numberOfLines={1}>
                      {s.topicSummary || s.topic}
                    </Text>
                    <Text style={[styles.historyMeta, { color: colors.textTertiary }]}>
                      {dateStr} · {t('roundtable.history_turns', { count: s.turns.length })} · {t('roundtable.history_participants', { count: s.participants.length })}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>
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
  },
  headerTitle: {
    flex: 1,
    fontSize: 19,
    fontWeight: '700',
  },
  creditBadge: {
    backgroundColor: '#4CAF5020',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  creditText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  topicChips: {
    gap: 8,
  },
  topicChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  topicChipText: {
    fontSize: 14,
  },
  topicInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 44,
  },
  guruGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  guruCard: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    width: '30%',
    minWidth: 90,
    gap: 6,
    position: 'relative',
  },
  guruCardName: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#CF6679',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 24,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  startButtonDisabled: {
    backgroundColor: '#333',
  },
  startButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  historyInfo: {
    flex: 1,
    gap: 4,
  },
  historyTopic: {
    fontSize: 14,
    fontWeight: '600',
  },
  historyMeta: {
    fontSize: 12,
  },
});
