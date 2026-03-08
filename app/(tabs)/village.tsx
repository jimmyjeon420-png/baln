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

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  useWindowDimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Sentry from '@sentry/react-native';

// Context & Hooks
import { useLocale } from '../../src/context/LocaleContext';
import { useTheme } from '../../src/hooks/useTheme';
import type { ThemeColors } from '../../src/styles/colors';
import { useTimeOfDay, type TimeOfDay as HookTimeOfDay } from '../../src/hooks/useTimeOfDay';
import { useMarketSentiment } from '../../src/hooks/useMarketSentiment';
import { useVillageWorld } from '../../src/hooks/useVillageWorld';
import { useVillageEvents } from '../../src/hooks/useVillageEvents';
import { useScreenTracking } from '../../src/hooks/useAnalytics';
import { useVillageDecay } from '../../src/hooks/useVillageDecay';
import { useVillageSeason } from '../../src/hooks/useVillageSeason';

// Village world components
import { VillageWeatherBackground, type TimeOfDay as WeatherTimeOfDay } from '../../src/components/village/VillageWeatherBackground';
import ProsperityMeter from '../../src/components/village/ProsperityMeter';
// ActivityBubble 제거 — 텍스트 대신 캐릭터 애니메이션으로 활동 표현
import GuruDetailSheet from '../../src/components/village/GuruDetailSheet';
import EventBanner from '../../src/components/village/EventBanner';
import WeatherBadge from '../../src/components/common/WeatherBadge';
import { CharacterAvatar } from '../../src/components/character/CharacterAvatar';
import { VillageTutorialOverlay } from '../../src/components/village/VillageTutorialOverlay';
import { VillageCheckInReward } from '../../src/components/village/VillageCheckInReward';

// 동물의숲 스타일 배경 레이어 (하늘→구름→지면→나무→가구→캐릭터 순)
import { VillageClouds } from '../../src/components/village/VillageClouds';
import { VillageGroundLayer } from '../../src/components/village/VillageGroundLayer';
import { VillageScenery } from '../../src/components/village/VillageScenery';
import { VillageFurniture } from '../../src/components/village/VillageFurniture';

// P0-5 + P1 세계관 강화 컴포넌트
import LevelUpCelebration from '../../src/components/village/LevelUpCelebration';
import GuruInteractionEffect from '../../src/components/village/GuruInteractionEffect';
import AmbientSoundText from '../../src/components/village/AmbientSoundText';
import SpecialDayBanner from '../../src/components/village/SpecialDayBanner';
import SeasonParticles from '../../src/components/village/SeasonParticles';
import GuruGiftModal from '../../src/components/village/GuruGiftModal';

// Character config for name lookups
import { GURU_CHARACTER_CONFIGS } from '../../src/data/guruCharacterConfig';

// Guru relations for proximity indicators
import { GURU_RELATIONS } from '../../src/hooks/useGuruVillage';

// 세계관 강화: 이스터에그, 집, 기념품, 린치 마트, 편지 답장
import { EasterEggToast } from '../../src/components/village/EasterEggToast';
import { useEasterEggs } from '../../src/hooks/useEasterEggs';
import HouseView from '../../src/components/village/HouseView';
import HouseInteriorModal from '../../src/components/village/HouseInteriorModal';
import { useHouseSystem } from '../../src/hooks/useHouseSystem';
import { LynchMartTour } from '../../src/components/village/LynchMartTour';

// Modals (Market Street & Village Newspaper)
import BrandMarket from '../../src/components/village/BrandMarket';
import VillageNewspaper from '../../src/components/village/VillageNewspaper';
import { getCachedReactions, getFallbackReactions } from '../../src/services/newsReactionService';

// Types
import type { NewspaperArticle, BrandShop } from '../../src/types/village';

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
  colors: ThemeColors;
  /** 대화 상대 이름 (있으면 "→ 상대에게" 표시) */
  replyToName?: string;
  /** 말하는 구루 이름 */
  speakerName?: string;
  /** 말하는 구루 시그니처 컬러 */
  speakerAccent?: string;
  /** 꼬리 위치: top(캐릭터 위 말풍선) / bottom(캐릭터 아래 말풍선) */
  tailAt?: 'top' | 'bottom';
}

