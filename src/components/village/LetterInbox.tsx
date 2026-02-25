/**
 * LetterInbox — 구루 편지 우체통 UI
 *
 * 역할: "동물의숲 우체통" — 구루들에게 받은 편지 목록을 보여주는 모달
 * 비유: "우편함 개봉 UI" — 읽지 않은 편지는 파란 점 표시, 우정 등급 배지 포함
 *
 * 기능:
 * - 안 읽은 편지 먼저, 그 다음 최신순 정렬
 * - 구루 아바타 + 이름 + 제목 + 시간 표시
 * - 새 편지 도착 시 봉투 아이콘 애니메이션
 * - 빈 우체통 상태 처리
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  Platform,
  SafeAreaView,
} from 'react-native';
import type { GuruLetter, FriendshipTier } from '../../types/village';
import { CharacterAvatar } from '../character/CharacterAvatar';
import { GURU_CHARACTER_CONFIGS } from '../../data/guruCharacterConfig';

// ---------------------------------------------------------------------------
// 타입 정의
// ---------------------------------------------------------------------------

interface LetterInboxProps {
  letters: GuruLetter[];
  onLetterPress: (letter: GuruLetter) => void;
  onClose: () => void;
  isVisible: boolean;
  colors: any;
  locale?: string;
}

// ---------------------------------------------------------------------------
// 우정 등급 배지 설정
// ---------------------------------------------------------------------------

const TIER_BADGE: Record<FriendshipTier, { labelKo: string; labelEn: string; color: string }> = {
  stranger:     { labelKo: '주민님',   labelEn: 'Resident',   color: '#8E9EB0' },
  acquaintance: { labelKo: '이웃님',   labelEn: 'Neighbor',   color: '#5DADE2' },
  friend:       { labelKo: '친구',     labelEn: 'Friend',     color: '#5DBB63' },
  close_friend: { labelKo: '가까운 벗', labelEn: 'Close',     color: '#F0C060' },
  best_friend:  { labelKo: '제자',     labelEn: 'Student',   color: '#E88B96' },
  mentor:       { labelKo: '스승',     labelEn: 'Mentor',    color: '#9B7DFF' },
  soulmate:     { labelKo: '전설',     labelEn: 'Legend',    color: '#FF6B35' },
};

// ---------------------------------------------------------------------------
// 시간 포맷 헬퍼
// ---------------------------------------------------------------------------

function timeAgo(timestamp: string, locale: string): string {
  const isKo = locale === 'ko';
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return isKo ? '방금 전' : 'Just now';
  if (minutes < 60) return isKo ? `${minutes}분 전` : `${minutes}m ago`;
  if (hours < 24) return isKo ? `${hours}시간 전` : `${hours}h ago`;
  return isKo ? `${days}일 전` : `${days}d ago`;
}

// ---------------------------------------------------------------------------
// 개별 편지 카드 컴포넌트
// ---------------------------------------------------------------------------

interface LetterCardProps {
  letter: GuruLetter;
  onPress: (letter: GuruLetter) => void;
  colors: any;
  locale: string;
}

const LetterCard = React.memo(function LetterCard({
  letter,
  onPress,
  colors,
  locale,
}: LetterCardProps) {
  const isKo = locale === 'ko';
  const guruId = letter.fromGuruId || letter.guruId || '';
  const config = GURU_CHARACTER_CONFIGS[guruId];
  const guruName = config ? (isKo ? config.guruName : (config.guruNameEn ?? config.guruName)) : guruId;
  const subject = isKo ? letter.subject : (letter.subjectEn ?? letter.subject);
  const tier = letter.friendshipRequired;
  const badge = TIER_BADGE[tier] ?? TIER_BADGE.stranger;

  const handlePress = useCallback(() => {
    onPress(letter);
  }, [letter, onPress]);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: letter.isRead ? colors.border : colors.info + '50',
          borderWidth: letter.isRead ? 1 : 1.5,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.75}
    >
      {/* 읽지 않은 편지 파란 점 */}
      {!letter.isRead && (
        <View style={[styles.unreadDot, { backgroundColor: colors.info }]} />
      )}

      {/* 구루 아바타 */}
      <View style={styles.avatarWrapper}>
        <CharacterAvatar guruId={guruId} size="sm" />
      </View>

      {/* 편지 정보 */}
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text
            style={[styles.guruName, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {guruName}
          </Text>
          {/* 우정 등급 배지 */}
          <View style={[styles.tierBadge, { backgroundColor: badge.color + '25', borderColor: badge.color + '60' }]}>
            <Text style={[styles.tierBadgeText, { color: badge.color }]}>
              {isKo ? badge.labelKo : badge.labelEn}
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.subject,
            {
              color: letter.isRead ? colors.textSecondary : colors.textPrimary,
              fontWeight: letter.isRead ? '400' : '600',
            },
          ]}
          numberOfLines={1}
        >
          {subject}
        </Text>

        <Text style={[styles.timeAgo, { color: colors.textTertiary }]}>
          {timeAgo(letter.timestamp, locale)}
        </Text>
      </View>

      {/* 선물 첨부 표시 */}
      {letter.attachedItem && (
        <Text style={styles.giftIcon}>🎁</Text>
      )}
    </TouchableOpacity>
  );
});

