/**
 * village.tsx - 마을 탭 (Tab #3)
 *
 * 역할: "발른 마을" — 동물의숲 x 주토피아 세계관의 메인 마을 화면
 * - 10명의 구루 동물 캐릭터가 살아 움직이는 풀스크린 마을
 * - 시간대별 하늘 변화 + 실시간 날씨 + 별/비/눈 파티클
 * - 구루를 탭하면 디테일 시트 (대화/선물/프로필)
 * - 하단 액션 바: 우체통 / 시장 거리 / 마을 신문 / 라운드테이블
 * - 마을 번영도 + 이벤트 배너 실시간 반영
 *
 * 비유: "살아 있는 NPC 마을" — 게임처럼 캐릭터들이 돌아다니며 대화하고
 *       사용자와 상호작용하는 핵심 킬링 피처 화면
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

// Context & Hooks
import { useLocale } from '../../src/context/LocaleContext';
import { useTheme } from '../../src/hooks/useTheme';
import { useTimeOfDay } from '../../src/hooks/useTimeOfDay';
import { useMarketSentiment } from '../../src/hooks/useMarketSentiment';
import { useVillageWorld } from '../../src/hooks/useVillageWorld';
import { useVillageEvents } from '../../src/hooks/useVillageEvents';
import { useScreenTracking } from '../../src/hooks/useAnalytics';

// Village world components
import { VillageWeatherBackground } from '../../src/components/village/VillageWeatherBackground';
import type { TimeOfDay as WeatherTimeOfDay } from '../../src/components/village/VillageWeatherBackground';
import ProsperityMeter from '../../src/components/village/ProsperityMeter';
// ActivityBubble 제거 — 텍스트 대신 캐릭터 애니메이션으로 활동 표현
import GuruDetailSheet from '../../src/components/village/GuruDetailSheet';
import EventBanner from '../../src/components/village/EventBanner';
import WeatherBadge from '../../src/components/common/WeatherBadge';
import { CharacterAvatar } from '../../src/components/character/CharacterAvatar';
import { VillageTutorialOverlay } from '../../src/components/village/VillageTutorialOverlay';

// 동물의숲 스타일 배경 레이어 (하늘→구름→지면→나무→가구→캐릭터 순)
import { VillageClouds } from '../../src/components/village/VillageClouds';
import { VillageGroundLayer } from '../../src/components/village/VillageGroundLayer';
import { VillageScenery } from '../../src/components/village/VillageScenery';
import { VillageFurniture } from '../../src/components/village/VillageFurniture';

// Character config for name lookups
import { GURU_CHARACTER_CONFIGS } from '../../src/data/guruCharacterConfig';

// Types
import type { GuruLetter } from '../../src/types/village';
import type { TimeOfDay as HookTimeOfDay } from '../../src/hooks/useTimeOfDay';

// ============================================================================
// 시간대 매핑 (useTimeOfDay → VillageWeatherBackground)
// ============================================================================

/**
 * useTimeOfDay 훅의 period 값과 VillageWeatherBackground의 TimeOfDay는
 * 동일한 union 타입이지만 별도 선언되어 있으므로 명시적으로 매핑
 */
function mapTimeOfDay(hookPeriod: HookTimeOfDay): WeatherTimeOfDay {
  const mapping: Record<HookTimeOfDay, WeatherTimeOfDay> = {
    dawn: 'dawn',
    morning: 'morning',
    afternoon: 'afternoon',
    evening: 'evening',
    night: 'night',
  };
  return mapping[hookPeriod] ?? 'afternoon';
}

// ============================================================================
// 말풍선 컴포넌트 (구루 발화 메시지 표시)
// ============================================================================

interface SpeechBubbleProps {
  text: string;
  colors: any;
}

