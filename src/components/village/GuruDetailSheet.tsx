/**
 * GuruDetailSheet — 구루 탭 시 올라오는 바텀 시트
 *
 * 역할: "구루 프로필 팝업" — 마을에서 구루를 탭하면 아래에서 슬라이드업
 * - 구루의 현재 기분·활동을 한눈에 표시
 * - 대화하기 / 선물하기 / 프로필 보기 3가지 액션 버튼
 * - 오늘의 명언 한 줄 표시
 * - 우정 게이지 (FriendshipMeter 컴포넌트 재사용)
 *
 * 비유: "NPC 대화창" — RPG 게임에서 캐릭터를 클릭하면 뜨는 정보 팝업
 *
 * 사용처: 마을(village) 화면에서 구루 터치 시
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Animated,
  ScrollView,
  Platform,
} from 'react-native';
import type { GuruMood, GuruActivity, FriendshipTier, GuruFriendship } from '../../types/village';
import { GURU_CHARACTER_CONFIGS } from '../../data/guruCharacterConfig';
import { getGuruDisplayName } from '../../services/characterService';
import { CharacterAvatar } from '../character/CharacterAvatar';
import ActivityBubble from './ActivityBubble';
import FriendshipMeter from './FriendshipMeter';
import GuruScheduleCard from './GuruScheduleCard';
import { useLocale } from '../../context/LocaleContext';

// ============================================================================
// 타입
// ============================================================================

interface GuruDetailSheetProps {
  /** 표시할 구루 ID. null이면 시트 닫힘 */
  guruId: string | null;
  onClose: () => void;
  /** 구루 현재 기분 */
  mood: GuruMood;
  /** 구루 현재 활동 */
  activity: GuruActivity;
  /** 현재 우정 티어 */
  friendshipTier: FriendshipTier;
  /** 현재 우정 점수 (0~200+) */
  friendshipScore: number;
  /** 대화하기 버튼 콜백 */
  onChat: (guruId: string) => void;
  /** 선물하기 버튼 콜백 (크레딧 5C 소비) */
  onGift: (guruId: string) => void;
  /** 프로필 보기 버튼 콜백 */
  onViewProfile: (guruId: string) => void;
  /** 테마 색상 */
  colors: any;
  /** 로케일 (ko/en) */
  locale?: string;
}

// ============================================================================
// 구루별 오늘의 명언 (빌트인 명언 은행)
// ============================================================================