const SpeechBubble = React.memo(({
  text,
  colors,
  replyToName,
  speakerName,
  speakerAccent,
  tailAt = 'top',
}: SpeechBubbleProps) => {
  if (!text) return null;
  return (
    <View
      style={[
        styles.speechBubble,
        {
          backgroundColor: colors.surface + 'E0',
          borderColor: speakerAccent ? `${speakerAccent}88` : colors.border,
        },
      ]}
    >
      {speakerName ? (
        <Text
          style={[styles.speechSpeaker, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {speakerName}
        </Text>
      ) : null}
      {replyToName ? (
        <Text
          style={[styles.speechReplyTo, { color: colors.primary }]}
          numberOfLines={1}
        >
          {'\u2192'} {replyToName}
        </Text>
      ) : null}
      <Text style={[styles.speechText, { color: colors.textPrimary }]}>
        {text}
      </Text>
      <View
        style={[
          styles.speechTail,
          tailAt === 'top'
            ? [styles.speechTailTop, { borderBottomColor: colors.surface + 'D0' }]
            : [styles.speechTailBottom, { borderTopColor: colors.surface + 'D0' }],
        ]}
      />
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
  const devicePreset = useMemo(() => {
    const shortEdge = Math.min(screenWidth, screenHeight);
    const longEdge = Math.max(screenWidth, screenHeight);
    const isMini = shortEdge <= 375 && longEdge <= 812;
    const isMax = shortEdge >= 430 || longEdge >= 920;
    return {
      bubbleMinWidth: isMini ? 168 : 180,
      bubbleMaxWidth: isMax ? 240 : isMini ? 210 : 224,
      bubbleWidthRatio: isMini ? 0.6 : isMax ? 0.48 : 0.52,
      bubbleAboveThreshold: isMini ? 0.54 : isMax ? 0.58 : 0.56,
      mapHeightRatio: isMini ? 0.56 : isMax ? 0.62 : 0.59,
      mapMinHeight: isMini ? 340 : isMax ? 420 : 380,
    };
  }, [screenWidth, screenHeight]);
  const defaultMapHeight = useMemo(
    () => Math.max(devicePreset.mapMinHeight, Math.round(screenHeight * devicePreset.mapHeightRatio)),
    [devicePreset.mapHeightRatio, devicePreset.mapMinHeight, screenHeight]
  );
  const [villageMapHeight, setVillageMapHeight] = useState(defaultMapHeight);
  const villageLayerRenderHeight = useMemo(
    // 지면/풍경/Furniture 레이어는 실제 맵 높이와 1:1로 맞춰야 좌표 왜곡/밋밋한 공백이 생기지 않음
    () => Math.max(villageMapHeight, defaultMapHeight),
    [defaultMapHeight, villageMapHeight]
  );

  useEffect(() => {
    setVillageMapHeight(defaultMapHeight);
  }, [defaultMapHeight]);

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
    conversations: _conversations,
    userChatGuru,
    userChatMessages,
    isUserChatLoading,
    userChatError,
    sendMessageToGuru: _sendMessageToGuru,
    retryLastMessage,
    addInteraction,
    prosperityLevel,
    prosperityProgress,
    todayPoints,
    addContribution,
    letters,
    unreadCount,
    openLetter,
    getTopFriends: _getTopFriends,
    friendships: _friendships,
    isLoading,
  } = useVillageWorld(sentiment?.overall);

  // Village events
  const { activeEvent, dismissEvent } = useVillageEvents(prosperityLevel);

  // P0-5: 이탈 쇠퇴 효과 (타마고치)
  const decay = useVillageDecay();

  // P1-1: 계절 시스템
  const seasonVisuals = useVillageSeason();

  // Easter eggs
  const { easterEggToast, dismissToast } = useEasterEggs();

  // House system
  const {
    houseLevel,
    placedFurniture,
    inventoryFurniture,
    maxSlots,
    placeFurniture,
    removeFurniture,
    wasUpgraded,
    acknowledgeUpgrade,
  } = useHouseSystem(prosperityLevel);

  // House interior modal state
  const [showHouseInterior, setShowHouseInterior] = useState(false);

  // Local state for modals/sheets
  const [selectedGuruId, setSelectedGuruId] = useState<string | null>(null);
  const [showMailbox, setShowMailbox] = useState(false);
  const [showMarket, setShowMarket] = useState(false);
  const [showNewspaper, setShowNewspaper] = useState(false);
  const [newspaperArticles, setNewspaperArticles] = useState<NewspaperArticle[]>([]);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [giftTargetGuruId, setGiftTargetGuruId] = useState<string | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevelForCelebration, _setNewLevelForCelebration] = useState(1);

  // 신문 데이터 로드: 캐시 → 폴백
  useEffect(() => {
    if (!showNewspaper) return;
    let cancelled = false;
    (async () => {
      const cached = await getCachedReactions();
      if (!cancelled) {
        setNewspaperArticles(cached ?? getFallbackReactions());
      }
    })();
    return () => { cancelled = true; };
  }, [showNewspaper]);

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
    setSelectedGuruId(null); // 디테일 시트 닫기
    openGuruChat(guruId);    // 채팅 모달 열기
  }, [openGuruChat]);

  const handleGuruGift = useCallback((guruId: string) => {
    setGiftTargetGuruId(guruId);
    setShowGiftModal(true);
    setSelectedGuruId(null); // 디테일 시트 닫기
  }, []);

  const handleGiftSend = useCallback(async (guruId: string, _cost: number, _friendshipGain: number) => {
    // 선물 보내기 → 우정 포인트 + 번영 포인트
    // 1. 우정 포인트 적립 (gift 타입 — 기본 5점 + 선물 크기별 추가)
    await addInteraction(guruId, 'gift').catch(() => {});
    // 2. 번영 포인트 적립
    await addContribution('guru_chat').catch(() => {});
    // 모달은 GuruGiftModal 내부에서 자동 닫힘 (2초 후)
  }, [addInteraction, addContribution]);

  const handleGuruViewProfile = useCallback((guruId: string) => {
    setSelectedGuruId(null);
    try {
      router.push(`/settings/guru-detail/${guruId}`);
    } catch (err) {
      Sentry.captureException(err);
    }
  }, [router]);

  const handleCloseDetailSheet = useCallback(() => {
    setSelectedGuruId(null);
  }, []);

  const handleEventPress = useCallback(() => {
    // Navigate to event detail or roundtable
    if (activeEvent?.type === 'competition') {
      try {
        router.push('/roundtable');
      } catch (err) {
        Sentry.captureException(err);
      }
    }
  }, [activeEvent, router]);

  const handleEventDismiss = useCallback(() => {
    dismissEvent();
  }, [dismissEvent]);

  const handleRoundtablePress = useCallback(() => {
    try {
      router.push('/roundtable');
    } catch (err) {
      Sentry.captureException(err);
    }
  }, [router]);

  // ── Loading State ───────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t('village.loading')}
        </Text>
        <Text style={[styles.loadingSubText, { color: colors.textTertiary }]}>
          {t('village.preparing')}
        </Text>
      </View>
    );
  }

  // ── Main Render ─────────────────────────────────────────────────────────

  const mappedTimeOfDay = mapTimeOfDay(timeOfDayTheme.period);
  const isKo = language === 'ko'; // kept for guru name locale lookup in GURU_CHARACTER_CONFIGS

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
                {t('village.baln_village')}
              </Text>
              <WeatherBadge
                weather={weather}
                clothingLevel={clothingLevel}
                compact
                colors={colors}
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
                accessibilityRole="button"
                accessibilityLabel={t('village.letter.inbox_title')}
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

          {/* ── P2-4: 특별한 날 배너 (구루 생일/기념일) ─────────────── */}
          <View style={styles.eventBannerContainer}>
            <SpecialDayBanner colors={colors} />
          </View>

          {/* ── 린치의 화요 마트 순찰 (화요일만 표시) ─────────────── */}
          <LynchMartTour colors={colors} />

          {/* ── Event Banner ──────────────────────────────────────────── */}
          <View style={styles.eventBannerContainer}>
            <EventBanner
              event={activeEvent}
              onPress={handleEventPress}
              onDismiss={handleEventDismiss}
              colors={colors}
            />
          </View>

          {/* ── Village Map Area (~70% of screen) ─────────────────────── */}
          <View
            style={styles.villageMap}
            onLayout={(event) => {
              const nextHeight = Math.round(event.nativeEvent.layout.height);
              if (nextHeight > 0 && Math.abs(nextHeight - villageMapHeight) > 4) {
                setVillageMapHeight(nextHeight);
              }
            }}
          >
            {/* 레이어 순서: 지면 → 나무/덤불 → 가구 → 캐릭터 */}
            <VillageGroundLayer
              width={screenWidth}
              height={villageLayerRenderHeight}
              timeOfDay={mappedTimeOfDay}
              prosperityLevel={prosperityLevel}
              season={seasonVisuals.season}
              flowerOpacity={decay.flowerOpacity}
              weedCount={decay.weedCount}
            />
            <VillageScenery
              width={screenWidth}
              height={villageLayerRenderHeight}
              timeOfDay={mappedTimeOfDay}
              season={seasonVisuals.season}
              prosperityLevel={prosperityLevel}
              dustOverlayOpacity={decay.dustOverlayOpacity}
              desaturationAmount={decay.desaturationAmount}
            />
            <VillageFurniture
              width={screenWidth}
              height={villageLayerRenderHeight}
              timeOfDay={mappedTimeOfDay}
              prosperityLevel={prosperityLevel}
            />

            {/* ── 내 집 ─────────────────────────────────── */}
            <HouseView
              houseLevel={houseLevel}
              placedCount={placedFurniture.length}
              maxSlots={maxSlots}
              showUpgradeBadge={wasUpgraded}
              onPress={() => {
                acknowledgeUpgrade();
                setShowHouseInterior(true);
              }}
            />

            {/* ── P1-1: 계절 파티클 (벚꽃/반딧불/낙엽/눈) ──────── */}
            <SeasonParticles
              particleType={seasonVisuals.particleType}
              particleEmoji={seasonVisuals.particleEmoji}
              screenWidth={screenWidth}
            />

            {/* ── P2-2: 마을 사운드스케이프 (텍스트) ──────────── */}
            <AmbientSoundText
              weather={weather?.condition}
              timeOfDay={mappedTimeOfDay}
              season={seasonVisuals.season}
              colors={colors}
            />

            {/* ── P1-6: 구루 관계 상호작용 이펙트 ──────────────── */}
            <GuruInteractionEffect
              interactions={(() => {
                const pairs: { guru1Id: string; guru2Id: string; relation: 'ally' | 'rival' | 'neutral'; midX: number; midY: number; distance: number }[] = [];
                const seen = new Set<string>();
                for (let i = 0; i < positions.length; i++) {
                  for (let j = i + 1; j < positions.length; j++) {
                    const a = positions[i];
                    const b = positions[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 0.15) continue;
                    const pairKey = `${a.guruId}-${b.guruId}`;
                    if (seen.has(pairKey)) continue;
                    seen.add(pairKey);
                    const relation = GURU_RELATIONS[a.guruId]?.[b.guruId]
                      || GURU_RELATIONS[b.guruId]?.[a.guruId]
                      || 'neutral';
                    if (relation === 'neutral') continue;
                    pairs.push({
                      guru1Id: a.guruId,
                      guru2Id: b.guruId,
                      relation,
                      midX: (a.x + b.x) / 2,
                      midY: (a.y + b.y) / 2,
                      distance: dist,
                    });
                  }
                }
                return pairs;
              })()}
              screenWidth={screenWidth}
            />

            {/* ── 대화 연결선 (캐릭터 레이어 아래) ────────────────── */}
            {positions.map((pos) => {
              if (!pos.talkingTo || !pos.bubble) return null;
              const partner = positions.find(p => p.guruId === pos.talkingTo);
              if (!partner) return null;

              // 두 구루 사이 연결선 계산 (% 기반)
              const x1 = pos.x * 100;
              const y1 = pos.y * 100;
              const x2 = partner.x * 100;
              const y2 = partner.y * 100;
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;
              const dx = x2 - x1;
              const dy = y2 - y1;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);

              if (length < 2) return null; // 너무 가까우면 선 불필요

              return (
                <View
                  key={`line-${pos.guruId}-${pos.talkingTo}`}
                  style={[
                    styles.connectionLine,
                    {
                      left: `${midX}%` as unknown as number,
                      top: `${midY}%` as unknown as number,
                      width: `${length}%` as unknown as number,
                      borderColor: colors.primary + '40',
                      transform: [
                        { translateX: -(length / 2) * (screenWidth / 100) / 2 },
                        { rotate: `${angle}deg` },
                      ],
                    },
                  ]}
                />
              );
            })}

            {/* ── 근접 관계 표시 (동료:💚 / 라이벌:⚡) ──────────── */}
            {(() => {
              const pairs: React.ReactNode[] = [];
              const seen = new Set<string>();
              for (let i = 0; i < positions.length; i++) {
                for (let j = i + 1; j < positions.length; j++) {
                  const a = positions[i];
                  const b = positions[j];
                  const dx = a.x - b.x;
                  const dy = a.y - b.y;
                  const dist = Math.sqrt(dx * dx + dy * dy);
                  if (dist > 0.15) continue;
                  // 대화 중인 쌍은 이미 연결선이 있으므로 제외
                  if ((a.talkingTo === b.guruId && a.bubble) || (b.talkingTo === a.guruId && b.bubble)) continue;
                  const pairKey = `${a.guruId}-${b.guruId}`;
                  if (seen.has(pairKey)) continue;
                  seen.add(pairKey);
                  const relation = GURU_RELATIONS[a.guruId]?.[b.guruId]
                    || GURU_RELATIONS[b.guruId]?.[a.guruId];
                  if (!relation || relation === 'neutral') continue;
                  const midX = ((a.x + b.x) / 2) * 100;
                  const midY = ((a.y + b.y) / 2) * 100;
                  pairs.push(
                    <View
                      key={`rel-${pairKey}`}
                      style={[
                        styles.proximityIndicator,
                        { left: `${midX}%` as unknown as number, top: `${midY}%` as unknown as number },
                      ]}
                    >
                      <Text style={styles.proximityEmoji}>
                        {relation === 'ally' ? '\uD83D\uDC9A' : '\u26A1'}
                      </Text>
                    </View>
                  );
                }
              }
              return pairs;
            })()}

            {/* ── 구루 캐릭터들 ─────────────────────────────────── */}
            {(() => {
              // 대화 상대 guruId 집합 (하이라이트용)
              const talkingTargets = new Set<string>();
              positions.forEach(p => {
                if (p.talkingTo && p.bubble) talkingTargets.add(p.talkingTo);
              });

              return positions.map((pos) => {
                const guruState = guruStates.get(pos.guruId);
                const config = GURU_CHARACTER_CONFIGS[pos.guruId];
                const hasBubble = !!pos.bubble;
                const isBeingTalkedTo = talkingTargets.has(pos.guruId);
                const bubbleWidth = Math.min(
                  devicePreset.bubbleMaxWidth,
                  Math.max(devicePreset.bubbleMinWidth, screenWidth * devicePreset.bubbleWidthRatio)
                );
                const bubbleAbove = pos.y > devicePreset.bubbleAboveThreshold;
                const baseBubbleLeft = pos.x < 0.2
                  ? -8
                  : pos.x > 0.8
                    ? -(bubbleWidth - 40)
                    : -(bubbleWidth / 2 - 24);
                const containerLeft = Math.round(pos.x * screenWidth);
                const minBubbleLeft = 8 - containerLeft;
                const maxBubbleLeft = screenWidth - bubbleWidth - 8 - containerLeft;
                const bubbleLeft = Math.max(minBubbleLeft, Math.min(maxBubbleLeft, baseBubbleLeft));

                // 대화 상대 이름 조회
                let replyToName: string | undefined;
                if (pos.talkingTo && hasBubble) {
                  const partnerConfig = GURU_CHARACTER_CONFIGS[pos.talkingTo];
                  replyToName = isKo
                    ? (partnerConfig?.guruName ?? pos.talkingTo)
                    : (partnerConfig?.guruNameEn ?? pos.talkingTo);
                }
                const speakerName = isKo
                  ? (config?.guruName ?? pos.guruId)
                  : (config?.guruNameEn ?? pos.guruId);
                const speakerAccent = config?.accentColor;

                return (
                  <TouchableOpacity
                    key={pos.guruId}
                    style={[
                      styles.guruContainer,
                      {
                        left: `${Math.round(pos.x * 100)}%` as unknown as number,
                        top: `${Math.round(pos.y * 100)}%` as unknown as number,
                      },
                      // ★ 말풍선 있는 구루 → 맨 앞으로 (다른 캐릭터에 안 가려지게)
                      hasBubble && { zIndex: 100 },
                      // 대화 상대 하이라이트 테두리
                      isBeingTalkedTo && {
                        borderWidth: 2,
                        borderColor: colors.primary + '60',
                        borderRadius: 28,
                        padding: 2,
                      },
                    ]}
                    onPress={() => handleGuruTap(pos.guruId)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={`${isKo ? (config?.guruName ?? pos.guruId) : (config?.guruNameEn ?? pos.guruId)}`}
                  >
                    {/* Character avatar */}
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

                    {/* 리액션 이모지 — 캐릭터 우상단 (말풍선 없을 때만) */}
                    {!hasBubble && pos.reaction && (
                      <View style={styles.reactionBadge}>
                        <Text style={styles.reactionEmoji}>{pos.reaction}</Text>
                      </View>
                    )}

                    {/* 이름 + 감정 이모지 */}
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
                      {guruState?.moodEmoji ? ` ${guruState.moodEmoji}` : ''}
                    </Text>

                    {/* 활동 배지 — 말풍선이 없을 때만 표시 (겹침 방지) */}
                    {!hasBubble && guruState?.activityEmoji && (
                      <View style={[styles.activityBadge, { backgroundColor: colors.surface + 'CC' }]}>
                        <Text style={styles.activityBadgeText}>
                          {guruState.activityEmoji}{' '}
                          {isKo
                            ? guruState.activityDescription?.ko
                            : guruState.activityDescription?.en}
                        </Text>
                      </View>
                    )}

                    {/* 말풍선 — 캐릭터+이름 아래에 표시 (상단 잘림 방지) */}
                    {hasBubble && (
                      <View
                        style={[
                          styles.speechBubbleWrap,
                          bubbleAbove ? styles.speechBubbleWrapAbove : styles.speechBubbleWrapBelow,
                          { left: bubbleLeft, width: bubbleWidth },
                        ]}
                      >
                        <SpeechBubble
                          text={pos.bubble ?? ''}
                          colors={colors}
                          replyToName={replyToName}
                          speakerName={speakerName}
                          speakerAccent={speakerAccent}
                          tailAt={bubbleAbove ? 'bottom' : 'top'}
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              });
            })()}
          </View>

          {/* ── Bottom Action Bar (above tab bar, translucent) ────────── */}
          <View style={[styles.bottomBar, { backgroundColor: colors.surface + 'DD' }]}>
            {/* Mailbox */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowMailbox(true)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={t('village.letter.inbox_title')}
            >
              <Text style={styles.actionIcon}>
                {'\uD83D\uDCEC'}
              </Text>
              <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>
                {t('village.letter.inbox_title')}
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
              accessibilityRole="button"
              accessibilityLabel={t('village.market_street')}
            >
              <Text style={styles.actionIcon}>
                {'\uD83C\uDFEA'}
              </Text>
              <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>
                {t('village.market_street')}
              </Text>
            </TouchableOpacity>

            {/* Village Newspaper */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowNewspaper(true)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={t('village.village_news')}
            >
              <Text style={styles.actionIcon}>
                {'\uD83D\uDCF0'}
              </Text>
              <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>
                {t('village.village_news')}
              </Text>
            </TouchableOpacity>

            {/* Roundtable */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleRoundtablePress}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={t('village.roundtable')}
            >
              <Text style={styles.actionIcon}>
                {'\uD83D\uDCAC'}
              </Text>
              <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>
                {t('village.roundtable')}
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
      />

      {/* ── 마을 출석 보상 팝업 (하루 1회) ────────────────────────────────── */}
      <VillageCheckInReward
        colors={colors}
      />

      {/* ── 마을 첫 진입 튜토리얼 오버레이 ─────────────────────────────── */}
      <VillageTutorialOverlay
        colors={colors}
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
              {t('village.letter.inbox_title')}
              {unreadCount > 0 && ` (${unreadCount})`}
            </Text>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {letters.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>
                    {'\uD83D\uDCEC'}
                  </Text>
                  <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                    {t('village.letter_empty_desc')}
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
                          {t('village.letter_from', {
                            name: isKo
                              ? (fromConfig?.guruName ?? letter.fromGuruId)
                              : (fromConfig?.guruNameEn ?? letter.fromGuruId),
                          })}
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
                {t('common.close')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Market Street (BrandMarket full modal) ─────────────────────── */}
      <BrandMarket
        isVisible={showMarket}
        onClose={() => setShowMarket(false)}
        onBrandPress={(brand: BrandShop) => {
          setShowMarket(false);
          if (brand.ticker) {
            try {
              router.push(`/settings/guru-detail/${brand.ticker}`);
            } catch (err) {
              Sentry.captureException(err);
            }
          }
        }}
        colors={colors}
      />

      {/* ── Village Newspaper (full modal with articles) ────────────────── */}
      <VillageNewspaper
        articles={newspaperArticles}
        isVisible={showNewspaper}
        onClose={() => setShowNewspaper(false)}
        colors={colors}
        onGuruPress={(guruId: string) => {
          setShowNewspaper(false);
          try {
            router.push(`/settings/guru-detail/${guruId}`);
          } catch (err) {
            Sentry.captureException(err);
          }
        }}
      />

      {/* ── House Interior (tent/house tap) ─────────────────────────────── */}
      <HouseInteriorModal
        visible={showHouseInterior}
        onClose={() => setShowHouseInterior(false)}
        houseLevel={houseLevel}
        placedFurniture={placedFurniture}
        inventoryFurniture={inventoryFurniture}
        maxSlots={maxSlots}
        onPlaceFurniture={placeFurniture}
        onRemoveFurniture={removeFurniture}
      />

      {/* ── P1-2: 구루 선물 모달 ──────────────────────────────────────── */}
      <GuruGiftModal
        visible={showGiftModal}
        guruId={giftTargetGuruId}
        onClose={() => { setShowGiftModal(false); setGiftTargetGuruId(null); }}
        onGift={handleGiftSend}
        colors={colors}
      />

      {/* ── 구루 1:1 채팅 모달 ──────────────────────────────────────── */}
      <GuruChatModalInline
        guruId={userChatGuru}
        messages={userChatMessages}
        isLoading={isUserChatLoading}
        hasError={userChatError}
        onSend={chatWithGuru}
        onRetry={retryLastMessage}
        onClose={closeGuruChat}
        colors={colors}
      />

      {/* ── P1-5: 번영도 레벨업 축하 연출 ──────────────────────────────── */}
      <LevelUpCelebration
        visible={showLevelUp}
        newLevel={newLevelForCelebration}
        onDismiss={() => setShowLevelUp(false)}
        colors={colors}
      />

      {/* ── 이스터에그 토스트 ──────────────────────────────────────── */}
      <EasterEggToast
        egg={easterEggToast?.egg ?? null}
        visible={easterEggToast?.visible ?? false}
        onDismiss={dismissToast}
        colors={colors}
      />
    </View>
  );
}

// ============================================================================
// 구루 1:1 채팅 모달 (인라인)
// ============================================================================

interface GuruChatModalInlineProps {
  guruId: string | null;
  messages: { id: string; speaker: string; message: string; sentiment: string; replyTo?: string }[];
  isLoading: boolean;
  hasError: boolean;
  onSend: (guruId: string, message: string) => Promise<void>;
  onRetry: () => void;
  onClose: () => void;
  colors: ThemeColors;
}

function GuruChatModalInline({
  guruId,
  messages,
  isLoading,
  hasError,
  onSend,
  onRetry,
  onClose,
  colors,
}: GuruChatModalInlineProps) {
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const { t, language } = useLocale();
  const isKo = language === 'ko';

  if (!guruId) return null;

  const config = GURU_CHARACTER_CONFIGS[guruId];
  const guruName = isKo ? (config?.guruName ?? guruId) : (config?.guruNameEn ?? guruId);
  const accentColor = config?.accentColor ?? '#4CAF50';

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;
    setInputText('');
    await onSend(guruId, text);
    // 스크롤 맨 아래로
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
  };

  return (
    <Modal
      visible={!!guruId}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={chatStyles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 헤더 */}
        <View style={[chatStyles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={chatStyles.backBtn}>
            <Text style={[chatStyles.backText, { color: colors.textPrimary }]}>{'←'}</Text>
          </TouchableOpacity>
          <View style={chatStyles.headerCenter}>
            <Text style={chatStyles.headerEmoji}>{config?.emoji ?? '🐾'}</Text>
            <Text style={[chatStyles.headerName, { color: colors.textPrimary }]}>{guruName}</Text>
          </View>
          <View style={chatStyles.backBtn} />
        </View>

        {/* 채팅 메시지 목록 */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          style={[chatStyles.messageList, { backgroundColor: colors.background }]}
          contentContainerStyle={chatStyles.messageListContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={chatStyles.emptyChat}>
              <CharacterAvatar guruId={guruId} size="lg" animated />
              <Text style={[chatStyles.emptyChatText, { color: colors.textSecondary }]}>
                {t('village.chat.ask_anything', { name: guruName })}
              </Text>
              <Text style={[chatStyles.emptyChatHint, { color: colors.textTertiary }]}>
                {t('village.chat.hint')}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isUser = item.speaker === 'user';
            return (
              <View style={[chatStyles.msgRow, isUser && chatStyles.msgRowUser]}>
                {!isUser && (
                  <Text style={chatStyles.msgAvatar}>{config?.emoji ?? '🐾'}</Text>
                )}
                <View
                  style={[
                    chatStyles.msgBubble,
                    isUser
                      ? [chatStyles.msgBubbleUser, { backgroundColor: accentColor }]
                      : [chatStyles.msgBubbleGuru, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }],
                  ]}
                >
                  <Text
                    style={[
                      chatStyles.msgText,
                      { color: isUser ? '#FFFFFF' : colors.textPrimary },
                    ]}
                  >
                    {item.message}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        {/* 에러 표시 */}
        {hasError && (
          <View style={[chatStyles.errorBar, { backgroundColor: colors.error + '20' }]}>
            <Text style={[chatStyles.errorText, { color: colors.error }]}>
              {t('village.chat.response_failed')}
            </Text>
            <TouchableOpacity onPress={onRetry} style={[chatStyles.retryBtn, { backgroundColor: colors.error }]}>
              <Text style={chatStyles.retryText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 로딩 표시 */}
        {isLoading && (
          <View style={[chatStyles.typingBar, { backgroundColor: colors.surface }]}>
            <Text style={chatStyles.typingEmoji}>{config?.emoji ?? '🐾'}</Text>
            <Text style={[chatStyles.typingText, { color: colors.textTertiary }]}>
              {t('village.chat.thinking', { name: guruName })}
            </Text>
          </View>
        )}

        {/* 입력 영역 */}
        <View style={[chatStyles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            style={[chatStyles.textInput, { backgroundColor: colors.surfaceElevated, color: colors.textPrimary }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={t('village.chat.input_placeholder')}
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={300}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              chatStyles.sendBtn,
              { backgroundColor: inputText.trim() ? accentColor : colors.border },
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            <Text style={chatStyles.sendBtnText}>{'↑'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const chatStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    alignItems: 'center',
  },
  backText: {
    fontSize: 24,
    fontWeight: '600',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerEmoji: {
    fontSize: 24,
  },
  headerName: {
    fontSize: 17,
    fontWeight: '700',
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 16,
    gap: 12,
  },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyChatText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyChatHint: {
    fontSize: 13,
    textAlign: 'center',
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  msgRowUser: {
    flexDirection: 'row-reverse',
  },
  msgAvatar: {
    fontSize: 20,
    marginBottom: 2,
  },
  msgBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  msgBubbleUser: {
    borderBottomRightRadius: 4,
  },
  msgBubbleGuru: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  msgText: {
    fontSize: 15,
    lineHeight: 22,
  },
  errorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  typingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  typingEmoji: {
    fontSize: 16,
  },
  typingText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
});

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
    fontSize: 11,
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
    fontSize: 11,
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
    overflow: 'visible',
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
    fontSize: 11,
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
    width: '100%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  speechReplyTo: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 1,
  },
  speechSpeaker: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  speechText: {
    fontSize: 11,
    lineHeight: 16,
  },
  speechTail: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  speechTailTop: {
    top: -5,
    left: '50%' as unknown as number,
    marginLeft: -4,
    borderTopWidth: 0,
    borderBottomWidth: 5,
  },
  speechTailBottom: {
    bottom: -5,
    left: '50%' as unknown as number,
    marginLeft: -4,
    borderTopWidth: 5,
    borderBottomWidth: 0,
  },
  speechBubbleWrap: {
    position: 'absolute',
    width: 220,
    zIndex: 120,
    pointerEvents: 'none',
  },
  speechBubbleWrapAbove: {
    bottom: 62,
  },
  speechBubbleWrapBelow: {
    top: 58,
  },

  // ── Connection Line (대화 중인 구루 사이 점선) ────────────────────────
  connectionLine: {
    position: 'absolute',
    height: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    zIndex: 5,
  },

  // ── Proximity Indicator (근접 관계 💚/⚡) ────────────────────────────
  proximityIndicator: {
    position: 'absolute',
    zIndex: 4,
    marginLeft: -10,
    marginTop: -10,
  },
  proximityEmoji: {
    fontSize: 18,
  },

  // ── Reaction Emoji (캐릭터 우상단 리액션) ──────────────────────────
  reactionBadge: {
    position: 'absolute',
    top: -4,
    right: -14,
    zIndex: 12,
  },
  reactionEmoji: {
    fontSize: 16,
  },

  // ── Activity Badge (말풍선 없을 때 활동 표시) ─────────────────────────
  activityBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    marginTop: 1,
  },
  activityBadgeText: {
    fontSize: 11,
    color: '#E0E8F0',
    opacity: 0.9,
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
    fontSize: 11,
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
    fontSize: 11,
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
