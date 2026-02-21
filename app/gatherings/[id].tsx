/**
 * 모임 상세 페이지
 * 모임 정보 확인 및 참가 신청
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useGathering,
  useGatheringParticipants,
  useMyParticipation,
  useJoinGathering,
  useCancelParticipation,
  useCurrentUserInfo,
  formatAssetInBillion,
  TIER_COLORS,
  TIER_LABELS,
  canAccessTier,
} from '../../src/hooks/useGatherings';
import { GATHERING_CATEGORY_LABELS, UserTier } from '../../src/types/database';
import { useTheme } from '../../src/hooks/useTheme';

// 티어 아이콘
const getTierIcon = (tier: UserTier): keyof typeof Ionicons.glyphMap => {
  switch (tier) {
    case 'DIAMOND': return 'diamond';
    case 'PLATINUM': return 'star';
    case 'GOLD': return 'trophy';
    case 'SILVER': return 'medal';
    default: return 'ribbon';
  }
};

// 날짜 포맷팅 (상세)
const formatEventDateFull = (dateString: string): string => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];

  return `${year}년 ${month}월 ${day}일 (${dayOfWeek}) ${hours}:${minutes}`;
};

// 금액 포맷팅
const formatCurrency = (amount: number): string => {
  if (amount === 0) return '무료';
  return `${amount.toLocaleString()}원`;
};

export default function GatheringDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useTheme();
  const [joining, setJoining] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(false);

  // 데이터 조회
  const { data: gathering, isLoading: gatheringLoading } = useGathering(id);
  const { data: participants } = useGatheringParticipants(id);
  const { data: myParticipation } = useMyParticipation(id);
  const { data: currentUser } = useCurrentUserInfo();

  // 뮤테이션
  const joinMutation = useJoinGathering();
  const cancelMutation = useCancelParticipation();

  // 티어 기반 접근 제어 (TBAC)
  const requiredTier = gathering?.min_tier_required || 'SILVER';
  const userTier = currentUser?.tier || 'SILVER';
  const canJoinByTier = canAccessTier(userTier, requiredTier);

  // 참가 신청
  const handleJoin = async () => {
    if (!id || !gathering) return;

    // 티어 체크
    if (!canJoinByTier) {
      const requiredLabel = TIER_LABELS[requiredTier] || requiredTier;
      Alert.alert(
        '참가 불가',
        `이 모임은 ${requiredLabel} 등급 이상만 참가할 수 있습니다.\n\n현재 회원님의 등급: ${TIER_LABELS[userTier]}`,
        [{ text: '확인' }]
      );
      return;
    }

    // 유료 모임인 경우 결제 확인
    if (gathering.entry_fee > 0) {
      Alert.alert(
        '참가 신청',
        `참가비 ${formatCurrency(gathering.entry_fee)}가 결제됩니다.\n(MVP: 결제 시뮬레이션)\n\n참가하시겠습니까?`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '참가하기',
            onPress: async () => {
              setJoining(true);
              try {
                await joinMutation.mutateAsync(id);
                Alert.alert('완료', '참가 신청이 완료되었습니다.');
              } catch (error: any) {
                Alert.alert('오류', error.message || '참가 신청에 실패했습니다.');
              } finally {
                setJoining(false);
              }
            },
          },
        ]
      );
    } else {
      setJoining(true);
      try {
        await joinMutation.mutateAsync(id);
        Alert.alert('완료', '참가 신청이 완료되었습니다.');
      } catch (error: any) {
        Alert.alert('오류', error.message || '참가 신청에 실패했습니다.');
      } finally {
        setJoining(false);
      }
    }
  };

  // 참가 취소
  const handleCancel = async () => {
    if (!id) return;

    Alert.alert(
      '참가 취소',
      '정말 참가를 취소하시겠습니까?\n(MVP: 환불 시뮬레이션)',
      [
        { text: '아니요', style: 'cancel' },
        {
          text: '취소하기',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await cancelMutation.mutateAsync(id);
              Alert.alert('완료', '참가가 취소되었습니다.');
            } catch (error: any) {
              Alert.alert('오류', error.message || '참가 취소에 실패했습니다.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  if (gatheringLoading || !gathering) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: themeColors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={[styles.loadingText, { color: themeColors.textTertiary }]}>모임 정보를 불러오는 중...</Text>
      </View>
    );
  }

  const isFull = gathering.current_capacity >= gathering.max_capacity;
  const isParticipant = myParticipation && myParticipation.status !== 'cancelled';
  const canJoin = !isParticipant && !isFull && gathering.status === 'open' && canJoinByTier;
  const isBlockedByTier = !canJoinByTier && !isParticipant;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: themeColors.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: themeColors.surface }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>모임 상세</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 사기 경고 배너 */}
        {!warningDismissed && (
          <View style={styles.scamWarningBanner}>
            <Ionicons name="shield-half" size={18} color="#FF6B6B" style={{ marginTop: 1 }} />
            <View style={styles.scamWarningContent}>
              <Text style={styles.scamWarningTitle}>사기 주의</Text>
              <Text style={styles.scamWarningText}>
                카카오톡/텔레그램으로 이동 요청은 100% 사기입니다.{'\n'}즉시 신고해주세요.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setWarningDismissed(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color="#FF6B6B80" />
            </TouchableOpacity>
          </View>
        )}

        {/* 카테고리 & 상태 */}
        <View style={styles.topBadges}>
          <View style={styles.categoryBadge}>
            <Ionicons name="bookmark" size={14} color={themeColors.primary} />
            <Text style={[styles.categoryText, { color: themeColors.primary }]}>
              {GATHERING_CATEGORY_LABELS[gathering.category]}
            </Text>
          </View>
          {isFull && (
            <View style={styles.fullBadge}>
              <Text style={[styles.fullBadgeText, { color: themeColors.error }]}>마감</Text>
            </View>
          )}
          {isParticipant && (
            <View style={[styles.participatingBadge, { backgroundColor: themeColors.primary }]}>
              <Ionicons name="checkmark-circle" size={14} color="#000000" />
              <Text style={styles.participatingBadgeText}>참가중</Text>
            </View>
          )}
        </View>

        {/* 제목 */}
        <Text style={[styles.title, { color: themeColors.textPrimary }]}>{gathering.title}</Text>

        {/* 호스트 정보 카드 */}
        <View style={[styles.hostCard, { backgroundColor: themeColors.surface }]}>
          <View style={styles.hostHeader}>
            <Text style={[styles.sectionLabel, { color: themeColors.textTertiary }]}>호스트</Text>
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={14} color={themeColors.primary} />
              <Text style={[styles.verifiedText, { color: themeColors.primary }]}>인증된 호스트</Text>
            </View>
          </View>
          <View style={styles.hostInfo}>
            <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[gathering.host_tier] }]}>
              <Ionicons name={getTierIcon(gathering.host_tier)} size={16} color="#000000" />
            </View>
            <View style={styles.hostDetails}>
              <Text style={[styles.hostName, { color: themeColors.textPrimary }]}>{gathering.host_display_name || '익명'}</Text>
              <Text style={[styles.hostAssets, { color: TIER_COLORS[gathering.host_tier] }]}>
                [자산: {formatAssetInBillion(gathering.host_verified_assets)} 인증]
              </Text>
            </View>
          </View>
        </View>

        {/* 모임 정보 */}
        <View style={[styles.infoCard, { backgroundColor: themeColors.surface }]}>
          <Text style={[styles.sectionLabel, { color: themeColors.textTertiary }]}>모임 정보</Text>

          <View style={[styles.infoRow, { borderBottomColor: themeColors.surfaceLight }]}>
            <View style={styles.infoIcon}>
              <Ionicons name="calendar" size={18} color={themeColors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: themeColors.textTertiary }]}>일시</Text>
              <Text style={[styles.infoValue, { color: themeColors.textPrimary }]}>{formatEventDateFull(gathering.event_date)}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: themeColors.surfaceLight }]}>
            <View style={styles.infoIcon}>
              <Ionicons
                name={gathering.location_type === 'online' ? 'videocam' : 'location'}
                size={18}
                color={themeColors.primary}
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: themeColors.textTertiary }]}>장소</Text>
              <Text style={[styles.infoValue, { color: themeColors.textPrimary }]}>
                {gathering.location_type === 'online' ? '온라인 (링크는 참가 후 공개)' : gathering.location}
              </Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: themeColors.surfaceLight }]}>
            <View style={styles.infoIcon}>
              <Ionicons name="people" size={18} color={themeColors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: themeColors.textTertiary }]}>참가 현황</Text>
              <Text style={[styles.infoValue, { color: themeColors.textPrimary }]}>
                <Text style={{ color: isFull ? themeColors.error : themeColors.primary, fontWeight: '700' }}>
                  {gathering.current_capacity}
                </Text>
                /{gathering.max_capacity}명
              </Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: themeColors.surfaceLight }]}>
            <View style={styles.infoIcon}>
              <Ionicons name="cash" size={18} color={themeColors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: themeColors.textTertiary }]}>참가비</Text>
              <Text style={[styles.infoValue, styles.feeValue, { color: themeColors.primary }]}>
                {formatCurrency(gathering.entry_fee)}
              </Text>
            </View>
          </View>

          {/* 최소 입장 조건 (TBAC) */}
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.infoIcon, { backgroundColor: TIER_COLORS[requiredTier] + '20' }]}>
              <Ionicons name={getTierIcon(requiredTier)} size={18} color={TIER_COLORS[requiredTier]} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: themeColors.textTertiary }]}>최소 입장 조건</Text>
              <Text style={[styles.infoValue, { color: TIER_COLORS[requiredTier] }]}>
                {TIER_LABELS[requiredTier]} 등급 이상
              </Text>
            </View>
            {canJoinByTier ? (
              <View style={styles.tierCheckBadge}>
                <Ionicons name="checkmark-circle" size={16} color={themeColors.primary} />
              </View>
            ) : (
              <View style={styles.tierBlockBadge}>
                <Ionicons name="lock-closed" size={16} color={themeColors.error} />
              </View>
            )}
          </View>
        </View>

        {/* 티어 제한 경고 */}
        {isBlockedByTier && (
          <View style={styles.tierWarningCard}>
            <Ionicons name="alert-circle" size={20} color={themeColors.warning} />
            <View style={styles.tierWarningContent}>
              <Text style={[styles.tierWarningTitle, { color: themeColors.warning }]}>등급 제한 모임</Text>
              <Text style={[styles.tierWarningText, { color: themeColors.textSecondary }]}>
                이 모임은 {TIER_LABELS[requiredTier]} 등급 이상만 참가 가능합니다.{'\n'}
                현재 회원님의 등급: {TIER_LABELS[userTier]}
              </Text>
            </View>
          </View>
        )}

        {/* 모임 설명 */}
        {gathering.description && (
          <View style={[styles.descriptionCard, { backgroundColor: themeColors.surface }]}>
            <Text style={[styles.sectionLabel, { color: themeColors.textTertiary }]}>모임 소개</Text>
            <Text style={[styles.description, { color: themeColors.textSecondary }]}>{gathering.description}</Text>
          </View>
        )}

        {/* 참가자 목록 */}
        {participants && participants.length > 0 && (
          <View style={[styles.participantsCard, { backgroundColor: themeColors.surface }]}>
            <Text style={[styles.sectionLabel, { color: themeColors.textTertiary }]}>참가자 ({participants.length}명)</Text>
            <View style={styles.participantsList}>
              {participants.slice(0, 5).map((participant) => (
                <View key={participant.id} style={styles.participantItem}>
                  <View style={[styles.participantTier, { backgroundColor: TIER_COLORS[participant.participant_tier] }]}>
                    <Ionicons name={getTierIcon(participant.participant_tier)} size={12} color="#000000" />
                  </View>
                  <Text style={[styles.participantName, { color: themeColors.textPrimary }]}>
                    {participant.participant_display_name || '익명'}
                  </Text>
                  <Text style={[styles.participantAssets, { color: TIER_COLORS[participant.participant_tier] }]}>
                    {formatAssetInBillion(participant.participant_verified_assets)}
                  </Text>
                </View>
              ))}
              {participants.length > 5 && (
                <Text style={[styles.moreParticipants, { color: themeColors.textTertiary }]}>
                  +{participants.length - 5}명 더
                </Text>
              )}
            </View>
          </View>
        )}

        {/* 여백 */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16, backgroundColor: themeColors.background, borderTopColor: themeColors.border }]}>
        {isParticipant ? (
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: themeColors.error }]}
            onPress={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color={themeColors.error} />
            ) : (
              <>
                <Ionicons name="close-circle" size={20} color={themeColors.error} />
                <Text style={[styles.cancelButtonText, { color: themeColors.error }]}>참가 취소</Text>
              </>
            )}
          </TouchableOpacity>
        ) : isBlockedByTier ? (
          <View style={[styles.tierBlockedButton, { borderColor: themeColors.warning }]}>
            <Ionicons name="lock-closed" size={20} color={themeColors.warning} />
            <Text style={[styles.tierBlockedButtonText, { color: themeColors.warning }]}>
              {TIER_LABELS[requiredTier]} 등급 이상만 참가 가능
            </Text>
          </View>
        ) : canJoin ? (
          <TouchableOpacity
            style={[styles.joinButton, { backgroundColor: themeColors.primary }]}
            onPress={handleJoin}
            disabled={joining}
          >
            {joining ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <>
                <Ionicons name="hand-right" size={20} color="#000000" />
                <Text style={styles.joinButtonText}>
                  {gathering.entry_fee > 0
                    ? `${formatCurrency(gathering.entry_fee)} 결제하고 참가`
                    : '무료 참가 신청'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={[styles.closedButton, { backgroundColor: themeColors.surface }]}>
            <Ionicons name="lock-closed" size={20} color={themeColors.textTertiary} />
            <Text style={[styles.closedButtonText, { color: themeColors.textTertiary }]}>
              {isFull ? '정원이 가득 찼습니다' : '모집이 마감되었습니다'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  topBadges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  fullBadge: {
    backgroundColor: 'rgba(207, 102, 121, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  fullBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  participatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  participatingBadgeText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '600',
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    marginBottom: 20,
    lineHeight: 33,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  hostCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  hostHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 13,
    fontWeight: '500',
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tierBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostDetails: {
    flex: 1,
  },
  hostName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  hostAssets: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  feeValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  descriptionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 25,
  },
  participantsCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  participantsList: {
    gap: 10,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  participantTier: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  participantAssets: {
    fontSize: 13,
    fontWeight: '600',
  },
  moreParticipants: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  joinButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(207, 102, 121, 0.15)',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '700',
  },
  closedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  closedButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  // 티어 기반 접근 제어 (TBAC) 스타일
  tierCheckBadge: {
    marginLeft: 8,
  },
  tierBlockBadge: {
    marginLeft: 8,
  },
  tierWarningCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 183, 77, 0.15)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 183, 77, 0.3)',
  },
  tierWarningContent: {
    flex: 1,
  },
  tierWarningTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  tierWarningText: {
    fontSize: 13,
    lineHeight: 19,
  },
  tierBlockedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 183, 77, 0.15)',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
  },
  tierBlockedButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  // 사기 경고 배너
  scamWarningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#3b1010',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  scamWarningContent: {
    flex: 1,
  },
  scamWarningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B6B',
    marginBottom: 4,
  },
  scamWarningText: {
    fontSize: 13,
    color: '#FF9B9B',
    lineHeight: 19,
  },
});