const GURU_QUOTES: Record<string, { ko: string; en: string }[]> = {
  buffett: [
    {
      ko: '가격은 당신이 지불하는 것, 가치는 당신이 얻는 것입니다.',
      en: 'Price is what you pay. Value is what you get.',
    },
    {
      ko: '10년을 보유할 자신이 없다면 10분도 갖고 있지 마세요.',
      en: "If you aren't willing to own a stock for 10 years, don't own it for 10 minutes.",
    },
  ],
  dalio: [
    {
      ko: '가장 중요한 것은 고통스러운 실수에서 배우는 능력입니다.',
      en: "The most important thing is the ability to learn from painful mistakes.",
    },
    {
      ko: '분산 투자는 성과를 희생하지 않으면서 리스크를 줄이는 유일한 방법.',
      en: 'Diversification is the only free lunch in investing.',
    },
  ],
  cathie_wood: [
    {
      ko: '혁신은 단기적으로 과대평가되고 장기적으로 과소평가됩니다.',
      en: 'Innovation is overestimated in the short term, underestimated in the long term.',
    },
    {
      ko: '5년 뒤를 보세요. 지금 비싸 보이는 것이 싸 보일 겁니다.',
      en: 'Look 5 years out. What looks expensive now will look cheap then.',
    },
  ],
  druckenmiller: [
    {
      ko: '맞을 때 크게, 틀릴 때 작게. 이것이 전부입니다.',
      en: 'Be big when you are right, small when you are wrong. That is all there is.',
    },
    {
      ko: '매크로는 당신이 원하든 원치 않든 찾아옵니다.',
      en: 'Macro finds you whether you like it or not.',
    },
  ],
  saylor: [
    {
      ko: '비트코인은 디지털 에너지입니다. 복리로 쌓이는 에너지.',
      en: 'Bitcoin is digital energy. Energy that compounds.',
    },
    {
      ko: '화폐가 약할수록 자산을 더 강하게 보유해야 합니다.',
      en: 'The weaker the currency, the stronger you must hold assets.',
    },
  ],
  dimon: [
    {
      ko: '은행업은 기본에 충실할 때 가장 강합니다.',
      en: 'Banking is strongest when it sticks to the basics.',
    },
    {
      ko: '리스크 관리 없는 성장은 사기와 다름없습니다.',
      en: 'Growth without risk management is just disguised gambling.',
    },
  ],
  musk: [
    {
      ko: '인류의 미래는 다행성(多行星) 문명에 달려 있습니다.',
      en: "The future of humanity depends on becoming a multi-planetary civilization.",
    },
    {
      ko: '첫 번째 원칙으로 돌아가세요. 왜 그렇게 해야 하나요?',
      en: 'Go back to first principles. Why should we do it that way?',
    },
  ],
  lynch: [
    {
      ko: '당신이 잘 아는 것에 투자하세요. 마트에서 아이디어를 찾으세요.',
      en: 'Invest in what you know. Find ideas in the grocery store.',
    },
    {
      ko: '주식 고르기는 예술이자 과학이고, 그 이전에 직감입니다.',
      en: 'Stock picking is an art and a science, but above all an instinct.',
    },
  ],
  marks: [
    {
      ko: '2단계 사고를 하세요. 남들이 어떻게 생각할지를 생각하세요.',
      en: 'Think in second order. Think about how others will think.',
    },
    {
      ko: '싸이클을 무시하는 투자자는 반드시 대가를 치릅니다.',
      en: 'Investors who ignore the cycle will always pay the price.',
    },
  ],
  rogers: [
    {
      ko: '세상을 두루 보세요. 기회는 늘 예상치 못한 곳에 있습니다.',
      en: 'See the world. Opportunity always lies where you least expect.',
    },
    {
      ko: '공급-수요를 분석하세요. 그것이 상품 투자의 전부입니다.',
      en: 'Analyze supply and demand. That is all there is to commodities.',
    },
  ],
};

/** 오늘 날짜 기반으로 랜덤하지 않게 명언 선택 (매일 일관성) */
function getDailyQuote(guruId: string, locale: string): string {
  const quotes = GURU_QUOTES[guruId];
  if (!quotes || quotes.length === 0) {
    return locale === 'ko'
      ? '매일 꾸준히 배우는 것이 가장 확실한 투자입니다.'
      : 'Learning consistently every day is the surest investment.';
  }
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % quotes.length;
  const quote = quotes[dayIndex];
  return locale === 'ko' ? quote.ko : quote.en;
}

// ============================================================================
// 기분 이모지 매핑
// ============================================================================

function getMoodEmoji(mood: GuruMood): string {
  switch (mood) {
    case 'joy':
    case 'joyful':     return '😄';
    case 'excited':    return '🤩';
    case 'calm':       return '😌';
    case 'thinking':
    case 'thoughtful': return '🤔';
    case 'worried':    return '😟';
    case 'angry':
    case 'grumpy':     return '😤';
    case 'sleepy':     return '😴';
    case 'surprised':  return '😲';
    case 'sad':        return '😢';
    default:           return '😊';
  }
}