const SpeechBubble = React.memo(({ text, colors }: SpeechBubbleProps) => {
  if (!text) return null;
  return (
    <View style={[styles.speechBubble, { backgroundColor: colors.surface + 'E0', borderColor: colors.border }]}>
      <Text
        style={[styles.speechText, { color: colors.textPrimary }]}
        numberOfLines={2}
      >
        {text}
      </Text>
      <View style={[styles.speechTail, { borderTopColor: colors.surface + 'D0' }]} />
    </View>
  );
});
SpeechBubble.displayName = 'SpeechBubble';

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function VillageScreen() {
  const { t, language } = useLocale();
  const { colors } = useTheme();
  const router = useRouter();
  const timeOfDayTheme = useTimeOfDay();
  const { sentiment } = useMarketSentiment();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Analytics
  useScreenTracking('village');

  // Master hook — connects all 7 subsystems
  const {
    weather,
    clothingLevel,
    guruStates,
    getGuruFullState,
    chatWithGuru,
    openGuruChat,
    closeGuruChat,
    positions,
    conversations,
    prosperityLevel,
    prosperityProgress,
    todayPoints,
    addContribution,
    letters,
    unreadCount,
    openLetter,
    getTopFriends,
    friendships,
    isLoading,
  } = useVillageWorld(sentiment?.overall);

  // Village events
  const { activeEvent, dismissEvent } = useVillageEvents(prosperityLevel);

  // Local state for modals/sheets
  const [selectedGuruId, setSelectedGuruId] = useState<string | null>(null);
  const [showMailbox, setShowMailbox] = useState(false);
  const [showMarket, setShowMarket] = useState(false);
  const [showNewspaper, setShowNewspaper] = useState(false);

  // Computed: selected guru's full state for detail sheet
  const selectedGuruState = useMemo(() => {
    if (!selectedGuruId) return null;
    return getGuruFullState(selectedGuruId);
  }, [selectedGuruId, getGuruFullState]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleGuruTap = useCallback((guruId: string) => {
    setSelectedGuruId(guruId);
    // Count as engagement for prosperity
    addContribution('guru_chat').catch(() => {
      if (__DEV__) console.warn('[VillageScreen] 번영 포인트 적립 실패');
    });
  }, [addContribution]);

  const handleGuruChat = useCallback((guruId: string) => {
    openGuruChat(guruId);
    setSelectedGuruId(null);
    // Navigate to guru chat screen (future: inline chat)
    router.push(`/settings/guru-detail/${guruId}`);
  }, [openGuruChat, router]);

  const handleGuruGift = useCallback((guruId: string) => {
    // TODO: Implement gift system (5C cost)
    if (__DEV__) console.log('[VillageScreen] Gift to guru:', guruId);
  }, []);

  const handleGuruViewProfile = useCallback((guruId: string) => {
    setSelectedGuruId(null);
    router.push(`/settings/guru-detail/${guruId}`);
  }, [router]);

  const handleCloseDetailSheet = useCallback(() => {
    setSelectedGuruId(null);
  }, []);

  const handleEventPress = useCallback(() => {
    // Navigate to event detail or roundtable
    if (activeEvent?.type === 'competition') {
      router.push('/roundtable');
    }
  }, [activeEvent, router]);

  const handleEventDismiss = useCallback(() => {
    dismissEvent();
  }, [dismissEvent]);

  const handleRoundtablePress = useCallback(() => {
    router.push('/roundtable');
  }, [router]);

  // ── Loading State ───────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {language === 'ko' ? '마을 준비 중...' : 'Preparing village...'}
        </Text>
        <Text style={[styles.loadingSubText, { color: colors.textTertiary }]}>
          {language === 'ko'
            ? '구루들이 자리를 잡고 있어요'
            : 'Gurus are settling in'}
        </Text>
      </View>
    );
  }

  // ── Main Render ─────────────────────────────────────────────────────────

  const mappedTimeOfDay = mapTimeOfDay(timeOfDayTheme.period);
  const isKo = language === 'ko';

  return (
    <View style={styles.root}>
      <VillageWeatherBackground
        weather={weather}
        timeOfDay={mappedTimeOfDay}
        colors={colors}
      >
        {/* ── 동물의숲 배경 레이어 (하늘 위에 순서대로) ────────────── */}
        <VillageClouds
          timeOfDay={mappedTimeOfDay}
          weather={weather?.condition}
        />

        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {/* ── Header Bar (translucent) ──────────────────────────────── */}
          <View style={[styles.header, { backgroundColor: colors.surface + '88' }]}>
            {/* Village name */}
            <View style={styles.headerLeft}>
              <Text style={[styles.villageName, { color: colors.textPrimary }]}>
                {isKo ? '발른 마을' : 'Baln Village'}
              </Text>
              <WeatherBadge
                weather={weather}
                clothingLevel={clothingLevel}
                compact
                colors={colors}
                locale={language}
              />
            </View>

            {/* Prosperity (compact) + Mailbox icon */}
            <View style={styles.headerRight}>
              {/* Compact prosperity badge */}
              <View style={[styles.prosperityBadge, { backgroundColor: colors.surfaceElevated + 'CC' }]}>
                <Text style={[styles.prosperityLevelText, { color: colors.primary }]}>
                  Lv.{prosperityLevel}
                </Text>
                <Text style={[styles.prosperityProgressText, { color: colors.textTertiary }]}>
                  {Math.round(prosperityProgress * 100)}%
                </Text>
              </View>

              {/* Mailbox icon with unread badge */}
              <TouchableOpacity
                style={styles.mailboxButton}
                onPress={() => setShowMailbox(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.mailboxIcon}>
                  {'\uD83D\uDCEC'}
                </Text>
                {unreadCount > 0 && (
                  <View style={[styles.unreadBadge, { backgroundColor: colors.error }]}>
                    <Text style={styles.unreadBadgeText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Event Banner ──────────────────────────────────────────── */}
          <View style={styles.eventBannerContainer}>
            <EventBanner
              event={activeEvent}
              onPress={handleEventPress}
              onDismiss={handleEventDismiss}
              colors={colors}
              locale={language}
            />
          </View>

          {/* ── Village Map Area (~70% of screen) ─────────────────────── */}
          <View style={styles.villageMap}>
            {/* 레이어 순서: 지면 → 나무/덤불 → 가구 → 캐릭터 */}
            <VillageGroundLayer
              width={screenWidth}
              height={screenHeight * 0.5}
              timeOfDay={mappedTimeOfDay}
              prosperityLevel={prosperityLevel}
            />
            <VillageScenery
              width={screenWidth}
              height={screenHeight * 0.5}
              timeOfDay={mappedTimeOfDay}
            />
            <VillageFurniture
              width={screenWidth}
              height={screenHeight * 0.5}
              timeOfDay={mappedTimeOfDay}
              prosperityLevel={prosperityLevel}
            />

            {positions.map((pos) => {
              const guruState = guruStates.get(pos.guruId);
              const config = GURU_CHARACTER_CONFIGS[pos.guruId];

              return (
                <TouchableOpacity
                  key={pos.guruId}
                  style={[
                    styles.guruContainer,
                    {
                      left: `${Math.round(pos.x * 100)}%` as any,
                      top: `${Math.round(pos.y * 100)}%` as any,
                    },
                  ]}
                  onPress={() => handleGuruTap(pos.guruId)}
                  activeOpacity={0.8}
                >
                  {/* 말풍선 — 캐릭터 위에 표시 (겹침 방지) */}
                  {pos.bubble && (
                    <SpeechBubble text={pos.bubble} colors={colors} />
                  )}

                  {/* Character avatar (sm 사이즈 — 5명 배치 시 겹침 방지) */}
                  <CharacterAvatar
                    guruId={pos.guruId}
                    size="sm"
                    expression={guruState?.expression ?? 'neutral'}
                    animated
                    clothingLevel={clothingLevel}
                    mood={guruState?.mood}
                    activity={guruState?.activity}
                    showParticles
                  />

                  {/* Guru name label */}
                  <Text
                    style={[
                      styles.guruNameLabel,
                      {
                        color: colors.textPrimary,
                        backgroundColor: colors.surface + 'AA',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {isKo
                      ? (config?.guruName ?? pos.guruId)
                      : (config?.guruNameEn ?? pos.guruId)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Bottom Action Bar (above tab bar, translucent) ────────── */}
          <View style={[styles.bottomBar, { backgroundColor: colors.surface + 'DD' }]}>
            {/* Mailbox */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowMailbox(true)}
              activeOpacity={0.75}
            >
              <Text style={styles.actionIcon}>
                {'\uD83D\uDCEC'}
              </Text>
              <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>
                {isKo ? '우체통' : 'Mailbox'}
              </Text>
              {unreadCount > 0 && (
                <View style={[styles.actionBadge, { backgroundColor: colors.error }]}>
                  <Text style={styles.actionBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Market Street */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowMarket(true)}
              activeOpacity={0.75}
            >
              <Text style={styles.actionIcon}>
                {'\uD83C\uDFEA'}
              </Text>
              <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>
                {isKo ? '시장 거리' : 'Market St.'}
              </Text>
            </TouchableOpacity>

            {/* Village Newspaper */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowNewspaper(true)}
              activeOpacity={0.75}
            >
              <Text style={styles.actionIcon}>
                {'\uD83D\uDCF0'}
              </Text>
              <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>
                {isKo ? '마을 신문' : 'Village News'}
              </Text>
            </TouchableOpacity>

            {/* Roundtable */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleRoundtablePress}
              activeOpacity={0.75}
            >
              <Text style={styles.actionIcon}>
                {'\uD83D\uDCAC'}
              </Text>
              <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>
                {isKo ? '라운드테이블' : 'Roundtable'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </VillageWeatherBackground>

      {/* ── Prosperity Meter (floating card below header) ─────────────── */}
      {todayPoints > 0 && (
        <View style={[styles.prosperityFloating, { top: Platform.OS === 'ios' ? 100 : 80 }]}>
          <ProsperityMeter
            level={prosperityLevel}
            progress={prosperityProgress}
            todayPoints={todayPoints}
            colors={colors}
            locale={language}
          />
        </View>
      )}

      {/* ── Guru Detail Sheet (bottom sheet modal) ────────────────────── */}
      <GuruDetailSheet
        guruId={selectedGuruId}
        onClose={handleCloseDetailSheet}
        mood={selectedGuruState?.mood ?? 'calm'}
        activity={selectedGuruState?.activity ?? 'walking'}
        friendshipTier={selectedGuruState?.friendshipTier ?? 'stranger'}
        friendshipScore={selectedGuruState?.friendshipScore ?? 0}
        onChat={handleGuruChat}
        onGift={handleGuruGift}
        onViewProfile={handleGuruViewProfile}
        colors={colors}
        locale={language}
      />

      {/* ── 마을 첫 진입 튜토리얼 오버레이 ─────────────────────────────── */}
      <VillageTutorialOverlay
        colors={colors}
        locale={language}
      />

      {/* ── Letter Inbox Modal (placeholder — future component) ───────── */}
      {showMailbox && (
        <View style={[styles.modalOverlay]}>
          <TouchableOpacity
            style={styles.modalDim}
            onPress={() => setShowMailbox(false)}
            activeOpacity={1}
          />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHandle}>
              <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {isKo ? '우체통' : 'Mailbox'}
              {unreadCount > 0 && ` (${unreadCount})`}
            </Text>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {letters.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>
                    {'\uD83D\uDCEC'}
                  </Text>
                  <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                    {isKo
                      ? '아직 편지가 없어요.\n구루와 우정을 쌓으면 편지가 옵니다!'
                      : 'No letters yet.\nBuild friendships with gurus to receive letters!'}
                  </Text>
                </View>
              ) : (
                letters.map((letter) => {
                  const fromConfig = GURU_CHARACTER_CONFIGS[letter.fromGuruId];
                  return (
                    <TouchableOpacity
                      key={letter.id}
                      style={[
                        styles.letterItem,
                        {
                          backgroundColor: letter.isRead
                            ? colors.surfaceElevated
                            : colors.primary + '15',
                          borderColor: letter.isRead ? colors.border : colors.primary + '40',
                        },
                      ]}
                      onPress={() => {
                        openLetter(letter.id);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.letterEmoji}>
                        {fromConfig?.emoji ?? '\uD83D\uDC64'}
                      </Text>
                      <View style={styles.letterTextBlock}>
                        <Text
                          style={[
                            styles.letterSubject,
                            { color: colors.textPrimary },
                            !letter.isRead && styles.letterUnread,
                          ]}
                          numberOfLines={1}
                        >
                          {isKo ? letter.subject : (letter.subjectEn ?? letter.subject)}
                        </Text>
                        <Text
                          style={[styles.letterFrom, { color: colors.textTertiary }]}
                          numberOfLines={1}
                        >
                          {isKo
                            ? `${fromConfig?.guruName ?? letter.fromGuruId}으로부터`
                            : `From ${fromConfig?.guruNameEn ?? letter.fromGuruId}`}
                        </Text>
                      </View>
                      {!letter.isRead && (
                        <View style={[styles.letterDot, { backgroundColor: colors.primary }]} />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceElevated }]}
              onPress={() => setShowMailbox(false)}
              activeOpacity={0.8}
            >
              <Text style={[styles.modalCloseBtnText, { color: colors.textPrimary }]}>
                {isKo ? '닫기' : 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Market Street Modal (placeholder — future component) ──────── */}
      {showMarket && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDim}
            onPress={() => setShowMarket(false)}
            activeOpacity={1}
          />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHandle}>
              <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {isKo ? '시장 거리' : 'Market Street'}
            </Text>
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>
                {'\uD83C\uDFEA'}
              </Text>
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                {isKo
                  ? '시장 거리 준비 중...\n마을이 더 성장하면 상점이 열려요!'
                  : 'Market Street coming soon...\nGrow your village to unlock shops!'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceElevated }]}
              onPress={() => setShowMarket(false)}
              activeOpacity={0.8}
            >
              <Text style={[styles.modalCloseBtnText, { color: colors.textPrimary }]}>
                {isKo ? '닫기' : 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Village Newspaper Modal (placeholder — future component) ──── */}
      {showNewspaper && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDim}
            onPress={() => setShowNewspaper(false)}
            activeOpacity={1}
          />
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHandle}>
              <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {isKo ? '마을 신문' : 'Village News'}
            </Text>
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>
                {'\uD83D\uDCF0'}
              </Text>
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                {isKo
                  ? '오늘의 마을 소식이 곧 도착해요!\n구루들이 뉴스를 정리하고 있습니다.'
                  : 'Village news arriving soon!\nGurus are preparing today\'s stories.'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceElevated }]}
              onPress={() => setShowNewspaper(false)}
              activeOpacity={0.8}
            >
              <Text style={[styles.modalCloseBtnText, { color: colors.textPrimary }]}>
                {isKo ? '닫기' : 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },

  // ── Loading ──────────────────────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  loadingSubText: {
    fontSize: 13,
  },

  // ── Header ───────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    zIndex: 50,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  villageName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  prosperityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  prosperityLevelText: {
    fontSize: 12,
    fontWeight: '800',
  },
  prosperityProgressText: {
    fontSize: 10,
    fontWeight: '600',
  },
  mailboxButton: {
    position: 'relative',
    padding: 4,
  },
  mailboxIcon: {
    fontSize: 22,
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },

  // ── Event Banner ─────────────────────────────────────────────────────────
  eventBannerContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    zIndex: 40,
  },

  // ── Village Map ──────────────────────────────────────────────────────────
  villageMap: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  guruContainer: {
    position: 'absolute',
    alignItems: 'center',
    // sm 사이즈(48px) 기준 중앙 정렬
    marginLeft: -24,
    marginTop: -24,
    zIndex: 10,
    // 말풍선 오버플로 허용
    overflow: 'visible',
  },
  guruNameLabel: {
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 1,
    textAlign: 'center',
  },

  // ── Speech Bubble (캐릭터 위에 표시, 컴팩트) ───────────────────────────
  speechBubble: {
    maxWidth: 120,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  speechText: {
    fontSize: 10,
    lineHeight: 13,
  },
  speechTail: {
    position: 'absolute',
    bottom: -5,
    left: '50%' as any,
    marginLeft: -4,
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 0,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },

  // ── Prosperity Floating Card ─────────────────────────────────────────────
  prosperityFloating: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 30,
  },

  // ── Bottom Action Bar ────────────────────────────────────────────────────
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: 'relative',
  },
  actionIcon: {
    fontSize: 22,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  actionBadge: {
    position: 'absolute',
    top: -2,
    right: 0,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  actionBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },

  // ── Modal Overlay (shared by Mailbox, Market, Newspaper) ─────────────────
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    justifyContent: 'flex-end',
  },
  modalDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  modalHandle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  modalContent: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  modalCloseBtn: {
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },

  // ── Empty State ──────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },

  // ── Letter Item ──────────────────────────────────────────────────────────
  letterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  letterEmoji: {
    fontSize: 28,
  },
  letterTextBlock: {
    flex: 1,
    gap: 3,
  },
  letterSubject: {
    fontSize: 14,
    fontWeight: '600',
  },
  letterUnread: {
    fontWeight: '800',
  },
  letterFrom: {
    fontSize: 12,
  },
  letterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