// ---------------------------------------------------------------------------
// 메인 컴포넌트
// ---------------------------------------------------------------------------

export function LetterInbox({
  letters,
  onLetterPress,
  onClose,
  isVisible,
  colors,
  locale = 'ko',
}: LetterInboxProps) {
  const isKo = locale === 'ko';

  // 봉투 흔들기 애니메이션 (새 편지 있을 때)
  const envelopeShake = useRef(new Animated.Value(0)).current;
  const hasUnread = letters.some(l => !l.isRead);

  useEffect(() => {
    if (isVisible && hasUnread) {
      Animated.sequence([
        Animated.timing(envelopeShake, { toValue: 8, duration: 80, useNativeDriver: true }),
        Animated.timing(envelopeShake, { toValue: -8, duration: 80, useNativeDriver: true }),
        Animated.timing(envelopeShake, { toValue: 6, duration: 80, useNativeDriver: true }),
        Animated.timing(envelopeShake, { toValue: -6, duration: 80, useNativeDriver: true }),
        Animated.timing(envelopeShake, { toValue: 0, duration: 80, useNativeDriver: true }),
      ]).start();
    }
  }, [isVisible, hasUnread, envelopeShake]);

  // 읽지 않은 편지 먼저, 그 다음 최신순
  const sortedLetters = React.useMemo(() => {
    return [...letters].sort((a, b) => {
      if (!a.isRead && b.isRead) return -1;
      if (a.isRead && !b.isRead) return 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [letters]);

  const unreadCount = letters.filter(l => !l.isRead).length;

  const renderItem = useCallback(({ item }: { item: GuruLetter }) => (
    <LetterCard
      letter={item}
      onPress={onLetterPress}
      colors={colors}
      locale={locale}
    />
  ), [onLetterPress, colors, locale]);

  const keyExtractor = useCallback((item: GuruLetter) => item.id, []);

  // 빈 상태 UI
  const EmptyState = (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>📭</Text>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        {isKo ? '아직 편지가 없어요' : 'No letters yet'}
      </Text>
      <Text style={[styles.emptyDesc, { color: colors.textTertiary }]}>
        {isKo
          ? '구루와 친해지면 편지를 받을 수 있어요'
          : 'Build friendship with gurus to receive letters'}
      </Text>
    </View>
  );

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        {/* 헤더 */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerLeft}>
            <Animated.Text
              style={[styles.headerEmoji, { transform: [{ translateX: envelopeShake }] }]}
            >
              📬
            </Animated.Text>
            <View>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                {isKo ? '우체통' : 'Mailbox'}
              </Text>
              {unreadCount > 0 && (
                <Text style={[styles.headerSubtitle, { color: colors.info }]}>
                  {isKo
                    ? `읽지 않은 편지 ${unreadCount}통`
                    : `${unreadCount} unread letter${unreadCount > 1 ? 's' : ''}`}
                </Text>
              )}
            </View>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.closeText, { color: colors.textTertiary }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* 편지 목록 */}
        {sortedLetters.length === 0 ? (
          EmptyState
        ) : (
          <FlatList
            data={sortedLetters}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// 스타일
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerEmoji: {
    fontSize: 28,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 18,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  unreadDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  avatarWrapper: {
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    gap: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  guruName: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  tierBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  tierBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  subject: {
    fontSize: 14,
  },
  timeAgo: {
    fontSize: 11,
    marginTop: 1,
  },
  giftIcon: {
    fontSize: 18,
    flexShrink: 0,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