function getMoodLabel(mood: GuruMood, isKo: boolean): string {
  const labels: Record<string, [string, string]> = {
    joy:       ['기쁨', 'Joyful'],
    joyful:    ['기쁨', 'Joyful'],
    excited:   ['흥분', 'Excited'],
    calm:      ['평온', 'Calm'],
    thinking:  ['고민 중', 'Thinking'],
    thoughtful:['고민 중', 'Thoughtful'],
    worried:   ['걱정', 'Worried'],
    angry:     ['짜증', 'Grumpy'],
    grumpy:    ['짜증', 'Grumpy'],
    sleepy:    ['졸림', 'Sleepy'],
    surprised: ['놀람', 'Surprised'],
    sad:       ['슬픔', 'Sad'],
  };
  const pair = labels[mood] ?? ['기분 좋음', 'Good Mood'];
  return isKo ? pair[0] : pair[1];
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

const GuruDetailSheet = React.memo(function GuruDetailSheet({
  guruId,
  onClose,
  mood,
  activity,
  friendshipTier,
  friendshipScore,
  onChat,
  onGift,
  onViewProfile,
  colors,
  locale = 'ko',
}: GuruDetailSheetProps) {
  const { t } = useLocale();
  const isKo = locale === 'ko';
  const isVisible = guruId !== null;

  // 슬라이드업 애니메이션
  const slideAnim = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 10,
      }).start();
    } else {
      // 닫힐 때는 빠르게 내려감
      Animated.timing(slideAnim, {
        toValue: 500,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, slideAnim]);

  const handleChat = useCallback(() => {
    if (guruId) onChat(guruId);
  }, [guruId, onChat]);

  const handleGift = useCallback(() => {
    if (guruId) onGift(guruId);
  }, [guruId, onGift]);

  const handleProfile = useCallback(() => {
    if (guruId) onViewProfile(guruId);
  }, [guruId, onViewProfile]);

  if (__DEV__) {
    // console.log('[GuruDetailSheet] guruId=%s visible=%s', guruId, isVisible);
  }

  // guruId가 null이면 모달 자체를 렌더링하지 않음
  if (!isVisible || !guruId) return null;

  const config = GURU_CHARACTER_CONFIGS[guruId];
  const guruName = getGuruDisplayName(guruId);
  const animalType = isKo ? (config?.characterConcept ?? '') : (config?.characterConceptEn ?? '');
  const moodEmoji = getMoodEmoji(mood);
  const moodLabel = getMoodLabel(mood, isKo);
  const dailyQuote = getDailyQuote(guruId, locale);
  const accentColor = config?.accentColor ?? colors.primary;

  // FriendshipMeter에 넘길 GuruFriendship 객체 구성 (최소 필드)
  const friendshipData: GuruFriendship = {
    guruId,
    score: friendshipScore,
    tier: friendshipTier,
    totalInteractions: 0,
    lastInteraction: new Date().toISOString(),
    unlockedDialogues: [],
    giftsGiven: 0,
    lettersSent: 0,
    lettersReceived: 0,
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"  // 직접 Animated.spring으로 제어
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* 반투명 딤 배경 — 탭하면 닫힘 */}
      <TouchableWithoutFeedback onPress={onClose} accessible={false}>
        <View style={styles.dimBackground} />
      </TouchableWithoutFeedback>

      {/* 바텀 시트 본체 */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surface,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* 드래그 핸들 (상단 중앙 회색 바) */}
        <View style={styles.handleWrapper}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces={false}
        >
          {/* ── 헤더: 아바타 + 이름 + 동물 + 기분 이모지 ── */}
          <View style={styles.headerSection}>
            <CharacterAvatar guruId={guruId} size="lg" animated />
            <View style={styles.headerTextBlock}>
              <View style={styles.nameRow}>
                <Text style={[styles.guruName, { color: colors.textPrimary }]}>
                  {guruName}
                </Text>
                <Text style={styles.moodEmojiLarge}>{moodEmoji}</Text>
              </View>
              <Text style={[styles.animalType, { color: accentColor }]}>
                {animalType}
              </Text>
              <Text style={[styles.moodLabel, { color: colors.textTertiary }]}>
                {t('village_ui.guru_detail.mood_label', { mood: moodLabel })}
              </Text>
            </View>
          </View>

          {/* ── 현재 활동 상태 ── */}
          <View
            style={[
              styles.statusRow,
              { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
            ]}
          >
            <ActivityBubble
              activity={activity}
              mood={mood}
              colors={colors}
              locale={locale}
            />
          </View>

          {/* ── 우정 게이지 ── */}
          <FriendshipMeter
            friendship={friendshipData}
            guruId={guruId}
            colors={colors}
            locale={locale}
            compact={false}
          />

          {/* ── 액션 버튼 3개 ── */}
          <View style={styles.actionRow}>
            {/* 대화하기 */}
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: accentColor + '20', borderColor: accentColor + '60' },
              ]}
              onPress={handleChat}
              activeOpacity={0.75}
            >
              <Text style={styles.actionBtnEmoji}>💬</Text>
              <Text style={[styles.actionBtnLabel, { color: accentColor }]}>
                {t('village_ui.guru_detail.chat')}
              </Text>
            </TouchableOpacity>

            {/* 선물하기 (5크레딧) */}
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: colors.premium.gold + '20', borderColor: colors.premium.gold + '60' },
              ]}
              onPress={handleGift}
              activeOpacity={0.75}
            >
              <Text style={styles.actionBtnEmoji}>🎁</Text>
              <Text style={[styles.actionBtnLabel, { color: colors.premium.gold }]}>
                {t('village_ui.guru_detail.gift')}
              </Text>
              <Text style={[styles.actionBtnSubLabel, { color: colors.textTertiary }]}>
                5C
              </Text>
            </TouchableOpacity>

            {/* 프로필 */}
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: colors.info + '18', borderColor: colors.info + '55' },
              ]}
              onPress={handleProfile}
              activeOpacity={0.75}
            >
              <Text style={styles.actionBtnEmoji}>📋</Text>
              <Text style={[styles.actionBtnLabel, { color: colors.info }]}>
                {t('village_ui.guru_detail.profile')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── P2-1: 오늘의 일과표 ── */}
          <GuruScheduleCard
            guruId={guruId}
            colors={colors}
            locale={locale}
          />

          {/* ── 오늘의 명언 ── */}
          <View
            style={[
              styles.quoteBox,
              {
                backgroundColor: accentColor + '12',
                borderColor: accentColor + '40',
                borderLeftColor: accentColor,
              },
            ]}
          >
            <Text style={[styles.quoteIcon, { color: accentColor }]}>❝</Text>
            <Text style={[styles.quoteText, { color: colors.textSecondary }]}>
              {dailyQuote}
            </Text>
          </View>

          {/* 하단 여백 (iOS 홈 인디케이터 공간) */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </Animated.View>
    </Modal>
  );
});

GuruDetailSheet.displayName = 'GuruDetailSheet';

export default GuruDetailSheet;

// ============================================================================
// 스타일
// ============================================================================

const styles = StyleSheet.create({
  // 반투명 배경 딤
  dimBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
  },

  // 바텀 시트 본체
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
      },
      android: {
        elevation: 16,
      },
    }),
  },

  // 드래그 핸들 래퍼
  handleWrapper: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },

  scrollContent: {
    padding: 20,
    gap: 16,
  },

  // 헤더 (아바타 + 이름 블록)
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerTextBlock: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guruName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  moodEmojiLarge: {
    fontSize: 24,
  },
  animalType: {
    fontSize: 13,
    fontWeight: '600',
  },
  moodLabel: {
    fontSize: 12,
  },

  // 현재 활동 상태 줄
  statusRow: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: 'flex-start',
  },

  // 액션 버튼 3개
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  actionBtnEmoji: {
    fontSize: 22,
  },
  actionBtnLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnSubLabel: {
    fontSize: 10,
    fontWeight: '500',
  },

  // 오늘의 명언 박스
  quoteBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 14,
    gap: 6,
  },
  quoteIcon: {
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 22,
  },
  quoteText: {
    fontSize: 14,
    lineHeight: 21,
    fontStyle: 'italic',
  },

  bottomSpacer: {
    height: Platform.OS === 'ios' ? 24 : 12,
  },
});
